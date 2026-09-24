import assert from "node:assert/strict";
import test from "node:test";
import { projectCaseDecision } from "../db/case-decision.mjs";
import { investigatePersistedCase } from "../db/case-investigator.mjs";
import { buildGoldenCaseResponse } from "../db/case-response.mjs";
import { buildSimulatedCheckout } from "../supabase/functions/_shared/case-checkout.mjs";
import { buildGoldenEvents, contentHash, detectRevenueLeak, GOLDEN_SCENARIO } from "../db/revenue-leak.mjs";

const scenario = { ...GOLDEN_SCENARIO, workspaceId: "l14-workspace-a" };
function payload() {
  const { caseRecord, signal, evidence, events } = detectRevenueLeak(scenario, buildGoldenEvents(scenario));
  const snapshot = {
    caseRow: {
      workspaceId: caseRecord.workspaceId, id: caseRecord.id,
      scenarioId: caseRecord.scenarioId, scenarioVersion: caseRecord.scenarioVersion,
      scenarioHash: contentHash(scenario), title: caseRecord.title, status: caseRecord.status,
      truthMode: caseRecord.truthMode, contentHash: contentHash(caseRecord),
    },
    signalRow: {
      workspaceId: signal.workspaceId, id: signal.id, caseId: signal.caseId,
      kind: signal.kind, methodVersion: signal.methodVersion, detected: signal.detected,
      metrics: signal.metrics, contentHash: contentHash(signal),
    },
    evidenceRows: evidence.map((item) => ({
      workspaceId: item.workspaceId, id: item.id, caseId: item.caseId,
      source: item.source, relation: item.relation, claim: item.claim,
      truthMode: item.truthMode, contentHash: contentHash(item),
    })),
    eventRows: events.map((item) => ({ ...item, truthMode: "FIXTURE", contentHash: contentHash(item) })),
    citationRows: evidence.flatMap((item) => item.eventIds.map((eventId) => ({
      workspaceId: item.workspaceId, evidenceId: item.id, eventId,
    }))),
  };
  const investigation = investigatePersistedCase(snapshot, scenario);
  const proposal = buildGoldenCaseResponse(snapshot.caseRow, investigation, contentHash(investigation));
  return {
    kind: "found", snapshot, investigation, investigationHash: contentHash(investigation),
    responseRow: { workspaceId: scenario.workspaceId, id: proposal.id,
      caseId: proposal.caseId, investigationId: proposal.investigationId,
      artifact: proposal, contentHash: contentHash(proposal) },
    approvalRow: null,
    receiptRow: null,
    trialMarkerRow: null,
    recheckRow: null,
    followUpRows: [],
    checkoutRows: [],
    investigationCitations: investigation.claims.flatMap((claim) => claim.eventIds.map((eventId) => ({
      workspaceId: scenario.workspaceId, investigationId: investigation.id,
      claimId: claim.id, evidenceId: claim.evidenceId, eventId,
    }))),
  };
}

test("verified saved Case projects a bounded decision view across save and reload", () => {
  const result = projectCaseDecision(JSON.parse(JSON.stringify(payload())), scenario.workspaceId);
  assert.equal(result.metrics.baseline.conversionBps, 2000);
  assert.equal(result.metrics.observed.conversionBps, 857);
  assert.equal(result.metrics.projectedLeakCents, 80000);
  assert.deepEqual(result.claims.map((claim) => claim.relation), ["supports", "supports", "contradicts"]);
  assert.deepEqual(result.claims.map((claim) => claim.events.length), [14, 14, 14]);
  assert.equal(result.claims[0].events[0].source, "checkout_analytics");
  assert.equal(result.truthMode, "FIXTURE");
  assert.equal("groundTruth" in result, false);
  assert.equal("action" in result, false);
  assert.equal(result.response.proposal.intent.externalWrite, false);
  assert.equal(result.response.approval, null);
  assert.equal(result.response.receipt, null);
});

test("tenant, signal, report, and citation changes cannot enter the decision view", () => {
  for (const change of [
    (p) => { p.snapshot.caseRow.workspaceId = "foreign-workspace"; },
    (p) => { p.snapshot.signalRow.metrics.projectedLeakCents = 1; },
    (p) => { p.investigation.summary = "Cause proven"; },
    (p) => { p.investigationHash = "0".repeat(64); },
    (p) => { p.investigationCitations.pop(); },
    (p) => { p.investigationCitations[0].workspaceId = "foreign-workspace"; },
    (p) => { p.snapshot.groundTruth = { expectedCause: "bad checkout" }; },
    (p) => { p.responseRow.artifact.intent.environment = "LIVE"; },
    (p) => { p.responseRow.contentHash = "0".repeat(64); },
    (p) => { p.approvalRow = { workspaceId: scenario.workspaceId, responseId: p.responseRow.id,
      proposalHash: "0".repeat(64), approvedBy: `sha256:${"a".repeat(64)}`,
      approvedAt: "2026-09-23T12:00:00Z" }; },
  ]) {
    const input = payload();
    change(input);
    assert.throws(() => projectCaseDecision(input, scenario.workspaceId));
  }
});

test("exact proposal approval survives reload and remains linked to the Case", () => {
  const input = payload();
  input.approvalRow = { workspaceId: scenario.workspaceId,
    responseId: input.responseRow.id, proposalHash: input.responseRow.contentHash,
    approvedBy: `sha256:${"a".repeat(64)}`, approvedAt: "2026-09-23T12:00:00Z" };
  const result = projectCaseDecision(JSON.parse(JSON.stringify(input)), scenario.workspaceId);
  assert.equal(result.response.approval.approvedBy, input.approvalRow.approvedBy);
  assert.equal(result.response.proposalHash, input.approvalRow.proposalHash);
  assert.equal(result.response.proposal.measurement.status, "awaiting_follow_up_events");
});

test("a simulated capture cannot become a real receipt or measured Case outcome", () => {
  const input = payload();
  const artifact = buildSimulatedCheckout({ workspaceId: scenario.workspaceId,
    caseId: scenario.caseId, responseId: input.responseRow.id, proposalHash: input.responseRow.contentHash,
    runId: "sim_12345678-1234-4123-8123-123456789abc", scenario: "capture",
    recordedBy: `sha256:${"a".repeat(64)}`, executedAt: "2026-09-24T12:00:00.000Z" });
  input.checkoutRows = [{ artifact, contentHash: contentHash(artifact) }];
  const result = projectCaseDecision(JSON.parse(JSON.stringify(input)), scenario.workspaceId);
  assert.equal(result.simulatedCheckouts[0].captureStatus, "simulated_captured");
  assert.equal(result.response.approval, null); // simulation does not reuse manual approval
  assert.equal(result.response.receipt, null);
  assert.equal(result.outcome.status, "awaiting_check");
  assert.equal(result.outcome.label, null);
  assert.equal(result.simulationOutcome.status, "in_progress");
  const declined = buildSimulatedCheckout({ workspaceId: scenario.workspaceId,
    caseId: scenario.caseId, responseId: input.responseRow.id, proposalHash: input.responseRow.contentHash,
    runId: "sim_12345678-1234-4123-8123-123456789abd", scenario: "decline",
    recordedBy: artifact.recordedBy, executedAt: "2026-09-24T12:01:00.000Z" });
  input.checkoutRows.push({ artifact: declined, contentHash: contentHash(declined) });
  const verified = projectCaseDecision(JSON.parse(JSON.stringify(input)), scenario.workspaceId);
  assert.equal(verified.simulationOutcome.status, "verified");
  assert.equal(verified.simulationOutcome.caseResolution, "unresolved");
  assert.equal(verified.response.receipt, null);
  assert.equal(verified.outcome.status, "awaiting_check");
});

test("Case read reprojects a saved TEST receipt and separate correlated follow-up", () => {
  const input = payload();
  const approvedBy = `sha256:${"a".repeat(64)}`;
  input.approvalRow = { workspaceId: scenario.workspaceId,
    responseId: input.responseRow.id, proposalHash: input.responseRow.contentHash,
    approvedBy, approvedAt: "2026-09-15T10:00:00.000Z" };
  const receiptArtifact = { workspaceId: scenario.workspaceId, responseId: input.responseRow.id,
    proposalHash: input.responseRow.contentHash, recordedBy: approvedBy,
    runReference: "test-run-1234", captureStatus: "not_captured",
    checkedAt: "2026-09-15T10:05:00.000Z" };
  input.receiptRow = { ...receiptArtifact, recordedAt: receiptArtifact.checkedAt,
    contentHash: contentHash(receiptArtifact) };
  for (let day = 16; day <= 22; day += 1) {
    const observedDay = `2026-09-${day}`;
    for (const source of ["checkout_analytics", "payment_ledger"]) {
      const artifact = { workspaceId: scenario.workspaceId,
        id: `follow-up-${observedDay}-${source}`, caseId: scenario.caseId,
        responseId: input.responseRow.id, receiptHash: input.receiptRow.contentHash,
        source, segment: "mobile_safari", observedDay,
        starts: source === "checkout_analytics" ? 20 : 0,
        completed: source === "checkout_analytics" ? 3 : 0,
        captures: source === "payment_ledger" ? 3 : 0,
        revenueCents: source === "payment_ledger" ? 15000 : 0 };
      input.followUpRows.push({ ...artifact, truthMode: "FIXTURE",
        contentHash: contentHash(artifact), recordedAt: "2026-09-23T12:00:00.000Z" });
    }
  }
  const saved = JSON.parse(JSON.stringify(input));
  const result = projectCaseDecision(saved, scenario.workspaceId);
  assert.equal(result.response.receipt.contentHash, input.receiptRow.contentHash);
  assert.equal(result.outcome.status, "assessed");
  assert.equal(result.outcome.label, "correlated_only");
  assert.equal(result.outcome.conversionBps, 1500);
  assert.equal(result.outcome.eventIds.length, 14);
  saved.followUpRows[0].workspaceId = "foreign-workspace";
  assert.throws(() => projectCaseDecision(saved, scenario.workspaceId));
});

test("trial receipt stays visible but cannot support outcome until a distinct recheck", () => {
  const input = payload();
  const owner = `sha256:${"a".repeat(64)}`;
  input.approvalRow = { workspaceId: scenario.workspaceId,
    responseId: input.responseRow.id, proposalHash: input.responseRow.contentHash,
    approvedBy: owner, approvedAt: "2026-09-15T10:00:00.000Z" };
  const original = { workspaceId: scenario.workspaceId, responseId: input.responseRow.id,
    proposalHash: input.responseRow.contentHash, recordedBy: owner,
    runReference: "trial-run-1234", captureStatus: "indeterminate",
    checkedAt: "2026-09-15T10:05:00.000Z" };
  input.receiptRow = { ...original, recordedAt: original.checkedAt,
    contentHash: contentHash(original) };
  const trial = { workspaceId: scenario.workspaceId, responseId: input.responseRow.id,
    receiptHash: input.receiptRow.contentHash, markedBy: owner,
    reason: "trial_submission", markedAt: "2026-09-16T10:00:00.000Z" };
  input.trialMarkerRow = { ...trial, contentHash: contentHash(trial) };
  const simulated = buildSimulatedCheckout({ workspaceId: scenario.workspaceId, caseId: scenario.caseId,
    responseId: input.responseRow.id, proposalHash: input.responseRow.contentHash,
    runId: "sim_12345678-1234-4123-8123-123456789abc", scenario: "capture", recordedBy: owner,
    executedAt: "2026-09-24T12:00:00.000Z" });
  input.checkoutRows = [{ artifact: simulated, contentHash: contentHash(simulated) }];
  const excluded = projectCaseDecision(JSON.parse(JSON.stringify(input)), scenario.workspaceId);
  assert.equal(excluded.response.receipt, null);
  assert.equal(excluded.response.trialReceipt.contentHash, input.receiptRow.contentHash);
  assert.equal(excluded.outcome.status, "awaiting_check");
  assert.equal(excluded.simulatedCheckouts.length, 1);
  assert.equal(excluded.response.trialMarker.contentHash, input.trialMarkerRow.contentHash);
  const tampered = JSON.parse(JSON.stringify(input));
  tampered.trialMarkerRow.workspaceId = "foreign-workspace";
  assert.throws(() => projectCaseDecision(tampered, scenario.workspaceId));
  const recheck = { workspaceId: scenario.workspaceId, responseId: input.responseRow.id,
    proposalHash: input.responseRow.contentHash,
    supersedesReceiptHash: input.receiptRow.contentHash, recordedBy: owner,
    runReference: "real-run-1234", captureStatus: "captured",
    checkedAt: "2026-09-17T10:00:00.000Z" };
  input.recheckRow = { ...recheck, recordedAt: recheck.checkedAt,
    contentHash: contentHash(recheck) };
  const verified = projectCaseDecision(JSON.parse(JSON.stringify(input)), scenario.workspaceId);
  assert.equal(verified.response.receipt.contentHash, input.recheckRow.contentHash);
  assert.equal(verified.outcome.status, "awaiting_follow_up_events");
  input.recheckRow.runReference = input.receiptRow.runReference;
  assert.throws(() => projectCaseDecision(input, scenario.workspaceId));
});
