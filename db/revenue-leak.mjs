import { createHash } from "node:crypto";

// Phase 1 contracts. Only recorded fixture observations enter detection; no
// evaluator answer or proposed action is present in this module.
export const GOLDEN_SCENARIO = Object.freeze({
  id: "golden-mobile-checkout-v1",
  version: 1,
  workspaceId: "phase1-golden-a",
  caseId: "case-golden-mobile-checkout",
  targetSegment: "mobile_safari",
  controlSegment: "desktop",
  baselineDays: Object.freeze([
    "2026-07-24", "2026-07-25", "2026-07-26", "2026-07-27",
    "2026-07-28", "2026-07-29", "2026-07-30",
  ]),
  observedDays: Object.freeze([
    "2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04",
    "2026-08-05", "2026-08-06", "2026-08-07",
  ]),
  minimumStarts: 100,
  minimumRelativeDropBps: 3000,
  maximumControlDropBps: 1000,
  truthMode: "FIXTURE",
});

const IDENTIFIER = /^[a-z0-9][a-z0-9_-]{0,127}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const SOURCES = new Set(["checkout_analytics", "payment_ledger"]);
const WINDOWS = new Set(["baseline", "observed"]);
const SEGMENTS = new Set(["mobile_safari", "desktop"]);
const SCENARIO_KEYS = ["baselineDays", "caseId", "controlSegment", "id", "maximumControlDropBps",
  "minimumRelativeDropBps", "minimumStarts", "observedDays", "targetSegment", "truthMode", "version", "workspaceId"];
const EVENT_KEYS = ["captures", "completed", "id", "observedDay", "revenueCents", "scenarioId",
  "segment", "source", "starts", "window", "workspaceId"];

function fail(message) { throw new TypeError(message); }
function exactKeys(value, expected, label) {
  if (Object.keys(value).sort().join("|") !== [...expected].sort().join("|")) fail(`${label} has unknown or missing fields`);
}
function requireId(value, field) {
  if (typeof value !== "string" || !IDENTIFIER.test(value)) fail(`${field} is invalid`);
  return value;
}
function requireInteger(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) fail(`${field} must be a nonnegative safe integer`);
  return value;
}
function requireDay(value) {
  if (typeof value !== "string" || !DAY.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))
    || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) fail("observedDay is invalid");
  return value;
}
export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
export function contentHash(value) { return sha256(canonical(value)); }

export function validateScenario(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("scenario must be an object");
  exactKeys(value, SCENARIO_KEYS, "scenario");
  requireId(value.id, "scenario.id");
  requireId(value.workspaceId, "scenario.workspaceId");
  requireId(value.caseId, "scenario.caseId");
  if (value.version !== 1 || value.truthMode !== "FIXTURE") fail("scenario version or truth mode is invalid");
  if (!SEGMENTS.has(value.targetSegment) || !SEGMENTS.has(value.controlSegment)
    || value.targetSegment === value.controlSegment) fail("scenario segments are invalid");
  for (const key of ["baselineDays", "observedDays"]) {
    if (!Array.isArray(value[key]) || value[key].length !== 7
      || new Set(value[key]).size !== 7) fail(`${key} must contain seven unique days`);
    value[key].forEach(requireDay);
    if (value[key].some((day, index) => index && Date.parse(day) - Date.parse(value[key][index - 1]) !== 86_400_000)) {
      fail(`${key} must be consecutive and ordered`);
    }
  }
  if (value.baselineDays.at(-1) >= value.observedDays[0]) fail("scenario windows overlap");
  requireInteger(value.minimumStarts, "minimumStarts");
  requireInteger(value.minimumRelativeDropBps, "minimumRelativeDropBps");
  requireInteger(value.maximumControlDropBps, "maximumControlDropBps");
  if (!value.minimumStarts || value.minimumRelativeDropBps > 10_000 || value.maximumControlDropBps > 10_000) {
    fail("scenario thresholds are invalid");
  }
  return value;
}

export function validateRecordedEvent(value, scenario = GOLDEN_SCENARIO) {
  validateScenario(scenario);
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("event must be an object");
  exactKeys(value, EVENT_KEYS, "event");
  requireId(value.id, "event.id");
  if (value.workspaceId !== scenario.workspaceId || value.scenarioId !== scenario.id) fail("event tenant or scenario mismatch");
  if (!SOURCES.has(value.source) || !WINDOWS.has(value.window) || !SEGMENTS.has(value.segment)) {
    fail("event source, window, or segment is invalid");
  }
  requireDay(value.observedDay);
  const allowedDays = value.window === "baseline" ? scenario.baselineDays : scenario.observedDays;
  if (!allowedDays.includes(value.observedDay)) fail("event day is outside its window");
  for (const field of ["starts", "completed", "captures", "revenueCents"]) requireInteger(value[field], field);
  if (value.source === "checkout_analytics") {
    if (!value.starts || value.completed > value.starts || value.captures || value.revenueCents) {
      fail("checkout observation counts are invalid");
    }
  } else if (value.starts || value.completed || (value.captures === 0) !== (value.revenueCents === 0)) {
    fail("payment observation counts are invalid");
  }
  return value;
}

function roundDiv(numerator, denominator) {
  if (denominator <= 0n) fail("metric denominator is zero");
  return Number((numerator + denominator / 2n) / denominator);
}
function group(events, window, segment) {
  const rows = events.filter((event) => event.window === window && event.segment === segment);
  const checkout = rows.filter((event) => event.source === "checkout_analytics");
  const payments = rows.filter((event) => event.source === "payment_ledger");
  const starts = checkout.reduce((sum, event) => sum + event.starts, 0);
  const completed = checkout.reduce((sum, event) => sum + event.completed, 0);
  const captures = payments.reduce((sum, event) => sum + event.captures, 0);
  const revenueCents = payments.reduce((sum, event) => sum + event.revenueCents, 0);
  if (![starts, completed, captures, revenueCents].every(Number.isSafeInteger)) {
    fail(`observation totals exceed safe integer range for ${window}/${segment}`);
  }
  if (completed !== captures) fail(`checkout and payment counts differ for ${window}/${segment}`);
  return { starts, completed, captures, revenueCents, conversionBps: roundDiv(BigInt(completed) * 10_000n, BigInt(starts)) };
}
function relativeDropBps(baseline, observed) {
  const numerator = BigInt(baseline.completed) * BigInt(observed.starts)
    - BigInt(observed.completed) * BigInt(baseline.starts);
  if (numerator <= 0n) return 0;
  return roundDiv(numerator * 10_000n, BigInt(baseline.completed) * BigInt(observed.starts));
}

export function detectRevenueLeak(scenarioInput, eventInput) {
  const scenario = validateScenario(scenarioInput);
  if (!Array.isArray(eventInput)) fail("events must be an array");
  const events = eventInput.map((event) => validateRecordedEvent(event, scenario));
  const expectedCount = 2 * 2 * 2 * 7;
  if (events.length !== expectedCount || new Set(events.map((event) => event.id)).size !== expectedCount) {
    fail("recorded event set is incomplete or duplicated");
  }
  const keys = new Set(events.map((event) => `${event.source}/${event.window}/${event.segment}/${event.observedDay}`));
  if (keys.size !== expectedCount) fail("recorded event day is duplicated");
  const allowedKeys = new Set();
  for (const source of SOURCES) for (const [window, days] of [["baseline", scenario.baselineDays], ["observed", scenario.observedDays]]) {
    for (const segment of SEGMENTS) for (const day of days) allowedKeys.add(`${source}/${window}/${segment}/${day}`);
  }
  if ([...keys].some((key) => !allowedKeys.has(key))) fail("recorded event set has an unexpected source day");
  for (const window of WINDOWS) for (const segment of SEGMENTS) for (const day of window === "baseline" ? scenario.baselineDays : scenario.observedDays) {
    const a = events.find((event) => event.source === "checkout_analytics" && event.window === window && event.segment === segment && event.observedDay === day);
    const b = events.find((event) => event.source === "payment_ledger" && event.window === window && event.segment === segment && event.observedDay === day);
    if (a.completed !== b.captures) fail(`checkout and payment counts differ on ${day}/${segment}`);
  }
  const baseline = group(events, "baseline", scenario.targetSegment);
  const observed = group(events, "observed", scenario.targetSegment);
  const controlBaseline = group(events, "baseline", scenario.controlSegment);
  const controlObserved = group(events, "observed", scenario.controlSegment);
  const targetDropBps = relativeDropBps(baseline, observed);
  const controlDropBps = relativeDropBps(controlBaseline, controlObserved);
  const expectedRevenueCents = roundDiv(BigInt(observed.starts) * BigInt(baseline.revenueCents), BigInt(baseline.starts));
  const projectedLeakCents = Math.max(0, expectedRevenueCents - observed.revenueCents);
  const metrics = {
    baseline, observed, controlBaseline, controlObserved,
    relativeDropBps: targetDropBps, controlRelativeDropBps: controlDropBps,
    expectedRevenueCents, projectedLeakCents,
  };
  const detected = baseline.starts >= scenario.minimumStarts
    && observed.starts >= scenario.minimumStarts
    && targetDropBps >= scenario.minimumRelativeDropBps
    && controlDropBps <= scenario.maximumControlDropBps
    && projectedLeakCents > 0;
  const signal = {
    id: `signal-${scenario.id}`, caseId: scenario.caseId, workspaceId: scenario.workspaceId,
    kind: "conversion_drop", methodVersion: "deterministic-v1", detected,
    metrics, truthMode: "FIXTURE",
  };
  const evidence = [
    { id: "evidence-mobile-funnel", source: "checkout_analytics", relation: "supports", claim: "Mobile Safari checkout conversion fell", eventIds: events.filter((event) => event.source === "checkout_analytics" && event.segment === scenario.targetSegment).map((event) => event.id).sort() },
    { id: "evidence-mobile-payment", source: "payment_ledger", relation: "supports", claim: "Captured Mobile Safari revenue fell", eventIds: events.filter((event) => event.source === "payment_ledger" && event.segment === scenario.targetSegment).map((event) => event.id).sort() },
    { id: "evidence-desktop-control", source: "checkout_analytics", relation: "contradicts", claim: "Campaign-wide checkout decline", eventIds: events.filter((event) => event.source === "checkout_analytics" && event.segment === scenario.controlSegment).map((event) => event.id).sort() },
  ].map((item) => ({ ...item, caseId: scenario.caseId, workspaceId: scenario.workspaceId, truthMode: "FIXTURE" }));
  const caseRecord = {
    id: scenario.caseId, workspaceId: scenario.workspaceId, scenarioId: scenario.id,
    scenarioVersion: scenario.version, title: "Mobile Safari checkout revenue leak",
    status: detected ? "detected" : "no_signal", truthMode: "FIXTURE",
    signalId: signal.id, evidenceIds: evidence.map((item) => item.id),
  };
  validateCaseRecord(caseRecord, signal, evidence, events);
  return { caseRecord, signal, evidence, events };
}

export function validateCaseRecord(caseRecord, signal, evidence, events) {
  if (!caseRecord || !signal || !Array.isArray(evidence) || !Array.isArray(events)) fail("case package is invalid");
  if (typeof caseRecord !== "object" || Array.isArray(caseRecord)) fail("case must be an object");
  exactKeys(caseRecord, ["evidenceIds", "id", "scenarioId", "scenarioVersion", "signalId", "status",
    "title", "truthMode", "workspaceId"], "case");
  requireId(caseRecord.id, "case.id");
  requireId(caseRecord.scenarioId, "case.scenarioId");
  requireInteger(caseRecord.scenarioVersion, "case.scenarioVersion");
  if (!caseRecord.scenarioVersion || typeof caseRecord.title !== "string" || !caseRecord.title.trim()) fail("case title or version is invalid");
  validateSignal(signal);
  if (caseRecord.workspaceId !== signal.workspaceId || caseRecord.id !== signal.caseId
    || caseRecord.signalId !== signal.id || caseRecord.truthMode !== "FIXTURE"
    || !["detected", "no_signal"].includes(caseRecord.status)
    || caseRecord.status !== (signal.detected ? "detected" : "no_signal")) fail("case and signal binding is invalid");
  if (!Array.isArray(caseRecord.evidenceIds) || caseRecord.evidenceIds.length !== evidence.length
    || new Set(caseRecord.evidenceIds).size !== evidence.length) fail("case evidence list is invalid");
  const eventIds = new Set(events.map((event) => event.id));
  if (eventIds.size !== events.length || events.some((event) => event.workspaceId !== caseRecord.workspaceId)) {
    fail("case recorded events are invalid");
  }
  for (const item of evidence) {
    validateEvidence(item, events);
    if (item.caseId !== caseRecord.id || item.workspaceId !== caseRecord.workspaceId
      || !caseRecord.evidenceIds.includes(item.id) || !["supports", "contradicts"].includes(item.relation)
      || !Array.isArray(item.eventIds) || item.eventIds.length === 0
      || new Set(item.eventIds).size !== item.eventIds.length
      || item.eventIds.some((id) => !eventIds.has(id))) fail("evidence reference is invalid");
  }
  return caseRecord;
}

export function validateSignal(signal) {
  if (!signal || typeof signal !== "object" || Array.isArray(signal)) fail("signal must be an object");
  exactKeys(signal, ["caseId", "detected", "id", "kind", "methodVersion", "metrics", "truthMode", "workspaceId"], "signal");
  requireId(signal.id, "signal.id");
  requireId(signal.caseId, "signal.caseId");
  requireId(signal.workspaceId, "signal.workspaceId");
  if (signal.kind !== "conversion_drop" || signal.methodVersion !== "deterministic-v1"
    || typeof signal.detected !== "boolean" || signal.truthMode !== "FIXTURE") fail("signal kind or truth mode is invalid");
  if (!signal.metrics || typeof signal.metrics !== "object" || Array.isArray(signal.metrics)) fail("signal metrics are invalid");
  exactKeys(signal.metrics, ["baseline", "observed", "controlBaseline", "controlObserved",
    "relativeDropBps", "controlRelativeDropBps", "expectedRevenueCents", "projectedLeakCents"], "signal metrics");
  for (const name of ["baseline", "observed", "controlBaseline", "controlObserved"]) {
    const metric = signal.metrics[name];
    if (!metric || typeof metric !== "object" || Array.isArray(metric)) fail("signal observation is invalid");
    exactKeys(metric, ["starts", "completed", "captures", "revenueCents", "conversionBps"], "signal observation");
    for (const field of ["starts", "completed", "captures", "revenueCents", "conversionBps"]) requireInteger(metric[field], field);
    if (!metric.starts || metric.completed > metric.starts || metric.captures !== metric.completed
      || metric.conversionBps > 10_000) fail("signal observation totals are invalid");
  }
  for (const field of ["relativeDropBps", "controlRelativeDropBps", "expectedRevenueCents", "projectedLeakCents"]) {
    requireInteger(signal.metrics[field], field);
  }
  if (signal.metrics.relativeDropBps > 10_000 || signal.metrics.controlRelativeDropBps > 10_000) fail("signal rate is invalid");
  return signal;
}

export function validateEvidence(item, events) {
  if (!item || typeof item !== "object" || Array.isArray(item)) fail("evidence must be an object");
  exactKeys(item, ["caseId", "claim", "eventIds", "id", "relation", "source", "truthMode", "workspaceId"], "evidence");
  requireId(item.id, "evidence.id");
  requireId(item.caseId, "evidence.caseId");
  requireId(item.workspaceId, "evidence.workspaceId");
  if (!SOURCES.has(item.source) || !["supports", "contradicts"].includes(item.relation)
    || item.truthMode !== "FIXTURE" || typeof item.claim !== "string" || !item.claim.trim()
    || !Array.isArray(item.eventIds) || !item.eventIds.length
    || new Set(item.eventIds).size !== item.eventIds.length) fail("evidence fields are invalid");
  const byId = new Map(events.map((event) => [event.id, event]));
  if (item.eventIds.some((id) => !byId.has(id) || byId.get(id).source !== item.source
    || byId.get(id).workspaceId !== item.workspaceId)) fail("evidence source event reference is invalid");
  return item;
}

export function buildGoldenEvents(scenario = GOLDEN_SCENARIO) {
  validateScenario(scenario);
  const mobileBaseline = [4, 4, 4, 4, 4, 4, 4];
  const mobileObserved = [2, 2, 2, 2, 2, 1, 1];
  const desktop = [4, 4, 4, 4, 4, 4, 4];
  const events = [];
  for (const [window, days] of [["baseline", scenario.baselineDays], ["observed", scenario.observedDays]]) {
    for (const segment of [scenario.targetSegment, scenario.controlSegment]) {
      const completed = segment === scenario.controlSegment ? desktop : window === "baseline" ? mobileBaseline : mobileObserved;
      days.forEach((observedDay, index) => {
        const stem = `${scenario.id}-${window}-${segment}-${observedDay}`;
        events.push({ id: `${stem}-checkout`, workspaceId: scenario.workspaceId, scenarioId: scenario.id,
          source: "checkout_analytics", window, segment, observedDay,
          starts: 20, completed: completed[index], captures: 0, revenueCents: 0 });
        events.push({ id: `${stem}-payment`, workspaceId: scenario.workspaceId, scenarioId: scenario.id,
          source: "payment_ledger", window, segment, observedDay,
          starts: 0, completed: 0, captures: completed[index], revenueCents: completed[index] * 5000 });
      });
    }
  }
  return events;
}
