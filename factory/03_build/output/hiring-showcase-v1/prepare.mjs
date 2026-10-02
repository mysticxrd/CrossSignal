import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { draftPlan, inspectSavedSession, renderHtml, recordMarkdown, evaluationMarkdown } from './inspection.mjs';
import { digest } from '../../../../db/benchmark/contracts.mjs';

const directory=fileURLToPath(new URL('.',import.meta.url));
export async function prepareInspection() {
  const plan=await draftPlan();
  const snapshot=await inspectSavedSession();
  const put=(name,value)=>writeFile(resolve(directory,name),value,{flag:'wx'});
  // New exports only; a second prepare cannot overwrite earlier drafts/evidence.
  await put('PLAN_DRAFT.json',JSON.stringify(plan,null,2)+'\n');
  await put('INSPECTION_SNAPSHOT.json',JSON.stringify(snapshot,null,2)+'\n');
  await mkdir(resolve(directory,'saved-cases'));
  for(const record of snapshot.records)await put(`saved-cases/${record.runId}.md`,recordMarkdown(record));
  await put('index.html',renderHtml(snapshot,plan));
  await put('EVALUATION_REPORT.md',evaluationMarkdown(snapshot,plan));
  return {mode:'OFFLINE_INSPECTION_ONLY',draftRecords:plan.records.length,retainedRecords:snapshot.records.length,
    proposedStudy:'NOT_RUN',snapshotSha256:digest(snapshot),modelRequests:0,runtimeEffects:0};
}
export async function replayInspection() {
  const saved=JSON.parse(await readFile(resolve(directory,'INSPECTION_SNAPSHOT.json'),'utf8'));
  const current=await inspectSavedSession();
  if(digest(current)!==digest(saved))throw new Error('saved_inspection_drift');
  return {mode:'READ_ONLY_RELOAD',retainedRecords:current.records.length,snapshotSha256:digest(current),
    databaseHashes:current.records.map(r=>r.databaseSha256),modelRequests:0,runtimeEffects:0};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);
  const action=args.length===0?prepareInspection:args.length===1&&args[0]==='--replay'?replayInspection:null;
  if(!action){process.stderr.write('Offline preparation or --replay only; no model execution option.\n');process.exitCode=2;}
  else action().then(result=>process.stdout.write(JSON.stringify(result,null,2)+'\n')).catch(()=>{
    process.stderr.write('offline_inspection_failed; preserve existing exports and inspect source/hash/terminal-state checks\n');process.exitCode=1;
  });
}
