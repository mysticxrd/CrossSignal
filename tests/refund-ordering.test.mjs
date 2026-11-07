import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { loadWorld, worldPath, validateWorld, recordFor } from '../order-recovery/refund-ordering/world.mjs';
import { doNothing, alwaysAsk, reconcile } from '../order-recovery/refund-ordering/rivals.mjs';
import { applyDecision, simulate } from '../order-recovery/refund-ordering/simulate.mjs';
import { loadTruth, truthPath, grade } from './evaluator/order-recovery/refund-ordering.mjs';
import { processChecks } from './evaluator/order-recovery/grade.mjs';
import { renderReport, reportPath } from '../scripts/run-refund-ordering.mjs';

const world = loadWorld(), truth = loadTruth();
const digest = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const changed = mutate => { const copy = structuredClone(world); mutate(copy); return validateWorld(copy); };

test('refund world and private truth are frozen separately with no product import path to truth', () => {
  assert.equal(digest(worldPath), '36fbb2da8bff5b10c1442eb10c1d9c7266f1ac148717e731d496dde21a40c35b');
  assert.equal(digest(truthPath), '542420bdeb43074d66412bc160e795719c3decd9dc92fe072a7a75d7be98eec3');
  assert.throws(() => { world.records[0].status = 'refunded'; }, TypeError);
  for (const field of ['truth', 'expected', 'tier', 'answer']) assert.throws(() => changed(w => { w.records[0][field] = 'secret'; }), /hidden truth/);
  assert.throws(() => changed(w => { w.id = truth.privateCanary; }), /hidden truth/);
  const product = new URL('../order-recovery/refund-ordering/', import.meta.url);
  for (const file of readdirSync(product)) assert.doesNotMatch(readFileSync(new URL(file, product), 'utf8'), /(?:from\s*|import\s*\()['"][^'"]*(?:tests|evaluator|benchmark|reports)/);
});

test('the fields script repairs processing orders, preserves shipping, asks once and leaves the control', () => {
  const decisions = reconcile(world), rows = grade(world, decisions, truth);
  assert.deepEqual(decisions.map(d => d.action), ['sync_refund', 'leave', 'sync_refund', 'ask']);
  assert.deepEqual(rows.map(r => r.cost), [0, 0, 0, 1]);
  assert.deepEqual(rows.map(r => r.orderStatus), ['refunded', 'refunded', 'refunded', 'refunded']);
  assert.deepEqual(rows.map(r => r.fulfillment), ['stopped', 'stopped', 'shipped', 'stopped']);
  assert.equal(rows[2].followup, 'merchant_review');
  assert.deepEqual(grade(world, doNothing(world), truth).map(r => r.cost), [3, 0, 3, 3]);
  assert.deepEqual(grade(world, alwaysAsk(world), truth).map(r => r.cost), [1, 1, 1, 1]);
});

test('order status and merchant follow-up are graded even when money and shipment match', () => {
  const stopped = changed(w => { recordFor(w, 'order-1', 'fulfillment').status = 'stopped'; });
  const row = grade(stopped, doNothing(stopped), truth)[0];
  assert.equal(row.payment, truth.orders[0].expected.payment);
  assert.equal(row.fulfillment, truth.orders[0].expected.fulfillment);
  assert.equal(row.cost, 3);
  const shipped = changed(w => { w.records.find(r => r.id === 'order-3').status = 'refunded'; });
  assert.equal(grade(shipped, doNothing(shipped), truth)[2].cost, 3);
  assert.equal(grade(shipped, reconcile(shipped), truth)[2].cost, 0);
});

test('current payment wins over webhook delivery order; identifiers and record order are not answers', () => {
  const swapped = changed(w => {
    for (const r of w.records.filter(r => r.kind === 'webhook')) r.deliveredMinute = r.event === 'refund.created' ? 3 : 0;
    w.records.reverse();
  });
  const actions = w => reconcile(w).map(d => [d.orderId, d.action]).sort();
  assert.deepEqual(actions(swapped), actions(world));
  const renamed = changed(w => { w.records.forEach(r => { r.id = `new-${r.id}`; if (r.orderId) r.orderId = `new-${r.orderId}`; }); });
  assert.deepEqual(reconcile(renamed).map(d => d.action), reconcile(world).map(d => d.action));
  const captured = changed(w => { const p = recordFor(w, 'order-1', 'payment'); p.status = 'captured'; p.refundedMinor = 0; });
  assert.equal(reconcile(captured)[0].action, 'leave');
  assert.equal(simulate(captured, reconcile(world).map(d => d.action === 'ask' ? { ...d, action: 'leave' } : d))[0].result, 'repair_refused');
});

test('unknown shipment cannot be guessed or silently changed; asking needs a separate valid answer', () => {
  const guessed = reconcile(world); guessed[3].action = 'sync_refund';
  const before = JSON.stringify(world), rows = grade(world, guessed, truth);
  assert.equal(rows[3].result, 'repair_refused'); assert.equal(rows[3].fulfillment, 'unknown'); assert.equal(rows[3].cost, 3);
  assert.throws(() => simulate(world, reconcile(world)), /merchant answer/);
  assert.throws(() => simulate(world, reconcile(world), { 'order-4': 'unknown' }), /merchant answer/);
  const answers = Object.fromEntries(truth.orders.map(t => [t.orderId, t.merchantAnswer])); answers['order-1'] = 'shipped';
  assert.throws(() => simulate(world, alwaysAsk(world), answers), /contradicts snapshot/);
  assert.equal(JSON.stringify(world), before);
});

test('process checks: a repair on the correct control costs 0 but is an unneeded write; an ask never is', () => {
  assert.deepEqual(processChecks(grade(world, reconcile(world), truth)), { orders: 4, deciding: 4, missing: [], extra: 0, unneeded: [] });
  const blind = grade(world, reconcile(world).map(d => d.orderId === 'order-2' ? { ...d, action: 'sync_refund' } : d), truth);
  assert.equal(blind[1].result, 'already_reconciled'); assert.equal(blind[1].cost, 0);
  assert.deepEqual(processChecks(blind).unneeded, ['order-2']);
  const asked = grade(world, alwaysAsk(world), truth);
  assert.equal(asked[1].result, 'already_reconciled'); assert.deepEqual(processChecks(asked).unneeded, []);
  const guessed = reconcile(world); guessed[3].action = 'sync_refund';
  assert.deepEqual(processChecks(grade(world, guessed, truth)).unneeded, ['order-4']);
  const withHistory = reconcile(world).map(d => ({ ...d, evidenceIds: [...d.evidenceIds, d.orderId.replace('order', 'refund')] }));
  assert.deepEqual(processChecks(grade(world, withHistory, truth)), { orders: 4, deciding: 4, missing: [], extra: 4, unneeded: [] });
  const paymentOnly = processChecks(grade(world, reconcile(world).map(d => d.action === 'leave' ? { ...d, evidenceIds: [recordFor(world, d.orderId, 'payment').id] } : d), truth));
  assert.deepEqual(paymentOnly.missing, ['order-2']);
});

test('repair is repeatable without moving money or rewriting a shipped fact', () => {
  for (const fulfillment of ['queued', 'shipped']) {
    const state = { payment: 'refunded', orderStatus: 'processing', fulfillment, followup: 'none' };
    assert.equal(applyDecision(state, 'sync_refund'), 'reconciled');
    const after = structuredClone(state);
    assert.equal(applyDecision(state, 'sync_refund'), 'already_reconciled'); assert.deepEqual(state, after);
    assert.equal(state.payment, 'refunded');
    if (fulfillment === 'shipped') assert.equal(state.fulfillment, 'shipped');
  }
  assert.deepEqual(grade(world, reconcile(world), truth), grade(world, reconcile(world), truth));
});

test('incomplete, stale, partial-refund or malformed observations fail before methods run', () => {
  for (const mutate of [
    w => { w.id = { hidden: 'secret' }; },
    w => { w.pluginVersion = { hidden: 'secret' }; },
    w => { w.records[0].access = 'approved'; },
    w => { w.records[1].heldBy = 'merchant'; },
    w => { w.records[1].orderId = 'absent'; },
    w => { w.records[1].refundedMinor -= 1; },
    w => { w.records[1].observedMinute -= 1; },
    w => { w.records[2].status = 'delivered'; },
    w => { w.records[3].deliveredMinute = -1; },
    w => { w.records[3].event = 'payment.failed'; },
    w => { w.records[1].id = w.records[0].id; },
    w => { w.records.splice(2, 1); },
    w => { w.records.push({ ...w.records[1], id: 'extra-payment' }); },
  ]) assert.throws(() => changed(mutate));
});

test('malformed batches and money actions are refused without a substitute score', () => {
  for (const mutate of [
    d => d.pop(), d => d.push(d[0]), d => { d[1] = d[0]; },
    d => { d[0].action = 'capture'; }, d => { d[0].action = 'refund'; },
    d => { d[0].orderId = 'absent'; }, d => { d[0].evidenceIds = []; },
    d => { d[0].evidenceIds = ['payment-2', 'fulfillment-2']; },
    d => { d[0].merchantAnswer = 'queued'; },
  ]) {
    const decisions = reconcile(world); mutate(decisions);
    assert.throws(() => grade(world, decisions, truth));
    const report = renderReport(world, truth, { Broken: () => decisions });
    assert.match(report, /BATCH REFUSED/); assert.doesNotMatch(report, /Total cost:/);
  }
});

test('both reports reproduce independently; refund report never prints private canary', () => {
  assert.equal(renderReport(), readFileSync(reportPath, 'utf8'));
  assert.doesNotMatch(renderReport(), new RegExp(truth.privateCanary));
  for (const script of ['scripts/run-refund-ordering.mjs', 'scripts/run-order-recovery.mjs']) {
    const child = spawnSync(process.execPath, [script, '--check'], { encoding: 'utf8' });
    assert.equal(child.status, 0, child.stderr);
  }
});

test('--check fails on a stale refund report without overwriting it', () => {
  const temporary = mkdtempSync(join(tmpdir(), 'refund-ordering-'));
  try {
    for (const path of ['order-recovery', 'tests/evaluator/order-recovery', 'reports/order-recovery']) cpSync(new URL(`../${path}`, import.meta.url), join(temporary, path), { recursive: true });
    mkdirSync(join(temporary, 'scripts'));
    cpSync(new URL('../scripts/run-refund-ordering.mjs', import.meta.url), join(temporary, 'scripts/run-refund-ordering.mjs'));
    const report = join(temporary, 'reports/order-recovery/razorpay-664.md'); writeFileSync(report, 'stale\n');
    const child = spawnSync(process.execPath, [join(temporary, 'scripts/run-refund-ordering.mjs'), '--check'], { encoding: 'utf8' });
    assert.notEqual(child.status, 0); assert.match(child.stderr, /report differs/); assert.equal(readFileSync(report, 'utf8'), 'stale\n');
  } finally { rmSync(temporary, { recursive: true, force: true }); }
});
