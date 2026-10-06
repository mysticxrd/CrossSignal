import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { performance } from 'node:perf_hooks';
import { GEMINI } from '../db/benchmark/gemini-config.mjs';
import { prepareGemini } from '../db/benchmark/gemini-context.mjs';
import { isolatedGemini } from '../db/benchmark/gemini-isolation.mjs';
import { GeminiStore } from '../db/benchmark/gemini-store.mjs';
import { createHttpTransport } from '../db/benchmark/gemini-http.mjs';
import { runGeminiInvestigation } from '../db/benchmark/gemini-runner.mjs';
import { freeTierTransport } from '../db/benchmark/gemini-execution.mjs';
import { bindRun, START, CUTOFF, digest } from '../db/benchmark/contracts.mjs';

const cases = readdirSync('factory/02_data/benchmark/observable').sort()
  .map(n => JSON.parse(readFileSync(`factory/02_data/benchmark/observable/${n}`, 'utf8')));
const input = cases[0], scope = { workspaceId: input.events[0].workspaceId, caseId: input.caseRef,
  runId: input.events[0].runId, actorId: 'a_123456789abc', start: START, clock: CUTOFF };
const fixtureKey = 'OFFLINE_SECRET_KEY_CANARY_ONLY';
function finding() {
  return { version: 'benchmark-finding-v1', terminalStatus: 'epistemic_abstention', signalSummary: 'OFFLINE_FIXTURE: ungraded test answer.',
    hypotheses: [], affectedSegment: null, relatedChangeId: null, unresolvedAlternatives: [],
    recommendation: { kind: 'abstain', target: null, summary: 'Fixture only, no effect.', boundary: 'recommendation_only', risk: 'none', approvalRequired: false }, claims: [] };
}
function response(value = finding(), counts = {}) {
  return { modelVersion: GEMINI.model, candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(value) }] } }],
    usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 100, thoughtsTokenCount: 20, totalTokenCount: 1120, ...counts } };
}
function store(method = 'single-shot-model') {
  const dir = mkdtempSync(join(tmpdir(), 'crosssignal-gemini-offline-'));
  return new GeminiStore(join(dir, 'case.sqlite'), { metadata: { scope, method, truthMode: 'SIMULATED', configHash: digest(GEMINI) }, observable: input });
}
function fixtureTransport({ generated = () => response(), tokens = 1000, onFetch = () => {} } = {}) {
  return createHttpTransport({ mode: 'OFFLINE_FIXTURE', keySource: () => fixtureKey, log: () => {},
    fetchImpl: async (url, options) => {
      onFetch(url, options);
      const payload = url.endsWith(':countTokens') ? { totalTokens: tokens } : generated();
      return new Response(JSON.stringify(payload), { headers: { 'x-request-id': 'fixture-request' } });
    } });
}

test('real restricted worker denies private/evaluator/history/credential/write/process surfaces', async () => {
  const paths = ['factory/02_data/benchmark/private/worlds.json', 'factory/02_data/benchmark/private/rubric.json',
    'factory/02_data/benchmark/private/manifest.json', 'factory/01_spec/output/SPEC.md',
    'tests/evaluator/benchmark/expected-judgments.md', 'tests/evaluator/b06-b10/rubric.json',
    'tests/evaluator/b06-b10/generate.mjs', 'tests/evaluator/b11-b15/rubric.json', 'tests/evaluator/b11-b15/generate.mjs',
    'tests/evaluator/daily-predicates.mjs',
    'db/benchmark/gemini-store.mjs',
    'db/benchmark/gemini-http.mjs', 'factory/03_build/output/gemini-runner-v1/ACCOUNT_ATTESTATION.json',
    'outputs/a01', '../crosssignal-test', '../../README.md'].map(p => resolve(p));
  const old = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = fixtureKey;
  try {
    const proof = await isolatedGemini({ operation: 'probe', paths });
    assert.deepEqual(proof, { readDenials: paths.length, writesDenied: true, childrenDenied: true,
      environmentEmpty: true, fetchUnavailable: true });
  } finally { if (old === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = old; }
});

test('restricted preparation matches every public eager body and rejects leaked caller contexts', async () => {
  for (const observable of cases) {
    const s = { ...scope, workspaceId: observable.events[0].workspaceId, caseId: observable.caseRef, runId: observable.events[0].runId };
    const actual = await isolatedGemini({ operation: 'prepare', observable, scope: s, options: {} });
    assert.deepEqual(actual, prepareGemini(observable, s));
  }
  for (const options of [{ developmentChat: 'PRIVATE_CHAT' }, { previousAnswer: finding() }, { results: [] }])
    await assert.rejects(isolatedGemini({ operation: 'prepare', observable: input, scope, options }), /validation_failed/);
  await assert.rejects(isolatedGemini({ operation: 'prepare', observable: { ...input, rubric: 'PRIVATE' }, scope, options: {} }), /validation_failed/);
});

test('fresh run rebinding retains all public facts while worker cannot select foreign scope', async () => {
  const fresh = { ...scope, workspaceId: 'w_000000000001', caseId: 'c_000000000002', runId: 'r_000000000003' };
  const rebound = bindRun(input, scope, fresh);
  const prepared = await isolatedGemini({ operation: 'prepare', observable: rebound, scope: fresh, options: {} });
  assert.equal(prepared.exposedEvidenceIds.length, input.events.length);
  assert(!JSON.stringify(prepared.body).includes(scope.caseId));
  await assert.rejects(isolatedGemini({ operation: 'prepare', observable: input, scope: fresh, options: {} }), /validation_failed/);
});

test('SQLite records are scoped, hash chained, append-only, reopen validated and never overwritten', () => {
  const dir = mkdtempSync(join(tmpdir(), 'crosssignal-gemini-store-')), path = join(dir, 'case.sqlite');
  const s = new GeminiStore(path, { metadata: { scope, method: 'single-shot-model' }, observable: input });
  s.claim(); s.append('request', { requestSha256: 'a'.repeat(64) });
  assert.throws(() => s.db.prepare('UPDATE benchmark_timeline SET kind=?').run('changed'), /append_only/);
  assert.throws(() => s.db.exec('DELETE FROM benchmark_evidence'), /append_only/);
  assert.throws(() => s.db.prepare('INSERT INTO benchmark_timeline VALUES(?,?,?,?,?,?,?,?)').run('w_000000000001',scope.caseId,scope.runId,4,'response','{}','a','b'), /FOREIGN KEY/);
  s.close();
  assert.throws(() => new GeminiStore(path, { metadata: { scope }, observable: input }), /EEXIST/);
  const reopened = new GeminiStore(path);
  assert.equal(reopened.history().length, 2); reopened.recover();
  assert.equal(JSON.parse(reopened.history().at(-1).payload).terminalStatus, 'indeterminate_usage');
  assert.throws(() => reopened.claim(), /already_started/); reopened.close();
  const db = new DatabaseSync(path);
  db.exec('DROP TRIGGER benchmark_timeline_UPDATE'); db.prepare('UPDATE benchmark_timeline SET hash=? WHERE sequence=1').run('f'.repeat(64)); db.close();
  assert.throws(() => new GeminiStore(path), /hash_corrupt/);
});

test('durable dispatch precedes HTTP; only sanitized visible response and counted usage survive', async () => {
  const s = store();
  const t = fixtureTransport({ generated: () => ({ ...response(), error: fixtureKey,
    candidates: [{ finishReason: 'STOP', content: { parts: [{ thought: true, text: 'HIDDEN_REASON_CANARY' },
      { text: JSON.stringify(finding()), thoughtSignature: 'HIDDEN_SIGNATURE_CANARY' }] } }] }),
    onFetch: url => { if (url.endsWith(':generateContent')) assert.equal(s.history().at(-1).kind, 'request'); } });
  const result = await runGeminiInvestigation({ observable: input, scope, method: 'single-shot-model', store: s, transport: t });
  // A provider secret echo terminates without storing that provider payload.
  assert.equal(result.failureReason, 'provider_secret_echo');
  assert.equal(t.counters().generationCalls, 1);
  assert(!JSON.stringify(s.history()).includes(fixtureKey)); s.close();
  const clean = store(), transport = fixtureTransport({ generated: () => ({ ...response(),
    candidates: [{ finishReason: 'STOP', content: { parts: [{ thought: true, text: 'HIDDEN_REASON_CANARY' },
      { text: JSON.stringify(finding()), thoughtSignature: 'HIDDEN_SIGNATURE_CANARY' }] } }] }) });
  const ok = await runGeminiInvestigation({ observable: input, scope, method: 'single-shot-model', store: clean, transport });
  assert.equal(ok.terminalStatus, 'epistemic_abstention'); assert.equal(ok.budget.cumulativeGeneratedTokens,120);
  assert(!JSON.stringify(clean.history()).includes('HIDDEN_')); clean.close();
});

test('HTTP and body streaming deadline abort even an uncooperative transport, without retries', async () => {
  let calls = 0, aborted = false;
  const t = createHttpTransport({ mode:'OFFLINE_FIXTURE',keySource:()=>fixtureKey,log:()=>{},fetchImpl:async (_url,o)=>{
    calls++; o.signal.addEventListener('abort',()=>{aborted=true}); return new Promise(()=>{});
  } });
  const r=prepareGemini(input,scope);
  await assert.rejects(t.count(r,performance.now()+25),/request_timeout/);
  assert.equal(calls,1); assert.equal(aborted,true); assert.equal(t.counters().automaticRetries,0);
  await assert.rejects(t.count(r,performance.now()+100),/terminal/);
  const stream = createHttpTransport({mode:'OFFLINE_FIXTURE',keySource:()=>fixtureKey,log:()=>{},
    fetchImpl:async()=>new Response(new ReadableStream({start(){}}))});
  await assert.rejects(stream.count(r,performance.now()+25),/request_timeout/);
});

test('HTTP rejection retains the dispatched failed artifact and the full redacted error, with unknown usage and no replay', async () => {
  const s=store();let dispatched=0;const printed=[];
  const t=createHttpTransport({mode:'OFFLINE_FIXTURE',keySource:()=>fixtureKey,log:line=>printed.push(line),fetchImpl:async url=>{
    if(url.endsWith(':countTokens')) return new Response(JSON.stringify({totalTokens:1000}));
    dispatched++;
    assert.equal(s.history().at(-1).kind,'request');
    return new Response(JSON.stringify({error:{message:`PRIVATE_DIAGNOSTIC ${fixtureKey}`}}),{status:400});
  }});
  const result=await runGeminiInvestigation({observable:input,scope,method:'single-shot-model',store:s,transport:t});
  assert.equal(result.failureReason,'http_failure');assert.equal(result.terminalStatus,'indeterminate_usage');
  assert.equal(result.budget.records[0].generatedTokens,null);
  assert.equal(dispatched,1);assert.equal(t.counters().automaticRetries,0);
  assert.deepEqual(t.counters().lastFailure,{operation:'generateContent',httpStatus:400});
  assert.equal(t.counters().lastFailureDiagnostic.message,'PRIVATE_DIAGNOSTIC [REDACTED_API_KEY]');
  assert(JSON.stringify(s.history()).includes('PRIVATE_DIAGNOSTIC [REDACTED_API_KEY]'));
  assert.equal(printed.length,1);assert(printed[0].includes('PRIVATE_DIAGNOSTIC [REDACTED_API_KEY]'));
  assert(!JSON.stringify(s.history()).includes(fixtureKey));assert(!printed[0].includes(fixtureKey));
  assert.equal(s.history().at(-1).kind,'terminal');
  assert.throws(()=>s.claim(),/already_started/);s.close();
});

test('complete serialized schema/context token count blocks overflow before any generation', async () => {
  const s=store(),t=fixtureTransport({tokens:7200});
  const r=await runGeminiInvestigation({observable:input,scope,method:'single-shot-model',store:s,transport:t});
  assert.equal(r.terminalStatus,'context_overflow'); assert.equal(t.counters().generationCalls,0);
  assert.equal(s.history().filter(row=>row.kind==='token_count').length,1);s.close();
});

test('unavailable reasoning, oversized output, inconsistent/native usage terminate visibly', async () => {
  for(const counts of [{thoughtsTokenCount:null},{candidatesTokenCount:1025,totalTokenCount:2045},
    {promptTokenCount:10000,totalTokenCount:10120},{toolUsePromptTokenCount:2}]){
    const s=store(),t=fixtureTransport({generated:()=>response(finding(),counts)});
    const r=await runGeminiInvestigation({observable:input,scope,method:'single-shot-model',store:s,transport:t});
    assert.notEqual(r.terminalStatus,'completed'); assert.equal(t.counters().generationCalls,1);
    assert.equal(r.runtimeEffects,0);s.close();
  }
});

test('tool runner counts invalid intents, preserves denials and cannot invoke effect/file/URL tools', async () => {
  const s=store('tool-using-model'),t=fixtureTransport({generated:()=>response({kind:'query',
    query:{tool:'execute.rollback',arguments:{url:'https://invalid.example',limit:100}},finding:null})});
  const r=await runGeminiInvestigation({observable:input,scope,method:'tool-using-model',store:s,transport:t});
  assert.equal(r.budget.toolAttempts,1);assert.equal(r.terminalStatus,'invalid_output');
  assert.equal(s.history().filter(row=>row.kind==='tool_result').length,0);s.close();
});

test('cumulative generation cap shrinks the next wire request and a provider overrun remains a failure', async () => {
  const s=store('tool-using-model');let generations=0;const caps=[];
  const q={tool:'revenue.inspect',arguments:{start:START,end:CUTOFF,cursor:null,limit:50,segment:null}};
  const t=fixtureTransport({generated:()=>response({kind:'query',query:q,finding:null},
    {candidatesTokenCount:800,thoughtsTokenCount:100,totalTokenCount:1900}),
    onFetch:(url,o)=>{if(url.endsWith(':generateContent')){generations++;caps.push(JSON.parse(o.body).generationConfig.maxOutputTokens)}}});
  const r=await runGeminiInvestigation({observable:input,scope,method:'tool-using-model',store:s,transport:t});
  assert.deepEqual(caps,[1024,1024,1024,1024,1024,1024,744]);
  assert.equal(generations,7);assert.equal(r.terminalStatus,'budget_exhausted');s.close();
});

test('real query loop stops at ten admitted tools and preserves a budget-denied eleventh intent', async () => {
  const s=store('tool-using-model'), q={tool:'revenue.inspect',arguments:{start:START,end:CUTOFF,cursor:null,limit:50,segment:null}};
  const t=fixtureTransport({generated:()=>response({kind:'query',query:q,finding:null},{candidatesTokenCount:1,thoughtsTokenCount:0,totalTokenCount:1001})});
  const result=await runGeminiInvestigation({observable:input,scope,method:'tool-using-model',store:s,transport:t});
  assert.equal(result.budget.toolAttempts,10);assert.equal(result.terminalStatus,'budget_exhausted');
  assert.equal(s.history().filter(r=>r.kind==='tool_result').length,10);
  assert.equal(s.history().filter(r=>r.kind==='tool_attempt').length,11);s.close();
});

test('actual worker answers oversized rows/query text, foreign time and unsafe cursor with a fixed reason and no rows', async () => {
  const args={start:START,end:CUTOFF,cursor:null,limit:50,segment:null,query:''};
  for(const [changed,reason] of [[{limit:51},/^limit must be/],[{query:'x'.repeat(161)},/^query must be text/],
    [{end:'2026-09-01T11:00:00.000Z'},/end must be at or before 2026-09-01T10:00:00\.000Z/],[{cursor:'foreign:50'},/^cursor must be/]]){
    const answer=await isolatedGemini({operation:'query',observable:input,scope,query:{tool:'support.search',arguments:{...args,...changed}}});
    assert.deepEqual(Object.keys(answer).sort(),['error','reason']);assert.equal(answer.error,'invalid_read_only_request');
    assert.match(answer.reason,reason);assert(!JSON.stringify(answer).includes(String(Object.values(changed)[0])));
  }
  // Host faults are not the model's to fix: a foreign observable or a supplied result still fails closed.
  await assert.rejects(isolatedGemini({operation:'query',observable:{...input,rubric:'PRIVATE'},scope,query:{tool:'support.search',arguments:args}}),/validation_failed/);
  await assert.rejects(isolatedGemini({operation:'query',observable:input,scope,query:{tool:'support.search',arguments:args,result:'SUPPLIED'}}),/validation_failed/);
  const raw=response();raw.candidates[0].content.parts=[{functionCall:{name:'execute.rollback',args:{}}}];
  const parsed=await isolatedGemini({operation:'inspect',raw,options:{method:'single-shot-model',outputReservation:1024}});
  assert.equal(parsed.status,'failed');assert.equal(parsed.reason,'unsupported_response_part');
});

test('a query past the case clock comes back as a reason, uses one tool call and the run goes on to a finding', async () => {
  const s=store('tool-using-model'),bodies=[];
  const late={tool:'engineering.inspect',arguments:{start:START,end:'2026-09-01T11:00:00.000Z',cursor:null,limit:50,service:'payment-provider',kind:'health'}};
  const turns=[response({kind:'query',query:late,finding:null}),response({kind:'finding',query:null,finding:finding()})];
  const t=fixtureTransport({generated:()=>turns.shift(),
    onFetch:(url,o)=>{if(url.endsWith(':generateContent')) bodies.push(JSON.parse(o.body))}});
  const r=await runGeminiInvestigation({observable:input,scope,method:'tool-using-model',store:s,transport:t});
  assert.equal(r.terminalStatus,'epistemic_abstention');assert.equal(r.failureReason,null);
  assert.equal(r.budget.toolAttempts,1);assert.equal(t.counters().generationCalls,2);
  const [toolResult]=s.history().filter(row=>row.kind==='tool_result').map(row=>JSON.parse(row.payload));
  assert.equal(toolResult.result.error,'invalid_read_only_request');assert.deepEqual(toolResult.exposedEvidenceIds,[]);
  const {queryResults}=JSON.parse(bodies[1].contents[0].parts[0].text);
  assert.deepEqual(queryResults,[{attempt:1,tool:'engineering.inspect',result:toolResult.result}]);
  assert.match(toolResult.result.reason,/end must be at or before 2026-09-01T10:00:00\.000Z/);
  assert(!JSON.stringify(bodies[1]).includes(late.arguments.end));s.close();
});

test('the online factory requires fresh verification evidence; caller booleans never authorize requests', async () => {
  await assert.rejects(freeTierTransport({approved:true,freeTier:true,apiKey:fixtureKey,fetch:()=>{throw new Error('must not dispatch')}}),
    /caller_options_not_authorized/);
});

test('transport refuses rehashed native capabilities, extra fields, larger generation or hidden-thought requests', async () => {
  let fetched=0;
  for(const mutate of [r=>{r.body.tools=[{googleSearch:{}}]},r=>{r.body.generationConfig.maxOutputTokens=1025},
    r=>{r.body.generationConfig.thinkingConfig.includeThoughts=true},r=>{r.body.contents[0].parts=[{fileData:{fileUri:'https://invalid.example'}}]}]){
    const r=prepareGemini(input,scope);mutate(r);r.requestSha256=digest(r.body);
    const t=fixtureTransport({onFetch:()=>fetched++});
    await assert.rejects(t.count(r,performance.now()+1000));
  }
  assert.equal(fetched,0);
});

test('concurrency one rejects simultaneous counts and fixed endpoint binding prevents paid/native routing', async () => {
  let release;const t=createHttpTransport({mode:'OFFLINE_FIXTURE',keySource:()=>fixtureKey,log:()=>{},
    fetchImpl:()=>new Promise(r=>{release=r})});
  const r=prepareGemini(input,scope), pending=t.count(r,performance.now()+1000);
  await new Promise(resolve=>setTimeout(resolve,5));
  await assert.rejects(t.count(r,performance.now()+1000),/concurrency/);
  release(new Response(JSON.stringify({totalTokens:1000})));
  // The second count will be resolved by this test's simpler failure path.
  await assert.rejects(pending,/request_timeout/);
  const foreign={...r,endpoint:'https://paid.invalid/models/other:generateContent'};
  await assert.rejects(fixtureTransport().count(foreign,performance.now()+1000),/binding_mismatch/);
});
