import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { ROOT } from '../inspection.mjs';
import { bindRun, digest, START, CUTOFF } from '../../../../../db/benchmark/contracts.mjs';
import { prepareGemini } from '../../../../../db/benchmark/gemini-context.mjs';
import { GEMINI } from '../../../../../db/benchmark/gemini-config.mjs';
import { normalizePrepared } from './wire.mjs';

const packet=resolve(ROOT,'factory/03_build/output/hiring-showcase-v1');
const json=async path=>JSON.parse(await readFile(path,'utf8'));
const hash=async name=>createHash('sha256').update((await readFile(resolve(packet,name),'utf8')).replaceAll('\r\n','\n')).digest('hex');
const reviewedProposal='a717d9aed1bdaeda5941b63aceffbf3e4f85f2cc3163ad3e1f4010f3f445cac2';

export async function acceptedSchedule() {
  const acceptance=await json(resolve(packet,'continuation-v1/SCOPE_ACCEPTANCE.json'));
  assert.equal(acceptance.decision,'accepted');assert.equal(acceptance.userMessage,'accepted');
  assert.equal(acceptance.reviewedBindings.proposal,reviewedProposal);
  for(const [field,name] of [['proposal','CONTRACT_CHANGE_PROPOSAL.md'],['dataCompatibility','DATA_COMPATIBILITY.md'],
    ['draftPlan','PLAN_DRAFT.json'],['verification','VERIFY.md'],['inputBindings','INPUT_BINDINGS.json']])
    assert.equal(acceptance.reviewedBindings[field],await hash(name),'Accepted scope binding drift');
  assert.equal(acceptance.originalStage03GateAccepted,false);assert.equal(acceptance.originalIndexAssertionWaived,false);
  const draft=await json(resolve(packet,'PLAN_DRAFT.json'));
  assert.equal(draft.records.length,15);assert.deepEqual(draft.configuration,GEMINI);
  const sources=[...new Set(draft.records.map(r=>r.sourceFile))].sort();assert.equal(sources.length,5);
  const methods=['rules','single-shot-model','tool-using-model'],schedule=[];
  for(const [index,sourceFile] of sources.entries()) {
    assert.match(sourceFile,/^c_[a-f0-9]{12}\.json$/);
    const original=await json(resolve(ROOT,'factory/02_data/benchmark/observable',sourceFile));
    const sourceScope={workspaceId:original.events[0].workspaceId,caseId:original.caseRef,
      runId:original.events[0].runId,actorId:'a_123456789abc',start:START,clock:CUTOFF};
    // Rotate method order, as required by the unchanged Spec. With five cases
    // position frequencies are necessarily 2/2/1, not perfectly balanced.
    const order=[...methods.slice(index%3),...methods.slice(0,index%3)];
    for(const method of order) {
      const matches=draft.records.filter(r=>r.sourceFile===sourceFile&&r.method===method);assert.equal(matches.length,1);
      const row=matches[0];assert.equal(row.replicateIndex,1);assert.equal(digest(original),row.sourceSha256);
      const observable=bindRun(original,sourceScope,row.scope);assert.equal(digest(observable),row.observableSha256);
      const prepared=method==='rules'?null:prepareGemini(observable,row.scope,{method});
      assert.equal(prepared?.requestSha256??null,row.initialRequestSha256);
      const normalized=prepared?normalizePrepared(prepared):null;
      schedule.push({ordinal:schedule.length+1,sourceFile,sourceHash:row.sourceSha256,method,replicateIndex:1,
        scope:row.scope,observableSha256:digest(observable),initialRequestSha256:normalized?.requestSha256??null,
        originalDraftRequestSha256:row.initialRequestSha256,initialRequestBytes:normalized?.context.requestBytes??null,
        initialWireOutputCap:normalized?.body.generationConfig.maxOutputTokens??null,executionStatus:'NOT_RUN'});
    }
  }
  assert.equal(new Set(schedule.map(r=>r.scope.runId)).size,15);
  return {version:'b01-hiring-showcase-schedule-v1',scopeDecision:'accepted',proposalSha256:reviewedProposal,
    actualExecution:'NOT_RUN',modelRequests:0,executionPermitted:false,configuration:GEMINI,records:schedule,
    ordering:'case-order frozen; cyclic method rotation; frequencies 2/2/1',
    methodPositionCounts:Object.fromEntries(methods.map(m=>[m,[0,1,2].map(position=>schedule.filter((r,i)=>i%3===position&&r.method===m).length)])),
    deferredInitialRepeats:20,deferredChangedRecords:15,runtimeIntervention:'NOT_RUN',largerB01Complete:false,
    blockers:['generation_compatibility_unresolved','prior_strict_index_qualification_pending']};
}
