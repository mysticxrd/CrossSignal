import assert from "node:assert/strict";
import test from "node:test";
import { projectCaseDecision } from "../db/case-decision.mjs";
import { investigatePersistedCase } from "../db/case-investigator.mjs";
import { buildGoldenCaseResponse } from "../db/case-response.mjs";
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
