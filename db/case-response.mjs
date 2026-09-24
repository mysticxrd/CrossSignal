import { contentHash } from "./revenue-leak.mjs";

// A fixed, internal TEST response for the golden Case. Approval records a
// decision on this exact proposal; it does not dispatch an external effect.
export function buildGoldenCaseResponse(caseRow, investigation, investigationHash) {
  if (caseRow?.truthMode !== "FIXTURE" || investigation?.status !== "ready_for_review"
    || investigation?.workspaceId !== caseRow.workspaceId
    || investigation?.sourceCaseHash !== caseRow.contentHash
    || !/^[0-9a-f]{64}$/.test(investigationHash)) {
    throw new TypeError("Response source is invalid");
  }
  return {
    id: `response-${caseRow.id}-v1`,
    workspaceId: caseRow.workspaceId,
    caseId: caseRow.id,
    caseHash: caseRow.contentHash,
    investigationId: investigation.id,
    investigationHash,
    truthMode: "FIXTURE",
    status: "proposed",
    intent: {
      kind: "internal_test_validation",
      instruction: "Have the workspace owner reproduce the Mobile Safari checkout in TEST and record whether payment capture succeeds before considering a production change.",
      target: "TEST checkout, Mobile Safari segment",
      environment: "TEST",
      recipients: [],
      maxCostCents: 0,
      maxRuns: 1,
      externalWrite: false,
    },
    authority: {
      requiredRole: "owner",
      approvalBinds: "exact_response_hash",
      execution: "manual_after_approval",
    },
    measurement: {
      metric: "Mobile Safari checkout conversion and captured revenue",
      baseline: "2026-07-24 through 2026-07-30 fixture observations",
      followUp: "New, separately recorded TEST observations after the manual check",
      minimumStarts: 100,
      assessment: "correlated_only",
      status: "awaiting_follow_up_events",
    },
    uncertainty: "The recorded decline is supported, but the cause is unconfirmed. This approval cannot authorize a production change or establish recovered revenue.",
  };
}

export function verifySavedCaseResponse(row, approval, caseRow, investigation, investigationHash) {
  const expected = buildGoldenCaseResponse(caseRow, investigation, investigationHash);
  const expectedHash = contentHash(expected);
  if (!row || Object.keys(row).sort().join("|") !== ["artifact", "caseId", "contentHash", "id", "investigationId", "workspaceId"].sort().join("|")
    || row.workspaceId !== caseRow.workspaceId || row.id !== expected.id
    || row.caseId !== caseRow.id || row.investigationId !== investigation.id
    || row.contentHash !== expectedHash || contentHash(row.artifact) !== expectedHash) {
    throw new TypeError("Saved Case response differs from verified proposal");
  }
  if (approval !== null) {
    if (!approval || Object.keys(approval).sort().join("|") !== ["workspaceId", "responseId", "proposalHash", "approvedBy", "approvedAt"].sort().join("|")
      || approval.workspaceId !== caseRow.workspaceId || approval.responseId !== expected.id
      || approval.proposalHash !== expectedHash
      || typeof approval.approvedBy !== "string" || !/^sha256:[0-9a-f]{64}$/.test(approval.approvedBy)
      || typeof approval.approvedAt !== "string" || Number.isNaN(Date.parse(approval.approvedAt))) {
      throw new TypeError("Saved Case approval is invalid");
    }
  }
  return { proposal: expected, proposalHash: expectedHash, approval };
}

export function validateCaseCheckReceipt(receipt, approval, proposalHash, workspaceId, responseId) {
  if (receipt === null) return null;
  const keys = ["workspaceId", "responseId", "proposalHash", "recordedBy", "runReference",
    "captureStatus", "checkedAt", "recordedAt", "contentHash"];
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)
    || Object.keys(receipt).sort().join("|") !== keys.sort().join("|")
    || !approval || receipt.workspaceId !== workspaceId || receipt.responseId !== responseId
    || receipt.proposalHash !== proposalHash
    || typeof receipt.recordedBy !== "string" || !/^sha256:[0-9a-f]{64}$/.test(receipt.recordedBy)
    || typeof receipt.runReference !== "string" || !/^[A-Za-z0-9_-]{8,64}$/.test(receipt.runReference)
    || /^sim_/i.test(receipt.runReference)
    || !["captured", "not_captured", "indeterminate"].includes(receipt.captureStatus)
    || typeof receipt.checkedAt !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(receipt.checkedAt)
    || Number.isNaN(Date.parse(receipt.checkedAt))
    || typeof receipt.recordedAt !== "string" || Number.isNaN(Date.parse(receipt.recordedAt))
    || Date.parse(receipt.checkedAt) < Date.parse(approval.approvedAt)
    || Date.parse(receipt.checkedAt) > Date.parse(receipt.recordedAt)) {
    throw new TypeError("Saved Case check receipt is invalid");
  }
  const artifact = { workspaceId, responseId, proposalHash,
    recordedBy: receipt.recordedBy, runReference: receipt.runReference,
    captureStatus: receipt.captureStatus, checkedAt: receipt.checkedAt };
  if (receipt.contentHash !== contentHash(artifact)) {
    throw new TypeError("Saved Case check receipt hash differs");
  }
  return receipt;
}

export function validateCaseCheckTrialMarker(marker, receipt, workspaceId, responseId) {
  if (marker === null) return null;
  const keys = ["workspaceId", "responseId", "receiptHash", "markedBy", "reason",
    "markedAt", "contentHash"];
  if (!marker || typeof marker !== "object" || Array.isArray(marker)
    || Object.keys(marker).sort().join("|") !== keys.sort().join("|")
    || !receipt || marker.workspaceId !== workspaceId || marker.responseId !== responseId
    || marker.receiptHash !== receipt.contentHash
    || typeof marker.markedBy !== "string" || !/^sha256:[0-9a-f]{64}$/.test(marker.markedBy)
    || marker.reason !== "trial_submission"
    || typeof marker.markedAt !== "string" || Number.isNaN(Date.parse(marker.markedAt))
    || Date.parse(marker.markedAt) < Date.parse(receipt.checkedAt)) {
    throw new TypeError("Saved Case trial marker is invalid");
  }
  const artifact = { workspaceId, responseId, receiptHash: marker.receiptHash,
    markedBy: marker.markedBy, reason: marker.reason, markedAt: marker.markedAt };
  if (marker.contentHash !== contentHash(artifact)) {
    throw new TypeError("Saved Case trial marker hash differs");
  }
  return marker;
}

export function validateCaseRecheckReceipt(recheck, marker, original, approval,
  proposalHash, workspaceId, responseId) {
  if (recheck === null) return null;
  const keys = ["workspaceId", "responseId", "proposalHash", "supersedesReceiptHash",
    "recordedBy", "runReference", "captureStatus", "checkedAt", "recordedAt", "contentHash"];
  if (!recheck || typeof recheck !== "object" || Array.isArray(recheck)
    || Object.keys(recheck).sort().join("|") !== keys.sort().join("|")
    || !marker || !original || !approval
    || recheck.workspaceId !== workspaceId || recheck.responseId !== responseId
    || recheck.proposalHash !== proposalHash
    || recheck.supersedesReceiptHash !== marker.receiptHash
    || typeof recheck.recordedBy !== "string" || !/^sha256:[0-9a-f]{64}$/.test(recheck.recordedBy)
    || typeof recheck.runReference !== "string" || !/^[A-Za-z0-9_-]{8,64}$/.test(recheck.runReference)
    || recheck.runReference === original.runReference
    || /^sim_/i.test(recheck.runReference)
    || !["captured", "not_captured", "indeterminate"].includes(recheck.captureStatus)
    || typeof recheck.checkedAt !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(recheck.checkedAt)
    || typeof recheck.recordedAt !== "string" || Number.isNaN(Date.parse(recheck.recordedAt))
    || Date.parse(recheck.checkedAt) <= Date.parse(marker.markedAt)
    || Date.parse(recheck.checkedAt) > Date.parse(recheck.recordedAt)) {
    throw new TypeError("Saved Case recheck receipt is invalid");
  }
  const artifact = { workspaceId, responseId, proposalHash,
    supersedesReceiptHash: marker.receiptHash, recordedBy: recheck.recordedBy,
    runReference: recheck.runReference, captureStatus: recheck.captureStatus,
    checkedAt: recheck.checkedAt };
  if (recheck.contentHash !== contentHash(artifact)) {
    throw new TypeError("Saved Case recheck receipt hash differs");
  }
  return recheck;
}
