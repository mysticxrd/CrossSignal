import assert from 'node:assert/strict';
import test from 'node:test';
import { loadDaily } from '../db/benchmark/ga4-daily.mjs';
import { WORLD_VERSION, buildWorld, ga4Days, possibleNows, splitPaise } from '../e1/world.mjs';

const HOUR = 3600, DAY = 86400;
const rows = loadDaily();
const world = buildWorld({ seed: 'baseline', rows });

test('daily store revenue equals GA4 daily revenue in INR, to the paisa', () => {
  assert.equal(world.days.length, 42);
  assert.deepEqual([world.days[0].date, world.days.at(-1).date], ['2026-11-02', '2026-12-13']);
  // GA4 revenue is summed across device and medium rows; recompute it here from the raw rows.
  const cents = new Map();
  for (const r of rows) if (r.day >= '2020-11-02' && r.day <= '2020-12-13') cents.set(r.day, (cents.get(r.day) ?? 0) + Math.round(r.revenue_usd * 100));
  for (const day of world.days) {
    const inDay = world.orders.filter(o => o.created_at >= day.start && o.created_at < day.start + DAY);
    assert.equal(inDay.reduce((s, o) => s + o.total_paise, 0), cents.get(day.ga4_day) * 88, day.date);
    assert.equal(inDay.length, day.orders, `${day.date}: orders follow GA4 transactions 1:1`);
    // 313 whole weeks: the weekday never moves.
    assert.equal(new Date(`${day.date}T00:00:00Z`).getUTCDay(), new Date(`${day.ga4_day}T00:00:00Z`).getUTCDay());
  }
  assert.equal(world.orders.length, 3051);
  for (const o of world.orders) {
    assert.ok(o.total_paise > 0 && o.discount_paise >= 0);
    assert.equal(o.items.reduce((s, it) => s + it.quantity * it.price_paise, 0) - o.discount_paise, o.total_paise);
    assert.equal(o.payment.amount_paise, o.total_paise);
    assert.ok(o.created_at < o.payment.created_at && o.payment.created_at < o.payment.captured_at);
  }
});

test('the same world version and seed give the same world hash; a new seed or version changes it', () => {
  const again = buildWorld({ seed: 'baseline', rows });
  assert.equal(again.hash, world.hash);
  assert.match(world.hash, /^[0-9a-f]{64}$/);
  assert.notEqual(buildWorld({ seed: 'other', rows }).hash, world.hash);
  const rate = { ...WORLD_VERSION, usd_inr_paise: 8801 };
  assert.notEqual(buildWorld({ seed: 'baseline', rows, version: rate }).hash, world.hash);
  // GA4's funnel counts change no order, but ga4_run_report serves them, so they are part of the world.
  const busier = buildWorld({ seed: 'baseline', rows: rows.map(r => (r.day === '2020-11-02' ? { ...r, sessions: r.sessions + 1 } : r)) });
  assert.deepEqual(busier.orders, world.orders);
  assert.notEqual(busier.hash, world.hash, 'a changed session count is a new world');
  assert.throws(() => buildWorld({ rows }), /seed is required/);
});

test('every hour that can become "now" has 7 full GA4 days after it and a week before it', () => {
  const nows = possibleNows(world);
  // IST midnight 10 Nov to IST midnight 7 Dec, every hour.
  assert.equal(nows[0], Date.parse('2026-11-10T00:00:00+05:30') / 1000);
  assert.equal(nows.at(-1), Date.parse('2026-12-07T00:00:00+05:30') / 1000);
  assert.equal(nows.length, 27 * 24 + 1);
  const dayStarts = new Set(world.days.map(d => d.start));
  for (const now of nows) {
    assert.equal((now + WORLD_VERSION.utc_offset_s) % HOUR, 0, "on the hour, IST");
    let full = 0;
    for (let start = Math.ceil((now - world.starts_at) / DAY) * DAY + world.starts_at; dayStarts.has(start); start += DAY) full++;
    assert.ok(full >= 7, `${new Date(now * 1000).toISOString()} has ${full} future days`);
    assert.ok(now - 8 * DAY >= world.starts_at, 'the week-earlier window is real GA4 data');
  }
});

test('WooCommerce ids are sequential in time order; Razorpay ids are hash-derived', () => {
  world.orders.forEach((o, i) => {
    assert.equal(o.woo_id, 10001 + i);
    if (i) assert.ok(o.created_at >= world.orders[i - 1].created_at);
    assert.match(o.payment.id, /^pay_[0-9A-Za-z]{14}$/);
  });
  assert.equal(new Set(world.orders.map(o => o.payment.id)).size, world.orders.length);
  // The id depends on the seed, not only the position.
  assert.notEqual(buildWorld({ seed: 'other', rows }).orders[0].payment.id, world.orders[0].payment.id);
});

test('the catalog and the sale calendar travel with the world', () => {
  assert.equal(world.catalog.length, 20);
  const prices = world.catalog.map(c => c.price_paise).sort((a, b) => a - b);
  assert.ok((prices[9] + prices[10]) / 2 > 140000 && (prices[9] + prices[10]) / 2 < 160000, 'median near ₹1,500');
  assert.deepEqual(world.calendar, [{ kind: 'sale', name: 'Sale week',
    starts_at: Date.parse('2026-11-23T00:00:00+05:30') / 1000, ends_at: Date.parse('2026-12-01T00:00:00+05:30') / 1000 }]);
  assert.ok(Object.isFrozen(WORLD_VERSION.catalog[0]) && Object.isFrozen(WORLD_VERSION.hours));
  const mobile = world.orders.filter(o => o.device === 'mobile').length / world.orders.length;
  const upi = world.orders.filter(o => o.payment.method === 'upi').length / world.orders.length;
  assert.ok(mobile > 0.75 && mobile < 0.85 && upi > 0.65 && upi < 0.75);
});

test('splitPaise keeps the exact total and ga4Days refuses a missing day', () => {
  assert.deepEqual(splitPaise(10, [1, 1, 1]), [4, 3, 3]);
  assert.equal(splitPaise(421321, [0.3, 2.1, 1.7, 0.9]).reduce((a, b) => a + b, 0), 421321);
  assert.throws(() => ga4Days(rows.filter(r => r.day !== '2020-11-20')), /expected 42 days, found 41/);
});
