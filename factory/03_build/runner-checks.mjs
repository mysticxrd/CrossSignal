import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { bindRun, digest, validateObservable } from '../../db/benchmark/contracts.mjs';
import { inventory } from '../02_data/benchmark/preservation.mjs';
import { verifyData } from '../02_data/verify.mjs';
import { deriveFactoryState } from '../_lib/factory-state.mjs';
import { checkB01GitPreservation, checkHistoricalBinding, checkSavedRuntimeBindings, checkSavedStructure, transitionPaths } from '../_lib/b01-preservation.mjs';
import { fileHash, markdownHashBindings, markdownSection } from '../_lib/verify-kit.mjs';

export const root=fileURLToPath(new URL('../..',import.meta.url));
export const packet=resolve(root,'factory/03_build/output/gemini-runner-v1');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const changedOldFiles=['factory/03_build/CONTEXT.md','factory/03_build/verify.mjs','factory/03_build/output/BUILD_EVIDENCE.md',
  'factory/03_build/output/VERIFY.md','factory/03_build/output/HUMAN_GATE.md','db/benchmark/gemini-budget.mjs'];
const newSources=['db/benchmark/gemini-http.mjs','db/benchmark/gemini-inspect.mjs','db/benchmark/gemini-worker.mjs',
  'db/benchmark/gemini-isolation.mjs','db/benchmark/gemini-store.mjs','db/benchmark/gemini-runner.mjs',
  'db/benchmark/gemini-execution.mjs','db/benchmark/rules.mjs','scripts/run-benchmark.mjs',
  'tests/benchmark-gemini-runner.test.mjs','tests/a01-path-compat.mjs','factory/03_build/runner-checks.mjs'];
export const inputPaths=Object.freeze([
  'factory/03_build/CONTEXT.md','factory/03_build/verify.mjs','factory/03_build/runner-checks.mjs',
  'factory/01_spec/output/SPEC.md','factory/01_spec/output/VERIFY.md','factory/01_spec/output/HUMAN_GATE.md',
  'factory/02_data/output/DATA_PACKAGE.md','factory/02_data/output/VERIFY.md','factory/02_data/output/HUMAN_GATE.md',
  'factory/02_data/output/CONTRACT_EVIDENCE.json','factory/02_data/benchmark','factory/02_data/verify.mjs',
  'factory/_shared/BENCHMARK_DIRECTION.md','factory/_shared/QUALITY_GATES.md','factory/_lib/verify-kit.mjs',
  'factory/_lib/factory-state.mjs','docs/api-execution-boundary.md','db/benchmark','scripts/run-benchmark.mjs',
  'tests/benchmark-gemini-runner.test.mjs','tests/benchmark-gemini-budget.test.mjs','tests/benchmark.test.mjs',
  'tests/benchmark-subscription.test.mjs','tests/benchmark-subscription-budget.test.mjs','tests/a01-path-compat.mjs',
  'package.json','package-lock.json','eslint.config.mjs',
  'factory/01_spec/amendments/b01-siwc-measured-v1','factory/02_data/amendments/b01-siwc-measured-v1',
  'factory/03_build/output/gemini-resume/PRESERVATION_BEFORE.json',
  'factory/03_build/output/gemini-runner-v1/PRESERVATION_BEFORE.json',
  'factory/03_build/output/gemini-runner-v1/AUTHORIZED_CHANGES.json',
  'factory/03_build/output/gemini-runner-v1/RECONCILIATION.json',
  'factory/03_build/output/gemini-runner-v1/documentation-current',
  'factory/03_build/output/gemini-runner-v1/prior-current',
  'factory/03_build/output/gemini-runner-v1/ACCOUNT_ATTESTATION.json',
  'factory/03_build/output/gemini-runner-v1/PROVIDER_CONTRACT.md',
  'factory/03_build/output/gemini-runner-v1/OFFLINE_VERIFICATION_FINAL.json',
  'factory/03_build/output/gemini-runner-v1/EXECUTION_CLAIM.json',
  'factory/03_build/output/gemini-runner-v1/EXECUTION_SOURCE_SNAPSHOT.json',
  'factory/03_build/output/gemini-runner-v1/execution-source',
  'factory/03_build/output/gemini-runner-v1/A01_REGRESSIONS.json',
  'factory/03_build/output/gemini-runner-v1/PRODUCT_REGRESSIONS.json',
  'factory/03_build/output/gemini-runner-v1/APPLICATION_LINT.json',
  'factory/03_build/output/gemini-runner-v1/APPLICATION_BUILD.json',
  'factory/03_build/output/gemini-runner-v1/APPLICATION_BUILD_ADDENDUM.json',
  'factory/03_build/output/gemini-runner-v1/BUILD_SNAPSHOT.json',
  'factory/03_build/output/gemini-runner-v1/BUILD_SNAPSHOT_ADDENDUM.json',
  'factory/03_build/output/gemini-runner-v1/STAGE03_REVIEW.md',
  'outputs/b01/gemini-runner-v1/session-a629b14640c9c81c',
]);
export async function sourceHashes() {
  const names=[...newSources,'db/benchmark/gemini-budget.mjs','db/benchmark/gemini-config.mjs',
    'db/benchmark/gemini-diagnostics.mjs','factory/_lib/b01-preservation.mjs','factory/_lib/verify-kit.mjs',
    'db/benchmark/gemini-context.mjs','db/benchmark/gemini.mjs','db/benchmark/contracts.mjs',
    'db/benchmark/schemas.mjs','db/benchmark/exposure.mjs','db/benchmark/tools.mjs','db/benchmark/task.md',
    'factory/01_spec/output/SPEC.md','factory/01_spec/output/HUMAN_GATE.md','factory/02_data/output/DATA_PACKAGE.md',
    'factory/02_data/output/HUMAN_GATE.md','factory/03_build/output/gemini-runner-v1/ACCOUNT_ATTESTATION.json',
    'factory/03_build/output/gemini-runner-v1/PROVIDER_CONTRACT.md','factory/03_build/CONTEXT.md',
    'factory/_shared/BENCHMARK_DIRECTION.md','factory/_shared/QUALITY_GATES.md'];
  for(const name of await readdir(resolve(root,'factory/02_data/benchmark/observable')))
    names.push(`factory/02_data/benchmark/observable/${name}`);
  return Object.fromEntries(await Promise.all(names.map(async name=>[name,sha(await readFile(resolve(root,name)))])));
}

export async function checkRunnerPreservation() {
  const gitPreservation=await checkB01GitPreservation({projectRoot:root});
  const before=JSON.parse(await readFile(resolve(packet,'PRESERVATION_BEFORE.json'),'utf8'));
  const reconciliation=JSON.parse(await readFile(resolve(packet,'RECONCILIATION.json'),'utf8'));
  const historical=JSON.parse(await readFile(resolve(root,reconciliation.historicalBaseline.path),'utf8'));
  assert.equal(sha(await readFile(resolve(root,reconciliation.historicalBaseline.path))),reconciliation.historicalBaseline.sha256);
  assert.equal(reconciliation.entries.length,7);
  const qualifiedReconciliation=[];
  for(const entry of reconciliation.entries) {
    assert.equal(historical.repositories[entry.repository].files[entry.path]??null,entry.historicalSha256);
    assert.equal(before.repositories[entry.repository].files[entry.path],entry.currentSha256);
    if(entry.repository!=='product'||transitionPaths(gitPreservation,entry.path).length===0)
      assert.equal(sha(await readFile(resolve(before.repositories[entry.repository].root,entry.path))),entry.currentSha256);
    else qualifiedReconciliation.push({path:entry.path,historicalSha256:entry.currentSha256,
      transitionPaths:transitionPaths(gitPreservation,entry.path),reviewRequired:true,bindingReplaced:false});
    assert.equal(sha(await readFile(resolve(packet,'documentation-current',entry.repository,entry.path))),entry.currentSha256);
  }
  assert.deepEqual(JSON.parse(await readFile(resolve(packet,'AUTHORIZED_CHANGES.json'),'utf8')),changedOldFiles);
  const results=[];
  for(const [kind,saved] of Object.entries(before.repositories)) {
    if(kind==='product') {
      assert.equal(resolve(saved.root),resolve(root),'Preservation checkout changed');
      const runtime=await checkSavedRuntimeBindings(root,saved.files);
      const structure=await checkSavedStructure(root,saved);
      for(const name of changedOldFiles)
        assert.equal(sha(await readFile(resolve(packet,'prior-current',name))),saved.files[name],`Missing prior bytes: ${name}`);
      results.push({...gitPreservation,runtime,structure});
      continue;
    }
    // The outer repository has no B01 snapshot; keep its unrelated legacy checks.
    const current=await inventory(saved.root,false);
    const changed=Object.keys(saved.files).filter(n=>saved.files[n]!==current.files[n]);
    assert(changed.every(n=>kind==='product' && changedOldFiles.includes(n)),`Unrelated existing bytes changed: ${kind}/${changed.join(',')}`);
    if(kind==='product')for(const name of changedOldFiles)
      assert.equal(sha(await readFile(resolve(packet,'prior-current',name))),saved.files[name],`Missing prior bytes: ${name}`);
    assert(saved.directories.every(n=>current.directories.includes(n)),'Existing directory removed');
    for(const [name,target] of Object.entries(saved.links))assert.equal(current.links[name],target,'Existing junction changed');
    for(const [name,target] of Object.entries(current.links))if(!(name in saved.links))
      assert(kind==='product' && name.startsWith('outputs/build-checks/') && name.endsWith('/node_modules')
        && resolve(target)===resolve(root,'../../node_modules'),'Undeclared new junction');
    assert.equal(current.head,saved.head);assert.equal(current.branch,saved.branch);
    assert.equal(current.indexSha256,saved.indexSha256);
    const added=Object.keys(current.files).filter(n=>!(n in saved.files));
    const owned=n=>newSources.includes(n)||n.startsWith('factory/03_build/output/gemini-runner-v1/')
      ||n.startsWith('outputs/b01/gemini-runner-v1/')||n.startsWith('outputs/a01/replay-')
      ||n.startsWith('outputs/a01/concurrent-')||n.startsWith('outputs/a01/test-')||n.startsWith('outputs/build-checks/');
    assert(added.every(n=>kind==='product'&&owned(n)),`Undeclared new files: ${kind}/${added.filter(n=>!owned(n)).join(',')}`);
    assert(saved.status.every(line=>current.status.includes(line)
      ||kind==='product'&&(changedOldFiles.includes(line.slice(3))||owned(line.slice(3)))),'Unrelated Git status lost');
    results.push({repository:kind,oldFilesPreserved:Object.keys(saved.files).length-changed.length,changedOldFiles:changed,
      addedFiles:added.length,head:current.head,indexUnchanged:true,preservedDirectories:saved.directories.length,
      a01PreservedFiles:Object.keys(saved.files).filter(n=>n.startsWith('_archive/2026-09-30-a01-before-b01/factory/')||n.startsWith('outputs/a01/')).length});
  }
  return {documentationReconciliationEntries:7,originalManifestUnchanged:true,repositories:results,
    qualifiedReconciliation,reviewRequired:true,providerRequestsAuthorized:false};
}

export async function checkExecutedBenchmark() {
  const json=async path=>JSON.parse(await readFile(path,'utf8'));
  const snapshot=await json(resolve(packet,'EXECUTION_SOURCE_SNAPSHOT.json'));
  const proof=await json(resolve(packet,'OFFLINE_VERIFICATION_FINAL.json'));
  assert.deepEqual(snapshot.sourceHashes,proof.sourceHashes);
  for(const [name,hash] of Object.entries(snapshot.sourceHashes))
    assert.equal(sha(await readFile(resolve(packet,'execution-source',name))),hash,`Execution source lost: ${name}`);
  const claim=await json(resolve(packet,'EXECUTION_CLAIM.json'));
  assert.deepEqual(claim,snapshot.executionClaim);
  assert.equal(claim.directory,resolve(root,'outputs/b01/gemini-runner-v1',claim.sessionId));
  const manifest=await json(resolve(claim.directory,'MANIFEST.json'));
  const summary=await json(resolve(claim.directory,'SUMMARY.json'));
  const failure=await json(resolve(claim.directory,'BLOCKER.json'));
  const readiness=await json(resolve(claim.directory,'PROVIDER_READINESS.json'));
  assert.equal(digest(manifest),claim.manifestSha256);
  assert.equal(manifest.offlineVerificationSha256,sha(await readFile(resolve(packet,'OFFLINE_VERIFICATION_FINAL.json'))));
  assert.deepEqual(manifest.sourceHashes,snapshot.sourceHashes);
  assert.deepEqual(summary,snapshot.summary);assert.deepEqual(failure,snapshot.failure);
  assert.equal(readiness.model.name,'models/gemini-3.5-flash-lite');assert.equal(readiness.tokenCounts.length,10);
  for(const count of readiness.tokenCounts)
    assert(count.tokens.completeInputTokenBound+manifest.configuration.maxOutputTokens<=manifest.configuration.contextTokens);
  assert.equal(summary.results.length,2);assert.equal(summary.transport.generationCalls,1);
  assert.equal(summary.transport.countCalls,22);assert.equal(summary.transport.metadataCalls,1);
  assert.equal(summary.transport.automaticRetries,0);
  assert.equal(failure.reason,'http_failure');assert.equal(failure.lastFailure.httpStatus,400);
  assert.equal(failure.runtimeEffects,0);assert.equal(failure.paidFallback,false);
  const stores=[];
  for(const result of summary.results) {
    const run=manifest.schedule.find(row=>row.scope.runId===result.runId);assert(run);
    const path=resolve(claim.directory,result.runId,'case.sqlite'),rawBefore=sha(await readFile(path));
    const db=new DatabaseSync(path,{readOnly:true});
    try {
      const rows=db.prepare('SELECT * FROM benchmark_runs').all();assert.equal(rows.length,1);
      const metadata=JSON.parse(rows[0].metadata);assert.equal(digest(metadata),rows[0].hash);
      assert.deepEqual(metadata.scope,run.scope);assert.equal(metadata.manifestHash,digest(manifest));
      assert.deepEqual(metadata.sourceHashes,manifest.sourceHashes);
      const evidence=db.prepare('SELECT * FROM benchmark_evidence ORDER BY evidence_id').all();
      for(const row of evidence)assert(row.workspace===run.scope.workspaceId&&row.case_id===run.scope.caseId&&row.run_id===run.scope.runId);
      const source=await json(resolve(root,'factory/02_data/benchmark/observable',run.sourceFile));
      assert.equal(digest(source),run.sourceHash);
      const sourceScope={...run.scope,workspaceId:source.events[0].workspaceId,caseId:source.caseRef,runId:source.events[0].runId};
      const expected=bindRun(source,sourceScope,run.scope);
      assert.equal(digest(expected),run.observableSha256);
      assert.deepEqual(evidence.map(row=>JSON.parse(row.payload)),[...expected.events].sort((a,b)=>a.id.localeCompare(b.id)),
        'Stored observations differ from the frozen accepted source and manifest');
      validateObservable({version:'incident-data-v2',truthMode:'SIMULATED',caseRef:run.scope.caseId,
        asOf:run.scope.clock,events:evidence.map(row=>JSON.parse(row.payload))},run.scope);
      let previous='0'.repeat(64),sequence=0;
      const history=db.prepare('SELECT * FROM benchmark_timeline ORDER BY sequence').all();
      for(const row of history) {
        assert.equal(row.sequence,++sequence);assert.equal(row.previous_hash,previous);
        assert(row.workspace===run.scope.workspaceId&&row.case_id===run.scope.caseId&&row.run_id===run.scope.runId);
        assert.equal(digest({scope:run.scope,sequence:row.sequence,kind:row.kind,payload:JSON.parse(row.payload),previousHash:previous}),row.hash);
        previous=row.hash;
      }
      assert.equal(history.at(-1).kind,'terminal');
      const terminal=JSON.parse(history.at(-1).payload);
      assert.deepEqual(terminal,await json(resolve(claim.directory,result.runId,'RESULT.json')));
      assert.equal(terminal.runtimeEffects,0);
      stores.push({runId:result.runId,method:result.method,terminalStatus:result.terminalStatus,
        sequence,storeSha256:rawBefore,readOnlyValidated:true});
    } finally {db.close();}
    assert.equal(sha(await readFile(path)),rawBefore,'Read-only result check modified database');
  }
  return {scope:'retained actual benchmark attempt',selectedModel:manifest.model,transport:summary.transport,
    stores,largestMeasuredInitialInputBound:Math.max(...readiness.tokenCounts.map(r=>r.tokens.completeInputTokenBound)),
    initialComparisonComplete:false,subsequentRequestsBlocked:true,providerParameterCause:'unavailable_non_2xx_body_not_retained'};
}
function command(args,cwd=root,exe=process.execPath) {
  const start=new Date().toISOString(),r=spawnSync(exe,args,{cwd,encoding:'utf8',timeout:60000,maxBuffer:8_000_000,
    env:{...process.env,GIT_OPTIONAL_LOCKS:'0'}});
  assert.equal(r.error,undefined,r.error?.message);
  assert.equal(r.status,0,`${exe} ${args.join(' ')}\n${r.stdout}\n${r.stderr}`);
  return {command:[exe,...args],cwd,startedAtUtc:start,finishedAtUtc:new Date().toISOString(),exitCode:r.status,stdout:r.stdout,stderr:r.stderr};
}
export async function verifyRunner({checkReports=true}={}) {
  const frozenSourceHashes=await sourceHashes();
  const data=await verifyData();assert.equal(data.status,'passed');assert.equal(data.gate,'accepted');
  const state=await deriveFactoryState({projectRoot:root});
  for(const name of ['01_spec','02_data']){const stage=state.stages.find(s=>s.name===name);assert.equal(stage.status,'complete');assert.equal(stage.dependencies,'fresh');}
  const commands=[
    command(['--test','tests/benchmark.test.mjs','tests/benchmark-subscription.test.mjs','tests/benchmark-subscription-budget.test.mjs',
      'tests/benchmark-gemini-budget.test.mjs','tests/benchmark-gemini-runner.test.mjs']),
    command(['node_modules/eslint/bin/eslint.js','db/benchmark','scripts/run-benchmark.mjs','tests/benchmark-gemini-runner.test.mjs',
      'tests/a01-path-compat.mjs','factory/03_build/runner-checks.mjs','factory/03_build/verify.mjs']),
    command(['-c',`safe.directory=${root.replaceAll('\\','/')}`,'diff','--check'],root,'git'),
    command(['-c',`safe.directory=${resolve(root,'../..').replaceAll('\\','/')}`,'diff','--check'],resolve(root,'../..'),'git'),
  ];
  const preservation=await checkRunnerPreservation();
  const executedBenchmark=await checkExecutedBenchmark();
  assert.deepEqual(await sourceHashes(),frozenSourceHashes,'Sources changed during offline verification');
  let inputBindings=0;
  const qualifiedBindings=[];
  if(checkReports) {
    const evidence=await readFile(resolve(root,'factory/03_build/output/BUILD_EVIDENCE.md'),'utf8');
    const bindings=markdownHashBindings(markdownSection(evidence,/^## Declared input hashes$/));
    assert.deepEqual(bindings.map(b=>b.input).sort(),[...inputPaths].sort());
    for(const binding of bindings)qualifiedBindings.push(await checkHistoricalBinding(root,binding,
      preservation.repositories.find(repository=>repository.repository==='product')));
    inputBindings=bindings.length;
    const gate=await readFile(resolve(root,'factory/03_build/output/HUMAN_GATE.md'),'utf8');
    assert.match(gate,/^gate_status: blocked$/m);assert.match(gate,/^decision: pending$/m);
    for(const [field,name] of [['build_evidence_sha256','BUILD_EVIDENCE.md'],['verification_sha256','VERIFY.md']])
      assert(gate.includes(`${field}: ${await fileHash(root,resolve(root,'factory/03_build/output',name))}`));
  }
  return {version:'gemini-runner-offline-verification-v1',status:'review-required',stage:'03_build',completeBuildStatus:'blocked',
    verificationCommandModelRequests:0,runtimeEffects:0,coverage:{everyAcceptedLimit:true,realRestrictedWorker:true,durableRecovery:true,abortableTransport:true},
    sourceHashes:frozenSourceHashes,data,commands,preservation,executedBenchmark,inputBindings,
    qualifiedBindings,providerRequestsAuthorized:false,
    environment:{node:process.version,platform:process.platform},verifiedAtUtc:new Date().toISOString()};
}
