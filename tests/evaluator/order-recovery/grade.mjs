import { readFileSync } from 'node:fs';
import { check, queue, validateDecisions } from '../../../order-recovery/world.mjs';
import { simulate } from '../../../order-recovery/simulate.mjs';

export const truthPath = new URL('./razorpay-670.truth.json', import.meta.url);
export const loadTruth = (path = truthPath) => JSON.parse(readFileSync(path, 'utf8'));
export const costs = Object.freeze({ right: 0, ask: 1, wrongState: 3, wrongCapture: 10 });
export function grade(world, decisions, truth) {
  validateDecisions(world, decisions);
  check(truth.orders.length === queue(world).length && queue(world).every(o => truth.orders.filter(t => t.orderId === o.id).length === 1), 'truth does not match queue');
  check(truth.orders.every(t => ['failed', 'pending', 'processing', 'completed', 'cancelled'].includes(t.expected?.orderStatus)), 'missing or invalid expected order status');
  const resolved = decisions.map(d => d.action !== 'ask' ? d : { ...d, ...truth.orders.find(t => t.orderId === d.orderId).answer });
  const outcomes = simulate(world, resolved);
  return outcomes.map(outcome => {
    const d = decisions.find(d => d.orderId === outcome.orderId), t = truth.orders.find(t => t.orderId === outcome.orderId);
    const matches = ['payment', 'fulfillment', 'orderStatus'].every(key => outcome[key] === t.expected[key]);
    const asked = d.action === 'ask', needsPerson = t.tier === 'person';
    const wrongCapture = d.action === 'capture' && outcome.result === 'captured' && (needsPerson || t.expected.payment !== 'captured');
    const reason = wrongCapture ? 'wrongCapture' : !matches || (needsPerson && !asked) ? 'wrongState' : asked ? 'ask' : 'right';
    const unneeded = d.action === 'capture' && ['capture_refused', 'already_captured'].includes(outcome.result);
    return { ...outcome, action: d.action, evidenceIds: d.evidenceIds, tier: t.tier, reason, cost: costs[reason], ...citations(d.evidenceIds, t.answer.evidenceIds), unneeded };
  });
}
// Process checks sit beside cost and are never added into it.
// deciding: every deciding record is cited. extra: cited records outside that set, shown but not judged.
// unneeded: a write the method itself proposed that was refused or already done; an ask is never one.
export function citations(cited, deciding) {
  const unique = new Set(cited);
  return { deciding: deciding.every(id => unique.has(id)), extra: [...unique].filter(id => !deciding.includes(id)).length };
}
export function processChecks(rows) {
  return { orders: rows.length, deciding: rows.filter(r => r.deciding).length, missing: rows.filter(r => !r.deciding).map(r => r.orderId),
    extra: rows.reduce((sum, r) => sum + r.extra, 0), unneeded: rows.filter(r => r.unneeded).map(r => r.orderId) };
}
export function describeProcess(rows) {
  const p = processChecks(rows), list = ids => ids.length ? ` (${ids.join(', ')})` : '';
  return `Process checks, not in cost: deciding records cited on ${p.deciding}/${p.orders} orders${p.missing.length ? `, missing on ${p.missing.join(', ')}` : ''}; extra citations: ${p.extra}; unneeded writes: ${p.unneeded.length}${list(p.unneeded)}.`;
}
