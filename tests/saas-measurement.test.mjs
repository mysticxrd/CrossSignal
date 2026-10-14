import test from 'node:test';
import assert from 'node:assert/strict';
import { POLICY, measure, snapshotOf, measurementPlan, assessOutcome, addMinutes } from '../db/cases/measurement.mjs';
import { createWorld, captureWorld, initialWindows, advanceWorld, applyRollback } from '../db/cases/world.mjs';
const snapshot = world => snapshotOf('case-test', captureWorld(world), initialWindows, world.observations);

test('conversion joins first payment to activation, counts intents once, and detects a scoped drop', () => {
  const world = createWorld('incident'), state = snapshot(world);
  assert.equal(state.signal.detected, true);
  assert.deepEqual([state.signal.baseline.intents, state.signal.baseline.successes, state.signal.incident.successes], [200, 160, 80]);
  const capture = captureWorld(world), window = { ...initialWindows[0], cohort: POLICY.cohorts[0] };
  capture.events.push(structuredClone(capture.events[0]));
  const paid = capture.events.find(e => e.kind === 'payment' && e.status === 'succeeded');
  capture.events.push({ ...paid, id: 'retry', paymentId: 'retry-payment' });
  assert.equal(measure(capture, window).conversionPercent, 80);
  const activation = capture.events.find(e => e.kind === 'subscription'); activation.paymentId = 'wrong-payment';
  assert.equal(measure(capture, window).successes, 79);
  capture.events.push({ ...capture.events[0], eligible: false });
  assert.throws(() => measure(capture, window), /conflicting_duplicate/);
});

test('normal, missing coverage, maturity and availability remain distinct', () => {
  assert.equal(snapshot(createWorld('normal')).signal.detected, false);
  const world = createWorld('incomplete'); assert.equal(snapshot(world).signal.sufficient, false);
  const capture = captureWorld(createWorld('incident')), window = { ...initialWindows[0], cohort: POLICY.cohorts[0] };
  capture.asOf = addMinutes(window.end, 9);
  assert.equal(measure(capture, window).mature, false);
  capture.asOf = addMinutes(window.end, 15);
  capture.events.find(e => e.kind === 'subscription').availableAt = addMinutes(capture.asOf, 1);
  assert.equal(measure(capture, window).successes, 79);
  capture.coverage = []; assert.equal(measure(capture, window).conversionPercent, null);
});

test('fixed follow-up plan distinguishes recovery, partial improvement, failure and no-action recovery', () => {
  for (const [scenario, expected, direction] of [['incident', 'criterion_met', 'improved'], ['partial', 'criterion_not_met', 'improved'],
    ['ineffective', 'criterion_not_met', 'unchanged'], ['spontaneous', 'criterion_met', 'improved']]) {
    let world = createWorld(scenario); const plan = measurementPlan(snapshot(world)), anchor = world.clock;
    if (scenario !== 'spontaneous') world = applyRollback(world, { service: 'billing', from: 'billing-v2', to: 'billing-v1' });
    world = advanceWorld(world, anchor, 1);
    const outcome = assessOutcome(captureWorld(world), plan, anchor);
    assert.equal(outcome.state, expected); assert.equal(outcome.direction, direction); assert.equal(outcome.causalClaim, false);
  }
});

test('delayed data reassesses the original interval; later regression is a separate interval', () => {
  let world = createWorld('incident'); const plan = measurementPlan(snapshot(world)), anchor = world.clock;
  world.scenario = 'incomplete'; world = applyRollback(world, { service: 'billing', from: 'billing-v2', to: 'billing-v1' });
  world = advanceWorld(world, anchor, 1);
  const first = assessOutcome(captureWorld(world), plan, anchor); assert.equal(first.state, 'inconclusive');
  world = advanceWorld(world, anchor, 2);
  const second = assessOutcome(captureWorld(world), plan, anchor); assert.equal(second.state, 'criterion_met');
  assert.equal(first.end, second.end); assert.equal(first.planHash, second.planHash);
  world = advanceWorld(world, anchor, 3);
  assert.equal(assessOutcome(captureWorld(world), plan, anchor, addMinutes(anchor, 30)).state, 'criterion_not_met');
});
