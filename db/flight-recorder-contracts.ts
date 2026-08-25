export const TRUTH_MODES = ["LIVE", "TEST", "FIXTURE"] as const;
export const ASSESSMENT_LABELS = [
  "supported",
  "unsupported",
  "correlated",
  "inconclusive",
] as const;

export type TruthMode = (typeof TRUTH_MODES)[number];
export type AssessmentLabel = (typeof ASSESSMENT_LABELS)[number];
export type TransitionMachine = keyof typeof STATE_TRANSITIONS;

export const STATE_TRANSITIONS = {
  trace: {
    collecting: ["context_frozen", "failed", "cancelled"],
    context_frozen: ["reasoning", "failed", "cancelled"],
    reasoning: ["awaiting_approval", "failed", "cancelled"],
    awaiting_approval: ["executing", "failed", "cancelled"],
    executing: ["observing", "failed", "cancelled"],
    observing: ["assessed", "failed", "cancelled"],
    assessed: [],
    failed: [],
    cancelled: [],
  },
  context: {
    collecting: ["frozen"],
    frozen: ["superseded"],
    superseded: [],
  },
  graph: {
    pending: ["running", "skipped"],
    running: ["succeeded", "failed"],
    succeeded: [],
    failed: [],
    skipped: [],
  },
  intent: {
    drafted: ["sealed", "discarded"],
    sealed: ["expired", "superseded", "policy_evaluated"],
    policy_evaluated: ["expired", "superseded", "approval_pending"],
    approval_pending: ["approved", "rejected", "expired", "superseded"],
    approved: ["consumed", "expired", "superseded"],
    consumed: [],
    rejected: [],
    expired: [],
    superseded: [],
    discarded: [],
  },
  policy: {
    unevaluated: ["deny", "allow", "approval_required"],
    deny: [],
    allow: [],
    approval_required: [],
  },
  approval: {
    pending: ["approved", "rejected", "expired"],
    approved: ["consumed", "expired"],
    consumed: [],
    rejected: [],
    expired: [],
  },
  effect: {
    reserved: ["dispatching", "failed"],
    dispatching: ["confirmed", "failed", "indeterminate"],
    indeterminate: ["reconciled_confirmed", "reconciled_failed"],
    confirmed: [],
    failed: [],
    reconciled_confirmed: [],
    reconciled_failed: [],
  },
  outcome: {
    preregistered: ["observed", "inconclusive"],
    observed: ["assessed", "inconclusive"],
    assessed: ["superseded"],
    inconclusive: ["superseded"],
    superseded: [],
  },
} as const;

type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type ContextSource = {
  position: number;
  sourceId: string;
  sourceKind: string;
  sourceVersion: string;
  sourceRef: string;
  contentHash: string;
  accessDecision: "allowed" | "redacted" | "denied";
  retrieval: JsonValue;
};

export type SealedActionIntent = {
  workspaceId: string;
  traceId: string;
  contextSnapshotId: string;
  sourceArtifactId: string;
  intentKey: string;
  actionKind: "email_test";
  truthMode: "TEST";
  recipients: string[];
  recipientSetHash: string;
  subject: string;
  body: string;
  cohortCap: number;
  evidenceIds: string[];
  metricDefinitionId: string;
  contextManifestHash: string;
  policyVersion: string;
  policyHash: string;
  nonce: string;
  expiresAt: string;
  createdBy: string;
  canonicalPayloadJson: string;
  canonicalPayloadHash: string;
};

export type ExecutionIntent = Pick<
  SealedActionIntent,
  | "workspaceId"
  | "traceId"
  | "recipientSetHash"
  | "contextManifestHash"
  | "policyHash"
  | "nonce"
  | "expiresAt"
  | "canonicalPayloadHash"
> & { id: string };

export type ExecutionPolicyDecision = {
  workspaceId: string;
  intentId: string;
  verdict: "deny" | "allow" | "approval_required";
  policyHash: string;
  evaluatedPayloadHash: string;
  evaluatedContextHash: string;
};

export type ExecutionApprovalGrant = {
  workspaceId: string;
  intentId: string;
  decision: "approved" | "rejected";
  boundPayloadHash: string;
  boundContextHash: string;
  boundPolicyHash: string;
  boundRecipientSetHash: string;
  nonce: string;
  expiresAt: string;
  approvedBy: string;
};

export type ExecutionRequest = {
  workspaceId: string;
  traceId: string;
  intentId: string;
  actorUserId: string;
  actorWorkspaceId: string;
  killSwitchEngaged: boolean;
  canonicalPayloadHash: string;
  contextManifestHash: string;
  policyHash: string;
  recipientSetHash: string;
  nonce: string;
  now: string;
  priorAttemptCount: number;
};

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SECRET_PATTERNS = [
  /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/i,
  /\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{12,}/,
  /\b(?:sk|rk|pk)-[A-Za-z0-9_-]{16,}/,
  /\bgh[oprsu]_[A-Za-z0-9]{20,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function normalizedJson(value: unknown, path = "value"): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    invariant(Number.isFinite(value), `${path} contains a non-finite number`);
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => normalizedJson(item, `${path}[${index}]`));
  }
  invariant(
    typeof value === "object" && value !== null,
    `${path} is not canonical JSON data`,
  );

  const record = value as Record<string, unknown>;
  const result: Record<string, JsonValue> = {};
  for (const key of Object.keys(record).sort()) {
    invariant(record[key] !== undefined, `${path}.${key} is undefined`);
    result[key] = normalizedJson(record[key], `${path}.${key}`);
  }
  return result;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(normalizedJson(value));
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function sealCanonical(value: unknown): Promise<{
  canonicalJson: string;
  sha256: string;
}> {
  const canonicalJson = stableStringify(value);
  return { canonicalJson, sha256: await sha256Hex(canonicalJson) };
}

export function isSha256(value: unknown): value is string {
  return typeof value === "string" && SHA256_PATTERN.test(value);
}

export const AUTHORITY_CONTROL_REASONS = [
  "workspace_initialized",
  "migration_backfill",
  "owner_transition",
] as const;

export type AuthorityControlReason = (typeof AUTHORITY_CONTROL_REASONS)[number];

export type AuthorityControlEvent = {
  id: string;
  workspaceId: string;
  sequence: number;
  controlKind: "kill_switch";
  priorState: boolean | null;
  currentState: boolean;
  actorUserId: string;
  reasonCode: AuthorityControlReason;
  idempotencyKey: string;
  payloadJson: string;
  contentHash: string;
  occurredAt: string;
};

export async function sealAuthorityControlEvent(input: Omit<
  AuthorityControlEvent,
  "controlKind" | "payloadJson" | "contentHash"
>): Promise<AuthorityControlEvent> {
  invariant(input.id.trim().length > 0, "authority event id is required");
  invariant(input.workspaceId.trim().length > 0, "authority workspace is required");
  invariant(Number.isInteger(input.sequence) && input.sequence >= 1, "authority sequence is invalid");
  invariant(input.sequence === 1 ? input.priorState === null : typeof input.priorState === "boolean", "authority prior state is invalid");
  invariant(typeof input.currentState === "boolean", "authority current state is invalid");
  invariant(input.sequence === 1 || input.priorState !== input.currentState, "authority transition is a no-op");
  invariant(input.actorUserId.trim().length > 0, "authority actor is required");
  invariant(AUTHORITY_CONTROL_REASONS.includes(input.reasonCode), "authority reason is invalid");
  invariant(input.idempotencyKey.trim().length > 0, "authority idempotency key is required");
  invariant(Number.isFinite(Date.parse(input.occurredAt)), "authority event time is invalid");

  const sealed = await sealCanonical({
    actorUserId: input.actorUserId,
    controlKind: "kill_switch",
    currentState: input.currentState,
    eventId: input.id,
    occurredAt: input.occurredAt,
    priorState: input.priorState,
    reasonCode: input.reasonCode,
    sequence: input.sequence,
    workspaceId: input.workspaceId,
  });
  return {
    ...input,
    controlKind: "kill_switch",
    payloadJson: sealed.canonicalJson,
    contentHash: sealed.sha256,
  };
}

export async function validatePersistedAuthorityControlEvent(
  event: AuthorityControlEvent,
): Promise<string[]> {
  try {
    const resealed = await sealAuthorityControlEvent({
      id: event.id,
      workspaceId: event.workspaceId,
      sequence: event.sequence,
      priorState: event.priorState,
      currentState: event.currentState,
      actorUserId: event.actorUserId,
      reasonCode: event.reasonCode,
      idempotencyKey: event.idempotencyKey,
      occurredAt: event.occurredAt,
    });
    const errors: string[] = [];
    if (event.controlKind !== "kill_switch") errors.push("authority control kind is invalid");
    if (event.payloadJson !== resealed.payloadJson) errors.push("authority payload does not match its fields");
    if (event.contentHash !== resealed.contentHash) errors.push("authority payload hash is invalid");
    return errors;
  } catch (error) {
    return [`authority event cannot be resealed: ${error instanceof Error ? error.message : String(error)}`];
  }
}

export const L04_PROJECTION_DETAIL_ALLOWLIST = {
  trace: ["assessmentLabel", "authorityControlEventRef", "effectRef", "intentRef", "outcomeRef"],
  context: ["manifestHash", "sourceCount"],
  graph: ["attempt", "executionMode", "graphVersion", "handlerVersion", "nodeKey", "outputHash"],
  intent: ["effectRef", "grantRef", "intentVersion", "policyRef", "policyVersion", "supersededByIntentRef", "supersedesIntentRef"],
  policy: ["intentRef", "policyVersion", "verdict"],
  approval: ["decision", "effectRef", "expiresAt", "intentRef", "policyRef"],
  effect: ["authorityControlEventRef", "authorityControlHash", "authorityControlSequence", "effectRef", "errorCode", "providerMode", "retryAttempted"],
  outcome: ["assessmentLabel", "metricName"],
} as const;

export type TraceSubjectType = keyof typeof L04_PROJECTION_DETAIL_ALLOWLIST;

export type PersistedTraceEventRow = {
  id: string;
  workspaceId: string;
  traceId: string;
  sequence: number;
  eventType: string;
  subjectType: TraceSubjectType;
  subjectId: string;
  priorState: string | null;
  currentState: string;
  actorType: "human" | "system" | "agent" | "adapter";
  actorId: string | null;
  payloadJson: string;
  payloadHash: string;
  occurredAt: string;
};

export type RedactedTraceEvent = {
  id: string;
  sequence: number;
  eventType: string;
  subjectType: TraceSubjectType;
  subjectRef: string;
  priorState: string | null;
  currentState: string;
  actorType: PersistedTraceEventRow["actorType"];
  actorDisplay: string;
  occurredAt: string;
  payloadHash: string;
  details: Record<string, JsonValue>;
};

const ACTOR_DISPLAY: Record<PersistedTraceEventRow["actorType"], string> = {
  human: "Workspace owner",
  system: "CrossSignal system",
  agent: "Bounded reasoning agent",
  adapter: "Labeled adapter",
};

const L04_KNOWN_EVENT_TYPES = new Set([
  "trace.collecting", "trace.context_frozen", "trace.reasoning", "trace.awaiting_approval",
  "trace.executing", "trace.observing", "trace.assessed", "trace.failed", "trace.indeterminate",
  "graph.initialized", "graph.node_pending", "graph.node_claimed", "graph.node_recovered",
  "graph.node_succeeded", "graph.node_failed",
  "intent.drafted", "intent.sealed", "intent.policy_evaluated", "intent.approval_pending",
  "intent.approved", "intent.consumed", "intent.superseded",
  "policy.unevaluated", "policy.decided",
  "approval.pending", "approval.approved", "approval.consumed",
  "effect.reserved", "effect.dispatching", "effect.confirmed", "effect.failed", "effect.indeterminate",
  "outcome.preregistered", "outcome.observed", "outcome.assessed",
]);

export async function projectFlightTraceEvents(input: {
  workspaceId: string;
  traceId: string;
  rows: readonly PersistedTraceEventRow[];
}): Promise<RedactedTraceEvent[]> {
  const rows = [...input.rows].sort((left, right) => left.sequence - right.sequence);
  const subjectHeads = new Map<string, string>();
  const projection: RedactedTraceEvent[] = [];

  try {
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      invariant(row.workspaceId === input.workspaceId && row.traceId === input.traceId, "l04_trace_projection_incomplete");
      invariant(row.sequence === index + 1, "l04_trace_projection_incomplete");
      invariant(Number.isFinite(Date.parse(row.occurredAt)), "l04_trace_projection_incomplete");
      const payload = JSON.parse(row.payloadJson) as unknown;
      invariant(await sha256Hex(row.payloadJson) === row.payloadHash, "l04_trace_projection_incomplete");
      invariant(stableStringify(payload) === row.payloadJson, "l04_trace_projection_incomplete");

      const subjectKey = `${row.subjectType}:${row.subjectId}`;
      const priorHead = subjectHeads.get(subjectKey);
      invariant(priorHead === undefined ? row.priorState === null : row.priorState === priorHead, "l04_trace_projection_incomplete");
      subjectHeads.set(subjectKey, row.currentState);

      const record = payload && typeof payload === "object" && !Array.isArray(payload)
        ? payload as Record<string, unknown>
        : {};
      const allowlist = L04_KNOWN_EVENT_TYPES.has(row.eventType)
        ? L04_PROJECTION_DETAIL_ALLOWLIST[row.subjectType] ?? []
        : [];
      const details: Record<string, JsonValue> = {};
      for (const key of allowlist) {
        if (record[key] !== undefined) details[key] = normalizedJson(record[key], `payload.${key}`);
      }
      projection.push({
        id: row.id,
        sequence: row.sequence,
        eventType: row.eventType,
        subjectType: row.subjectType,
        subjectRef: row.subjectId,
        priorState: row.priorState,
        currentState: row.currentState,
        actorType: row.actorType,
        actorDisplay: ACTOR_DISPLAY[row.actorType],
        occurredAt: row.occurredAt,
        payloadHash: row.payloadHash,
        details,
      });
    }
    return projection;
  } catch {
    throw new Error("l04_trace_projection_incomplete");
  }
}

export type ReasoningRecoveryNode = {
  id: string;
  nodeKey: string;
  attempt: number;
  currentState: "pending" | "running" | "succeeded" | "failed" | "skipped";
  inputHash: string;
  outputHash: string | null;
};

export function planReasoningRecovery(
  nodes: readonly ReasoningRecoveryNode[],
  expectedInputHash: string,
): {
  preserved: ReasoningRecoveryNode[];
  resume: ReasoningRecoveryNode[];
  blocked: ReasoningRecoveryNode[];
} {
  invariant(isSha256(expectedInputHash), "recovery input hash is invalid");
  const identities = new Set<string>();
  const preserved: ReasoningRecoveryNode[] = [];
  const resume: ReasoningRecoveryNode[] = [];
  const blocked: ReasoningRecoveryNode[] = [];

  for (const node of nodes) {
    invariant(node.id.trim().length > 0, "recovery node id is required");
    invariant(node.nodeKey.trim().length > 0, "recovery node key is required");
    invariant(Number.isInteger(node.attempt) && node.attempt >= 1, "recovery attempt is invalid");
    invariant(node.inputHash === expectedInputHash, `recovery input drift: ${node.nodeKey}`);
    const identity = `${node.id}:${node.nodeKey}:${node.attempt}`;
    invariant(!identities.has(identity), `duplicate recovery identity: ${identity}`);
    identities.add(identity);

    if (node.currentState === "succeeded") {
      invariant(isSha256(node.outputHash), `completed node output is invalid: ${node.nodeKey}`);
      preserved.push({ ...node });
    } else if (node.currentState === "skipped") {
      preserved.push({ ...node });
    } else if (node.currentState === "pending" || node.currentState === "running") {
      invariant(node.outputHash === null, `incomplete node already has output: ${node.nodeKey}`);
      resume.push({ ...node });
    } else if (node.currentState === "failed") {
      blocked.push({ ...node });
    } else {
      invariant(false, `unknown recovery state: ${String(node.currentState)}`);
    }
  }

  return { preserved, resume, blocked };
}

export function canTransition(
  machine: TransitionMachine,
  from: string,
  to: string,
): boolean {
  const transitions = STATE_TRANSITIONS[machine] as Record<string, readonly string[]>;
  return transitions[from]?.includes(to) ?? false;
}

export function assertTransition(
  machine: TransitionMachine,
  from: string,
  to: string,
): void {
  invariant(
    canTransition(machine, from, to),
    `invalid ${machine} transition: ${from} -> ${to}`,
  );
}

export function findSecretPaths(value: unknown, path = "value"): string[] {
  if (typeof value === "string") {
    return SECRET_PATTERNS.some((pattern) => pattern.test(value)) ? [path] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findSecretPaths(item, `${path}[${index}]`));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) =>
      findSecretPaths(item, `${path}.${key}`),
    );
  }
  return [];
}

export async function createContextManifest(sources: ContextSource[]): Promise<{
  orderedManifestJson: string;
  manifestHash: string;
  sourceCount: number;
}> {
  invariant(sources.length > 0, "context manifest must contain at least one source");
  const sourceIds = new Set<string>();
  sources.forEach((source, index) => {
    invariant(source.position === index + 1, "context positions must be contiguous and ordered");
    invariant(!sourceIds.has(source.sourceId), `duplicate context source: ${source.sourceId}`);
    sourceIds.add(source.sourceId);
    invariant(source.sourceId.trim().length > 0, "context source id is required");
    invariant(source.sourceVersion.trim().length > 0, "context source version is required");
    invariant(source.sourceRef.trim().length > 0, "context source ref is required");
    invariant(isSha256(source.contentHash), `invalid source hash: ${source.sourceId}`);
    invariant(
      source.accessDecision !== "denied",
      `denied source cannot enter a frozen context: ${source.sourceId}`,
    );
  });

  const sealed = await sealCanonical(
    sources.map((source) => ({
      position: source.position,
      sourceId: source.sourceId,
      sourceKind: source.sourceKind,
      sourceVersion: source.sourceVersion,
      sourceRef: source.sourceRef,
      contentHash: source.contentHash,
      accessDecision: source.accessDecision,
      retrieval: source.retrieval,
    })),
  );
  return {
    orderedManifestJson: sealed.canonicalJson,
    manifestHash: sealed.sha256,
    sourceCount: sources.length,
  };
}

export async function sealActionIntent(input: {
  workspaceId: string;
  traceId: string;
  contextSnapshotId: string;
  sourceArtifactId: string;
  intentKey: string;
  recipients: string[];
  subject: string;
  body: string;
  evidenceIds: string[];
  metricDefinitionId: string;
  contextManifestHash: string;
  policyVersion: string;
  policyHash: string;
  nonce: string;
  expiresAt: string;
  createdBy: string;
}): Promise<SealedActionIntent> {
  const recipients = input.recipients.map((recipient) => recipient.trim().toLowerCase());
  invariant(recipients.length >= 1 && recipients.length <= 3, "TEST cohort must contain 1-3 recipients");
  invariant(new Set(recipients).size === recipients.length, "recipient set contains duplicates");
  invariant(recipients.every((recipient) => EMAIL_PATTERN.test(recipient)), "recipient set contains an invalid address");
  invariant(input.subject.trim().length > 0, "intent subject is required");
  invariant(input.body.trim().length > 0, "intent body is required");
  invariant(input.evidenceIds.length > 0, "intent must cite evidence");
  invariant(
    new Set(input.evidenceIds).size === input.evidenceIds.length,
    "intent evidence contains duplicates",
  );
  invariant(isSha256(input.contextManifestHash), "intent context hash is invalid");
  invariant(isSha256(input.policyHash), "intent policy hash is invalid");
  invariant(Number.isFinite(Date.parse(input.expiresAt)), "intent expiry is invalid");
  invariant(findSecretPaths({ subject: input.subject, body: input.body }).length === 0, "intent contains a secret-like value");

  const recipientSeal = await sealCanonical(recipients);
  const canonicalPayload = {
    actionKind: "email_test" as const,
    body: input.body,
    cohortCap: recipients.length,
    contextManifestHash: input.contextManifestHash,
    evidenceIds: input.evidenceIds,
    expiresAt: input.expiresAt,
    intentKey: input.intentKey,
    metricDefinitionId: input.metricDefinitionId,
    nonce: input.nonce,
    policyHash: input.policyHash,
    policyVersion: input.policyVersion,
    recipientSetHash: recipientSeal.sha256,
    recipients,
    subject: input.subject,
    truthMode: "TEST" as const,
  };
  const payloadSeal = await sealCanonical(canonicalPayload);

  return {
    ...input,
    actionKind: "email_test",
    truthMode: "TEST",
    recipients,
    recipientSetHash: recipientSeal.sha256,
    cohortCap: recipients.length,
    canonicalPayloadJson: payloadSeal.canonicalJson,
    canonicalPayloadHash: payloadSeal.sha256,
  };
}

export async function validatePersistedActionIntent(
  intent: SealedActionIntent,
): Promise<string[]> {
  const errors: string[] = [];
  const expect = (condition: boolean, message: string) => {
    if (!condition) errors.push(message);
  };

  let recomputed: SealedActionIntent;
  try {
    recomputed = await sealActionIntent({
      workspaceId: intent.workspaceId,
      traceId: intent.traceId,
      contextSnapshotId: intent.contextSnapshotId,
      sourceArtifactId: intent.sourceArtifactId,
      intentKey: intent.intentKey,
      recipients: intent.recipients,
      subject: intent.subject,
      body: intent.body,
      evidenceIds: intent.evidenceIds,
      metricDefinitionId: intent.metricDefinitionId,
      contextManifestHash: intent.contextManifestHash,
      policyVersion: intent.policyVersion,
      policyHash: intent.policyHash,
      nonce: intent.nonce,
      expiresAt: intent.expiresAt,
      createdBy: intent.createdBy,
    });
  } catch (error) {
    errors.push(
      `persisted intent cannot be resealed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return [...new Set(errors)];
  }

  expect(intent.actionKind === recomputed.actionKind, "persisted intent action kind is invalid");
  expect(intent.truthMode === recomputed.truthMode, "persisted intent truth mode is invalid");
  expect(
    stableStringify(intent.recipients) === stableStringify(recomputed.recipients),
    "persisted intent recipients are not normalized",
  );
  expect(intent.cohortCap === recomputed.cohortCap, "persisted intent cohort cap is invalid");
  expect(
    intent.recipientSetHash === recomputed.recipientSetHash,
    "persisted intent recipient hash does not match its recipients",
  );
  expect(
    intent.canonicalPayloadJson === recomputed.canonicalPayloadJson,
    "persisted intent flattened fields do not match its canonical payload",
  );
  expect(
    intent.canonicalPayloadHash === recomputed.canonicalPayloadHash,
    "persisted intent canonical payload hash is invalid",
  );
  return [...new Set(errors)];
}

export function validateReasoningArtifact(input: {
  content: unknown;
  evidenceCitations: string[];
  declaredEvidenceIds: string[];
}): string[] {
  const errors: string[] = [];
  const declared = new Set(input.declaredEvidenceIds);
  if (input.evidenceCitations.length === 0) errors.push("artifact has no evidence citations");
  for (const evidenceId of input.evidenceCitations) {
    if (!declared.has(evidenceId)) errors.push(`artifact cites undeclared evidence: ${evidenceId}`);
  }
  for (const path of findSecretPaths(input.content, "content")) {
    errors.push(`artifact contains a secret-like value at ${path}`);
  }
  try {
    stableStringify(input.content);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return errors;
}

export function validateExecutionAuthority(input: {
  intent: ExecutionIntent;
  policy: ExecutionPolicyDecision;
  grant: ExecutionApprovalGrant;
  request: ExecutionRequest;
}): string[] {
  const { intent, policy, grant, request } = input;
  const errors: string[] = [];
  const expect = (condition: boolean, message: string) => {
    if (!condition) errors.push(message);
  };

  expect(request.killSwitchEngaged === false, "kill switch is engaged or unavailable");
  expect(request.workspaceId === request.actorWorkspaceId, "actor workspace mismatch");
  expect(request.workspaceId === intent.workspaceId, "intent workspace mismatch");
  expect(request.workspaceId === policy.workspaceId, "policy workspace mismatch");
  expect(request.workspaceId === grant.workspaceId, "approval workspace mismatch");
  expect(request.traceId === intent.traceId, "trace mismatch");
  expect(request.intentId === intent.id, "request intent mismatch");
  expect(policy.intentId === intent.id, "policy intent mismatch");
  expect(grant.intentId === intent.id, "approval intent mismatch");
  expect(policy.verdict === "approval_required", "policy did not require this approval path");
  expect(grant.decision === "approved", "approval was not granted");
  expect(request.canonicalPayloadHash === intent.canonicalPayloadHash, "request payload was mutated");
  expect(policy.evaluatedPayloadHash === intent.canonicalPayloadHash, "policy evaluated a different payload");
  expect(grant.boundPayloadHash === intent.canonicalPayloadHash, "approval bound a different payload");
  expect(request.contextManifestHash === intent.contextManifestHash, "request context was mutated");
  expect(policy.evaluatedContextHash === intent.contextManifestHash, "policy evaluated different context");
  expect(grant.boundContextHash === intent.contextManifestHash, "approval bound different context");
  expect(request.policyHash === intent.policyHash, "request policy was mutated");
  expect(policy.policyHash === intent.policyHash, "policy hash mismatch");
  expect(grant.boundPolicyHash === intent.policyHash, "approval bound different policy");
  expect(request.recipientSetHash === intent.recipientSetHash, "recipient set was mutated");
  expect(grant.boundRecipientSetHash === intent.recipientSetHash, "approval bound different recipients");
  expect(request.nonce === intent.nonce && grant.nonce === intent.nonce, "approval nonce mismatch");
  expect(request.actorUserId === grant.approvedBy, "executor actor is not the approver");
  expect(request.priorAttemptCount === 0, "approval is stale or already consumed");

  const now = Date.parse(request.now);
  const intentExpiry = Date.parse(intent.expiresAt);
  const grantExpiry = Date.parse(grant.expiresAt);
  expect(Number.isFinite(now), "execution time is invalid");
  expect(Number.isFinite(intentExpiry) && now < intentExpiry, "intent is expired");
  expect(Number.isFinite(grantExpiry) && now < grantExpiry, "approval is expired");
  return [...new Set(errors)];
}

export function assertExecutionAuthority(input: Parameters<typeof validateExecutionAuthority>[0]): void {
  const errors = validateExecutionAuthority(input);
  invariant(errors.length === 0, errors.join("; "));
}

export type OutcomeAssessmentValidationInput = {
  label: string;
  evidenceIds: string[];
  limitations: string[];
  observationCount: number;
  invalidSignatureCount: number;
  observationTruthModes: readonly TruthMode[];
};

export function validateOutcomeAssessment(
  input: OutcomeAssessmentValidationInput,
): string[] {
  const errors: string[] = [];
  const observationTruthModes = Array.isArray(input.observationTruthModes)
    ? input.observationTruthModes
    : [];
  if (!ASSESSMENT_LABELS.includes(input.label as AssessmentLabel)) {
    errors.push(`invalid assessment label: ${input.label}`);
  }
  if (input.evidenceIds.length === 0) errors.push("assessment has no evidence");
  if (input.limitations.length === 0) errors.push("assessment has no limitations");
  if (input.observationCount < 1 && input.label !== "inconclusive") {
    errors.push("assessment without observations must be inconclusive");
  }
  if (input.invalidSignatureCount > 0 && input.label === "supported") {
    errors.push("invalid signed observations cannot support an outcome");
  }
  if (observationTruthModes.length !== input.observationCount) {
    errors.push("assessment observation truth modes do not match its observation count");
  }
  for (const truthMode of observationTruthModes) {
    if (!TRUTH_MODES.includes(truthMode)) {
      errors.push(`invalid observation truth mode: ${truthMode}`);
    }
  }
  if (input.label === "supported" && observationTruthModes.includes("FIXTURE")) {
    errors.push("FIXTURE observations cannot support an outcome");
  }
  return errors;
}
