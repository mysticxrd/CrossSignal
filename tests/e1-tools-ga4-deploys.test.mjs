import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildCase } from '../e1/case.mjs';
import { openSimulator } from '../e1/simulator.mjs';
import { storeRevenue } from '../e1/trigger.mjs';
import { RESULT_BYTE_CAP, checkStrict, createToolset, resultBytes } from '../e1/tools/core.mjs';
import { GA4_TOOLS, resolveDay } from '../e1/tools/ga4.mjs';
import { GITHUB_TOOLS } from '../e1/tools/github.mjs';
import { scanForLeaks } from '../e1/tools/leaks.mjs';
import { RAZORPAY_TOOLS } from '../e1/tools/razorpay.mjs';
import { WOOCOMMERCE_TOOLS } from '../e1/tools/woocommerce.mjs';
import { WORLD_VERSION, buildWorld, fromStoreTime, storeTime } from '../e1/world.mjs';

const ga4Docs = JSON.parse(readFileSync(new URL('./fixtures/ga4-docs.json', import.meta.url), 'utf8'));
const githubDocs = JSON.parse(readFileSync(new URL('./fixtures/github-docs.json', import.meta.url), 'utf8'));
const toolset = createToolset([...RAZORPAY_TOOLS, ...WOOCOMMERCE_TOOLS, ...GA4_TOOLS, ...GITHUB_TOOLS]);
const HOUR = 3600, DAY = 86400;
const NOW = Date.parse('2026-11-24T14:00:00+05:30') / 1000;
const START_670 = Date.parse('2026-11-18T10:00:00+05:30') / 1000;
const world = buildWorld({ seed: 'ga4-tools-test' });
const kase = buildCase({ seed: 'case-670', cause: { kind: 'plugin_670', starts_at: START_670 } });
const plain = buildCase({ seed: 'case-670' });
const seen = []; // every envelope any test is shown, for the leak check at the end

function open(now = NOW, w = world) {
  const clock = { now };
  const sim = openSimulator({ world: w, journal: join(mkdtempSync(join(tmpdir(), 'e1-ga4-')), 'r_t.sim.jsonl'), clock: () => clock.now });
  const call = async (name, args) => {
    const envelope = await toolset.call(name, args, { backend: sim.backend });
    seen.push({ envelope, now: clock.now });
    return envelope;
  };
  return { sim, clock, call };
}
const metrics = (...names) => names.map(name => ({ name }));
const ALL = metrics('sessions', 'addToCarts', 'checkouts', 'ecommercePurchases', 'purchaseRevenue');
const report = (call, ranges, { byDate = false, names = ALL, cursor = null } = {}) => call('ga4_run_report', {
  dateRanges: ranges.map(([startDate, endDate]) => ({ startDate, endDate })), dimensions: byDate ? [{ name: 'date' }] : [], metrics: names, cursor });
const values = row => row.metricValues.map(v => Number(v.value));
const dayStart = date => fromStoreTime(`${date}T00:00:00`);
// What GA4 must say a span of time holds: the world's orders paid in [from, to].
const paidIn = (w, from, to) => w.orders.filter(o => o.paid_at !== undefined && o.paid_at >= from && o.paid_at <= to);

const typeOf = v => (v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v);
function matchesDoc(record, fields, label) {
  for (const [key, value] of Object.entries(record)) {
    assert.ok(Object.hasOwn(fields, key), `${label}: ${key} is not a documented field`);
    const types = fields[key].split('|');
    const ok = types.includes(typeOf(value)) || (types.includes('date-time') && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value));
    assert.ok(ok, `${label}.${key}: ${JSON.stringify(value)} is not ${fields[key]}`);
  }
}

test('the GA4 and deploy tools join the toolset with strict schemas', () => {
  assert.deepEqual(toolset.definitions.slice(9).map(t => t.name), ['ga4_run_report', 'list_deploys']);
  for (const { schema } of toolset.definitions) checkStrict(schema);
});

test('ga4_run_report answers in runReport\'s documented fields, types and names', async () => {
  const { sim, call } = open();
  const docs = ga4Docs.run_report;
  for (const byDate of [false, true]) {
    const { result } = await report(call, [['6daysAgo', 'today'], ['13daysAgo', '7daysAgo']], { byDate });
    matchesDoc(result, docs.response_fields, 'report');
    result.dimensionHeaders.forEach(h => matchesDoc(h, docs.dimension_header_fields, 'dimension header'));
    result.metricHeaders.forEach(h => matchesDoc(h, docs.metric_header_fields, 'metric header'));
    matchesDoc(result.metadata, docs.metadata_fields, 'metadata');
    assert.equal(result.kind, docs.kind);
    assert.deepEqual(result.metricHeaders.map(h => h.name), ALL.map(m => m.name));
    for (const h of result.metricHeaders) {
      assert.ok(docs.metric_types.includes(h.type));
      assert.ok(Object.hasOwn(ga4Docs.api_schema.metrics, h.name), `${h.name} is a GA4 metric`);
    }
    assert.deepEqual(result.dimensionHeaders.map(h => h.name), [...(byDate ? ['date'] : []), 'dateRange']);
    for (const row of result.rows) {
      matchesDoc(row, docs.row_fields, 'row');
      [...row.dimensionValues, ...row.metricValues].forEach(v => matchesDoc(v, docs.value_fields, 'value'));
      assert.match(row.dimensionValues.at(-1).value, /^date_range_[01]$/);
      if (byDate) assert.match(row.dimensionValues[0].value, /^\d{8}$/, 'date is YYYYMMDD');
    }
    assert.equal(result.rowCount, byDate ? 14 : 2);
  }
  sim.close();
});

test('ga4_run_report cuts the day that holds now at now', async () => {
  const { sim, clock, call } = open();
  const today = storeTime(NOW).slice(0, 10), from = dayStart(today);
  const read = async () => {
    const { result } = await report(call, [['today', 'today'], ['yesterday', 'yesterday']], { byDate: true });
    return Object.fromEntries(result.rows.map(row => [row.dimensionValues[0].value, values(row)]));
  };
  const before = (await read())[today.replaceAll('-', '')];
  const bought = paidIn(world, from, NOW);
  assert.deepEqual(before.slice(3), [bought.length, bought.reduce((s, o) => s + o.total_paise, 0) / 100], 'purchases paid by now, no later');
  const full = world.days.find(d => d.date === today).funnel;
  assert.ok(before[0] > 0 && before[0] < full.sessions, 'sessions so far, not the whole day');
  clock.now = NOW + 3 * HOUR;
  const later = (await read())[today.replaceAll('-', '')];
  assert.ok(later.every((n, i) => n >= before[i]) && later[0] > before[0] && later[3] > before[3], 'the day fills as now moves on');
  clock.now = from + DAY - 1;
  assert.deepEqual((await read())[today.replaceAll('-', '')].slice(0, 3), [full.sessions, full.addToCarts, full.checkouts], 'the whole day at its last second');
  // An order paid at exactly now is counted; one second earlier it is not.
  const order = paidIn(world, from + HOUR, from + DAY).at(-1);
  for (const [now, n] of [[order.paid_at, paidIn(world, from, order.paid_at).length], [order.paid_at - 1, paidIn(world, from, order.paid_at - 1).length]]) {
    clock.now = now;
    assert.equal((await read())[today.replaceAll('-', '')][3], n);
  }
  // A range after today has no rows; a range holding today stops at today.
  clock.now = NOW;
  const { result } = await report(call, [['2026-11-20', '2026-11-30'], ['2026-11-25', '2026-11-30']], { byDate: true });
  assert.deepEqual(result.rows.map(r => r.dimensionValues.map(v => v.value).join(' ')),
    ['20261120', '20261121', '20261122', '20261123', '20261124'].map(d => `${d} date_range_0`), 'no day after today, none for the future range');
  const totals = await report(call, [['2026-11-25', '2026-11-30'], ['2026-11-26', '2026-11-26']]);
  assert.equal('rows' in totals.result, false, 'a report with nothing in it leaves rows out, as GA4 does');
  sim.close();
});

test('GA4 agrees with a #670 case\'s paid orders and store revenue as of now; the funnel does not move', async () => {
  const now = START_670 + 5 * DAY + 4 * HOUR;
  const span = [['2026-11-18', 'today'], ['2026-11-11', '2026-11-17']];
  const read = async w => { const { sim, call } = open(now, w); const { result } = await report(call, span); sim.close(); return result.rows.map(values); };
  const [withCause, without] = [await read(kase), await read(plain)];
  const from = dayStart('2026-11-18');
  for (const [rows, w] of [[withCause, kase], [without, plain]]) {
    assert.equal(rows[0][3], paidIn(w, from, now).length);
    assert.equal(Math.round(rows[0][4] * 100), storeRevenue(w, from, now + 1), 'purchaseRevenue is store revenue');
  }
  assert.deepEqual(withCause[0].slice(0, 3), without[0].slice(0, 3), 'sessions, add to carts and checkouts are the same');
  assert.ok(withCause[0][3] < without[0][3] * 0.8, '#670 removes the purchases of orders it marks failed');
  assert.deepEqual(withCause[1], without[1], 'the week before the cause is untouched');
});

test('ga4_run_report\'s argument errors name the fix; relative dates count back from now in IST', async () => {
  const { sim, call } = open();
  const cases = [
    [[['today', 'today']], {}, /dateRanges must hold 2 items/],
    [[['2026-11-24', '2026-11-20'], ['today', 'today']], {}, /dateRanges\[0\]\.startDate \(2026-11-24 IST\) is after dateRanges\[0\]\.endDate/],
    [[['2026-02-30', 'today'], ['today', 'today']], {}, /dateRanges\[0\]\.startDate must be a real date in store time \(IST\) as YYYY-MM-DD, or today/],
    [[['tomorrow', 'today'], ['today', 'today']], {}, /must be a real date/],
    [[['today', 'today'], ['today', 'today']], { names: metrics('sessions', 'sessions') }, /metrics must hold 1 to 5 different items/],
    [[['today', 'today'], ['today', 'today']], { names: [] }, /metrics must hold 1 to 5 different items/],
  ];
  for (const [ranges, options, pattern] of cases) {
    const envelope = await report(call, ranges, options);
    assert.ok(envelope.error, `${JSON.stringify(ranges)} is refused`);
    assert.match(envelope.note, pattern);
  }
  assert.match((await call('ga4_run_report', { dateRanges: [], dimensions: [{ name: 'hour' }], metrics: ALL, cursor: null })).note,
    /dimensions\[0\]\.name must be one of date/);
  assert.equal(resolveDay('today', NOW), '2026-11-24');
  assert.equal(resolveDay('yesterday', NOW), '2026-11-23');
  assert.equal(resolveDay('30daysAgo', NOW), '2026-10-25');
  assert.equal(resolveDay('today', Date.parse('2026-11-24T23:59:59+05:30') / 1000), '2026-11-24', 'IST, not UTC');
  assert.equal(resolveDay('today', Date.parse('2026-11-25T00:00:00+05:30') / 1000), '2026-11-25');
  sim.close();
});

test('a long report pages 20 rows at a time with the same rowCount, under the cap', async () => {
  const { sim, call } = open();
  const ranges = [['21daysAgo', 'today'], ['2026-10-01', '2026-11-02']];
  const pages = [];
  let cursor = null;
  do { pages.push(await report(call, ranges, { byDate: true, cursor })); cursor = pages.at(-1).cursor; } while (cursor);
  const rows = pages.flatMap(p => p.result.rows);
  assert.equal(rows.length, 22 + 1, 'the second range holds only the world\'s first day');
  assert.ok(pages.length >= 2 && pages.every(p => p.result.rowCount === rows.length && resultBytes(p) <= RESULT_BYTE_CAP));
  assert.equal(new Set(rows.map(r => r.dimensionValues.map(v => v.value).join())).size, rows.length);
  assert.match(pages.at(-1).note, /no more/);
  sim.close();
});

test('list_deploys answers in GitHub\'s deployment fields, oldest first, as of now', async () => {
  const { sim, clock, call } = open();
  const { result: rows, cursor, note } = await call('list_deploys', { cursor: null });
  const docs = githubDocs.deployments;
  for (const row of rows) {
    matchesDoc(row, docs.fields, 'deploy');
    matchesDoc(row.creator, docs.creator_fields, 'creator');
    assert.ok(docs.examples.task.includes(row.task) && docs.examples.environment.includes(row.environment));
    assert.match(row.sha, /^[0-9a-f]{40}$/);
    assert.equal(Object.keys(row).length, 8);
  }
  const done = WORLD_VERSION.store.deploys.filter(d => fromStoreTime(d.at) <= NOW);
  assert.deepEqual(rows.map(r => r.description), done.map(d => d.description), 'the baseline\'s deploys by now, and no plugin update');
  assert.deepEqual(rows.map(r => Date.parse(r.created_at) / 1000), done.map(d => fromStoreTime(d.at)), 'UTC date-times');
  assert.ok(rows.every((r, i) => i === 0 || r.id === rows[i - 1].id + 1));
  assert.equal(cursor, null);
  assert.match(note, /no more/);
  clock.now = fromStoreTime(WORLD_VERSION.store.deploys.at(-1).at);
  assert.equal((await call('list_deploys', { cursor: null })).result.length, WORLD_VERSION.store.deploys.length);
  sim.close();
});

test('a #670 case\'s plugin update is a deploy at the cause\'s start, in id order, agreeing with system status', async () => {
  const { sim, clock, call } = open(START_670 - 1, kase);
  const update = 'Update woo-razorpay from 4.8.6 to 4.8.8';
  const deploys = async () => (await call('list_deploys', { cursor: null })).result;
  const razorpay = async () => (await call('wc_system_status', {})).result.active_plugins.find(p => p.plugin.startsWith('woo-razorpay')).version;
  assert.equal((await deploys()).some(d => d.description === update), false, 'not before the cause starts');
  assert.equal(await razorpay(), '4.8.6');
  clock.now = START_670;
  const at = await deploys();
  const deploy = at.find(d => d.description === update);
  assert.equal(Date.parse(deploy.created_at) / 1000, START_670);
  assert.equal(await razorpay(), '4.8.8', 'system status reads the same update');
  clock.now = NOW;
  const later = await deploys();
  assert.deepEqual(later.map(d => d.id), later.map((_, i) => WORLD_VERSION.store.first_deploy_id + i), 'ids follow time order');
  assert.ok(later.indexOf(later.find(d => d.description === update)) < later.length - 1, 'baseline deploys come after it');
  assert.deepEqual(later.filter(d => d.description !== update).map(d => d.sha),
    (await (async () => { const p = open(NOW, plain); const r = (await p.call('list_deploys', { cursor: null })).result; p.sim.close(); return r; })()).map(d => d.sha),
    'the baseline deploys are the same with or without the cause');
  sim.close();
});

test('the leak scanner reads UTC date-times and passes on every response the tests above were shown', () => {
  assert.deepEqual(scanForLeaks({ created_at: `${storeTime(NOW, 0)}Z` }, { now: NOW }), []);
  assert.equal(scanForLeaks({ created_at: `${storeTime(NOW + 1, 0)}Z` }, { now: NOW }).length, 1);
  assert.equal(scanForLeaks({ items: [{ updated_at: 'yesterday' }] }, { now: NOW }).length, 1);
  assert.ok(seen.length > 25, `${seen.length} envelopes`);
  for (const { envelope, now } of seen) {
    assert.ok(typeof envelope.note === 'string' && ('result' in envelope) !== ('error' in envelope));
    assert.deepEqual(scanForLeaks(envelope, { now }), []);
  }
});
