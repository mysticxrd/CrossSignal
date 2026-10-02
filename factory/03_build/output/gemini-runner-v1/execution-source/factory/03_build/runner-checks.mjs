import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { inventory } from '../02_data/benchmark/preservation.mjs';
import { verifyData } from '../02_data/verify.mjs';
import { deriveFactoryState } from '../_lib/factory-state.mjs';
import { fileHash, pathHash, markdownHashBindings, markdownSection } from '../_lib/verify-kit.mjs';

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
]);
export async function sourceHashes() {
  const names=[...newSources,'db/benchmark/gemini-budget.mjs','db/benchmark/gemini-config.mjs',
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
  const before=JSON.parse(await readFile(resolve(packet,'PRESERVATION_BEFORE.json'),'utf8'));
  const reconciliation=JSON.parse(await readFile(resolve(packet,'RECONCILIATION.json'),'utf8'));
  const historical=JSON.parse(await readFile(resolve(root,reconciliation.historicalBaseline.path),'utf8'));
  assert.equal(sha(await readFile(resolve(root,reconciliation.historicalBaseline.path))),reconciliation.historicalBaseline.sha256);
  assert.equal(reconciliation.entries.length,7);
  for(const entry of reconciliation.entries) {
    assert.equal(historical.repositories[entry.repository].files[entry.path]??null,entry.historicalSha256);
    assert.equal(before.repositories[entry.repository].files[entry.path],entry.currentSha256);
    assert.equal(sha(await readFile(resolve(before.repositories[entry.repository].root,entry.path))),entry.currentSha256);
    assert.equal(sha(await readFile(resolve(packet,'documentation-current',entry.repository,entry.path))),entry.currentSha256);
  }
  assert.deepEqual(JSON.parse(await readFile(resolve(packet,'AUTHORIZED_CHANGES.json'),'utf8')),changedOldFiles);
  const results=[];
  for(const [kind,saved] of Object.entries(before.repositories)) {
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
  return {documentationReconciliationEntries:7,originalManifestUnchanged:true,repositories:results};
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
  assert.deepEqual(await sourceHashes(),frozenSourceHashes,'Sources changed during offline verification');
  let inputBindings=0;
  if(checkReports) {
    const evidence=await readFile(resolve(root,'factory/03_build/output/BUILD_EVIDENCE.md'),'utf8');
    const bindings=markdownHashBindings(markdownSection(evidence,/^## Declared input hashes$/));
    assert.deepEqual(bindings.map(b=>b.input).sort(),[...inputPaths].sort());
    for(const binding of bindings)assert.equal(await pathHash(root,resolve(root,binding.input)),binding.expected,`Input drift: ${binding.input}`);
    inputBindings=bindings.length;
    const gate=await readFile(resolve(root,'factory/03_build/output/HUMAN_GATE.md'),'utf8');
    assert.match(gate,/^gate_status: blocked$/m);assert.match(gate,/^decision: pending$/m);
    for(const [field,name] of [['build_evidence_sha256','BUILD_EVIDENCE.md'],['verification_sha256','VERIFY.md']])
      assert(gate.includes(`${field}: ${await fileHash(root,resolve(root,'factory/03_build/output',name))}`));
  }
  return {version:'gemini-runner-offline-verification-v1',status:'passed',stage:'03_build',completeBuildStatus:'blocked',
    modelRequests:0,runtimeEffects:0,coverage:{everyAcceptedLimit:true,realRestrictedWorker:true,durableRecovery:true,abortableTransport:true},
    sourceHashes:frozenSourceHashes,data,commands,preservation,inputBindings,
    environment:{node:process.version,platform:process.platform},verifiedAtUtc:new Date().toISOString()};
}
