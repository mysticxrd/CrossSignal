export type ExecutionScenario = "confirmed" | "failed" | "indeterminate";

export type TruthMode = "LIVE" | "TEST" | "FIXTURE";

export type AuthorityControlHistoryItem = {
  id: string;
  sequence: number;
  priorState: boolean | null;
  currentState: boolean;
  reasonCode: "workspace_initialized" | "migration_backfill" | "owner_transition";
  actorDisplay: "Workspace owner";
  occurredAt: string;
  contentHash: string;
};

export type TraceEventProjection = {
  id: string;
  sequence: number;
  eventType: string;
  subjectType: "trace" | "context" | "graph" | "intent" | "policy" | "approval" | "effect" | "outcome";
  subjectRef: string;
  priorState: string | null;
  currentState: string;
  actorType: "human" | "system" | "agent" | "adapter";
  actorDisplay: string;
  occurredAt: string;
  payloadHash: string;
  details: Record<string, string | number | boolean | null | Array<unknown> | Record<string, unknown>>;
};

export type FlightRecorderSnapshot = {
  workspaceId: string;
  traceId: string;
  traceKey: string;
  traceState:
    | "awaiting_approval"
    | "executing"
    | "observing"
    | "assessed"
    | "failed"
    | "cancelled";
  truthMode: "FIXTURE";
  killSwitchEngaged: boolean;
  intent: {
    id: string;
    version: number;
    recipients: string[];
    subject: string;
    body: string;
    cohortCap: number;
    spendingCapUsd: number;
    expiresAt: string;
    canonicalPayloadHash: string;
    recipientSetHash: string;
    contextManifestHash: string;
    policyVersion: string;
    policyHash: string;
  };
  policy: {
    verdict: "approval_required";
    plainEnglish: string;
    evaluatorVersion: string;
  };
  approval: null | {
    decision: "approved" | "rejected";
    approvedAt: string;
    approvedBy: string;
    grantId: string;
  };
  execution: null | {
    state:
      | "reserved"
      | "dispatching"
      | "confirmed"
      | "failed"
      | "indeterminate"
      | "reconciled_confirmed"
      | "reconciled_failed";
    providerMode: "FIXTURE" | "TEST";
    providerReceiptId: string | null;
    errorCode: string | null;
    explanation: string;
    attemptCount: number;
  };
  outcome: null | {
    observedLabel: "Observed";
    assessmentLabel: "correlated" | "supported" | "unsupported" | "inconclusive";
    metricName: string;
    activatedAccounts: number;
    eligibleAccounts: number;
    baselineRate: number;
    observedRate: number;
    limitations: string[];
    rationale: string;
  };
  evidence: Array<{
    key: string;
    label: string;
    summary: string;
    truthMode: TruthMode;
    sourceVersion: string;
    contentHash: string;
  }>;
  playbook: Array<{
    key: string;
    label: string;
    role: string;
    state: "succeeded" | "failed" | "skipped";
    attempt: number;
    executionMode: "runtime" | "precomputed_fixture";
    graphVersion: string;
    handlerVersion: string;
    evidenceCount: number;
    outputHash: string | null;
  }>;
  context: {
    sourceCount: number;
    manifestHash: string;
  };
  authorityControlHistory: AuthorityControlHistoryItem[];
  traceEvents: TraceEventProjection[];
  traceEventCount: number;
};

export type FlightRecorderActionResult =
  | {
      ok: true;
      kind: "executed" | "intent-replaced" | "kill-switch-updated" | "reset";
      snapshot: FlightRecorderSnapshot;
      message: string;
    }
  | { ok: false; error: string };
