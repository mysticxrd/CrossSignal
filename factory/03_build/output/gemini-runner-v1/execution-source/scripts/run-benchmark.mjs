import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { bindRun, START, CUTOFF, digest, requireThat } from '../db/benchmark/contracts.mjs';
import { prepareGemini } from '../db/benchmark/gemini-context.mjs';
import { GEMINI } from '../db/benchmark/gemini-config.mjs';
import { freeTierTransport, runnerPacket } from '../db/benchmark/gemini-execution.mjs';
import { runGeminiInvestigation } from '../db/benchmark/gemini-runner.mjs';
import { GeminiStore } from '../db/benchmark/gemini-store.mjs';
import { rulesFinding } from '../db/benchmark/rules.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const hashFile = async name => createHash('sha256').update(await readFile(resolve(root, name))).digest('hex');
const id = prefix => `${prefix}_${randomBytes(6).toString('hex')}`;

export async function benchmarkSchedule() {
  const sourceDir = resolve(root, 'factory/02_data/benchmark/observable');
  const cases = [];
  for (const name of (await readdir(sourceDir)).sort()) {
    const observable = JSON.parse(await readFile(resolve(sourceDir, name), 'utf8'));
    cases.push({ sourceFile: name, sourceHash: digest(observable), observable,
      scope: { workspaceId: observable.events[0].workspaceId, caseId: observable.caseRef,
        runId: observable.events[0].runId, actorId: id('a'), start: START, clock: CUTOFF } });
  }
  return cases.flatMap(source => ['rules', 'single-shot-model', 'tool-using-model'].flatMap(method =>
    Array.from({ length: method === 'rules' ? 1 : 3 }, (_, index) => {
      const scope = { ...source.scope, workspaceId: id('w'), caseId: id('c'), runId: id('r'), actorId: id('a') };
      return { sourceFile: source.sourceFile, sourceHash: source.sourceHash, method, replicateIndex: index + 1, scope,
        observable: bindRun(source.observable, source.scope, scope) };
    })));
}

export async function executeBenchmark() {
  const transport = await freeTierTransport(); // Complete offline proof before any network/key use.
  const schedule = await benchmarkSchedule();
  const sessionId = `session-${randomBytes(8).toString('hex')}`;
  const directory = resolve(root, 'outputs/b01/gemini-runner-v1', sessionId);
  const receipt = JSON.parse(await readFile(resolve(runnerPacket, 'OFFLINE_VERIFICATION_FINAL.json'), 'utf8'));
  const manifest = { version: 'b01-initial-gemini-comparison-v1', truthMode: 'SIMULATED', sessionId,
    createdAtUtc: new Date().toISOString(), provider: GEMINI.provider, model: GEMINI.model, configuration: GEMINI,
    offlineVerificationSha256: await hashFile('factory/03_build/output/gemini-runner-v1/OFFLINE_VERIFICATION_FINAL.json'),
    sourceHashes: receipt.sourceHashes,
    acceptedDataSha256: await hashFile('factory/02_data/output/DATA_PACKAGE.md'),
    rubricSha256: await hashFile('factory/02_data/benchmark/private/rubric.json'),
    initialArtifacts: 35, changedInvestigatorArtifacts: 15, changedExperimentStatus: 'not_preregistered',
    seeds: null, seedUnavailableReason: 'model_specific_support_unverified_use_indices_1_2_3',
    schedule: schedule.map(({ observable, ...row }) => ({ ...row, observableSha256: digest(observable) })),
    paidSpendCapUsd: 0, paidFallback: false, runtimeIntervention: false };
  // One immutable execution claim prevents competing launchers or crash retries.
  await writeFile(resolve(runnerPacket, 'EXECUTION_CLAIM.json'), JSON.stringify({ sessionId, directory,
    manifestSha256: digest(manifest), atUtc: new Date().toISOString(), processId: process.pid }, null, 2)+'\n', { flag:'wx' });
  await mkdir(directory, { recursive:true });
  await writeFile(resolve(directory, 'MANIFEST.json'), JSON.stringify(manifest,null,2)+'\n', { flag:'wx' });
  const results = [];
  let readiness = null;
  let frozenModelVersion = null;
  try {
    readiness = { model: await transport.modelMetadata(performance.now()+GEMINI.requestTimeoutMs), tokenCounts:[] };
    // Readiness counts the exact scheduled benchmark requests, not a smoke prompt.
    // No model generation occurs until all initial eager/tool contexts fit.
    for (const row of schedule.filter(r=>r.replicateIndex===1 && r.method!=='rules')) {
      const prepared = prepareGemini(row.observable,row.scope,{method:row.method});
      const tokens = await transport.count(prepared,performance.now()+GEMINI.requestTimeoutMs);
      requireThat(tokens.completeInputTokenBound + GEMINI.maxOutputTokens <= GEMINI.contextTokens,'context_overflow');
      readiness.tokenCounts.push({runId:row.scope.runId,requestSha256:prepared.requestSha256,tokens});
    }
    await writeFile(resolve(directory,'PROVIDER_READINESS.json'),JSON.stringify(readiness,null,2)+'\n',{flag:'wx'});
    for(const row of schedule) {
      const runDir=resolve(directory,row.scope.runId); await mkdir(runDir);
      const { observable, ...run }=row;
      const store=new GeminiStore(resolve(runDir,'case.sqlite'),{metadata:{...run,truthMode:'SIMULATED',
        configurationHash:digest(GEMINI),manifestHash:digest(manifest),sourceHashes:manifest.sourceHashes},observable});
      let result;
      try {
        if(row.method==='rules'){
          store.claim(); result={truthMode:'SIMULATED',method:'rules',finding:rulesFinding(observable,row.scope),runtimeEffects:0};
          store.append('terminal',result);
        } else result=await runGeminiInvestigation({observable,scope:row.scope,method:row.method,store,transport});
      } finally {store.close();}
      await writeFile(resolve(runDir,'RESULT.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
      results.push({runId:row.scope.runId,method:row.method,replicateIndex:row.replicateIndex,terminalStatus:result.terminalStatus??result.finding.terminalStatus});
      if(result.modelVersion){
        requireThat(frozenModelVersion===null || frozenModelVersion===result.modelVersion,'model_version_changed');
        frozenModelVersion=result.modelVersion;
      }
      // Uncertain compatibility/usage/transport stops the batch; no replacement or retry.
      if(['usage_unknown','token_count_or_usage_mismatch','indeterminate_usage','http_failure','transport_failure',
        'provider_secret_echo','model_version_changed'].includes(result.terminalStatus)) throw new Error(result.failureReason??result.terminalStatus);
    }
  } catch(e) {
    await writeFile(resolve(directory,'BLOCKER.json'),JSON.stringify({version:'benchmark-blocker-v1',
      reason:['context_overflow','http_failure','model_metadata_incompatible','token_count_unavailable',
        'usage_unknown','token_count_or_usage_mismatch','transport_failure','request_timeout','model_version_changed'].includes(e.message)?e.message:'provider_or_runner_check_failed',
      completedArtifacts:results.length,modelCalls:transport.counters().generationCalls,lastFailure:transport.counters().lastFailure,automaticRetries:0,
      paidFallback:false,runtimeEffects:0,atUtc:new Date().toISOString()},null,2)+'\n',{flag:'wx'});
  }
  const summary={directory,sessionId,results,transport:transport.counters(),readinessCompleted:readiness?.tokenCounts.length===10,
    initialComparisonComplete:results.length===35,changedExperiment:'NOT_RUN',adjudication:'PENDING_HUMAN_REVIEW',
    runtimeIntervention:'NOT_RUN',factoryGate:'blocked/pending',stage:'03_build'};
  await writeFile(resolve(directory,'SUMMARY.json'),JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
  return summary;
}

if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.length!==3 || process.argv[2]!=='--execute') {
    process.stdout.write(JSON.stringify({stage:'03_build',status:'requests_blocked',required:'verified offline receipt and --execute for authorized benchmark only'})+'\n');
    process.exitCode=2;
  } else executeBenchmark().then(result=>process.stdout.write(JSON.stringify(result,null,2)+'\n')).catch(()=>{
    process.stderr.write('benchmark_execution_blocked_before_request; consult Stage 03 offline verification and existing execution claim\n');process.exitCode=1;
  });
}
