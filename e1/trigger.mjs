// The trigger (ticket 04; spec section 1 step 1, ADR 0008, section 8 decisions 1, 3 and 5). Hourly on the case
// clock, store revenue over the trailing 24 h is compared with the same 24 h 7 days earlier; the first hour it is at
// least the version's drop below becomes the case's frozen "now". Store revenue counts an order at the hour it was
// paid, so an order only enters a window the merchant could already see. Every setting comes from the world version
// (ADR 0008: changing one is a world-version change). This is decision code: no wall clock and no randomness.
import { requireThat } from '../db/benchmark/contracts.mjs';
import { canonicalJson } from './canonical.mjs';
import { possibleNows } from './world.mjs';

const DAY = 86400;

// Paise paid in [from, to).
export function storeRevenue(world, from, to) {
  let paise = 0;
  for (const o of world.orders) if (o.paid_at !== undefined && o.paid_at >= from && o.paid_at < to) paise += o.total_paise;
  return paise;
}

// The trigger's measurement at one hour; `crosses` compares whole paise, never the rounded gap.
export function measure(world, now) {
  const v = world.version;
  const before = (v.trigger_lookback_days - 1) * DAY;
  const dip = { from: now - DAY, to: now }, comparison = { from: now - before - DAY, to: now - before };
  const dipPaise = storeRevenue(world, dip.from, dip.to), comparisonPaise = storeRevenue(world, comparison.from, comparison.to);
  requireThat(comparisonPaise > 0, `trigger: no store revenue in the comparison window before ${now}`);
  return {
    now, dip, comparison, dipPaise, comparisonPaise,
    crosses: dipPaise * 100 <= comparisonPaise * (100 - v.trigger_drop_pct),
    rearmed: dipPaise * 100 >= comparisonPaise * (100 - v.trigger_rearm_pct),
  };
}

// Every possible "now" at which the trigger crosses, in time order.
export const crossingHours = world => possibleNows(world).filter(now => measure(world, now).crosses);

// Distinct crossing windows (Fix F2), counted the way the dip lifecycle opens dips: a window opens at a crossing
// while the trigger is armed; crossings inside it are its own; it ends at the first hour the trailing 24 h is back
// within the re-arm margin of its comparison. A window still open at the last possible "now" has no rearms_at.
export function crossingWindows(world) {
  const windows = [];
  let open = null;
  for (const now of possibleNows(world)) {
    const m = measure(world, now);
    if (open && m.rearmed) { open.rearms_at = now; open = null; }
    if (m.crosses) {
      if (!open) windows.push(open = { opens_at: now, hours: [], rearms_at: null });
      open.hours.push(now);
    }
  }
  return windows;
}

// The first crossing at or after `from` becomes the frozen "now".
export function freezeNow(world, from = possibleNows(world)[0]) {
  const now = possibleNows(world).find(h => h >= from && measure(world, h).crosses);
  requireThat(now !== undefined, `trigger: no crossing at or after ${from}`);
  return now;
}

// The trigger record, as the canonical JSON bytes every consumer receives: the agent's run (ticket 15) and the
// checklist baseline (ticket 13) both call this, so their copies are byte-identical. It holds only figures from code:
// no merchant text, and no header value but "now" (world version, hash and seed stay in the run-log header).
export function triggerRecord(world, from) {
  const m = measure(world, freezeNow(world, from));
  const gap = m.comparisonPaise - m.dipPaise;
  return canonicalJson({
    now: m.now,
    dip_window: m.dip, dip_revenue_paise: m.dipPaise,
    comparison_window: m.comparison, comparison_revenue_paise: m.comparisonPaise,
    gap_paise: gap, gap_pct: Math.round(gap * 10000 / m.comparisonPaise) / 100,
    threshold_pct: world.version.trigger_drop_pct,
  });
}
