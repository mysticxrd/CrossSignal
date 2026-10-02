import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { acceptedSchedule } from '../schedule.mjs';
import { ROOT } from '../../inspection.mjs';
import { prepareGemini } from '../../../../../../db/benchmark/gemini-context.mjs';
import { bindRun, digest, START, CUTOFF } from '../../../../../../db/benchmark/contracts.mjs';
import { repairPrepared } from './wire.mjs';

export async function rowObservable(row) {
  assert.match(row.sourceFile,/^c_[a-f0-9]{12}\.json$/);
  const original=JSON.parse(await readFile(resolve(ROOT,'factory/02_data/benchmark/observable',row.sourceFile),'utf8'));
  assert.equal(digest(original),row.sourceHash);
  const source={...row.scope,workspaceId:original.events[0].workspaceId,caseId:original.caseRef,
    runId:original.events[0].runId,start:START,clock:CUTOFF};
  const observable=bindRun(original,source,row.scope);assert.equal(digest(observable),row.observableSha256);
  return observable;
}
export async function showcasePlan() {
  const approved=await acceptedSchedule(),cases=[...new Set(approved.records.map(r=>r.sourceFile))].sort();
  const methods=['tool-using-model','rules','single-shot-model'],schedule=[];
  for(const [index,sourceFile] of cases.entries()) {
    for(const method of [...methods.slice(index%3),...methods.slice(0,index%3)]) {
      const old=approved.records.find(r=>r.sourceFile===sourceFile&&r.method===method);
      const row={...old,ordinal:schedule.length+1,previousPreparedRequestSha256:old.initialRequestSha256};
      const observable=await rowObservable(row);
      const prepared=method==='rules'?null:repairPrepared(prepareGemini(observable,row.scope,{method}));
      row.initialRequestSha256=prepared?.requestSha256??null;row.initialRequestBytes=prepared?.context.requestBytes??null;
      schedule.push(row);
    }
  }
  assert.equal(schedule.length,15);assert.equal(new Set(schedule.map(r=>r.scope.runId)).size,15);
  return {version:'b01-hiring-showcase-executable-plan-v1',scopeDecision:'accepted',proposalSha256:approved.proposalSha256,
    truthMode:'SIMULATED',model:approved.configuration.model,configuration:approved.configuration,
    wireProfile:'developer-api-json-schema-v1',schedule,
    order:'frozen source case order; cyclic tool/rules/single-shot rotation; first tool investigation prioritized by owner',
    methodPositionCounts:Object.fromEntries(methods.map(m=>[m,[0,1,2].map(p=>schedule.filter((r,i)=>i%3===p&&r.method===m).length)])),
    ceilings:{generationDispatches:65,countRequests:150,metadataRequests:1,generatedTokensIncludingReasoning:35840},
    deferredInitialRepeats:20,deferredChangedRecords:15,runtimeIntervention:'NOT_RUN',paidFallback:false,completeB01:false};
}
