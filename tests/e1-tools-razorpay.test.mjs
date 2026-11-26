import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { openSimulator } from '../e1/simulator.mjs';
import { PAGE_ROWS, RESULT_BYTE_CAP, checkStrict, createToolset, resultBytes } from '../e1/tools/core.mjs';
import { scanForLeaks } from '../e1/tools/leaks.mjs';
import { RAZORPAY_TOOLS } from '../e1/tools/razorpay.mjs';
import { buildWorld, razorpayId, worldHash } from '../e1/world.mjs';

const docs = JSON.parse(readFileSync(new URL('./fixtures/razorpay-docs.json', import.meta.url), 'utf8'));
const toolset = createToolset(RAZORPAY_TOOLS);
const HOUR = 3600, DAY = 86400;
const NOW = Date.parse('2026-11-24T14:00:00+05:30') / 1000;
const seen = []; // every envelope any test is shown, for the leak check at the end

// A world with 45 refunds on payments from 10-12 Nov (every third one full, the rest half), plus one refund made
// after NOW: a stand-in for the causes ticket 05 adds. The hash is recomputed, as a cause's builder will do.
const world = buildWorld({ seed: 'tools-test' });
const refunded = world.orders.filter(o => o.created_at >= NOW - 14 * DAY && o.created_at < NOW - 12 * DAY).slice(0, 46);
refunded.forEach((order, i) => {
  const p = order.payment;
  p.refunds = [{ id: razorpayId(world.version.id, world.seed, i, 'rfnd'), amount_paise: i % 3 ? Math.floor(p.amount_paise / 2) : p.amount_paise,
    created_at: i === 45 ? NOW + HOUR : p.captured_at + DAY, status: 'processed', speed_requested: 'normal', speed_processed: 'normal' }];
});
world.hash = worldHash(world.version, world.seed, world.orders);

function open(now = NOW) {
  const clock = { now };
  const sim = openSimulator({ world, journal: join(mkdtempSync(join(tmpdir(), 'e1-tools-')), 'r_t.sim.jsonl'), clock: () => clock.now });
  const call = async (name, args) => {
    const envelope = await toolset.call(name, args, { backend: sim.backend });
    seen.push({ envelope, now: clock.now });
    return envelope;
  };
  return { sim, clock, call };
}
async function walk(call, name, args, between = () => {}) {
  const pages = [];
  let cursor = null;
  do {
    const envelope = await call(name, { ...args, cursor });
    pages.push(envelope);
    cursor = envelope.cursor;
    between(pages.length);
  } while (cursor);
  return pages;
}

const typeOf = v => (v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v);
function matchesDoc(record, fields, label) {
  for (const [key, value] of Object.entries(record)) {
    assert.ok(Object.hasOwn(fields, key), `${label}: ${key} is not a documented field`);
    assert.ok(fields[key].split('|').includes(typeOf(value)), `${label}.${key}: ${typeOf(value)} is not ${fields[key]}`);
  }
}

test('the six tools are registered with schemas that meet DeepSeek\'s strict rules', () => {
  assert.deepEqual(toolset.definitions.map(t => t.name), ['fetch_all_payments', 'fetch_payment', 'fetch_order_payments',
    'fetch_all_refunds', 'webhook_deliveries', 'capture_settings']);
  for (const { schema } of toolset.definitions) checkStrict(schema);
});

test('every response matches the fields and types of Razorpay\'s doc fixtures', async () => {
  const { sim, call } = open();
  const window = { from: NOW - 14 * DAY, to: NOW };
  const payments = await call('fetch_all_payments', { ...window, cursor: null });
  const refunds = await call('fetch_all_refunds', { ...window, cursor: null });
  const hooks = await call('webhook_deliveries', { ...window, cursor: null });
  const one = await call('fetch_payment', { payment_id: refunded[1].payment.id });
  const byOrder = await call('fetch_order_payments', { order_id: refunded[1].payment.order_id, cursor: null });
  const settings = await call('capture_settings', {});
  for (const [label, { result }] of Object.entries({ payments, refunds, hooks, byOrder })) {
    const { webhook, ...collection } = result;
    matchesDoc(collection, docs.collection.fields, label);
    assert.equal(collection.entity, 'collection');
    assert.equal(collection.count, collection.items.length, `${label}: count is this page's rows, never a total`);
    assert.ok(label === 'hooks' ? webhook : webhook === undefined);
  }
  for (const row of [...payments.result.items, ...byOrder.result.items, one.result]) {
    matchesDoc(row, docs.payment.fields, 'payment');
    for (const [key, values] of Object.entries(docs.payment.values)) if (key in row) assert.ok(values.includes(row[key]), `${key}: ${row[key]}`);
  }
  assert.ok(payments.result.items.every(row => Object.keys(row).length >= 8 && Object.keys(row).length <= 10), 'lists show 8-10 fields');
  assert.deepEqual(one.result, { id: refunded[1].payment.id, entity: 'payment', amount: refunded[1].payment.amount_paise, currency: 'INR',
    status: 'captured', order_id: refunded[1].payment.order_id, international: false, method: refunded[1].payment.method,
    amount_refunded: Math.floor(refunded[1].payment.amount_paise / 2), refund_status: 'partial', captured: true,
    created_at: refunded[1].payment.created_at }, 'the full entity minus empty fields');
  assert.equal((await call('fetch_payment', { payment_id: refunded[0].payment.id })).result.status, 'refunded');
  refunds.result.items.forEach(row => matchesDoc(row, docs.refund.fields, 'refund'));
  hooks.result.items.forEach(row => matchesDoc(row, docs.webhook_deliveries.fields, 'delivery'));
  hooks.result.items.forEach(row => assert.ok(docs.webhook_deliveries.values.event.includes(row.event)));
  matchesDoc(hooks.result.webhook, docs.webhook_deliveries.webhook_fields, 'webhook');
  matchesDoc(settings.result, docs.capture_settings.fields, 'capture settings');
  for (const [key, [min, max]] of Object.entries(docs.capture_settings.ranges)) assert.ok(settings.result[key] >= min && settings.result[key] <= max);
  // Our ids have the docs' form: a prefix and 14 base62 characters.
  for (const [doc, ours] of [[docs.payment.examples.id, one.result.id], [docs.payment.examples.order_id, one.result.order_id],
    [docs.refund.examples.id, refunds.result.items[0].id]]) {
    const form = new RegExp(`^${doc.split('_')[0]}_[0-9A-Za-z]{14}$`);
    assert.match(doc, form);
    assert.match(ours, form);
  }
  sim.close();
});

test('pagination returns every record once, in time order, even when "now" moves on between pages', async () => {
  const { sim, clock, call } = open();
  const from = NOW - 3 * DAY;
  const expected = world.orders.map(o => o.payment).filter(p => p.created_at >= from && p.created_at <= NOW)
    .sort((a, b) => a.created_at - b.created_at || (a.id < b.id ? -1 : 1)).map(p => p.id);
  const pages = await walk(call, 'fetch_all_payments', { from, to: NOW });
  assert.deepEqual(pages.flatMap(p => p.result.items.map(row => row.id)), expected);
  assert.ok(pages.length > expected.length / PAGE_ROWS, 'the cap made pages shorter than 20 rows');
  for (const page of pages) assert.ok(resultBytes(page) <= RESULT_BYTE_CAP);
  assert.equal(pages.at(-1).cursor, null);
  assert.match(pages.at(-1).note, /no more/);

  // A window running past "now": two hours pass mid-walk; old rows stay once each and the new ones follow.
  const later = await walk(call, 'fetch_all_payments', { from, to: NOW + DAY }, n => { if (n === 3) clock.now = NOW + 2 * HOUR; });
  const ids = later.flatMap(p => p.result.items.map(row => row.id));
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids.slice(0, expected.length), expected);
  assert.ok(ids.length > expected.length);

  // Refunds and deliveries page the same way; the refund made after NOW never shows.
  clock.now = NOW;
  const refundPages = await walk(call, 'fetch_all_refunds', { from: NOW - 30 * DAY, to: NOW + DAY });
  assert.deepEqual(refundPages.flatMap(p => p.result.items.map(row => row.id)).sort(),
    refunded.slice(0, 45).map(o => o.payment.refunds[0].id).sort());
  assert.ok(refundPages.length >= 3);
  const hookPages = await walk(call, 'webhook_deliveries', { from, to: NOW });
  const events = hookPages.flatMap(p => p.result.items.map(row => row.event_id));
  assert.equal(new Set(events).size, events.length);
  for (const row of hookPages.flatMap(p => p.result.items)) {
    assert.match(row.entity_id, row.event === 'order.paid' ? /^order_/ : /^pay_/, 'order.paid carries the order, as on Razorpay');
  }
  const inWindow = at => at !== undefined && at >= from && at <= NOW;
  const payments = world.orders.map(o => o.payment);
  assert.equal(events.length, payments.filter(p => inWindow(p.created_at)).length + payments.filter(p => inWindow(p.captured_at)).length,
    'one payment.authorized and one order.paid delivery for each payment');
  sim.close();
});

test('reads answer as of now: later payments do not exist and later captures have not happened', async () => {
  const p = refunded[2].payment;
  const { sim, clock, call } = open(p.created_at + 1);
  const byId = await call('fetch_payment', { payment_id: p.id });
  assert.equal(byId.result.status, 'authorized');
  assert.equal(byId.result.captured, false);
  assert.equal(byId.result.amount_refunded, 0);
  const next = refunded[3].payment;
  const missing = await call('fetch_payment', { payment_id: next.id });
  assert.deepEqual(missing.error, { code: 'BAD_REQUEST_ERROR', description: 'The id provided does not exist', field: 'payment_id' });
  assert.match(missing.note, /No payment pay_\w+ exists as of now .*fetch_all_payments/);
  const order = await call('fetch_order_payments', { order_id: next.order_id, cursor: null });
  assert.equal(order.error.field, 'order_id', 'the error names the argument of the tool');
  clock.now = p.captured_at;
  assert.equal((await call('fetch_payment', { payment_id: p.id })).result.status, 'captured');
  sim.close();
});

test('bad arguments return an error envelope whose note names the fix in the tool\'s own arguments', async () => {
  const { sim, call } = open();
  const first = await call('fetch_all_payments', { from: NOW - DAY, to: NOW, cursor: null });
  const cases = [
    ['fetch_all_payments', { from: NOW - DAY, cursor: null }, 'to', /to is missing. Call fetch_all_payments again/],
    ['fetch_all_payments', { from: String(NOW), to: NOW, cursor: null }, 'from', /from must be a whole number/],
    ['fetch_all_payments', { from: NOW * 1000, to: NOW, cursor: null }, 'from', /from must be from 946684800 to 4765046400/],
    ['fetch_all_payments', { from: NOW, to: NOW - DAY, cursor: null }, 'from', /from \(2026-11-24 14:00:00 IST\) is after to/],
    ['fetch_all_payments', { from: NOW - DAY, to: NOW - 1, cursor: first.cursor }, 'cursor', /cursor null/],
    ['fetch_payment', { payment_id: 'pay_123' }, 'payment_id', /payment_id must match/],
    ['fetch_order_payments', { order_id: 'order_AAAAAAAAAAAAAA', cursor: 7 }, 'cursor', /a string or null/],
    ['capture_settings', { at: NOW }, undefined, /Its arguments are: none/],
    ['refund_payment', {}, undefined, /no such tool/],
  ];
  for (const [name, args, field, pattern] of cases) {
    const envelope = await call(name, args);
    assert.equal(envelope.result, undefined, name);
    assert.equal(envelope.error.code, 'BAD_REQUEST_ERROR');
    assert.equal(envelope.error.field, field);
    assert.match(envelope.note, pattern);
  }
  const future = await call('fetch_all_payments', { from: NOW + HOUR, to: NOW + DAY, cursor: null });
  assert.deepEqual(future.result, { entity: 'collection', count: 0, items: [] }, 'the real empty shape');
  assert.match(future.note, /starts after now \(2026-11-24 14:00:00 IST\)/);
  assert.match(first.note, /^Window 2026-11-23 14:00:00 to 2026-11-24 14:00:00 IST; now is 2026-11-24 14:00:00 IST/, 'the window is echoed in IST');
  sim.close();
});

test('the leak scanner passes on every response the tests above were shown', () => {
  assert.ok(seen.length > 40);
  for (const { envelope, now } of seen) {
    assert.ok(typeof envelope.note === 'string' && ('result' in envelope) !== ('error' in envelope));
    assert.deepEqual(scanForLeaks(envelope, { now }), []);
  }
});
