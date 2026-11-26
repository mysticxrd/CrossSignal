// The backend interface (section 3 item 12): what the tools, the executor and the verifier call, with the
// simulator behind it now and Razorpay/WooCommerce test mode later. Every method is async, as a network backend's
// would be. A read returns the raw record: no envelope, projection or caps (section 6 item 2). A write returns
// { ok: true, http: 200, body } once it has landed, or { ok: false, http: 400, error } having changed nothing.
// Write methods take no idempotency key, because Razorpay capture and WooCommerce order updates have none.
import { requireThat } from '../db/benchmark/contracts.mjs';

export const BACKEND_METHODS = Object.freeze(['fetchPayment', 'capturePayment']);

// Only the interface's methods, frozen: whoever holds a backend cannot reach the simulator's state or journal.
export function asBackend(impl) {
  return Object.freeze(Object.fromEntries(BACKEND_METHODS.map(name => {
    requireThat(typeof impl[name] === 'function', `backend: ${name} is missing`);
    return [name, async (...args) => impl[name](...args)];
  })));
}
