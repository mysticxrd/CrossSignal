import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { loadDaily } from '../db/benchmark/ga4-daily.mjs';
import { buildCase, counterfactualCheck } from '../e1/case.mjs';
import { openSimulator } from '../e1/simulator.mjs';
import { measure } from '../e1/trigger.mjs';
import { buildWorld } from '../e1/world.mjs';

const HOUR = 3600, DAY = 86400;
const rows = loadDaily();
const at = text => Date.parse(`${text}:00+05:30`) / 1000;
const START = at('2026-11-18T10:00');
const spec = { seed: 'case-670', cause: { kind: 'plugin_670', starts_at: START } };
const world = buildCase({ ...spec, rows });
const baseline = buildWorld({ seed: spec.seed, rows });

test('#670 case: no cause, no dip; the trigger freezes "now" 13 h after the cause starts', () => {
  const result = counterfactualCheck(spec, { rows });
  assert.equal(result.now, at('2026-11-18T23:00'));
  assert.deepEqual(result.failures, []);
  assert.equal(result.pass, true);
  assert.equal(result.with_both.crosses, true);
  assert.equal(result.without_cause.crosses, false);
  // Same comparison day (the cause starts after it), a smaller dip day.
  assert.equal(result.without_cause.comparison_paise, result.with_both.comparison_paise);
  assert.ok(result.without_cause.dip_paise > result.with_both.dip_paise);
});

test('no decoy, same dip: a decoy that moves store revenue fails the check, a harmless one passes', () => {
  // Decoys arrive with ticket 05e; these stand-ins exercise the check through its replaceable builder. Each touches
  // the orders paid in one span: the dip day (from 17 Nov 23:00) or the hidden days after "now".
  const plant = (from, move) => ({ decoy, ...rest }) => {
    const built = buildCase({ ...rest, decoy: null });
    if (decoy) for (const o of built.orders.filter(o => o.paid_at >= from && o.paid_at < from + 10 * HOUR)) {
      if (move) o.paid_at += 3 * DAY; else o.notes = [...o.notes, { created_at: o.paid_at, note: 'Customer asked about delivery.' }];
    }
    return built;
  };
  const decoyed = { ...spec, decoy: { kind: 'stand_in', starts_at: START - 10 * HOUR } };
  const moved = counterfactualCheck(decoyed, { rows, build: plant(START - 10 * HOUR, true) });
  assert.deepEqual(moved.failures, ['decoy_moves_dip', 'decoy_moves_revenue']);
  assert.notEqual(moved.without_decoy.dip_paise, moved.with_both.dip_paise);
  const later = counterfactualCheck(decoyed, { rows, build: plant(START + 3 * DAY, true) });
  assert.deepEqual(later.failures, ['decoy_moves_revenue'], 'the dip is the same, but the hidden days are not');
  const harmless = counterfactualCheck(decoyed, { rows, build: plant(START - 10 * HOUR, false) });
  assert.deepEqual(harmless.failures, []);
  assert.deepEqual(harmless.without_decoy, harmless.with_both);
  // A case that never crosses fails; it does not throw.
  assert.deepEqual(counterfactualCheck(spec, { rows, build: () => ({ ...baseline, orders: [] }) }).failures, ['no_dip']);
});

test('the world hash covers the injection; the orders before the cause are the baseline\'s', () => {
  assert.equal(buildCase({ seed: spec.seed, rows }).hash, baseline.hash, 'a case with no cause and no decoy is the baseline');
  assert.notEqual(world.hash, baseline.hash);
  assert.equal(buildCase({ ...spec, rows }).hash, world.hash, 'same spec, same world');
  assert.notEqual(buildCase({ ...spec, cause: { ...spec.cause, starts_at: START + HOUR }, rows }).hash, world.hash);
  const before = o => o.payment.created_at < START; // the plugin acts when the payment reaches the store
  assert.deepEqual(world.orders.filter(before), baseline.orders.filter(before));
  const cause = world.injection.cause;
  assert.deepEqual([cause.kind, cause.starts_at, cause.plugin_version, cause.payment_action], ['plugin_670', START, '4.8.8', 'authorize']);
  assert.deepEqual(cause.affected_orders, world.orders.filter(o => o.status === 'failed').map(o => o.woo_id));
  assert.equal(world.injection.decoy, null);
  assert.throws(() => buildCase({ ...spec, cause: { kind: 'plugin_999', starts_at: START }, rows }), /unknown cause plugin_999/);
  for (const late of [world.starts_at, at('2026-12-07T00:00'), world.ends_at]) {
    assert.throws(() => buildCase({ ...spec, cause: { ...spec.cause, starts_at: late }, rows }), /where the trigger can still fire/);
  }
});

test('the #670 symptoms from the public report appear in the records the backend serves', async () => {
  const now = at('2026-11-18T23:00');
  const clock = { now };
  const sim = openSimulator({ world, journal: join(mkdtempSync(join(tmpdir(), 'e1-case-')), 'r_670.sim.jsonl'), clock: () => clock.now });
  const after = world.orders.filter(o => o.created_at >= START && o.created_at < now - HOUR);
  const failed = after.filter(o => o.status === 'failed'), paid = after.filter(o => o.status === 'processing');
  // About half the orders since the cause started reach the store only by webhook, UPI most often.
  assert.ok(failed.length / after.length > 0.4 && failed.length / after.length < 0.6, `${failed.length} of ${after.length}`);
  const rate = method => after.filter(o => o.payment.method === method && o.status === 'failed').length / after.filter(o => o.payment.method === method).length;
  assert.ok(rate('upi') > rate('card'));

  // An order marked Failed, with the plugin's two notes, while Razorpay holds its payment authorized.
  const order = failed[0], payment = order.payment;
  assert.equal(order.paid_at, undefined);
  assert.ok(order.failed_at > payment.created_at && order.failed_at - payment.created_at <= 600, 'the cron job runs within minutes');
  assert.deepEqual(order.notes.map(n => n.note), [`Payment Failed. Please check Razorpay Dashboard. <br/> Razorpay Id: ${payment.id}`,
    'Transaction Failed: The payment has failed.<br/>', 'Order status changed from Pending payment to Failed.']);
  const seen = (await sim.backend.fetchPayment(payment.id)).body;
  assert.equal(seen.status, 'authorized');
  assert.equal(seen.captured_at, undefined);
  assert.deepEqual(seen.refunds, []);
  // The webhook delivered payment.authorized, answered 200; no order.paid follows, as nothing is captured.
  const log = (await sim.backend.fetchWebhookDeliveries({ from: START, to: now, count: 100 })).body.items;
  const forOrder = log.filter(d => d.entity_id === payment.id || d.entity_id === payment.order_id);
  assert.deepEqual(forOrder.map(d => [d.event, d.attempts.map(a => a.response_code)]), [['payment.authorized', [200]]]);
  // Store revenue drops; Razorpay's authorized money does not.
  assert.equal(measure(world, now).crosses, true);

  // A paid order: Processing with the plugin's success note, its payment authorized until the merchant captures it.
  const kept = paid.find(o => o.payment.captured_at > now);
  assert.ok(kept.notes.some(n => n.note === `Razorpay payment successful <br/>Razorpay Id: ${kept.payment.id}`));
  assert.equal((await sim.backend.fetchPayment(kept.payment.id)).body.status, 'authorized');

  // When the capture window ends, Razorpay refunds the uncaptured payment: a customer who paid gets a refund and a
  // Failed order.
  clock.now = payment.created_at + 3 * DAY;
  const refunded = (await sim.backend.fetchPayment(payment.id)).body;
  assert.equal(refunded.status, 'refunded');
  assert.deepEqual(refunded.refunds.map(r => [r.amount_paise, r.status, r.speed_processed]), [[payment.amount_paise, 'processed', 'normal']]);
  const late = await sim.backend.capturePayment({ payment_id: payment.id, amount_paise: payment.amount_paise });
  assert.equal(late.http, 400, 'a refunded payment cannot be captured');

  // Captured in time, the payment is taken and the auto-refund never happens.
  const other = failed[1].payment;
  clock.now = now;
  assert.equal((await sim.backend.capturePayment({ payment_id: other.id, amount_paise: other.amount_paise })).http, 200);
  clock.now = other.created_at + 4 * DAY;
  const taken = (await sim.backend.fetchPayment(other.id)).body;
  assert.deepEqual([taken.status, taken.captured_at, taken.refunds], ['captured', now, undefined]);
  sim.close();
});
