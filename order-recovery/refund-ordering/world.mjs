import { readFileSync } from 'node:fs';

export const worldPath = new URL('../worlds/razorpay-664.json', import.meta.url);
export function check(ok, message) { if (!ok) throw new Error(message); }
const fields = {
  order: ['status'],
  payment: ['orderId', 'status', 'amountMinor', 'refundedMinor', 'currency', 'observedMinute'],
  fulfillment: ['orderId', 'status', 'observedMinute'],
  webhook: ['orderId', 'event', 'occurredMinute', 'deliveredMinute'],
};
const exact = (value, keys) => value && Object.keys(value).sort().join() === [...keys].sort().join();
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
export const orders = world => world.records.filter(r => r.kind === 'order');
export const recordFor = (world, id, kind) => world.records.find(r => r.orderId === id && r.kind === kind);
export function loadWorld(path = worldPath) { return validateWorld(JSON.parse(readFileSync(path, 'utf8'))); }
export function validateWorld(world) {
  check(!/EVALUATOR_ONLY_|"(?:truth|hiddenTruth|canary|privateCanary|expected|tier|answer)"/i.test(JSON.stringify(world)), 'hidden truth exposed');
  check(exact(world, ['id', 'mode', 'pluginVersion', 'nowMinute', 'records']), 'invalid world fields');
  check([world.id, world.pluginVersion].every(v => typeof v === 'string' && v.length > 0), 'invalid metadata');
  check(world.mode === 'SIMULATED' && Number.isFinite(world.nowMinute), 'invalid world');
  check(Array.isArray(world.records) && world.records.length > 0, 'missing records');
  const ids = new Set(), statuses = { order: ['processing', 'refunded'], payment: ['captured', 'refunded'], fulfillment: ['queued', 'shipped', 'stopped', 'unknown'] };
  for (const r of world.records) {
    check(r && Object.hasOwn(fields, r.kind) && exact(r, ['id', 'kind', 'heldBy', 'access', ...fields[r.kind]]), 'invalid record fields');
    check(typeof r.id === 'string' && r.id.length > 0 && !ids.has(r.id), 'duplicate or missing id'); ids.add(r.id);
    check(r.heldBy === (['order', 'fulfillment'].includes(r.kind) ? 'merchant' : 'razorpay'), 'invalid holder');
    check(r.access === (r.heldBy === 'merchant' ? 'needs merchant consent (simulated)' : 'simulated'), 'invalid access');
    if (r.kind !== 'webhook') check(statuses[r.kind].includes(r.status), 'invalid status');
    if (['payment', 'fulfillment'].includes(r.kind)) check(Number.isFinite(r.observedMinute) && r.observedMinute === world.nowMinute, 'snapshot observation required');
    if (r.kind === 'payment') {
      check(Number.isSafeInteger(r.amountMinor) && r.amountMinor > 0 && r.currency === 'INR', 'invalid amount');
      check(r.refundedMinor === (r.status === 'refunded' ? r.amountMinor : 0), 'only full refunds or captured payments supported');
    }
    if (r.kind === 'webhook') {
      check(['payment.authorized', 'refund.created'].includes(r.event), 'invalid event');
      check(Number.isFinite(r.occurredMinute) && Number.isFinite(r.deliveredMinute) && r.occurredMinute <= r.deliveredMinute && r.deliveredMinute <= world.nowMinute, 'invalid event clock');
    }
  }
  check(orders(world).length > 0, 'missing orders');
  for (const r of world.records.filter(r => r.kind !== 'order')) check(orders(world).some(o => o.id === r.orderId), 'unknown record order');
  for (const o of orders(world)) for (const kind of ['payment', 'fulfillment']) check(world.records.filter(r => r.orderId === o.id && r.kind === kind).length === 1, `one ${kind} observation required`);
  return freeze(world);
}
export function validateDecisions(world, decisions) {
  check(Array.isArray(decisions) && decisions.length === orders(world).length, 'missing or extra decisions');
  const seen = new Set();
  for (const d of decisions) {
    check(exact(d, ['orderId', 'action', 'evidenceIds']), 'invalid decision fields');
    check(orders(world).some(o => o.id === d.orderId) && !seen.has(d.orderId), 'unknown or duplicate order'); seen.add(d.orderId);
    check(['sync_refund', 'ask', 'leave'].includes(d.action), 'unknown action');
    check(Array.isArray(d.evidenceIds) && d.evidenceIds.every(id => world.records.some(r => r.id === id && (r.id === d.orderId || r.orderId === d.orderId))), 'invalid citation');
    if (d.action === 'sync_refund') check(['payment', 'fulfillment'].every(kind => d.evidenceIds.includes(recordFor(world, d.orderId, kind).id)), 'missing payment or fulfillment citation');
  }
}
