import assert from 'node:assert/strict';
import { readFile, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inventory } from '../../../../02_data/benchmark/preservation.mjs';
import { verifyPreparation } from '../verify-preparation.mjs';
import { acceptedSchedule } from './schedule.mjs';
import { normalizePrepared } from './wire.mjs';
import { ROOT } from '../inspection.mjs';

const directory=fileURLToPath(new URL('.',import.meta.url));
const packet=resolve(directory,'..');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=async path=>JSON.parse(await readFile(path,'utf8'));
const raw=async path=>sha(await readFile(path));

async function checkManifest(base,manifest) {
  assert.equal(manifest.selfExcluded,true);
  for(const entry of manifest.entries) {
    const bytes=await readFile(resolve(base,entry.path));
    assert.equal(bytes.length,entry.bytes);assert.equal(sha(bytes),entry.rawSha256,entry.path);
  }
  return manifest.entries.length;
}
function git(root,args) {
  const startedAtUtc=new Date().toISOString();
  const command=['git','-c',`safe.directory=${root.replaceAll('\\','/')}`,...args];
  const result=spawnSync(command[0],command.slice(1),{cwd:root,encoding:'utf8',
    env:{...process.env,GIT_OPTIONAL_LOCKS:'0'},timeout:10000});
  assert.equal(result.error,undefined);assert.equal(result.status,0);
  return {command,cwd:root,startedAtUtc,finishedAtUtc:new Date().toISOString(),exitCode:result.status,
    stdout:result.stdout,stderr:result.stderr};
}

export async function verifyContinuation() {
  const baseline=await json(resolve(directory,'PRESERVATION_BEFORE.json'));
  assert.deepEqual(baseline.existingFilesAuthorizedToChange,[]);
  const repositories=[],commands=[];
  for(const [name,before] of Object.entries(baseline.repositories)) {
    const after=await inventory(before.root,false);
    assert.deepEqual(Object.entries(before.files).filter(([path,hash])=>after.files[path]!==hash),[],name);
    assert.deepEqual(before.links,after.links);assert(before.directories.every(path=>after.directories.includes(path)));
    assert.equal(before.head,after.head);assert.equal(before.branch,after.branch);
    assert.equal(before.indexSha256,after.indexSha256);assert(before.status.every(line=>after.status.includes(line)));
    const added=Object.keys(after.files).filter(path=>!(path in before.files));
    assert(added.every(path=>name==='product'&&path.startsWith(baseline.newFilesBoundary)));
    const diff=git(before.root,['diff','--check']);assert.equal(diff.stdout,'');commands.push(diff);
    repositories.push({repository:name,unchangedFiles:Object.keys(before.files).length,
      unchangedHead:after.head,unchangedBranch:after.branch,unchangedIndexSha256:after.indexSha256,
      newFiles:added.sort(),preservedDirectories:before.directories.length,preservedLinks:Object.keys(before.links).length});
  }
  assert.equal(await raw(resolve(packet,'PACKET_MANIFEST.json')),baseline.reviewedPacketRawManifestSha256);
  const reviewedPacketFiles=await checkManifest(packet,await json(resolve(packet,'PACKET_MANIFEST.json')));
  const parentBindings=await json(resolve(packet,'INPUT_BINDINGS.json'));
  for(const entry of parentBindings.entries)
    assert.equal(await raw(resolve(baseline.repositories[entry.repository].root,entry.path)),entry.rawSha256);
  const preparation=await verifyPreparation(); // Read-only saved-result reload, accepted hashes and 51 old inputs.
  const reconciliation=await json(resolve(ROOT,'factory/03_build/output/gemini-runner-v1/RECONCILIATION.json'));
  assert.equal(reconciliation.entries.length,7);
  const historical=await json(resolve(ROOT,reconciliation.historicalBaseline.path));
  assert.equal(await raw(resolve(ROOT,reconciliation.historicalBaseline.path)),reconciliation.historicalBaseline.sha256);
  for(const entry of reconciliation.entries) {
    assert.equal(historical.repositories[entry.repository].files[entry.path]??null,entry.historicalSha256);
    assert.equal(await raw(resolve(baseline.repositories[entry.repository].root,entry.path)),entry.currentSha256);
    assert.equal(await raw(resolve(ROOT,'factory/03_build/output/gemini-runner-v1/documentation-current',entry.repository,entry.path)),entry.currentSha256);
  }
  const schedule=await acceptedSchedule(),snapshot=await json(resolve(directory,'SCHEDULE_PREPARED.json'));
  assert.deepEqual(snapshot,schedule);
  const requests=await json(resolve(directory,'NORMALIZED_REQUESTS.json'));
  assert.equal(requests.status,'OFFLINE_NOT_DISPATCHED');assert.equal(requests.privateInputs,0);assert.equal(requests.modelRequests,0);
  assert.equal(requests.requests.length,10);
  for(const row of requests.requests) {
    assert.deepEqual(normalizePrepared(row.request),row.request);
    const expected=schedule.records.find(r=>r.scope.runId===row.runId);
    assert.equal(row.method,expected.method);assert.equal(row.request.requestSha256,expected.initialRequestSha256);
  }
  for(const [name,count] of [['OFFLINE_TESTS_FINAL.json',8],['BENCHMARK_REGRESSIONS.json',57]]) {
    const receipt=await json(resolve(directory,name));assert.equal(receipt.exitCode,0);assert.equal(receipt.error,null);
    assert(receipt.stdout.includes(`# pass ${count}\n`));assert(receipt.stdout.includes('# fail 0\n'));
    assert.equal(receipt.modelRequests,0);assert.equal(receipt.runtimeEffects,0);
  }
  for(const name of ['OFFLINE_TESTS_FINAL.json','LINT_FINAL.json']) {
    const receipt=await json(resolve(directory,name));assert.equal(receipt.exitCode,0);
    for(const [source,hash] of Object.entries(receipt.sourceHashes))assert.equal(await raw(resolve(directory,source)),hash);
  }
  const host=await json(resolve(directory,'KEY_HOST_AVAILABILITY.json'));
  assert.equal(host.windowsUserKeyPresent,true);assert.equal(host.valuePrinted,false);assert.equal(host.valueRecorded,false);
  const observed=await json(resolve(directory,'INDEX_RECHECK.json'));
  assert.equal(observed.originalAssertionWaived,false);
  const root=baseline.repositories.outer.root;
  const index=git(root,['ls-files','--stage']),head=git(root,['ls-tree','-r','HEAD']),staged=git(root,['diff','--cached','--raw']);
  const indexed=index.stdout.trimEnd().split('\n').map(line=>{
    const [mode,object,stage,path]=line.match(/^(\d+) ([a-f0-9]+) (\d)\t(.+)$/).slice(1);
    assert.equal(stage,'0');return `${mode} ${object}\t${path}`;
  }).sort();
  const committed=head.stdout.trimEnd().split('\n').map(line=>{
    const [mode,object,path]=line.match(/^(\d+) blob ([a-f0-9]+)\t(.+)$/).slice(1);return `${mode} ${object}\t${path}`;
  }).sort();
  assert.deepEqual(indexed,committed);assert.equal(staged.stdout,'');assert.equal(indexed.length,observed.indexedEntries);
  assert.equal(await raw(resolve(root,'.git/index')),observed.currentRawSha256);
  commands.push(...[index,head].map(r=>({...r,stdout:undefined,stdoutSha256:sha(r.stdout)})),staged);
  const statusCommand=[process.execPath,'factory/status.mjs'];
  const startedAtUtc=new Date().toISOString();
  const status=spawnSync(statusCommand[0],statusCommand.slice(1),{cwd:ROOT,encoding:'utf8',timeout:10000});
  assert.equal(status.status,0);assert(status.stdout.includes('Active stage: 03_build'));
  commands.push({command:statusCommand,cwd:ROOT,startedAtUtc,finishedAtUtc:new Date().toISOString(),
    exitCode:status.status,stdout:status.stdout,stderr:status.stderr});
  let frozenContinuationFiles=null;
  try {await access(resolve(directory,'PACKET_MANIFEST.json'));frozenContinuationFiles=await checkManifest(directory,await json(resolve(directory,'PACKET_MANIFEST.json')));}
  catch(error) {if(error.code!=='ENOENT')throw error;}
  return {version:'hiring-showcase-continuation-offline-verification-v1',verifiedAtUtc:new Date().toISOString(),
    status:'passed_for_additive_offline_preparation_only',scope:'accepted',model:'gemini-3.5-flash-lite',
    repositories,reviewedPacketFiles,preservedParentInputBindings:parentBindings.entries.length,
    acceptedArtifactHashesUnchanged:preparation.acceptedArtifactHashesUnchanged,
    preservedStage03InputBindings:preparation.preservedStage03InputBindings,documentationReconciliations:7,
    savedResultReload:preparation.reload,continuationTests:8,existingBenchmarkTests:57,affectedSourceLint:'passed',
    frozenContinuationFiles,commands,windowsUserKeyReadableByHost:true,inheritedProcessKeyPresent:host.inheritedProcessKeyPresent,
    credentialValuePrinted:false,credentialValueRecorded:false,modelRequests:0,providerRequests:0,runtimeEffects:0,
    showcaseEvaluation:'NOT_RUN',originalStrictIndexCheck:'failed_historical_raw_equality_not_waived',
    originalStage03Gate:'blocked_pending',completeB01:false,committed:false,sealed:false,
    blockers:schedule.blockers,priorVerifierHistoricalScopeField:preparation.scopeAmendment};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const args=process.argv.slice(2);
  if(args.length>1||(args.length===1&&args[0]!=='--record'))process.exitCode=2;
  else verifyContinuation().then(async report=>{
    if(args[0]==='--record')await writeFile(resolve(directory,'VERIFY.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
    process.stdout.write(JSON.stringify({status:report.status,scope:report.scope,
      preservedFiles:report.repositories.map(r=>({repository:r.repository,files:r.unchangedFiles})),
      reviewedPacketFiles:report.reviewedPacketFiles,frozenContinuationFiles:report.frozenContinuationFiles,
      acceptedHashes:report.acceptedArtifactHashesUnchanged,inputBindings:report.preservedStage03InputBindings,
      modelRequests:0,runtimeEffects:0,stageGate:report.originalStage03Gate,blockers:report.blockers})+'\n');
  }).catch(error=>{process.stderr.write(`continuation_check_failed: ${error.message}\n`);process.exitCode=1;});
}
