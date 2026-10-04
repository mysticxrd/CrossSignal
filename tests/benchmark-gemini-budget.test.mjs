import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import { START, CUTOFF, digest } from '../db/benchmark/contracts.mjs';
import { GEMINI } from '../db/benchmark/gemini-config.mjs';
import { PROVIDER, callActiveProvider } from '../db/benchmark/provider-config.mjs';
import { prepareSingleShot } from '../db/benchmark/gemini.mjs';
import { prepareGemini, prepareTokenCount, validateGeminiTurn } from '../db/benchmark/gemini-context.mjs';
import { createGeminiBudget } from '../db/benchmark/gemini-budget.mjs';

const source = new URL('../factory/02_data/benchmark/observable/', import.meta.url);
const inputs = readdirSync(source).sort().map(name => JSON.parse(readFileSync(new URL(name, source), 'utf8')));
const scopeFor = input => ({ workspaceId: input.events[0].workspaceId, caseId: input.caseRef, runId: input.events[0].runId,
  actorId: 'a_123456789abc', start: START, clock: CUTOFF });
const query = { tool: 'revenue.inspect', arguments: { start: START, end: CUTOFF, cursor: null, limit: 50, segment: null } };
const finding = { version: 'benchmark-finding-v1', terminalStatus: 'completed', signalSummary: 'SIMULATED ungraded protocol fixture',
  hypotheses: [], affectedSegment: null, relatedChangeId: null, unresolvedAlternatives: [],
  recommendation: { kind: 'none', target: null, summary: 'No effect capability', boundary: 'recommendation_only', risk: 'none', approvalRequired: false }, claims: [] };
const prepared = (limit = 1024) => prepareGemini(inputs[0], scopeFor(inputs[0]), { method: 'tool-using-model', outputReservation: limit });
const receipt = (request, inputTokens = 1000) => ({ requestSha256: request.requestSha256, inputTokens });
const usage = (generated = 100, thoughts = 25, input = 1000) => ({ counts: {
  promptTokenCount: input, candidatesTokenCount: generated - thoughts, thoughtsTokenCount: thoughts,
  totalTokenCount: input + generated, toolUsePromptTokenCount: 0 } });

test('Gemini is selected without removing the exact historical subscription configuration', () => {
  assert.equal(PROVIDER.provider, 'gemini'); assert.equal(PROVIDER.model, 'gemini-3.5-flash-lite');
  assert.equal(PROVIDER.executionProfile, 'original-accepted-b01-token-limits');
  assert.equal(PROVIDER.freeTierRequestsConditionallyAuthorized, true);
  assert.equal(PROVIDER.modelCallsAuthorized, false); assert.equal(PROVIDER.allowPaidFallback, false);
  assert.equal(PROVIDER.subscriptionPreparationSelected, false);
  assert.deepEqual(readFileSync(new URL('../db/benchmark/subscription-config.mjs', import.meta.url)),
    readFileSync(new URL('../factory/03_build/output/gemini-resume/prior-current/db/benchmark/provider-config.mjs', import.meta.url)));
});

test('all five eager bodies retain the original task/schema; token counting covers the complete request', () => {
  for (const input of inputs) {
    const scope = scopeFor(input), request = prepareGemini(input, scope), original = prepareSingleShot(input, scope);
    assert.deepEqual(request.body, original.body);
    const count = prepareTokenCount(request);
    assert.equal(count.endpoint, GEMINI.endpoint.replace(':generateContent', ':countTokens'));
    const { model, ...body } = count.body.generateContentRequest;
    assert.equal(model, `models/${GEMINI.model}`); assert.deepEqual(body, request.body);
    assert.equal(request.context.actualProviderTokens, null); assert.equal(request.context.dispatchPermitted, false);
    assert.equal(request.body.tools, undefined); assert.equal(request.body.generationConfig.seed, undefined);
  }
});

test('accumulated query context is scoped and lossless; old answers, supplied results and private fields are denied', () => {
  for (const input of inputs) {
    const scope = scopeFor(input), request = prepareGemini(input, scope, { method: 'tool-using-model', queries: [query] });
    assert.equal(request.toolAttempts, 1); assert(request.exposedEvidenceIds.length > 0);
    assert.match(JSON.stringify(request.body), /queryResults/);
    assert.doesNotMatch(JSON.stringify(request.body), /EVALUATOR_ONLY_|hiddenCause|rootCause|expectedDiagnosis|B0[1-5]/);
    for (const bad of [{ messages: ['OLD_ANSWER'] }, { previousAnswer: 'OLD_ANSWER' }, { developmentChat: 'PRIVATE_CHAT' },
      { queries: [{ ...query, result: 'SUPPLIED_RESULT' }] }]) assert.throws(() => prepareGemini(input, scope, bad));
    assert.throws(() => prepareGemini({ ...input, rubric: 'PRIVATE_RUBRIC' }, scope));
    const denied = prepareGemini(input, scope, { method: 'tool-using-model', queries: [{ tool: 'execute', arguments: { path: 'PRIVATE_PATH' } }] });
    assert.equal(denied.toolAttempts, 1); assert.match(JSON.stringify(denied.body), /invalid_read_only_request/);
    assert.doesNotMatch(JSON.stringify(denied.body), /PRIVATE_PATH/);
  }
});

test('Gemini JSON query intents cannot broaden tools, windows, rows, query size or effect authority', () => {
  const scope = scopeFor(inputs[0]);
  assert.deepEqual(validateGeminiTurn({ kind: 'finding', query: null, finding }), finding);
  assert.deepEqual(validateGeminiTurn({ kind: 'query', query, finding: null }), query);
  for (const changed of [{ ...query, tool: 'execute' }, { ...query, arguments: { ...query.arguments, limit: 51 } },
    { tool: 'support.search', arguments: { ...query.arguments, query: 'x'.repeat(161) } }])
    assert.throws(() => validateGeminiTurn({ kind: 'query', query: changed, finding: null }));
  assert.throws(() => validateGeminiTurn({ kind: 'finding', query, finding }));
  // A well-formed read past the case clock parses; the host answers it with a reason instead of rows.
  const late = { ...query, arguments: { ...query.arguments, end: '2026-09-01T10:15:00.000Z' } };
  assert.deepEqual(validateGeminiTurn({ kind: 'query', query: late, finding: null }), late);
  const answered = prepareGemini(inputs[0], scope, { method: 'tool-using-model', queries: [late] });
  assert.deepEqual(JSON.parse(answered.body.contents[0].parts[0].text).queryResults, [{ attempt: 1, tool: 'revenue.inspect',
    result: { error: 'invalid_read_only_request', reason: `start must be at or after ${START} and before end; end must be at or before ${CUTOFF}, the case clock` } }]);
  assert.equal(answered.toolAttempts, 1); assert.deepEqual(answered.exposedEvidenceIds, []);
});

test('complete input tokens plus the next output reservation must fit before admission', () => {
  const request = prepared(), ledger = createGeminiBudget({ clock: () => 0 });
  assert.throws(() => ledger.begin(request, receipt(request, 7169)), /context_overflow/);
  assert.equal(ledger.snapshot().turns, 0);
  const exact = createGeminiBudget({ clock: () => 0 });
  assert.equal(exact.begin(request, receipt(request, 7168)).inputTokens, 7168);
  const missing = createGeminiBudget({ clock: () => 0 });
  assert.throws(() => missing.begin(request, { requestSha256: request.requestSha256 }), /input_token_count/);
  assert.throws(() => missing.begin(request, { ...receipt(request), requestSha256: digest('wrong') }), /receipt_hash/);
});

test('remaining cumulative generation constrains the next wire cap and includes reasoning once', () => {
  const ledger = createGeminiBudget({ clock: () => 0 });
  for (let i = 0; i < 6; i++) {
    const request = prepared(), lease = ledger.begin(request, receipt(request));
    assert.equal(ledger.finish(lease, { usage: usage(900, 400), terminalStatus: 'query' }).status, 'query');
  }
  assert.equal(ledger.snapshot().cumulativeGeneratedTokens, 5400);
  assert.equal(ledger.nextOutputReservation(), 744);
  assert.throws(() => ledger.begin(prepared(), receipt(prepared())), /reservation_mismatch/);
  const finalRequest = prepared(744), lease = ledger.begin(finalRequest, receipt(finalRequest));
  ledger.finish(lease, { usage: usage(744, 600), terminalStatus: 'query' });
  assert.equal(ledger.snapshot().cumulativeGeneratedTokens, 6144);
  assert.throws(() => ledger.nextOutputReservation(), /budget_exhausted/);
});

test('reported overrun, count mismatch, native tool usage and unknown usage stop further requests', () => {
  for (const [provided, reason] of [[usage(1025), 'budget_exhausted'], [usage(100, 25, 1001), 'token_count_or_usage_mismatch'],
    [{ counts: { ...usage().counts, toolUsePromptTokenCount: 1 } }, 'token_count_or_usage_mismatch'],
    [{ counts: { ...usage().counts, thoughtsTokenCount: null } }, 'usage_unknown']]) {
    const ledger = createGeminiBudget({ clock: () => 0 }), request = prepared(), lease = ledger.begin(request, receipt(request));
    assert.equal(ledger.finish(lease, { usage: provided }).status, reason);
    assert.throws(() => ledger.begin(request, receipt(request)), new RegExp(reason));
    assert.equal(ledger.snapshot().turns, 1);
  }
});

test('request and investigation deadlines use monotonic elapsed time; indeterminate attempts are not retried', () => {
  let elapsed = 0;
  const ledger = createGeminiBudget({ clock: () => elapsed }), request = prepared(), lease = ledger.begin(request, receipt(request));
  elapsed = 180000;
  assert.equal(ledger.finish(lease, { usage: usage() }).status, 'request_timeout');
  assert.throws(() => ledger.begin(request, receipt(request)), /request_timeout/);
  elapsed = 0;
  const total = createGeminiBudget({ clock: () => elapsed }); elapsed = 900000;
  assert.throws(() => total.begin(request, receipt(request)), /investigation_timeout/);
  elapsed = 0;
  const aborted = createGeminiBudget({ clock: () => elapsed }), lost = aborted.begin(request, receipt(request));
  aborted.abort(lost); assert.throws(() => aborted.begin(request, receipt(request)), /indeterminate_usage/);
  const backwards = createGeminiBudget({ clock: () => elapsed }); elapsed = -1;
  assert.throws(() => backwards.nextOutputReservation(), /monotonic_clock/);
});

test('single-shot, 12 turns, 10 invalid tool attempts, concurrency and replay remain hard host boundaries', () => {
  const request = prepared(), single = createGeminiBudget({ method: 'single-shot-model', clock: () => 0 });
  assert.throws(() => single.toolAttempt(query), /single_shot/);
  const first = single.begin(request, receipt(request));
  assert.throws(() => single.begin(request, receipt(request)), /concurrency_one/);
  single.finish(first, { usage: usage() });
  assert.throws(() => single.finish(first, { usage: usage() }), /lease/);
  assert.throws(() => single.begin(request, receipt(request)), /budget_exhausted/);
  const many = createGeminiBudget({ clock: () => 0 });
  for (let i = 0; i < 12; i++) many.finish(many.begin(request, receipt(request)), { usage: usage(0, 0), terminalStatus: 'query' });
  assert.throws(() => many.begin(request, receipt(request)), /budget_exhausted/);
  const tools = createGeminiBudget({ clock: () => 0 });
  for (let i = 0; i < 10; i++) tools.toolAttempt({ tool: 'invalid', arguments: {} });
  assert.equal(tools.snapshot().toolAttempts, 10);
  assert.throws(() => tools.toolAttempt(query), /tool_budget_exhausted/);
});

test('conditional free-call permission and fixture token receipts cannot enable credentials or network', async () => {
  let reads = 0, calls = 0;
  await assert.rejects(callActiveProvider({ approved: true, freeTier: true, apiKey: 'FIXTURE_ONLY',
    keySource: () => { reads++; }, fetch: () => { calls++; } }), /gemini_execution_blocked/);
  assert.equal(reads, 0); assert.equal(calls, 0);
  assert.equal(createGeminiBudget({ clock: () => 0 }).snapshot().networkAuthorized, false);
});
