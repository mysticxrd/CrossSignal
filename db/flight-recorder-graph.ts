import {
  sealCanonical,
  stableStringify,
  validateReasoningArtifact,
} from "./flight-recorder-contracts";
import {
  buildDemoIntent,
  DEFAULT_ONBOARDING_BODY,
  DEFAULT_ONBOARDING_RECIPIENTS,
  DEFAULT_ONBOARDING_SUBJECT,
} from "./flight-recorder-demo";
import { getD1 } from ".";

export const REASONING_GRAPH_VERSION = "crosssignal-fixed-graph-v1";
export const REASONING_HANDLER_VERSION = "crosssignal-fixture-handlers-v1";
export const REASONING_ARTIFACT_SCHEMA_VERSION = "reasoning-artifact-v2";
export const REASONING_LEASE_DURATION_MS = 30_000;

export const REASONING_ERRORS = Object.freeze({
  arbitraryGraph: "l06_arbitrary_graph_rejected",
  claimBusy: "l06_claim_busy",
  claimExpired: "l06_claim_expired",
  claimOwnership: "l06_claim_ownership_mismatch",
  dependencyBlocked: "l06_dependency_blocked",
  inputDrift: "l06_input_drift",
  interruptedAttempt: "l06_interrupted_attempt",
  invalidArtifact: "l06_invalid_artifact",
  handlerFailed: "l06_handler_failed",
  tenantMismatch: "l06_workspace_trace_mismatch",
});

export const REASONING_NODE_REGISTRY = Object.freeze([
  Object.freeze({
    nodeKey: "planner",
    predecessors: Object.freeze([]),
    artifactKind: "plan",
    citations: Object.freeze(["evidence:activation-drop", "evidence:onboarding-feedback"]),
  }),
  Object.freeze({
    nodeKey: "quantitative",
    predecessors: Object.freeze(["planner"]),
    artifactKind: "analysis",
    citations: Object.freeze(["evidence:activation-drop", "metric:activation-72h"]),
  }),
  Object.freeze({
    nodeKey: "qualitative",
    predecessors: Object.freeze(["planner"]),
    artifactKind: "analysis",
    citations: Object.freeze(["evidence:onboarding-feedback", "context:brand"]),
  }),
  Object.freeze({
    nodeKey: "experiment_design",
    predecessors: Object.freeze(["planner"]),
    artifactKind: "analysis",
    citations: Object.freeze(["context:email-policy", "metric:activation-72h"]),
  }),
  Object.freeze({
    nodeKey: "skeptic",
    predecessors: Object.freeze(["quantitative", "qualitative", "experiment_design"]),
    artifactKind: "critique",
    citations: Object.freeze(["evidence:activation-drop", "evidence:onboarding-feedback"]),
  }),
  Object.freeze({
    nodeKey: "synthesizer",
    predecessors: Object.freeze([
      "planner",
      "quantitative",
      "qualitative",
      "experiment_design",
      "skeptic",
    ]),
    artifactKind: "intent_draft",
    citations: Object.freeze([
      "evidence:activation-drop",
      "evidence:onboarding-feedback",
      "context:email-policy",
      "metric:activation-72h",
    ]),
  }),
] as const);

export type ReasoningNodeKey = (typeof REASONING_NODE_REGISTRY)[number]["nodeKey"];

type RuntimeTestHooks = {
  now?: () => string;
  leaseToken?: (nodeKey: ReasoningNodeKey, attempt: number) => string;
  beforeClaimCommit?: (nodeKey: ReasoningNodeKey, attempt: number) => Promise<void>;
  afterClaim?: (nodeKey: ReasoningNodeKey, attempt: number) => Promise<"continue" | "stop">;
  beforeFinalizeCommit?: (nodeKey: ReasoningNodeKey, attempt: number) => Promise<void>;
  failNode?: ReasoningNodeKey;
  mutateArtifact?: (nodeKey: ReasoningNodeKey, content: Record<string, unknown>, citations: string[]) => void;
  onHandlerInvocation?: (nodeKey: ReasoningNodeKey, attempt: number) => void;
  stopAfterCompletions?: number;
};

let runtimeTestHooks: RuntimeTestHooks | null = null;

export function installReasoningRuntimeHooksForTest(
  hooks: RuntimeTestHooks | null,
): () => void {
  runtimeTestHooks = hooks;
  return () => {
    runtimeTestHooks = null;
  };
}

class ReasoningFault extends Error {
  constructor(readonly code: string, detail = "") {
    super(detail ? `${code}: ${detail}` : code);
  }
}

function fail(code: string, detail = ""): never {
  throw new ReasoningFault(code, detail);
}

function definition(nodeKey: string) {
  const found = REASONING_NODE_REGISTRY.find((node) => node.nodeKey === nodeKey);
  if (!found) fail(REASONING_ERRORS.arbitraryGraph, nodeKey);
  return found;
}

function currentTime(): string {
  const value = runtimeTestHooks?.now?.() ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(value))) fail(REASONING_ERRORS.dependencyBlocked, "invalid clock");
  return new Date(value).toISOString();
}

function addMilliseconds(value: string, amount: number): string {
  return new Date(Date.parse(value) + amount).toISOString();
}

type GraphRequest = {
  userId: string;
  actorWorkspaceId: string;
  workspaceId: string;
  traceId: string;
};

type NodeRow = {
  id: string;
  workspace_id: string;
  trace_id: string;
  node_key: ReasoningNodeKey;
  logical_node_id: string;
  graph_version: string;
  execution_mode: "runtime" | "precomputed_fixture";
  handler_version: string;
  predecessor_outputs_json: string;
  attempt: number;
  current_state: "pending" | "running" | "succeeded" | "failed" | "skipped";
  input_hash: string;
  output_hash: string | null;
  error_code: string | null;
  lease_token: string | null;
  lease_expires_at: string | null;
  completion_token_hash: string | null;
  started_at: string | null;
  completed_at: string | null;
};

type PredecessorOutput = { nodeKey: ReasoningNodeKey; outputHash: string };

function rejectCallerControlledGraph(input: GraphRequest & Record<string, unknown>): void {
  for (const key of ["nodes", "edges", "handler", "graphVersion", "truthMode"]) {
    if (key in input) fail(REASONING_ERRORS.arbitraryGraph, key);
  }
}

async function requireRuntimeScope(input: GraphRequest): Promise<{
  traceState: string;
  truthMode: string;
  contextManifestHash: string;
  contextSnapshotId: string;
}> {
  rejectCallerControlledGraph(input);
  if (input.workspaceId !== input.actorWorkspaceId) fail(REASONING_ERRORS.tenantMismatch);
  const d1 = getD1();
  const membership = await d1
    .prepare(`SELECT role FROM workspace_members
      WHERE workspace_id = ? AND user_id = ? AND role = 'owner' LIMIT 1`)
    .bind(input.workspaceId, input.userId)
    .first<{ role: string }>();
  const scope = await d1
    .prepare(`SELECT trace.current_state AS trace_state, trace.truth_mode,
        snapshot.manifest_hash, snapshot.id AS context_snapshot_id
      FROM flight_traces trace
      JOIN context_snapshots snapshot
        ON snapshot.workspace_id = trace.workspace_id
        AND snapshot.trace_id = trace.id
        AND snapshot.current_state = 'frozen'
      WHERE trace.workspace_id = ? AND trace.id = ? LIMIT 1`)
    .bind(input.workspaceId, input.traceId)
    .first<{
      trace_state: string;
      truth_mode: string;
      manifest_hash: string;
      context_snapshot_id: string;
    }>();
  if (!membership || !scope) fail(REASONING_ERRORS.tenantMismatch);
  if (scope.truth_mode !== "FIXTURE") {
    fail(REASONING_ERRORS.dependencyBlocked, "no verified non-fixture handler adapter");
  }
  if (!["context_frozen", "reasoning", "awaiting_approval", "failed"].includes(scope.trace_state)) {
    fail(REASONING_ERRORS.dependencyBlocked, `trace state ${scope.trace_state}`);
  }
  return {
    traceState: scope.trace_state,
    truthMode: scope.truth_mode,
    contextManifestHash: scope.manifest_hash,
    contextSnapshotId: scope.context_snapshot_id,
  };
}

async function stableScope(workspaceId: string, traceId: string): Promise<string> {
  return (await sealCanonical({ graphVersion: REASONING_GRAPH_VERSION, traceId, workspaceId })).sha256.slice(0, 20);
}

async function nextSequence(workspaceId: string, traceId: string): Promise<number> {
  const row = await getD1()
    .prepare(`SELECT COALESCE(MAX(sequence), 0) AS sequence
      FROM flight_trace_events WHERE workspace_id = ? AND trace_id = ?`)
    .bind(workspaceId, traceId)
    .first<{ sequence: number }>();
  return Number(row?.sequence ?? 0) + 1;
}

async function eventStatement(input: {
  workspaceId: string;
  traceId: string;
  sequence: number;
  eventType: string;
  subjectType: "trace" | "graph";
  subjectId: string;
  priorState: string | null;
  currentState: string;
  actorType: "human" | "system" | "agent";
  actorId: string | null;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  occurredAt: string;
}) {
  const payload = await sealCanonical(input.payload);
  const identity = await sealCanonical({
    idempotencyKey: input.idempotencyKey,
    traceId: input.traceId,
    workspaceId: input.workspaceId,
  });
  return getD1()
    .prepare(`INSERT INTO flight_trace_events (
      id, workspace_id, trace_id, sequence, event_type, subject_type,
      subject_id, prior_state, current_state, actor_type, actor_id,
      payload_json, payload_hash, idempotency_key, occurred_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      `trace_event_${identity.sha256.slice(0, 24)}`,
      input.workspaceId,
      input.traceId,
      input.sequence,
      input.eventType,
      input.subjectType,
      input.subjectId,
      input.priorState,
      input.currentState,
      input.actorType,
      input.actorId,
      payload.canonicalJson,
      payload.sha256,
      input.idempotencyKey,
      input.occurredAt,
    );
}

async function loadLatestAttempt(
  workspaceId: string,
  traceId: string,
  nodeKey: ReasoningNodeKey,
): Promise<NodeRow | null> {
  return getD1()
    .prepare(`SELECT * FROM reasoning_nodes
      WHERE workspace_id = ? AND trace_id = ? AND graph_version = ? AND node_key = ?
      ORDER BY attempt DESC LIMIT 1`)
    .bind(workspaceId, traceId, REASONING_GRAPH_VERSION, nodeKey)
    .first<NodeRow>();
}

async function predecessorOutputs(
  workspaceId: string,
  traceId: string,
  nodeKey: ReasoningNodeKey,
): Promise<PredecessorOutput[]> {
  const node = definition(nodeKey);
  const outputs: PredecessorOutput[] = [];
  for (const predecessor of node.predecessors) {
    const row = await getD1()
      .prepare(`SELECT node.output_hash
        FROM reasoning_nodes node
        JOIN reasoning_artifacts artifact
          ON artifact.workspace_id = node.workspace_id
          AND artifact.trace_id = node.trace_id
          AND artifact.node_id = node.id
          AND artifact.content_hash = node.output_hash
        WHERE node.workspace_id = ? AND node.trace_id = ?
          AND node.graph_version = ? AND node.node_key = ?
          AND node.current_state = 'succeeded' LIMIT 1`)
      .bind(workspaceId, traceId, REASONING_GRAPH_VERSION, predecessor)
      .first<{ output_hash: string }>();
    if (!row) fail(REASONING_ERRORS.dependencyBlocked, `${nodeKey}:${predecessor}`);
    outputs.push({ nodeKey: predecessor as ReasoningNodeKey, outputHash: row.output_hash });
  }
  return outputs;
}

async function expectedAttemptInput(input: {
  workspaceId: string;
  traceId: string;
  truthMode: string;
  contextManifestHash: string;
  nodeKey: ReasoningNodeKey;
  attempt: number;
}) {
  const outputs = await predecessorOutputs(input.workspaceId, input.traceId, input.nodeKey);
  const sealed = await sealCanonical({
    workspaceId: input.workspaceId,
    traceId: input.traceId,
    truthMode: input.truthMode,
    contextManifestHash: input.contextManifestHash,
    graphVersion: REASONING_GRAPH_VERSION,
    nodeKey: input.nodeKey,
    handlerVersion: REASONING_HANDLER_VERSION,
    attempt: input.attempt,
    predecessorOutputs: outputs,
  });
  return { inputHash: sealed.sha256, predecessorOutputs: outputs };
}

async function pendingAttempt(input: {
  workspaceId: string;
  traceId: string;
  truthMode: string;
  contextManifestHash: string;
  nodeKey: ReasoningNodeKey;
  attempt: number;
}) {
  const scope = await stableScope(input.workspaceId, input.traceId);
  const expected = await expectedAttemptInput(input);
  return {
    id: `node_attempt_${scope}_${input.nodeKey}_${input.attempt}`,
    logicalNodeId: `logical_node_${scope}_${input.nodeKey}`,
    predecessorOutputsJson: stableStringify(expected.predecessorOutputs),
    ...expected,
  };
}

function pendingInsertStatement(input: {
  id: string;
  logicalNodeId: string;
  workspaceId: string;
  traceId: string;
  nodeKey: ReasoningNodeKey;
  attempt: number;
  inputHash: string;
  predecessorOutputsJson: string;
}) {
  return getD1()
    .prepare(`INSERT INTO reasoning_nodes (
      id, workspace_id, trace_id, node_key, logical_node_id, graph_version,
      execution_mode, handler_version, predecessor_outputs_json, attempt,
      current_state, input_hash, output_hash, error_code, lease_token,
      lease_expires_at, completion_token_hash, started_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'runtime', ?, ?, ?, 'pending', ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL)`)
    .bind(
      input.id,
      input.workspaceId,
      input.traceId,
      input.nodeKey,
      input.logicalNodeId,
      REASONING_GRAPH_VERSION,
      REASONING_HANDLER_VERSION,
      input.predecessorOutputsJson,
      input.attempt,
      input.inputHash,
    );
}

async function initializeGraph(input: GraphRequest, scope: Awaited<ReturnType<typeof requireRuntimeScope>>) {
  if (scope.traceState !== "context_frozen") return;
  const existing = await loadLatestAttempt(input.workspaceId, input.traceId, "planner");
  if (existing) fail(REASONING_ERRORS.dependencyBlocked, "planner exists before initialization");
  const now = currentTime();
  const planner = await pendingAttempt({
    workspaceId: input.workspaceId,
    traceId: input.traceId,
    truthMode: scope.truthMode,
    contextManifestHash: scope.contextManifestHash,
    nodeKey: "planner",
    attempt: 1,
  });
  const sequence = await nextSequence(input.workspaceId, input.traceId);
  const reasoningEvent = await eventStatement({
    workspaceId: input.workspaceId,
    traceId: input.traceId,
    sequence,
    eventType: "trace.reasoning",
    subjectType: "trace",
    subjectId: input.traceId,
    priorState: "context_frozen",
    currentState: "reasoning",
    actorType: "agent",
    actorId: "crosssignal-persisted-executor-v1",
    payload: { executionMode: "runtime", graphVersion: REASONING_GRAPH_VERSION },
    idempotencyKey: `${input.traceId}:${REASONING_GRAPH_VERSION}:trace-reasoning`,
    occurredAt: now,
  });
  const initializedEvent = await eventStatement({
    workspaceId: input.workspaceId,
    traceId: input.traceId,
    sequence: sequence + 1,
    eventType: "graph.initialized",
    subjectType: "graph",
    subjectId: planner.id,
    priorState: null,
    currentState: "pending",
    actorType: "agent",
    actorId: "crosssignal-persisted-executor-v1",
    payload: {
      executionMode: "runtime",
      graphVersion: REASONING_GRAPH_VERSION,
      truthMode: "FIXTURE",
      logicalNodes: REASONING_NODE_REGISTRY.map(({ nodeKey, predecessors }) => ({
        nodeKey,
        predecessors,
      })),
    },
    idempotencyKey: `${input.traceId}:${REASONING_GRAPH_VERSION}:initialized`,
    occurredAt: now,
  });
  await getD1().batch([
    pendingInsertStatement({ ...planner, ...input, nodeKey: "planner", attempt: 1 }),
    getD1()
      .prepare(`UPDATE flight_traces SET current_state = 'reasoning', updated_at = ?
        WHERE workspace_id = ? AND id = ? AND current_state = 'context_frozen'`)
      .bind(now, input.workspaceId, input.traceId),
    reasoningEvent,
    initializedEvent,
  ]);
}

async function materializeRunnable(input: GraphRequest, scope: Awaited<ReturnType<typeof requireRuntimeScope>>) {
  for (const node of REASONING_NODE_REGISTRY) {
    if (await loadLatestAttempt(input.workspaceId, input.traceId, node.nodeKey)) continue;
    let attempt;
    try {
      attempt = await pendingAttempt({
        workspaceId: input.workspaceId,
        traceId: input.traceId,
        truthMode: scope.truthMode,
        contextManifestHash: scope.contextManifestHash,
        nodeKey: node.nodeKey,
        attempt: 1,
      });
    } catch (error) {
      if (error instanceof ReasoningFault && error.code === REASONING_ERRORS.dependencyBlocked) continue;
      throw error;
    }
    const now = currentTime();
    const sequence = await nextSequence(input.workspaceId, input.traceId);
    const event = await eventStatement({
      workspaceId: input.workspaceId,
      traceId: input.traceId,
      sequence,
      eventType: "graph.node_pending",
      subjectType: "graph",
      subjectId: attempt.id,
      priorState: null,
      currentState: "pending",
      actorType: "agent",
      actorId: "crosssignal-persisted-executor-v1",
      payload: {
        attempt: 1,
        graphVersion: REASONING_GRAPH_VERSION,
        inputHash: attempt.inputHash,
        nodeKey: node.nodeKey,
        predecessorOutputs: attempt.predecessorOutputs,
      },
      idempotencyKey: `${input.traceId}:${REASONING_GRAPH_VERSION}:${node.nodeKey}:1:pending`,
      occurredAt: now,
    });
    try {
      await getD1().batch([
        pendingInsertStatement({ ...attempt, ...input, nodeKey: node.nodeKey, attempt: 1 }),
        event,
      ]);
    } catch (error) {
      if (!(await loadLatestAttempt(input.workspaceId, input.traceId, node.nodeKey))) throw error;
    }
  }
}

export async function claimPersistedReasoningNode(
  input: GraphRequest,
  nodeKey: ReasoningNodeKey,
): Promise<{ status: "claimed"; leaseToken: string; attempt: number } | { status: "busy" | "preserved"; attempt: number }> {
  const scope = await requireRuntimeScope(input);
  const row = await loadLatestAttempt(input.workspaceId, input.traceId, definition(nodeKey).nodeKey);
  if (!row) fail(REASONING_ERRORS.dependencyBlocked, nodeKey);
  if (row.current_state === "succeeded") return { status: "preserved", attempt: row.attempt };
  if (row.current_state === "running") {
    if (row.lease_expires_at && Date.parse(row.lease_expires_at) > Date.parse(currentTime())) {
      return { status: "busy", attempt: row.attempt };
    }
    fail(REASONING_ERRORS.claimExpired, nodeKey);
  }
  if (row.current_state !== "pending") fail(REASONING_ERRORS.dependencyBlocked, nodeKey);
  const expected = await expectedAttemptInput({
    workspaceId: input.workspaceId,
    traceId: input.traceId,
    truthMode: scope.truthMode,
    contextManifestHash: scope.contextManifestHash,
    nodeKey,
    attempt: row.attempt,
  });
  if (
    row.input_hash !== expected.inputHash
    || row.predecessor_outputs_json !== stableStringify(expected.predecessorOutputs)
  ) fail(REASONING_ERRORS.inputDrift, nodeKey);
  const now = currentTime();
  const leaseToken = runtimeTestHooks?.leaseToken?.(nodeKey, row.attempt) ?? crypto.randomUUID();
  const leaseExpiresAt = addMilliseconds(now, REASONING_LEASE_DURATION_MS);
  await runtimeTestHooks?.beforeClaimCommit?.(nodeKey, row.attempt);
  const sequence = await nextSequence(input.workspaceId, input.traceId);
  const event = await eventStatement({
    workspaceId: input.workspaceId,
    traceId: input.traceId,
    sequence,
    eventType: "graph.node_claimed",
    subjectType: "graph",
    subjectId: row.id,
    priorState: "pending",
    currentState: "running",
    actorType: "agent",
    actorId: "crosssignal-persisted-executor-v1",
    payload: {
      attempt: row.attempt,
      handlerVersion: REASONING_HANDLER_VERSION,
      inputHash: row.input_hash,
      nodeKey,
    },
    idempotencyKey: `${input.traceId}:${REASONING_GRAPH_VERSION}:${nodeKey}:${row.attempt}:claimed`,
    occurredAt: now,
  });
  try {
    const results = await getD1().batch([
      getD1()
        .prepare(`UPDATE reasoning_nodes
          SET current_state = 'running', lease_token = ?, lease_expires_at = ?,
            started_at = ?, updated_at = ?
          WHERE id = ? AND workspace_id = ? AND trace_id = ?
            AND current_state = 'pending' AND input_hash = ?`)
        .bind(
          leaseToken,
          leaseExpiresAt,
          now,
          now,
          row.id,
          input.workspaceId,
          input.traceId,
          row.input_hash,
        ),
      event,
    ]);
    if (Number(results[0]?.meta?.changes ?? 0) !== 1) fail(REASONING_ERRORS.claimBusy, nodeKey);
  } catch (error) {
    const current = await loadLatestAttempt(input.workspaceId, input.traceId, nodeKey);
    if (current?.current_state === "succeeded") return { status: "preserved", attempt: current.attempt };
    if (current?.current_state === "running") return { status: "busy", attempt: current.attempt };
    throw error;
  }
  return { status: "claimed", leaseToken, attempt: row.attempt };
}

async function buildRuntimeArtifact(row: NodeRow) {
  const node = definition(row.node_key);
  const citations = [...node.citations];
  const content: Record<string, unknown> = {
    truthMode: "FIXTURE",
    graphVersion: REASONING_GRAPH_VERSION,
    nodeKey: row.node_key,
    handlerVersion: REASONING_HANDLER_VERSION,
    summary: row.node_key === "skeptic"
      ? "FIXTURE runtime critique: the bounded signal remains correlated, not causal."
      : `FIXTURE runtime artifact produced by ${row.node_key}.`,
    predecessorOutputs: JSON.parse(row.predecessor_outputs_json),
    evidenceCitations: citations,
    usage: { status: "unknown", measuredCostUsd: null },
  };
  runtimeTestHooks?.onHandlerInvocation?.(row.node_key, row.attempt);
  if (runtimeTestHooks?.failNode === row.node_key) {
    fail(REASONING_ERRORS.handlerFailed, row.node_key);
  }
  runtimeTestHooks?.mutateArtifact?.(row.node_key, content, citations);
  const declared = await getD1()
    .prepare(`SELECT evidence.evidence_key
      FROM flight_evidence evidence
      JOIN context_snapshot_sources source
        ON source.workspace_id = evidence.workspace_id
        AND source.source_id = evidence.evidence_key
      JOIN context_snapshots snapshot
        ON snapshot.workspace_id = source.workspace_id
        AND snapshot.id = source.snapshot_id
        AND snapshot.trace_id = evidence.trace_id
      WHERE evidence.workspace_id = ? AND evidence.trace_id = ?
        AND snapshot.current_state = 'frozen'
      ORDER BY source.position`)
    .bind(row.workspace_id, row.trace_id)
    .all<{ evidence_key: string }>();
  const errors = validateReasoningArtifact({
    content,
    evidenceCitations: citations,
    declaredEvidenceIds: declared.results.map((item: { evidence_key: string }) => item.evidence_key),
  });
  if (errors.length > 0) fail(REASONING_ERRORS.invalidArtifact, errors.join("; "));
  const sealed = await sealCanonical(content);
  return { content, citations, sealed, node };
}

async function failAttempt(input: GraphRequest, row: NodeRow, code: string): Promise<void> {
  const now = currentTime();
  const sequence = await nextSequence(input.workspaceId, input.traceId);
  const graphEvent = await eventStatement({
    workspaceId: input.workspaceId,
    traceId: input.traceId,
    sequence,
    eventType: "graph.node_failed",
    subjectType: "graph",
    subjectId: row.id,
    priorState: "running",
    currentState: "failed",
    actorType: "agent",
    actorId: "crosssignal-persisted-executor-v1",
    payload: { attempt: row.attempt, errorCode: code, nodeKey: row.node_key },
    idempotencyKey: `${input.traceId}:${REASONING_GRAPH_VERSION}:${row.node_key}:${row.attempt}:failed:${code}`,
    occurredAt: now,
  });
  const traceEvent = await eventStatement({
    workspaceId: input.workspaceId,
    traceId: input.traceId,
    sequence: sequence + 1,
    eventType: "trace.failed",
    subjectType: "trace",
    subjectId: input.traceId,
    priorState: "reasoning",
    currentState: "failed",
    actorType: "agent",
    actorId: "crosssignal-persisted-executor-v1",
    payload: { errorCode: code, failedNode: row.node_key },
    idempotencyKey: `${input.traceId}:${REASONING_GRAPH_VERSION}:trace-failed:${row.node_key}:${row.attempt}`,
    occurredAt: now,
  });
  await getD1().batch([
    getD1()
      .prepare(`UPDATE reasoning_nodes SET current_state = 'failed', output_hash = NULL,
        error_code = ?, lease_token = NULL, lease_expires_at = NULL,
        completed_at = ?, updated_at = ?
        WHERE id = ? AND workspace_id = ? AND current_state = 'running'`)
      .bind(code, now, now, row.id, input.workspaceId),
    graphEvent,
    getD1()
      .prepare(`UPDATE flight_traces SET current_state = 'failed', updated_at = ?
        WHERE workspace_id = ? AND id = ? AND current_state = 'reasoning'`)
      .bind(now, input.workspaceId, input.traceId),
    traceEvent,
  ]);
}

export async function finalizePersistedReasoningNode(
  input: GraphRequest,
  nodeKey: ReasoningNodeKey,
  leaseToken: string,
): Promise<{ status: "succeeded" | "idempotent"; artifactId: string; outputHash: string }> {
  await requireRuntimeScope(input);
  const row = await loadLatestAttempt(input.workspaceId, input.traceId, definition(nodeKey).nodeKey);
  if (!row) fail(REASONING_ERRORS.dependencyBlocked, nodeKey);
  const tokenHash = (await sealCanonical({ leaseToken })).sha256;
  if (row.current_state === "succeeded") {
    if (row.completion_token_hash !== tokenHash) fail(REASONING_ERRORS.claimOwnership, nodeKey);
    const artifact = await getD1()
      .prepare(`SELECT id, content_hash FROM reasoning_artifacts
        WHERE workspace_id = ? AND node_id = ? LIMIT 1`)
      .bind(input.workspaceId, row.id)
      .first<{ id: string; content_hash: string }>();
    if (!artifact) fail(REASONING_ERRORS.dependencyBlocked, "missing canonical artifact");
    return { status: "idempotent", artifactId: artifact.id, outputHash: artifact.content_hash };
  }
  if (row.current_state !== "running") fail(REASONING_ERRORS.dependencyBlocked, nodeKey);
  if (row.lease_token !== leaseToken) fail(REASONING_ERRORS.claimOwnership, nodeKey);
  const now = currentTime();
  if (!row.lease_expires_at || Date.parse(row.lease_expires_at) <= Date.parse(now)) {
    fail(REASONING_ERRORS.claimExpired, nodeKey);
  }
  let built: Awaited<ReturnType<typeof buildRuntimeArtifact>>;
  try {
    built = await buildRuntimeArtifact(row);
  } catch (error) {
    const code = error instanceof ReasoningFault ? error.code : REASONING_ERRORS.handlerFailed;
    if (code === REASONING_ERRORS.handlerFailed || code === REASONING_ERRORS.invalidArtifact) {
      await failAttempt(input, row, code);
    }
    throw error;
  }
  await runtimeTestHooks?.beforeFinalizeCommit?.(nodeKey, row.attempt);
  const scope = await stableScope(input.workspaceId, input.traceId);
  const artifactId = `artifact_${scope}_${nodeKey}_${row.attempt}`;
  const sequence = await nextSequence(input.workspaceId, input.traceId);
  const event = await eventStatement({
    workspaceId: input.workspaceId,
    traceId: input.traceId,
    sequence,
    eventType: "graph.node_succeeded",
    subjectType: "graph",
    subjectId: row.id,
    priorState: "running",
    currentState: "succeeded",
    actorType: "agent",
    actorId: "crosssignal-persisted-executor-v1",
    payload: {
      attempt: row.attempt,
      executionMode: "runtime",
      inputHash: row.input_hash,
      nodeKey,
      outputHash: built.sealed.sha256,
      truthMode: "FIXTURE",
      usage: { measuredCostUsd: null, status: "unknown" },
    },
    idempotencyKey: `${input.traceId}:${REASONING_GRAPH_VERSION}:${nodeKey}:${row.attempt}:succeeded`,
    occurredAt: now,
  });
  try {
    const results = await getD1().batch([
      getD1()
        .prepare(`UPDATE reasoning_nodes SET current_state = 'succeeded', output_hash = ?,
          error_code = NULL, lease_token = NULL, lease_expires_at = NULL,
          completion_token_hash = ?, completed_at = ?, updated_at = ?
          WHERE id = ? AND workspace_id = ? AND current_state = 'running'
            AND lease_token = ? AND lease_expires_at > ?`)
        .bind(
          built.sealed.sha256,
          tokenHash,
          now,
          now,
          row.id,
          input.workspaceId,
          leaseToken,
          now,
        ),
      getD1()
        .prepare(`INSERT INTO reasoning_artifacts (
          id, workspace_id, trace_id, node_id, artifact_kind, schema_version,
          content_json, content_hash, evidence_citations_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(
          artifactId,
          input.workspaceId,
          input.traceId,
          row.id,
          built.node.artifactKind,
          REASONING_ARTIFACT_SCHEMA_VERSION,
          built.sealed.canonicalJson,
          built.sealed.sha256,
          stableStringify(built.citations),
        ),
      event,
    ]);
    if (Number(results[0]?.meta?.changes ?? 0) !== 1) fail(REASONING_ERRORS.claimOwnership, nodeKey);
  } catch (error) {
    const current = await loadLatestAttempt(input.workspaceId, input.traceId, nodeKey);
    if (current?.current_state === "succeeded" && current.completion_token_hash === tokenHash) {
      const artifact = await getD1()
        .prepare(`SELECT id, content_hash FROM reasoning_artifacts
          WHERE workspace_id = ? AND node_id = ? LIMIT 1`)
        .bind(input.workspaceId, current.id)
        .first<{ id: string; content_hash: string }>();
      if (artifact) return { status: "idempotent", artifactId: artifact.id, outputHash: artifact.content_hash };
    }
    throw error;
  }
  return { status: "succeeded", artifactId, outputHash: built.sealed.sha256 };
}

export async function recoverExpiredReasoningNode(
  input: GraphRequest,
  nodeKey: ReasoningNodeKey,
): Promise<{ status: "busy" | "recovered"; priorAttempt: number; nextAttempt?: number }> {
  const scope = await requireRuntimeScope(input);
  const row = await loadLatestAttempt(input.workspaceId, input.traceId, definition(nodeKey).nodeKey);
  if (!row || row.current_state !== "running") fail(REASONING_ERRORS.dependencyBlocked, nodeKey);
  const now = currentTime();
  if (!row.lease_expires_at || Date.parse(row.lease_expires_at) > Date.parse(now)) {
    return { status: "busy", priorAttempt: row.attempt };
  }
  const next = await pendingAttempt({
    workspaceId: input.workspaceId,
    traceId: input.traceId,
    truthMode: scope.truthMode,
    contextManifestHash: scope.contextManifestHash,
    nodeKey,
    attempt: row.attempt + 1,
  });
  const sequence = await nextSequence(input.workspaceId, input.traceId);
  const recoveredEvent = await eventStatement({
    workspaceId: input.workspaceId,
    traceId: input.traceId,
    sequence,
    eventType: "graph.node_recovered",
    subjectType: "graph",
    subjectId: row.id,
    priorState: "running",
    currentState: "failed",
    actorType: "agent",
    actorId: "crosssignal-persisted-executor-v1",
    payload: { attempt: row.attempt, errorCode: REASONING_ERRORS.interruptedAttempt, nodeKey },
    idempotencyKey: `${input.traceId}:${REASONING_GRAPH_VERSION}:${nodeKey}:${row.attempt}:interrupted`,
    occurredAt: now,
  });
  const pendingEvent = await eventStatement({
    workspaceId: input.workspaceId,
    traceId: input.traceId,
    sequence: sequence + 1,
    eventType: "graph.node_pending",
    subjectType: "graph",
    subjectId: next.id,
    priorState: null,
    currentState: "pending",
    actorType: "agent",
    actorId: "crosssignal-persisted-executor-v1",
    payload: {
      attempt: row.attempt + 1,
      inputHash: next.inputHash,
      nodeKey,
      predecessorOutputs: next.predecessorOutputs,
      recoveredFromAttempt: row.attempt,
    },
    idempotencyKey: `${input.traceId}:${REASONING_GRAPH_VERSION}:${nodeKey}:${row.attempt + 1}:pending`,
    occurredAt: now,
  });
  await getD1().batch([
    getD1()
      .prepare(`UPDATE reasoning_nodes SET current_state = 'failed', output_hash = NULL,
        error_code = ?, lease_token = NULL, lease_expires_at = NULL,
        completion_token_hash = NULL, completed_at = ?, updated_at = ?
        WHERE id = ? AND workspace_id = ? AND current_state = 'running'
          AND lease_expires_at <= ?`)
      .bind(
        REASONING_ERRORS.interruptedAttempt,
        now,
        now,
        row.id,
        input.workspaceId,
        now,
      ),
    recoveredEvent,
    pendingInsertStatement({
      ...next,
      ...input,
      nodeKey,
      attempt: row.attempt + 1,
    }),
    pendingEvent,
  ]);
  return { status: "recovered", priorAttempt: row.attempt, nextAttempt: row.attempt + 1 };
}

function intentStatement(intent: Awaited<ReturnType<typeof buildDemoIntent>>["intent"]) {
  return getD1()
    .prepare(`INSERT INTO action_intents (
      id, workspace_id, trace_id, context_snapshot_id, source_artifact_id,
      supersedes_intent_id, intent_key, action_kind, truth_mode, recipients_json,
      recipient_set_hash, subject, body, cohort_cap, evidence_ids_json,
      metric_definition_id, context_manifest_hash, policy_version, policy_hash,
      nonce, expires_at, canonical_payload_json, canonical_payload_hash,
      created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      intent.id,
      intent.workspaceId,
      intent.traceId,
      intent.contextSnapshotId,
      intent.sourceArtifactId,
      intent.intentKey,
      intent.actionKind,
      intent.truthMode,
      stableStringify(intent.recipients),
      intent.recipientSetHash,
      intent.subject,
      intent.body,
      intent.cohortCap,
      stableStringify(intent.evidenceIds),
      intent.metricDefinitionId,
      intent.contextManifestHash,
      intent.policyVersion,
      intent.policyHash,
      intent.nonce,
      intent.expiresAt,
      intent.canonicalPayloadJson,
      intent.canonicalPayloadHash,
      intent.createdBy,
      intent.createdAt,
    );
}

function policyStatement(policy: Awaited<ReturnType<typeof buildDemoIntent>>["policyDecision"]) {
  return getD1()
    .prepare(`INSERT INTO policy_decisions (
      id, workspace_id, trace_id, intent_id, policy_version, policy_hash,
      verdict, reason_codes_json, evaluated_payload_hash,
      evaluated_context_hash, evaluator_version, decided_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      policy.id,
      policy.workspaceId,
      policy.traceId,
      policy.intentId,
      policy.policyVersion,
      policy.policyHash,
      policy.verdict,
      policy.reasonCodesJson,
      policy.evaluatedPayloadHash,
      policy.evaluatedContextHash,
      policy.evaluatorVersion,
      policy.decidedAt,
    );
}

async function completeHandoff(input: GraphRequest, scope: Awaited<ReturnType<typeof requireRuntimeScope>>) {
  const completed = await getD1()
    .prepare(`SELECT node.node_key, artifact.id AS artifact_id
      FROM reasoning_nodes node
      JOIN reasoning_artifacts artifact
        ON artifact.workspace_id = node.workspace_id
        AND artifact.trace_id = node.trace_id
        AND artifact.node_id = node.id
        AND artifact.content_hash = node.output_hash
      WHERE node.workspace_id = ? AND node.trace_id = ?
        AND node.graph_version = ? AND node.execution_mode = 'runtime'
        AND node.current_state = 'succeeded'`)
    .bind(input.workspaceId, input.traceId, REASONING_GRAPH_VERSION)
    .all<{ node_key: ReasoningNodeKey; artifact_id: string }>();
  if (completed.results.length !== REASONING_NODE_REGISTRY.length) {
    fail(REASONING_ERRORS.dependencyBlocked, "authority handoff before graph completion");
  }
  const existing = await getD1()
    .prepare(`SELECT id FROM action_intents WHERE workspace_id = ? AND trace_id = ? LIMIT 1`)
    .bind(input.workspaceId, input.traceId)
    .first<{ id: string }>();
  if (existing) return;
  const synth = completed.results.find(
    (row: { node_key: ReasoningNodeKey; artifact_id: string }) => row.node_key === "synthesizer",
  );
  const definitionRow = await getD1()
    .prepare(`SELECT id FROM outcome_definitions WHERE workspace_id = ? AND trace_id = ? LIMIT 1`)
    .bind(input.workspaceId, input.traceId)
    .first<{ id: string }>();
  if (!synth || !definitionRow) fail(REASONING_ERRORS.dependencyBlocked, "handoff inputs are incomplete");
  const now = currentTime();
  const bundle = await buildDemoIntent({
    userId: input.userId,
    workspaceId: input.workspaceId,
    traceId: input.traceId,
    contextSnapshotId: scope.contextSnapshotId,
    sourceArtifactId: synth.artifact_id,
    outcomeDefinitionId: definitionRow.id,
    contextManifestHash: scope.contextManifestHash,
    intentVersion: 1,
    recipients: DEFAULT_ONBOARDING_RECIPIENTS,
    subject: DEFAULT_ONBOARDING_SUBJECT,
    body: DEFAULT_ONBOARDING_BODY,
    now,
  });
  const sequence = await nextSequence(input.workspaceId, input.traceId);
  const event = await eventStatement({
    workspaceId: input.workspaceId,
    traceId: input.traceId,
    sequence,
    eventType: "graph.completed",
    subjectType: "trace",
    subjectId: input.traceId,
    priorState: "reasoning",
    currentState: "awaiting_approval",
    actorType: "system",
    actorId: "crosssignal-authority-v1",
    payload: {
      graphVersion: REASONING_GRAPH_VERSION,
      intentId: bundle.intent.id,
      sourceArtifactId: synth.artifact_id,
    },
    idempotencyKey: `${input.traceId}:${REASONING_GRAPH_VERSION}:completed`,
    occurredAt: now,
  });
  try {
    await getD1().batch([
      intentStatement(bundle.intent),
      policyStatement(bundle.policyDecision),
      getD1()
        .prepare(`UPDATE flight_traces SET current_state = 'awaiting_approval', updated_at = ?
          WHERE workspace_id = ? AND id = ? AND current_state = 'reasoning'
            AND active_intent_id = ?`)
        .bind(now, input.workspaceId, input.traceId, bundle.intent.id),
      event,
    ]);
  } catch (error) {
    const trace = await getD1()
      .prepare(`SELECT current_state, active_intent_id FROM flight_traces
        WHERE workspace_id = ? AND id = ? LIMIT 1`)
      .bind(input.workspaceId, input.traceId)
      .first<{ current_state: string; active_intent_id: string | null }>();
    if (trace?.current_state === "awaiting_approval" && trace.active_intent_id) return;
    throw error;
  }
}

export async function summarizePersistedReasoningGraph(input: GraphRequest) {
  await requireRuntimeScope(input);
  const d1 = getD1();
  const [trace, attempts, artifacts, counts, events] = await Promise.all([
    d1.prepare(`SELECT current_state, active_intent_id FROM flight_traces
      WHERE workspace_id = ? AND id = ? LIMIT 1`).bind(input.workspaceId, input.traceId)
      .first<{ current_state: string; active_intent_id: string | null }>(),
    d1.prepare(`SELECT node_key, attempt, current_state, input_hash, output_hash,
        error_code, execution_mode, graph_version, handler_version,
        predecessor_outputs_json, started_at, completed_at
      FROM reasoning_nodes WHERE workspace_id = ? AND trace_id = ? AND graph_version = ?
      ORDER BY CASE node_key WHEN 'planner' THEN 1 WHEN 'quantitative' THEN 2
        WHEN 'qualitative' THEN 3 WHEN 'experiment_design' THEN 4
        WHEN 'skeptic' THEN 5 ELSE 6 END, attempt`)
      .bind(input.workspaceId, input.traceId, REASONING_GRAPH_VERSION).all(),
    d1.prepare(`SELECT artifact.id, artifact.node_id, artifact.content_hash,
        artifact.schema_version, artifact.content_json
      FROM reasoning_artifacts artifact JOIN reasoning_nodes node
        ON node.workspace_id = artifact.workspace_id AND node.id = artifact.node_id
      WHERE artifact.workspace_id = ? AND artifact.trace_id = ? AND node.graph_version = ?`)
      .bind(input.workspaceId, input.traceId, REASONING_GRAPH_VERSION).all(),
    Promise.all(["action_intents", "policy_decisions", "approval_grants", "effect_attempts", "outcome_observations", "outcome_assessments"].map(
      async (table) => {
        const row = await d1.prepare(`SELECT COUNT(*) AS count FROM ${table}
          WHERE workspace_id = ? AND trace_id = ?`).bind(input.workspaceId, input.traceId)
          .first<{ count: number }>();
        return [table, Number(row?.count ?? 0)] as const;
      },
    )),
    d1.prepare(`SELECT sequence, event_type, subject_type, subject_id,
        prior_state, current_state, idempotency_key
      FROM flight_trace_events WHERE workspace_id = ? AND trace_id = ? ORDER BY sequence`)
      .bind(input.workspaceId, input.traceId).all(),
  ]);
  return {
    traceState: trace?.current_state ?? "missing",
    activeIntentId: trace?.active_intent_id ?? null,
    graphVersion: REASONING_GRAPH_VERSION,
    truthMode: "FIXTURE" as const,
    attempts: attempts.results,
    artifacts: artifacts.results,
    authorityCounts: Object.fromEntries(counts),
    events: events.results,
  };
}

export async function runPersistedReasoningGraph(input: GraphRequest) {
  let scope = await requireRuntimeScope(input);
  if (scope.traceState === "failed" || scope.traceState === "awaiting_approval") {
    return summarizePersistedReasoningGraph(input);
  }
  await initializeGraph(input, scope);
  scope = await requireRuntimeScope(input);
  let completedThisCall = 0;
  for (const node of REASONING_NODE_REGISTRY) {
    await materializeRunnable(input, scope);
    let row = await loadLatestAttempt(input.workspaceId, input.traceId, node.nodeKey);
    if (!row) fail(REASONING_ERRORS.dependencyBlocked, node.nodeKey);
    if (row.current_state === "succeeded") continue;
    if (row.current_state === "running") {
      const recovery = await recoverExpiredReasoningNode(input, node.nodeKey);
      if (recovery.status === "busy") return summarizePersistedReasoningGraph(input);
      row = await loadLatestAttempt(input.workspaceId, input.traceId, node.nodeKey);
      if (!row) fail(REASONING_ERRORS.dependencyBlocked, node.nodeKey);
    }
    if (row.current_state !== "pending") return summarizePersistedReasoningGraph(input);
    const claim = await claimPersistedReasoningNode(input, node.nodeKey);
    if (claim.status !== "claimed") {
      if (claim.status === "preserved") continue;
      return summarizePersistedReasoningGraph(input);
    }
    if ((await runtimeTestHooks?.afterClaim?.(node.nodeKey, claim.attempt)) === "stop") {
      return summarizePersistedReasoningGraph(input);
    }
    await finalizePersistedReasoningNode(input, node.nodeKey, claim.leaseToken);
    completedThisCall += 1;
    if (
      runtimeTestHooks?.stopAfterCompletions
      && completedThisCall >= runtimeTestHooks.stopAfterCompletions
    ) return summarizePersistedReasoningGraph(input);
  }
  await completeHandoff(input, scope);
  return summarizePersistedReasoningGraph(input);
}
