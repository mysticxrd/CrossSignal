import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { OrderBudget } from '../order-recovery/budget.mjs';
import { loadPriceCard } from '../e1/price-card.mjs';
import { fitsSchema, priorProbeMicros, probeBudget, probeCapMicros, probeFindings, probeSends, probeSnapshot, probeTools, runProbe }
  from '../e1/probe.mjs';
import { extendsPrefix } from '../e1/request.mjs';

const card = loadPriceCard('deepseek-v4.1-flash-1017');
const key = 'test-key-not-real-0123456789';

function ledger(t) {
  const dir = mkdtempSync(join(tmpdir(), 'e1-probe-'));
  const budget = new OrderBudget(join(dir, 'budget.sqlite'), 25000000);
  t.after(() => { budget.close(); rmSync(dir, { recursive: true, force: true }); });
  return budget;
}

test('--prepare writes exactly the committed snapshot, and its worst case fits the $0.05 cap', () => {
  const committed = JSON.parse(readFileSync(new URL('./fixtures/e1-probe-requests.json', import.meta.url), 'utf8'));
  assert.deepEqual(probeSnapshot(card), committed);
  // Turn 2 replays send 2's reply (at most 2,048 tokens, ~16 KB) in three sends: about $0.015 more at $0.30/M.
  assert.ok(committed.worstCaseMicros + 15000 <= probeCapMicros, 'room left for turn 2 to grow by the live reply');
});

test('the sends share one prefix for the cache, and the last repeats the first byte for byte', () => {
  const [named, required, serial, asContent, asReasoning, none, repeat] = probeSends(card).map(s => s.body);
  assert.ok([required, serial, asContent, asReasoning, none].every(body => extendsPrefix(named, body)));
  assert.equal(JSON.stringify(repeat), JSON.stringify(named));
  assert.deepEqual([asContent, asReasoning, none].map(b => Object.keys(b.messages[2]).join()),
    ['role,content,reasoning_content,tool_calls', 'role,content,reasoning,tool_calls', 'role,content,tool_calls']);
});

test('every probe tool is strict: all properties required, none extra, at every depth', () => {
  const strict = schema => schema.anyOf ? schema.anyOf.every(strict) : schema.type === 'array' ? strict(schema.items)
    : schema.type !== 'object' || (schema.additionalProperties === false
      && Object.keys(schema.properties).join() === schema.required.join() && Object.values(schema.properties).every(strict));
  assert.ok(probeTools.every(t => t.function.strict === true && strict(t.function.parameters)));
  const wait = probeTools.find(t => t.function.name === 'wait').function.parameters;
  assert.ok(fitsSchema(wait, { hours: 4, reason: 'see captures' }));
  assert.ok(!fitsSchema(wait, { hours: 25, reason: 'x' }) && !fitsSchema(wait, { hours: 4 }) && !fitsSchema(wait, { hours: 4, reason: 'x', extra: 1 }));
});

test('the probe stops itself at its cap, counting an unsettled attempt at its reservation', t => {
  const budget = ledger(t); budget.claim('e1-probe-t', 'nebius');
  const guard = probeBudget(budget, 10000);
  guard.reserve('e1-probe-t', 11, 6000); guard.settle('e1-probe-t', 11, 1000);
  guard.reserve('e1-probe-t', 21, 6000);
  assert.throws(() => guard.reserve('e1-probe-t', 31, 3001), /probe_cap_reached/);
  assert.equal(guard.usedMicros(), 7000);
  // Earlier probe runs count against the same $0.05; other runs in the ledger don't.
  budget.claim('other-run', 'nebius'); budget.reserve('other-run', 1, 40000);
  assert.equal(priorProbeMicros(budget), 7000);
  assert.throws(() => probeBudget(budget, 10000, priorProbeMicros(budget)).reserve('e1-probe-t', 41, 3001), /probe_cap_reached/);
});

test('a live run offline: catalog first, turn 2 replays send 2 three ways, a refusal is recorded', async t => {
  const budget = ledger(t), saved = {}, posted = [];
  const usage = (prompt, cached) => ({ prompt_tokens: prompt, completion_tokens: 300, total_tokens: prompt + 300,
    prompt_tokens_details: { cached_tokens: cached }, completion_tokens_details: { reasoning_tokens: 120 } });
  const call = (id, name, args) => ({ id, type: 'function', function: { name, arguments: JSON.stringify(args) } });
  const span = { from: '2026-11-17T00:00:00+05:30', to: '2026-11-18T00:00:00+05:30' };
  const fetchImpl = async (url, init) => {
    if (init.method === 'GET') return Response.json({ data: [{ id: card.model, context_length: 1048576,
      pricing: { prompt: '0.0000003', completion: '0.0000012', input_cache_read: '0.000000006' } }] });
    const body = JSON.parse(init.body); posted.push(body);
    if (body.parallel_tool_calls === false) return new Response('{"error":"parallel_tool_calls not supported"}', { status: 400 });
    const calls = body.messages.length > 2 ? [call('c9', 'wait', { hours: 2, reason: 'captures' })]
      : [call('c1', 'list_deploys', span), call('c2', 'store_revenue', span)];
    return Response.json({ id: `r${posted.length}`, model: card.model, usage: usage(1500, posted.length > 1 ? 1408 : 0),
      choices: [{ finish_reason: 'tool_calls', message: { role: 'assistant', content: '', reasoning: 'think', tool_calls: calls } }] });
  };
  const run = await runProbe({ card, key, budget, runId: 'e1-probe-t', fetchImpl, save: (name, value) => { saved[name] = value; } });
  assert.deepEqual(run.outcomes.map(o => o.status), ['answered', 'answered', 'refused', 'answered', 'answered', 'answered', 'answered']);
  assert.match(run.outcomes[2].attempts[0].error, /parallel_tool_calls not supported/);
  // Nebius's `reasoning` field is passed back under both names, then not at all.
  assert.equal(posted[3].messages[2].reasoning_content, 'think');
  assert.equal(posted[4].messages[2].reasoning, 'think');
  assert.ok(!('reasoning' in posted[5].messages[2]) && posted[5].messages[3].tool_call_id === 'c1');
  assert.ok(saved['catalog.json'] && saved['4-turn2-reasoning_content.response.json']);
  // Five settled sends plus the refused one, which keeps its reservation until a correction settles it.
  assert.equal(budget.usedMicros(), run.usedMicros);
  const findings = probeFindings(run, card);
  assert.equal(findings.length, 8);
  assert.match(findings[4], /2 1408\/1500/);
});
