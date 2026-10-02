import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, readdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { ROOT } from '../inspection.mjs';
import { acceptedSchedule } from './schedule.mjs';
import { normalizePrepared } from './wire.mjs';
import { diagnosticTransport } from './transport.mjs';
import { sanitizeError, readDiagnostic, ERROR_BYTES } from './diagnostics.mjs';
import { executeShowcase } from './run.mjs';
import { prepareGemini } from '../../../../../db/benchmark/gemini-context.mjs';
import { GEMINI } from '../../../../../db/benchmark/gemini-config.mjs';
import { bindRun, digest, START, CUTOFF } from '../../../../../db/benchmark/contracts.mjs';
import { isolatedGemini } from '../../../../../db/benchmark/gemini-isolation.mjs';
import { GeminiStore } from '../../../../../db/benchmark/gemini-store.mjs';
import { runGeminiInvestigation } from '../../../../../db/benchmark/gemini-runner.mjs';

const names=(await readdir(resolve(ROOT,'factory/02_data/benchmark/observable'))).sort();
const original=JSON.parse(await readFile(resolve(ROOT,'factory/02_data/benchmark/observable',names[0]),'utf8'));
const source={workspaceId:original.events[0].workspaceId,caseId:original.caseRef,runId:original.events[0].runId,
  actorId:'a_123456789abc',start:START,clock:CUTOFF};
const scope={...source,workspaceId:'w_0123456789ab',caseId:'c_0123456789ab',runId:'r_0123456789ab'};
const observable=bindRun(original,source,scope),fixtureKey='OFFLINE_FIXTURE_SECRET_CANARY';
const field='generationConfig.responseFormat.text.schema.properties.terminalStatus.type';
const finding=()=>({version:'benchmark-finding-v1',terminalStatus:'epistemic_abstention',
  signalSummary:'OFFLINE_FIXTURE ungraded synthetic answer; not a scored model finding.',hypotheses:[],affectedSegment:null,
  relatedChangeId:null,unresolvedAlternatives:[],recommendation:{kind:'abstain',target:null,
    summary:'OFFLINE_FIXTURE only',boundary:'recommendation_only',risk:'none',approvalRequired:false},claims:[]});
const rejected=()=>({error:{code:400,status:'INVALID_ARGUMENT',message:'PRIVATE_PROSE_CANARY',details:[
  {'@type':'type.googleapis.com/google.rpc.BadRequest',fieldViolations:[{field,description:'PRIVATE_PROSE_CANARY'}]}]}});
async function runFixture(generated) {
  const directory=await mkdtemp(join(tmpdir(),'crosssignal-showcase-offline-'));
  const store=new GeminiStore(resolve(directory,'case.sqlite'),{metadata:{scope,method:'single-shot-model',mode:'OFFLINE_FIXTURE'},observable});
  const transport=diagnosticTransport({mode:'OFFLINE_FIXTURE',keySource:()=>fixtureKey,fetchImpl:async(url,options)=>{
    if(url.endsWith(':countTokens'))return new Response(JSON.stringify({totalTokens:1000}));
    assert.equal(store.history().at(-1).kind,'request');
    assert.equal(JSON.parse(options.body).generationConfig.responseFormat.text.schema.properties.terminalStatus.type,'string');
    return generated();
  }});
  try {return {result:await runGeminiInvestigation({observable,scope,method:'single-shot-model',store,transport}),
    history:store.history(),transport:transport.counters()};}finally {store.close();}
}

test('accepted 15-row schedule preserves the approved scope pool and rotates method positions',async()=>{
  const schedule=await acceptedSchedule();assert.equal(schedule.records.length,15);assert.equal(schedule.scopeDecision,'accepted');
  assert.equal(schedule.executionPermitted,false);assert.deepEqual(schedule.configuration,GEMINI);
  assert.equal(schedule.records.filter(r=>r.method==='rules').length,5);
  assert.equal(schedule.records.filter(r=>r.method==='single-shot-model').length,5);
  assert.equal(schedule.records.filter(r=>r.method==='tool-using-model').length,5);
  for(const counts of Object.values(schedule.methodPositionCounts))assert.deepEqual([...counts].sort(),[1,2,2]);
  assert.equal(new Set(schedule.records.map(r=>r.scope.runId)).size,15);
  assert(schedule.records.every(r=>r.replicateIndex===1&&r.executionStatus==='NOT_RUN'));
});

test('wire normalization is idempotent, preserves input and only makes implied enum types explicit',()=>{
  const prepared=prepareGemini(observable,scope),before=digest(prepared);
  const normalized=normalizePrepared(prepared);assert.equal(digest(prepared),before);
  assert.equal(normalized.body.generationConfig.responseFormat.text.schema.properties.terminalStatus.type,'string');
  assert.deepEqual(normalized.body.generationConfig.responseFormat.text.schema.properties.terminalStatus.enum,
    prepared.body.generationConfig.responseFormat.text.schema.properties.terminalStatus.enum);
  assert.notEqual(normalized.requestSha256,prepared.requestSha256);assert.equal(normalized.requestSha256,digest(normalized.body));
  assert.deepEqual(normalizePrepared(normalized),normalized);
  for(const name of ['maxOutputTokens','thinkingConfig','temperature','responseModalities','candidateCount'])
    assert.deepEqual(normalized.body.generationConfig[name],prepared.body.generationConfig[name]);
  assert.equal(normalized.context.requestBytes,Buffer.byteLength(JSON.stringify(normalized.body)));
});

test('fresh restricted preparations for all ten model contexts match public-only normalized bodies',async()=>{
  const schedule=await acceptedSchedule();
  for(const row of schedule.records.filter(r=>r.method!=='rules')) {
    const input=JSON.parse(await readFile(resolve(ROOT,'factory/02_data/benchmark/observable',row.sourceFile),'utf8'));
    const originalScope={...source,workspaceId:input.events[0].workspaceId,caseId:input.caseRef,runId:input.events[0].runId};
    const fresh=bindRun(input,originalScope,row.scope);
    const restricted=await isolatedGemini({operation:'prepare',observable:fresh,scope:row.scope,options:{method:row.method}});
    const normalized=normalizePrepared(restricted);
    assert.equal(normalized.requestSha256,row.initialRequestSha256);
    assert(!JSON.stringify(normalized.body).includes(input.caseRef));
  }
  const denied=await isolatedGemini({operation:'probe',paths:[resolve(ROOT,'factory/03_build/output/hiring-showcase-v1/continuation-v1/SCOPE_ACCEPTANCE.json'),
    resolve(ROOT,'factory/03_build/output/hiring-showcase-v1/continuation-v1/transport.mjs')]});
  assert.equal(denied.readDenials,2);assert.equal(denied.environmentEmpty,true);assert.equal(denied.fetchUnavailable,true);
});

test('normalized fixture request is counted/bound/committed before original runner dispatch',async()=>{
  const {result,history,transport}=await runFixture(()=>new Response(JSON.stringify({modelVersion:GEMINI.model,
    candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(finding())}]}}],
    usageMetadata:{promptTokenCount:1000,candidatesTokenCount:100,thoughtsTokenCount:20,totalTokenCount:1120}})));
  assert.equal(result.terminalStatus,'epistemic_abstention');assert.equal(result.budget.cumulativeGeneratedTokens,120);
  const request=JSON.parse(history.find(r=>r.kind==='request').payload);
  assert.equal(request.prepared.requestSha256,request.lease.requestSha256);
  assert.equal(request.prepared.requestSha256,digest(request.prepared.body));
  assert.equal(transport.countCalls,2);assert.equal(transport.generationCalls,1);assert.equal(transport.automaticRetries,0);
  assert.equal(result.runtimeEffects,0);
});

test('fixture HTTP400 retains only bounded diagnostics in a terminal unknown-usage record',async()=>{
  const {result,history,transport}=await runFixture(()=>new Response(JSON.stringify(rejected()),{status:400}));
  assert.equal(result.terminalStatus,'indeterminate_usage');assert.equal(result.failureReason,'http_failure');
  assert.equal(result.budget.records[0].generatedTokens,null);assert.equal(history.at(-1).kind,'terminal');
  assert.deepEqual(transport.lastFailure.diagnostic.fields,[field]);
  assert.equal(transport.lastFailure.diagnostic.providerStatus,'INVALID_ARGUMENT');
  assert(!JSON.stringify(history).includes('PRIVATE_PROSE_CANARY'));assert(!JSON.stringify(history).includes(fixtureKey));
  assert.equal(transport.generationCalls,1);assert.equal(transport.automaticRetries,0);
});

test('diagnostics reject secret echoes, unknown fields, prose, malformed and oversized bodies',()=>{
  const request=normalizePrepared(prepareGemini(observable,scope)).body;
  const error=rejected();error.error.details[0].fieldViolations.push({field:'files.private_truth',description:'PRIVATE'});
  const safe=sanitizeError(Buffer.from(JSON.stringify(error)),{httpStatus:400,requestBody:request,secret:fixtureKey});
  assert.deepEqual(safe.fields,[field]);assert(!JSON.stringify(safe).includes('PRIVATE'));
  error.error.message=fixtureKey;
  assert.equal(sanitizeError(Buffer.from(JSON.stringify(error)),{httpStatus:400,requestBody:request,secret:fixtureKey}).bodyUnavailableReason,'secret_echo_discarded');
  assert.equal(sanitizeError(Buffer.from('not json'),{httpStatus:400,requestBody:request}).bodyUnavailableReason,'invalid_error_json');
  assert.equal(sanitizeError(new Uint8Array(ERROR_BYTES+1),{httpStatus:400,requestBody:request}).bodyUnavailableReason,'error_body_limit');
});

test('diagnostic stream stops at its byte limit and request abort; transport never retries',async()=>{
  const controller=new AbortController(),request=prepareGemini(observable,scope).body;
  let canceled=false;
  const oversized=new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(ERROR_BYTES+1));},cancel(){canceled=true;}}),{status:400});
  const result=await readDiagnostic(oversized,{signal:controller.signal,requestBody:request,secret:fixtureKey});
  assert.equal(result.bodyUnavailableReason,'error_body_limit');assert.equal(canceled,true);
  const transport=diagnosticTransport({mode:'OFFLINE_FIXTURE',keySource:()=>fixtureKey,
    fetchImpl:async()=>new Response(new ReadableStream({start(){}}),{status:400})});
  await assert.rejects(transport.count(prepareGemini(observable,scope),performance.now()+35),/request_timeout/);
  assert.equal(transport.counters().countCalls,1);assert.equal(transport.counters().automaticRetries,0);
});

test('new execution entrypoint remains blocked before key/network/store access, including caller flags',()=>{
  assert.throws(()=>executeShowcase(),/unresolved/);assert.throws(()=>executeShowcase({approved:true}),/Caller flags/);
  const r=spawnSync(process.execPath,[resolve(ROOT,'factory/03_build/output/hiring-showcase-v1/continuation-v1/run.mjs'),'--execute'],
    {cwd:ROOT,env:{},encoding:'utf8',timeout:10000});
  assert.equal(r.error,undefined);assert.equal(r.status,2);assert.equal(JSON.parse(r.stdout).modelRequests,0);
  assert.equal(JSON.parse(r.stdout).status,'requests_blocked');
});
