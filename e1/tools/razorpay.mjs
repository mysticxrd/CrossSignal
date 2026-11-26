// Ticket 08: the four Razorpay tools by their MCP names, and the two dashboard-shaped ones that have no public API
// (Razorpay's MCP README says so). The backend answers raw world records; these functions give them Razorpay's
// documented field names and formats. tests/fixtures/razorpay-docs.json holds the doc fields they must match.
import { CURSOR, WINDOW, defineTool, dropEmpty, fail, ist, listPage, note, ok, pick } from './core.mjs';

const ID = { payment: '^pay_[0-9A-Za-z]{14}$', order: '^order_[0-9A-Za-z]{14}$' };
const object = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });

const refundedPaise = p => (p.refunds ?? []).reduce((sum, refund) => sum + refund.amount_paise, 0);
// Razorpay's payment entity, in its documented key order; fields the world has no value for are left out.
export function paymentEntity(p) {
  const refunded = refundedPaise(p);
  const full = refunded > 0 && refunded === p.amount_paise;
  return {
    id: p.id, entity: 'payment', amount: p.amount_paise, currency: 'INR', status: full ? 'refunded' : p.status,
    order_id: p.order_id, invoice_id: null, international: false, method: p.method, amount_refunded: refunded,
    refund_status: refunded === 0 ? null : full ? 'full' : 'partial', captured: p.captured_at !== undefined,
    description: null, notes: [], created_at: p.created_at,
  };
}
// The 8-10-field row a list shows (section 3 item 1).
export const PAYMENT_ROW = ['id', 'entity', 'amount', 'currency', 'status', 'order_id', 'method', 'amount_refunded', 'captured', 'created_at'];
export const refundRow = r => ({ id: r.id, entity: 'refund', amount: r.amount_paise, currency: 'INR', payment_id: r.payment_id,
  status: r.status, speed_requested: r.speed_requested, speed_processed: r.speed_processed, created_at: r.created_at });
// Dashboard-shaped: Razorpay documents no delivery-log API, so the row names what the dashboard's webhook page shows.
export const deliveryRow = d => {
  const last = d.attempts.at(-1);
  return { event_id: d.id, event: d.event, entity_id: d.entity_id, status: last.response_code < 300 ? 'delivered' : 'failed',
    response_code: last.response_code, attempts: d.attempts.length, created_at: d.created_at, last_attempt_at: last.at };
};
// The capture settings page's options: "Capture all payments authorised within", "Capture payments manually
// authorised within", "Refund Automatically", "Refund Speed".
export const captureSettings = s => ({ capture: s.automatic ? 'automatic' : 'manual', auto_capture_timeout_minutes: s.auto_capture_timeout_minutes,
  manual_capture_timeout_minutes: s.manual_capture_timeout_minutes, refund_automatically: s.refund_automatically, refund_speed: s.refund_speed });

const windowTool = (name, description, list, project, header) => defineTool({
  name, description, schema: object({ ...WINDOW, cursor: CURSOR }),
  handler: async (args, { backend, now }) => listPage({ tool: name, args, now, project,
    header: header && await header(backend), fetch: page => backend[list]({ from: args.from, to: args.to, ...page }) }),
});

export const RAZORPAY_TOOLS = Object.freeze([
  windowTool('fetch_all_payments', 'Razorpay payments created in a window, as of now, oldest first, 20 a page. No total is given.',
    'fetchAllPayments', p => pick(paymentEntity(p), PAYMENT_ROW)),
  defineTool({
    name: 'fetch_payment', description: 'One Razorpay payment by id, as of now.',
    schema: object({ payment_id: { type: 'string', pattern: ID.payment } }),
    handler: async ({ payment_id }, { backend, now }) => {
      const reply = await backend.fetchPayment(payment_id);
      return reply.ok ? ok(dropEmpty(paymentEntity(reply.body)), note('one', { now: ist(now) }))
        : fail(reply.error, note('not_found', { thing: 'payment', id: payment_id, now: ist(now), source: 'fetch_all_payments' }));
    },
  }),
  defineTool({
    name: 'fetch_order_payments', description: 'The payments made against one Razorpay order id, as of now, oldest first.',
    schema: object({ order_id: { type: 'string', pattern: ID.order }, cursor: CURSOR }),
    handler: async (args, { backend, now }) => listPage({
      tool: 'fetch_order_payments', args, now, project: p => pick(paymentEntity(p), PAYMENT_ROW),
      notFound: { thing: 'order', id: args.order_id, source: 'fetch_all_payments' },
      // Razorpay pages nothing here; the cap still might, so the page is cut from the whole list.
      fetch: async ({ count, skip }) => {
        const reply = await backend.fetchOrderPayments(args.order_id);
        return reply.ok ? { ...reply, body: { ...reply.body, items: reply.body.items.slice(skip, skip + count) } } : reply;
      },
    }),
  }),
  windowTool('fetch_all_refunds', 'Razorpay refunds created in a window, as of now, oldest first, 20 a page. No total is given.',
    'fetchAllRefunds', refundRow),
  windowTool('webhook_deliveries', 'The dashboard\'s webhook: its URL, whether it is enabled, its events, and its delivery log for a window, as of now, oldest first, 20 a page.',
    'fetchWebhookDeliveries', deliveryRow, async backend => {
      const { body } = await backend.fetchWebhook();
      return { webhook: { url: body.url, status: body.active ? 'enabled' : 'disabled', active_events: body.events } };
    }),
  defineTool({
    name: 'capture_settings', description: 'The dashboard\'s payment capture settings, as of now.', schema: object({}),
    handler: async (_, { backend, now }) => ok(captureSettings((await backend.fetchCaptureSettings()).body), note('settings', { now: ist(now) })),
  }),
]);
