import { buildGoldenEvents, contentHash, detectRevenueLeak, GOLDEN_SCENARIO } from "../db/revenue-leak.mjs";
import { investigatePersistedCase, verifyInvestigation } from "../db/case-investigator.mjs";
import { buildGoldenCaseResponse } from "../db/case-response.mjs";
import { projectCaseDecision } from "../db/case-decision.mjs";
import { buildSimulatedCheckout } from "../supabase/functions/_shared/case-checkout.mjs";

// Offline product replay. This process never reads tests/evaluator or a database.
// Fixed inputs make its JSON byte-for-byte repeatable across invocations.
const scenario = { ...GOLDEN_SCENARIO, workspaceId: "l14-workspace-a" };
const clone = (value) => structuredClone(value);

function snapshotFromDetection({ caseRecord, signal, evidence, events }) {
  return {
    caseRow: { workspaceId: caseRecord.workspaceId, id: caseRecord.id,
      scenarioId: caseRecord.scenarioId, scenarioVersion: caseRecord.scenarioVersion,
      scenarioHash: contentHash(scenario), title: caseRecord.title, status: caseRecord.status,
      truthMode: caseRecord.truthMode, contentHash: contentHash(caseRecord) },
    signalRow: { workspaceId: signal.workspaceId, id: signal.id, caseId: signal.caseId,
      kind: signal.kind, methodVersion: signal.methodVersion, detected: signal.detected,
      metrics: signal.metrics, contentHash: contentHash(signal) },
    evidenceRows: evidence.map((item) => ({ workspaceId: item.workspaceId, id: item.id,
      caseId: item.caseId, source: item.source, relation: item.relation, claim: item.claim,
      truthMode: item.truthMode, contentHash: contentHash(item) })),
    eventRows: events.map((item) => ({ ...item, truthMode: "FIXTURE", contentHash: contentHash(item) })),
    citationRows: evidence.flatMap((item) => item.eventIds.map((eventId) => ({
      workspaceId: item.workspaceId, evidenceId: item.id, eventId,
    }))),
  };
}

function basePayload(snapshot, investigation) {
  const investigationHash = contentHash(investigation);
  const proposal = buildGoldenCaseResponse(snapshot.caseRow, investigation, investigationHash);
  return {
    kind: "found", snapshot, investigation, investigationHash,
    investigationCitations: investigation.claims.flatMap((claim) => claim.eventIds.map((eventId) => ({
      workspaceId: scenario.workspaceId, investigationId: investigation.id,
      claimId: claim.id, evidenceId: claim.evidenceId, eventId,
    }))),
    responseRow: { workspaceId: scenario.workspaceId, id: proposal.id,
      caseId: proposal.caseId, investigationId: proposal.investigationId,
      artifact: proposal, contentHash: contentHash(proposal) },
    approvalRow: null, receiptRow: null, trialMarkerRow: null,
    recheckRow: null, followUpRows: [], checkoutRows: [],
  };
}

function withExcludedTrialAndSimulations(payload) {
  const owner = `sha256:${"a".repeat(64)}`;
  payload.approvalRow = { workspaceId: scenario.workspaceId, responseId: payload.responseRow.id,
    proposalHash: payload.responseRow.contentHash, approvedBy: owner,
    approvedAt: "2026-09-15T10:00:00.000Z" };
  const receipt = { workspaceId: scenario.workspaceId, responseId: payload.responseRow.id,
    proposalHash: payload.responseRow.contentHash, recordedBy: owner,
    runReference: "local-trial-1234", captureStatus: "indeterminate",
    checkedAt: "2026-09-15T10:05:00.000Z" };
  payload.receiptRow = { ...receipt, recordedAt: receipt.checkedAt, contentHash: contentHash(receipt) };
  const marker = { workspaceId: scenario.workspaceId, responseId: payload.responseRow.id,
    receiptHash: payload.receiptRow.contentHash, markedBy: owner,
    reason: "trial_submission", markedAt: "2026-09-16T10:00:00.000Z" };
  payload.trialMarkerRow = { ...marker, contentHash: contentHash(marker) };
  for (const [index, checkoutScenario] of ["capture", "decline"].entries()) {
    const artifact = buildSimulatedCheckout({ workspaceId: scenario.workspaceId,
      caseId: scenario.caseId, responseId: payload.responseRow.id,
      proposalHash: payload.responseRow.contentHash,
      runId: `sim_12345678-1234-4123-8123-123456789ab${index}`,
      scenario: checkoutScenario, recordedBy: owner,
      executedAt: `2026-09-24T12:0${index}:00.000Z` });
    payload.checkoutRows.push({ artifact, contentHash: contentHash(artifact) });
  }
  return payload;
}

function probe(id, run) {
  try { run(); return { id, outcome: "accepted" }; }
  catch (error) { return { id, outcome: "rejected", reason: error.message }; }
}

const events = buildGoldenEvents(scenario);
const detected = detectRevenueLeak(scenario, events);
const snapshot = snapshotFromDetection(detected);
const investigation = investigatePersistedCase(snapshot, scenario);
const payload = withExcludedTrialAndSimulations(basePayload(snapshot, investigation));
const decision = projectCaseDecision(clone(payload), scenario.workspaceId);
const belowThreshold = detectRevenueLeak({ ...scenario, minimumRelativeDropBps: 6000 }, events);
const captureOnly = clone(payload);
captureOnly.checkoutRows = [captureOnly.checkoutRows[0]];
const repeatedCapture = clone(captureOnly);
const extraCapture = buildSimulatedCheckout({ workspaceId: scenario.workspaceId,
  caseId: scenario.caseId, responseId: payload.responseRow.id,
  proposalHash: payload.responseRow.contentHash,
  runId: "sim_12345678-1234-4123-8123-123456789ab2", scenario: "capture",
  recordedBy: `sha256:${"a".repeat(64)}`, executedAt: "2026-09-24T12:02:00.000Z" });
repeatedCapture.checkoutRows.push({ artifact: extraCapture, contentHash: contentHash(extraCapture) });
const reordered = clone(payload);
reordered.checkoutRows.reverse();

const failures = [
  probe("missing_event", () => detectRevenueLeak(scenario, events.slice(1))),
  probe("duplicate_event", () => detectRevenueLeak(scenario, [...events.slice(1), events[0], events[0]])),
  probe("foreign_event", () => detectRevenueLeak(scenario, [{ ...events[0], workspaceId: "foreign" }, ...events.slice(1)])),
  probe("missing_evidence_citation", () => {
    const changed = clone(snapshot); changed.citationRows.pop();
    investigatePersistedCase(changed, scenario);
  }),
  probe("foreign_snapshot", () => {
    const changed = clone(snapshot); changed.caseRow.workspaceId = "foreign";
    investigatePersistedCase(changed, scenario);
  }),
  probe("changed_investigation_claim", () => {
    const changed = clone(investigation); changed.claims[0].eventIds.pop();
    verifyInvestigation(snapshot, changed, scenario);
  }),
  probe("foreign_decision_citation", () => {
    const changed = clone(payload); changed.investigationCitations[0].workspaceId = "foreign";
    projectCaseDecision(changed, scenario.workspaceId);
  }),
  probe("injected_evaluator_answer", () => {
    const changed = clone(payload); changed.snapshot.groundTruth = "injected";
    projectCaseDecision(changed, scenario.workspaceId);
  }),
  probe("tampered_simulated_trace", () => {
    const changed = clone(payload); changed.checkoutRows[0].artifact.events[1].id = "foreign-event";
    changed.checkoutRows[0].contentHash = contentHash(changed.checkoutRows[0].artifact);
    projectCaseDecision(changed, scenario.workspaceId);
  }),
  probe("duplicate_simulated_run", () => {
    const changed = clone(payload); changed.checkoutRows.push(clone(changed.checkoutRows[0]));
    projectCaseDecision(changed, scenario.workspaceId);
  }),
  probe("live_simulated_artifact", () => {
    const changed = clone(payload); changed.checkoutRows[0].artifact.environment = "LIVE";
    changed.checkoutRows[0].contentHash = contentHash(changed.checkoutRows[0].artifact);
    projectCaseDecision(changed, scenario.workspaceId);
  }),
  probe("simulation_as_real_receipt", () => {
    const changed = clone(payload); changed.receiptRow.runReference = changed.checkoutRows[0].artifact.runId;
    projectCaseDecision(changed, scenario.workspaceId);
  }),
];

const artifact = {
  replayVersion: "golden-case-replay-v1", source: "local-fixture", environment: "offline",
  scenarioId: scenario.id, workspaceId: scenario.workspaceId, caseId: scenario.caseId,
  detection: { eventCount: events.length, caseStatus: detected.caseRecord.status,
    signal: detected.signal, evidence: detected.evidence },
  snapshot, investigation, investigationCitations: payload.investigationCitations,
  decision: { truthMode: decision.truthMode, status: decision.status,
    metrics: decision.metrics, claims: decision.claims,
    response: { proposalHash: decision.response.proposalHash,
      approvalPresent: decision.response.approval !== null,
      effectiveReceipt: decision.response.receipt,
      trialReceiptHash: decision.response.trialReceipt?.contentHash ?? null,
      trialMarkerHash: decision.response.trialMarker?.contentHash ?? null },
    outcome: decision.outcome, simulationOutcome: decision.simulationOutcome,
    simulatedCheckouts: decision.simulatedCheckouts },
  belowThreshold: { detected: belowThreshold.signal.detected,
    caseStatus: belowThreshold.caseRecord.status },
  coverageGuards: { captureOnlyStatus: projectCaseDecision(captureOnly, scenario.workspaceId).simulationOutcome.status,
    repeatedCaptureStatus: projectCaseDecision(repeatedCapture, scenario.workspaceId).simulationOutcome.status,
    reorderedAssessmentHash: projectCaseDecision(reordered, scenario.workspaceId).simulationOutcome.contentHash },
  failures,
};

process.stdout.write(`${JSON.stringify(artifact, null, 2)}\n`);
