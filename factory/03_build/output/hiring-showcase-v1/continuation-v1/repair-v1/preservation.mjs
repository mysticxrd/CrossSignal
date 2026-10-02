import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inventory } from '../../../../../02_data/benchmark/preservation.mjs';
import { ROOT } from '../../inspection.mjs';

export const DIRECTORY=fileURLToPath(new URL('.',import.meta.url));
export const json=async path=>JSON.parse(await readFile(path,'utf8'));
export const rawHash=async path=>createHash('sha256').update(await readFile(path)).digest('hex');
const proposalHash='0b2fdd96d3173ebd4a8a58b38dd65fc59f8112474b08d8c5728551fc591f5901';
export async function checkQualification() {
  const accepted=await json(resolve(DIRECTORY,'PRESERVATION_ACCEPTANCE.json'));
  assert.equal(accepted.decision,'accepted');assert.equal(accepted.userMessage,'Accept the preservation qualification');
  assert.equal(accepted.proposalSha256,proposalHash);
  assert.equal(await rawHash(resolve(DIRECTORY,'../PRESERVATION_QUALIFICATION_PROPOSAL.md')),proposalHash);
  assert.equal(accepted.originalBaselineReplaced,false);assert.equal(accepted.stage03Accepted,false);
  const observed=await json(resolve(DIRECTORY,'../INDEX_RECHECK.json'));
  assert.equal(accepted.logicalEntryDigest,observed.logicalEntriesSha256);
  const before=await json(resolve(DIRECTORY,'PRESERVATION_BEFORE.json')),root=before.repositories.outer.root;
  assert.equal(await rawHash(resolve(root,'.git/index')),accepted.currentOuterRawIndexSha256);
  const git=args=>{
    const r=spawnSync('git',['-c',`safe.directory=${root.replaceAll('\\','/')}`,...args],
      {cwd:root,encoding:'utf8',env:{...process.env,GIT_OPTIONAL_LOCKS:'0'},timeout:10000});
    assert.equal(r.error,undefined);assert.equal(r.status,0);return r.stdout;
  };
  const indexed=git(['ls-files','--stage']).trimEnd().split('\n').map(line=>{
    const [mode,id,stage,path]=line.match(/^(\d+) ([a-f0-9]+) (\d)\t(.+)$/).slice(1);
    assert.equal(stage,'0');return `${mode} ${id}\t${path}`;
  }).sort();
  const head=git(['ls-tree','-r','HEAD']).trimEnd().split('\n').map(line=>{
    const [mode,id,path]=line.match(/^(\d+) blob ([a-f0-9]+)\t(.+)$/).slice(1);return `${mode} ${id}\t${path}`;
  }).sort();
  assert.deepEqual(indexed,head);assert.equal(git(['diff','--cached','--raw']),'');
  assert.equal(git(['rev-parse','HEAD']).trim(),before.repositories.outer.head);
  return {decision:'accepted',indexedEntries:indexed.length,indexMatchesHead:true,
    currentRawIndexUnchanged:true,historicalStrictAssertion:'failed_preserved_qualified_for_future_checks'};
}
export async function checkPreservation({sessionDirectory=null}={}) {
  const before=await json(resolve(DIRECTORY,'PRESERVATION_BEFORE.json'));
  assert.deepEqual(before.existingFilesAuthorizedToChange,[]);
  let resultPrefix=null;
  if(sessionDirectory) {
    const claim=await json(resolve(DIRECTORY,'EXECUTION_CLAIM.json'));
    assert.equal(resolve(sessionDirectory),resolve(claim.directory));
    assert.match(claim.sessionId,/^showcase-session-[a-f0-9]{16}$/);
    assert.equal(resolve(claim.directory),resolve(ROOT,before.newResultParent,claim.sessionId));
    resultPrefix=before.newResultParent+claim.sessionId+'/';
  }
  const repositories=[];
  for(const [name,saved] of Object.entries(before.repositories)) {
    const now=await inventory(saved.root,false);
    assert.deepEqual(Object.entries(saved.files).filter(([path,hash])=>now.files[path]!==hash),[],`Existing ${name} bytes changed`);
    assert(saved.directories.every(path=>now.directories.includes(path)));
    assert.deepEqual(saved.links,now.links);assert.equal(saved.head,now.head);assert.equal(saved.branch,now.branch);
    assert.equal(saved.indexSha256,now.indexSha256);assert(saved.status.every(line=>now.status.includes(line)));
    const added=Object.keys(now.files).filter(path=>!(path in saved.files));
    assert(added.every(path=>name==='product'&&(path.startsWith(before.newSourceBoundary)
      ||resultPrefix!==null&&path.startsWith(resultPrefix))),'New file outside exact scope');
    repositories.push({repository:name,unchangedFiles:Object.keys(saved.files).length,addedFiles:added.length,
      unchangedHead:now.head,unchangedIndexSha256:now.indexSha256});
  }
  return {repositories,qualification:await checkQualification(),acceptedEvidenceRewritten:false,gitReset:false};
}
