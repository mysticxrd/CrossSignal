import { queue, paymentFor } from './world.mjs';

const passive = action => world => queue(world).map(o => ({ orderId: o.id, action, evidenceIds: [] }));
export const doNothing = passive('leave');
export const alwaysAsk = passive('ask');
export function reconcile(world) {
  return queue(world).map(o => {
    const p = paymentFor(world, o.id);
    const duplicate = world.records.find(r => r.kind === 'payment' && r.orderId !== o.id && r.status === 'captured'
      && r.email === p.email && r.amountMinor === p.amountMinor && r.currency === p.currency
      && JSON.stringify([...r.items].sort()) === JSON.stringify([...p.items].sort())
      && r.createdMinute >= p.createdMinute && r.createdMinute - p.createdMinute <= 1440);
    const action = p.status !== 'authorized' || p.deadlineMinute <= world.nowMinute ? 'leave' : duplicate ? 'close' : 'capture';
    return { orderId: o.id, action, ...(action === 'capture' ? { fulfillment: 'to_ship' } : {}), evidenceIds: [p.id, ...(duplicate ? [duplicate.id] : [])] };
  });
}
export const rivals = { 'Do nothing': doNothing, 'Always ask': alwaysAsk, 'Fields script': reconcile };
