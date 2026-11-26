// The WooCommerce side of the simulator (ticket 09): orders as the store sees them as of the case clock, the notes
// WooCommerce and Razorpay's plugin write on them, and the system status. Answers have the backend interface's form,
// { ok, http, headers?, body } or { ok: false, http, error }, with WooCommerce's own error shape; bodies are raw
// records, which e1/tools/woocommerce.mjs gives WooCommerce's REST shapes.
import { createHash } from 'node:crypto';
import { customerFor, fromStoreTime } from './world.mjs';

const invalid = param => ({ ok: false, http: 400,
  error: { code: 'rest_invalid_param', message: `Invalid parameter(s): ${param}`, data: { status: 400 } } });
const noOrder = { ok: false, http: 404, error: { code: 'woocommerce_rest_shop_order_invalid_id', message: 'Invalid ID.', data: { status: 404 } } };
const byTime = (a, b) => a.at - b.at || a.woo_id - b.woo_id || a.k - b.k;

// An order's notes: the plugin's Razorpay order note at checkout (woo-razorpay.php createRazorpayOrderId), then
// the notes the world or a case's cause wrote on it (world.mjs order_notes), each at its own time.
const notesOf = order => [{ at: order.created_at, note: `Razorpay OrderId: ${order.payment.order_id}` },
  ...(order.notes ?? []).map(n => ({ at: n.created_at, note: n.note }))].map((n, k) => ({ woo_id: order.woo_id, k, ...n }));

// The order's status as of now: the latest of its changes so far (paid: processing; a cause's failed_at, as #670's
// cron job writes it: failed), else pending. A status the store cannot place in time is refused, so a new cause
// that sets one must add its time here first.
const TIMED = { processing: 'paid_at', failed: 'failed_at' };
function stateAt(order, now) {
  if (!Object.hasOwn(TIMED, order.status)) throw new Error(`store: order ${order.woo_id} has status ${order.status}, which has no time`);
  const changes = Object.entries(TIMED).filter(([, field]) => order[field] !== undefined && order[field] <= now)
    .map(([status, field]) => ({ status, modified_at: order[field] })).sort((a, b) => a.modified_at - b.modified_at);
  return changes.at(-1) ?? { status: 'pending', modified_at: order.created_at };
}

// The plugin a cause or decoy installs a version of, by its kind; #670's installs Razorpay 4.8.8 when it starts.
const INSTALLS = { plugin_670: 'woo-razorpay/woo-razorpay.php' };
function injectedUpdates(injection, plugin) {
  return [injection?.cause, injection?.decoy].filter(i => i?.plugin_version !== undefined).filter(i => {
    if (!Object.hasOwn(INSTALLS, i.kind)) throw new Error(`store: ${i.kind} installs a plugin version but names no plugin`);
    return INSTALLS[i.kind] === plugin;
  }).map(i => ({ at: i.starts_at, version: i.plugin_version }));
}

// `orders` are the simulator's own; `version`, `seed` and `injection` the world's.
export function openStore({ version, seed, orders, injection = null }) {
  const { store, catalog } = version;
  // An injected update is placed after a version's own update at the same second, so it wins the tie.
  const plugins = store.plugins.map(p => ({ ...p, updates: [...p.updates, ...injectedUpdates(injection, p.plugin)].sort((a, b) => a.at - b.at) }));
  // The deploy log: the baseline's code deploys, and one deploy per plugin update from the same `plugins` that
  // system status reads, so the two cannot disagree. Ids are given in time order after the merge, so an injected
  // deploy takes its place in the sequence instead of standing out at the end (section 3 item 10).
  const pluginDeploys = plugins.flatMap(p => p.updates.map((u, i) => ({ at: u.at,
    description: `Update ${p.plugin.split('/')[0]} from ${i === 0 ? p.version : p.updates[i - 1].version} to ${u.version}` })));
  const deploys = [...store.deploys.map(d => ({ at: fromStoreTime(d.at, version.utc_offset_s), description: d.description })), ...pluginDeploys]
    .sort((a, b) => a.at - b.at || (a.description < b.description ? -1 : 1))
    .map((d, i) => ({ id: store.first_deploy_id + i, ...d,
      sha: createHash('sha256').update(`${version.id}|${seed}|deploy|${d.at}|${d.description}`).digest('hex').slice(0, 40) }));
  // WooCommerce numbers line items and notes as they are written, so both follow time order across the store.
  let nextItem = store.first_item_id;
  const items = new Map(orders.map(order => [order.woo_id,
    order.items.map(item => ({ ...item, item_id: nextItem++, name: catalog.find(c => c.sku === item.sku).name }))]));
  const notes = new Map(orders.map(order => [order.woo_id, []]));
  orders.flatMap(notesOf).sort(byTime).forEach((n, i) => notes.get(n.woo_id).push({ ...n, id: store.first_note_id + i }));
  const byId = new Map(orders.map(order => [order.woo_id, order]));
  const inOrder = [...orders].sort((a, b) => a.created_at - b.created_at || a.woo_id - b.woo_id);
  const offset = version.utc_offset_s;

  const asOf = (order, now) => {
    const { status, modified_at } = stateAt(order, now), paid = status === 'processing';
    return {
      woo_id: order.woo_id, status, created_at: order.created_at,
      modified_at, ...(paid && { paid_at: order.paid_at, payment_id: order.payment.id }),
      total_paise: order.total_paise, subtotal_paise: order.subtotal_paise, discount_paise: order.discount_paise,
      items: structuredClone(items.get(order.woo_id)), customer: customerFor(version, seed, order.index),
      payment_method: store.payment_method, payment_method_title: store.payment_method_title,
    };
  };
  const visible = (id, now) => (byId.get(id)?.created_at <= now ? byId.get(id) : null);

  return {
    // GET /wc/v3/orders with after/before in site time, per_page and offset. WooCommerce sorts by date; section 3
    // item 10 fixes time order, then id. X-WP-Total counts only what exists as of now. No status filter: a status
    // changes as the clock moves, which would shift an offset cursor past rows (rows carry their status instead).
    // A refund made in Razorpay's dashboard leaves the WooCommerce order as it was.
    listOrders({ after, before, per_page = 10, offset: skip = 0 } = {}, now) {
      const from = fromStoreTime(after, offset), to = fromStoreTime(before, offset);
      if (Number.isNaN(from)) return invalid('after');
      if (Number.isNaN(to)) return invalid('before');
      if (!(Number.isInteger(per_page) && per_page >= 1 && per_page <= 100)) return invalid('per_page');
      if (!(Number.isInteger(skip) && skip >= 0)) return invalid('offset');
      const matching = inOrder.filter(o => o.created_at >= from && o.created_at <= Math.min(to, now)).map(o => asOf(o, now));
      return { ok: true, http: 200, headers: { 'X-WP-Total': matching.length, 'X-WP-TotalPages': Math.ceil(matching.length / per_page) },
        body: matching.slice(skip, skip + per_page) };
    },
    getOrder(id, now) {
      const order = visible(id, now);
      return order ? { ok: true, http: 200, body: asOf(order, now) } : noOrder;
    },
    // GET /wc/v3/orders/<id>/notes; WooCommerce lists newest first, section 3 item 10 oldest first.
    orderNotes(id, now) {
      if (!visible(id, now)) return noOrder;
      return { ok: true, http: 200, body: notes.get(id).filter(n => n.at <= now).map(({ id: noteId, at, note }) => ({ id: noteId, at, note })) };
    },
    // GET /wc/v3/system_status: each plugin at its last update by now.
    // GET /repos/{owner}/{repo}/deployments with per_page and an offset in place of page: what has deployed by now,
    // oldest first (section 3 item 10; GitHub lists newest first).
    listDeploys({ per_page = 30, offset: skip = 0 } = {}, now) {
      if (!(Number.isInteger(per_page) && per_page >= 1 && per_page <= 100)) return invalid('per_page');
      const done = deploys.filter(d => d.at <= now);
      return { ok: true, http: 200, body: done.slice(skip, skip + per_page).map(d => ({ ...d, creator: store.deployer })) };
    },
    systemStatus(now) {
      const asOfNow = plugins.map(({ updates, ...plugin }) =>
        ({ ...plugin, version: updates.filter(u => u.at <= now).at(-1)?.version ?? plugin.version }));
      return { ok: true, http: 200, body: { home_url: store.home_url, wp_version: store.wp_version, currency: store.currency, plugins: asOfNow } };
    },
  };
}
