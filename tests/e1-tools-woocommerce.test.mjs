import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { openSimulator } from '../e1/simulator.mjs';
import { RESULT_BYTE_CAP, checkStrict, createToolset, resultBytes } from '../e1/tools/core.mjs';
import { scanForLeaks } from '../e1/tools/leaks.mjs';
import { RAZORPAY_TOOLS } from '../e1/tools/razorpay.mjs';
import { WOOCOMMERCE_TOOLS } from '../e1/tools/woocommerce.mjs';
import { WORLD_VERSION, buildWorld, customerFor, fromStoreTime, storeTime, worldHash } from '../e1/world.mjs';

const docs = JSON.parse(readFileSync(new URL('./fixtures/woocommerce-docs.json', import.meta.url), 'utf8'));
const toolset = createToolset([...RAZORPAY_TOOLS, ...WOOCOMMERCE_TOOLS]);
const HOUR = 3600, DAY = 86400;
const NOW = Date.parse('2026-11-24T14:00:00+05:30') / 1000;
const at = unix => storeTime(unix);
const seen = []; // every envelope any test is shown, for the leak check at the end

// One order is placed a minute before NOW and paid a minute after it, so it is pending at NOW; and a Razorpay plugin
// update is scheduled an hour after NOW. Both stand in for what ticket 05's causes add; the hash is recomputed.
const world = buildWorld({ seed: 'wc-tools-test', version: { ...WORLD_VERSION, store: { ...WORLD_VERSION.store,
  plugins: WORLD_VERSION.store.plugins.map(p => (p.plugin.startsWith('woo-razorpay') ? { ...p, updates: [{ at: NOW + HOUR, version: '4.8.8' }] } : p)) } } });
const lastBefore = world.orders.findLast(o => o.created_at < NOW - 60);
Object.assign(lastBefore, { created_at: NOW - 60, paid_at: NOW + 60 });
Object.assign(lastBefore.payment, { created_at: NOW + 50, captured_at: NOW + 60 });
world.hash = worldHash(world);

function open(now = NOW, w = world) {
  const clock = { now };
  const sim = openSimulator({ world: w, journal: join(mkdtempSync(join(tmpdir(), 'e1-wc-')), 'r_t.sim.jsonl'), clock: () => clock.now });
  const call = async (name, args) => {
    const envelope = await toolset.call(name, args, { backend: sim.backend });
    seen.push({ envelope, now: clock.now });
    return envelope;
  };
  return { sim, clock, call };
}
async function walk(call, args, between = () => {}) {
  const pages = [];
  let cursor = null;
  do {
    pages.push(await call('wc_list_orders', { ...args, cursor }));
    cursor = pages.at(-1).cursor;
    between(pages.length);
  } while (cursor);
  return pages;
}

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
const typeOf = v => (v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v);
function matchesDoc(record, fields, label) {
  for (const [key, value] of Object.entries(record)) {
    assert.ok(Object.hasOwn(fields, key), `${label}: ${key} is not a documented field`);
    const types = fields[key].split('|');
    const ok = types.includes(typeOf(value)) || (types.includes('date-time') && ISO.test(value)) || (types.includes('number') && typeof value === 'number');
    assert.ok(ok, `${label}.${key}: ${JSON.stringify(value)} is not ${fields[key]}`);
  }
}
const visible = (from, to, now = NOW) => world.orders.filter(o => o.created_at >= from && o.created_at <= Math.min(to, now));

test('the three tools are registered beside the Razorpay ones, with strict schemas', () => {
  assert.deepEqual(toolset.definitions.slice(6).map(t => t.name), ['wc_list_orders', 'wc_get_order', 'wc_system_status']);
  for (const { schema } of toolset.definitions) checkStrict(schema);
});

test('every response matches the fields and types of the WooCommerce doc fixtures', async () => {
  const { sim, call } = open();
  const list = await call('wc_list_orders', { after: at(NOW - DAY), before: at(NOW), cursor: null });
  assert.ok(Array.isArray(list.result), 'the body is a bare array, as WooCommerce answers');
  for (const row of list.result) {
    matchesDoc(row, docs.order.fields, 'row');
    matchesDoc(row.billing, docs.order.billing_fields, 'row.billing');
    assert.ok(docs.order.values.status.includes(row.status));
    assert.equal(Object.keys(row).length, 8, 'lists show 8 fields');
  }
  const paid = list.result[0];
  const { result: { order, notes } } = await call('wc_get_order', { order_id: paid.id });
  matchesDoc(order, docs.order.fields, 'order');
  matchesDoc(order.billing, docs.order.billing_fields, 'billing');
  order.line_items.forEach(item => matchesDoc(item, docs.order.line_item_fields, 'line item'));
  const source = world.orders.find(o => o.woo_id === paid.id);
  assert.equal(order.total, (source.total_paise / 100).toFixed(2));
  assert.equal(order.line_items.reduce((sum, item) => sum + Math.round(Number(item.total) * 100), 0), source.total_paise, 'lines add up to the total');
  assert.equal(order.transaction_id, source.payment.id);
  assert.equal(fromStoreTime(order.date_created), source.created_at);
  assert.equal(fromStoreTime(order.date_created_gmt, 0), source.created_at);
  assert.deepEqual(order.billing, { ...customerFor(world.version, world.seed, source.index), country: 'IN' });
  notes.forEach(n => matchesDoc(n, docs.order_note.fields, 'note'));
  const texts = docs.order_note.texts;
  assert.deepEqual(notes.map(n => n.note), [
    texts.razorpay_order.replace('$razorpayOrderId', source.payment.order_id),
    texts.status_change.replace('%1$s', texts.status_names.pending).replace('%2$s', texts.status_names.processing),
    texts.razorpay_success.replace('$razorpayPaymentId', source.payment.id),
  ], 'the notes WooCommerce and the plugin write, in the order they write them');
  assert.ok(notes[0].id < notes[1].id && notes[1].id < notes[2].id);

  const { result: status } = await call('wc_system_status', {});
  matchesDoc(status, docs.system_status.fields, 'system status');
  matchesDoc(status.environment, docs.system_status.environment_fields, 'environment');
  matchesDoc(status.settings, docs.system_status.settings_fields, 'settings');
  status.active_plugins.forEach(p => matchesDoc(p, docs.system_status.plugin_fields, 'plugin'));
  assert.equal(status.environment.version, status.active_plugins.find(p => p.plugin === docs.system_status.examples.plugin).version);
  sim.close();
});

test('X-WP-Total is given and counts only what exists as of now; Razorpay lists give no total', async () => {
  const { sim, clock, call } = open();
  const window = { after: at(NOW - DAY), before: at(NOW + 2 * DAY) };
  const first = await call('wc_list_orders', { ...window, cursor: null });
  assert.equal(first.headers['X-WP-Total'], visible(NOW - DAY, NOW + 2 * DAY).length, 'orders after now are not counted');
  assert.deepEqual(Object.keys(first.headers), ['X-WP-Total'], 'X-WP-TotalPages is left out: the cap makes pages uneven');
  clock.now = NOW + 6 * HOUR;
  const later = await call('wc_list_orders', { ...window, cursor: null });
  assert.equal(later.headers['X-WP-Total'], visible(NOW - DAY, NOW + 2 * DAY, NOW + 6 * HOUR).length);
  assert.ok(later.headers['X-WP-Total'] > first.headers['X-WP-Total']);
  const statuses = async () => (await walk(call, { after: at(NOW - HOUR), before: at(NOW) })).flatMap(p => p.result.map(r => [r.id, r.status]));
  assert.ok((await statuses()).every(([, status]) => status === 'processing'), 'every order placed by then is paid');
  clock.now = NOW;
  assert.deepEqual((await statuses()).filter(([, status]) => status === 'pending'), [[lastBefore.woo_id, 'pending']],
    'the order paid after now is still pending');
  const razorpay = await call('fetch_all_payments', { from: NOW - DAY, to: NOW, cursor: null });
  assert.equal(razorpay.headers, undefined);
  assert.equal(JSON.stringify(razorpay).includes('X-WP'), false);
  sim.close();
});

test('pagination returns every order once, oldest first, each page under the cap, as now moves on', async () => {
  const { sim, clock, call } = open();
  const expected = visible(NOW - 2 * DAY, NOW).map(o => o.woo_id);
  const pages = await walk(call, { after: at(NOW - 2 * DAY), before: at(NOW) });
  assert.deepEqual(pages.flatMap(p => p.result.map(row => row.id)), expected);
  assert.ok(pages.every(p => resultBytes(p) <= RESULT_BYTE_CAP && p.headers['X-WP-Total'] === expected.length));
  assert.ok(pages.length > expected.length / 20, 'the cap made pages shorter than 20 rows');
  assert.match(pages.at(-1).note, /no more/);
  const later = await walk(call, { after: at(NOW - 2 * DAY), before: at(NOW + DAY) }, n => { if (n === 2) clock.now = NOW + 3 * HOUR; });
  const ids = later.flatMap(p => p.result.map(row => row.id));
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids.slice(0, expected.length), expected);
  assert.ok(ids.length > expected.length, 'orders placed while paging follow the old ones');
  sim.close();
});

test('reads answer as of now: a later order does not exist, an unpaid one has no payment, a later update has not happened', async () => {
  const { sim, clock, call } = open();
  const next = world.orders.find(o => o.created_at > NOW);
  const missing = await call('wc_get_order', { order_id: next.woo_id });
  assert.deepEqual(missing.error, { code: 'woocommerce_rest_shop_order_invalid_id', message: 'Invalid ID.', data: { status: 404 } });
  assert.match(missing.note, new RegExp(`No order ${next.woo_id} exists as of now .*wc_list_orders`));
  const { result: { order, notes } } = await call('wc_get_order', { order_id: lastBefore.woo_id });
  assert.equal(order.status, 'pending');
  for (const field of ['date_paid', 'date_paid_gmt', 'transaction_id']) assert.equal(field in order, false, `${field} is left out while empty`);
  assert.deepEqual(notes.map(n => n.note), [`Razorpay OrderId: ${lastBefore.payment.order_id}`]);
  const razorpay = async () => (await call('wc_system_status', {})).result.active_plugins.find(p => p.plugin.startsWith('woo-razorpay')).version;
  assert.equal(await razorpay(), '4.8.6');
  clock.now = NOW + HOUR;
  assert.equal(await razorpay(), '4.8.8');
  assert.equal((await call('wc_get_order', { order_id: lastBefore.woo_id })).result.notes.length, 3);
  sim.close();
});

test('bad arguments return an error envelope whose note names the fix in the tool\'s own arguments', async () => {
  const { sim, call } = open();
  const cases = [
    [{ after: '2026-11-24', before: at(NOW), cursor: null }, 'after', /after must be a real date in store time \(IST\) as YYYY-MM-DDTHH:MM:SS/],
    [{ after: '2026-02-30T00:00:00', before: at(NOW), cursor: null }, 'after', /Call wc_list_orders again with after in that form/],
    [{ after: at(NOW), before: at(NOW - DAY), cursor: null }, 'after', /after \(2026-11-24 14:00:00 IST\) is after before .* with after at or before before/],
  ];
  for (const [args, field, pattern] of cases) {
    const envelope = await call('wc_list_orders', args);
    assert.equal(envelope.error.field, field);
    assert.match(envelope.note, pattern);
  }
  assert.match((await call('wc_get_order', { order_id: '10001' })).note, /order_id must be a whole number/);
  const future = await call('wc_list_orders', { after: at(NOW + HOUR), before: at(NOW + DAY), cursor: null });
  assert.deepEqual([future.result, future.headers], [[], { 'X-WP-Total': 0 }], 'the real empty shape');
  assert.match(future.note, /starts after now .* Call again with after at or before now/);
  sim.close();
});

test('an order holding all 20 catalog items, every note included, fits the cap', async () => {
  const big = buildWorld({ seed: 'wc-tools-big' });
  const order = big.orders.findLast(o => o.created_at < NOW);
  order.items = big.catalog.map(c => ({ sku: c.sku, quantity: 99, price_paise: c.price_paise }));
  order.subtotal_paise = order.items.reduce((sum, item) => sum + item.quantity * item.price_paise, 0);
  Object.assign(order, { total_paise: order.subtotal_paise - 9999999, discount_paise: 9999999 });
  big.hash = worldHash(big);
  const { sim, call } = open(NOW, big);
  const envelope = await call('wc_get_order', { order_id: order.woo_id });
  assert.equal(envelope.result.order.line_items.length, 20);
  assert.equal(envelope.result.notes.length, 3);
  assert.ok(resultBytes(envelope) <= RESULT_BYTE_CAP, `${resultBytes(envelope)} bytes`);
  sim.close();
});

test('the leak scanner reads WooCommerce dates and passes on every response the tests above were shown', () => {
  assert.deepEqual(scanForLeaks({ date_created: at(NOW), date_created_gmt: storeTime(NOW, 0) }, { now: NOW }), []);
  assert.equal(scanForLeaks({ date_paid: at(NOW + 1) }, { now: NOW }).length, 1);
  assert.equal(scanForLeaks({ notes: [{ date_created_gmt: storeTime(NOW + 1, 0) }] }, { now: NOW }).length, 1);
  assert.equal(scanForLeaks({ date_paid: 'soon' }, { now: NOW }).length, 1);
  assert.ok(seen.length > 40);
  for (const { envelope, now } of seen) {
    assert.ok(typeof envelope.note === 'string' && ('result' in envelope) !== ('error' in envelope));
    assert.deepEqual(scanForLeaks(envelope, { now }), []);
  }
});

test('a customer\'s billing details are fixed by the world version, seed and order', () => {
  const a = customerFor(WORLD_VERSION, 's', 7);
  assert.deepEqual(a, customerFor(WORLD_VERSION, 's', 7));
  assert.notDeepEqual(a, customerFor(WORLD_VERSION, 's', 8));
  assert.match(a.phone, /^[6-9]\d{9}$/);
  assert.match(a.email, /^[a-z]+\.[a-z]+8@example\.com$/);
  // No two orders share an email, so a customer's message names one order (ticket 05).
  const emails = world.orders.map(o => customerFor(world.version, world.seed, o.index).email);
  assert.equal(new Set(emails).size, emails.length);
});
