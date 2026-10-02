import {
  contentHash, detectRevenueLeak, GOLDEN_SCENARIO, validateRecordedEvent,
  validateScenario,
} from "./revenue-leak.mjs";

// Bounded v1 Investigator. Its only input is a tenant-scoped projection of the
// persisted Case and recorded fixture rows. No evaluator answer or model output
// is accepted, and no action is proposed by this module.
const INPUT_KEYS = ["caseRow", "signalRow", "evidenceRows", "eventRows", "citationRows"];
const CASE_KEYS = ["workspaceId", "id", "scenarioId", "scenarioVersion", "scenarioHash",
  "title", "status", "truthMode", "contentHash"];
const SIGNAL_KEYS = ["workspaceId", "id", "caseId", "kind", "methodVersion", "detected",
  "metrics", "contentHash"];
const EVIDENCE_KEYS = ["workspaceId", "id", "caseId", "source", "relation", "claim",
  "truthMode", "contentHash"];
const EVENT_KEYS = ["captures", "completed", "id", "observedDay", "revenueCents",
  "scenarioId", "segment", "source", "starts", "window", "workspaceId", "truthMode", "contentHash"];
const CITATION_KEYS = ["workspaceId", "evidenceId", "eventId"];

function fail(message) { throw new TypeError(message); }
function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).sort().join("|") !== [...keys].sort().join("|")) {
    fail(`${label} has unknown or missing fields`);
  }
}
function same(actual, expected, label) {
  if (actual === undefined || contentHash(actual) !== contentHash(expected)) {
    fail(`${label} differs from recorded-event derivation`);
  }
}
function stripHash(row) {
  const event = { ...row };
  delete event.contentHash;
  delete event.truthMode;
  return event;
}
function verifyHash(value, expected, label) {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value) || value !== contentHash(expected)) {
    fail(`${label} content hash is invalid`);
  }
}

export function validatePersistedCaseSnapshot(snapshot, scenario = GOLDEN_SCENARIO) {
  validateScenario(scenario);
  exactKeys(snapshot, INPUT_KEYS, "investigator input");
  exactKeys(snapshot.caseRow, CASE_KEYS, "Case row");
  exactKeys(snapshot.signalRow, SIGNAL_KEYS, "signal row");
  if (!Array.isArray(snapshot.evidenceRows) || !Array.isArray(snapshot.eventRows)
    || !Array.isArray(snapshot.citationRows)) fail("investigator collections are invalid");
  snapshot.evidenceRows.forEach((row) => exactKeys(row, EVIDENCE_KEYS, "evidence row"));
  snapshot.eventRows.forEach((row) => exactKeys(row, EVENT_KEYS, "event row"));
  snapshot.citationRows.forEach((row) => exactKeys(row, CITATION_KEYS, "citation row"));
  if (snapshot.caseRow.workspaceId !== scenario.workspaceId || snapshot.caseRow.id !== scenario.caseId
    || snapshot.caseRow.scenarioId !== scenario.id || snapshot.caseRow.scenarioVersion !== scenario.version
    || snapshot.caseRow.scenarioHash !== contentHash(scenario) || snapshot.caseRow.truthMode !== "FIXTURE") {
    fail("Case scenario, tenant, or truth boundary is invalid");
  }
  const events = snapshot.eventRows.map((row) => {
    if (row.truthMode !== "FIXTURE") fail("event truth boundary is invalid");
    const event = stripHash(row);
    validateRecordedEvent(event, scenario);
    verifyHash(row.contentHash, event, `event ${row.id}`);
    return event;
  });
  const derived = detectRevenueLeak(scenario, events);
  if (!derived.signal.detected || derived.caseRecord.status !== "detected") {
    fail("Investigator requires a detected Case");
  }
  const expectedCase = {
    workspaceId: derived.caseRecord.workspaceId, id: derived.caseRecord.id,
    scenarioId: derived.caseRecord.scenarioId, scenarioVersion: derived.caseRecord.scenarioVersion,
    scenarioHash: contentHash(scenario), title: derived.caseRecord.title,
    status: derived.caseRecord.status, truthMode: derived.caseRecord.truthMode,
    contentHash: contentHash(derived.caseRecord),
  };
  same(snapshot.caseRow, expectedCase, "Case row");
  const expectedSignal = {
    workspaceId: derived.signal.workspaceId, id: derived.signal.id,
    caseId: derived.signal.caseId, kind: derived.signal.kind,
    methodVersion: derived.signal.methodVersion, detected: derived.signal.detected,
    metrics: derived.signal.metrics, contentHash: contentHash(derived.signal),
  };
  same(snapshot.signalRow, expectedSignal, "signal row");
  if (snapshot.evidenceRows.length !== derived.evidence.length) fail("evidence set is incomplete");
  const evidenceById = new Map(snapshot.evidenceRows.map((row) => [row.id, row]));
  if (evidenceById.size !== derived.evidence.length) fail("evidence IDs are duplicated");
  for (const evidence of derived.evidence) {
    const expected = {
      workspaceId: evidence.workspaceId, id: evidence.id, caseId: evidence.caseId,
      source: evidence.source, relation: evidence.relation, claim: evidence.claim,
      truthMode: evidence.truthMode, contentHash: contentHash(evidence),
    };
    same(evidenceById.get(evidence.id), expected, `evidence ${evidence.id}`);
  }
  const expectedCitations = derived.evidence.flatMap((item) => item.eventIds.map((eventId) => ({
    workspaceId: scenario.workspaceId, evidenceId: item.id, eventId,
  })));
  if (snapshot.citationRows.length !== expectedCitations.length) fail("evidence citation set is incomplete");
  const sortCitations = (rows) => [...rows].sort((a, b) =>
    `${a.evidenceId}/${a.eventId}`.localeCompare(`${b.evidenceId}/${b.eventId}`));
  same(sortCitations(snapshot.citationRows), sortCitations(expectedCitations), "evidence citations");
  return derived;
}

function percent(bps) { return `${(bps / 100).toFixed(2)}%`; }
function dollars(cents) { return `$${(cents / 100).toFixed(2)}`; }

export function investigatePersistedCase(snapshot, scenario = GOLDEN_SCENARIO) {
  const { caseRecord, signal, evidence } = validatePersistedCaseSnapshot(snapshot, scenario);
  const byId = new Map(evidence.map((item) => [item.id, item]));
  const metrics = signal.metrics;
  const claims = [
    {
      id: "claim-mobile-conversion", relation: "supports", evidenceId: "evidence-mobile-funnel",
      finding: `Mobile Safari checkout conversion fell from ${percent(metrics.baseline.conversionBps)} to ${percent(metrics.observed.conversionBps)} across the recorded windows.`,
      eventIds: byId.get("evidence-mobile-funnel").eventIds,
    },
    {
      id: "claim-mobile-revenue", relation: "supports", evidenceId: "evidence-mobile-payment",
      finding: `Captured Mobile Safari revenue fell from ${dollars(metrics.baseline.revenueCents)} to ${dollars(metrics.observed.revenueCents)}; the baseline-rate projection exceeds observed revenue by ${dollars(metrics.projectedLeakCents)}.`,
      eventIds: byId.get("evidence-mobile-payment").eventIds,
    },
    {
      id: "claim-desktop-control", relation: "contradicts", evidenceId: "evidence-desktop-control",
      finding: `Desktop checkout conversion stayed at ${percent(metrics.controlBaseline.conversionBps)}, contradicting a campaign-wide checkout decline.`,
      eventIds: byId.get("evidence-desktop-control").eventIds,
    },
  ];
  return {
    id: `investigation-${caseRecord.id}`, workspaceId: caseRecord.workspaceId,
    caseId: caseRecord.id, scenarioId: caseRecord.scenarioId,
    methodVersion: "bounded-deterministic-v1", truthMode: "FIXTURE",
    status: "ready_for_review", assessment: "targeted_drop_supported_cause_unconfirmed",
    sourceCaseHash: contentHash(caseRecord), sourceSignalHash: contentHash(signal),
    summary: "Recorded Mobile Safari conversion and captured revenue fell while desktop remained stable. The cause is unconfirmed.",
    claims,
    limitations: [
      "This is a synthetic FIXTURE incident, not a LIVE revenue loss.",
      "The observed pattern does not identify a root cause or establish causality.",
    ],
  };
}

export function verifyInvestigation(snapshot, investigation, scenario = GOLDEN_SCENARIO) {
  const expected = investigatePersistedCase(snapshot, scenario);
  same(investigation, expected, "investigation artifact");
  return investigation;
}
