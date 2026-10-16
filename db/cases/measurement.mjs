import { digest, requireThat as check } from '../benchmark/contracts.mjs';

// Synthetic demonstration parameters, frozen before any investigation. Not a real-world detector calibration.
export const POLICY = Object.freeze({ version: 'saas-conversion-v1', windowMinutes: 15, completionMinutes: 10,
  arrivalMinutes: 5, minimumIntents: 80, dropPoints: 20, controlTolerancePoints: 5, recoveryTolerancePoints: 5,
  cohorts: ['new-self-serve', 'new-assisted'], sources: ['intent', 'payment', 'subscription'] });
export const addMinutes = (time, minutes) => new Date(Date.parse(time) + minutes * 60000).toISOString();
export const rate = (successes, intents) => intents ? successes / intents * 100 : null;
export const iso = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;

function uniqueEvents(events) {
  const rows = new Map();
  for (const event of events) {
    check(typeof event.id === 'string' && event.id.length > 0 && typeof event.intentId === 'string', 'invalid_event_identity');
    check(POLICY.sources.includes(event.kind) && POLICY.cohorts.includes(event.cohort), 'invalid_event_kind_or_cohort');
    check(iso(event.occurredAt) && iso(event.availableAt) && event.availableAt >= event.occurredAt, 'invalid_event_time');
    check(!rows.has(event.id) || digest(rows.get(event.id)) === digest(event), 'conflicting_duplicate_event');
    if (event.kind === 'intent') check(event.eligible === true && event.purchaseType === 'new_subscription', 'invalid_purchase_intent');
    else check(typeof event.paymentId === 'string' && ['succeeded', 'failed', 'activated'].includes(event.status)
      && (event.kind === 'subscription' ? event.status === 'activated' : event.status !== 'activated'), 'invalid_conversion_event');
    rows.set(event.id, event);
  }
  const intents = new Map();
  for (const event of rows.values()) if (event.kind === 'intent') {
    check(!intents.has(event.intentId), 'duplicate_intent_identity'); intents.set(event.intentId, event);
  }
  for (const event of rows.values()) if (event.kind !== 'intent') {
    const intent = intents.get(event.intentId);
    check(intent && event.cohort === intent.cohort && event.occurredAt >= intent.occurredAt, 'invalid_intent_relationship');
  }
  return [...rows.values()];
}

export function measure({ events, coverage, asOf }, { start, end, cohort }) {
  check(iso(start) && iso(end) && iso(asOf) && start < end && POLICY.cohorts.includes(cohort), 'invalid_window');
  const completionEnd = addMinutes(end, POLICY.completionMinutes);
  const complete = asOf >= addMinutes(completionEnd, POLICY.arrivalMinutes) && POLICY.sources.every(source =>
    coverage.some(c => c.source === source && c.cohort === cohort && iso(c.from) && iso(c.through)
      && c.from <= start && c.through >= completionEnd && iso(c.availableAt) && c.availableAt <= asOf));
  const all = uniqueEvents(events).filter(e => e.availableAt <= asOf);
  const intents = all.filter(e => e.kind === 'intent' && e.cohort === cohort && e.occurredAt >= start && e.occurredAt < end);
  let successes = 0;
  for (const intent of intents) {
    const deadline = addMinutes(intent.occurredAt, POLICY.completionMinutes);
    const payments = all.filter(e => e.kind === 'payment' && e.intentId === intent.intentId && e.status === 'succeeded'
      && e.occurredAt <= deadline).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
    const first = payments[0];
    if (first && all.some(e => e.kind === 'subscription' && e.intentId === intent.intentId && e.paymentId === first.paymentId
      && e.occurredAt >= first.occurredAt && e.occurredAt <= deadline)) successes++;
  }
  const mature = asOf >= addMinutes(completionEnd, POLICY.arrivalMinutes);
  const sufficient = complete && mature && intents.length >= POLICY.minimumIntents;
  return { start, end, cohort, intents: intents.length, successes, complete, mature, sufficient,
    conversionPercent: sufficient ? rate(successes, intents.length) : null,
    limitation: !mature ? 'Cohort has not matured' : !complete ? 'Source coverage is incomplete'
      : intents.length < POLICY.minimumIntents ? 'Too few eligible purchase intents' : null };
}

export function snapshotOf(caseId, capture, windows, observations) {
  const metrics = windows.flatMap(window => POLICY.cohorts.map(cohort => {
    const value = measure(capture, { ...window, cohort });
    return { id: `${caseId}:metric:${window.start}:${cohort}`, kind: 'conversion', period: window.period, ...value };
  }));
  const aggregate = (period, cohort) => {
    const rows = metrics.filter(r => r.period === period && r.cohort === cohort);
    const sufficient = rows.length === 2 && rows.every(r => r.sufficient);
    const intents = rows.reduce((n, r) => n + r.intents, 0), successes = rows.reduce((n, r) => n + r.successes, 0);
    return { intents, successes, sufficient, conversionPercent: sufficient ? rate(successes, intents) : null };
  };
  const affected = POLICY.cohorts[0], control = POLICY.cohorts[1];
  const baseline = aggregate('baseline', affected), incident = aggregate('incident', affected);
  const controlBaseline = aggregate('baseline', control), controlIncident = aggregate('incident', control);
  const sufficient = [baseline, incident, controlBaseline, controlIncident].every(m => m.sufficient);
  const dropPoints = sufficient ? baseline.conversionPercent - incident.conversionPercent : null;
  const detected = sufficient && dropPoints >= POLICY.dropPoints
    && Math.abs(controlBaseline.conversionPercent - controlIncident.conversionPercent) <= POLICY.controlTolerancePoints;
  const evidence = [...metrics, ...observations.filter(e => e.availableAt <= capture.asOf).map(e => ({ ...e, id: `${caseId}:${e.id}` }))];
  check(new Set(evidence.map(e => e.id)).size === evidence.length, 'duplicate_evidence_id');
  const body = { version: POLICY.version, caseId, asOf: capture.asOf, policyHash: digest(POLICY), evidence,
    signal: { detected, sufficient, affected, baseline, incident, controlBaseline, controlIncident, dropPoints } };
  return { ...body, hash: digest(body) };
}

export function measurementPlan(snapshot) {
  return { version: POLICY.version, policyHash: digest(POLICY), affected: POLICY.cohorts[0], control: POLICY.cohorts[1],
    windows: 2, windowMinutes: POLICY.windowMinutes, completionMinutes: POLICY.completionMinutes, arrivalMinutes: POLICY.arrivalMinutes,
    minimumIntentsPerWindow: POLICY.minimumIntents, baselinePercent: snapshot.signal.baseline.conversionPercent,
    incidentPercent: snapshot.signal.incident.conversionPercent,
    targetPercent: snapshot.signal.baseline.conversionPercent === null ? null : snapshot.signal.baseline.conversionPercent - POLICY.recoveryTolerancePoints,
    controlBaselinePercent: snapshot.signal.controlBaseline.conversionPercent,
    controlTolerancePoints: POLICY.controlTolerancePoints, anchor: 'actual_execution_or_explicit_no_action' };
}

export function assessOutcome(capture, plan, anchor, periodStart = anchor) {
  check(plan.version === POLICY.version && plan.policyHash === digest(POLICY), 'measurement_policy_mismatch');
  const windows = Array.from({ length: plan.windows }, (_, i) => ({ start: addMinutes(periodStart, i * plan.windowMinutes),
    end: addMinutes(periodStart, (i + 1) * plan.windowMinutes) }));
  const rows = windows.flatMap(window => POLICY.cohorts.map(cohort => measure(capture, { ...window, cohort })));
  const end = windows.at(-1).end;
  const complete = rows.every(r => r.sufficient) && plan.targetPercent !== null;
  const affected = rows.filter(r => r.cohort === plan.affected), controls = rows.filter(r => r.cohort === plan.control);
  const total = (records, key) => records.reduce((n, r) => n + r[key], 0);
  const observedPercent = complete ? rate(total(affected, 'successes'), total(affected, 'intents')) : null;
  const changePoints = complete ? observedPercent - plan.incidentPercent : null;
  const controlsStable = complete && controls.every(r => Math.abs(r.conversionPercent - plan.controlBaselinePercent) <= plan.controlTolerancePoints);
  const met = complete && controlsStable && affected.every(r => r.conversionPercent >= plan.targetPercent);
  return { planHash: digest(plan), anchor, start: periodStart, end, asOf: capture.asOf, rows,
    state: !complete ? 'inconclusive' : met ? 'criterion_met' : 'criterion_not_met', observedPercent, changePoints,
    direction: !complete ? 'unknown' : changePoints > 0 ? 'improved' : changePoints < 0 ? 'worsened' : 'unchanged',
    controlsStable, causalClaim: false, caveat: 'Observed conversion in a synthetic world; this does not prove causality or real customer impact.' };
}
