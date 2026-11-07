import { orders, recordFor } from './world.mjs';

const passive = action => world => orders(world).map(o => ({ orderId: o.id, action, evidenceIds: [] }));
export const doNothing = passive('leave');
export const alwaysAsk = passive('ask');
export function reconcile(world) {
  return orders(world).map(o => {
    const payment = recordFor(world, o.id, 'payment'), fulfillment = recordFor(world, o.id, 'fulfillment');
    const needsRepair = payment.status === 'refunded' && (o.status !== 'refunded' || fulfillment.status !== 'stopped');
    const action = needsRepair ? (fulfillment.status === 'unknown' ? 'ask' : 'sync_refund') : 'leave';
    return { orderId: o.id, action, evidenceIds: [o.id, payment.id, fulfillment.id] };
  });
}
export const rivals = { 'Do nothing': doNothing, 'Always ask': alwaysAsk, 'Fields script': reconcile };
