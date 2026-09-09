import type {
  ExecutionScenario,
  FlightRecorderSnapshot,
  TraceEventProjection,
} from "../app/flight-recorder-types";
import {
  projectFlightTraceEvents,
  sealAuthorityControlEvent,
  sealCanonical,
} from "./flight-recorder-contracts";
import {
  buildDemoIntent,
  buildPendingFlightRecorderDemo,
  FLIGHT_RECORDER_SPENDING_CAP_USD,
} from "./flight-recorder-demo";
import { REASONING_GRAPH_VERSION, REASONING_HANDLER_VERSION } from "./flight-recorder-graph-definition";
import {
  supabaseRuntime,
  type SupabaseRuntimeEventType,
} from "./supabase-runtime";

type RuntimeGateway = typeof supabaseRuntime;
let runtimeGateway: RuntimeGateway = supabaseRuntime;

export function installSupabaseRuntimeGatewayForTest(gateway: RuntimeGateway | null): void {
  runtimeGateway = gateway ?? supabaseRuntime;
}

type MutableActionInput = {
  userId: string;
  workspaceId: string;
};

const NODE_LABELS: Record<string, string> = {
  planner: "Planner",
  quantitative: "Quantitative worker",
  qualitative: "Qualitative worker",
  experiment_design: "Experiment worker",
  skeptic: "Skeptic review",
  synthesizer: "Synthesizer",
};

async function sha256(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function principalFor(userId: string): Promise<string> {
  return `sha256:${await sha256(userId)}`;
}

function cloneSnapshot(snapshot: FlightRecorderSnapshot): FlightRecorderSnapshot {
  return structuredClone(snapshot);
}

async function buildInitialSnapshot(userId: string, workspaceId: string): Promise<FlightRecorderSnapshot> {
  const principal = await principalFor(userId);
  const demo = await buildPendingFlightRecorderDemo({ userId: principal, workspaceId });
  if (!demo.flightTraceEvents || !demo.intentBundle || !demo.reasoningNodes) {
    throw new Error("The pending flight recorder fixture is incomplete.");
  }
  const traceEvents = await projectFlightTraceEvents({
    workspaceId,
    traceId: demo.trace.id,
    rows: demo.flightTraceEvents,
  });
  const initializationIdentity = await sealCanonical({ kind: "workspace_initialized", workspaceId });
  const initialization = await sealAuthorityControlEvent({
    id: `authority_control_${initializationIdentity.sha256.slice(0, 24)}`,
    workspaceId,
    sequence: 1,
    priorState: null,
    currentState: false,
    actorUserId: principal,
    reasonCode: "workspace_initialized",
    idempotencyKey: `supabase:initialize:${workspaceId}:kill_switch`,
    occurredAt: demo.now,
  });
  const recipients = demo.intentBundle.intent.recipients;

  return {
    workspaceId,
    traceId: demo.trace.id,
    traceKey: demo.trace.traceKey,
    traceState: "awaiting_approval",
    truthMode: "FIXTURE",
    killSwitchEngaged: false,
    intent: {
      id: demo.intentBundle.intent.id,
      version: 1,
      recipients,
      subject: demo.intentBundle.intent.subject,
      body: demo.intentBundle.intent.body,
      cohortCap: demo.intentBundle.intent.cohortCap,
      spendingCapUsd: FLIGHT_RECORDER_SPENDING_CAP_USD,
      expiresAt: demo.intentBundle.intent.expiresAt,
      canonicalPayloadHash: demo.intentBundle.intent.canonicalPayloadHash,
      recipientSetHash: demo.intentBundle.intent.recipientSetHash,
      contextManifestHash: demo.intentBundle.intent.contextManifestHash,
      policyVersion: demo.intentBundle.intent.policyVersion,
      policyHash: demo.intentBundle.intent.policyHash,
    },
    policy: {
      verdict: "approval_required",
      plainEnglish: `Send this email to these ${recipients.length} people. Cost is capped at $${FLIGHT_RECORDER_SPENDING_CAP_USD.toFixed(2)}. Do you authorize this action?`,
      evaluatorVersion: demo.intentBundle.policyDecision.evaluatorVersion,
    },
    approval: null,
    execution: null,
    outcome: null,
    evidence: demo.evidence.map((item) => ({
      key: item.evidenceKey,
      label: item.label,
      summary: item.summary,
      truthMode: item.truthMode,
      sourceVersion: item.sourceVersion,
      contentHash: item.contentHash,
    })),
    playbook: demo.reasoningNodes.map((item) => ({
      key: item.node.nodeKey,
      label: NODE_LABELS[item.node.nodeKey] ?? item.node.nodeKey,
      role: `Precomputed fixture · ${item.role}`,
      state: item.node.currentState,
      attempt: item.node.attempt,
      executionMode: "precomputed_fixture",
      graphVersion: REASONING_GRAPH_VERSION,
      handlerVersion: REASONING_HANDLER_VERSION,
      evidenceCount: JSON.parse(item.artifact.evidenceCitationsJson).length,
      outputHash: item.node.outputHash,
    })),
    context: {
      sourceCount: demo.contextSnapshot.sourceCount,
      manifestHash: demo.contextSnapshot.manifestHash,
    },
    authorityControlHistory: [{
      id: initialization.id,
      sequence: initialization.sequence,
      priorState: initialization.priorState,
      currentState: initialization.currentState,
      reasonCode: initialization.reasonCode,
      actorDisplay: "Workspace owner",
      occurredAt: initialization.occurredAt,
      contentHash: initialization.contentHash,
    }],
    traceEvents,
    traceEventCount: traceEvents.length,
  };
}

async function projectedEvent(
  snapshot: FlightRecorderSnapshot,
  input: {
    eventType: string;
    subjectType: TraceEventProjection["subjectType"];
    subjectRef: string;
    priorState: string | null;
    currentState: string;
    actorType: TraceEventProjection["actorType"];
    details?: TraceEventProjection["details"];
  },
): Promise<TraceEventProjection> {
  const details = input.details ?? {};
  const payload = await sealCanonical(details);
  const lastTime = snapshot.traceEvents.at(-1)?.occurredAt;
  const occurredAt = new Date(Math.max(Date.now(), lastTime ? Date.parse(lastTime) + 1 : 0)).toISOString();
  return {
    id: crypto.randomUUID(),
    sequence: snapshot.traceEvents.length + 1,
    eventType: input.eventType,
    subjectType: input.subjectType,
    subjectRef: input.subjectRef,
    priorState: input.priorState,
    currentState: input.currentState,
    actorType: input.actorType,
    actorDisplay: input.actorType === "human"
      ? "Workspace owner"
      : input.actorType === "agent"
        ? "Bounded reasoning agent"
        : input.actorType === "adapter"
          ? "Labeled adapter"
          : "CrossSignal system",
    occurredAt,
    payloadHash: payload.sha256,
    details,
  };
}

async function appendEvents(
  snapshot: FlightRecorderSnapshot,
  events: Parameters<typeof projectedEvent>[1][],
): Promise<void> {
  for (const event of events) snapshot.traceEvents.push(await projectedEvent(snapshot, event));
  snapshot.traceEventCount = snapshot.traceEvents.length;
}

async function mutateRuntime(
  input: MutableActionInput,
  eventType: SupabaseRuntimeEventType,
  update: (snapshot: FlightRecorderSnapshot) => Promise<FlightRecorderSnapshot>,
): Promise<FlightRecorderSnapshot> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const state = await runtimeGateway.readRuntime(input.userId, input.workspaceId);
    if (!state) throw new Error("The Supabase runtime has not been initialized.");
    const snapshot = await update(cloneSnapshot(state.snapshot));
    const written = await runtimeGateway.writeRuntime({
      ...input,
      expectedVersion: state.version,
      eventType,
      snapshot,
    });
    if (!("conflictVersion" in written)) return written.snapshot;
  }
  throw new Error("The workspace changed while this action was being saved. Try again.");
}

export async function getOrCreateSupabaseFlightRecorderSnapshot(
  userId: string,
  workspaceId: string,
): Promise<FlightRecorderSnapshot> {
  const current = await runtimeGateway.readRuntime(userId, workspaceId);
  if (current) return current.snapshot;
  const snapshot = await buildInitialSnapshot(userId, workspaceId);
  const written = await runtimeGateway.writeRuntime({
    userId,
    workspaceId,
    expectedVersion: 0,
    eventType: "runtime.initialized",
    snapshot,
  });
  if (!("conflictVersion" in written)) return written.snapshot;
  const raced = await runtimeGateway.readRuntime(userId, workspaceId);
  if (!raced) throw new Error("The Supabase runtime could not be initialized.");
  return raced.snapshot;
}

export async function readSupabaseFlightRecorderSnapshot(
  userId: string,
  workspaceId: string,
): Promise<FlightRecorderSnapshot> {
  return getOrCreateSupabaseFlightRecorderSnapshot(userId, workspaceId);
}

export async function replaceSupabasePendingIntent(input: MutableActionInput & {
  recipients: string[];
  subject: string;
  body: string;
}): Promise<FlightRecorderSnapshot> {
  return mutateRuntime(input, "intent.replaced", async (snapshot) => {
    if (snapshot.traceState !== "awaiting_approval") throw new Error("Only a pending action can be edited.");
    if (snapshot.approval) throw new Error("An approved action cannot be edited. Reset the fixture first.");
    const scope = snapshot.intent.id.match(/^intent_([0-9a-f]{16})_v\d+$/)?.[1];
    if (!scope) throw new Error("The persisted intent identity is incomplete.");
    const nextVersion = snapshot.intent.version + 1;
    const next = await buildDemoIntent({
      userId: await principalFor(input.userId),
      workspaceId: input.workspaceId,
      traceId: snapshot.traceId,
      contextSnapshotId: `context_${scope}`,
      sourceArtifactId: `artifact_${scope}_synthesizer`,
      outcomeDefinitionId: `outcome_definition_${scope}`,
      contextManifestHash: snapshot.context.manifestHash,
      intentVersion: nextVersion,
      recipients: input.recipients,
      subject: input.subject,
      body: input.body,
      now: new Date().toISOString(),
    });
    const priorIntentId = snapshot.intent.id;
    snapshot.intent = {
      id: next.intent.id,
      version: nextVersion,
      recipients: next.intent.recipients,
      subject: next.intent.subject,
      body: next.intent.body,
      cohortCap: next.intent.cohortCap,
      spendingCapUsd: FLIGHT_RECORDER_SPENDING_CAP_USD,
      expiresAt: next.intent.expiresAt,
      canonicalPayloadHash: next.intent.canonicalPayloadHash,
      recipientSetHash: next.intent.recipientSetHash,
      contextManifestHash: next.intent.contextManifestHash,
      policyVersion: next.intent.policyVersion,
      policyHash: next.intent.policyHash,
    };
    snapshot.approval = null;
    snapshot.execution = null;
    snapshot.outcome = null;
    await appendEvents(snapshot, [
      { eventType: "intent.superseded", subjectType: "intent", subjectRef: priorIntentId, priorState: "approval_pending", currentState: "superseded", actorType: "human", details: { supersededByIntentRef: next.intent.id } },
      { eventType: "intent.drafted", subjectType: "intent", subjectRef: next.intent.id, priorState: null, currentState: "drafted", actorType: "human", details: { intentVersion: nextVersion, supersedesIntentRef: priorIntentId } },
      { eventType: "intent.sealed", subjectType: "intent", subjectRef: next.intent.id, priorState: "drafted", currentState: "sealed", actorType: "system", details: { intentVersion: nextVersion, policyVersion: next.intent.policyVersion } },
      { eventType: "intent.policy_evaluated", subjectType: "intent", subjectRef: next.intent.id, priorState: "sealed", currentState: "policy_evaluated", actorType: "system", details: { policyRef: next.policyDecision.id } },
      { eventType: "intent.approval_pending", subjectType: "intent", subjectRef: next.intent.id, priorState: "policy_evaluated", currentState: "approval_pending", actorType: "system" },
    ]);
    return snapshot;
  });
}

export async function setSupabaseWorkspaceKillSwitch(input: MutableActionInput & {
  engaged: boolean;
}): Promise<FlightRecorderSnapshot> {
  const eventType = input.engaged ? "authority.paused" : "authority.resumed";
  return mutateRuntime(input, eventType, async (snapshot) => {
    if (snapshot.killSwitchEngaged === input.engaged) return snapshot;
    const prior = snapshot.authorityControlHistory.at(-1);
    if (!prior) throw new Error("The authority control history is incomplete.");
    const principal = await principalFor(input.userId);
    const event = await sealAuthorityControlEvent({
      id: crypto.randomUUID(),
      workspaceId: input.workspaceId,
      sequence: prior.sequence + 1,
      priorState: prior.currentState,
      currentState: input.engaged,
      actorUserId: principal,
      reasonCode: "owner_transition",
      idempotencyKey: `supabase:transition:${input.workspaceId}:${prior.sequence + 1}:${crypto.randomUUID()}`,
      occurredAt: new Date(Math.max(Date.now(), Date.parse(prior.occurredAt) + 1)).toISOString(),
    });
    snapshot.killSwitchEngaged = input.engaged;
    snapshot.authorityControlHistory.push({
      id: event.id,
      sequence: event.sequence,
      priorState: event.priorState,
      currentState: event.currentState,
      reasonCode: event.reasonCode,
      actorDisplay: "Workspace owner",
      occurredAt: event.occurredAt,
      contentHash: event.contentHash,
    });
    return snapshot;
  });
}

export async function authorizeAndExecuteSupabase(input: MutableActionInput & {
  scenario: ExecutionScenario;
}): Promise<FlightRecorderSnapshot> {
  return mutateRuntime(input, `action.${input.scenario}`, async (snapshot) => {
    if (snapshot.killSwitchEngaged) throw new Error("The global kill switch is engaged.");
    if (snapshot.traceState !== "awaiting_approval" || snapshot.approval || snapshot.execution) {
      throw new Error("This action is no longer awaiting authorization.");
    }
    const now = new Date().toISOString();
    const grantId = crypto.randomUUID();
    const effectId = crypto.randomUUID();
    snapshot.approval = {
      decision: "approved",
      approvedAt: now,
      approvedBy: "Workspace owner",
      grantId,
    };
    snapshot.traceState = input.scenario === "confirmed" ? "assessed" : input.scenario === "failed" ? "failed" : "executing";
    snapshot.execution = {
      state: input.scenario === "confirmed" ? "confirmed" : input.scenario,
      providerMode: "TEST",
      providerReceiptId: input.scenario === "confirmed" ? `test_receipt_${effectId.slice(0, 12)}` : null,
      errorCode: input.scenario === "failed" ? "fixture_provider_rejected" : input.scenario === "indeterminate" ? "fixture_provider_ambiguous" : null,
      explanation: input.scenario === "confirmed"
        ? "The FIXTURE provider confirmed acceptance of all three TEST messages."
        : input.scenario === "failed"
          ? "The TEST action failed. Nothing is presented as sent, and no retry was attempted."
          : "The provider response was ambiguous. CrossSignal stopped and did not retry.",
      attemptCount: 1,
    };
    if (input.scenario === "confirmed") {
      snapshot.outcome = {
        observedLabel: "Observed",
        assessmentLabel: "correlated",
        metricName: "activation_within_72h",
        activatedAccounts: 1,
        eligibleAccounts: 3,
        baselineRate: 0.31,
        observedRate: 1 / 3,
        limitations: [
          "This is a deterministic FIXTURE observation, not a live customer result.",
          "A three-account cohort cannot establish causality.",
        ],
        rationale: "The observed activation followed the confirmed TEST action, so it is labeled correlated only.",
      };
    }
    await appendEvents(snapshot, [
      { eventType: "intent.approved", subjectType: "intent", subjectRef: snapshot.intent.id, priorState: "approval_pending", currentState: "approved", actorType: "human", details: { grantRef: grantId } },
      { eventType: "effect.reserved", subjectType: "effect", subjectRef: effectId, priorState: null, currentState: "reserved", actorType: "system", details: { effectRef: effectId, providerMode: "TEST" } },
      { eventType: "effect.dispatching", subjectType: "effect", subjectRef: effectId, priorState: "reserved", currentState: "dispatching", actorType: "adapter", details: { providerMode: "TEST", retryAttempted: false } },
      { eventType: `effect.${input.scenario}`, subjectType: "effect", subjectRef: effectId, priorState: "dispatching", currentState: input.scenario, actorType: "adapter", details: { effectRef: effectId, providerMode: "TEST", retryAttempted: false } },
      { eventType: input.scenario === "confirmed" ? "trace.assessed" : input.scenario === "failed" ? "trace.failed" : "trace.indeterminate", subjectType: "trace", subjectRef: snapshot.traceId, priorState: "awaiting_approval", currentState: snapshot.traceState, actorType: "system", details: input.scenario === "confirmed" ? { assessmentLabel: "correlated", effectRef: effectId } : { effectRef: effectId } },
    ]);
    return snapshot;
  });
}

export async function resetSupabaseFlightRecorderFixture(
  userId: string,
  workspaceId: string,
): Promise<FlightRecorderSnapshot> {
  return mutateRuntime({ userId, workspaceId }, "fixture.reset", async (current) => {
    const reset = await buildInitialSnapshot(userId, workspaceId);
    reset.killSwitchEngaged = current.killSwitchEngaged;
    reset.authorityControlHistory = current.authorityControlHistory;
    return reset;
  });
}
