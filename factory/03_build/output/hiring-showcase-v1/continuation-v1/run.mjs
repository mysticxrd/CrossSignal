import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { acceptedSchedule } from './schedule.mjs';
import { normalizePrepared } from './wire.mjs';
import { ROOT } from '../inspection.mjs';
import { bindRun, START, CUTOFF } from '../../../../../db/benchmark/contracts.mjs';
import { prepareGemini } from '../../../../../db/benchmark/gemini-context.mjs';

const directory=fileURLToPath(new URL('.',import.meta.url));
export async function prepareSchedule() {
  const manifest=await acceptedSchedule(),requests=[];
  for(const row of manifest.records.filter(r=>r.method!=='rules')) {
    const original=JSON.parse(await readFile(resolve(ROOT,'factory/02_data/benchmark/observable',row.sourceFile),'utf8'));
    const sourceScope={workspaceId:original.events[0].workspaceId,caseId:original.caseRef,
      runId:original.events[0].runId,actorId:'a_123456789abc',start:START,clock:CUTOFF};
    const observable=bindRun(original,sourceScope,row.scope);
    const request=normalizePrepared(prepareGemini(observable,row.scope,{method:row.method}));
    assert.equal(request.requestSha256,row.initialRequestSha256);
    requests.push({runId:row.scope.runId,method:row.method,request});
  }
  await writeFile(resolve(directory,'SCHEDULE_PREPARED.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
  await writeFile(resolve(directory,'NORMALIZED_REQUESTS.json'),JSON.stringify({status:'OFFLINE_NOT_DISPATCHED',
    privateInputs:0,modelRequests:0,requests},null,2)+'\n',{flag:'wx'});
  return {scope:'accepted',stage:'03_build',records:15,model:GEMINI_MODEL,modelRequests:0,
    actualEvaluation:'NOT_RUN',requestsBlocked:manifest.blockers};
}
const GEMINI_MODEL='gemini-3.5-flash-lite';

// An unresolved compatibility/preservation requirement blocks before any key
// lookup, metadata/count endpoint, result-store creation or model generation.
export function executeShowcase(...options) {
  assert.equal(options.length,0,'Caller flags cannot enable requests');
  throw new Error('generation_compatibility_and_prior_preservation_review_unresolved');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const args=process.argv.slice(2);
  if(args.length===1&&args[0]==='--prepare')prepareSchedule().then(r=>process.stdout.write(JSON.stringify(r,null,2)+'\n'))
    .catch(()=>{process.stderr.write('offline_preparation_failed; preserve existing snapshots and check accepted bindings\n');process.exitCode=1;});
  else if(args.length===1&&args[0]==='--execute') {
    try {executeShowcase();}catch {process.stdout.write(JSON.stringify({stage:'03_build',scope:'accepted',
      status:'requests_blocked',reason:'generation_compatibility_and_prior_preservation_review_unresolved',modelRequests:0})+'\n');process.exitCode=2;}
  } else {process.stdout.write('Use --prepare for offline artifacts. Execution remains blocked.\n');process.exitCode=2;}
}
