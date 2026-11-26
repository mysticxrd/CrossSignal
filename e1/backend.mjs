// The backend interface (section 3 item 12): what the tools, the executor and the verifier call, with the
// simulator behind it now and Razorpay/WooCommerce test mode later. Every method is async, as a network backend's
// would be. Every method answers as Razorpay's API does: { ok: true, http: 200, body } or
// { ok: false, http: 400, error }. A read's body is the raw record, with no tool envelope, projection or caps
// (section 6 item 2); a write's 200 means it has landed, and its 400 means nothing changed.
// Write methods take no idempotency key, because Razorpay capture and WooCommerce order updates have none.
import { requireThat } from '../db/benchmark/contracts.mjs';

// Reads (ticket 08) answer as of the case clock, which `now` gives in whole seconds; lists take Razorpay's
// { from, to, count, skip } and answer a collection with no total.
export const BACKEND_METHODS = Object.freeze(['now', 'fetchPayment', 'fetchAllPayments', 'fetchOrderPayments', 'fetchAllRefunds',
  'fetchWebhook', 'fetchWebhookDeliveries', 'fetchCaptureSettings', 'capturePayment']);

// Only the interface's methods, frozen: whoever holds a backend cannot reach the simulator's state or journal.
export function asBackend(impl) {
  return Object.freeze(Object.fromEntries(BACKEND_METHODS.map(name => {
    requireThat(typeof impl[name] === 'function', `backend: ${name} is missing`);
    return [name, async (...args) => impl[name](...args)];
  })));
}
