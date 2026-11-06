import { check, paymentFor, queue, validateDecisions } from './world.mjs';

export function applyDecision(state, decision, nowMinute) {
  if (decision.action === 'capture') {
    if (state.payment === 'captured') return 'already_captured';
    if (state.payment !== 'authorized' || nowMinute >= state.deadlineMinute) return 'capture_refused';
    state.payment = 'captured'; state.captures += 1;
    state.fulfillment = decision.fulfillment;
    state.orderStatus = decision.fulfillment === 'shipped' ? 'completed' : 'processing';
    return 'captured';
  }
  if (decision.action === 'close') { state.orderStatus = 'cancelled'; state.fulfillment = 'closed'; }
  check(['close', 'leave'].includes(decision.action), 'ask must be resolved by the evaluator');
  return decision.action;
}
export function simulate(world, decisions) {
  validateDecisions(world, decisions);
  return queue(world).map(o => {
    const p = paymentFor(world, o.id), d = decisions.find(d => d.orderId === o.id);
    const state = { orderId: o.id, orderStatus: o.status, payment: p.status, fulfillment: 'closed', captures: p.status === 'captured' ? 1 : 0, deadlineMinute: p.deadlineMinute };
    const result = applyDecision(state, d, world.nowMinute);
    // Eventual auto-refund after the deadline, not a refund API call or instant bank credit.
    if (state.payment === 'authorized') state.payment = 'refunded';
    return { ...state, result };
  });
}
