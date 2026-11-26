import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { loadDaily } from '../db/benchmark/ga4-daily.mjs';
import { crossingHours, crossingWindows, freezeNow, measure, triggerRecord } from '../e1/trigger.mjs';
import { buildWorld, possibleNows } from '../e1/world.mjs';
import { MIN_WINDOWS, SWEEP_SEEDS, renderWorldReport, reportPath } from '../scripts/run-e1-world-report.mjs';

const HOUR = 3600, DAY = 86400;
const rows = loadDaily();
const world = buildWorld({ seed: 'baseline', rows });
const fixture = JSON.parse(readFileSync(new URL('./fixtures/e1-trigger/baseline-crossings.json', import.meta.url), 'utf8'));
const ist = t => new Date((t + 19800) * 1000).toISOString().slice(0, 16).replace('T', ' ');

test("the baseline's crossing hours match the committed fixture, grouped into distinct windows", () => {
  assert.deepEqual([fixture.world_version, fixture.seed, fixture.world_hash], [world.version.id, world.seed, world.hash]);
  const windows = crossingWindows(world);
  assert.deepEqual(windows.map(w => w.hours.map(ist)), fixture.windows);
  assert.deepEqual(crossingHours(world), windows.flatMap(w => w.hours), 'every crossing hour belongs to one window');
  // A window ends only where the trailing 24 h is back within 10%, nothing crosses between windows, and no two
  // windows' trailing days overlap.
  for (const [i, w] of windows.entries()) {
    assert.equal(w.opens_at, w.hours[0]);
    if (i) assert.ok(w.opens_at >= windows[i - 1].hours.at(-1) + DAY, ist(w.opens_at));
    if (w.rearms_at === null) { assert.equal(i, windows.length - 1); continue; }
    const m = measure(world, w.rearms_at);
    assert.ok(m.rearmed && !m.crosses && m.dipPaise * 100 >= m.comparisonPaise * 90);
    for (let h = w.hours.at(-1) + HOUR; h < w.rearms_at; h += HOUR) assert.ok(!measure(world, h).rearmed, ist(h));
    const next = windows[i + 1]?.opens_at ?? possibleNows(world).at(-1) + HOUR;
    for (let h = w.rearms_at; h < next; h += HOUR) assert.ok(!measure(world, h).crosses, ist(h));
  }
});

test('the distinct-window count is written into the committed world report', () => {
  const report = renderWorldReport(world);
  assert.equal(readFileSync(reportPath, 'utf8'), report, 'run node scripts/run-e1-world-report.mjs');
  assert.ok(report.includes(`${fixture.windows.flat().length} crossing hours in **${fixture.windows.length} distinct crossing windows**`));
  // The gate takes the fewest windows over the seed sweep, so one seed's hourly draw can't pass it alone. The real
  // GA4 rhythm gives 5 (1 and 2 Dec are one window), so the gate fails and the report names the fallback.
  const fewest = Math.min(...SWEEP_SEEDS.map(seed => crossingWindows(buildWorld({ seed, rows })).length));
  assert.equal(fewest, 5);
  assert.ok(fewest < MIN_WINDOWS && report.includes(`**Distinct crossing windows: ${fewest}** (the fewest; gate: at least 6, fail: no-cause cases share windows, and the README must say so)`));
  assert.ok(report.includes('Window 1 opens at the first possible "now"'));
  assert.ok(report.includes(`\`${world.hash}\``));
});

test('the first crossing freezes "now"; the record is figures from code and sees nothing after "now"', () => {
  const now = freezeNow(world);
  assert.equal(ist(now), fixture.windows[0][0]);
  assert.equal(freezeNow(world, now + HOUR), now + HOUR, 'a later start inside a window freezes that hour');
  assert.equal(ist(freezeNow(world, crossingWindows(world)[1].opens_at - DAY)), fixture.windows[1][0]);
  assert.throws(() => freezeNow(world, possibleNows(world).at(-1) + HOUR), /no crossing at or after/);

  const record = JSON.parse(triggerRecord(world));
  assert.deepEqual(Object.keys(record), ['comparison_revenue_paise', 'comparison_window', 'dip_revenue_paise',
    'dip_window', 'gap_paise', 'gap_pct', 'now', 'threshold_pct']);
  assert.deepEqual(record.dip_window, { from: now - DAY, to: now });
  assert.deepEqual(record.comparison_window, { from: now - 8 * DAY, to: now - 7 * DAY });
  const paid = (from, to) => world.orders.filter(o => o.paid_at >= from && o.paid_at < to).reduce((s, o) => s + o.total_paise, 0);
  assert.equal(record.dip_revenue_paise, paid(now - DAY, now));
  assert.equal(record.comparison_revenue_paise, paid(now - 8 * DAY, now - 7 * DAY));
  assert.equal(record.gap_paise, record.comparison_revenue_paise - record.dip_revenue_paise);
  assert.ok(record.gap_pct >= 25 && record.threshold_pct === 25);
  // No merchant text and no header value but "now": every leaf is a number.
  const leaves = v => (v && typeof v === 'object' ? Object.values(v).flatMap(leaves) : [v]);
  assert.ok(leaves(record).every(Number.isFinite));
  // Orders paid at or after "now" don't reach the record, so a cause acting after "now" can't leak into it.
  const later = { ...world, orders: world.orders.map(o => (o.paid_at >= now ? { ...o, total_paise: 1 } : o)) };
  assert.equal(triggerRecord(later), triggerRecord(world));
  // An unpaid order counts nowhere.
  const lastPaid = world.orders.findLast(o => o.paid_at < now);
  const unpaid = { ...world, orders: world.orders.map(o => (o === lastPaid ? { ...o, paid_at: undefined } : o)) };
  assert.ok(JSON.parse(triggerRecord(unpaid)).dip_revenue_paise < record.dip_revenue_paise);
  // An hour with no revenue to compare against neither crosses nor stops the scan.
  const first = possibleNows(world)[0];
  const empty = { ...world, orders: world.orders.filter(o => o.paid_at >= first - 7 * DAY) };
  assert.equal(measure(empty, first).crosses, false);
  assert.ok(crossingWindows(empty).length > 0);
});

test('the agent run and the checklist get byte-identical trigger records from one function', () => {
  // Each builds its own world from the seed, as separate processes will (tickets 13 and 15).
  const forRun = triggerRecord(buildWorld({ seed: 'baseline', rows }));
  const forChecklist = triggerRecord(buildWorld({ seed: 'baseline', rows }));
  assert.equal(Buffer.compare(Buffer.from(forRun), Buffer.from(forChecklist)), 0);
  assert.equal(forRun, JSON.stringify(JSON.parse(forRun)), 'already canonical: keys sorted, no whitespace');
  const from = crossingWindows(world).at(-2).opens_at;
  assert.equal(triggerRecord(buildWorld({ seed: 'baseline', rows }), from), triggerRecord(world, from));
  assert.notEqual(triggerRecord(world, from), forRun);
});

test('lint: the trigger is decision code with no wall clock or Math.random, and imports only these', () => {
  const source = readFileSync(new URL('../e1/trigger.mjs', import.meta.url), 'utf8');
  assert.deepEqual([...source.matchAll(/^(?:import|export)\s[^;]*?\sfrom\s*'([^']+)'/gm)].map(m => m[1]),
    ['../db/benchmark/contracts.mjs', './canonical.mjs', './world.mjs']);
  assert.doesNotMatch(source, /Date\.now|new Date|Math\.random|import\(|require\(/);
});
