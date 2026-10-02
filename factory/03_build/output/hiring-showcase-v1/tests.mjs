import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, mkdir, mkdtemp, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { draftPlan, inspectSavedSession, inspectRecord, renderHtml, recordMarkdown, escapeHtml, ROOT, SESSION } from './inspection.mjs';
import { bindRun, digest, START, CUTOFF } from '../../../../db/benchmark/contracts.mjs';
import { prepareGemini } from '../../../../db/benchmark/gemini-context.mjs';
import { GEMINI } from '../../../../db/benchmark/gemini-config.mjs';

const json=async path=>JSON.parse(await readFile(path,'utf8'));
const directory=resolve(ROOT,'factory/03_build/output/hiring-showcase-v1');
async function fixtureCopy() {
  const manifest=await json(resolve(ROOT,SESSION,'MANIFEST.json'));
  const summary=await json(resolve(ROOT,SESSION,'SUMMARY.json'));
  const row=manifest.schedule.find(r=>r.scope.runId===summary.results[0].runId);
  const copy=await mkdtemp(join(tmpdir(),'crosssignal-showcase-inspection-'));
  await mkdir(resolve(copy,row.scope.runId));
  for(const name of ['case.sqlite','RESULT.json'])
    await copyFile(resolve(ROOT,SESSION,row.scope.runId,name),resolve(copy,row.scope.runId,name));
  return {manifest,row,copy};
}

test('draft preparation has 15 fresh records, preserves accepted facts and dispatches nothing',async()=>{
  const oldFetch=globalThis.fetch;let calls=0;
  globalThis.fetch=()=>{calls++;throw new Error('network_forbidden');};
  try {
    const plan=await draftPlan();
    assert.equal(plan.executionPermitted,false);assert.equal(plan.records.length,15);
    assert.equal(plan.priorArtifactsCredited,0);
    assert.deepEqual(plan.originalAcceptedSchedule,{initialRecords:35,changedRecords:15,totalRecords:50});
    assert.deepEqual(plan.configuration,GEMINI);
    assert.equal(plan.ceilings.maximumGenerationDispatches,65);
    assert.equal(plan.ceilings.maximumGeneratedTokensIncludingReasoning,35840);
    assert.equal(plan.ceilings.maximumTokenCountRequests,150);
    const identities=[];
    for(const row of plan.records) {
      const original=await json(resolve(ROOT,'factory/02_data/benchmark/observable',row.sourceFile));
      const source={workspaceId:original.events[0].workspaceId,caseId:original.caseRef,
        runId:original.events[0].runId,actorId:'a_123456789abc',start:START,clock:CUTOFF};
      const observable=bindRun(original,source,row.scope);
      assert.equal(row.sourceSha256,digest(original));assert.equal(row.observableSha256,digest(observable));
      assert.deepEqual(observable.events.map(e=>[e.id,e.type,e.at,e.payload]),original.events.map(e=>[e.id,e.type,e.at,e.payload]));
      assert.equal(row.executionStatus,'NOT_RUN');assert.equal(row.replicateIndex,1);
      for(const role of ['workspaceId','caseId','runId','actorId'])identities.push(row.scope[role]);
      if(row.method==='rules')assert.equal(row.initialRequestSha256,null);
      else {
        const request=prepareGemini(observable,row.scope,{method:row.method});
        assert.equal(row.initialRequestSha256,digest(request.body));assert.equal(row.initialWireOutputCap,1024);
        assert(!JSON.stringify(request.body).includes(original.caseRef),'Original Case identity leaked to fresh request');
      }
    }
    assert.equal(new Set(identities).size,60);
    for(const source of new Set(plan.records.map(r=>r.sourceCaseId)))
      assert.deepEqual(plan.records.filter(r=>r.sourceCaseId===source).map(r=>r.method),['rules','single-shot-model','tool-using-model']);
    assert.equal(calls,0);
  } finally {globalThis.fetch=oldFetch;}
});

test('cold read-only inspection verifies actual retained records and keeps unknown usage distinct',async()=>{
  const first=await inspectSavedSession(),second=await inspectSavedSession();
  assert.equal(digest(first),digest(second));assert.equal(first.retainedRecords,2);
  assert.equal(first.validModelFindings,0);assert.equal(first.proposed15RecordStudy,'NOT_RUN');
  assert.equal(first.transport.generationCalls,1);assert.equal(first.transport.automaticRetries,0);
  for(const record of first.records){assert.equal(record.readOnlyValidated,true);assert.equal(record.runtimeEffects,0);}
  const rules=first.records.find(r=>r.method==='rules'),failure=first.records.find(r=>r.method==='single-shot-model');
  assert.equal(rules.finding.hypotheses.length,1);assert.equal(rules.finding.hypotheses[0].contradictionIds.length,0);
  assert.equal(rules.citations.unknownIds.length,0);assert.equal(rules.citations.semanticSupport,'NOT_ADJUDICATED');
  assert.equal(failure.finding,null);assert.equal(failure.terminalStatus,'indeterminate_usage');
  assert.equal(failure.usage.totalGeneratedTokens,null);assert.equal(failure.usage.unavailableReason,'post_dispatch_usage_unavailable');
  assert.equal(failure.history.at(-1).kind,'terminal');
});

test('inspector rejects manifest identity and frozen source hash substitutions',async()=>{
  const {manifest,row}=await fixtureCopy();
  const substituted=structuredClone(row);substituted.scope.caseId='c_000000000001';
  await assert.rejects(inspectRecord(manifest,substituted,resolve(ROOT,SESSION)),{code:'ERR_ASSERTION'});
  const rehashed=structuredClone(row);rehashed.sourceHash='f'.repeat(64);
  await assert.rejects(inspectRecord(manifest,rehashed,resolve(ROOT,SESSION)),{code:'ERR_ASSERTION'});
  const changedManifest=structuredClone(manifest);changedManifest.model='substituted-model';
  await assert.rejects(inspectRecord(changedManifest,row,resolve(ROOT,SESSION)),{code:'ERR_ASSERTION'});
});

test('read-only reader rejects a corrupted history in a new disposable database copy',async()=>{
  const {manifest,row,copy}=await fixtureCopy();
  await inspectRecord(manifest,row,copy);
  const db=new DatabaseSync(resolve(copy,row.scope.runId,'case.sqlite'));
  try {
    db.exec('DROP TRIGGER benchmark_timeline_UPDATE');
    db.prepare('UPDATE benchmark_timeline SET hash=? WHERE sequence=1').run('f'.repeat(64));
  } finally {db.close();}
  await assert.rejects(inspectRecord(manifest,row,copy),{code:'ERR_ASSERTION'});
});

test('readable Case projection escapes evidence/answer strings and exposes limitations',async()=>{
  const snapshot=await inspectSavedSession(),plan=await draftPlan();
  const sentinel='<script>alert("injected")</script>';
  const record=snapshot.records.find(r=>r.finding);
  record.finding.signalSummary=sentinel;record.finding.hypotheses[0].summary=sentinel;
  record.finding.recommendation.summary=sentinel;
  record.allowedEvidence[0].payload={untrusted:sentinel};
  record.finding.hypotheses[0].supportIds.push(record.allowedEvidence[0].id,'<img src=x onerror=alert(1)>');
  const html=renderHtml(snapshot,plan);
  assert(!html.includes('<script>'));assert(!html.includes('<img '));
  assert(html.includes(escapeHtml(sentinel)));assert(html.includes('Unknown citation retained for grading: &lt;img'));
  assert(html.includes('None recorded. This limitation stays visible.'));
  assert(html.includes('Unknown generation usage remains unknown.'));
  assert(html.includes('Valid Gemini findings: 0'));assert(html.includes('study is NOT_RUN'));
  assert(!/<(?:script|iframe|form|button)\b|href="https?:|src="https?:/i.test(html));
  assert(html.includes("default-src 'none'"));
});

test('transport failure has no fabricated explanation, recommendation or epistemic abstention',async()=>{
  const failure=(await inspectSavedSession()).records.find(r=>!r.finding);
  const text=recordMarkdown(failure);
  assert(text.includes('No model finding returned.'));
  assert(text.includes('unknown; known ledger counter is not total server usage'));
  assert(text.includes('no diagnosis or epistemic abstention is inferred'));
  assert(!text.includes('checkout_deployment_regression'));
});

test('offline CLI rejects execute option before any preparation or credential/network route',()=>{
  const result=spawnSync(process.execPath,[resolve(directory,'prepare.mjs'),'--execute'],{
    cwd:ROOT,env:{},encoding:'utf8',timeout:10000});
  assert.equal(result.error,undefined);assert.equal(result.status,2);assert.equal(result.stdout,'');
  assert(result.stderr.includes('no model execution option'));
});

test('saved static export matches the read-only projection and labels the frozen intervals accurately',async()=>{
  const snapshot=await json(resolve(directory,'INSPECTION_SNAPSHOT.json'));
  const plan=await json(resolve(directory,'PLAN_DRAFT.json'));
  const html=await readFile(resolve(directory,'index.html'),'utf8');
  assert.equal(html,renderHtml(snapshot,plan));
  assert(html.includes('09:00–09:30 received revenue'));assert(html.includes('09:30–10:00 received revenue'));
  assert(!html.includes('Post-cutoff revenue'));
  assert(html.includes('Affected segment: IN/debit'));assert(html.includes('Atomic claims recorded: 0'));
});
