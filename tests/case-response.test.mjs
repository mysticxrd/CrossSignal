import assert from "node:assert/strict";
import test from "node:test";
import { buildGoldenCaseResponse, validateCaseCheckReceipt, verifySavedCaseResponse } from "../db/case-response.mjs";
import { contentHash } from "../db/revenue-leak.mjs";

const caseRow = { workspaceId: "l14-workspace-a", id: "case-golden-mobile-checkout",
  truthMode: "FIXTURE", contentHash: "a".repeat(64) };
const investigation = { workspaceId: caseRow.workspaceId, id: "investigation-case-golden-mobile-checkout",
  status: "ready_for_review", sourceCaseHash: caseRow.contentHash };
const investigationHash = "b".repeat(64);
function row() {
  const proposal = buildGoldenCaseResponse(caseRow, investigation, investigationHash);
  return { workspaceId: caseRow.workspaceId, id: proposal.id,
    caseId: caseRow.id, investigationId: investigation.id,
    artifact: proposal, contentHash: contentHash(proposal) };
}

test("TEST response has exact intent, scope, recipients, cost, authority and measurement", () => {
  const saved = verifySavedCaseResponse(JSON.parse(JSON.stringify(row())), null,
    caseRow, investigation, investigationHash);
  assert.equal(saved.proposal.intent.environment, "TEST");
  assert.equal(saved.proposal.intent.externalWrite, false);
  assert.deepEqual(saved.proposal.intent.recipients, []);
  assert.equal(saved.proposal.intent.maxCostCents, 0);
  assert.equal(saved.proposal.authority.requiredRole, "owner");
  assert.equal(saved.proposal.measurement.assessment, "correlated_only");
  assert.equal(saved.proposal.measurement.status, "awaiting_follow_up_events");
  assert.equal("groundTruth" in saved.proposal, false);
});

test("response and exact approval reject malformed, cross-tenant and modified data", () => {
  for (const change of [
    (saved) => { saved.workspaceId = "foreign-workspace"; },
    (saved) => { saved.artifact.intent.recipients.push("customer@example.com"); },
    (saved) => { saved.artifact.measurement.assessment = "causal"; },
    (saved) => { saved.artifact.groundTruth = "secret"; },
    (saved) => { saved.contentHash = "f".repeat(64); },
  ]) {
    const saved = row();
    change(saved);
    assert.throws(() => verifySavedCaseResponse(saved, null, caseRow, investigation, investigationHash));
  }
  const saved = row();
  assert.throws(() => verifySavedCaseResponse(saved, { workspaceId: "foreign-workspace",
    responseId: saved.id, proposalHash: saved.contentHash,
    approvedBy: `sha256:${"a".repeat(64)}`, approvedAt: "2026-09-23T12:00:00Z" },
  caseRow, investigation, investigationHash));
  assert.throws(() => buildGoldenCaseResponse({ ...caseRow, truthMode: "LIVE" }, investigation, investigationHash));
});

test("owner TEST check receipt survives reload and rejects missing authority or altered evidence", () => {
  const saved = row();
  const approval = { workspaceId: caseRow.workspaceId, responseId: saved.id,
    proposalHash: saved.contentHash, approvedBy: `sha256:${"a".repeat(64)}`,
    approvedAt: "2026-09-24T10:00:00.000Z" };
  const artifact = { workspaceId: caseRow.workspaceId, responseId: saved.id,
    proposalHash: saved.contentHash, recordedBy: approval.approvedBy,
    runReference: "test-run-1234", captureStatus: "not_captured",
    checkedAt: "2026-09-24T10:05:00.000Z" };
  const receipt = { ...artifact, recordedAt: artifact.checkedAt, contentHash: contentHash(artifact) };
  assert.deepEqual(validateCaseCheckReceipt(JSON.parse(JSON.stringify(receipt)), approval,
    saved.contentHash, caseRow.workspaceId, saved.id), receipt);
  assert.throws(() => validateCaseCheckReceipt(receipt, null, saved.contentHash,
    caseRow.workspaceId, saved.id));
  for (const change of [
    (value) => { value.workspaceId = "foreign-workspace"; },
    (value) => { value.runReference = "other-run-1234"; },
    (value) => { value.captureStatus = "captured"; },
    (value) => { value.checkedAt = "2026-09-24T09:59:00.000Z"; },
    (value) => { value.groundTruth = "checkout bug"; },
  ]) {
    const modified = JSON.parse(JSON.stringify(receipt));
    change(modified);
    assert.throws(() => validateCaseCheckReceipt(modified, approval,
      saved.contentHash, caseRow.workspaceId, saved.id));
  }
});
