import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { performance } from 'node:perf_hooks';
import { repairedTransport } from './transport.mjs';
import { repairPrepared, validateWireSchema } from './wire.mjs';
import { showcasePlan, rowObservable } from './plan.mjs';
import { fixtureSchedule, executionPreflight, executeShowcase } from './run.mjs';
import { checkQualification } from './preservation.mjs';
import { ROOT, inspectRecord } from '../../inspection.mjs';
import { GEMINI } from '../../../../../../db/benchmark/gemini-config.mjs';
import { digest, START, CUTOFF } from '../../../../../../db/benchmark/contracts.mjs';
import { prepareGemini } from '../../../../../../db/benchmark/gemini-context.mjs';
import { isolatedGemini } from '../../../../../../db/benchmark/gemini-isolation.mjs';
import { createGeminiBudget } from '../../../../../../db/benchmark/gemini-budget.mjs';

const fixtureKey='OFFLINE_FIXTURE_SECRET_NEVER_A_REAL_KEY';
const finding={version:'benchmark-finding-v1',terminalStatus:'epistemic_abstention',
  signalSummary:'OFFLINE_FIXTURE: ungraded synthetic response; no model performance evidence.',hypotheses:[],
  affectedSegment:null,relatedChangeId:null,unresolvedAlternatives:[],
  recommendation:{kind:'abstain',target:null,summary:'OFFLINE_FIXTURE; ungraded.',boundary:'recommendation_only',risk:'none',approvalRequired:false},claims:[]};
function fixtureTransport({reject=false}={}) {
  return repairedTransport({mode:'OFFLINE_FIXTURE',keySource:()=>fixtureKey,fetchImpl:async(url,options)=>{
    if(options.method==='GET')return new Response(JSON.stringify({name:`models/${GEMINI.model}`,
      supportedGenerationMethods:['generateContent'],inputTokenLimit:1048576,outputTokenLimit:65536}));
    const body=JSON.parse(options.body);
    if(url.endsWith(':countTokens'))return new Response(JSON.stringify({totalTokens:1500}));
    assert.equal(body.generationConfig.responseMimeType,'application/json');
    assert.equal(body.generationConfig.responseFormat,undefined);validateWireSchema(body.generationConfig.responseJsonSchema);
    if(reject)return new Response(JSON.stringify({error:{code:400,status:'INVALID_ARGUMENT',message:'PRIVATE_PROSE_NOT_RETAINED',
      details:[{'@type':'type.googleapis.com/google.rpc.BadRequest',fieldViolations:[
        {field:'generationConfig.responseJsonSchema',description:'PRIVATE_PROSE_NOT_RETAINED'}]}]}}),{status:400});
    let value=finding;
    if(body.generationConfig.responseJsonSchema.properties.kind) {
      const content=JSON.parse(body.contents[0].parts[0].text);
      value=content.queryResults.length?{kind:'finding',query:null,finding}:{kind:'query',finding:null,
        query:{tool:'revenue.inspect',arguments:{start:START,end:CUTOFF,limit:50,cursor:null,segment:null}}};
    }
    return new Response(JSON.stringify({modelVersion:GEMINI.model,candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(value)}]}}],
      usageMetadata:{promptTokenCount:1500,candidatesTokenCount:120,thoughtsTokenCount:20,totalTokenCount:1640}}));
  }});
}
test('accepted pool rotates tool-first without changing cases, identities, counts or limits',async()=>{
  const plan=await showcasePlan();assert.equal(plan.schedule.length,15);assert.deepEqual(plan.configuration,GEMINI);
  assert.equal(plan.schedule[0].method,'tool-using-model');assert.equal(plan.schedule.filter(r=>r.method==='rules').length,5);
  for(const counts of Object.values(plan.methodPositionCounts))assert.deepEqual([...counts].sort(),[1,2,2]);
  assert.equal(new Set(plan.schedule.map(r=>r.scope.runId)).size,15);
});
test('all ten fresh restricted preparations use the Developer API wire contract without changing host answers',async()=>{
  const plan=await showcasePlan();
  for(const row of plan.schedule.filter(r=>r.method!=='rules')) {
    const observable=await rowObservable(row);
    const prepared=await isolatedGemini({operation:'prepare',observable,scope:row.scope,options:{method:row.method}});
    const before=digest(prepared),wire=repairPrepared(prepared);assert.equal(digest(prepared),before);
    assert.equal(wire.requestSha256,row.initialRequestSha256);assert.deepEqual(repairPrepared(wire),wire);
    assert.equal(wire.body.generationConfig.responseMimeType,'application/json');
    assert.equal(wire.context.requestBytes,Buffer.byteLength(JSON.stringify(wire.body)));
    for(const field of ['thinkingConfig','temperature','candidateCount','maxOutputTokens','responseModalities'])
      assert.deepEqual(wire.body.generationConfig[field],prepared.body.generationConfig[field]);
  }
  const probe=await isolatedGemini({operation:'probe',paths:[resolve(ROOT,'factory/03_build/output/hiring-showcase-v1/continuation-v1/repair-v1/run.mjs'),
    resolve(ROOT,'factory/03_build/output/hiring-showcase-v1/continuation-v1/repair-v1/PRESERVATION_ACCEPTANCE.json')]});
  assert.equal(probe.readDenials,2);assert.equal(probe.writesDenied,true);assert.equal(probe.childrenDenied,true);
  assert.equal(probe.environmentEmpty,true);assert.equal(probe.fetchUnavailable,true);
});
test('unknown schema keywords, MIME values, native tools and raised wire caps fail before dispatch',async()=>{
  assert.throws(()=>validateWireSchema({type:'string',pattern:'anything'}),/unsupported_wire/);
  const row=(await showcasePlan()).schedule[0],prepared=repairPrepared(prepareGemini(await rowObservable(row),row.scope,{method:row.method}));
  for(const change of [p=>p.body.generationConfig.maxOutputTokens=1025,p=>p.body.tools=[],p=>p.body.generationConfig.responseMimeType='APPLICATION_JSON']) {
    const corrupt=structuredClone(prepared);change(corrupt);corrupt.requestSha256=digest(corrupt.body);
    const transport=fixtureTransport();await assert.rejects(transport.count(corrupt,performance.now()+1000));
    assert.equal(transport.counters().countCalls,0);assert.equal(transport.counters().generationCalls,0);
  }
});
test('same accounting rejects accumulated context overflow and reserves thinking within the original caps',async()=>{
  const row=(await showcasePlan()).schedule[0],prepared=repairPrepared(prepareGemini(await rowObservable(row),row.scope,{method:row.method}));
  const ledger=createGeminiBudget(),large={requestSha256:prepared.requestSha256,inputTokens:7500,completeInputTokenBound:7500};
  assert.throws(()=>ledger.begin(prepared,large),/context_overflow/);
  const next=createGeminiBudget(),lease=next.begin(prepared,{...large,inputTokens:1500,completeInputTokenBound:1756});
  next.finish(lease,{usage:{counts:{promptTokenCount:1500,candidatesTokenCount:1000,thoughtsTokenCount:25,totalTokenCount:2525}}});
  assert.equal(next.snapshot().terminalStatus,'budget_exhausted');assert.equal(next.snapshot().cumulativeGeneratedTokens,1025);
});
test('fixture orchestration durably saves 15 records, tool transcripts and read-only reload without grading',async()=>{
  const directory=await mkdtemp(resolve(tmpdir(),'crosssignal-15-offline-'));
  const summary=await fixtureSchedule({directory,transport:fixtureTransport()});
  assert.equal(summary.complete,true);assert.equal(summary.completedRecords,15);assert.equal(summary.mode,'OFFLINE_FIXTURE');
  assert.equal(summary.transport.generationCalls,15);assert.equal(summary.transport.countCalls,50);
  assert.equal(summary.transport.metadataCalls,1);assert.equal(summary.automaticRetries,0);assert.equal(summary.runtimeEffects,0);
  const manifest=JSON.parse(await readFile(resolve(directory,'MANIFEST.json'),'utf8'));
  for(const row of manifest.schedule) {
    const record=await inspectRecord(manifest,row,directory);assert.equal(record.readOnlyValidated,true);
    if(row.method==='tool-using-model')assert.equal(record.history.filter(r=>r.kind==='tool_result').length,1);
    assert((await readFile(resolve(directory,row.scope.runId,'CASE.md'),'utf8')).includes('OFFLINE_FIXTURE'));
  }
});
test('fixture HTTP400 retains a terminal record and bounded fields then leaves 14 NOT_RUN without retry',async()=>{
  const directory=await mkdtemp(resolve(tmpdir(),'crosssignal-15-failure-offline-'));
  const summary=await fixtureSchedule({directory,transport:fixtureTransport({reject:true})});
  assert.equal(summary.complete,false);assert.equal(summary.completedRecords,1);assert.equal(summary.blocker.reason,'http_failure');
  assert.equal(summary.recordStatuses.filter(r=>r.status==='NOT_RUN').length,14);
  assert.equal(summary.transport.generationCalls,1);assert.equal(summary.transport.automaticRetries,0);
  assert.deepEqual(summary.blocker.lastFailure.diagnostic.fields,['generationConfig.responseJsonSchema']);
  assert(!JSON.stringify(summary).includes('PRIVATE_PROSE_NOT_RETAINED'));assert(!JSON.stringify(summary).includes(fixtureKey));
});
test('accepted preservation qualification passes without changing the old failed assertion or baseline',async()=>{
  const result=await checkQualification();assert.equal(result.decision,'accepted');assert.equal(result.indexMatchesHead,true);
  assert.equal(result.historicalStrictAssertion,'failed_preserved_qualified_for_future_checks');
});
test('online entrypoint rejects caller approval flags before key or network access',async()=>{
  await assert.rejects(executionPreflight({approved:true}),/Caller options/);
  await assert.rejects(executeShowcase({approved:true}),/Caller options/);
});
