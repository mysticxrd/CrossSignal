import { readFileSync } from 'node:fs';
import { check, orders, validateDecisions } from '../../../order-recovery/refund-ordering/world.mjs';
import { simulate } from '../../../order-recovery/refund-ordering/simulate.mjs';
import { costs } from './grade.mjs';

export const truthPath = new URL('./razorpay-664.truth.json', import.meta.url);
export const loadTruth = () => JSON.parse(readFileSync(truthPath, 'utf8'));
export function grade(world, decisions, truth) {
  validateDecisions(world, decisions);
  check(truth.orders.length === orders(world).length && orders(world).every(o => truth.orders.filter(t => t.orderId === o.id).length === 1), 'truth does not match orders');
  const answers = Object.fromEntries(truth.orders.map(t => [t.orderId, t.merchantAnswer]));
  return simulate(world, decisions, answers).map(outcome => {
    const t = truth.orders.find(t => t.orderId === outcome.orderId), d = decisions.find(d => d.orderId === outcome.orderId);
    const matches = ['payment', 'orderStatus', 'fulfillment', 'followup'].every(key => outcome[key] === t.expected[key]);
    const reason = !matches || (t.needsPerson && !outcome.asked) ? 'wrongState' : outcome.asked ? 'ask' : 'right';
    return { ...outcome, action: d.action, evidenceIds: d.evidenceIds, reason, cost: costs[reason] };
  });
}
