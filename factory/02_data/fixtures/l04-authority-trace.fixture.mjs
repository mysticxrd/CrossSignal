import { createHash } from "node:crypto";

export const L04_FIXTURE_VERSION = "l04-authority-trace-v1";

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stable(child)]),
    );
  }
  return value;
}

export function stableStringify(value) {
  return JSON.stringify(stable(value));
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sealed(payload) {
  const payloadJson = stableStringify(payload);
  return { payloadJson, contentHash: sha256(payloadJson) };
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

const identity = {
  workspaceId: "ws_l04_primary",
  collisionWorkspaceId: "ws_l04_collision",
  ownerUserId: "user_l04_owner",
  collisionOwnerUserId: "user_l04_collision_owner",
  traceId: "trace_l04_onboarding",
  fixtureKey: "onboarding-rescue:stage03-v1",
  truthMode: "FIXTURE",
};

function controlEvent({ sequence, priorState, currentState, reasonCode, occurredAt }) {
  const eventId = `authority_control_${identity.workspaceId}_${String(sequence).padStart(2, "0")}`;
  const payload = {
    actorUserId: identity.ownerUserId,
    controlKind: "kill_switch",
    currentState,
    eventId,
    occurredAt,
    priorState,
    reasonCode,
    sequence,
    workspaceId: identity.workspaceId,
  };
  const seal = sealed(payload);
  return {
    id: eventId,
    workspaceId: identity.workspaceId,
    sequence,
    controlKind: "kill_switch",
    priorState,
    currentState,
    actorUserId: identity.ownerUserId,
    reasonCode,
    idempotencyKey:
      sequence === 1
        ? `l04:migration:${identity.workspaceId}:kill_switch`
        : `l04:transition:${identity.workspaceId}:${sequence}`,
    occurredAt,
    ...seal,
  };
}

const controlHistory = [
  controlEvent({
    sequence: 1,
    priorState: null,
    currentState: false,
    reasonCode: "migration_backfill",
    occurredAt: "2026-08-13T08:00:00.000Z",
  }),
  controlEvent({
    sequence: 2,
    priorState: false,
    currentState: true,
    reasonCode: "owner_transition",
    occurredAt: "2026-08-13T08:01:00.000Z",
  }),
  controlEvent({
    sequence: 3,
    priorState: true,
    currentState: false,
    reasonCode: "owner_transition",
    occurredAt: "2026-08-13T08:02:00.000Z",
  }),
];

const subjects = {
  trace: identity.traceId,
  graph: "node_l04_planner_attempt_1",
  intentV1: "intent_l04_v1",
  intentV2: "intent_l04_v2",
  policyV1: "policy_l04_v1",
  policyV2: "policy_l04_v2",
  grantV2: "grant_l04_v2",
  effectV2: "effect_l04_v2",
  outcome: "assessment_l04_v1",
};

let traceSequence = 0;
function traceEvent({
  eventType,
  subjectType,
  subjectId,
  priorState,
  currentState,
  actorType,
  actorId,
  details = {},
}) {
  traceSequence += 1;
  const sequence = traceSequence;
  const occurredAt = new Date(Date.parse("2026-08-13T09:00:00.000Z") + sequence * 1_000).toISOString();
  const payload = { ...details, truthMode: "FIXTURE" };
  const seal = sealed(payload);
  return {
    id: `trace_event_${identity.workspaceId}_${String(sequence).padStart(2, "0")}`,
    workspaceId: identity.workspaceId,
    traceId: identity.traceId,
    sequence,
    eventType,
    subjectType,
    subjectId,
    priorState,
    currentState,
    actorType,
    actorId,
    idempotencyKey: `l04:${identity.workspaceId}:${identity.traceId}:${sequence}`,
    occurredAt,
    payloadJson: seal.payloadJson,
    payloadHash: seal.contentHash,
  };
}

const traceEvents = [
  traceEvent({ eventType: "trace.collecting", subjectType: "trace", subjectId: subjects.trace, priorState: null, currentState: "collecting", actorType: "human", actorId: identity.ownerUserId }),
  traceEvent({ eventType: "trace.context_frozen", subjectType: "trace", subjectId: subjects.trace, priorState: "collecting", currentState: "context_frozen", actorType: "system", actorId: "crosssignal-context-v1", details: { manifestHash: "a".repeat(64) } }),
  traceEvent({ eventType: "trace.reasoning", subjectType: "trace", subjectId: subjects.trace, priorState: "context_frozen", currentState: "reasoning", actorType: "agent", actorId: "crosssignal-persisted-executor-v1", details: { executionMode: "runtime", graphVersion: "crosssignal-fixed-graph-v1" } }),
  traceEvent({ eventType: "graph.node_pending", subjectType: "graph", subjectId: subjects.graph, priorState: null, currentState: "pending", actorType: "agent", actorId: "crosssignal-persisted-executor-v1", details: { attempt: 1, nodeKey: "planner" } }),
  traceEvent({ eventType: "graph.node_claimed", subjectType: "graph", subjectId: subjects.graph, priorState: "pending", currentState: "running", actorType: "agent", actorId: "crosssignal-persisted-executor-v1", details: { attempt: 1, nodeKey: "planner" } }),
  traceEvent({ eventType: "graph.node_succeeded", subjectType: "graph", subjectId: subjects.graph, priorState: "running", currentState: "succeeded", actorType: "agent", actorId: "crosssignal-persisted-executor-v1", details: { attempt: 1, nodeKey: "planner", outputHash: "b".repeat(64) } }),
  traceEvent({ eventType: "intent.drafted", subjectType: "intent", subjectId: subjects.intentV1, priorState: null, currentState: "drafted", actorType: "agent", actorId: "crosssignal-synthesizer-v1", details: { intentVersion: 1 } }),
  traceEvent({ eventType: "intent.sealed", subjectType: "intent", subjectId: subjects.intentV1, priorState: "drafted", currentState: "sealed", actorType: "system", actorId: "crosssignal-authority-v1", details: { intentVersion: 1, policyVersion: "email-test-v1" } }),
  traceEvent({ eventType: "policy.unevaluated", subjectType: "policy", subjectId: subjects.policyV1, priorState: null, currentState: "unevaluated", actorType: "system", actorId: "deterministic-policy-v1", details: { intentRef: subjects.intentV1 } }),
  traceEvent({ eventType: "policy.decided", subjectType: "policy", subjectId: subjects.policyV1, priorState: "unevaluated", currentState: "approval_required", actorType: "system", actorId: "deterministic-policy-v1", details: { intentRef: subjects.intentV1, policyVersion: "email-test-v1", verdict: "approval_required" } }),
  traceEvent({ eventType: "intent.policy_evaluated", subjectType: "intent", subjectId: subjects.intentV1, priorState: "sealed", currentState: "policy_evaluated", actorType: "system", actorId: "deterministic-policy-v1", details: { policyRef: subjects.policyV1 } }),
  traceEvent({ eventType: "intent.approval_pending", subjectType: "intent", subjectId: subjects.intentV1, priorState: "policy_evaluated", currentState: "approval_pending", actorType: "system", actorId: "crosssignal-authority-v1" }),
  traceEvent({ eventType: "trace.awaiting_approval", subjectType: "trace", subjectId: subjects.trace, priorState: "reasoning", currentState: "awaiting_approval", actorType: "system", actorId: "crosssignal-authority-v1", details: { intentRef: subjects.intentV1 } }),
  traceEvent({ eventType: "intent.superseded", subjectType: "intent", subjectId: subjects.intentV1, priorState: "approval_pending", currentState: "superseded", actorType: "human", actorId: identity.ownerUserId, details: { supersededByIntentRef: subjects.intentV2 } }),
  traceEvent({ eventType: "intent.drafted", subjectType: "intent", subjectId: subjects.intentV2, priorState: null, currentState: "drafted", actorType: "human", actorId: identity.ownerUserId, details: { intentVersion: 2, supersedesIntentRef: subjects.intentV1 } }),
  traceEvent({ eventType: "intent.sealed", subjectType: "intent", subjectId: subjects.intentV2, priorState: "drafted", currentState: "sealed", actorType: "system", actorId: "crosssignal-authority-v1", details: { intentVersion: 2, policyVersion: "email-test-v1" } }),
  traceEvent({ eventType: "policy.unevaluated", subjectType: "policy", subjectId: subjects.policyV2, priorState: null, currentState: "unevaluated", actorType: "system", actorId: "deterministic-policy-v1", details: { intentRef: subjects.intentV2 } }),
  traceEvent({ eventType: "policy.decided", subjectType: "policy", subjectId: subjects.policyV2, priorState: "unevaluated", currentState: "approval_required", actorType: "system", actorId: "deterministic-policy-v1", details: { intentRef: subjects.intentV2, policyVersion: "email-test-v1", verdict: "approval_required" } }),
  traceEvent({ eventType: "intent.policy_evaluated", subjectType: "intent", subjectId: subjects.intentV2, priorState: "sealed", currentState: "policy_evaluated", actorType: "system", actorId: "deterministic-policy-v1", details: { policyRef: subjects.policyV2 } }),
  traceEvent({ eventType: "intent.approval_pending", subjectType: "intent", subjectId: subjects.intentV2, priorState: "policy_evaluated", currentState: "approval_pending", actorType: "system", actorId: "crosssignal-authority-v1" }),
  traceEvent({ eventType: "approval.pending", subjectType: "approval", subjectId: subjects.grantV2, priorState: null, currentState: "pending", actorType: "human", actorId: identity.ownerUserId, details: { intentRef: subjects.intentV2, policyRef: subjects.policyV2 } }),
  traceEvent({ eventType: "approval.approved", subjectType: "approval", subjectId: subjects.grantV2, priorState: "pending", currentState: "approved", actorType: "human", actorId: identity.ownerUserId, details: { decision: "approved", expiresAt: "2026-08-13T10:00:00.000Z", intentRef: subjects.intentV2, policyRef: subjects.policyV2 } }),
  traceEvent({ eventType: "intent.approved", subjectType: "intent", subjectId: subjects.intentV2, priorState: "approval_pending", currentState: "approved", actorType: "human", actorId: identity.ownerUserId, details: { grantRef: subjects.grantV2 } }),
  traceEvent({ eventType: "effect.reserved", subjectType: "effect", subjectId: subjects.effectV2, priorState: null, currentState: "reserved", actorType: "human", actorId: identity.ownerUserId, details: { authorityControlEventRef: controlHistory[2].id, authorityControlHash: controlHistory[2].contentHash, authorityControlSequence: controlHistory[2].sequence, effectRef: subjects.effectV2, providerMode: "FIXTURE" } }),
  traceEvent({ eventType: "trace.executing", subjectType: "trace", subjectId: subjects.trace, priorState: "awaiting_approval", currentState: "executing", actorType: "human", actorId: identity.ownerUserId, details: { authorityControlEventRef: controlHistory[2].id, effectRef: subjects.effectV2, intentRef: subjects.intentV2 } }),
  traceEvent({ eventType: "effect.dispatching", subjectType: "effect", subjectId: subjects.effectV2, priorState: "reserved", currentState: "dispatching", actorType: "adapter", actorId: "fixture-email-adapter-v1", details: { effectRef: subjects.effectV2, providerMode: "FIXTURE" } }),
  traceEvent({ eventType: "effect.confirmed", subjectType: "effect", subjectId: subjects.effectV2, priorState: "dispatching", currentState: "confirmed", actorType: "adapter", actorId: "fixture-email-adapter-v1", details: { effectRef: subjects.effectV2, providerMode: "FIXTURE", retryAttempted: false } }),
  traceEvent({ eventType: "intent.consumed", subjectType: "intent", subjectId: subjects.intentV2, priorState: "approved", currentState: "consumed", actorType: "system", actorId: "crosssignal-authority-v1", details: { effectRef: subjects.effectV2 } }),
  traceEvent({ eventType: "approval.consumed", subjectType: "approval", subjectId: subjects.grantV2, priorState: "approved", currentState: "consumed", actorType: "system", actorId: "crosssignal-authority-v1", details: { effectRef: subjects.effectV2 } }),
  traceEvent({ eventType: "trace.observing", subjectType: "trace", subjectId: subjects.trace, priorState: "executing", currentState: "observing", actorType: "adapter", actorId: "fixture-email-adapter-v1", details: { effectRef: subjects.effectV2 } }),
  traceEvent({ eventType: "outcome.preregistered", subjectType: "outcome", subjectId: subjects.outcome, priorState: null, currentState: "preregistered", actorType: "system", actorId: "crosssignal-outcome-v1", details: { metricName: "activation_72h" } }),
  traceEvent({ eventType: "outcome.observed", subjectType: "outcome", subjectId: subjects.outcome, priorState: "preregistered", currentState: "observed", actorType: "adapter", actorId: "fixture-metric-adapter-v1", details: { metricName: "activation_72h" } }),
  traceEvent({ eventType: "outcome.assessed", subjectType: "outcome", subjectId: subjects.outcome, priorState: "observed", currentState: "assessed", actorType: "system", actorId: "crosssignal-outcome-v1", details: { assessmentLabel: "correlated", metricName: "activation_72h" } }),
  traceEvent({ eventType: "trace.assessed", subjectType: "trace", subjectId: subjects.trace, priorState: "observing", currentState: "assessed", actorType: "system", actorId: "crosssignal-outcome-v1", details: { assessmentLabel: "correlated", outcomeRef: subjects.outcome } }),
];

export const L04_PROJECTION_DETAIL_ALLOWLIST = deepFreeze({
  trace: ["assessmentLabel", "authorityControlEventRef", "effectRef", "intentRef", "outcomeRef"],
  context: ["manifestHash", "sourceCount"],
  graph: ["attempt", "errorCode", "executionMode", "graphVersion", "handlerVersion", "nodeKey", "outputHash"],
  intent: ["effectRef", "grantRef", "intentVersion", "policyRef", "policyVersion", "supersededByIntentRef", "supersedesIntentRef"],
  policy: ["intentRef", "policyVersion", "verdict"],
  approval: ["decision", "effectRef", "expiresAt", "intentRef", "policyRef"],
  effect: ["authorityControlEventRef", "authorityControlHash", "authorityControlSequence", "effectRef", "errorCode", "providerMode", "retryAttempted"],
  outcome: ["assessmentLabel", "metricName"],
});

const actorDisplay = {
  human: "Workspace owner",
  system: "CrossSignal system",
  agent: "Bounded reasoning agent",
  adapter: "Labeled adapter",
};

export function projectTraceEvents(rows, workspaceId, traceId) {
  return rows
    .filter((row) => row.workspaceId === workspaceId && row.traceId === traceId)
    .sort((left, right) => left.sequence - right.sequence)
    .map((row) => {
      const payload = JSON.parse(row.payloadJson);
      const allowed = new Set(L04_PROJECTION_DETAIL_ALLOWLIST[row.subjectType] ?? []);
      const details = Object.fromEntries(
        Object.entries(payload).filter(([key]) => allowed.has(key)),
      );
      return {
        id: row.id,
        sequence: row.sequence,
        eventType: row.eventType,
        subjectType: row.subjectType,
        subjectRef: row.subjectId,
        priorState: row.priorState,
        currentState: row.currentState,
        actorType: row.actorType,
        actorDisplay: actorDisplay[row.actorType],
        occurredAt: row.occurredAt,
        payloadHash: row.payloadHash,
        details,
      };
    });
}

const collisionRows = traceEvents.slice(0, 2).map((row, index) => ({
  ...row,
  id: row.id,
  workspaceId: identity.collisionWorkspaceId,
  traceId: identity.traceId,
  actorId: identity.collisionOwnerUserId,
  sequence: index + 1,
}));
const projectedTraceEvents = projectTraceEvents(
  [...collisionRows, ...traceEvents].reverse(),
  identity.workspaceId,
  identity.traceId,
);

export const L04_RACE_SCHEDULES = deepFreeze([
  {
    id: "pause-wins-before-effect-reservation",
    loadedControlSequence: 3,
    winningWrite: "append engaged control event at sequence 4",
    losingWrite: "reserve effect against sequence 3",
    expectedError: "l04_stale_authority_control",
    expectedEffectCount: 0,
  },
  {
    id: "effect-reservation-wins-before-pause",
    loadedControlSequence: 3,
    winningWrite: "reserve effect against latest unengaged sequence 3",
    followingWrite: "append engaged control event at sequence 4",
    expectedBoundSequence: 3,
    expectedEffectCount: 1,
  },
  {
    id: "two-toggles-share-one-prior-head",
    loadedControlSequence: 3,
    winningWrite: "append exactly one successor at sequence 4",
    losingWrite: "append a second successor from sequence 3",
    expectedError: "l04_stale_authority_control",
    expectedSuccessorCount: 1,
  },
]);

export const L04_MIGRATION_CASES = deepFreeze([
  { id: "valid-legacy-row", expected: "one deterministic migration_backfill event" },
  { id: "rerun-valid-legacy-row", expected: "zero additional events" },
  { id: "missing-member", expectedError: "migration_l04_invalid_authority_history" },
  { id: "invalid-time", expectedError: "migration_l04_invalid_authority_history" },
  { id: "invalid-boolean", expectedError: "migration_l04_invalid_authority_history" },
  { id: "ambiguous-existing-head", expectedError: "migration_l04_ambiguous_authority_history" },
]);

export const L04_ACCEPTANCE_IDS = deepFreeze(
  Array.from({ length: 12 }, (_, index) => `L04-AC${String(index + 1).padStart(2, "0")}`),
);
export const L04_NEGATIVE_IDS = deepFreeze(
  Array.from({ length: 12 }, (_, index) => `L04-N${String(index + 1).padStart(2, "0")}`),
);

const subjectTransitions = {
  trace: new Set(["null->collecting", "collecting->context_frozen", "context_frozen->reasoning", "reasoning->awaiting_approval", "awaiting_approval->executing", "executing->observing", "observing->assessed"]),
  graph: new Set(["null->pending", "pending->running", "running->succeeded", "running->failed", "pending->skipped"]),
  intent: new Set(["null->drafted", "drafted->sealed", "sealed->policy_evaluated", "policy_evaluated->approval_pending", "approval_pending->approved", "approval_pending->superseded", "approved->consumed"]),
  policy: new Set(["null->unevaluated", "unevaluated->approval_required", "unevaluated->allow", "unevaluated->deny"]),
  approval: new Set(["null->pending", "pending->approved", "pending->rejected", "approved->consumed"]),
  effect: new Set(["null->reserved", "reserved->dispatching", "dispatching->confirmed", "dispatching->failed", "dispatching->indeterminate"]),
  outcome: new Set(["null->preregistered", "preregistered->observed", "observed->assessed"]),
};

export function validateL04Fixture(fixture = L04_AUTHORITY_TRACE_FIXTURE) {
  const errors = [];
  const { controlHistory: controls, traceEvents: events, projectedTraceEvents: projection } = fixture;
  controls.forEach((event, index) => {
    if (event.sequence !== index + 1) errors.push("control history is not gap-free");
    if (index === 0 && event.priorState !== null) errors.push("first control prior state must be null");
    if (index > 0 && event.priorState !== controls[index - 1].currentState) errors.push("control prior state does not match head");
    if (index > 0 && event.currentState === event.priorState) errors.push("control transition is a no-op event");
    if (sha256(event.payloadJson) !== event.contentHash) errors.push("control content hash mismatch");
  });
  const eventHeads = new Map();
  events.forEach((event, index) => {
    if (event.sequence !== index + 1) errors.push("trace history is not gap-free");
    if (sha256(event.payloadJson) !== event.payloadHash) errors.push("trace payload hash mismatch");
    const key = `${event.subjectType}:${event.subjectId}`;
    const prior = eventHeads.get(key) ?? null;
    if (prior !== event.priorState) errors.push(`trace subject head mismatch: ${key}`);
    const transition = `${event.priorState ?? "null"}->${event.currentState}`;
    if (!subjectTransitions[event.subjectType]?.has(transition)) errors.push(`invalid subject transition: ${event.subjectType}:${transition}`);
    eventHeads.set(key, event.currentState);
  });
  if (projection.length !== events.length) errors.push("projection omitted trace events");
  projection.forEach((event, index) => {
    if (event.sequence !== index + 1) errors.push("projection order is not contiguous");
    const serialized = JSON.stringify(event);
    for (const forbidden of ["payloadJson", "idempotencyKey", "actorId", "@example", "Bearer ", "email body"]) {
      if (serialized.includes(forbidden)) errors.push(`projection leaked ${forbidden}`);
    }
  });
  if (new Set(L04_ACCEPTANCE_IDS).size !== 12) errors.push("acceptance coverage is incomplete");
  if (new Set(L04_NEGATIVE_IDS).size !== 12) errors.push("negative coverage is incomplete");
  if (L04_RACE_SCHEDULES.length !== 3) errors.push("race schedules are incomplete");
  if (L04_MIGRATION_CASES.length !== 6) errors.push("migration cases are incomplete");
  return [...new Set(errors)];
}

export const L04_AUTHORITY_TRACE_FIXTURE = deepFreeze({
  version: L04_FIXTURE_VERSION,
  identity,
  legacyControlRow: {
    workspaceId: identity.workspaceId,
    killSwitchEngaged: false,
    updatedBy: identity.ownerUserId,
    updatedAt: "2026-08-13T08:00:00.000Z",
  },
  controlHistory,
  effectiveControl: {
    eventId: controlHistory.at(-1).id,
    sequence: controlHistory.at(-1).sequence,
    engaged: controlHistory.at(-1).currentState,
    contentHash: controlHistory.at(-1).contentHash,
  },
  subjects,
  traceEvents,
  collisionRows,
  projectedTraceEvents,
  traceEventCount: projectedTraceEvents.length,
  acceptanceIds: L04_ACCEPTANCE_IDS,
  negativeIds: L04_NEGATIVE_IDS,
  raceSchedules: L04_RACE_SCHEDULES,
  migrationCases: L04_MIGRATION_CASES,
});
