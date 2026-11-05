import { readFileSync } from 'node:fs';
import { check, queue, validateDecisions } from '../../../order-recovery/world.mjs';
import { simulate } from '../../../order-recovery/simulate.mjs';

export const truthPath = new URL('./razorpay-670.truth.json', import.meta.url);
export const loadTruth = () => JSON.parse(readFileSync(truthPath, 'utf8'));
export const costs = Object.freeze({ right: 0, ask: 1, wrongState: 3, wrongCapture: 10 });
export function grade(world, decisions, truth) {
  validateDecisions(world, decisions);
  check(truth.orders.length === queue(world).length && queue(world).every(o => truth.orders.filter(t => t.orderId === o.id).length === 1), 'truth does not match queue');
  const resolved = decisions.map(d => d.action !== 'ask' ? d : { ...d, ...truth.orders.find(t => t.orderId === d.orderId).answer });
  const outcomes = simulate(world, resolved);
  return outcomes.map(outcome => {
    const d = decisions.find(d => d.orderId === outcome.orderId), t = truth.orders.find(t => t.orderId === outcome.orderId);
    const matches = outcome.payment === t.expected.payment && outcome.fulfillment === t.expected.fulfillment;
    const asked = d.action === 'ask', needsPerson = t.tier === 'person';
    const wrongCapture = d.action === 'capture' && outcome.result === 'captured' && (needsPerson || t.expected.payment !== 'captured');
    const reason = wrongCapture ? 'wrongCapture' : !matches || (needsPerson && !asked) ? 'wrongState' : asked ? 'ask' : 'right';
    return { ...outcome, action: d.action, evidenceIds: d.evidenceIds, tier: t.tier, reason, cost: costs[reason] };
  });
}
