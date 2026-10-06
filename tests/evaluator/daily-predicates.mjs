// Evaluator-only typed facts for daily (incident-data-v3) cases, the counterpart of the frozen
// factory/02_data/benchmark/predicates.mjs, which reads one-hour v2 fields and a v2 cutoff. Revenue facts compare alert
// days (after frame.recentFrom) with earlier days, segment by segment, using only the cited rows. The thresholds were
// fixed before any daily case was written: a drop is below 0.75x, steady is within 0.8x-1.25x, and a revenue drop is
// below 0.9x, the daily rule baseline's alert threshold.
import { evaluatePredicate, findingCitations } from '../../factory/02_data/benchmark/predicates.mjs';

export const DAILY_PREDICATES = Object.freeze(['completion_drop', 'completion_steady', 'visits_drop', 'conversion_steady',
  'revenue_drop', 'usual_weekend', 'validation_increased', 'validation_steady', 'provider_unhealthy', 'provider_healthy',
  'deployment_observed', 'support_report', 'missing_windows']);
// These read only fields both formats share, so the frozen evaluator judges them.
const SHARED = Object.freeze(['provider_healthy', 'deployment_observed', 'support_report', 'missing_windows']);
const DROP = 0.75, LOW = 0.8, HIGH = 1.25, REVENUE_DROP = 0.9;
const dropped = r => r !== null && r < DROP;
const steady = r => r !== null && r >= LOW && r <= HIGH;

// Sums of one period's rows; days counts calendar days, so per-day rates span segments too.
const total = list => list.reduce((a, e) => ({ ...a, visits: a.visits + e.payload.visits, checkouts: a.checkouts + e.payload.checkouts,
  orders: a.orders + e.payload.orders, revenueMinor: a.revenueMinor + e.payload.revenueMinor }),
{ days: new Set(list.map(e => e.payload.day)).size, visits: 0, checkouts: 0, orders: 0, revenueMinor: 0 });
const split = (windows, frame) => ({ before: total(windows.filter(e => e.at <= frame.recentFrom)),
  after: total(windows.filter(e => e.at > frame.recentFrom)) });
// Alert-day rate over earlier-day rate, or null when either side has nothing to divide by.
function ratio({ before, after }, top, bottom) {
  if (before[bottom] === 0 || after[bottom] === 0 || before[top] === 0) return null;
  return (after[top] / after[bottom]) / (before[top] / before[bottom]);
}

export function evaluateDailyPredicate(predicate, citedRows, target, frame) {
  if (!DAILY_PREDICATES.includes(predicate)) return { supported: false, reason: 'unknown_predicate' };
  if (SHARED.includes(predicate)) return evaluatePredicate(predicate, citedRows, target);
  const windows = citedRows.filter(e => e.type === 'revenue_window' && (target === null || e.payload.segment === target));
  const segments = [...new Set(windows.map(e => e.payload.segment))].map(s => split(windows.filter(e => e.payload.segment === s), frame));
  const every = test => segments.length > 0 && segments.every(test);
  const health = citedRows.filter(e => e.type === 'service_health' && e.payload.service === target);
  let supported = false;
  if (predicate === 'completion_drop') supported = every(p => dropped(ratio(p, 'orders', 'checkouts')));
  if (predicate === 'completion_steady') supported = every(p => steady(ratio(p, 'orders', 'checkouts')));
  if (predicate === 'visits_drop') supported = every(p => dropped(ratio(p, 'visits', 'days')));
  if (predicate === 'conversion_steady') supported = every(p => steady(ratio(p, 'orders', 'visits')));
  if (predicate === 'revenue_drop') { const r = ratio(split(windows, frame), 'revenueMinor', 'days'); supported = r !== null && r < REVENUE_DROP; }
  if (predicate === 'usual_weekend') {
    // Every alert day is a Saturday or Sunday with at least the revenue of the weakest earlier day of the same weekday.
    const days = new Map();
    for (const e of windows) days.set(e.payload.day, { weekday: e.payload.weekday, alert: e.at > frame.recentFrom,
      revenueMinor: (days.get(e.payload.day)?.revenueMinor ?? 0) + e.payload.revenueMinor });
    const all = [...days.values()], alert = all.filter(d => d.alert);
    supported = alert.length > 0 && alert.every(d => {
      const earlier = all.filter(o => !o.alert && o.weekday === d.weekday).map(o => o.revenueMinor);
      return ['Sat', 'Sun'].includes(d.weekday) && earlier.length > 0 && d.revenueMinor >= Math.min(...earlier);
    });
  }
  if (predicate === 'validation_increased' || predicate === 'validation_steady') {
    // The target service's readings before and after its latest cited deployment.
    const deploy = citedRows.filter(e => e.type === 'deployment' && e.payload.service === target).map(e => e.at).sort().at(-1);
    const most = list => Math.max(...list.map(e => e.payload.validationErrors));
    const before = health.filter(e => e.at < deploy), after = health.filter(e => e.at > deploy);
    supported = deploy !== undefined && before.length > 0 && after.length > 0
      && (predicate === 'validation_increased' ? most(after) > most(before) : most(after) <= most(before));
  }
  if (predicate === 'provider_unhealthy') {
    // An unhealthy reading, and orders per started checkout down across every cited revenue row.
    const all = citedRows.filter(e => e.type === 'revenue_window');
    supported = health.some(e => e.payload.providerHealthy === false) && all.length > 0 && dropped(ratio(split(all, frame), 'orders', 'checkouts'));
  }
  return { supported: Boolean(supported), reason: supported ? 'cited_typed_facts_match' : 'cited_facts_do_not_establish_predicate' };
}

// criticalCoverage for daily cases: a group counts when the run saw and cited all its rows and its fact holds on them.
export function dailyCoverage(finding, exposedRows, rubric, frame) {
  const cited = new Set(findingCitations(finding));
  const byId = new Map(exposedRows.map(e => [e.id, e]));
  const groups = rubric.groups.map(g => ({ name: g.name, covered: g.evidenceIds.every(id => cited.has(id) && byId.has(id))
    && evaluateDailyPredicate(g.predicate, g.evidenceIds.map(id => byId.get(id)), g.target, frame).supported }));
  return { covered: groups.filter(g => g.covered).length, total: groups.length, groups };
}
