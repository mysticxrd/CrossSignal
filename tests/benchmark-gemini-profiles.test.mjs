import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import test from 'node:test';
import { CUTOFF, START, digest } from '../db/benchmark/contracts.mjs';
import { createGeminiBudget } from '../db/benchmark/gemini-budget.mjs';
import { GEMINI, PROFILES, tokenProfile } from '../db/benchmark/gemini-config.mjs';
import { prepareGemini } from '../db/benchmark/gemini-context.mjs';
import { createHttpTransport } from '../db/benchmark/gemini-http.mjs';
import { runGeminiInvestigation } from '../db/benchmark/gemini-runner.mjs';
import { GeminiStore } from '../db/benchmark/gemini-store.mjs';

// Offline only: every fetch below is a stub, so no request leaves this process.
const secret = 'OFFLINE_SECRET_KEY_CANARY_ONLY';
const folder = 'factory/02_data/benchmark/observable';
const input = JSON.parse(readFileSync(`${folder}/${readdirSync(folder).sort()[0]}`, 'utf8'));
const scope = { workspaceId: input.events[0].workspaceId, caseId: input.caseRef, runId: input.events[0].runId,
  actorId: 'a_123456789abc', start: START, clock: CUTOFF };
const abstain = { version: 'benchmark-finding-v1', terminalStatus: 'epistemic_abstention', signalSummary: 'OFFLINE_FIXTURE: ungraded test answer.',
  hypotheses: [], affectedSegment: null, relatedChangeId: null, unresolvedAlternatives: [],
  recommendation: { kind: 'abstain', target: null, summary: 'Fixture only, no effect.', boundary: 'recommendation_only', risk: 'none',
    approvalRequired: false }, claims: [] };
const query = { tool: 'revenue.inspect', arguments: { start: START, end: CUTOFF, cursor: null, limit: 50, segment: null } };
const response = (value, counts) => JSON.stringify({ modelVersion: GEMINI.model,
  candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(value) }] } }],
  usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 100, thoughtsTokenCount: 0, totalTokenCount: 1100, ...counts } });
// 3,200 generated tokens, nearly all thinking: past the minimal 1,024 cap, inside the low 4,096 one.
const thoughtful = { candidatesTokenCount: 200, thoughtsTokenCount: 3000, totalTokenCount: 4200 };
const store = method => new GeminiStore(join(mkdtempSync(join(tmpdir(), 'crosssignal-gemini-profile-')), 'case.sqlite'),
  { metadata: { scope, method, truthMode: 'SIMULATED', configHash: digest(GEMINI) }, observable: input });
function fixtureTransport(profile, { counts = {}, sent = [] } = {}) {
  return createHttpTransport({ mode: 'OFFLINE_FIXTURE', profile, keySource: () => secret, log: () => {},
    fetchImpl: async (url, options) => {
      if (url.endsWith(':countTokens')) return new Response(JSON.stringify({ totalTokens: 1000 }));
      const body = JSON.parse(options.body), toolTurn = 'query' in (body.generationConfig.responseFormat.text.schema.properties ?? {});
      sent.push(body.generationConfig);
      const value = !toolTurn ? abstain : sent.length === 1 ? { kind: 'query', query, finding: null } : { kind: 'finding', query: null, finding: abstain };
      return new Response(response(value, counts));
    } });
}

test('minimal is the accepted B01 baseline; low raises thinking and every cap that thinking tokens count against', () => {
  assert.equal(tokenProfile(), PROFILES.minimal);
  assert.deepEqual({ ...PROFILES.minimal }, { name: 'original-accepted-b01-token-limits', thinkingLevel: 'MINIMAL',
    maxOutputTokens: 1024, contextTokens: 8192, generatedTokens: 6144 });
  for (const key of ['thinkingLevel', 'maxOutputTokens', 'contextTokens', 'generatedTokens']) assert.equal(PROFILES.minimal[key], GEMINI[key]);
  assert.deepEqual({ ...PROFILES.low }, { name: 'low-thinking-raised-token-limits', thinkingLevel: 'LOW',
    maxOutputTokens: 4096, contextTokens: 16384, generatedTokens: 24576 });
  // Both leave a run room for six full responses.
  for (const limits of Object.values(PROFILES)) assert.equal(limits.generatedTokens / limits.maxOutputTokens, 6);
  assert(Object.isFrozen(PROFILES) && Object.values(PROFILES).every(limits => Object.isFrozen(limits)));
  for (const name of ['high', 'MINIMAL', 'toString', '']) assert.throws(() => tokenProfile(name), /unknown_token_profile/);
});

test('a low request differs from the baseline only in its thinking level and output cap, for both model methods', () => {
  const rest = request => {
    const body = structuredClone(request.body);
    delete body.generationConfig.thinkingConfig; delete body.generationConfig.maxOutputTokens;
    return body;
  };
  for (const method of ['single-shot-model', 'tool-using-model']) {
    const low = prepareGemini(input, scope, { method, profile: 'low' }), baseline = prepareGemini(input, scope, { method });
    assert.deepEqual(low.body.generationConfig.thinkingConfig, { thinkingLevel: 'LOW', includeThoughts: false });
    assert.equal(low.body.generationConfig.maxOutputTokens, 4096);
    assert.equal(low.context.profile, PROFILES.low.name);
    assert.equal(low.requestSha256, digest(low.body));
    assert.deepEqual(baseline.body.generationConfig.thinkingConfig, { thinkingLevel: 'MINIMAL', includeThoughts: false });
    assert.equal(baseline.body.generationConfig.maxOutputTokens, 1024);
    assert.equal(baseline.context.profile, PROFILES.minimal.name);
    assert.deepEqual(rest(low), rest(baseline));
    assert.equal(prepareGemini(input, scope, { method, profile: 'low', outputReservation: 2000 }).body.generationConfig.maxOutputTokens, 2000);
  }
  assert.throws(() => prepareGemini(input, scope, { profile: 'high' }), /unknown_token_profile/);
  assert.throws(() => prepareGemini(input, scope, { profile: 'low', outputReservation: 4097 }), /invalid_output_reservation/);
  assert.throws(() => prepareGemini(input, scope, { outputReservation: 1025 }), /invalid_output_reservation/);
});

test('a low budget admits a 16,384-token context and 24,576 generated tokens a run, and no more', () => {
  const prepared = prepareGemini(input, scope, { method: 'tool-using-model', profile: 'low' });
  const receipt = bound => ({ requestSha256: prepared.requestSha256, inputTokens: bound - 256, completeInputTokenBound: bound });
  assert.equal(createGeminiBudget({ profile: 'low' }).begin(prepared, receipt(12_288)).outputReservation, 4096);
  assert.throws(() => createGeminiBudget({ profile: 'low' }).begin(prepared, receipt(12_289)), /context_overflow/);
  // A baseline ledger refuses the larger request outright.
  assert.throws(() => createGeminiBudget().begin(prepared, receipt(5000)), /output_reservation_mismatch/);
  assert.throws(() => createGeminiBudget({ profile: 'high' }), /unknown_token_profile/);
  const run = createGeminiBudget({ profile: 'low' });
  const usage = { counts: { promptTokenCount: 1000, candidatesTokenCount: 96, thoughtsTokenCount: 4000, totalTokenCount: 5096 } };
  for (let turn = 0; turn < 6; turn++) {
    assert.equal(run.nextOutputReservation(), 4096);
    assert.equal(run.finish(run.begin(prepared, receipt(5000)), { usage, terminalStatus: 'query' }).status, 'query');
  }
  assert.throws(() => run.nextOutputReservation(), /budget_exhausted/);
  assert.equal(run.snapshot().cumulativeGeneratedTokens, 24_576);
  assert.equal(run.snapshot().profile, PROFILES.low.name);
});

test('a transport sends only its own profile\'s requests and checks the model against that profile', async () => {
  let fetched = 0;
  const transport = (profile, reply = JSON.stringify({ totalTokens: 1000 })) => createHttpTransport({ mode: 'OFFLINE_FIXTURE', profile,
    keySource: () => secret, log: () => {}, fetchImpl: async () => { fetched++; return new Response(reply); } });
  const low = prepareGemini(input, scope, { profile: 'low' }), minimal = prepareGemini(input, scope);
  const rehash = change => { const copy = structuredClone(low); change(copy.body.generationConfig); copy.requestSha256 = digest(copy.body); return copy; };
  const deadline = () => performance.now() + 1000;
  assert.equal(transport('low').profile, 'low');
  assert.equal(transport().profile, 'minimal');
  await transport('low').count(low, deadline());
  await transport('minimal').count(minimal, deadline());
  assert.equal(fetched, 4);
  for (const [profile, request] of [['low', minimal], ['minimal', low], ['low', rehash(c => { c.maxOutputTokens = 4097; })],
    ['low', rehash(c => { c.thinkingConfig.thinkingLevel = 'HIGH'; })]])
    await assert.rejects(transport(profile).count(request, deadline()), /fixed_generation_configuration_required/);
  assert.equal(fetched, 4);
  assert.throws(() => transport('high'), /unknown_token_profile/);
  const model = (inputTokenLimit, outputTokenLimit) => JSON.stringify({ name: `models/${GEMINI.model}`,
    supportedGenerationMethods: ['generateContent'], inputTokenLimit, outputTokenLimit });
  assert.equal((await transport('low', model(16_384, 4096)).modelMetadata(deadline())).outputTokenLimit, 4096);
  assert.equal((await transport('minimal', model(8192, 1024)).modelMetadata(deadline())).inputTokenLimit, 8192);
  for (const limits of [[16_383, 4096], [16_384, 4095]])
    await assert.rejects(transport('low', model(...limits)).modelMetadata(deadline()), /model_metadata_incompatible/);
});

test('thinking tokens count as output: a low run keeps a response the baseline would refuse', async () => {
  const sent = [], transport = fixtureTransport('low', { counts: thoughtful, sent }), lowStore = store('tool-using-model');
  const result = await runGeminiInvestigation({ observable: input, scope, method: 'tool-using-model', store: lowStore, transport, profile: 'low' });
  lowStore.close();
  assert.equal(result.terminalStatus, 'epistemic_abstention'); assert.equal(result.failureReason, null);
  // The restricted worker built both turns with the low profile.
  assert.deepEqual(sent.map(c => [c.thinkingConfig.thinkingLevel, c.maxOutputTokens]), [['LOW', 4096], ['LOW', 4096]]);
  assert.equal(result.budget.toolAttempts, 1); assert.equal(result.budget.cumulativeGeneratedTokens, 6400);
  assert.equal(result.budget.profile, PROFILES.low.name); assert.equal(result.transport.profile, 'low');
  const baselineStore = store('single-shot-model');
  const baseline = await runGeminiInvestigation({ observable: input, scope, method: 'single-shot-model', store: baselineStore,
    transport: fixtureTransport('minimal', { counts: thoughtful }) });
  baselineStore.close();
  assert.equal(baseline.terminalStatus, 'budget_exhausted'); assert.equal(baseline.failureReason, 'response_token_cap_exceeded');
});

test('a run and its transport must agree on the profile before the run is claimed', async () => {
  const s = store('single-shot-model'), run = (transport, profile) =>
    runGeminiInvestigation({ observable: input, scope, method: 'single-shot-model', store: s, transport, profile });
  await assert.rejects(run(fixtureTransport('minimal'), 'low'), /transport_profile_mismatch/);
  await assert.rejects(run(fixtureTransport('low')), /transport_profile_mismatch/);
  // Nothing was used up: the same run still goes ahead once they agree.
  const result = await run(fixtureTransport('low'), 'low');
  s.close();
  assert.equal(result.terminalStatus, 'epistemic_abstention'); assert.equal(result.budget.profile, PROFILES.low.name);
});
