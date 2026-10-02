import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import { START, CUTOFF, digest } from '../db/benchmark/contracts.mjs';
import { PROVIDER } from '../db/benchmark/subscription-config.mjs';
import { prepareSubscription, inspectSubscriptionStream, subscriptionUsage, callSubscription } from '../db/benchmark/subscription.mjs';
import { prepareSignin, prepareCodeExchange, validateIdentity, requirePlanScope, accountModels } from '../db/benchmark/subscription-auth.mjs';

const source = new URL('../factory/02_data/benchmark/', import.meta.url);
const inputs = readdirSync(new URL('observable/', source)).sort().map(name => JSON.parse(readFileSync(new URL(`observable/${name}`, source), 'utf8')));
const scopeFor = input => ({ workspaceId: input.events[0].workspaceId, caseId: input.caseRef, runId: input.events[0].runId,
  actorId: 'a_123456789abc', start: START, clock: CUTOFF });
const q = { tool: 'revenue.inspect', arguments: { start: START, end: CUTOFF, cursor: null, limit: 50, segment: null } };
const sample = () => ({ version: 'benchmark-finding-v1', terminalStatus: 'completed', signalSummary: 'SIMULATED protocol fixture, not an investigator result.',
  hypotheses: [], affectedSegment: null, relatedChangeId: null, unresolvedAlternatives: [],
  recommendation: { kind: 'none', target: null, summary: 'No action', boundary: 'recommendation_only', risk: 'none', approvalRequired: false }, claims: [] });
const usage = { input_tokens: 1000, output_tokens: 250, output_tokens_details: { reasoning_tokens: 200 }, input_tokens_details: { cached_tokens: 0 } };
const completed = (answer = sample()) => ({ type: 'response.completed', response: { id: 'resp_fixture', model: PROVIDER.candidateModel, status: 'completed', usage,
  output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: JSON.stringify(answer) }] }] } });
const sse = events => events.map(e => `data: ${JSON.stringify(e)}\r\n\r\n`).join('');
async function* fragmented(text) {
  const bytes = Buffer.from(text); for (let i = 0; i < bytes.length; i += 7) yield bytes.subarray(i, i + 7);
}
test('preserved subscription proposal retains its original profile and public Data', () => {
  assert.equal(PROVIDER.provider, 'openai-chatgpt-subscription'); assert.equal(PROVIDER.allowApiKey, false);
  assert.equal(PROVIDER.allowCredits, false); assert.equal(PROVIDER.allowPaidFallback, false);
  assert.equal(PROVIDER.hardOutputCapSupported, false); assert.equal(PROVIDER.contractAmendmentAccepted, true);
  assert.equal(PROVIDER.dataCompatibilityAccepted, false);
  assert.equal(PROVIDER.candidateModel, 'gpt-6.1-sol');
  assert.equal(PROVIDER.reasoningEffort, 'low');
  assert.equal(PROVIDER.subscriptionRequestsConditionallyAuthorized, true);
  for (const name of ['contracts.mjs', 'schemas.mjs', 'exposure.mjs', 'tools.mjs', 'task.md'])
    assert.deepEqual(readFileSync(new URL(`../db/benchmark/${name}`, import.meta.url)), readFileSync(new URL(name, source)));
});
test('all five isolated single-shot requests use SIWC fields and no stored conversation or native capabilities', () => {
  for (const input of inputs) {
    const r = prepareSubscription(input, scopeFor(input));
    assert.equal(r.endpoint, 'https://api.openai.com/v1/responses');
    assert.equal(r.body.store, false); assert.equal(r.body.stream, true); assert.equal(r.body.input.length, 1);
    assert.equal(r.body.input[0].role, 'user'); assert.equal(r.body.text.format.strict, true);
    assert.equal(r.requestSha256, digest(r.body)); assert.equal(r.context.dispatchPermitted, false);
    for (const key of ['max_output_tokens', 'max_tool_calls', 'previous_response_id', 'conversation', 'temperature', 'top_p',
      'truncation', 'background', 'metadata', 'tools', 'service_tier', 'include']) assert.equal(r.body[key], undefined);
    assert.doesNotMatch(JSON.stringify(r.body), /privateCanary|hiddenCause|rootCause|expectedDiagnosis|EVALUATOR_ONLY_|B0[1-5]/);
  }
});
test('prior answers, development messages, supplied results and foreign rows cannot become investigation context', () => {
  const input = inputs[0], scope = scopeFor(input);
  for (const options of [{ messages: ['previous answer'] }, { previousResponseId: 'old' }, { developerChat: 'secret' }, { queries: [{ ...q, result: 'fabricated' }] }])
    assert.throws(() => prepareSubscription(input, scope, { method: 'tool-using-model', ...options }));
  assert.throws(() => prepareSubscription(input, { ...scope, workspaceId: 'w_123456789abc' }));
  assert.throws(() => prepareSubscription({ ...input, rubric: 'private' }, scope));
  assert.throws(() => prepareSubscription(input, scope, { queries: [q] }));
});
test('bounded query results are recomputed; invalid attempts count and do not leak untrusted arguments', () => {
  const input = inputs[0], scope = scopeFor(input);
  const good = prepareSubscription(input, scope, { method: 'tool-using-model', queries: [q] });
  assert(good.exposedEvidenceIds.length > 0); assert.equal(good.toolAttempts, 1);
  const denied = prepareSubscription(input, scope, { method: 'tool-using-model', queries: [{ tool: 'approve.execute', arguments: { privatePath: 'UNTRUSTED_SECRET' } }] });
  assert.equal(denied.toolAttempts, 1); assert.doesNotMatch(JSON.stringify(denied.body), /UNTRUSTED_SECRET|privatePath/);
  assert.match(JSON.stringify(denied.body), /invalid_read_only_request/);
  assert.equal(prepareSubscription(input, scope, { method: 'tool-using-model', queries: Array.from({ length: 10 }, () => q) }).toolAttempts, 10);
  assert.throws(() => prepareSubscription(input, scope, { method: 'tool-using-model', queries: Array.from({ length: 11 }, () => q) }), /attempt cap/);
});
test('fragmented SSE requires a completed terminal event and retains Unicode visible output', async () => {
  const answer = sample(); answer.signalSummary = 'SIMULATED ₹ Unicode fixture';
  const text = JSON.stringify(answer), stream = sse([{ type: 'response.output_text.delta', delta: text }, completed(answer)]);
  const result = await inspectSubscriptionStream(fragmented(stream));
  assert.equal(result.status, 'parsed_fixture'); assert.deepEqual(result.finding, answer);
  assert.equal(result.generationCapEnforced, false); assert.equal(result.postResponseChecksOnly, true);
  assert.equal(result.usage.outputTokens, 250); assert.equal(result.usage.reasoningTokens, 200);
  assert.equal(subscriptionUsage(usage).outputTokens, 250); // Do not double-count reasoning.
});
test('deltas followed by quota failure, incomplete output or an interrupted stream never count as success', async () => {
  const delta = { type: 'response.output_text.delta', delta: 'partial answer' };
  const failed = { type: 'response.failed', response: { error: { code: 'subscription_sharing_usage_limit_exceeded', param: 'model', message: 'SECRET_ERROR_SENTINEL' } } };
  const quota = await inspectSubscriptionStream(fragmented(sse([delta, failed])));
  assert.equal(quota.reason, 'provider_failed'); assert.equal(quota.errorCode, 'subscription_sharing_usage_limit_exceeded');
  assert.equal(quota.visibleText, 'partial answer'); assert.doesNotMatch(JSON.stringify(quota), /SECRET_ERROR_SENTINEL/);
  assert.equal((await inspectSubscriptionStream(fragmented(sse([delta])))).reason, 'stream_ended_without_terminal_event');
  assert.equal((await inspectSubscriptionStream(fragmented(sse([{ type: 'response.incomplete', response: {} }])))).reason, 'provider_incomplete');
  assert.equal((await inspectSubscriptionStream(fragmented('data: broken\n\n'))).reason, 'invalid_or_interrupted_stream');
});
test('reasoning text and signatures are excluded, native tools/refusals and inconsistent usage fail', async () => {
  const response = completed(); response.response.output.unshift({ type: 'reasoning', encrypted_content: 'ENCRYPTED_SENTINEL', summary: [{ text: 'HIDDEN_SENTINEL' }] });
  const result = await inspectSubscriptionStream(fragmented(sse([{ type: 'response.reasoning_text.delta', delta: 'HIDDEN_SENTINEL' }, response])));
  assert.equal(result.status, 'parsed_fixture'); assert.doesNotMatch(JSON.stringify(result), /HIDDEN_SENTINEL|ENCRYPTED_SENTINEL/);
  for (const item of [{ type: 'function_call', name: 'execute' }, { type: 'web_search_call' }]) {
    const native = completed(); native.response.output.push(item);
    assert.equal((await inspectSubscriptionStream(fragmented(sse([native])))).reason, 'unsupported_output_capability');
  }
  const missing = completed(); delete missing.response.usage;
  assert.equal((await inspectSubscriptionStream(fragmented(sse([missing])))).reason, 'usage_unavailable');
  const excessive = completed(); excessive.response.usage = { ...usage, output_tokens: 1025 };
  assert.equal((await inspectSubscriptionStream(fragmented(sse([excessive])))).terminalStatus, 'budget_exhausted');
  const wrong = completed(); wrong.response.usage = { ...usage, output_tokens: 100 };
  assert.equal((await inspectSubscriptionStream(fragmented(sse([wrong])))).reason, 'inconsistent_reasoning_usage');
});
test('host-only string limits and tool/finding union validation remain strict', async () => {
  const tooLong = sample(); tooLong.signalSummary = 'x'.repeat(401);
  assert.equal((await inspectSubscriptionStream(fragmented(sse([completed(tooLong)])))).terminalStatus, 'invalid_output');
  const query = { kind: 'query', query: q, finding: null };
  const parsed = await inspectSubscriptionStream(fragmented(sse([completed(query)])), { method: 'tool-using-model', scope: scopeFor(inputs[0]) });
  assert.equal(parsed.terminalStatus, 'query'); assert.deepEqual(parsed.query, q);
  query.finding = sample();
  assert.equal((await inspectSubscriptionStream(fragmented(sse([completed(query)])), { method: 'tool-using-model', scope: scopeFor(inputs[0]) })).terminalStatus, 'invalid_output');
});
test('unsupported generation limits block before credential inspection; flags never enable fallback', async () => {
  let inspected = 0, dispatched = 0;
  await assert.rejects(callSubscription({ accepted: true, amendmentAccepted: true, oauth: true, apiKey: 'fixture_only',
    accessToken: () => { inspected++; }, fetch: () => { dispatched++; } }), /additive_data_compatibility_review_pending_human_acceptance/);
  assert.equal(inspected, 0); assert.equal(dispatched, 0);
});
const hostId = 'urn:uuid:12345678-1234-4567-8910-123456789abc';
test('OAuth registration uses fresh PKCE/state/nonce, exact loopback and issued client ID', () => {
  const a = prepareSignin({ hostId, now: 1 }), b = prepareSignin({ hostId, now: 1 });
  const url = new URL(a.authorizationUrl); assert.equal(url.hostname, 'auth.openai.com');
  assert.equal(url.searchParams.get('client_id'), 'dynamic_agent_client'); assert.equal(url.searchParams.get('agent_name_hint'), 'CrossSignal');
  assert.match(url.searchParams.get('scope'), /chatgpt.tokens.use.direct/); assert.notEqual(a.pending.nonce, b.pending.nonce);
  const callback = new URL(a.pending.redirectUri); callback.searchParams.set('state', a.pending.state);
  callback.searchParams.set('code', 'test_code'); callback.searchParams.set('client_id', 'oaiapp_fixture');
  const exchange = prepareCodeExchange(callback.toString(), a.pending, 2);
  assert.equal(exchange.clientId, 'oaiapp_fixture'); assert.equal(new URLSearchParams(exchange.body).get('redirect_uri'), a.pending.redirectUri);
  assert.throws(() => prepareCodeExchange(callback.toString(), a.pending, 2), /replayed/);
  assert.equal(new URL(prepareSignin({ hostId, clientId: 'oaiapp_fixture' }).authorizationUrl).searchParams.get('agent_name_hint'), null);
});
test('OAuth state mutation, missing client, returning-account mutation and denial fail before exchange', () => {
  for (const kind of ['state', 'missing', 'changed_client', 'denied', 'localhost']) {
    const a = prepareSignin({ hostId, ...(kind === 'changed_client' ? { clientId: 'oaiapp_original' } : {}) });
    const u = new URL(a.pending.redirectUri); u.searchParams.set('state', kind === 'state' ? 'foreign' : a.pending.state);
    u.searchParams.set('code', 'test'); if (kind !== 'missing') u.searchParams.set('client_id', 'oaiapp_mutated');
    if (kind === 'denied') u.searchParams.set('error', 'access_denied'); if (kind === 'localhost') u.hostname = 'localhost';
    assert.throws(() => prepareCodeExchange(u.toString(), a.pending));
  }
  assert.throws(() => requirePlanScope({ token_type: 'Bearer', access_token: 'fixture_only', scope: 'openid' }), /permission absent/);
});
test('ID-token fixture validates signature/issuer/audience/time/nonce and rejects forged identity', () => {
  const pair = generateKeyPairSync('rsa', { modulusLength: 2048 }), key = { ...pair.publicKey.export({ format: 'jwk' }), kid: 'fixture', alg: 'RS256', use: 'sig' };
  const pending = { nonce: 'fixture_nonce' }, claims = { iss: 'https://auth.openai.com', aud: 'oaiapp_fixture', sub: 'fixture_subject', iat: 10, exp: 30, nonce: pending.nonce };
  const jwt = (body, secret = pair.privateKey) => {
    const raw = `${Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'fixture' })).toString('base64url')}.${Buffer.from(JSON.stringify(body)).toString('base64url')}`;
    return `${raw}.${sign('RSA-SHA256', Buffer.from(raw), secret).toString('base64url')}`;
  };
  assert.equal(validateIdentity(jwt(claims), { keys: [key] }, pending, 'oaiapp_fixture', 20).subject, 'fixture_subject');
  for (const mutation of [{ iss: 'https://foreign' }, { aud: 'other' }, { exp: 20 }, { iat: 21 }, { nonce: 'foreign' }])
    assert.throws(() => validateIdentity(jwt({ ...claims, ...mutation }), { keys: [key] }, pending, 'oaiapp_fixture', 20));
  const forged = generateKeyPairSync('rsa', { modulusLength: 2048 });
  assert.throws(() => validateIdentity(jwt(claims, forged.privateKey), { keys: [key] }, pending, 'oaiapp_fixture', 20), /signature/);
});
test('account-specific models preserve visibility/order; generic API catalog or cached Codex catalog is insufficient', () => {
  assert.deepEqual(accountModels({ models: [{ slug: 'hidden', display_name: 'Hidden', visibility: 'hide' },
    { slug: 'gpt-6.1-sol', display_name: 'Sol', visibility: 'list' }] }), [{ slug: 'gpt-6.1-sol', displayName: 'Sol' }]);
  assert.throws(() => accountModels({ data: [{ id: 'gpt-6.1-sol' }] }));
});
