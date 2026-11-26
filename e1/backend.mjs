// The backend interface (section 3 item 12): what the tools, the executor and the verifier call, with the
// simulator behind it now and Razorpay/WooCommerce test mode later. Every method is async, as a network backend's
// would be. Every method answers as Razorpay's API does: { ok: true, http: 200, body } or
// { ok: false, http: 400, error }. A read's body is the raw record, with no tool envelope, projection or caps
// (section 6 item 2); a write's 200 means it has landed, and its 400 means nothing changed.
// Write methods take no idempotency key, because Razorpay capture and WooCommerce order updates have none.
import { requireThat } from '../db/benchmark/contracts.mjs';

// Reads (tickets 08 and 09) answer as of the case clock, which `now` gives in whole seconds. Razorpay lists take
// { from, to, count, skip } and answer a collection with no total; WooCommerce's take { after, before, status,
// per_page, offset } in site time and answer an array with X-WP-Total and X-WP-TotalPages in `headers`, and
// WooCommerce errors keep WooCommerce's { code, message, data } shape. listDeploys takes { per_page, offset } and
// answers GitHub deployments as of now; ga4Daily takes { start_date, end_date } (YYYY-MM-DD, store time) and
// answers the GA4 property's days that have begun, the day holding now cut at now.
export const BACKEND_METHODS = Object.freeze(['now', 'fetchPayment', 'fetchAllPayments', 'fetchOrderPayments', 'fetchAllRefunds',
  'fetchWebhook', 'fetchWebhookDeliveries', 'fetchCaptureSettings', 'wcListOrders', 'wcGetOrder', 'wcOrderNotes', 'wcSystemStatus',
  'listDeploys', 'ga4Daily', 'capturePayment']);

// Only the interface's methods, frozen: whoever holds a backend cannot reach the simulator's state or journal.
export function asBackend(impl) {
  return Object.freeze(Object.fromEntries(BACKEND_METHODS.map(name => {
    requireThat(typeof impl[name] === 'function', `backend: ${name} is missing`);
    return [name, async (...args) => impl[name](...args)];
  })));
}
