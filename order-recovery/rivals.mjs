import { queue, paymentFor } from './world.mjs';

const passive = action => world => queue(world).map(o => ({ orderId: o.id, action, evidenceIds: [] }));
export const doNothing = passive('leave');
export const alwaysAsk = passive('ask');
function fields(world, o) {
  const p = paymentFor(world, o.id);
  const duplicate = world.records.find(r => r.kind === 'payment' && r.orderId !== o.id && r.status === 'captured'
    && r.email === p.email && r.amountMinor === p.amountMinor && r.currency === p.currency
    && JSON.stringify([...r.items].sort()) === JSON.stringify([...p.items].sort())
    && r.createdMinute >= p.createdMinute && r.createdMinute - p.createdMinute <= 1440);
  const action = p.status !== 'authorized' || p.deadlineMinute <= world.nowMinute ? 'leave' : duplicate ? 'close' : 'capture';
  return { orderId: o.id, action, ...(action === 'capture' ? { fulfillment: 'to_ship' } : {}), evidenceIds: [p.id, ...(duplicate ? [duplicate.id] : [])] };
}
export const reconcile = world => queue(world).map(o => fields(world, o));
const messagesFor = (world, id) => world.records.filter(r => r.kind === 'message' && r.orderId === id);
const withMessages = (decision, messages) => ({ ...decision, evidenceIds: [...decision.evidenceIds, ...messages.map(m => m.id)] });

// The step-3 routing with a person in the model's place: rules settle orders with no text; every order with text is asked.
export const fieldsThenAsk = world => queue(world).map(o => {
  const base = fields(world, o), messages = messagesFor(world, o.id);
  return messages.length ? withMessages({ orderId: o.id, action: 'ask', evidenceIds: base.evidenceIds }, messages) : base;
});

// Keyword rules written after reading this world's three messages, frozen before any held-out case exists.
const textRules = [
  ['close', /return (?:my|the) money|refund|cancel|don't want|do not want/],
  ['shipped', /shipped|courier|dispatched/],
  ['ask', /try again|pay again|retry/],
];
export const wordsScript = world => queue(world).map(o => {
  const base = fields(world, o), messages = messagesFor(world, o.id);
  // Text cannot move money that is not held: a declined or expired payment stays with the fields script.
  if (base.action === 'leave' || !messages.length) return base;
  const text = messages.map(m => m.text).join(' ').toLowerCase().replaceAll('\u2019', "'");
  const fired = textRules.filter(([, pattern]) => pattern.test(text)).map(([rule]) => rule);
  if (!fired.length) return withMessages(base, messages);
  // Conflicting signals, or text asking to ship a duplicate, go to a person.
  const rule = fired.length === 1 && (base.action !== 'close' || fired[0] === 'close') ? fired[0] : 'ask';
  const decision = rule === 'shipped' ? { action: 'capture', fulfillment: 'shipped' } : { action: rule };
  return withMessages({ orderId: o.id, ...decision, evidenceIds: base.evidenceIds }, messages);
});
export const rivals = { 'Do nothing': doNothing, 'Always ask': alwaysAsk, 'Fields script': reconcile, 'Fields + ask on text': fieldsThenAsk, 'Words script': wordsScript };
