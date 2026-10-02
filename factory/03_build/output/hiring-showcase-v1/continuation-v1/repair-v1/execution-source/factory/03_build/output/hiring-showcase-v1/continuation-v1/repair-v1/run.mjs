import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { ROOT, inspectRecord, recordMarkdown } from '../../inspection.mjs';
import { DIRECTORY, json, rawHash, checkQualification, checkPreservation } from './preservation.mjs';
import { repairedTransport } from './transport.mjs';
import { repairPrepared } from './wire.mjs';
import { showcasePlan, rowObservable } from './plan.mjs';
import { digest } from '../../../../../../db/benchmark/contracts.mjs';
import { GEMINI } from '../../../../../../db/benchmark/gemini-config.mjs';
import { isolatedGemini } from '../../../../../../db/benchmark/gemini-isolation.mjs';
import { runGeminiInvestigation } from '../../../../../../db/benchmark/gemini-runner.mjs';
import { GeminiStore } from '../../../../../../db/benchmark/gemini-store.mjs';
import { rulesFinding } from '../../../../../../db/benchmark/rules.mjs';
import { deriveFactoryState } from '../../../../../_lib/factory-state.mjs';

const writeNew=(path,value)=>writeFile(path,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const uncertain=new Set(['usage_unknown','token_count_or_usage_mismatch','indeterminate_usage','http_failure',
  'transport_failure','provider_secret_echo','model_version_changed']);
async function checkSources(proof) {
  for(const [path,expected] of Object.entries(proof.sourceHashes))assert.equal(await rawHash(resolve(ROOT,path)),expected,'Frozen execution source drift');
  await checkQualification();
}
export async function executionPreflight(...options) {
  assert.equal(options.length,0,'Caller options cannot enable requests');
  const proof=await json(resolve(DIRECTORY,'OFFLINE_PROOF.json'));
  assert.equal(proof.status,'passed');assert.equal(proof.modelRequests,0);
  for(const name of ['everyAcceptedLimit','actualRestrictedWorker','durableRecording','abortableTransport','wireContract','preservation'])
    assert.equal(proof.coverage[name],true,'Incomplete offline prerequisites');
  await checkSources(proof);
  const state=await deriveFactoryState({projectRoot:ROOT});
  for(const name of ['01_spec','02_data']) {
    const stage=state.stages.find(s=>s.name===name);assert.equal(stage.status,'complete');assert.equal(stage.gate,'accepted');assert.equal(stage.dependencies,'fresh');
  }
  assert.equal(state.stages.find(s=>s.name==='03_build').status,'in-progress');
  const plan=await showcasePlan();assert.deepEqual(plan,await json(resolve(DIRECTORY,'PLAN.json')));
  const account=await json(resolve(ROOT,'factory/03_build/output/gemini-runner-v1/ACCOUNT_ATTESTATION.json'));
  assert.equal(account.source,'Direct owner message on 2026-10-02');assert.equal(account.provider,'gemini');
  assert.equal(account.model,GEMINI.model);assert.equal(account.freeTier,true);assert.equal(account.billingDisabled,true);
  assert.equal(account.sufficientQuota,true);assert.equal(account.paidSpendCapUsd,0);assert.equal(account.paidFallback,false);
  assert.equal(account.scope,'benchmark requests only');assert.equal(account.standaloneSmokeTests,false);
  await checkPreservation();
  return {proof,plan}; // No key, network, claim or result store has been accessed.
}
async function runRows(manifest,transport,directory,{fixture=false,onProgress=()=>{}}={}) {
  assert.equal(transport.mode,fixture?'OFFLINE_FIXTURE':'FREE_TIER_BENCHMARK');
  const results=[];let readiness=null,frozenModelVersion=null,blocker=null;
  try {
    readiness={model:await transport.modelMetadata(performance.now()+GEMINI.requestTimeoutMs),tokenCounts:[]};
    for(const row of manifest.schedule.filter(r=>r.method!=='rules')) {
      const observable=await rowObservable(row);
      const request=repairPrepared(await isolatedGemini({operation:'prepare',observable,scope:row.scope,options:{method:row.method}}));
      assert.equal(request.requestSha256,row.initialRequestSha256);
      const tokens=await transport.count(request,performance.now()+GEMINI.requestTimeoutMs);
      assert(tokens.completeInputTokenBound+GEMINI.maxOutputTokens<=GEMINI.contextTokens,'context_overflow');
      readiness.tokenCounts.push({runId:row.scope.runId,requestSha256:request.requestSha256,tokens});
    }
    await writeNew(resolve(directory,'PROVIDER_READINESS.json'),readiness);
    for(const row of manifest.schedule) {
      const runDirectory=resolve(directory,row.scope.runId);await mkdir(runDirectory);
      const observable=await rowObservable(row);
      const store=new GeminiStore(resolve(runDirectory,'case.sqlite'),{metadata:{...row,truthMode:'SIMULATED',
        mode:fixture?'OFFLINE_FIXTURE':'FREE_TIER_BENCHMARK',configurationHash:digest(GEMINI),
        manifestHash:digest(manifest),sourceHashes:manifest.sourceHashes},observable});
      let result;
      try {
        if(row.method==='rules') {
          store.claim();result={truthMode:'SIMULATED',method:'rules',terminalStatus:'completed',
            finding:rulesFinding(observable,row.scope),runtimeEffects:0};store.append('terminal',result);
        } else result=await runGeminiInvestigation({observable,scope:row.scope,method:row.method,store,transport});
      } finally {store.close();}
      await writeNew(resolve(runDirectory,'RESULT.json'),result);
      const record=await inspectRecord(manifest,row,directory);
      record.provenance=fixture?'OFFLINE_FIXTURE_UNGRADED':'accepted_hiring_showcase_15_record_schedule';
      record.databaseRelativePath=relative(ROOT,resolve(runDirectory,'case.sqlite')).replaceAll('\\','/');
      const markdown=recordMarkdown(record).replace('original retained benchmark, not the proposed 15-record study.',
        fixture?'OFFLINE_FIXTURE; not a scored model result.':'accepted 15-record benchmark; fresh investigation, saved inspection only.');
      await writeFile(resolve(runDirectory,'CASE.md'),markdown,{flag:'wx'});
      results.push({runId:row.scope.runId,method:row.method,replicateIndex:1,terminalStatus:result.terminalStatus,
        findingAvailable:result.finding!==null&&result.finding!==undefined,modelVersion:result.modelVersion??null,
        databaseSha256:record.databaseSha256,timelineSha256:record.timelineSha256});
      onProgress({completedRecords:results.length,method:row.method,terminalStatus:result.terminalStatus,
        generationCalls:transport.counters().generationCalls});
      if(row.method!=='rules'&&result.modelVersion) {
        assert(frozenModelVersion===null||frozenModelVersion===result.modelVersion,'model_version_changed');frozenModelVersion=result.modelVersion;
      }
      if(uncertain.has(result.terminalStatus))throw new Error(result.failureReason??result.terminalStatus);
      if(row.method!=='rules'&&!result.modelVersion)throw new Error('model_revision_unavailable');
    }
  } catch(error) {
    const reasons=['context_overflow','http_failure','usage_unknown','token_count_or_usage_mismatch','transport_failure',
      'request_timeout','model_version_changed','model_revision_unavailable','token_count_unavailable'];
    blocker={reason:reasons.includes(error.message)?error.message:'provider_or_runner_prerequisite_failed',
      completedRecords:results.length,lastFailure:transport.counters().lastFailure,atUtc:new Date().toISOString()};
    await writeNew(resolve(directory,'BLOCKER.json'),blocker);
  }
  const summary={version:'b01-hiring-showcase-session-summary-v1',truthMode:'SIMULATED',mode:fixture?'OFFLINE_FIXTURE':'FREE_TIER_BENCHMARK',
    directory,sessionId:manifest.sessionId,manifestSha256:digest(manifest),results,
    scheduledRecords:15,recordStatuses:manifest.schedule.map(row=>({runId:row.scope.runId,method:row.method,
      status:results.find(r=>r.runId===row.scope.runId)?.terminalStatus??'NOT_RUN'})),
    completedRecords:results.length,complete:results.length===15&&blocker===null,blocker,
    transport:transport.counters(),readinessCompleted:readiness?.tokenCounts.length===10,
    modelRevision:frozenModelVersion,independentAdjudication:'PENDING_HUMAN_REVIEW',runtimeIntervention:'NOT_RUN',
    paidFallback:false,automaticRetries:0,runtimeEffects:0,stage03Accepted:false,largerB01Complete:false};
  await writeNew(resolve(directory,'SUMMARY.json'),summary);return summary;
}
export async function fixtureSchedule({transport,directory}) {
  assert.equal(transport.mode,'OFFLINE_FIXTURE');
  const plan=await showcasePlan();
  const manifest={...plan,sessionId:'OFFLINE_FIXTURE_UNGRADED',sourceHashes:{},fixture:true};
  await writeNew(resolve(directory,'MANIFEST.json'),manifest);
  return runRows(manifest,transport,directory,{fixture:true});
}
export async function executeShowcase(...options) {
  assert.equal(options.length,0,'Caller options cannot enable requests');
  const {proof,plan}=await executionPreflight();
  assert.equal(typeof process.env.GEMINI_API_KEY,'string');assert(process.env.GEMINI_API_KEY.trim().length>0,'host_process_key_unavailable');
  const sessionId=`showcase-session-${randomBytes(8).toString('hex')}`;
  const directory=resolve(ROOT,'outputs/b01/gemini-runner-v1',sessionId);
  const manifest={...plan,sessionId,createdAtUtc:new Date().toISOString(),sourceHashes:proof.sourceHashes,
    offlineProofRawSha256:await rawHash(resolve(DIRECTORY,'OFFLINE_PROOF.json')),
    authorizationSource:'direct owner scope/free allowance plus accepted preservation qualification; host preflight',
    seed:null,seedUnavailableReason:GEMINI.seedUnavailableReason,fixture:false};
  await writeNew(resolve(DIRECTORY,'EXECUTION_CLAIM.json'),{sessionId,directory,manifestSha256:digest(manifest),
    atUtc:new Date().toISOString(),offlineProofRawSha256:manifest.offlineProofRawSha256});
  await mkdir(directory);await writeNew(resolve(directory,'MANIFEST.json'),manifest);
  const transport=repairedTransport({mode:'FREE_TIER_BENCHMARK',fetchImpl:globalThis.fetch,
    keySource:()=>process.env.GEMINI_API_KEY,beforeRequest:()=>checkSources(proof)});
  return runRows(manifest,transport,directory,{onProgress:row=>process.stdout.write(JSON.stringify({progress:row})+'\n')});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(process.argv.length!==3||process.argv[2]!=='--execute')process.exitCode=2;
  else executeShowcase().then(summary=>{
    process.stdout.write(JSON.stringify({sessionId:summary.sessionId,completedRecords:summary.completedRecords,
      complete:summary.complete,modelRevision:summary.modelRevision,transport:summary.transport,blocker:summary.blocker})+'\n');
    if(!summary.complete)process.exitCode=2;
  }).catch(()=>{process.stderr.write('showcase_execution_blocked_before_request; review offline proof, sources, preservation and existing claim\n');process.exitCode=1;});
}
