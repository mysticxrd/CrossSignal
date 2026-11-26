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
  id: 'e1-world-1',
  ga4: { from: '2020-11-02', to: '2020-12-13', orders: 'transaction_ids', revenue: 'revenue_usd' },
  shift_days: 2191, // 313 weeks: 2 Nov 2020 (Mon) becomes 2 Nov 2026 (Mon)
  utc_offset_s: 19800, // the merchant's clock is IST; each GA4 day is one IST calendar day
  usd_inr_paise: 8800, // one fixed round rate, ₹88.00 a US dollar, not a market quote
  future_days: 7, // F7: every possible "now" has 7 full GA4 days after it
  trigger_lookback_days: 8, // ADR 0008: trailing 24 h against the same 24 h 7 days earlier
  sale: { name: 'Sale week', from: '2026-11-23', to: '2026-11-30' },
  first_order_id: 10001,
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
// Razorpay ids are `pay_` + 14 base62 characters (section 3); ours are hash(world version, seed, order index).
export function razorpayId(versionId, seed, index) {
  let n = BigInt(`0x${sha256(`${versionId}|${seed}|${index}`).toString('hex')}`), out = '';
  for (let i = 0; i < 14; i++) { out += BASE62[Number(n % 62n)]; n /= 62n; }
  return `pay_${out}`;
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
    const day = byDay.get(row.day) ?? { ga4_day: row.day, cents: 0, orders: 0 };
    day.cents += Math.round(row[version.ga4.revenue] * 100);
    day.orders += row[version.ga4.orders];
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
  // The WooCommerce order is placed first; its Razorpay payment follows and is auto-captured seconds later.
  const orders = drafts.map(({ pay_s, capture_s, method, ...o }, index) => ({
    index, woo_id: version.first_order_id + index, ...o, paid_at: o.created_at + pay_s + capture_s,
    payment: { id: razorpayId(version.id, seed, index), method, amount_paise: o.total_paise, status: 'captured',
      created_at: o.created_at + pay_s, captured_at: o.created_at + pay_s + capture_s },
  }));
  const starts_at = days[0].start, ends_at = days.at(-1).start + DAY;
  const saleStart = Date.parse(`${version.sale.from}T00:00:00Z`) / 1000 - version.utc_offset_s;
  const saleEnd = Date.parse(`${version.sale.to}T00:00:00Z`) / 1000 - version.utc_offset_s + DAY;
  return {
    version, seed: String(seed), starts_at, ends_at,
    days: days.map(({ ga4_day, date, start, revenue_paise, orders: n }) => ({ ga4_day, date, start, revenue_paise, orders: n })),
    orders, catalog: version.catalog,
    calendar: [{ kind: 'sale', name: version.sale.name, starts_at: saleStart, ends_at: saleEnd }],
    hash: worldHash(version, String(seed), orders),
  };
}

export const worldHash = (version, seed, orders) =>
  sha256(canonicalJson({ version, seed, orders })).toString('hex');

// Every hour that can become the frozen "now": the trigger's week-earlier window must lie inside GA4's days, and
// 7 full GA4 days must follow (F7). The last one is 7 Dec 2026 00:00 IST.
export function possibleNows(world) {
  const first = world.starts_at + world.version.trigger_lookback_days * DAY;
  const last = world.ends_at - world.version.future_days * DAY;
  requireThat(last >= first, 'ga4 world: too few GA4 days for a week before and 7 days after any "now"');
  return Array.from({ length: (last - first) / 3600 + 1 }, (_, h) => first + h * 3600);
}
