import { check, orders, recordFor, validateDecisions } from './world.mjs';

export function applyDecision(state, action) {
  check(['leave', 'sync_refund'].includes(action), 'ask requires a merchant answer');
  if (action === 'leave') return 'left';
  if (state.payment !== 'refunded' || state.fulfillment === 'unknown') return 'repair_refused';
  const nextFulfillment = state.fulfillment === 'queued' ? 'stopped' : state.fulfillment;
  const nextFollowup = nextFulfillment === 'shipped' ? 'merchant_review' : 'none';
  if (state.orderStatus === 'refunded' && state.fulfillment === nextFulfillment && state.followup === nextFollowup) return 'already_reconciled';
  state.orderStatus = 'refunded'; state.fulfillment = nextFulfillment; state.followup = nextFollowup;
  return 'reconciled';
}
export function simulate(world, decisions, merchantAnswers = {}) {
  validateDecisions(world, decisions);
  return orders(world).map(o => {
    const payment = recordFor(world, o.id, 'payment'), fulfillment = recordFor(world, o.id, 'fulfillment');
    const d = decisions.find(d => d.orderId === o.id);
    const state = { orderId: o.id, payment: payment.status, orderStatus: o.status, fulfillment: fulfillment.status, followup: 'none' };
    if (d.action === 'ask') {
      const answer = merchantAnswers[o.id];
      check(['queued', 'shipped', 'stopped'].includes(answer), 'missing or invalid merchant answer');
      check(state.fulfillment === 'unknown' || state.fulfillment === answer, 'merchant answer contradicts snapshot');
      state.fulfillment = answer;
    }
    const result = applyDecision(state, d.action === 'ask' ? 'sync_refund' : d.action);
    return { ...state, result, asked: d.action === 'ask' };
  });
}
