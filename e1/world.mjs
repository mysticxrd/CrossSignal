// The E1 baseline world (ticket 03; spec fixes F2 and F7): GA4 merch-store days 2 Nov to 13 Dec 2020, shifted
// 313 whole weeks into 2026, turned into hourly orders and Razorpay payments whose daily total equals GA4's daily
// revenue in INR to the paisa. Every generator constant lives in WORLD_VERSION, which the world hash covers, so a
// change to any of them is a new world version (ADR 0001). Randomness comes only from a PRNG seeded by
// (world version, seed); Math.random is never used.
import { createHash } from 'node:crypto';
import { loadDaily } from '../db/benchmark/ga4-daily.mjs';
import { requireThat } from '../db/benchmark/contracts.mjs';
import { canonicalJson } from './canonical.mjs';

export { canonicalJson };

const DAY = 86400;
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};

export const WORLD_VERSION = freeze({
  // 2: the trigger's drop and re-arm settings joined the version (ticket 04).
  // 3: Razorpay order ids, capture settings and the webhook (ticket 08).
  // 4: the WooCommerce store: its site, plugins, ids and customers (ticket 09).
  // 5: order statuses, the plugin's order notes and causes, the first being #670 (ticket 05a), on that store.
  // 6: GA4's daily funnel counts and the store's deploy log (ticket 09 part 2).
  id: 'e1-world-6',
  // `funnel` maps ga4_run_report's metric names to GA4 CSV columns. The CSV counts sessions that began checkout, not
  // events, so checkouts is that session count. Its add-to-cart column is empty on 18 of the 42 days, so it is left out.
  ga4: { from: '2020-11-02', to: '2020-12-13', orders: 'transaction_ids', revenue: 'revenue_usd',
    funnel: { sessions: 'sessions', checkouts: 'sessions_begin_checkout' } },
  shift_days: 2191, // 313 weeks: 2 Nov 2020 (Mon) becomes 2 Nov 2026 (Mon)
  utc_offset_s: 19800, // the merchant's clock is IST; each GA4 day is one IST calendar day
  usd_inr_paise: 8800, // one fixed round rate, ₹88.00 a US dollar, not a market quote
  future_days: 7, // F7: every possible "now" has 7 full GA4 days after it
  trigger_lookback_days: 8, // ADR 0008: trailing 24 h against the same 24 h 7 days earlier
  trigger_drop_pct: 25, // ADR 0008: a crossing is the trailing 24 h at least 25% below its comparison
  trigger_rearm_pct: 10, // section 8 decision 5: a dip re-arms once the trailing 24 h is back within 10%
  sale: { name: 'Sale week', from: '2026-11-23', to: '2026-11-30' },
  first_order_id: 10001,
  // Razorpay's capture settings page: auto-capture within 3 days (the default and the maximum), auto-refund after,
  // at normal speed. The webhook is the one the WooCommerce plugin registers.
  capture: { automatic: true, auto_capture_timeout_minutes: 4320, manual_capture_timeout_minutes: 4320,
    refund_automatically: true, refund_speed: 'normal' },
  webhook: { url: 'https://merch-store.example/wp-admin/admin-post.php?action=rzp_wc_webhook', active: true,
    events: ['order.paid', 'payment.authorized'] },
  // The WooCommerce side. Versions are a plausible store's, not a claim about any release; WooCommerce 10.6.2 is
  // the "WC tested up to" of Razorpay's plugin 4.8.10, whose header names it "1 Razorpay" and whose gateway is
  // id "razorpay", default title "UPI, Cards, NetBanking". A plugin's `updates` ([{ at, version }], oldest first)
  // is where a cause installs another version; the baseline has none.
  store: {
    home_url: 'https://merch-store.example', wp_version: '6.8.2', currency: 'INR', payment_method: 'razorpay',
    payment_method_title: 'UPI, Cards, NetBanking', first_item_id: 1, first_note_id: 1,
    plugins: [
      { plugin: 'woocommerce/woocommerce.php', name: 'WooCommerce', version: '10.6.2', url: 'https://woocommerce.com/',
        author_name: 'Automattic', updates: [] },
      { plugin: 'woo-razorpay/woo-razorpay.php', name: '1 Razorpay', version: '4.8.6', url: 'https://razorpay.com',
        author_name: 'Team Razorpay', updates: [] },
    ],
    // The store's code, plugins included, lives in one GitHub repository, and each push to main deploys it, so a
    // plugin update is a deploy too (e1/store.mjs adds one per update). These are the baseline's own: theme and
    // content changes that move no plugin version, at store times (IST).
    deployer: 'merch-store-ops', first_deploy_id: 1840000101,
    deploys: [
      ['2026-11-04T16:10:00', 'Theme: tighten the product grid spacing on mobile'],
      ['2026-11-12T11:45:00', 'Theme: add a size guide link to apparel pages'],
      ['2026-11-20T18:30:00', 'Theme: sale-week banner and countdown'],
      ['2026-11-23T00:05:00', 'Content: home page shows the sale-week collection'],
      ['2026-11-27T15:20:00', 'Theme: fix the cart drawer overlapping the header on small screens'],
      ['2026-12-01T10:00:00', 'Content: take down the sale-week banner'],
      ['2026-12-08T12:30:00', 'Theme: footer newsletter form copy'],
    ].map(([at, description]) => ({ at, description })),
  },
  // Guest checkout: each order's billing name, email and phone come from customerFor.
  customers: {
    first: ['Aarav', 'Ananya', 'Arjun', 'Diya', 'Ishaan', 'Kavya', 'Rohan', 'Meera', 'Vikram', 'Sneha', 'Aditya', 'Priya',
      'Karan', 'Neha', 'Rahul', 'Pooja', 'Siddharth', 'Ritika', 'Varun', 'Tanvi'],
    last: ['Sharma', 'Iyer', 'Patel', 'Reddy', 'Nair', 'Gupta', 'Menon', 'Singh', 'Rao', 'Joshi', 'Das', 'Kulkarni',
      'Mehta', 'Pillai', 'Chatterjee', 'Bose', 'Verma', 'Shetty', 'Agarwal', 'Kapoor'],
  },
  // The notes an order gets, in the order they are written: WooCommerce's own status-change note, and the
  // Razorpay plugin's (woo-razorpay.php updateOrder() at 4.8.8, d8138d7). {payment_id} is the Razorpay payment id.
  order_notes: {
    processing: ['Order status changed from Pending payment to Processing.', 'Razorpay payment successful <br/>Razorpay Id: {payment_id}'],
    failed: ['Payment Failed. Please check Razorpay Dashboard. <br/> Razorpay Id: {payment_id}', 'Transaction Failed: The payment has failed.<br/>',
      'Order status changed from Pending payment to Failed.'],
  },
  causes: {
    // razorpay-woocommerce issue #670: on 4.8.8 with Payment Action "Authorize", payments stay authorized, and an
    // order whose payment reaches the store only through the webhook is marked Failed by the webhook's cron job; an
    // order the browser callback reaches is marked paid. webhook_only_pct: the share of payments, by method, whose
    // customer never comes back to the browser (a UPI app most often leaves it behind). The merchant captures the
    // paid orders from the dashboard when packing them; the Failed ones are never packed, so Razorpay refunds them
    // when the capture window ends.
    plugin_670: { plugin_version: '4.8.8', payment_action: 'authorize',
      webhook_only_pct: [['upi', 55], ['card', 25], ['netbanking', 35], ['wallet', 35]],
      cron_s: [60, 600], merchant_capture_s: [7200, 93600] },
  },
  order_spread_sigma: 0.6, // lognormal spread of order sizes within a day
  device: [['mobile', 80], ['desktop', 17], ['tablet', 3]],
  method: [['upi', 70], ['card', 20], ['netbanking', 6], ['wallet', 4]],
  // Relative orders per IST hour, 00 to 23.
  hours: [2, 1, 1, 0.5, 0.5, 0.8, 1.5, 2.5, 3.5, 4.5, 5, 5.5, 6, 6, 5.5, 5.5, 5.5, 6, 6.5, 7, 8, 8.5, 7, 4.5],
  catalog: [
    ['MS-0101', 'Sticker pack', 29900], ['MS-0102', 'Enamel pin', 39900], ['MS-0103', 'Ceramic mug', 49900],
    ['MS-0104', 'Crew socks', 59900], ['MS-0105', 'Keychain set', 69900], ['MS-0106', 'Dotted notebook', 79900],
    ['MS-0107', 'Steel bottle', 99900], ['MS-0108', 'Canvas tote', 119900], ['MS-0109', 'Baseball cap', 129900],
    ['MS-0110', 'Classic tee', 149900], ['MS-0111', 'Long-sleeve tee', 159900], ['MS-0112', 'Laptop sleeve', 179900],
    ['MS-0113', 'Desk lamp', 199900], ['MS-0114', 'Polo shirt', 229900], ['MS-0115', 'Sling bag', 249900],
    ['MS-0116', 'Hoodie', 299900], ['MS-0117', 'Fleece vest', 349900], ['MS-0118', 'Backpack', 399900],
    ['MS-0119', 'Rain jacket', 449900], ['MS-0120', 'Bluetooth speaker', 499900],
  ].map(([sku, name, price_paise]) => ({ sku, name, price_paise })),
});

const sha256 = text => createHash('sha256').update(text).digest();

// sfc32, seeded from SHA-256 of (world version, seed).
export function seededRandom(...parts) {
  const h = sha256(parts.map(String).join('|'));
  let [a, b, c, d] = [0, 4, 8, 12].map(i => h.readUInt32LE(i));
  return () => {
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0; a = b ^ (b >>> 9); b = (c + (c << 3)) | 0; c = (c << 21) | (c >>> 11); c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}
const weighted = (rng, pairs) => {
  let r = rng() * pairs.reduce((sum, [, w]) => sum + w, 0);
  for (const [value, w] of pairs) if ((r -= w) < 0) return value;
  return pairs.at(-1)[0];
};
const normal = rng => Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
// Razorpay ids are a prefix + 14 base62 characters (section 3); ours are hash(world version, seed, prefix, index).
export function razorpayId(versionId, seed, index, prefix = 'pay') {
  let n = BigInt(`0x${sha256(`${versionId}|${seed}|${prefix}|${index}`).toString('hex')}`), out = '';
  for (let i = 0; i < 14; i++) { out += BASE62[Number(n % 62n)]; n /= 62n; }
  return `${prefix}_${out}`;
}

// WooCommerce's dates: ISO 8601 to the second with no offset, in the site's time (IST here) or, for `_gmt`
// fields, UTC. fromStoreTime reads either back to unix seconds, or NaN for anything that is not that form.
const STAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
export const storeTime = (unix, offset = WORLD_VERSION.utc_offset_s) => new Date((unix + offset) * 1000).toISOString().slice(0, 19);
export function fromStoreTime(text, offset = WORLD_VERSION.utc_offset_s) {
  const t = STAMP.test(text) ? Date.parse(`${text}Z`) / 1000 : NaN;
  return Number.isInteger(t) && storeTime(t, 0) === text ? t - offset : NaN;
}

// A guest's billing details, from hash(world version, seed, order index), so ticket 05's messages can write as
// the same customer. Phones are 10 digits starting 6-9, as Indian mobiles are; emails use example.com and end in
// the order index, so no two orders share one and a message's address names one order.
export function customerFor(version, seed, index) {
  const h = sha256(`${version.id}|${seed}|customer|${index}`);
  const { first, last } = version.customers;
  const first_name = first[h[0] % first.length], last_name = last[h[1] % last.length];
  return { first_name, last_name, email: `${first_name}.${last_name}${index + 1}@example.com`.toLowerCase(),
    phone: `${6 + (h[3] % 4)}${String(h.readUInt32LE(4) % 1e9).padStart(9, '0')}` };
}

// GA4 date (YYYY-MM-DD) to its 2026 date and the unix second its IST day starts.
export function shiftDay(ga4Day, version = WORLD_VERSION) {
  const utc = Date.parse(`${ga4Day}T00:00:00Z`) / 1000 + version.shift_days * DAY;
  return { date: new Date(utc * 1000).toISOString().slice(0, 10), start: utc - version.utc_offset_s };
}

// One GA4 day's revenue and order count: revenue summed across device and medium rows in whole cents, then paise
// at the version's rate, rounded once per day.
export function ga4Days(rows = loadDaily(), version = WORLD_VERSION) {
  const byDay = new Map();
  for (const row of rows) {
    if (row.day < version.ga4.from || row.day > version.ga4.to) continue;
    const funnel = Object.entries(version.ga4.funnel);
    const day = byDay.get(row.day) ?? { ga4_day: row.day, cents: 0, orders: 0, funnel: Object.fromEntries(funnel.map(([m]) => [m, 0])) };
    day.cents += Math.round(row[version.ga4.revenue] * 100);
    day.orders += row[version.ga4.orders];
    for (const [metric, column] of funnel) day.funnel[metric] += row[column];
    byDay.set(row.day, day);
  }
  const days = [...byDay.values()].sort((x, y) => x.ga4_day.localeCompare(y.ga4_day));
  const span = (Date.parse(version.ga4.to) - Date.parse(version.ga4.from)) / 86400000 + 1;
  requireThat(days.length === span, `ga4 world: expected ${span} days, found ${days.length}`);
  return days.map(day => {
    requireThat(day.orders > 0 && day.cents > 0, `ga4 world: ${day.ga4_day} has no orders or no revenue`);
    return { ...day, ...shiftDay(day.ga4_day, version), revenue_paise: Math.round(day.cents * version.usd_inr_paise / 100) };
  });
}

// Split total paise into n parts by weight; floors plus largest remainders, so the parts sum to the total exactly.
export function splitPaise(total, weights) {
  const sum = weights.reduce((s, w) => s + w, 0);
  const shares = weights.map((w, i) => ({ i, exact: total * w / sum }));
  const parts = shares.map(s => Math.floor(s.exact));
  let left = total - parts.reduce((s, p) => s + p, 0);
  for (const s of [...shares].sort((x, y) => (y.exact % 1) - (x.exact % 1) || x.i - y.i)) {
    if (left-- <= 0) break;
    parts[s.i] += 1;
  }
  return parts;
}

// Catalog items until their list prices reach the order total; the overshoot is the order's discount.
function basket(rng, total, catalog) {
  const counts = new Map();
  let remaining = total;
  while (remaining > 0) {
    const fits = catalog.filter(item => item.price_paise <= remaining);
    const item = fits.length ? fits[Math.floor(rng() * fits.length)] : catalog.find(c => c.price_paise >= remaining);
    counts.set(item.sku, (counts.get(item.sku) ?? 0) + 1);
    remaining -= item.price_paise;
  }
  const items = catalog.filter(c => counts.has(c.sku)).map(c => ({ sku: c.sku, quantity: counts.get(c.sku),
    price_paise: c.price_paise }));
  const subtotal = items.reduce((s, it) => s + it.quantity * it.price_paise, 0);
  return { items, subtotal_paise: subtotal, discount_paise: subtotal - total };
}

export function buildWorld({ seed, version = WORLD_VERSION, rows } = {}) {
  requireThat(seed !== undefined && seed !== null && String(seed) !== '', 'ga4 world: a seed is required');
  const rng = seededRandom(version.id, seed);
  const days = ga4Days(rows, version);
  const hourWeights = version.hours.map((w, h) => [h, w]);
  const drafts = [];
  for (const day of days) {
    const totals = splitPaise(day.revenue_paise,
      Array.from({ length: day.orders }, () => Math.exp(version.order_spread_sigma * normal(rng))));
    const dayOrders = totals.map(total => ({
      created_at: day.start + weighted(rng, hourWeights) * 3600 + Math.floor(rng() * 3600),
      total_paise: total, device: weighted(rng, version.device), method: weighted(rng, version.method),
      pay_s: 20 + Math.floor(rng() * 100), capture_s: 1 + Math.floor(rng() * 5),
      ...basket(rng, total, version.catalog),
    }));
    drafts.push(...dayOrders.sort((x, y) => x.created_at - y.created_at)); // stable: ties keep draw order
  }
  // The WooCommerce order is placed first; its Razorpay payment follows and is auto-captured seconds later, when the
  // browser callback marks the order paid.
  const orders = drafts.map(({ pay_s, capture_s, method, ...o }, index) => {
    const payment = { id: razorpayId(version.id, seed, index), order_id: razorpayId(version.id, seed, index, 'order'), method,
      amount_paise: o.total_paise, status: 'captured', created_at: o.created_at + pay_s, captured_at: o.created_at + pay_s + capture_s };
    const paid_at = payment.captured_at;
    return { index, woo_id: version.first_order_id + index, ...o, status: 'processing', paid_at,
      notes: orderNotes(version, 'processing', payment.id, paid_at), payment };
  });
  const starts_at = days[0].start, ends_at = days.at(-1).start + DAY;
  const dayRecords = days.map(({ ga4_day, date, start, revenue_paise, orders: n, funnel }) => ({ ga4_day, date, start, revenue_paise, orders: n, funnel }));
  const saleStart = Date.parse(`${version.sale.from}T00:00:00Z`) / 1000 - version.utc_offset_s;
  const saleEnd = Date.parse(`${version.sale.to}T00:00:00Z`) / 1000 - version.utc_offset_s + DAY;
  return {
    version, seed: String(seed), starts_at, ends_at,
    days: dayRecords,
    orders, catalog: version.catalog,
    calendar: [{ kind: 'sale', name: version.sale.name, starts_at: saleStart, ends_at: saleEnd }],
    // A case's cause and decoy records (e1/case.mjs), and customer messages (ticket 05d); a baseline has neither.
    injection: null, messages: [],
    hash: worldHash({ version, seed: String(seed), days: dayRecords, injection: null, orders, messages: [] }),
  };
}

// The order notes of one outcome, all written at `at`.
export const orderNotes = (version, outcome, paymentId, at) =>
  version.order_notes[outcome].map(text => ({ created_at: at, note: text.replace('{payment_id}', paymentId) }));

// Covers everything a case is built from and everything it holds (ADR 0001), so a changed injection is a new hash.
// `days` holds GA4's daily counts, which ga4_run_report serves; the rest of the world derives from these fields.
export const worldHash = ({ version, seed, days, injection, orders, messages }) =>
  sha256(canonicalJson({ version, seed, days, injection, orders, messages })).toString('hex');

// Every hour that can become the frozen "now": the trigger's week-earlier window must lie inside GA4's days, and
// 7 full GA4 days must follow (F7). The last one is 7 Dec 2026 00:00 IST.
export function possibleNows(world) {
  const first = world.starts_at + world.version.trigger_lookback_days * DAY;
  const last = world.ends_at - world.version.future_days * DAY;
  requireThat(last >= first, 'ga4 world: too few GA4 days for a week before and 7 days after any "now"');
  return Array.from({ length: (last - first) / 3600 + 1 }, (_, h) => first + h * 3600);
}
