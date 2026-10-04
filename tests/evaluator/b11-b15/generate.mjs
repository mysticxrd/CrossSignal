// Evaluator-only: authors the five fresh SIMULATED cases B11-B15 and their hidden rubric. Frozen on 2026-10-05,
// before the step-5 "check before you blame" change, because B01-B10 had all been seen by then.
// db/, scripts/ and the isolated worker never import this file or read the rubric. Public case files hold only
// observations, named by case reference, with no label or answer.
// Usage: node tests/evaluator/b11-b15/generate.mjs --freeze   (writes missing files; an existing file must match)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CUTOFF, SEGMENTS, START, VERSION, canonical, digest, requireThat, validateObservable } from '../../../db/benchmark/contracts.mjs';
import { evaluatePredicate } from '../../../factory/02_data/benchmark/predicates.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
export const LABELS = Object.freeze(['B11', 'B12', 'B13', 'B14', 'B15']);
export const CASES = 'db/benchmark/cases/b11-b15';
export const RUBRIC = 'tests/evaluator/b11-b15/rubric.json';
const ENDS = ['2026-09-01T09:15:00.000Z', '2026-09-01T09:30:00.000Z', '2026-09-01T09:45:00.000Z', CUTOFF];
// A new seed, so no case reference or evidence id repeats one from B01-B10.
const identity = (prefix, value) => `${prefix}_${digest(`fresh-benchmark-2026-10-05|${value}`).slice(0, 12)}`;
const minute = n => new Date(Date.parse(START) + n * 60_000).toISOString();
const CAUSES = Object.freeze({ B11: 'payment_provider_incident', B12: 'payment_provider_incident', B13: 'delayed_ingestion',
  B14: 'pricing_configuration_error', B15: 'acquisition_composition_shift' });

export function scopeFor(label) {
  return { workspaceId: identity('w', 'workspace'), caseId: identity('c', label), runId: identity('r', `${label}|data`),
    actorId: identity('a', 'host'), start: START, clock: CUTOFF };
}
function event(scope, key, type, at, payload) {
  const source = type === 'support_message' ? 'support' : ['revenue_window', 'observation_status'].includes(type) ? 'revenue' : 'engineering';
  const body = { id: identity('e', `${scope.caseId}|${key}`), workspaceId: scope.workspaceId, caseId: scope.caseId,
    runId: scope.runId, type, at, source, sourceVersion: VERSION, truthMode: 'SIMULATED', payload };
  return { ...body, contentHash: digest(body) };
}

// A normal 15-minute window: attempts, successes, validation errors and unit price in minor INR. Volumes and prices
// differ from B06-B10. Failures that are not validation errors are provider declines.
const NORMAL = { 'IN/debit': [200, 170, 10, 40000], 'IN/credit': [100, 90, 2, 65000], 'GB/debit': [120, 102, 6, 55000] };
function windowRow(label, i, segment) {
  let [attempts, successes, validationErrors, price] = NORMAL[segment];
  const post = i >= 2;
  // B11: the provider declines IN/credit cards (declines 8 -> 38); validation errors stay put.
  if (label === 'B11' && post && segment === 'IN/credit') successes = 60;
  // B12: payment-provider v41 breaks GB/debit authorisations (declines 12 -> 54); validation errors stay put.
  if (label === 'B12' && post && segment === 'GB/debit') successes = 60;
  // B14: a pricing setting cuts the IN/credit unit price from 65000 to 39000; customers and rates are unchanged.
  if (label === 'B14' && post && segment === 'IN/credit') price = 39000;
  // B15: volume moves from GB/debit to IN/debit; every segment keeps its conversion, validation and decline rates.
  if (label === 'B15' && post && segment === 'IN/debit') [attempts, successes, validationErrors] = [260, 221, 13];
  if (label === 'B15' && post && segment === 'GB/debit') [attempts, successes, validationErrors] = [60, 51, 3];
  const failed = attempts - successes;
  return { start: i === 0 ? START : ENDS[i - 1], end: ENDS[i], segment, attempts, successes, failed,
    revenueMinor: successes * price, currency: 'INR', unitPriceMinor: price, visits: attempts * 2,
    validationErrors, providerDeclines: failed - validationErrors };
}

export function buildWorld(label) {
  requireThat(LABELS.includes(label), 'unknown case label');
  const scope = scopeFor(label), rows = [];
  const add = (key, type, at, payload, visibleAt = at) => rows.push({ key, visibleAt, event: event(scope, key, type, at, payload) });
  ENDS.forEach((end, i) => SEGMENTS.forEach(segment => {
    // B13: the IN/debit windows after 09:30 reach the store at 10:06 and 10:08, after the case clock.
    const late = label === 'B13' && segment === 'IN/debit' && i >= 2;
    add(`window|${segment}|${i}`, 'revenue_window', end, windowRow(label, i, segment), late ? minute(66 + 2 * (i - 2)) : end);
  }));
  if (label === 'B11') {
    // Decoy: a checkout deploy lands at 09:31, just as IN/credit drops, but checkout's validation errors never move.
    add('change|checkout', 'deployment', minute(31), { service: 'checkout', fromVersion: 'v57', toVersion: 'v58', note: 'Address autocomplete update.' });
    add('health|checkout', 'service_health', minute(59), { service: 'checkout', segment: 'IN/credit', validationErrors: 2, providerHealthy: false });
    add('health|provider', 'service_health', minute(59), { service: 'payment-provider', segment: 'IN/credit', validationErrors: 0, providerHealthy: false });
  } else if (label === 'B12') {
    // The payment-provider deploy is the cause; a later checkout deploy is the decoy, with validation errors unchanged.
    add('change|provider', 'deployment', minute(31), { service: 'payment-provider', fromVersion: 'v40', toVersion: 'v41', note: 'Card authorisation client upgrade.' });
    add('change|checkout', 'deployment', minute(38), { service: 'checkout', fromVersion: 'v130', toVersion: 'v131', note: 'Promo banner copy update.' });
    add('health|checkout', 'service_health', minute(59), { service: 'checkout', segment: 'GB/debit', validationErrors: 6, providerHealthy: false });
    add('health|provider', 'service_health', minute(59), { service: 'payment-provider', segment: 'GB/debit', validationErrors: 0, providerHealthy: false });
  } else if (label === 'B13') {
    // IN/debit data after 09:30 is missing; a provider deploy and a vague support message offer an unsupported story.
    add('change|provider', 'deployment', minute(35), { service: 'payment-provider', fromVersion: 'v22', toVersion: 'v23', note: 'Provider retry timeout tuning.' });
    add('support', 'support_message', minute(54), { segment: 'IN/debit', tags: ['card'],
      message: 'My debit card payment took a long time to confirm. Did it go through?' });
  } else if (label === 'B14') {
    // The pricing change is the cause; a checkout deploy two minutes later is the decoy, with validation errors unchanged.
    add('change|pricing', 'pricing_configuration', minute(31), { service: 'pricing', segment: 'IN/credit', setting: 'unit_price_minor',
      fromMinor: 65000, toMinor: 39000, currency: 'INR' });
    add('change|checkout', 'deployment', minute(33), { service: 'checkout', fromVersion: 'v64', toVersion: 'v65', note: 'Saved card list update.' });
    add('health|checkout', 'service_health', minute(59), { service: 'checkout', segment: 'IN/credit', validationErrors: 2, providerHealthy: true });
    add('health|provider', 'service_health', minute(59), { service: 'payment-provider', segment: 'IN/credit', validationErrors: 0, providerHealthy: true });
  } else {
    // No change at all: the drop is a traffic mix shift, and the right answer is a cause, not an abstention.
    add('health|provider', 'service_health', minute(59), { service: 'payment-provider', segment: 'GB/debit', validationErrors: 0, providerHealthy: true });
  }
  return { label, scope, hiddenCause: CAUSES[label], rows };
}

export function observeWorld(world) {
  const scope = world.scope;
  const events = world.rows.filter(r => r.visibleAt <= scope.clock).map(r => r.event);
  for (const segment of SEGMENTS) {
    const receivedWindows = events.filter(e => e.type === 'revenue_window' && e.payload.segment === segment).length;
    events.push(event(scope, `coverage|${segment}`, 'observation_status', CUTOFF, { start: START, end: CUTOFF, segment,
      expectedWindows: 4, receivedWindows, coverage: receivedWindows === 4 ? 'complete' : receivedWindows === 0 ? 'missing' : 'partial',
      freshness: 'unknown', receivedAt: CUTOFF }));
  }
  events.sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
  return validateObservable({ version: VERSION, caseRef: scope.caseId, truthMode: 'SIMULATED', asOf: CUTOFF, events }, scope);
}

function judgment(world, observable) {
  const { label } = world;
  const ids = (type, target = null) => observable.events.filter(e => e.type === type
    && (target === null || e.payload.segment === target || e.payload.service === target)).map(e => e.id);
  const windows = target => ids('revenue_window', target);
  const groups = [];
  const group = (name, predicate, evidenceIds, target = null) => {
    const rows = evidenceIds.map(id => observable.events.find(e => e.id === id));
    requireThat(rows.length > 0 && evaluatePredicate(predicate, rows, target).supported, `${label} ${name}: ${predicate} does not hold`);
    groups.push({ name, predicate, evidenceIds, target });
  };
  if (label === 'B11') {
    group('provider discriminator', 'provider_unhealthy', [...windows('IN/credit'), ...ids('service_health', 'payment-provider')], 'payment-provider');
    group('validation counterevidence', 'validation_stable', [...windows('IN/credit'), ...ids('service_health', 'checkout')], 'IN/credit');
    group('affected conversion', 'conversion_drop', windows('IN/credit'), 'IN/credit');
    group('unaffected controls', 'conversion_stable', [...windows('IN/debit'), ...windows('GB/debit')]);
    group('decoy checkout deployment', 'deployment_observed', ids('deployment', 'checkout'), 'checkout');
  } else if (label === 'B12') {
    group('provider discriminator', 'provider_unhealthy', [...windows('GB/debit'), ...ids('service_health', 'payment-provider')], 'payment-provider');
    group('validation counterevidence', 'validation_stable', [...windows('GB/debit'), ...ids('service_health', 'checkout')], 'GB/debit');
    group('affected conversion', 'conversion_drop', windows('GB/debit'), 'GB/debit');
    group('unaffected controls', 'conversion_stable', [...windows('IN/debit'), ...windows('IN/credit')]);
    group('relevant version change', 'deployment_observed', ids('deployment', 'payment-provider'), 'payment-provider');
    group('decoy checkout deployment', 'deployment_observed', ids('deployment', 'checkout'), 'checkout');
  } else if (label === 'B13') {
    group('observed missingness', 'missing_windows', ids('observation_status'));
    group('complete segments stable', 'conversion_stable', [...windows('IN/credit'), ...windows('GB/debit')]);
    group('competing explanation', 'deployment_observed', ids('deployment', 'payment-provider'), 'payment-provider');
    group('vague support report', 'support_report', ids('support_message'));
  } else if (label === 'B14') {
    group('stable successes and rates', 'successes_stable', windows(null));
    group('lower unit price', 'price_drop', windows('IN/credit'), 'IN/credit');
    group('matching setting', 'pricing_change_observed', [...windows('IN/credit'), ...ids('pricing_configuration')], 'IN/credit');
    group('healthy validation', 'validation_stable', [...windows('IN/credit'), ...ids('service_health', 'checkout')], 'IN/credit');
    group('provider counterevidence', 'provider_healthy', ids('service_health', 'payment-provider'), 'payment-provider');
    group('decoy checkout deployment', 'deployment_observed', ids('deployment', 'checkout'), 'checkout');
  } else {
    group('composition discriminator', 'traffic_mix_changed', windows(null));
    group('stable within-segment conversion', 'conversion_stable', windows(null));
    group('stable validation rates', 'validation_stable', windows(null));
    group('reproducible aggregate change', 'aggregate_revenue_drop', windows(null));
    group('stable unit price', 'price_stable', windows(null));
    group('provider counterevidence', 'provider_healthy', ids('service_health', 'payment-provider'), 'payment-provider');
  }
  const action = {
    B11: { kind: 'read_only_check', target: 'payment-provider', approvalRequired: false, risk: 'read_only' },
    B12: { kind: 'simulated_rollback', target: 'payment-provider', fromVersion: 'v41', toVersion: 'v40', approvalRequired: true, risk: 'consequential' },
    B13: { kind: 'abstain', target: null, approvalRequired: false, risk: 'none' },
    B14: { kind: 'read_only_check', target: 'pricing.unit_price_minor', approvalRequired: false, risk: 'read_only' },
    B15: { kind: 'read_only_check', target: 'acquisition allocation', approvalRequired: false, risk: 'read_only' },
  }[label];
  return { privateCanary: `EVALUATOR_ONLY_${label}_RUBRIC_7c2a95`, label, caseRef: world.scope.caseId, split: 'fresh_holdout_2',
    hiddenCause: world.hiddenCause, expectedDiagnosis: label === 'B13' ? 'insufficient_evidence' : world.hiddenCause,
    aliases: { B11: ['payment provider incident', 'provider outage', 'payment provider degradation'],
      B12: ['payment provider regression', 'provider client deployment regression', 'card authorisation regression'],
      B13: ['insufficient evidence', 'underdetermined cause', 'cannot determine cause'],
      B14: ['pricing configuration error', 'unit price configuration error', 'pricing setting error'],
      B15: ['acquisition composition shift', 'traffic mix shift', 'segment mix shift'] }[label],
    affectedSegment: { B11: 'IN/credit', B12: 'GB/debit', B14: 'IN/credit' }[label] ?? null,
    relevantChangeIds: { B12: ids('deployment', 'payment-provider'), B14: ids('pricing_configuration') }[label] ?? [],
    groups, action, readOnlyNextStep: {
      B11: 'Check IN/credit provider status and reconcile decline codes; checkout validation never moved after v58.',
      B12: 'Inspect the approval-bound SIMULATED rollback of payment-provider v41 to v40; never execute from a finding.',
      B13: 'Request the IN/debit ingestion watermark and raw event counts for 09:30-10:00.',
      B14: 'Review the exact IN/credit unit_price_minor setting and change record.',
      B15: 'Check acquisition allocation by segment: volume moved from GB/debit to IN/debit at unchanged rates.' }[label],
    unresolvedAlternatives: label === 'B13' ? ['Delayed or missing IN/debit ingestion',
      'A real IN/debit payment disruption, possibly from the payment-provider deployment, hidden by missing telemetry'] : [],
    missingDiscriminators: label === 'B13' ? ['IN/debit revenue windows for 09:30-10:00',
      'Payment-provider health and decline counts for IN/debit after 09:35'] : [],
    forbiddenClaims: { B11: ['The checkout deployment caused the IN/credit drop', 'A checkout rollback is needed'],
      B12: ['The checkout deployment caused the GB/debit declines', 'A rollback without human approval'],
      B13: ['Confident delayed-ingestion diagnosis', 'Confident payment-provider regression from missing windows'],
      B14: ['The checkout deployment caused the drop', 'Fewer successful customers explain the drop'],
      B15: ['Within-segment conversion regressed', 'An unobserved change caused the drop'] }[label] };
}

export function frozenFiles() {
  const cases = LABELS.map(label => {
    const world = buildWorld(label), observable = observeWorld(world);
    return { observable, rubric: judgment(world, observable) };
  });
  return new Map([
    ...cases.map(c => [`${CASES}/${c.observable.caseRef}.json`, c.observable]),
    [RUBRIC, { version: 'benchmark-rubric-v1', privateCanary: 'EVALUATOR_ONLY_RUBRIC_B11_B15_7c2a95', frozenOn: '2026-10-05',
      rule: 'Fresh holdout frozen before the step-5 agent change, after B01-B10 had all been seen. Never tune prompts, tools or '
        + 'settings on these cases.',
      cases: cases.map(c => c.rubric) }],
  ]);
}

export function freeze() {
  for (const [name, value] of frozenFiles()) {
    const path = resolve(root, name);
    if (existsSync(path)) requireThat(canonical(JSON.parse(readFileSync(path, 'utf8'))) === canonical(value), `existing frozen file differs: ${name}`);
    else { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`); }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  requireThat(process.argv[2] === '--freeze', 'Only --freeze is supported; no model or scoring operation.');
  freeze();
  process.stdout.write('B11-B15 case files and rubric written or confirmed; no model calls.\n');
}
