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
