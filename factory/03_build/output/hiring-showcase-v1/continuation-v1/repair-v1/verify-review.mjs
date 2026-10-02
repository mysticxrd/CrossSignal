import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { ROOT, inspectSavedSession } from '../../inspection.mjs';
import { DIRECTORY, json, rawHash, checkPreservation } from './preservation.mjs';
import { reloadReview, renderReview } from './review.mjs';
import { deriveFactoryState } from '../../../../../_lib/factory-state.mjs';
import { fileHash, pathHash, markdownHashBindings, markdownSection } from '../../../../../_lib/verify-kit.mjs';
import { digest } from '../../../../../../db/benchmark/contracts.mjs';

async function manifestFiles(directory) {
  const manifest=await json(resolve(directory,'PACKET_MANIFEST.json'));assert.equal(manifest.selfExcluded,true);
  for(const entry of manifest.entries) {
    const bytes=await readFile(resolve(directory,entry.path));assert.equal(bytes.length,entry.bytes);
    assert.equal(await rawHash(resolve(directory,entry.path)),entry.rawSha256);
  }
  return manifest.entries.length;
}
function command(executable,args,cwd) {
  const startedAtUtc=new Date().toISOString();
  const result=spawnSync(executable,args,{cwd,encoding:'utf8',env:{...process.env,GIT_OPTIONAL_LOCKS:'0'},timeout:10000});
  assert.equal(result.error,undefined);assert.equal(result.status,0);
  return {command:[executable,...args],cwd,startedAtUtc,finishedAtUtc:new Date().toISOString(),
    exitCode:result.status,stdout:result.stdout,stderr:result.stderr};
}
export async function verifyReview() {
  const claim=await json(resolve(DIRECTORY,'EXECUTION_CLAIM.json'));
  const preservation=await checkPreservation({sessionDirectory:claim.directory});
  const baseline=await json(resolve(DIRECTORY,'PRESERVATION_BEFORE.json'));
  const older=await json(resolve(DIRECTORY,'../../PRESERVATION_BEFORE.json'));
  for(const [path,hash] of Object.entries(older.accepted)) {
    assert.equal(await rawHash(resolve(ROOT,path)),hash.rawSha256);
    assert.equal(await fileHash(ROOT,resolve(ROOT,path)),hash.normalizedSha256);
  }
  const parentBindings=await json(resolve(DIRECTORY,'../../INPUT_BINDINGS.json'));
  for(const entry of parentBindings.entries)
    assert.equal(await rawHash(resolve(baseline.repositories[entry.repository].root,entry.path)),entry.rawSha256);
  const build=await readFile(resolve(ROOT,'factory/03_build/output/BUILD_EVIDENCE.md'),'utf8');
  const bindings=markdownHashBindings(markdownSection(build,/^## Declared input hashes$/));
  assert.equal(bindings.length,51);
  for(const binding of bindings)assert.equal(await pathHash(ROOT,resolve(ROOT,binding.input)),binding.expected);
  const stageGate=await readFile(resolve(ROOT,'factory/03_build/output/HUMAN_GATE.md'),'utf8');
  assert.match(stageGate,/^gate_status: blocked$/m);assert.match(stageGate,/^decision: pending$/m);
  for(const [field,name] of [['build_evidence_sha256','BUILD_EVIDENCE.md'],['verification_sha256','VERIFY.md']])
    assert(stageGate.includes(`${field}: ${await fileHash(ROOT,resolve(ROOT,'factory/03_build/output',name))}`));
  const state=await deriveFactoryState({projectRoot:ROOT});
  for(const name of ['01_spec','02_data']) {
    const stage=state.stages.find(s=>s.name===name);assert.equal(stage.status,'complete');
    assert.equal(stage.gate,'accepted');assert.equal(stage.dependencies,'fresh');
  }
  assert.equal(state.stages.find(s=>s.name==='03_build').status,'in-progress');
  for(const name of ['04_verify','05_ship'])assert.equal(state.stages.find(s=>s.name===name).status,'never-run');
  const originalInspection=await inspectSavedSession(),snapshot=await reloadReview();
  assert.equal(digest(snapshot),digest(await json(resolve(DIRECTORY,'SAVED_INSPECTION.json'))));
  assert.equal(await readFile(resolve(DIRECTORY,'index.html'),'utf8'),renderReview(snapshot));
  for(const [path,count,key] of [['REPAIR_TESTS.json',8,'stdout'],['REVIEW_TESTS.json',7,'output'],
    ['../OFFLINE_TESTS_FINAL.json',8,'stdout'],['../BENCHMARK_REGRESSIONS.json',57,'stdout']]) {
    const receipt=await json(resolve(DIRECTORY,path));assert.equal(receipt.exitCode,0);
    assert(receipt[key].includes(`# pass ${count}\n`));assert(receipt[key].includes('# fail 0\n'));
    assert.equal(receipt.modelRequests,0);assert.equal(receipt.runtimeEffects,0);
  }
  assert.equal((await json(resolve(DIRECTORY,'REVIEW_LINT.json'))).exitCode,0);
  const commands=[];
  for(const saved of Object.values(baseline.repositories)) {
    const prefix=['-c',`safe.directory=${saved.root.replaceAll('\\','/')}`];
    const diff=command('git',[...prefix,'diff','--check'],saved.root);assert.equal(diff.stdout,'');commands.push(diff);
    commands.push(command('git',[...prefix,'status','--short'],saved.root),command('git',[...prefix,'rev-parse','HEAD'],saved.root));
  }
  const factory=command(process.execPath,['factory/status.mjs'],ROOT);
  assert(factory.stdout.includes('Active stage: 03_build'));commands.push(factory);
  const historicalPacketFiles=await manifestFiles(resolve(DIRECTORY,'../..'));
  const historicalContinuationFiles=await manifestFiles(resolve(DIRECTORY,'..'));
  const a01Counts=Object.fromEntries(Object.entries(baseline.repositories).map(([name,saved])=>[name,{
    archivedFactoryFiles:Object.keys(saved.files).filter(path=>path.startsWith('_archive/2026-09-30-a01-before-b01/factory/')).length,
    storedFiles:Object.keys(saved.files).filter(path=>path.startsWith('outputs/a01/')).length}]));
  return {version:'b01-hiring-showcase-repair-review-verification-v1',verifiedAtUtc:new Date().toISOString(),
    status:'offline_checks_passed_generation_blocked',preservation,acceptedArtifactHashesUnchanged:Object.keys(older.accepted).length,
    parentInputBindings:parentBindings.entries.length,originalStage03InputBindings:bindings.length,
    historicalPacketFiles,historicalContinuationFiles,a01Counts,executionSourcesAndCopies:snapshot.sourcesVerified,
    freshOfflineTests:15,retainedOfflineTests:65,affectedSourceLint:'passed',
    databaseReload:{old:originalInspection.records.map(r=>r.databaseSha256),fresh:snapshot.records.map(r=>r.databaseSha256),readOnly:true},
    scopeAmendment:'accepted',preservationQualification:'accepted',providerCompatibility:'blocked_actual_HTTP_400',
    savedRecords:1,scheduledRecords:15,notRunRecords:14,validModelFindings:0,
    actualBenchmarkTransport:snapshot.transport,furtherModelRequests:'BLOCKED',
    verificationModelRequests:0,verificationProviderRequests:0,runtimeEffects:0,
    stage03Accepted:false,completeB01:false,committed:false,sealed:false,commands};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(process.argv.length>3||process.argv.length===3&&process.argv[2]!=='--record')process.exitCode=2;
  else verifyReview().then(async report=>{
    if(process.argv[2]==='--record')await writeFile(resolve(DIRECTORY,'VERIFY.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
    process.stdout.write(JSON.stringify({status:report.status,unchangedFiles:report.preservation.repositories,
      acceptedArtifacts:report.acceptedArtifactHashesUnchanged,stage03Inputs:report.originalStage03InputBindings,
      savedRecords:report.savedRecords,notRunRecords:report.notRunRecords,modelRequests:0,stage03Accepted:false})+'\n');
  }).catch(error=>{process.stderr.write(`review_verification_failed: ${error.message}\n`);process.exitCode=1;});
}
