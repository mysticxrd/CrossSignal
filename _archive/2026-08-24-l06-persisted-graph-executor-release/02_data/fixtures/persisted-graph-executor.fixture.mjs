import {
  sealCanonical,
  validateReasoningArtifact,
} from "../../../db/flight-recorder-contracts.ts";

export const GRAPH_VERSION = "crosssignal-fixed-graph-v1";
export const HANDLER_VERSION = "crosssignal-fixture-handlers-v1";
export const FIXTURE_TRUTH_MODE = "FIXTURE";
export const LEASE_DURATION_MS = 30_000;

export const DECLARED_EVIDENCE_IDS = Object.freeze([
  "evidence:activation-drop",
  "evidence:onboarding-feedback",
  "context:brand",
  "context:email-policy",
  "metric:activation-72h",
]);

export const NODE_REGISTRY = Object.freeze([
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
]);

export const NODE_ORDER = Object.freeze(NODE_REGISTRY.map(({ nodeKey }) => nodeKey));

export const STABLE_ERRORS = Object.freeze({
  arbitraryGraph: "l06_arbitrary_graph_rejected",
  claimBusy: "l06_claim_busy",
  claimExpired: "l06_claim_expired",
  claimOwnership: "l06_claim_ownership_mismatch",
  dependencyBlocked: "l06_dependency_blocked",
  inputDrift: "l06_input_drift",
  interruptedAttempt: "l06_interrupted_attempt",
  invalidArtifact: "l06_invalid_artifact",
  runtimeFailure: "l06_handler_failed",
  tenantMismatch: "l06_workspace_trace_mismatch",
});

export const DIRECT_DATABASE_ATTACKS = Object.freeze([
  ["DB-L06-01", "cross-workspace graph lookup", STABLE_ERRORS.tenantMismatch],
  ["DB-L06-02", "cross-workspace attempt insertion", STABLE_ERRORS.tenantMismatch],
  ["DB-L06-03", "cross-trace artifact insertion", STABLE_ERRORS.tenantMismatch],
  ["DB-L06-04", "unregistered node key", STABLE_ERRORS.arbitraryGraph],
  ["DB-L06-05", "caller-supplied dependency edge", STABLE_ERRORS.arbitraryGraph],
  ["DB-L06-06", "out-of-order skeptic claim", STABLE_ERRORS.dependencyBlocked],
  ["DB-L06-07", "mutated predecessor output hash", STABLE_ERRORS.inputDrift],
  ["DB-L06-08", "claim with foreign lease token", STABLE_ERRORS.claimOwnership],
  ["DB-L06-09", "finalize after lease expiry", STABLE_ERRORS.claimExpired],
  ["DB-L06-10", "artifact with undeclared citation", STABLE_ERRORS.invalidArtifact],
  ["DB-L06-11", "artifact with secret-like content", STABLE_ERRORS.invalidArtifact],
  ["DB-L06-12", "conflicting duplicate canonical artifact", STABLE_ERRORS.invalidArtifact],
  ["DB-L06-13", "early synthesizer authority handoff", STABLE_ERRORS.dependencyBlocked],
  ["DB-L06-14", "direct transition past reasoning", STABLE_ERRORS.dependencyBlocked],
].map(([id, attack, expectedError]) => Object.freeze({ id, attack, expectedError })));

export const ACCEPTED_SCHEDULES = Object.freeze([
  Object.freeze({ id: "S-L06-01", name: "cold success", expected: "six runtime artifacts and one intent/policy pair" }),
  Object.freeze({ id: "S-L06-02", name: "stop and resume", expected: "completed handlers remain single-invocation" }),
  Object.freeze({ id: "S-L06-03", name: "claim and crash", expected: "expired attempt retained and later attempt succeeds" }),
  Object.freeze({ id: "S-L06-04", name: "concurrent calls", expected: "one claim owner and no duplicate canonical rows" }),
  Object.freeze({ id: "S-L06-05", name: "skeptic failure", expected: "trace fails with no authority or effects" }),
  Object.freeze({ id: "S-L06-06", name: "input drift", expected: "handler is not invoked and no artifact is written" }),
  Object.freeze({ id: "S-L06-07", name: "tenant attack", expected: "both workspaces remain unchanged" }),
  Object.freeze({ id: "S-L06-08", name: "L08 regression", expected: "existing two races and ten attacks pass unchanged" }),
]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}: ${detail}` : code);
}

function nodeDefinition(nodeKey) {
  const definition = NODE_REGISTRY.find((node) => node.nodeKey === nodeKey);
  if (!definition) fail(STABLE_ERRORS.arbitraryGraph, nodeKey);
  return definition;
}

function nextIso(state, advanceMs = 1_000) {
  const value = new Date(state.clockMs).toISOString();
  state.clockMs += advanceMs;
  return value;
}

function appendEvent(state, eventType, subjectId, payload) {
  const sequence = state.events.length + 1;
  state.events.push({
    id: `graph_event_${state.scope}_${sequence}`,
    workspaceId: state.workspaceId,
    traceId: state.traceId,
    sequence,
    eventType,
    subjectType: "graph",
    subjectId,
    payload,
    idempotencyKey: `${state.traceId}:${eventType}:${subjectId}:${sequence}`,
    occurredAt: nextIso(state),
  });
}

function currentAttempt(state, nodeKey) {
  return state.attempts
    .filter((attempt) => attempt.nodeKey === nodeKey)
    .sort((left, right) => right.attempt - left.attempt)[0] ?? null;
}

function successfulAttempt(state, nodeKey) {
  return state.attempts.find(
    (attempt) => attempt.nodeKey === nodeKey && attempt.currentState === "succeeded",
  ) ?? null;
}

function artifactForNode(state, nodeKey) {
  const attempt = successfulAttempt(state, nodeKey);
  return attempt
    ? state.artifacts.find((artifact) => artifact.nodeAttemptId === attempt.id) ?? null
    : null;
}

function predecessorsSucceeded(state, definition) {
  return definition.predecessors.every((nodeKey) => artifactForNode(state, nodeKey));
}

async function expectedInput(state, definition, attempt) {
  const predecessorOutputs = definition.predecessors.map((nodeKey) => {
    const artifact = artifactForNode(state, nodeKey);
    if (!artifact) fail(STABLE_ERRORS.dependencyBlocked, `${definition.nodeKey}:${nodeKey}`);
    return { nodeKey, outputHash: artifact.contentHash };
  });
  const sealed = await sealCanonical({
    workspaceId: state.workspaceId,
    traceId: state.traceId,
    truthMode: state.truthMode,
    contextManifestHash: state.contextManifestHash,
    graphVersion: state.graphVersion,
    nodeKey: definition.nodeKey,
    handlerVersion: HANDLER_VERSION,
    attempt,
    predecessorOutputs,
  });
  return { inputHash: sealed.sha256, predecessorOutputs };
}

async function createPendingAttempt(state, nodeKey, attemptNumber) {
  const definition = nodeDefinition(nodeKey);
  const { inputHash, predecessorOutputs } = await expectedInput(state, definition, attemptNumber);
  const attempt = {
    id: `node_attempt_${state.scope}_${nodeKey}_${attemptNumber}`,
    logicalNodeId: `logical_node_${state.scope}_${nodeKey}`,
    workspaceId: state.workspaceId,
    traceId: state.traceId,
    graphVersion: state.graphVersion,
    nodeKey,
    attempt: attemptNumber,
    handlerVersion: HANDLER_VERSION,
    currentState: "pending",
    inputHash,
    predecessorOutputs,
    outputHash: null,
    errorCode: null,
    leaseToken: null,
    leaseExpiresAt: null,
    startedAt: null,
    completedAt: null,
  };
  state.attempts.push(attempt);
  return attempt;
}

async function materializeRunnableAttempts(state) {
  for (const definition of NODE_REGISTRY) {
    if (currentAttempt(state, definition.nodeKey)) continue;
    if (predecessorsSucceeded(state, definition)) {
      await createPendingAttempt(state, definition.nodeKey, 1);
    }
  }
}

export function assertRuntimeRequest(state, request) {
  if (
    request.actorWorkspaceId !== state.workspaceId
    || request.workspaceId !== state.workspaceId
    || request.traceId !== state.traceId
  ) fail(STABLE_ERRORS.tenantMismatch);
  if (
    "nodes" in request
    || "edges" in request
    || "handler" in request
    || "graphVersion" in request
    || "truthMode" in request
  ) fail(STABLE_ERRORS.arbitraryGraph);
}

export async function buildExecutorFixture({
  workspaceId = "workspace_l06_fixture",
  traceId = "trace_l06_fixture",
  actorUserId = "owner_l06_fixture",
  now = "2026-08-24T00:00:00.000Z",
} = {}) {
  const context = await sealCanonical({
    truthMode: FIXTURE_TRUTH_MODE,
    sources: DECLARED_EVIDENCE_IDS,
    sourceVersions: ["fixture-v1", "fixture-v1", "brand-v1", "email-policy-v1", "metric-v1"],
  });
  const scope = (await sealCanonical({ workspaceId, traceId })).sha256.slice(0, 16);
  const state = {
    workspaceId,
    traceId,
    actorUserId,
    scope,
    graphVersion: GRAPH_VERSION,
    truthMode: FIXTURE_TRUTH_MODE,
    contextManifestHash: context.sha256,
    traceState: "reasoning",
    clockMs: Date.parse(now),
    attempts: [],
    artifacts: [],
    events: [],
    handlerInvocations: Object.fromEntries(NODE_ORDER.map((nodeKey) => [nodeKey, 0])),
    authority: { intents: [], policies: [], grants: [], effects: [], outcomes: [] },
  };
  appendEvent(state, "graph.initialized", traceId, {
    graphVersion: GRAPH_VERSION,
    truthMode: FIXTURE_TRUTH_MODE,
    logicalNodes: NODE_REGISTRY.map(({ nodeKey, predecessors }) => ({ nodeKey, predecessors })),
  });
  await materializeRunnableAttempts(state);
  return state;
}

export async function claimNode(state, nodeKey, leaseToken, request = {
  actorWorkspaceId: state.workspaceId,
  workspaceId: state.workspaceId,
  traceId: state.traceId,
}) {
  assertRuntimeRequest(state, request);
  nodeDefinition(nodeKey);
  const attempt = currentAttempt(state, nodeKey);
  if (!attempt) fail(STABLE_ERRORS.dependencyBlocked, nodeKey);
  if (attempt.currentState === "succeeded") return { status: "preserved", attempt };
  if (attempt.currentState === "running") {
    if (Date.parse(attempt.leaseExpiresAt) > state.clockMs) {
      return { status: "busy", errorCode: STABLE_ERRORS.claimBusy, attempt };
    }
    fail(STABLE_ERRORS.claimExpired, nodeKey);
  }
  if (attempt.currentState !== "pending") fail(STABLE_ERRORS.dependencyBlocked, nodeKey);
  const expected = await expectedInput(state, nodeDefinition(nodeKey), attempt.attempt);
  if (attempt.inputHash !== expected.inputHash) fail(STABLE_ERRORS.inputDrift, nodeKey);
  attempt.currentState = "running";
  attempt.leaseToken = leaseToken;
  attempt.startedAt = nextIso(state);
  attempt.leaseExpiresAt = new Date(
    Date.parse(attempt.startedAt) + LEASE_DURATION_MS,
  ).toISOString();
  appendEvent(state, "graph.node_claimed", attempt.id, {
    nodeKey,
    attempt: attempt.attempt,
    inputHash: attempt.inputHash,
    handlerVersion: attempt.handlerVersion,
  });
  return { status: "claimed", attempt };
}

async function buildHandlerArtifact(state, attempt, mutation = null) {
  const definition = nodeDefinition(attempt.nodeKey);
  const content = {
    truthMode: FIXTURE_TRUTH_MODE,
    graphVersion: GRAPH_VERSION,
    nodeKey: attempt.nodeKey,
    handlerVersion: HANDLER_VERSION,
    summary: attempt.nodeKey === "skeptic"
      ? "FIXTURE runtime critique: the bounded signal remains correlated, not causal."
      : `FIXTURE runtime artifact produced by ${attempt.nodeKey}.`,
    predecessorOutputs: attempt.predecessorOutputs,
    evidenceCitations: [...definition.citations],
    usage: { status: "unknown", measuredCostUsd: null },
  };
  if (mutation?.secret) content.apiKey = "sk_live_1234567890abcdef";
  const citations = mutation?.undeclaredCitation
    ? [...definition.citations, "evidence:not-declared"]
    : [...definition.citations];
  const errors = validateReasoningArtifact({
    content,
    evidenceCitations: citations,
    declaredEvidenceIds: DECLARED_EVIDENCE_IDS,
  });
  if (errors.length > 0) fail(STABLE_ERRORS.invalidArtifact, errors.join("; "));
  const sealed = await sealCanonical(content);
  return {
    id: `artifact_${state.scope}_${attempt.nodeKey}_${attempt.attempt}`,
    workspaceId: state.workspaceId,
    traceId: state.traceId,
    logicalNodeId: attempt.logicalNodeId,
    nodeAttemptId: attempt.id,
    artifactKind: definition.artifactKind,
    schemaVersion: "reasoning-artifact-v2",
    truthMode: FIXTURE_TRUTH_MODE,
    content,
    contentHash: sealed.sha256,
    evidenceCitations: citations,
    usage: content.usage,
  };
}

async function completeAuthorityHandoff(state) {
  if (!NODE_ORDER.every((nodeKey) => successfulAttempt(state, nodeKey))) {
    fail(STABLE_ERRORS.dependencyBlocked, "authority handoff before graph completion");
  }
  const synthesizer = artifactForNode(state, "synthesizer");
  if (!synthesizer) fail(STABLE_ERRORS.dependencyBlocked, "missing synthesizer artifact");
  if (state.authority.intents.length === 0) {
    state.authority.intents.push({
      id: `intent_${state.scope}_v1`,
      sourceArtifactId: synthesizer.id,
      truthMode: FIXTURE_TRUTH_MODE,
      active: true,
    });
    state.authority.policies.push({
      id: `policy_${state.scope}_v1`,
      intentId: `intent_${state.scope}_v1`,
      verdict: "approval_required",
    });
    state.traceState = "awaiting_approval";
    appendEvent(state, "graph.completed", state.traceId, {
      graphVersion: GRAPH_VERSION,
      sourceArtifactId: synthesizer.id,
      intentId: `intent_${state.scope}_v1`,
    });
  }
}

export async function finalizeNode(state, nodeKey, leaseToken, mutation = null) {
  const attempt = currentAttempt(state, nodeKey);
  if (!attempt) fail(STABLE_ERRORS.dependencyBlocked, nodeKey);
  const existing = artifactForNode(state, nodeKey);
  if (attempt.currentState === "succeeded") {
    if (attempt.leaseToken !== leaseToken) fail(STABLE_ERRORS.claimOwnership, nodeKey);
    return { status: "idempotent", attempt, artifact: existing };
  }
  if (attempt.currentState !== "running") fail(STABLE_ERRORS.dependencyBlocked, nodeKey);
  if (attempt.leaseToken !== leaseToken) fail(STABLE_ERRORS.claimOwnership, nodeKey);
  if (Date.parse(attempt.leaseExpiresAt) <= state.clockMs) fail(STABLE_ERRORS.claimExpired, nodeKey);
  state.handlerInvocations[nodeKey] += 1;
  const artifact = await buildHandlerArtifact(state, attempt, mutation);
  const canonical = state.artifacts.find((item) => item.logicalNodeId === attempt.logicalNodeId);
  if (canonical && canonical.contentHash !== artifact.contentHash) {
    fail(STABLE_ERRORS.invalidArtifact, "conflicting canonical artifact");
  }
  if (!canonical) state.artifacts.push(artifact);
  attempt.currentState = "succeeded";
  attempt.outputHash = artifact.contentHash;
  attempt.completedAt = nextIso(state);
  appendEvent(state, "graph.node_succeeded", attempt.id, {
    nodeKey,
    attempt: attempt.attempt,
    inputHash: attempt.inputHash,
    outputHash: artifact.contentHash,
    truthMode: FIXTURE_TRUTH_MODE,
    usage: artifact.usage,
  });
  await materializeRunnableAttempts(state);
  if (nodeKey === "synthesizer") await completeAuthorityHandoff(state);
  return { status: "succeeded", attempt, artifact };
}

export function failClaimedNode(state, nodeKey, leaseToken, errorCode = STABLE_ERRORS.runtimeFailure) {
  const attempt = currentAttempt(state, nodeKey);
  if (!attempt || attempt.currentState !== "running") fail(STABLE_ERRORS.dependencyBlocked, nodeKey);
  if (attempt.leaseToken !== leaseToken) fail(STABLE_ERRORS.claimOwnership, nodeKey);
  state.handlerInvocations[nodeKey] += 1;
  attempt.currentState = "failed";
  attempt.errorCode = errorCode;
  attempt.completedAt = nextIso(state);
  state.traceState = "failed";
  appendEvent(state, "graph.node_failed", attempt.id, { nodeKey, errorCode });
}

export async function recoverExpiredAttempt(state, nodeKey) {
  const attempt = currentAttempt(state, nodeKey);
  if (!attempt || attempt.currentState !== "running") fail(STABLE_ERRORS.dependencyBlocked, nodeKey);
  if (Date.parse(attempt.leaseExpiresAt) > state.clockMs) {
    return { status: "busy", errorCode: STABLE_ERRORS.claimBusy, attempt };
  }
  attempt.currentState = "failed";
  attempt.errorCode = STABLE_ERRORS.interruptedAttempt;
  attempt.completedAt = nextIso(state);
  appendEvent(state, "graph.node_recovered", attempt.id, {
    nodeKey,
    errorCode: STABLE_ERRORS.interruptedAttempt,
  });
  const next = await createPendingAttempt(state, nodeKey, attempt.attempt + 1);
  return { status: "recovered", priorAttempt: attempt, nextAttempt: next };
}

export function advanceClockPastLease(state, nodeKey) {
  const attempt = currentAttempt(state, nodeKey);
  if (!attempt?.leaseExpiresAt) fail(STABLE_ERRORS.dependencyBlocked, nodeKey);
  state.clockMs = Date.parse(attempt.leaseExpiresAt) + 1;
}

export async function runReadyGraph(state, { stopAfter = null, failAt = null } = {}) {
  let completed = 0;
  for (const nodeKey of NODE_ORDER) {
    if (state.traceState === "failed") break;
    await materializeRunnableAttempts(state);
    const attempt = currentAttempt(state, nodeKey);
    if (!attempt || attempt.currentState === "succeeded") continue;
    const token = `lease_${state.scope}_${nodeKey}_${attempt.attempt}`;
    const claim = await claimNode(state, nodeKey, token);
    if (claim.status !== "claimed") continue;
    if (failAt === nodeKey) {
      failClaimedNode(state, nodeKey, token);
      break;
    }
    await finalizeNode(state, nodeKey, token);
    completed += 1;
    if (stopAfter === completed) break;
  }
  return state;
}

export function summarizeFixture(state) {
  return {
    traceState: state.traceState,
    graphVersion: state.graphVersion,
    truthMode: state.truthMode,
    attempts: state.attempts.map(({ nodeKey, attempt, currentState, errorCode }) => ({
      nodeKey,
      attempt,
      currentState,
      errorCode,
    })),
    artifacts: state.artifacts.map(({ id, nodeAttemptId, truthMode, contentHash }) => ({
      id,
      nodeAttemptId,
      truthMode,
      contentHash,
    })),
    events: state.events.map(({ sequence, eventType, subjectId, idempotencyKey }) => ({
      sequence,
      eventType,
      subjectId,
      idempotencyKey,
    })),
    handlerInvocations: { ...state.handlerInvocations },
    authorityCounts: Object.fromEntries(
      Object.entries(state.authority).map(([key, rows]) => [key, rows.length]),
    ),
  };
}
