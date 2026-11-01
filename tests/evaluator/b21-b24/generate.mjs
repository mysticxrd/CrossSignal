// Evaluator-only: authors the matched twin cases B21-B24 and their hidden rubric. Frozen on 2026-11-01, before any
// abstention fix, because an abstention fix could otherwise learn "missing data means nothing is wrong".
// One late-data story, two hidden truths, two pulls. At T1 the IN/debit rows after 09:30 have not landed, and B21 (harmless)
// and B22 (a real provider outage) show the same evidence, so neither can be told apart from the other. At T2 the same rows
// have landed, and B23 and B24 diverge. Claude wrote these cases knowing the agent's weak spots from B01-B20.
// db/, scripts/ and the isolated worker never import this file or read the rubric. Public case files hold only
// observations, named by case reference, with no label or answer.
// Usage: node tests/evaluator/b21-b24/generate.mjs --freeze   (writes missing files; an existing file must match)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CUTOFF, SEGMENTS, START, VERSION, canonical, digest, requireThat, validateObservable } from '../../../db/benchmark/contracts.mjs';
import { evaluatePredicate } from '../../../factory/02_data/benchmark/predicates.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
export const LABELS = Object.freeze(['B21', 'B22', 'B23', 'B24']);
export const CASES = 'db/benchmark/cases/b21-b24';
export const RUBRIC = 'tests/evaluator/b21-b24/rubric.json';
const ENDS = ['2026-09-01T09:15:00.000Z', '2026-09-01T09:30:00.000Z', '2026-09-01T09:45:00.000Z', CUTOFF];
// A new seed, so no case reference or evidence id repeats one from B01-B20.
const identity = (prefix, value) => `${prefix}_${digest(`twin-benchmark-2026-11-01|${value}`).slice(0, 12)}`;
const minute = n => new Date(Date.parse(START) + n * 60_000).toISOString();
const SHAPE = Object.freeze({ B21: ['harmless', 'T1'], B22: ['outage', 'T1'], B23: ['harmless', 'T2'], B24: ['outage', 'T2'] });
const HIDDEN = Object.freeze({ harmless: 'delayed_ingestion', outage: 'payment_provider_incident' });
// The late rows land by 10:10. Every case keeps the frozen 09:00-10:00 frame, so T2 is the same hour read after they landed.
const PULLS = Object.freeze({ T1: CUTOFF, T2: minute(70) });

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
// differ from B11-B15. Failures that are not validation errors are provider declines.
const NORMAL = { 'IN/debit': [180, 153, 9, 42000], 'IN/credit': [90, 81, 2, 61000], 'GB/debit': [130, 111, 6, 52000] };
function windowRow(world, i, segment) {
  let [attempts, successes, validationErrors, price] = NORMAL[segment];
  // The outage: payment-provider v53 breaks IN/debit authorisations (declines 18 -> 72); validation errors stay put.
  if (world === 'outage' && i >= 2 && segment === 'IN/debit') successes = 99;
  const failed = attempts - successes;
  return { start: i === 0 ? START : ENDS[i - 1], end: ENDS[i], segment, attempts, successes, failed,
    revenueMinor: successes * price, currency: 'INR', unitPriceMinor: price, visits: attempts * 2,
    validationErrors, providerDeclines: failed - validationErrors };
}

export function buildWorld(label) {
  requireThat(LABELS.includes(label), 'unknown case label');
  const [world, pull] = SHAPE[label], scope = scopeFor(label), rows = [];
  const add = (key, type, at, payload, visibleAt = at) => rows.push({ key, visibleAt, event: event(scope, key, type, at, payload) });
  ENDS.forEach((end, i) => SEGMENTS.forEach(segment => {
    // The IN/debit windows after 09:30 reach the store at 10:06 and 10:08, in both worlds.
    const late = segment === 'IN/debit' && i >= 2;
    add(`window|${segment}|${i}`, 'revenue_window', end, windowRow(world, i, segment), late ? minute(66 + 2 * (i - 2)) : end);
  }));
  // On time in both worlds, so these fit either story: the deploy could be the cause, and the support message is vague.
  add('change|provider', 'deployment', minute(31), { service: 'payment-provider', fromVersion: 'v52', toVersion: 'v53', note: 'Card authorisation client upgrade.' });
  add('support', 'support_message', minute(48), { segment: 'IN/debit', tags: ['card'], message: 'My debit card payment is taking ages. Is something going on?' });
  // The one reading that tells the worlds apart lands last.
  add('health|provider', 'service_health', minute(59), { service: 'payment-provider', segment: 'IN/debit', validationErrors: 0,
    providerHealthy: world === 'harmless' }, minute(70));
  return { label, world, pull, scope, hiddenCause: HIDDEN[world], rows };
}

export function observeWorld(world) {
  const scope = world.scope;
  const events = world.rows.filter(r => r.visibleAt <= PULLS[world.pull]).map(r => r.event);
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
  const { label, pull } = world, t1 = pull === 'T1', outage = world.world === 'outage';
  const ids = (type, target = null) => observable.events.filter(e => e.type === type
    && (target === null || e.payload.segment === target || e.payload.service === target)).map(e => e.id);
  const windows = target => ids('revenue_window', target);
  const groups = [];
  const group = (name, predicate, evidenceIds, target = null) => {
    const rows = evidenceIds.map(id => observable.events.find(e => e.id === id));
    requireThat(rows.length > 0 && evaluatePredicate(predicate, rows, target).supported, `${label} ${name}: ${predicate} does not hold`);
    groups.push({ name, predicate, evidenceIds, target });
  };
  if (t1) {
    group('observed missingness', 'missing_windows', ids('observation_status'));
    group('complete segments stable', 'conversion_stable', [...windows('IN/credit'), ...windows('GB/debit')]);
    group('competing explanation', 'deployment_observed', ids('deployment', 'payment-provider'), 'payment-provider');
    group('vague support report', 'support_report', ids('support_message'));
  } else if (outage) {
    group('provider discriminator', 'provider_unhealthy', [...windows('IN/debit'), ...ids('service_health', 'payment-provider')], 'payment-provider');
    group('validation counterevidence', 'validation_stable', windows('IN/debit'), 'IN/debit');
    group('affected conversion', 'conversion_drop', windows('IN/debit'), 'IN/debit');
    group('unaffected controls', 'conversion_stable', [...windows('IN/credit'), ...windows('GB/debit')]);
    group('relevant version change', 'deployment_observed', ids('deployment', 'payment-provider'), 'payment-provider');
  } else {
    group('stable within-segment conversion', 'conversion_stable', windows(null));
    group('provider counterevidence', 'provider_healthy', ids('service_health', 'payment-provider'), 'payment-provider');
    group('harmless version change', 'deployment_observed', ids('deployment', 'payment-provider'), 'payment-provider');
  }
  const action = t1 ? { kind: 'abstain', target: null, approvalRequired: false, risk: 'none' }
    : outage ? { kind: 'simulated_rollback', target: 'payment-provider', fromVersion: 'v53', toVersion: 'v52', approvalRequired: true, risk: 'consequential' }
      : { kind: 'none', target: null, approvalRequired: false, risk: 'none' };
  return { privateCanary: `EVALUATOR_ONLY_${label}_RUBRIC_e41d07`, label, caseRef: world.scope.caseId, split: 'twin_holdout',
    twin: { pair: 'late-in-debit', world: world.world, pull },
    // At T1 the answer must also keep the outage open and recommend something: see gradeCause in grade-b01.mjs.
    ...(t1 ? { keepOpen: 'payment_provider_incident' } : {}),
    hiddenCause: world.hiddenCause, expectedDiagnosis: t1 ? 'insufficient_evidence' : outage ? 'payment_provider_incident' : 'no_incident',
    aliases: t1 ? ['insufficient evidence', 'underdetermined cause', 'cannot determine cause']
      : outage ? ['payment provider regression', 'provider client deployment regression', 'card authorisation regression']
        : ['no incident', 'late data only', 'no business decline'],
    affectedSegment: !t1 && outage ? 'IN/debit' : null,
    relevantChangeIds: !t1 && outage ? ids('deployment', 'payment-provider') : [],
    groups, action, readOnlyNextStep: t1 ? 'Request the IN/debit ingestion watermark, raw event counts and payment-provider health for 09:30-10:00.'
      : outage ? 'Inspect the approval-bound SIMULATED rollback of payment-provider v53 to v52; never execute from a finding.'
        : 'None needed: the late IN/debit rows landed at the usual rates and the provider stayed healthy.',
    unresolvedAlternatives: t1 ? ['Delayed or missing IN/debit ingestion',
      'A real IN/debit payment disruption, possibly from the payment-provider deployment, hidden by missing telemetry'] : [],
    missingDiscriminators: t1 ? ['IN/debit revenue windows for 09:30-10:00', 'Payment-provider health and decline counts for IN/debit after 09:31'] : [],
    forbiddenClaims: t1 ? ['Confident delayed-ingestion diagnosis', 'Confident payment-provider regression from missing windows', 'Nothing is wrong']
      : outage ? ['The data is only late', 'A rollback without human approval'] : ['The provider deployment caused a revenue drop', 'A rollback is needed'] };
}

export function frozenFiles() {
  const cases = LABELS.map(label => {
    const world = buildWorld(label), observable = observeWorld(world);
    return { observable, rubric: judgment(world, observable) };
  });
  return new Map([
    ...cases.map(c => [`${CASES}/${c.observable.caseRef}.json`, c.observable]),
    [RUBRIC, { version: 'benchmark-rubric-v1', privateCanary: 'EVALUATOR_ONLY_RUBRIC_B21_B24_e41d07', frozenOn: '2026-11-01',
      rule: 'Matched twin holdout frozen before any abstention fix, after B01-B20 had all been seen. Never tune prompts, tools or '
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
  process.stdout.write('B21-B24 case files and rubric written or confirmed; no model calls.\n');
}
