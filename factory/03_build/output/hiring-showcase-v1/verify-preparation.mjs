import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inventory } from '../../../02_data/benchmark/preservation.mjs';
import { deriveFactoryState } from '../../../_lib/factory-state.mjs';
import { fileHash, pathHash, markdownHashBindings, markdownSection } from '../../../_lib/verify-kit.mjs';
import { inputPaths } from '../../runner-checks.mjs';
import { ROOT } from './inspection.mjs';
import { replayInspection } from './prepare.mjs';

const directory=fileURLToPath(new URL('.',import.meta.url));
const json=async path=>JSON.parse(await readFile(path,'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

// This additive baseline checks this pass only. It does not replace/waive the
// prior runner's strict raw-index assertion or complete the original Build.
export async function verifyPreparation() {
  const baseline=await json(resolve(directory,'PRESERVATION_BEFORE.json'));
  assert.deepEqual(baseline.existingFilesAuthorizedToChange,[]);
  const repositories=[];
  for(const [kind,before] of Object.entries(baseline.repositories)) {
    // false includes all product stage files as well as historical source.
    const after=await inventory(before.root,false);
    const changed=Object.entries(before.files).filter(([path,hash])=>after.files[path]!==hash).map(([path])=>path);
    assert.deepEqual(changed,[],`Existing ${kind} files changed`);
    assert.deepEqual(before.links,after.links);
    assert.deepEqual(before.directories.filter(name=>!after.directories.includes(name)),[]);
    assert.equal(before.head,after.head);assert.equal(before.branch,after.branch);
    assert.equal(before.indexSha256,after.indexSha256);
    assert.deepEqual(before.status.filter(line=>!after.status.includes(line)),[],'Inherited Git status changed');
    const newFiles=Object.keys(after.files).filter(path=>!(path in before.files));
    assert(newFiles.every(path=>kind==='product'&&path.startsWith(baseline.newFilesBoundary)),'New file outside scope');
    repositories.push({repository:kind,unchangedFiles:Object.keys(before.files).length,
      unchangedHead:after.head,unchangedBranch:after.branch,unchangedIndexSha256:after.indexSha256,
      newFiles:newFiles.sort(),a01FactoryFiles:Object.keys(before.files).filter(p=>p.startsWith('_archive/2026-09-30-a01-before-b01/factory/')).length,
      a01StoredFiles:Object.keys(before.files).filter(p=>p.startsWith('outputs/a01/')).length});
  }
  for(const [path,expected] of Object.entries(baseline.accepted)) {
    assert.equal(sha(await readFile(resolve(ROOT,path))),expected.rawSha256);
    assert.equal(await fileHash(ROOT,resolve(ROOT,path)),expected.normalizedSha256);
  }
  const existingBuild=await readFile(resolve(ROOT,'factory/03_build/output/BUILD_EVIDENCE.md'),'utf8');
  const bindings=markdownHashBindings(markdownSection(existingBuild,/^## Declared input hashes$/));
  assert.deepEqual(bindings.map(b=>b.input).sort(),[...inputPaths].sort());
  for(const binding of bindings)assert.equal(await pathHash(ROOT,resolve(ROOT,binding.input)),binding.expected,`Old stage input drift: ${binding.input}`);
  const gate=await readFile(resolve(ROOT,'factory/03_build/output/HUMAN_GATE.md'),'utf8');
  assert.match(gate,/^gate_status: blocked$/m);assert.match(gate,/^decision: pending$/m);
  for(const [field,name] of [['build_evidence_sha256','BUILD_EVIDENCE.md'],['verification_sha256','VERIFY.md']])
    assert(gate.includes(`${field}: ${await fileHash(ROOT,resolve(ROOT,'factory/03_build/output',name))}`));
  const state=await deriveFactoryState({projectRoot:ROOT});
  for(const name of ['01_spec','02_data']) {
    const stage=state.stages.find(s=>s.name===name);
    assert.equal(stage.status,'complete');assert.equal(stage.gate,'accepted');assert.equal(stage.dependencies,'fresh');
  }
  assert.equal(state.stages.find(s=>s.name==='03_build').status,'in-progress');
  const reconciliation=await json(resolve(directory,'RECONCILIATION_ADDENDUM.json'));
  for(const record of [reconciliation.originalDocumentationRecord,reconciliation.originalIndexRecord])
    assert.equal(sha(await readFile(resolve(ROOT,record.path))),record.rawSha256);
  assert.equal(reconciliation.strictOriginalIndexCheckStillBlocked,true);
  const reload=await replayInspection();
  return {version:'hiring-showcase-offline-preparation-v1',status:'passed_for_this_additive_pass',
    verifiedAtUtc:new Date().toISOString(),acceptedArtifactHashesUnchanged:Object.keys(baseline.accepted).length,
    preservedStage03InputBindings:bindings.length,repositories,reload,modelRequests:0,runtimeEffects:0,
    originalStage03Gate:'blocked_pending',scopeAmendment:'pending',proposedStudy:'NOT_RUN',
    originalRunnerStrictIndexCheck:'blocked_prior_byte_drift_not_waived',completeB01:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const args=process.argv.slice(2);
  if(args.length>1||(args.length===1&&args[0]!=='--record')) {
    process.stderr.write('Read-only check or --record additive receipt only.\n');process.exitCode=2;
  } else verifyPreparation().then(async report=>{
    if(args[0]==='--record')await writeFile(resolve(directory,'PRESERVATION_CHECK.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
    process.stdout.write(JSON.stringify(report,null,2)+'\n');
  }).catch(error=>{process.stderr.write(`showcase_check_failed: ${error.message}\n`);process.exitCode=1;});
}
