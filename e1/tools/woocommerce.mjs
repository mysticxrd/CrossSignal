// Ticket 09: the three WooCommerce tools, shaped as the WooCommerce REST API v3 answers GET /orders,
// GET /orders/<id> with GET /orders/<id>/notes, and GET /system_status. The backend answers raw store records
// (e1/store.mjs); these functions give them WooCommerce's documented field names and formats.
// tests/fixtures/woocommerce-docs.json holds the doc fields they must match.
import { requireThat } from '../../db/benchmark/contracts.mjs';
import { CURSOR, STORE_TIME, defineTool, dropEmpty, fail, ist, listPage, note, ok } from './core.mjs';
import { fromStoreTime, splitPaise, storeTime } from '../world.mjs';

const object = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
// WooCommerce gives money as strings with two decimals.
const money = paise => `${Math.floor(paise / 100)}.${String(paise % 100).padStart(2, '0')}`;
const dates = (field, unix) => (unix === undefined ? { [field]: null, [`${field}_gmt`]: null }
  : { [field]: storeTime(unix), [`${field}_gmt`]: storeTime(unix, 0) });

// The order entity, in the docs' key order. The basket's discount is spread over its lines by price, so line
// totals add up to the order total; prices include tax and no tax lines are kept. Line items leave out product_id
// and subtotal (sku and discount_total carry them), so an order holding all 20 catalog items stays under the cap.
export function orderEntity(o) {
  const lineTotals = splitPaise(o.total_paise, o.items.map(item => item.quantity * item.price_paise));
  return {
    id: o.woo_id, parent_id: 0, number: String(o.woo_id), created_via: 'checkout', status: o.status, currency: 'INR',
    ...dates('date_created', o.created_at), ...dates('date_modified', o.modified_at),
    discount_total: money(o.discount_paise), shipping_total: '0.00', total: money(o.total_paise), total_tax: '0.00',
    prices_include_tax: true, customer_id: 0,
    billing: { first_name: o.customer.first_name, last_name: o.customer.last_name, country: 'IN', email: o.customer.email, phone: o.customer.phone },
    payment_method: o.payment_method, payment_method_title: o.payment_method_title, transaction_id: o.payment_id ?? '',
    ...dates('date_paid', o.paid_at),
    line_items: o.items.map((item, i) => ({ id: item.item_id, name: item.name, quantity: item.quantity, total: money(lineTotals[i]),
      sku: item.sku, price: item.price_paise / 100 })),
  };
}
// The 8-field row a list shows (section 3 item 1); billing keeps what a customer's message can be matched on.
export const orderRow = o => {
  const e = orderEntity(o);
  return { id: e.id, status: e.status, date_created: e.date_created, date_paid: e.date_paid, total: e.total,
    payment_method: e.payment_method, transaction_id: e.transaction_id, billing: { email: e.billing.email, phone: e.billing.phone } };
};
// WooCommerce writes these notes itself, so customer_note is false and the author is "system".
export const noteEntity = n => ({ id: n.id, author: 'system', ...dates('date_created', n.at), note: n.note, customer_note: false });
export const systemStatus = s => ({
  environment: { home_url: s.home_url, site_url: s.home_url,
    version: s.plugins.find(p => p.plugin === 'woocommerce/woocommerce.php').version, wp_version: s.wp_version },
  active_plugins: s.plugins.map(p => ({ plugin: p.plugin, name: p.name, version: p.version, url: p.url, author_name: p.author_name })),
  settings: { currency: s.currency, number_of_decimals: 2 },
});

const notFound = (order_id, now) => fail({ code: 'woocommerce_rest_shop_order_invalid_id', message: 'Invalid ID.', data: { status: 404 } },
  note('not_found', { thing: 'order', id: order_id, now: ist(now), source: 'wc_list_orders' }));

export const WOOCOMMERCE_TOOLS = Object.freeze([
  defineTool({
    name: 'wc_list_orders',
    description: 'WooCommerce orders created in a window, as of now, oldest first, 20 a page, with their total in X-WP-Total. after and before are store time (IST), both inclusive.',
    schema: object({ after: STORE_TIME, before: STORE_TIME, cursor: CURSOR }),
    handler: async (args, { backend, now }) => listPage({
      tool: 'wc_list_orders', args, now, project: orderRow, wrap: rows => rows, total: 'X-WP-Total',
      window: { from: fromStoreTime(args.after), to: fromStoreTime(args.before), start: 'after', end: 'before' },
      fetch: async ({ count, skip }) => {
        const reply = await backend.wcListOrders({ after: args.after, before: args.before, per_page: count, offset: skip });
        return reply.ok ? { ...reply, body: { items: reply.body } } : reply;
      },
    }),
  }),
  defineTool({
    name: 'wc_get_order',
    description: 'One WooCommerce order by id, as of now, with its order notes oldest first.',
    schema: object({ order_id: { type: 'integer', minimum: 1, maximum: 999999999 } }),
    handler: async ({ order_id }, { backend, now }) => {
      const [order, notes] = await Promise.all([backend.wcGetOrder(order_id), backend.wcOrderNotes(order_id)]);
      if (order.http === 404) return notFound(order_id, now);
      requireThat(order.ok && notes.ok, `wc_get_order: the backend refused a validated query: ${(order.error ?? notes.error)?.message}`);
      return ok({ order: dropEmpty(orderEntity(order.body)), notes: notes.body.map(noteEntity) }, note('one', { now: ist(now) }));
    },
  }),
  defineTool({
    name: 'wc_system_status',
    description: 'The WooCommerce store\'s environment, active plugins with their versions, and settings, as of now.',
    schema: object({}),
    handler: async (_, { backend, now }) => ok(systemStatus((await backend.wcSystemStatus()).body), note('one', { now: ist(now) })),
  }),
]);
