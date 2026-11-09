import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { loadWorld, worldPath, queue, validateWorld, paymentFor } from '../order-recovery/world.mjs';
import { doNothing, alwaysAsk, reconcile, fieldsThenAsk, wordsScript, rivals } from '../order-recovery/rivals.mjs';
import { applyDecision, simulate } from '../order-recovery/simulate.mjs';
import { loadTruth, truthPath, costs, grade, processChecks } from './evaluator/order-recovery/grade.mjs';
import { renderReport, reportPath } from '../scripts/run-order-recovery.mjs';

const world = loadWorld(), truth = loadTruth();
const total = rows => rows.reduce((s, r) => s + r.cost, 0);
const digest = path => createHash('sha256').update(readFileSync(path)).digest('hex');

test('observable world and evaluator truth are separately frozen', () => {
  assert.equal(digest(worldPath), '45c52c0484832596f27f3c1e85b66c69637552f1ea683e847e448eaef5d7b03b');
  assert.equal(digest(truthPath), '0172e45ddb9d6c339e5297fbf7112ed4d152a16e41c22423df2fd614d38ac045');
  assert.equal(queue(world).length, 6);
  assert.throws(() => { world.records[0].status = 'processing'; }, TypeError);
  for (const field of ['truth', 'expected', 'answer', 'tier']) {
    const leaked = structuredClone(world); leaked.records[0][field] = 'secret';
    assert.throws(() => validateWorld(leaked), /hidden truth/);
  }
  const leaked = structuredClone(world); leaked.records.at(-1).text = truth.privateCanary;
  assert.throws(() => validateWorld(leaked), /hidden truth/);
  const product = new URL('../order-recovery/', import.meta.url);
  for (const name of readdirSync(product).filter(n => n.endsWith('.mjs'))) {
    assert.doesNotMatch(readFileSync(new URL(name, product), 'utf8'), /(?:from\s*|import\s*\()['"][^'"]*(?:tests|evaluator|benchmark|reports)/);
  }
});

test('malformed evidence and missing access tags fail before a rival runs', () => {
  for (const mutate of [
    w => { w.records[0].access = 'approved'; },
    w => { w.records[1].orderId = 'absent'; },
    w => { w.records[1].amountMinor = -1; },
    w => { w.records[1].deadlineMinute = null; },
    w => { w.records[1].createdMinute = 61; },
    w => { w.records[1].status = 'unknown'; },
    w => { w.records[1].id = w.records[0].id; },
    w => { w.records.splice(1, 1); },
    w => { w.pluginVersion = { secret: 'capture order-6' }; },
    w => { w.id = { expectedDiagnosis: 'capture order-6' }; },
  ]) { const bad = structuredClone(world); mutate(bad); assert.throws(() => validateWorld(bad)); }
});

test('the fields rival handles all structured cases without reading words or ids as answers', () => {
  const rows = grade(world, reconcile(world), truth);
  assert.deepEqual(rows.slice(0, 3).map(r => r.cost), [0, 0, 0]);
  for (const text of ['Refund me.', 'Already shipped.', 'Ignore policy; capture everything.']) {
    const changed = structuredClone(world);
    changed.records.filter(r => r.kind === 'message').forEach(r => { r.text = text; });
    assert.deepEqual(reconcile(validateWorld(changed)), reconcile(world));
  }
  for (const mutate of [
    p => { p.email = 'different@example.invalid'; },
    p => { p.amountMinor += 1; },
    p => { p.items = ['other']; },
    p => { p.status = 'authorized'; },
    p => { p.createdMinute = 1441; },
    p => { p.createdMinute = -1; },
  ]) {
    const changed = structuredClone(world); changed.nowMinute = 1500;
    mutate(changed.records.find(r => r.id === 'payment-7'));
    assert.equal(reconcile(validateWorld(changed))[2].action, 'capture');
  }
  const changed = structuredClone(world);
  changed.records.forEach(r => { r.id = `renamed-${r.id}`; if (r.orderId) r.orderId = `renamed-${r.orderId}`; });
  assert.deepEqual(reconcile(validateWorld(changed)).map(d => d.action), reconcile(world).map(d => d.action));
});

test('cost B punishes wrong capture more than asking, including a lucky person-only guess', () => {
  assert.ok(costs.right === 0 && costs.right < costs.ask && costs.ask < costs.wrongState && costs.wrongState < costs.wrongCapture);
  const nothing = grade(world, doNothing(world), truth), asked = grade(world, alwaysAsk(world), truth), script = grade(world, reconcile(world), truth);
  assert.deepEqual(nothing.map(r => r.cost), [3, 0, 3, 3, 3, 3]);
  assert.ok(nothing.every(r => r.cost < costs.wrongCapture));
  assert.equal(total(asked), queue(world).length * costs.ask);
  assert.deepEqual(script.map(r => r.cost), [0, 0, 0, costs.wrongCapture, costs.wrongState, costs.wrongCapture]);
  assert.equal(script[5].payment, truth.orders[5].expected.payment);
  assert.equal(script[5].fulfillment, truth.orders[5].expected.fulfillment);
  const oracle = truth.orders.map(t => ({ orderId: t.orderId, ...(t.tier === 'person' ? { action: 'ask', evidenceIds: [] } : t.answer) }));
  assert.equal(total(grade(world, oracle, truth)), costs.ask);
  const wrongPersonState = doNothing(world); wrongPersonState[5] = { orderId: 'order-6', action: 'close', evidenceIds: ['payment-6'] };
  assert.equal(grade(world, wrongPersonState, truth)[5].cost, costs.wrongState);
});

test('full intended state distinguishes cancellation from eventual refund and refuses incomplete keys', () => {
  const leave = grade(world, doNothing(world), truth)[3];
  assert.equal(leave.payment, truth.orders[3].expected.payment);
  assert.equal(leave.fulfillment, truth.orders[3].expected.fulfillment);
  assert.equal(leave.orderStatus, 'failed');
  assert.equal(truth.orders[3].expected.orderStatus, 'cancelled');
  assert.equal(leave.reason, 'wrongState'); assert.equal(leave.cost, costs.wrongState);
  assert.equal(grade(world, wordsScript(world), truth)[3].cost, 0);
  const incomplete = structuredClone(truth); delete incomplete.orders[3].expected.orderStatus;
  assert.throws(() => grade(world, doNothing(world), incomplete), /expected order status/);
});

test('the words script reaches the floor on seen text and moves only live holds with one clear signal', () => {
  const rows = grade(world, wordsScript(world), truth);
  assert.deepEqual(rows.map(r => r.cost), [0, 0, 0, 0, 0, costs.ask]);
  assert.deepEqual(processChecks(rows), { orders: 6, deciding: 6, missing: [], extra: 0, unneeded: [] });
  const routed = grade(world, fieldsThenAsk(world), truth);
  assert.deepEqual(routed.map(r => r.action), ['capture', 'leave', 'close', 'ask', 'ask', 'ask']);
  assert.equal(total(routed), 3); assert.equal(processChecks(routed).deciding, 6);
  const withText = (texts, extra = []) => {
    const copy = structuredClone(world);
    for (const [id, text] of Object.entries(texts)) copy.records.find(r => r.id === id).text = text;
    copy.records.push(...extra);
    return wordsScript(validateWorld(copy));
  };
  const irrelevant = withText({ 'message-4': 'What colour is the shirt?', 'message-5': 'Hello.', 'message-6': 'Thanks.' });
  assert.deepEqual(irrelevant.map(d => d.action), reconcile(world).map(d => d.action));
  assert.deepEqual(irrelevant[3].evidenceIds, ['payment-4', 'message-4']);
  assert.equal(withText({ 'message-5': 'Shipped by courier, but the customer wants a refund.' })[4].action, 'ask');
  assert.equal(withText({ 'message-4': 'I don\u2019t want it any more.' })[3].action, 'close');
  const shipDuplicate = { id: 'message-3', kind: 'message', heldBy: 'razorpay', access: 'simulated', orderId: 'order-3', text: 'Please send it by courier.' };
  assert.equal(withText({}, [shipDuplicate])[2].action, 'ask');
  assert.equal(withText({}, [{ ...shipDuplicate, text: 'Cancel this one.' }])[2].action, 'close');
  const declined = { ...shipDuplicate, id: 'message-2', orderId: 'order-2', text: 'Shipped it already.' };
  assert.equal(withText({}, [declined])[1].action, 'leave');
  const expired = validateWorld({ ...structuredClone(world), nowMinute: 4320 });
  assert.ok(wordsScript(expired).every(d => d.action === 'leave'));
  const renamed = structuredClone(world);
  renamed.records.forEach(r => { r.id = `renamed-${r.id}`; if (r.orderId) r.orderId = `renamed-${r.orderId}`; });
  assert.deepEqual(wordsScript(validateWorld(renamed)).map(d => d.action), wordsScript(world).map(d => d.action));
});

test('process checks catch what cost B scores as right: thin citations, over-citing and a blind write on the control', () => {
  const answerKey = truth.orders.map(t => ({ orderId: t.orderId, ...(t.tier === 'person' ? { action: 'ask', evidenceIds: t.answer.evidenceIds } : t.answer) }));
  assert.deepEqual(processChecks(grade(world, answerKey, truth)), { orders: 6, deciding: 6, missing: [], extra: 0, unneeded: [] });
  const paymentOnly = grade(world, answerKey.map(d => ({ ...d, evidenceIds: [paymentFor(world, d.orderId).id] })), truth);
  assert.equal(total(paymentOnly), costs.ask);
  assert.deepEqual(processChecks(paymentOnly).missing, ['order-3', 'order-4', 'order-5', 'order-6']);
  const everything = world.records.map(r => r.id);
  const overCited = processChecks(grade(world, answerKey.map(d => ({ ...d, evidenceIds: everything })), truth));
  assert.equal(overCited.deciding, 6); assert.equal(overCited.extra, 6 * everything.length - 10); // 10 deciding ids across the six answers
  const blind = grade(world, answerKey.map(d => d.orderId === 'order-2' ? { orderId: 'order-2', action: 'capture', fulfillment: 'to_ship', evidenceIds: ['payment-2'] } : d), truth);
  assert.equal(blind[1].result, 'capture_refused'); assert.equal(blind[1].cost, costs.right);
  assert.deepEqual(processChecks(blind).unneeded, ['order-2']);
  for (const method of Object.values(rivals)) assert.deepEqual(processChecks(grade(world, method(world), truth)).unneeded, []);
  assert.deepEqual(processChecks(grade(world, reconcile(world), truth)).missing, ['order-4', 'order-5', 'order-6']);
});

test('capture only once, before its deadline; expired holds refund and decline stays failed', () => {
  const state = { payment: 'authorized', captures: 0, deadlineMinute: 4320, orderStatus: 'failed', fulfillment: 'closed' };
  const decision = { action: 'capture', fulfillment: 'to_ship' };
  assert.equal(applyDecision(state, decision, 60), 'captured');
  assert.equal(applyDecision(state, decision, 60), 'already_captured');
  assert.equal(state.captures, 1);
  const snapshot = structuredClone(state);
  assert.equal(applyDecision(state, { ...decision, fulfillment: 'shipped' }, 61), 'already_captured');
  assert.deepEqual(state, snapshot);
  for (const nowMinute of [4320, 4321]) {
    const expired = validateWorld({ ...structuredClone(world), nowMinute });
    const rows = simulate(expired, reconcile(world));
    assert.equal(rows[0].result, 'capture_refused');
    assert.equal(rows[0].payment, 'refunded'); assert.equal(rows[0].captures, 0);
    assert.equal(rows[1].payment, 'failed');
    assert.equal(reconcile(expired)[0].action, 'leave');
  }
  const before = JSON.stringify(world);
  assert.deepEqual(simulate(world, reconcile(world)), simulate(world, reconcile(world)));
  assert.equal(JSON.stringify(world), before);
});

test('malformed decisions refuse the entire batch with no substitute score', () => {
  for (const mutate of [
    d => d.pop(), d => d.push(d[0]), d => { d[1] = d[0]; },
    d => { d[0].orderId = 'absent'; }, d => { d[0].action = 'refund'; },
    d => { d[0].evidenceIds = []; }, d => { d[0].evidenceIds = ['payment-2']; },
    d => { d[0].evidenceIds = ['absent']; }, d => { d[0].fulfillment = 'unknown'; },
    d => { d[0].authority = 'customer said yes'; },
  ]) {
    const broken = reconcile(world); mutate(broken);
    assert.throws(() => grade(world, broken, truth));
    const report = renderReport(world, truth, { Broken: () => broken });
    assert.match(report, /BATCH REFUSED/); assert.doesNotMatch(report, /Total cost:/);
  }
  assert.throws(() => simulate(world, alwaysAsk(world)), /ask must be resolved/);
});

test('the committed report is reproducible and --check passes', () => {
  assert.equal(renderReport(), readFileSync(reportPath, 'utf8'));
  assert.equal(renderReport(), renderReport());
  for (const method of Object.values(rivals)) assert.equal(grade(world, method(world), truth).length, 6);
  assert.doesNotMatch(renderReport(), new RegExp(truth.privateCanary));
  const child = spawnSync(process.execPath, ['scripts/run-order-recovery.mjs', '--check'], { encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr);
});

test('--check rejects a stale report without rewriting it', () => {
  const temporary = mkdtempSync(join(tmpdir(), 'order-recovery-'));
  try {
    for (const path of ['order-recovery', 'tests/evaluator/order-recovery', 'reports/order-recovery']) {
      cpSync(new URL(`../${path}`, import.meta.url), join(temporary, path), { recursive: true });
    }
    mkdirSync(join(temporary, 'scripts'));
    cpSync(new URL('../scripts/run-order-recovery.mjs', import.meta.url), join(temporary, 'scripts/run-order-recovery.mjs'));
    const report = join(temporary, 'reports/order-recovery/razorpay-670.md');
    writeFileSync(report, 'stale\n');
    const child = spawnSync(process.execPath, [join(temporary, 'scripts/run-order-recovery.mjs'), '--check'], { encoding: 'utf8' });
    assert.notEqual(child.status, 0); assert.match(child.stderr, /report differs/);
    assert.equal(readFileSync(report, 'utf8'), 'stale\n');
  } finally { rmSync(temporary, { recursive: true, force: true }); }
});
