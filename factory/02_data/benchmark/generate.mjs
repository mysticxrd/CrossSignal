// Trusted fixture authoring only. This module and everything under private/ are denied to tools.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CUTOFF, START, VERSION, SEGMENTS, digest, canonical, publicPacket, requireThat, validateObservable } from './contracts.mjs';
import { findingSchema, toolSchemas } from './schemas.mjs';
import { commonDefinitions } from './exposure.mjs';

export const ROOT = dirname(fileURLToPath(import.meta.url));
export const LABELS = Object.freeze(['B01', 'B02', 'B03', 'B04', 'B05']);
const endpoints = ['2026-09-01T09:15:00.000Z', '2026-09-01T09:30:00.000Z', '2026-09-01T09:45:00.000Z', CUTOFF];
const identity = (prefix, value) => `${prefix}_${digest(`frozen-benchmark-2026-10-01|${value}`).slice(0, 12)}`;
const causes = ['checkout_validation_regression', 'payment_provider_incident', 'acquisition_composition_shift', 'pricing_configuration_error', 'delayed_ingestion'];
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
export function buildWorld(label, alternative = false) {
  requireThat(LABELS.includes(label) && typeof alternative === 'boolean' && (!alternative || label === 'B05'), 'unknown fixture generator/alternative');
  const scope = scopeFor(label), rows = [];
  const add = (key, type, at, payload, visibleAt = at) => rows.push({ key, visibleAt, event: event(scope, key, type, at, payload) });
  for (let i = 0; i < endpoints.length; i++) for (let s = 0; s < SEGMENTS.length; s++) {
    const segment = SEGMENTS[s], post = i >= 2;
    let attempts = 100, successes = s === 0 ? 80 : 90, validationErrors = s === 0 ? 2 : 1, price = 50000;
    if (label === 'B01' && post && s === 0) { successes = 40; validationErrors = 42; }
    if (label === 'B02' && post && s === 0) successes = 40;
    if (label === 'B03') {
      attempts = (post ? [150, 50, 100] : [50, 150, 100])[s];
      successes = attempts * (s === 0 ? 0.6 : 0.9); validationErrors = 0;
    }
    if (label === 'B04' && post && s === 0) price = 40000;
    if (label === 'B05' && i === 3 && alternative) { attempts = 20; successes = s === 0 ? 16 : 18; validationErrors = 0; }
    const at = endpoints[i], failed = attempts - successes;
    const payload = { start: i === 0 ? START : endpoints[i - 1], end: at, segment, attempts, successes, failed,
      revenueMinor: successes * price, currency: 'INR', unitPriceMinor: price, visits: attempts * 2,
      validationErrors, providerDeclines: failed - validationErrors };
    const visibleAt = label === 'B05' && i === 3 ? (alternative ? null : '2026-09-01T10:05:00.000Z') : at;
    add(`window|${segment}|${i}`, 'revenue_window', at, payload, visibleAt);
  }
  if (label === 'B01') {
    add('change|checkout', 'deployment', '2026-09-01T09:31:00.000Z', { service: 'checkout', fromVersion: 'v141', toVersion: 'v142', note: 'Input validation update.' });
    add('change|notifications', 'deployment', '2026-09-01T09:43:00.000Z', { service: 'notifications', fromVersion: 'v8', toVersion: 'v9', note: 'Email template update.' });
    add('health|checkout', 'service_health', '2026-09-01T09:59:00.000Z', { service: 'checkout', segment: 'IN/debit', validationErrors: 42, providerHealthy: true });
    add('health|provider', 'service_health', '2026-09-01T09:59:00.000Z', { service: 'payment-provider', segment: 'IN/debit', validationErrors: 0, providerHealthy: true });
    add('support', 'support_message', '2026-09-01T09:58:00.000Z', { segment: 'IN/debit', tags: ['checkout', 'card'], message: 'Debit form rejects valid input before payment submission.' });
  } else if (label === 'B02') {
    add('change|notifications', 'deployment', '2026-09-01T09:31:00.000Z', { service: 'notifications', fromVersion: 'v8', toVersion: 'v9', note: 'Email template update.' });
    add('health|checkout', 'service_health', '2026-09-01T09:59:00.000Z', { service: 'checkout', segment: 'IN/debit', validationErrors: 2, providerHealthy: false });
    add('health|provider', 'service_health', '2026-09-01T09:59:00.000Z', { service: 'payment-provider', segment: 'IN/debit', validationErrors: 0, providerHealthy: false });
    add('support', 'support_message', '2026-09-01T09:58:00.000Z', { segment: 'IN/debit', tags: ['checkout'], message: 'Checkout stopped working after the email rollout, according to the customer.' });
  } else if (label === 'B03') {
    add('change|checkout', 'deployment', '2026-09-01T09:31:00.000Z', { service: 'checkout', fromVersion: 'v141', toVersion: 'v142', note: 'Button spacing update.' });
    add('health|provider', 'service_health', '2026-09-01T09:59:00.000Z', { service: 'payment-provider', segment: 'IN/debit', validationErrors: 0, providerHealthy: true });
  } else if (label === 'B04') {
    add('setting|price', 'pricing_configuration', '2026-09-01T09:31:00.000Z', { service: 'pricing', segment: 'IN/debit', setting: 'unit_price_minor', fromMinor: 50000, toMinor: 40000, currency: 'INR' });
    add('health|checkout', 'service_health', '2026-09-01T09:59:00.000Z', { service: 'checkout', segment: 'IN/debit', validationErrors: 2, providerHealthy: true });
    add('health|provider', 'service_health', '2026-09-01T09:59:00.000Z', { service: 'payment-provider', segment: 'IN/debit', validationErrors: 0, providerHealthy: true });
  }
  return { privateCanary: `EVALUATOR_ONLY_${label}_WORLD_6fd94c`, label, rootCause: alternative ? 'actual_acquisition_volume_loss_with_missing_telemetry' : causes[LABELS.indexOf(label)],
    mechanism: alternative ? 'Latest source window unavailable; actual attempts fell.' : label === 'B05' ? 'Latest complete source windows arrive after the cutoff.' : 'Rows available at their recorded event time.',
    scope, rows };
}
export function observeWorld(world) {
  const scope = world.scope;
  const events = world.rows.filter(r => r.visibleAt !== null && r.visibleAt <= scope.clock).map(r => r.event);
  for (const segment of SEGMENTS) {
    const receivedWindows = events.filter(e => e.type === 'revenue_window' && e.payload.segment === segment).length;
    events.push(event(scope, `coverage|${segment}`, 'observation_status', CUTOFF, { start: START, end: CUTOFF, segment,
      expectedWindows: 4, receivedWindows, coverage: receivedWindows === 4 ? 'complete' : receivedWindows === 0 ? 'missing' : 'partial',
      freshness: 'unknown', receivedAt: CUTOFF }));
  }
  events.sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
  const observable = { version: VERSION, caseRef: scope.caseId, truthMode: 'SIMULATED', asOf: CUTOFF, events };
  validateObservable(observable, scope);
  return observable;
}
const aliases = [
  ['checkout validation regression', 'checkout validation failure', 'input validation regression'],
  ['payment provider incident', 'payment provider availability failure', 'provider outage'],
  ['acquisition composition shift', 'acquisition mix shift', 'traffic composition shift'],
  ['pricing configuration error', 'unit price configuration error', 'pricing setting error'],
  ['insufficient evidence', 'underdetermined cause', 'cannot determine cause'],
];
function judgment(label, world, observable) {
  const ids = (type, target = null) => observable.events.filter(e => e.type === type && (target === null || e.payload.segment === target || e.payload.service === target)).map(e => e.id);
  const windows = target => ids('revenue_window', target);
  const groups = [];
  const group = (name, predicate, evidenceIds, target = null) => groups.push({ name, predicate, evidenceIds, target });
  if (label === 'B01') {
    group('affected conversion', 'conversion_drop', windows('IN/debit'), 'IN/debit');
    group('unaffected controls', 'conversion_stable', [...windows('IN/credit'), ...windows('GB/debit')]);
    group('validation discriminator', 'validation_increased', [...windows('IN/debit'), ...ids('service_health', 'checkout')], 'IN/debit');
    group('relevant version change', 'deployment_observed', ids('deployment', 'checkout'), 'checkout');
    group('provider counterevidence', 'provider_healthy', ids('service_health', 'payment-provider'), 'payment-provider');
    group('stable demand', 'traffic_stable', windows(null));
    group('support corroboration', 'support_report', ids('support_message'));
  } else if (label === 'B02') {
    group('provider discriminator', 'provider_unhealthy', [...windows('IN/debit'), ...ids('service_health', 'payment-provider')], 'payment-provider');
    group('validation counterevidence', 'validation_stable', [...windows('IN/debit'), ...ids('service_health', 'checkout')], 'IN/debit');
    group('unrelated deployment', 'deployment_observed', ids('deployment'), 'notifications');
    group('affected conversion', 'conversion_drop', windows('IN/debit'), 'IN/debit');
  } else if (label === 'B03') {
    group('composition discriminator', 'traffic_mix_changed', windows(null));
    group('stable within-segment conversion', 'conversion_stable', windows(null));
    group('reproducible aggregate change', 'aggregate_revenue_drop', windows(null));
    group('stable unit price', 'price_stable', windows(null));
    group('provider counterevidence', 'provider_healthy', ids('service_health', 'payment-provider'), 'payment-provider');
  } else if (label === 'B04') {
    group('stable successes and rates', 'successes_stable', windows(null));
    group('lower unit price', 'price_drop', windows('IN/debit'), 'IN/debit');
    group('matching setting', 'pricing_change_observed', [...ids('pricing_configuration'), ...windows('IN/debit')], 'IN/debit');
    group('healthy validation', 'validation_stable', [...windows('IN/debit'), ...ids('service_health', 'checkout')], 'IN/debit');
    group('provider counterevidence', 'provider_healthy', ids('service_health', 'payment-provider'), 'payment-provider');
  } else {
    group('observed missingness', 'missing_windows', ids('observation_status'));
    group('received-row revenue signal', 'aggregate_revenue_drop', windows(null));
  }
  const action = label === 'B01' ? { kind: 'simulated_rollback', target: 'checkout', fromVersion: 'v142', toVersion: 'v141', approvalRequired: true, risk: 'consequential' }
    : { kind: label === 'B05' ? 'abstain' : 'read_only_check', target: { B02: 'payment-provider', B03: 'acquisition allocation', B04: 'pricing.unit_price_minor', B05: null }[label], approvalRequired: false, risk: label === 'B05' ? 'none' : 'read_only' };
  return { privateCanary: `EVALUATOR_ONLY_${label}_RUBRIC_85c19a`, label, caseRef: world.scope.caseId,
    split: ['B01', 'B02'].includes(label) ? 'development' : 'frozen_transfer', hiddenCause: world.rootCause,
    expectedDiagnosis: label === 'B05' ? 'insufficient_evidence' : world.rootCause, aliases: aliases[LABELS.indexOf(label)],
    affectedSegment: ['B01', 'B02', 'B04'].includes(label) ? 'IN/debit' : null,
    relevantChangeIds: label === 'B01' ? ids('deployment', 'checkout') : label === 'B04' ? ids('pricing_configuration') : [],
    groups, action, readOnlyNextStep: { B01: 'Inspect approval-bound SIMULATED rollback proposal; never execute from a finding.',
      B02: 'Check provider status and reconcile decline codes.', B03: 'Check acquisition allocation by observed segment; no named campaign is established.',
      B04: 'Review the exact IN/debit unit_price_minor setting and change record.',
      B05: 'Request the source ingestion watermark and raw event count for the missing 09:45-10:00 interval.' }[label],
    unresolvedAlternatives: label === 'B05' ? ['Delayed or missing ingestion', 'Actual demand or checkout/payment disruption with incomplete telemetry'] : [],
    missingDiscriminators: label === 'B05' ? ['Source ingestion watermark and raw count for 09:45-10:00', 'Independent provider/validation telemetry for the missing interval'] : [],
    forbiddenClaims: { B01: ['Most recent notifications deployment caused checkout failure', 'Real revenue recovered'],
      B02: ['Checkout regression inferred from unrelated deployment alone', 'Checkout rollback fixes provider availability'],
      B03: ['Within-segment conversion regressed', 'An invented named campaign caused the shift'],
      B04: ['Fewer successful customers explain the drop', 'Checkout regression explains the price change'],
      B05: ['Confident delayed-ingestion diagnosis from private truth', 'Invented freshness/provider/validation facts'] }[label] };
}
export function generatedPackage() {
  const worlds = LABELS.map(label => buildWorld(label));
  const cases = worlds.map(world => {
    const observable = observeWorld(world), rubric = judgment(world.label, world, observable);
    return { label: world.label, scope: world.scope, observable, rubric };
  });
  const alternate = buildWorld('B05', true);
  return { cases, worlds: [...worlds, alternate], manifest: { version: 'benchmark-freeze-v1', truthMode: 'SIMULATED',
    authoredFamilyExposure: 'Authors know the five families; transfer means frozen before integration, not pristine holdout.',
    scoredCalls: 0, cases: cases.map(c => ({ label: c.label, caseRef: c.scope.caseId, split: c.rubric.split,
      observableFile: `observable/${c.scope.caseId}.json`, observableHash: digest(c.observable), publicPacketHash: digest(publicPacket(c.observable, c.scope)),
      rubricHash: digest(c.rubric) })),
    underidentification: { caseRef: alternate.scope.caseId, privateWorldHashes: [digest(worlds[4]), digest(alternate)],
      observableHashes: [digest(observeWorld(worlds[4])), digest(observeWorld(alternate))] } } };
}
export function frozenFiles() {
  const p = generatedPackage();
  return new Map([
    ...p.cases.map(c => [`observable/${c.scope.caseId}.json`, c.observable]),
    ['private/worlds.json', { version: 'benchmark-world-v1', privateCanary: 'EVALUATOR_ONLY_WORLD_LEDGER_16ac7d', worlds: p.worlds }],
    ['private/rubric.json', { version: 'benchmark-rubric-v1', privateCanary: 'EVALUATOR_ONLY_RUBRIC_2fc837', cases: p.cases.map(c => c.rubric),
      semanticAdjudication: 'Method-blinded human reviews every planned artifact, records reasons and disagreements; no investigator self-grading or paid judge.',
      plannedArtifacts: 50, diagnosisDenominator: 4, zeroCitationPrecision: { value: null, reason: 'no_citations' },
      contradictionScale: ['0 absent', '1 generic or irrelevant', '2 specific alternative/falsifier with discriminating evidence'],
      activeSearch: 'Tool model: purposeful leading-hypothesis test, result and update. Single-shot/rules: not applicable.',
      changes: 'Version any correction and regrade all methods; retain all original findings/reports.' }],
    ['private/manifest.json', p.manifest],
    ['schema/finding.json', findingSchema],
    ['schema/tools.json', toolSchemas],
    ['schema/common-definitions.json', commonDefinitions],
  ]);
}
export function assertFreezeAllowed(gateText) {
  requireThat(!/^decision:\s*accepted\s*$/m.test(gateText), 'Never regenerate accepted Data evidence; use a reviewed version/transition.');
}
export function freeze() {
  const gatePath = resolve(ROOT, '../output/HUMAN_GATE.md');
  assertFreezeAllowed(existsSync(gatePath) ? readFileSync(gatePath, 'utf8') : '');
  for (const [name, value] of frozenFiles()) {
    const path = resolve(ROOT, name), bytes = `${JSON.stringify(value, null, 2)}\n`;
    if (existsSync(path)) {
      if (canonical(JSON.parse(readFileSync(path, 'utf8'))) !== canonical(value)) throw new Error(`Existing frozen file differs: ${name}`);
    } else { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, bytes); }
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] !== '--freeze') throw new Error('Only --freeze is supported; no scoring or runtime operation.');
  freeze(); process.stdout.write('Five-case data freeze prepared; no model calls.\n');
}
