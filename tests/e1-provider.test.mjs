import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { OrderBudget } from '../order-recovery/budget.mjs';
import { settleCorrection, settledNebiusMicros, unsettled15Nov } from '../e1/correction.mjs';
import { catalogMatchesCard, loadPriceCard, reserveMicros, settleMicros } from '../e1/price-card.mjs';
import { checkCatalog, ledgerAttempt, sendE1 } from '../e1/provider.mjs';
import { e1Request, extendsPrefix } from '../e1/request.mjs';

const card = loadPriceCard('deepseek-v4.1-flash-1017');
const key = 'test-key-not-real-0123456789';
const catalogEntry = { id: card.model, context_length: 1048576,
  pricing: { prompt: '0.0000003', completion: '0.0000012', input_cache_read: '0.000000006' } };

function ledger(t, ceilingMicros = 25000000) {
  const dir = mkdtempSync(join(tmpdir(), 'e1-provider-'));
  const budget = new OrderBudget(join(dir, 'budget.sqlite'), ceilingMicros);
  t.after(() => { budget.close(); rmSync(dir, { recursive: true, force: true }); });
  return budget;
}
const reply = (status, payload, headers = {}) => new Response(typeof payload === 'string' ? payload : JSON.stringify(payload),
  { status, headers });
// Usage a short test request can really have: no more prompt tokens than its bytes, so it fits the reservation.
const answer = (usage = { prompt_tokens: 300, completion_tokens: 8000, total_tokens: 8300,
  prompt_tokens_details: { cached_tokens: 200 }, completion_tokens_details: { reasoning_tokens: 3000 } }) => ({
  id: 'req-1', model: card.model, usage,
  choices: [{ finish_reason: 'tool_calls', message: { role: 'assistant', content: null,
    tool_calls: [{ id: 'c1', type: 'function', function: { name: 'store_revenue', arguments: '{}' } }] } }],
});
const tools = [{ type: 'function', function: { name: 'store_revenue', parameters: { type: 'object', properties: {} } } }];
const body = history => e1Request({ card, system: 'You investigate revenue dips.', tools,
  trigger: { now: '2026-11-26T10:00Z', dropPct: 31 }, history });

test('the three price cards load, and cached input settles at the cached rate', () => {
  assert.deepEqual(['glm-5.3-flash', 'glm-5.3'].map(id => loadPriceCard(id).model), ['zai-org/GLM-5.3-Flash', 'zai-org/GLM-5.3']);
  // 50,000 uncached x $0.30 + 140,000 cached x $0.006 + 8,000 out x $1.20, per million tokens.
  assert.equal(settleMicros(card, { inputTokens: 190000, cachedTokens: 140000, outputTokens: 8000 }), 15000 + 840 + 9600);
  assert.equal(settleMicros(card, { inputTokens: 190000, cachedTokens: 0, outputTokens: 8000 }), 57000 + 9600);
  assert.throws(() => settleMicros(card, { inputTokens: 10, cachedTokens: 11, outputTokens: 0 }), /invalid_usage/);
});

test('a reservation assumes nothing is cached: a 300k-byte send with an 8,192 cap reserves about $0.10', () => {
  assert.equal(reserveMicros(card, 300000, 8192), 99831);
});

test('the catalog must match the price card before any paid request', async () => {
  assert.ok(catalogMatchesCard(card, catalogEntry));
  assert.ok(!catalogMatchesCard(card, { ...catalogEntry, pricing: { ...catalogEntry.pricing, input_cache_read: '0.00000003' } }));
  assert.ok(!catalogMatchesCard(card, { ...catalogEntry, pricing: { ...catalogEntry.pricing, request: '0.001' } }));
  const methods = [];
  const fetchImpl = async (_, init) => { methods.push(init.method);
    return reply(200, { data: [{ ...catalogEntry, pricing: { ...catalogEntry.pricing, prompt: '0.0000004' } }] }); };
  await assert.rejects(checkCatalog({ card, key, fetchImpl }), /nebius_catalog_or_price_changed/);
  assert.deepEqual(methods, ['GET']);
});

test('each send repeats the previous prompt byte for byte, so the prefix can be cached', () => {
  const turn = n => [{ role: 'assistant', content: null, tool_calls: [{ id: `c${n}`, type: 'function',
    function: { name: 'store_revenue', arguments: '{}' } }] },
  { role: 'tool', tool_call_id: `c${n}`, content: JSON.stringify({ result: { n }, as_of: `T${n}`, calls_left: 30 - n }) }];
  const sends = [body([]), body(turn(1)), body([...turn(1), ...turn(2)])];
  assert.ok(extendsPrefix(sends[0], sends[1]) && extendsPrefix(sends[1], sends[2]));
  // The failure this guards: a per-turn value in the system prompt breaks the prefix from the first byte.
  const moving = n => ({ ...sends[n], messages: [{ role: 'system', content: `calls_left ${30 - n}` }, ...sends[n].messages.slice(1)] });
  assert.ok(!extendsPrefix(moving(0), moving(1)));
});

test('a send reserves the worst case, logs the answer, then settles it with cached tokens', async t => {
  const budget = ledger(t); budget.claim('run-a', 'nebius');
  let usedWhenPersisted;
  const result = await sendE1({ body: body([]), card, key, budget, runId: 'run-a', send: 1,
    persist: async () => { usedWhenPersisted = budget.usedMicros(); }, fetchImpl: async () => reply(200, answer()) });
  assert.equal(usedWhenPersisted, result.attempts[0].reservedMicros);
  // 100 uncached x $0.30 + 200 cached x $0.006 + 8,000 out x $1.20 per million = 9,631.2, rounded up.
  assert.equal(budget.usedMicros(), 9632);
  assert.deepEqual(result.usage, { inputTokens: 300, cachedTokens: 200, outputTokens: 8000, reasoningTokens: 3000 });
  assert.equal(result.message.tool_calls[0].function.name, 'store_revenue');
});

test('a 429 is retried after its backoff, and the unanswered attempt keeps its reservation', async t => {
  const budget = ledger(t); budget.claim('run-b', 'nebius');
  const waits = [], statuses = [429, 200];
  const result = await sendE1({ body: body([]), card, key, budget, runId: 'run-b', send: 2, wait: async ms => { waits.push(ms); },
    fetchImpl: async () => { const status = statuses.shift();
      return status === 200 ? reply(200, answer()) : reply(429, '{"error":"slow down"}', { 'retry-after': '3' }); } });
  assert.deepEqual(waits, [3000]);
  assert.equal(result.attempts[0].backoffMs, 3000);
  const rows = budget.db.prepare('SELECT attempt, reserved, accounted FROM sends ORDER BY attempt').all().map(row => ({ ...row }));
  assert.deepEqual(rows.map(row => [row.attempt, row.accounted]), [[ledgerAttempt(2, 1), null], [ledgerAttempt(2, 2), 9632]]);
});

test('a provider error never carries the key, and a non-retryable status stops at once', async t => {
  const budget = ledger(t); budget.claim('run-c', 'nebius');
  let calls = 0;
  const error = await sendE1({ body: body([]), card, key, budget, runId: 'run-c', send: 1,
    fetchImpl: async () => { calls++; return reply(400, `{"error":"bad key ${key}"}`); } }).catch(caught => caught);
  assert.equal(error.message, 'provider_http_failure');
  assert.equal(calls, 1);
  assert.ok(error.attempts[0].error.includes('[REDACTED_API_KEY]') && !error.attempts[0].error.includes(key));
});

test('the 15 Nov correction settles both sends once, in one transaction', async t => {
  const budget = ledger(t);
  for (const send of unsettled15Nov) { budget.claim(send.run, 'nebius'); budget.reserve(send.run, send.attempt, 319488); }
  budget.claim('earlier', 'nebius'); budget.reserve('earlier', 1, 200000); budget.settle('earlier', 1, 105679);
  assert.equal(settledNebiusMicros(budget), 105679);
  assert.throws(() => settleCorrection(budget, 700000), /spend_accounting_mismatch/);
  assert.equal(budget.usedMicros(), 105679 + 2 * 319488, 'an amount above the reservations settles nothing');
  assert.deepEqual(settleCorrection(budget, 9001).map(send => send.settledMicros), [4501, 4500]);
  assert.equal(budget.usedMicros(), 105679 + 9001);
  assert.throws(() => settleCorrection(budget, 9001), /spend_accounting_mismatch/);
});
