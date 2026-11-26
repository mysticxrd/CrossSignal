// Writes reports/e1/world.md, the baseline world's report: its version, hash and size, and the trigger's crossing
// windows with their distinct count (ticket 04, Fix F2). Later world gates (ticket 06's counterfactual) add sections.
// `--check` compares the committed report byte for byte instead of writing it.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWorld, possibleNows } from '../e1/world.mjs';
import { crossingHours, crossingWindows, measure } from '../e1/trigger.mjs';

export const reportPath = new URL('../reports/e1/world.md', import.meta.url);
export const MIN_WINDOWS = 6; // section 8 decision 1: fewer, and the README must say no-cause cases share windows

const ist = (t, offset) => new Date((t + offset) * 1000).toISOString().slice(0, 16).replace('T', ' ');
const overlaps = (w, sale) => w.from < sale.ends_at && w.to > sale.starts_at;

export function renderWorldReport(world = buildWorld({ seed: 'baseline' })) {
  const v = world.version, at = t => ist(t, v.utc_offset_s), nows = possibleNows(world);
  const sale = world.calendar.find(c => c.kind === 'sale');
  const hours = crossingHours(world), windows = crossingWindows(world);
  const rows = windows.map((w, i) => {
    const m = measure(world, w.opens_at);
    const touches = [overlaps(m.dip, sale) && 'dip', overlaps(m.comparison, sale) && 'comparison'].filter(Boolean);
    const gap = Math.round((m.comparisonPaise - m.dipPaise) * 10000 / m.comparisonPaise) / 100;
    return `| ${i + 1} | ${at(w.opens_at)} | ${w.hours.length} | ${gap.toFixed(2)}% | ${w.rearms_at === null ? 'open at the last "now"' : at(w.rearms_at)} | ${touches.join(', ') || 'no'} |`;
  });
  const pass = windows.length >= MIN_WINDOWS;
  return [
    '# E1 world report: the baseline', '',
    '**BUILT: the world generator and the trigger. SIMULATED: every order and payment, following GA4\'s real daily revenue. PLANNED: causes, cases, the agent and the checklist baseline.**', '',
    '| | |', '|---|---|',
    `| World version | \`${v.id}\` |`,
    `| Seed | \`${world.seed}\` |`,
    `| World hash | \`${world.hash}\` |`,
    `| Days | ${world.days[0].date} to ${world.days.at(-1).date} (GA4 ${v.ga4.from} to ${v.ga4.to}), ${world.days.length} |`,
    `| Orders | ${world.orders.length} |`,
    `| Possible "now" hours | ${nows.length}, ${at(nows[0])} to ${at(nows.at(-1))} IST |`, '',
    '## Trigger crossings (Fix F2)', '',
    `The trigger crosses when store revenue paid in the trailing 24 h is at least ${v.trigger_drop_pct}% below the same 24 h ${v.trigger_lookback_days - 1} days earlier, checked every hour on the case clock. A window opens at a crossing and ends when the trailing 24 h is back within ${v.trigger_rearm_pct}% of its comparison, as a dip re-arms; crossings inside it open nothing.`, '',
    `Crossing hours: ${hours.length}.`, '',
    `**Distinct crossing windows: ${windows.length}** (gate: at least ${MIN_WINDOWS}, ${pass ? 'pass' : 'fail: no-cause cases share windows, and the README must say so'}).`, '',
    '| Window | Opens (IST) | Crossing hours | Gap at opening | Re-arms (IST) | Sale week in |',
    '|---|---|---|---|---|---|', ...rows, '',
    'The windows are public by construction: anyone with the committed GA4 CSV can recompute them. Development and held-out no-cause cases use disjoint windows (section 8 decision 7). The crossing hours are pinned in `tests/fixtures/e1-trigger/baseline-crossings.json`.', '',
    'Run `node scripts/run-e1-world-report.mjs` to regenerate; add `--check` to verify the committed report byte for byte.', '',
  ].join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = renderWorldReport();
  if (process.argv.includes('--check')) {
    if (readFileSync(reportPath, 'utf8') !== report) throw new Error('Committed E1 world report differs; regenerate it');
    console.log('E1 world report matches.');
  } else { mkdirSync(new URL('.', reportPath), { recursive: true }); writeFileSync(reportPath, report); console.log(fileURLToPath(reportPath)); }
}
