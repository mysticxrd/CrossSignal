import assert from 'node:assert/strict';
import test from 'node:test';
import { WEEKDAYS } from '../db/benchmark/daily.mjs';
import { DAILY_PREDICATES, dailyCoverage, evaluateDailyPredicate } from './evaluator/daily-predicates.mjs';
import { NO_INCIDENT_WORDS, REAL_NO_INCIDENT_WORDS, TRUTH_MODES, gradeCause } from './evaluator/grade-b01.mjs';

const DAY = 86_400_000, iso = ms => new Date(ms).toISOString();
// Desktop and mobile day rows from start; the last alertDays are alert days. Rows are flat unless edit() changes one.
function days({ start = '2020-11-30T00:00:00.000Z', count = 10, alertDays = 3, edit = () => ({}) } = {}) {
  const from = Date.parse(start), frame = { start, recentFrom: iso(from + (count - alertDays) * DAY), clock: iso(from + count * DAY) };
  let n = 0;
  const rows = [];
  for (let d = 0; d < count; d++) for (const segment of ['desktop', 'mobile']) {
    const date = iso(from + d * DAY), weekday = WEEKDAYS[new Date(date).getUTCDay()], alert = d >= count - alertDays;
    rows.push({ id: `e_${(++n).toString(16).padStart(12, '0')}`, type: 'revenue_window', at: iso(from + (d + 1) * DAY),
      payload: { day: date.slice(0, 10), weekday, segment, visits: 1000, checkouts: 100, orders: 50, revenueMinor: 200_000,
        ...edit({ segment, weekday, alert }) } });
  }
  return { frame, rows };
}
const holds = (predicate, rows, target, frame) => evaluateDailyPredicate(predicate, rows, target, frame).supported;
const deploy = (service, at) => ({ id: `e_d${at.slice(8, 10)}${service.length}`, type: 'deployment', at, payload: { service } });
const health = (service, at, validationErrors, providerHealthy = true) => ({ id: `e_h${at.slice(8, 13)}`, type: 'service_health', at,
  payload: { service, segment: null, validationErrors, providerHealthy } });

test('daily revenue facts compare alert days with earlier days, segment by segment, on the cited rows only', () => {
  const checkout = days({ edit: ({ segment, alert }) => alert && segment === 'mobile' ? { orders: 20, revenueMinor: 80_000 } : {} });
  const at = (predicate, target, { rows, frame } = checkout) => holds(predicate, rows, target, frame);
  assert.equal(at('completion_drop', 'mobile'), true);
  assert.equal(at('completion_drop', 'desktop'), false);
  // With no target every segment must show the fact, and desktop is steady.
  assert.equal(at('completion_drop', null), false);
  assert.equal(at('completion_steady', 'desktop'), true);
  assert.equal(at('revenue_drop', null), true);
  assert.equal(at('revenue_drop', 'desktop'), false);
  // Alert rows alone have nothing earlier to compare with.
  assert.equal(holds('completion_drop', checkout.rows.filter(e => e.at > checkout.frame.recentFrom), 'mobile', checkout.frame), false);

  const traffic = days({ edit: ({ segment, alert }) => alert && segment === 'desktop'
    ? { visits: 550, checkouts: 55, orders: 27, revenueMinor: 108_000 } : {} });
  assert.equal(at('visits_drop', 'desktop', traffic), true);
  assert.equal(at('visits_drop', 'mobile', traffic), false);
  assert.equal(at('conversion_steady', null, traffic), true);
  assert.equal(at('revenue_drop', null, traffic), true);
  assert.deepEqual(evaluateDailyPredicate('weekend_dip', traffic.rows, null, traffic.frame), { supported: false, reason: 'unknown_predicate' });
});

test('a usual weekend holds only when Saturday and Sunday earn at least the weakest earlier Saturday and Sunday', () => {
  // 2020-11-23 is a Monday, so 21 days end on Saturday 12 and Sunday 13 December.
  const weekend = alertMinor => days({ start: '2020-11-23T00:00:00.000Z', count: 21, alertDays: 2,
    edit: ({ weekday, alert }) => ['Sat', 'Sun'].includes(weekday) ? { revenueMinor: alert ? alertMinor : 100_000 } : {} });
  const usual = weekend(100_000), poor = weekend(60_000), weekdays = days();
  assert.deepEqual(usual.rows.filter(e => e.at > usual.frame.recentFrom).map(e => e.payload.weekday), ['Sat', 'Sat', 'Sun', 'Sun']);
  assert.equal(holds('usual_weekend', usual.rows, null, usual.frame), true);
  assert.equal(holds('revenue_drop', usual.rows, null, usual.frame), true);
  assert.equal(holds('usual_weekend', poor.rows, null, poor.frame), false);
  assert.equal(holds('usual_weekend', weekdays.rows, null, weekdays.frame), false);
});

test('validation and provider facts read the target service around its latest cited deploy', () => {
  const { frame, rows } = days({ edit: ({ alert }) => alert ? { orders: 30, revenueMinor: 120_000 } : {} });
  const release = deploy('checkout', '2020-12-06T15:00:00.000Z'), before = health('checkout', '2020-12-05T09:00:00.000Z', 2);
  const at = (predicate, cited, target = 'checkout') => holds(predicate, cited, target, frame);
  assert.equal(at('validation_increased', [release, before, health('checkout', '2020-12-07T09:00:00.000Z', 40)]), true);
  assert.equal(at('validation_steady', [release, before, health('checkout', '2020-12-07T09:00:00.000Z', 40)]), false);
  assert.equal(at('validation_steady', [release, before, health('checkout', '2020-12-07T09:00:00.000Z', 1)]), true);
  assert.equal(at('validation_increased', [before, health('checkout', '2020-12-07T09:00:00.000Z', 40)]), false);
  assert.equal(at('validation_steady', [release, before]), false);
  const down = health('payment-provider', '2020-12-08T06:00:00.000Z', 0, false);
  assert.equal(at('provider_unhealthy', [down, ...rows], 'payment-provider'), true);
  assert.equal(at('provider_unhealthy', [down, ...days().rows], 'payment-provider'), false);
  assert.equal(at('provider_unhealthy', [health('payment-provider', '2020-12-08T06:00:00.000Z', 0), ...rows], 'payment-provider'), false);
  // Facts that read only fields both formats share go to the frozen evaluator.
  assert.equal(at('deployment_observed', [release]), true);
  assert.equal(at('provider_healthy', [down], 'payment-provider'), false);
  assert(DAILY_PREDICATES.includes('missing_windows'));
});

test('daily key evidence counts a group only when the run saw and cited its rows and the fact holds on them', () => {
  const { frame, rows } = days({ edit: ({ segment, alert }) => alert && segment === 'mobile' ? { orders: 20, revenueMinor: 80_000 } : {} });
  const mobile = rows.filter(e => e.payload.segment === 'mobile').map(e => e.id), desktop = rows.filter(e => e.payload.segment === 'desktop');
  const rubric = { groups: [{ name: 'mobile completion', predicate: 'completion_drop', evidenceIds: mobile, target: 'mobile' },
    { name: 'desktop completion', predicate: 'completion_drop', evidenceIds: desktop.map(e => e.id), target: 'desktop' }] };
  const finding = cited => ({ claims: [{ evidenceIds: cited }], hypotheses: [], relatedChangeId: null });
  const all = rows.map(e => e.id);
  assert.deepEqual(dailyCoverage(finding(all), rows, rubric, frame).groups.map(g => g.covered), [true, false]);
  assert.equal(dailyCoverage(finding(mobile.slice(1)), rows, rubric, frame).covered, 0);
  assert.equal(dailyCoverage(finding(all), rows.filter(e => e.id !== mobile[0]), rubric, frame).covered, 0);
});

test('weekend and weekly words say nothing is wrong only on real-baseline no-incident cases', () => {
  const calm = { expectedDiagnosis: 'no_incident', action: { kind: 'none' }, relevantChangeIds: [] };
  const traffic = { ...calm, expectedDiagnosis: 'acquisition_composition_shift' };
  const said = diagnosis => ({ terminalStatus: 'completed', relatedChangeId: null, hypotheses: [{ diagnosis }] });
  assert.equal(TRUTH_MODES.SIMULATED.calmWords, NO_INCIDENT_WORDS);
  assert.equal(TRUTH_MODES.REAL_BASELINE_PARTLY_SYNTHETIC.calmWords, REAL_NO_INCIDENT_WORDS);
  const dip = said('Weekend traffic dip, as on earlier weekends.');
  assert.deepEqual(gradeCause(dip, calm, [], REAL_NO_INCIDENT_WORDS), { pass: true, got: '"weekend" → no_incident', want: 'no_incident' });
  assert.equal(gradeCause(dip, calm, []).pass, false);
  // On an incident case the calm words do not join, so the traffic word decides.
  assert.equal(gradeCause(dip, traffic, [], REAL_NO_INCIDENT_WORDS).pass, true);
  assert.equal(gradeCause(said('Unusual checkout drop'), calm, [], REAL_NO_INCIDENT_WORDS).pass, false);
  assert.equal(gradeCause(said('Typical seasonality'), calm, [], REAL_NO_INCIDENT_WORDS).pass, true);
});
