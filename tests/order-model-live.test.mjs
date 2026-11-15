import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { OrderBudget } from '../order-recovery/budget.mjs';
import { runLiveOrder } from '../order-recovery/live.mjs';
import { generationLimits, orderWorld, prepareOrderRequest, ORDER_MODELS } from '../order-recovery/model.mjs';
import { inspectOrderResponse, inspectOrderUsage, maximumReservation, orderWireRequest } from '../order-recovery/provider.mjs';
import { loadWorld } from '../order-recovery/world.mjs';
import { wordsScript } from '../order-recovery/rivals.mjs';
import { reconcile } from '../order-recovery/refund-ordering/rivals.mjs';

const key = 'fixture-provider-secret-0123456789', reserved = 324404;
const decisions = wordsScript(loadWorld()), answer = JSON.stringify({ decisions });
const catalog = { data: [{ id: ORDER_MODELS.nebius, context_length: 1048576,
  pricing: { prompt: '0.0000003', completion: '0.0000012', request: '0' } }] };
function payload(text = answer) {
  return { id: 'fixture-request', model: ORDER_MODELS.nebius,
    choices: [{ finish_reason: 'stop', message: { content: text, reasoning_content: 'hidden thought fixture' } }],
    usage: { prompt_tokens: 3000, completion_tokens: 800, total_tokens: 3800, completion_tokens_details: { reasoning_tokens: 100 } } };
}
const json = (value, status = 200) => new Response(JSON.stringify(value), { status });
function setup(t) {
  const root = mkdtempSync(join(tmpdir(), 'order-model-live-')), budgetPath = join(root, 'budget.sqlite');
  const budget = new OrderBudget(budgetPath);
  t.after(() => { budget.close(); rmSync(root, { recursive: true, force: true }); });
  return { root, budgetPath, budget, outputRoot: join(root, 'outputs') };
}
const base = s => ({ ...s, provider: 'nebius', runId: 'test-run', key, timeoutMs: 1000, log: () => {}, wait: async () => {} });
const filesText = directory => readdirSync(directory).filter(n => !n.endsWith('.sqlite')).map(n => readFileSync(join(directory, n), 'utf8')).join('\n');

test('the Nebius wire request carries the common input unchanged and drops only uniqueItems from the strict schema', () => {
  const request = prepareOrderRequest('nebius'), n = orderWireRequest(request);
  assert.equal(n.endpoint, 'https://api.tokenfactory.nebius.com/v1/chat/completions');
  assert.equal(n.body.messages[0].content, JSON.stringify(request.common));
  assert.equal(n.body.max_completion_tokens, 8192); assert.equal(n.body.reasoning_effort, 'low');
  assert.equal(n.body.service_tier, 'default'); assert.equal(n.body.store, false);
  assert.equal(n.body.response_format.json_schema.strict, true);
  assert.doesNotMatch(JSON.stringify(n.body.response_format.json_schema.schema), /"uniqueItems":/);
  assert.deepEqual(n.body.response_format.json_schema.schema.properties.decisions.items.anyOf[0].properties.action, { const: 'capture' });
  assert.match(n.body.messages[0].content, /"uniqueItems":true/);
});

test('ledger shares its ceiling and run claims across connections and restart; settled amounts cannot exceed reservations', t => {
  const s = setup(t), other = new OrderBudget(s.budgetPath);
  try {
    s.budget.claim('first', 'nebius'); s.budget.reserve('first', 1, 24000000);
    assert.equal(other.usedMicros(), 24000000);
    assert.throws(() => other.claim('first', 'nebius'), /already_claimed/);
    other.claim('second', 'nebius'); other.reserve('second', 1, 1000000);
    assert.throws(() => s.budget.reserve('first', 2, 1), /budget_exhausted/);
    assert.throws(() => other.settle('second', 1, 1000001), /accounting_mismatch/);
    other.settle('second', 1, 10); assert.equal(s.budget.usedMicros(), 24000010);
  } finally { other.close(); }
  const restarted = new OrderBudget(s.budgetPath);
  try { assert.equal(restarted.usedMicros(), 24000010); assert.throws(() => restarted.claim('first', 'nebius'), /already_claimed/); }
  finally { restarted.close(); }
});

test('Nebius sends reserve before fetch, save actual model/usage and settle only after durable recording', async t => {
  const s = setup(t); let posts = 0;
  const run = await runLiveOrder({ ...base(s), fetchImpl: async (url, init) => {
    if (init.method === 'GET') { assert.match(url, /models\?verbose=true$/); return json(catalog); }
    posts++; assert.equal(s.budget.usedMicros(), reserved);
    assert.equal(init.headers.Authorization, `Bearer ${key}`);
    return json(payload());
  } });
  assert.equal(posts, 1); assert.equal(run.result.status, 'validated');
  assert.equal(run.result.source, 'offline_transport_fixture');
  assert.deepEqual(run.result.decisions, decisions); assert.equal(run.result.modelVersion, ORDER_MODELS.nebius);
  assert.equal(run.result.estimatedCostUsd, 0.00186); assert.equal(run.result.chargeUsd, null);
  assert.equal(run.result.usage.outputTokens, 800); assert.equal(run.result.usage.reasoningTokens, 100);
  assert.equal(s.budget.usedMicros(), 1860); assert.ok(run.result.elapsedMs >= 0);
  assert.doesNotMatch(filesText(run.directory), /hidden thought fixture|fixture-provider-secret/);
});

test('changed catalog prices or unavailable models stop before any paid request', async t => {
  const s = setup(t);
  for (const [i, data] of [{ data: [] }, { data: [{ ...catalog.data[0], pricing: { ...catalog.data[0].pricing, completion: '0.000002' } }] }].entries()) {
    let posts = 0;
    const run = await runLiveOrder({ ...base(s), runId: `catalog-${i}`, fetchImpl: async (_, init) => {
      if (init.method === 'POST') posts++; return json(data);
    } });
    assert.equal(posts, 0); assert.equal(s.budget.usedMicros(), 0);
    assert.equal(run.result.failureReason, 'nebius_catalog_or_price_changed');
  }
});

test('retryable HTTP failures keep their reservations, redact full diagnostics and reserve again before retry', async t => {
  const s = setup(t), logs = []; let posts = 0;
  const run = await runLiveOrder({ ...base(s), log: line => logs.push(line), fetchImpl: async (_, init) => {
    if (init.method === 'GET') return json(catalog);
    posts++;
    assert.equal(s.budget.usedMicros(), reserved * posts);
    return posts === 1 ? json({ error: { message: `Full provider diagnostic ${key}`, detail: 'preserved' } }, 503) : json(payload());
  } });
  assert.equal(posts, 2); assert.equal(run.result.status, 'validated');
  assert.equal(s.budget.usedMicros(), reserved + 1860);
  assert.match(logs[0], /Full provider diagnostic \[REDACTED_API_KEY\]/);
  assert.match(logs[0], /preserved/); assert.doesNotMatch(logs.join('') + filesText(run.directory), /fixture-provider-secret/);
});

test('budget exhaustion stops the next send and cannot reset via a new run or output directory', async t => {
  const s = setup(t); s.budget.claim('prior', 'nebius'); s.budget.reserve('prior', 1, 25000000);
  let posts = 0;
  const fetchImpl = async (_, init) => { if (init.method === 'POST') posts++; return json(catalog); };
  const run = await runLiveOrder({ ...base(s), fetchImpl });
  assert.equal(posts, 0); assert.equal(run.result.failureReason, 'nebius_task_budget_exhausted');
  const next = await runLiveOrder({ ...base(s), runId: 'another-run', outputRoot: join(s.root, 'another-worktree'), fetchImpl });
  assert.equal(posts, 0); assert.equal(next.result.failureReason, 'nebius_task_budget_exhausted');
  assert.equal(s.budget.usedMicros(), 25000000);
});

test('ambiguous timeout sends once, keeps its reservation and blocks a restart in another worktree', async t => {
  const s = setup(t); let posts = 0;
  const fetchImpl = async (_, init) => { if (init.method === 'GET') return json(catalog); posts++; return new Promise(() => {}); };
  const run = await runLiveOrder({ ...base(s), timeoutMs: 30, fetchImpl });
  assert.equal(posts, 1); assert.equal(run.result.failureReason, 'request_timeout'); assert.equal(run.result.decisions, null);
  assert.equal(s.budget.usedMicros(), reserved);
  await assert.rejects(runLiveOrder({ ...base(s), outputRoot: join(s.root, 'new-worktree'), fetchImpl }), /already_claimed/);
  assert.equal(posts, 1);
});

test('response saving failure keeps the full reservation and never retries', async t => {
  const s = setup(t); let posts = 0;
  await assert.rejects(runLiveOrder({ ...base(s), fetchImpl: async (_, init) => {
    if (init.method === 'GET') return json(catalog);
    posts++; mkdirSync(join(s.outputRoot, 'test-run', 'result.pending.json'));
    return json(payload());
  } }));
  assert.equal(posts, 1); assert.equal(s.budget.usedMicros(), reserved);
  assert.equal(readdirSync(join(s.outputRoot, 'test-run')).includes('result.json'), false);
  s.budget.db.exec("CREATE TRIGGER fail_accounting BEFORE UPDATE ON sends BEGIN SELECT RAISE(FAIL, 'injected accounting failure'); END;");
  await assert.rejects(runLiveOrder({ ...base(s), runId: 'ledger-write-failure', fetchImpl: async (_, init) => {
    if (init.method === 'GET') return json(catalog); posts++; return json(payload());
  } }), /injected accounting failure/);
  assert.equal(posts, 2); assert.equal(s.budget.usedMicros(), reserved * 2);
  const saved = JSON.parse(readFileSync(join(s.outputRoot, 'ledger-write-failure', 'result.json'), 'utf8'));
  assert.equal(saved.status, 'validated'); assert.deepEqual(saved.decisions, decisions);
  await assert.rejects(runLiveOrder({ ...base(s), runId: 'ledger-write-failure', outputRoot: join(s.root, 'retry-from-worktree'),
    fetchImpl: async () => { posts++; } }), /already_claimed/);
  assert.equal(posts, 2);
});

test('invalid decisions still account known usage, but malformed envelopes and unknown usage retain reservations', async t => {
  const s = setup(t);
  const cases = [payload('{}'), { ...payload(), usage: {} }, 'not json'];
  for (const [i, raw] of cases.entries()) {
    const run = await runLiveOrder({ ...base(s), runId: `invalid-${i}`, fetchImpl: async (_, init) => init.method === 'GET'
      ? json(catalog) : typeof raw === 'string' ? new Response(raw) : json(raw) });
    assert.equal(run.result.status, i === 0 ? 'invalid_response' : 'provider_failure');
    assert.equal(run.result.decisions, null);
    if (i === 0) assert.equal(s.budget.usedMicros(), 1860);
  }
  assert.equal(s.budget.usedMicros(), 1860 + 2 * reserved);
});

test('escaped credential echoes are refused without saving the secret; non-retryable HTTP errors send once', async t => {
  const s = setup(t); let posts = 0;
  const echoed = JSON.stringify(payload(key)).replaceAll(key, [...key].map(c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`).join(''));
  const run = await runLiveOrder({ ...base(s), fetchImpl: async (_, init) => init.method === 'GET' ? json(catalog) : new Response(echoed) });
  assert.equal(run.result.failureReason, 'provider_secret_echo'); assert.doesNotMatch(filesText(run.directory), /fixture-provider-secret/);
  const rejected = await runLiveOrder({ ...base(s), runId: 'bad-request', fetchImpl: async (_, init) => {
    if (init.method === 'GET') return json(catalog); posts++; return json({ error: key }, 400);
  } });
  assert.equal(posts, 1); assert.equal(rejected.result.failureReason, 'provider_http_failure');
  assert.doesNotMatch(filesText(rejected.directory), /fixture-provider-secret/);
});

test('provider identity, completion caps and reasoning counts fail closed', () => {
  const raw = payload(); assert.equal(inspectOrderResponse(raw, ORDER_MODELS.nebius).usage.outputTokens, 800);
  assert.throws(() => inspectOrderResponse({ ...raw, model: 'other' }, ORDER_MODELS.nebius), /model_mismatch/);
  const oversized = structuredClone(raw); oversized.usage.completion_tokens = 9000; oversized.usage.total_tokens = 12000;
  assert.throws(() => inspectOrderResponse(oversized, ORDER_MODELS.nebius), /usage_uncheckable/);
});

test('retry count is bounded; a network exception containing the credential is neither retained nor retried', async t => {
  const s = setup(t); let posts = 0;
  const failed = await runLiveOrder({ ...base(s), fetchImpl: async (_, init) => {
    if (init.method === 'GET') return json(catalog); posts++; return json({ error: 'unavailable' }, 503);
  } });
  assert.equal(posts, 3); assert.equal(failed.result.failureReason, 'provider_http_failure'); assert.equal(s.budget.usedMicros(), reserved * 3);
  const lowerKey = 'credential_containing_only_lowercase_letters';
  const transport = await runLiveOrder({ ...base(s), key: lowerKey, runId: 'network-error', fetchImpl: async (_, init) => {
    if (init.method === 'GET') return json(catalog); posts++; throw new Error(lowerKey);
  } });
  assert.equal(posts, 4); assert.equal(transport.result.failureReason, 'provider_transport_failure');
  assert.ok(!filesText(transport.directory).includes(lowerKey));
});

test('retry waiting ends at the request deadline and an oversized response never becomes a decision', async t => {
  const s = setup(t); let posts = 0;
  const timed = await runLiveOrder({ ...base(s), timeoutMs: 30, wait: async () => new Promise(() => {}), fetchImpl: async (_, init) => {
    if (init.method === 'GET') return json(catalog); posts++; return json({ error: 'rate limited' }, 429);
  } });
  assert.equal(posts, 1); assert.equal(timed.result.failureReason, 'request_timeout');
  const large = await runLiveOrder({ ...base(s), runId: 'large-response', fetchImpl: async (_, init) => init.method === 'GET'
    ? json(catalog) : new Response('x'.repeat(1000001)) });
  assert.equal(large.result.failureReason, 'provider_response_size_limit');
  assert.equal(s.budget.usedMicros(), reserved * 2);
});

test('higher-cap reservations cover every allowed retry and parsing uses the recorded cap', () => {
  assert.deepEqual(generationLimits.map(maximumReservation), [324404, 334234, 353895]);
  const raw = { usage: { prompt_tokens: 1000, completion_tokens: 12000, total_tokens: 13000,
    completion_tokens_details: { reasoning_tokens: 11000 } } };
  assert.throws(() => inspectOrderUsage(raw, 8192), /usage_uncheckable/);
  assert.equal(inspectOrderUsage(raw, 16384).outputTokens, 12000);
});

test('a #664 live transport records and reserves the higher cap on every retry', async t => {
  const s = setup(t), refunds = reconcile(orderWorld('664').loadWorld()); let posts = 0;
  const run = await runLiveOrder({ ...base(s), runId: 'higher-cap', worldId: '664', generationTokenLimit: 32768, fetchImpl: async (_, init) => {
    if (init.method === 'GET') return json(catalog);
    posts++; assert.equal(s.budget.usedMicros(), 353895 * posts);
    assert.equal(JSON.parse(init.body).max_completion_tokens, 32768);
    return posts === 1 ? new Response('busy', { status: 503 }) : json({ model: ORDER_MODELS.nebius,
      choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ decisions: refunds }) } }],
      usage: { prompt_tokens: 1000, completion_tokens: 12000, total_tokens: 13000, completion_tokens_details: { reasoning_tokens: 11000 } } });
  } });
  assert.equal(run.result.status, 'validated'); assert.equal(run.result.generationTokenLimit, 32768);
  assert.equal(s.budget.usedMicros(), 368595); assert.equal(run.result.usage.outputTokens, 12000);
  for (const attempt of [1, 2]) {
    assert.equal(JSON.parse(readFileSync(join(run.directory, `generation-attempt-${attempt}.json`))).generationTokenLimit, 32768);
  }
});

test('each world sends one public input at every cap, and the cap reaches the wire body', () => {
  for (const worldId of ['670', '664']) {
    const hashes = generationLimits.map(generationTokenLimit => {
      const request = prepareOrderRequest('nebius', undefined, { worldId, generationTokenLimit });
      assert.equal(orderWireRequest(request).body.max_completion_tokens, generationTokenLimit);
      assert.doesNotMatch(JSON.stringify(request), /EVALUATOR_ONLY_|privateCanary|merchantAnswer|expectedDiagnosis/);
      return request.commonInputSha256;
    });
    assert.equal(new Set(hashes).size, 1);
  }
});

test('a missing key claims nothing, and a long Retry-After cannot hide the HTTP status behind the deadline', async t => {
  const s = setup(t); let posts = 0;
  await assert.rejects(runLiveOrder({ ...base(s), key: undefined, fetchImpl: async () => { posts++; } }), /provider_key_unavailable/);
  assert.equal(posts, 0); assert.equal(readdirSync(s.root).includes('outputs'), false);
  const delays = [];
  const run = await runLiveOrder({ ...base(s), wait: async ms => { delays.push(ms); }, fetchImpl: async (_, init) => {
    if (init.method === 'GET') return json(catalog);
    posts++; return new Response('slow down', { status: 429, headers: { 'retry-after': '600' } });
  } });
  assert.deepEqual(delays, [30000, 30000]); assert.equal(posts, 3);
  assert.equal(run.result.failureReason, 'provider_http_failure');
});
