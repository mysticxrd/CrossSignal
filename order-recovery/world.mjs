import { readFileSync } from 'node:fs';

export const worldPath = new URL('./worlds/razorpay-670.json', import.meta.url);
export function check(ok, message) { if (!ok) throw new Error(message); }
const keys = {
  order: ['id', 'kind', 'heldBy', 'access', 'status'],
  payment: ['id', 'kind', 'heldBy', 'access', 'orderId', 'status', 'email', 'amountMinor', 'currency', 'items', 'createdMinute', 'deadlineMinute'],
  message: ['id', 'kind', 'heldBy', 'access', 'orderId', 'text'],
};
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
export function loadWorld(path = worldPath) {
  const world = JSON.parse(readFileSync(path, 'utf8'));
  return validateWorld(world);
}
export function validateWorld(world) {
  check(!/EVALUATOR_ONLY_|"(?:truth|hiddenTruth|canary|privateCanary|hiddenCause|rootCause|expected|expectedDiagnosis|tier|answer)"/i.test(JSON.stringify(world)), 'hidden truth exposed');
  check(Object.keys(world).sort().join() === ['id', 'mode', 'nowMinute', 'payment_action', 'pluginVersion', 'records'].sort().join(), 'invalid world fields');
  check([world.id, world.pluginVersion].every(v => typeof v === 'string' && v.length > 0), 'invalid world metadata');
  check(world.mode === 'SIMULATED' && world.payment_action === 'authorize' && Number.isFinite(world.nowMinute), 'invalid world');
  check(Array.isArray(world.records) && world.records.length > 0, 'missing records');
  const ids = new Set();
  for (const r of world.records) {
    check(keys[r.kind] && Object.keys(r).sort().join() === [...keys[r.kind]].sort().join(), 'invalid record fields');
    check(typeof r.id === 'string' && r.id.length > 0 && !ids.has(r.id), 'duplicate or missing record id'); ids.add(r.id);
    check(['razorpay', 'merchant'].includes(r.heldBy), 'invalid record holder');
    check(r.access === (r.heldBy === 'merchant' ? 'needs merchant consent (simulated)' : 'simulated'), 'invalid access label');
    if (r.kind === 'order') check(['failed', 'pending', 'processing', 'completed', 'cancelled'].includes(r.status), 'invalid order status');
    if (r.kind === 'message') check(typeof r.text === 'string', 'invalid message');
    if (r.kind === 'payment') {
      check(['authorized', 'captured', 'failed', 'refunded'].includes(r.status), 'invalid payment status');
      check(Number.isSafeInteger(r.amountMinor) && r.amountMinor > 0 && typeof r.email === 'string' && r.currency === 'INR', 'invalid payment fields');
      check(Array.isArray(r.items) && r.items.length > 0 && r.items.every(x => typeof x === 'string'), 'invalid items');
      check(Number.isFinite(r.createdMinute) && r.createdMinute <= world.nowMinute && Number.isFinite(r.deadlineMinute) && r.deadlineMinute > r.createdMinute, 'invalid payment clock');
    }
  }
  const orders = world.records.filter(r => r.kind === 'order');
  for (const r of world.records.filter(r => r.kind !== 'order')) check(orders.some(o => o.id === r.orderId), 'unknown record order');
  for (const o of orders) check(world.records.filter(r => r.kind === 'payment' && r.orderId === o.id).length === 1, 'one payment per order required in this world');
  return freeze(world);
}
export const queue = world => world.records.filter(r => r.kind === 'order' && ['failed', 'pending'].includes(r.status));
export const paymentFor = (world, id) => world.records.find(r => r.kind === 'payment' && r.orderId === id);
export function validateDecisions(world, decisions) {
  check(Array.isArray(decisions) && decisions.length === queue(world).length, 'missing or extra decisions');
  const seen = new Set();
  for (const d of decisions) {
    check(d && Object.keys(d).every(k => ['orderId', 'action', 'fulfillment', 'evidenceIds'].includes(k)), 'invalid decision fields');
    check(queue(world).some(o => o.id === d.orderId) && !seen.has(d.orderId), 'unknown or duplicate order'); seen.add(d.orderId);
    check(['capture', 'close', 'leave', 'ask'].includes(d.action), 'unknown action');
    check(d.action === 'capture' ? ['to_ship', 'shipped'].includes(d.fulfillment) : d.fulfillment === undefined, 'invalid fulfillment');
    check(Array.isArray(d.evidenceIds) && d.evidenceIds.every(id => world.records.some(r => r.id === id)), 'unknown citation');
    if (['capture', 'close'].includes(d.action)) check(d.evidenceIds.some(id => world.records.some(r => r.id === id && (r.id === d.orderId || r.orderId === d.orderId))), 'missing citation from this order');
  }
}
