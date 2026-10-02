import assert from 'node:assert/strict';
import test from 'node:test';
import { digest } from '../db/benchmark/contracts.mjs';
import { createSubscriptionBudget } from '../db/benchmark/subscription-budget.mjs';
const request = body => ({ body, requestSha256: digest(body) });
const fixture = request({ syntheticProtocolFixture: true });
const result = n => ({ status: 'parsed_fixture', usage: { inputTokens: 99999, outputTokens: n, reasoningTokens: n - 1 } });
const budget = () => createSubscriptionBudget({ method: 'tool-using-model', clock: () => 0 });

test('byte admission includes serialized JSON; oversized input fails before a model attempt', () => {
  const b = budget(); assert.throws(() => b.begin(request({ value: 'x'.repeat(8192) })), /context_overflow/);
  assert.equal(b.snapshot().turns, 0); assert.equal(b.snapshot().generationCapEnforced, false);
});
test('token thresholds include reasoning once, retain overshoot and stop further dispatch', () => {
  const b = budget(), lease = b.begin(fixture), closed = b.finish(lease, result(1025));
  assert.equal(closed.terminalStatus, 'budget_exhausted'); assert.equal(closed.cumulativeOutputTokens, 1025);
  assert.equal(b.snapshot().records.at(-1).reasoningTokens, 1024);
  assert.throws(() => b.begin(fixture), /budget_exhausted/);
});
test('cumulative threshold stops before a new attempt; native input usage is measured without a combined-token cap', () => {
  const b = budget();
  for (let i = 0; i < 6; i++) assert.equal(b.finish(b.begin(fixture), result(1024)).qualified, true);
  assert.equal(b.snapshot().cumulativeOutputTokens, 6144);
  assert.throws(() => b.begin(fixture), /budget_exhausted/); assert.equal(b.snapshot().turns, 6);
});
test('an attempt may overshoot the remaining cumulative threshold and is retained as failed', () => {
  const b = budget();
  for (let i = 0; i < 6; i++) b.finish(b.begin(fixture), result(1000));
  const closed = b.finish(b.begin(fixture), result(300));
  assert.equal(closed.terminalStatus, 'budget_exhausted'); assert.equal(closed.cumulativeOutputTokens, 6300);
});
test('12 model turns, one single-shot attempt and 10 invalid tool attempts are hard host bounds', () => {
  const b = budget(); for (let i = 0; i < 12; i++) b.finish(b.begin(fixture), result(2));
  assert.throws(() => b.begin(fixture), /budget_exhausted/);
  const one = createSubscriptionBudget({ method: 'single-shot-model', clock: () => 0 });
  one.finish(one.begin(fixture), result(2)); assert.throws(() => one.begin(fixture), /budget_exhausted/);
  const noTools = createSubscriptionBudget({ method: 'single-shot-model', clock: () => 0 });
  assert.throws(() => noTools.toolAttempt({ tool: 'revenue.inspect' }), /single_shot_tool_forbidden/);
  const tools = budget(); for (let i = 0; i < 10; i++) tools.toolAttempt({ tool: 'invalid', arguments: {} });
  assert.throws(() => tools.toolAttempt({ tool: 'invalid' }), /budget_exhausted/);
  assert.equal(tools.snapshot().toolAttempts, 10);
});
test('only one request can be in flight; lease replay and fabricated request hashes fail', () => {
  const b = budget(); b.begin(fixture); assert.throws(() => b.begin(fixture), /concurrency_violation/);
  const c = budget(), lease = c.begin(fixture); c.finish(lease, result(2));
  assert.throws(() => c.finish(lease, result(2)), /replayed/);
  assert.throws(() => budget().begin({ ...fixture, requestSha256: 'forged' }), /hash mismatch/);
});
test('monotonic request/run deadlines stop waiting without claiming remote compute cancellation', () => {
  let time = 0;
  const b = createSubscriptionBudget({ method: 'tool-using-model', clock: () => time });
  const lease = b.begin(fixture); assert.equal(lease.deadlineMonotonicMs, 180000);
  time = 180000; assert.equal(b.finish(lease, result(2)).terminalStatus, 'timeout');
  assert.throws(() => b.begin(fixture), /timeout/);
  time = 0; const c = createSubscriptionBudget({ method: 'tool-using-model', clock: () => time });
  time = 900000; assert.throws(() => c.begin(fixture), /timeout/);
});
test('missing/inconsistent usage, post-dispatch interruption and clock reversal never trigger retries', () => {
  const b = budget(); assert.equal(b.finish(b.begin(fixture), { status: 'failed', usage: {} }).terminalStatus, 'usage_unknown');
  assert.throws(() => b.begin(fixture), /usage_unknown/);
  const c = budget(); assert.equal(c.abort(c.begin(fixture)).terminalStatus, 'indeterminate');
  assert.throws(() => c.begin(fixture), /indeterminate/); assert.equal(c.snapshot().automaticRetries, 0);
  let time = 100;
  const d = createSubscriptionBudget({ method: 'tool-using-model', clock: () => time });
  time = 99; assert.throws(() => d.begin(fixture), /invalid_monotonic_clock/);
});
