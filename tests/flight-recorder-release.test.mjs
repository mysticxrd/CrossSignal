import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import {
  assertTransition,
  createContextManifest,
  planReasoningRecovery,
  validateExecutionAuthority,
  validateOutcomeAssessment,
  validateReasoningArtifact,
} from "../db/flight-recorder-contracts.ts";
import { buildPendingFlightRecorderDemo } from "../db/flight-recorder-demo.ts";

const root = new URL("../", import.meta.url);
const migrationNames = [
  "0000_dry_chat.sql",
  "0001_gigantic_shriek.sql",
  "0002_funny_madripoor.sql",
  "0003_faithful_guardsmen.sql",
  "0004_typical_omega_red.sql",
  "0005_flight_recorder_guards.sql",
  "0006_l08_active_intent_authority.sql",
  "0007_l06_persisted_graph_executor.sql",
];

function applyMigration(database, migration) {
  for (const statement of migration.split("--> statement-breakpoint")) {
    if (statement.trim()) database.exec(statement);
  }
}

async function freshDatabase() {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  for (const name of migrationNames) {
    applyMigration(database, await readFile(new URL(`drizzle/${name}`, root), "utf8"));
  }
  return database;
}

test("AC-01 reconstructs the complete chain under one trace identity", async () => {
  const fixture = await buildPendingFlightRecorderDemo({
    userId: "release-owner",
    workspaceId: "release-workspace",
    now: "2026-08-24T12:00:00.000Z",
  });
  const traceId = fixture.trace.id;
  const workspaceId = fixture.trace.workspaceId;
  for (const item of fixture.evidence) {
    assert.equal(item.traceId, traceId);
    assert.equal(item.workspaceId, workspaceId);
  }
  for (const { node, artifact } of fixture.reasoningNodes) {
    assert.equal(node.traceId, traceId);
    assert.equal(artifact.traceId, traceId);
    assert.equal(artifact.nodeId, node.id);
  }
  for (const item of [fixture.contextSnapshot, fixture.intentBundle.intent,
    fixture.intentBundle.policyDecision, fixture.outcomeDefinition]) {
    assert.equal(item.traceId, traceId);
    assert.equal(item.workspaceId, workspaceId);
  }
  assert.equal(fixture.flightTraceEvents.at(-1).currentState, "awaiting_approval");
});

test("AC-02 rejects every exact-authority mutation and replay", async () => {
  const fixture = await buildPendingFlightRecorderDemo({
    userId: "authority-owner",
    workspaceId: "authority-workspace",
    now: "2026-08-24T12:00:00.000Z",
  });
  const persisted = fixture.intentBundle.intent;
  const intent = {
    id: persisted.id,
    workspaceId: persisted.workspaceId,
    traceId: persisted.traceId,
    recipientSetHash: persisted.recipientSetHash,
    contextManifestHash: persisted.contextManifestHash,
    policyHash: persisted.policyHash,
    nonce: persisted.nonce,
    expiresAt: persisted.expiresAt,
    canonicalPayloadHash: persisted.canonicalPayloadHash,
  };
  const persistedPolicy = fixture.intentBundle.policyDecision;
  const policy = {
    workspaceId: persistedPolicy.workspaceId,
    intentId: persistedPolicy.intentId,
    verdict: persistedPolicy.verdict,
    policyHash: persistedPolicy.policyHash,
    evaluatedPayloadHash: persistedPolicy.evaluatedPayloadHash,
    evaluatedContextHash: persistedPolicy.evaluatedContextHash,
  };
  const grant = {
    workspaceId: intent.workspaceId,
    intentId: intent.id,
    decision: "approved",
    boundPayloadHash: intent.canonicalPayloadHash,
    boundContextHash: intent.contextManifestHash,
    boundPolicyHash: intent.policyHash,
    boundRecipientSetHash: intent.recipientSetHash,
    nonce: intent.nonce,
    expiresAt: intent.expiresAt,
    approvedBy: fixture.trace.createdBy,
  };
  const request = {
    workspaceId: intent.workspaceId,
    traceId: intent.traceId,
    intentId: intent.id,
    actorUserId: grant.approvedBy,
    actorWorkspaceId: intent.workspaceId,
    killSwitchEngaged: false,
    canonicalPayloadHash: intent.canonicalPayloadHash,
    contextManifestHash: intent.contextManifestHash,
    policyHash: intent.policyHash,
    recipientSetHash: intent.recipientSetHash,
    nonce: intent.nonce,
    now: "2026-08-24T12:02:00.000Z",
    priorAttemptCount: 0,
  };
  assert.deepEqual(validateExecutionAuthority({ intent, policy, grant, request }), []);
  for (const mutation of [
    { canonicalPayloadHash: "a".repeat(64) },
    { contextManifestHash: "b".repeat(64) },
    { policyHash: "c".repeat(64) },
    { recipientSetHash: "d".repeat(64) },
    { nonce: "replayed-nonce" },
    { actorWorkspaceId: "foreign-workspace" },
    { priorAttemptCount: 1 },
    { now: "2026-08-26T12:02:00.000Z" },
    { killSwitchEngaged: true },
  ]) {
    assert.ok(
      validateExecutionAuthority({ intent, policy, grant, request: { ...request, ...mutation } }).length > 0,
      `authority mutation was accepted: ${JSON.stringify(mutation)}`,
    );
  }
});

test("AC-03 reserves one effect and makes ambiguous dispatch terminal without retry", async () => {
  const [migration, repository] = await Promise.all([
    readFile(new URL("drizzle/0004_typical_omega_red.sql", root), "utf8"),
    readFile(new URL("db/flight-recorder.ts", root), "utf8"),
  ]);
  assert.match(migration, /idx_effect_attempts_intended_effect/);
  assert.match(migration, /idx_effect_attempts_one_grant_use/);
  assert.doesNotThrow(() => assertTransition("effect", "dispatching", "indeterminate"));
  assert.throws(() => assertTransition("effect", "indeterminate", "dispatching"), /invalid effect transition/);
  assert.match(repository, /fixture_provider_timeout_after_dispatch/);
  assert.match(repository, /retryAttempted: false/);
  assert.doesNotMatch(repository, /setTimeout\(|retry\(/);
});

test("AC-04 appends and supersedes late outcomes without rewriting prior truth", async () => {
  assert.deepEqual(validateOutcomeAssessment({
    label: "correlated",
    evidenceIds: ["late-evidence"],
    limitations: ["late FIXTURE signal", "no causal inference"],
    observationCount: 1,
    invalidSignatureCount: 0,
    observationTruthModes: ["FIXTURE"],
  }), []);
  assert.ok(validateOutcomeAssessment({
    label: "supported",
    evidenceIds: ["late-evidence"],
    limitations: ["FIXTURE"],
    observationCount: 1,
    invalidSignatureCount: 0,
    observationTruthModes: ["FIXTURE"],
  }).includes("FIXTURE observations cannot support an outcome"));

  const database = await freshDatabase();
  const hash = "a".repeat(64);
  try {
    database.exec(`
      INSERT INTO users (id, email, display_name) VALUES ('late-user', 'late@example.test', 'Late Owner');
      INSERT INTO workspaces (id, name, slug, owner_user_id) VALUES ('late-ws', 'Late', 'late', 'late-user');
      INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ('late-ws', 'late-user', 'owner');
      INSERT INTO flight_traces (id, workspace_id, trace_key, fixture_key, truth_mode, current_state, retention_class, retention_until, created_by)
        VALUES ('late-trace', 'late-ws', 'late-trace-key', NULL, 'TEST', 'assessed', 'review_evidence', '2027-08-13T00:00:00.000Z', 'late-user');
      INSERT INTO flight_evidence (id, workspace_id, trace_id, evidence_key, truth_mode, source_kind, source_version, source_ref, captured_at, payload_json, content_hash, idempotency_key, created_by)
        VALUES ('late-evidence-id', 'late-ws', 'late-trace', 'late-evidence', 'TEST', 'late_metric', 'v1', 'test://late', '2026-08-13T00:00:00.000Z', '{}', '${hash}', 'late-evidence-v1', 'late-user');
      INSERT INTO outcome_definitions (id, workspace_id, trace_id, definition_key, metric_name, cohort_json, cohort_hash, baseline_json, baseline_hash, window_starts_at, window_ends_at, assessment_rule_json, assessment_rule_hash, registered_by, registered_at)
        VALUES ('late-definition', 'late-ws', 'late-trace', 'late-definition-v1', 'activation', '{}', '${hash}', '{}', '${hash}', '2026-08-13T00:00:00.000Z', '2026-08-20T00:00:00.000Z', '{}', '${hash}', 'late-user', '2026-08-13T00:00:00.000Z');
      INSERT INTO outcome_assessments (id, workspace_id, trace_id, definition_id, assessment_version, label, evidence_ids_json, limitations_json, rationale_summary, content_hash, created_at)
        VALUES ('assessment-v1', 'late-ws', 'late-trace', 'late-definition', 1, 'correlated', '["late-evidence"]', '["early signal"]', 'Early correlated signal.', '${hash}', '2026-08-14T00:00:00.000Z');
      INSERT INTO outcome_assessments (id, workspace_id, trace_id, definition_id, assessment_version, label, evidence_ids_json, limitations_json, rationale_summary, content_hash, created_at)
        VALUES ('assessment-v2', 'late-ws', 'late-trace', 'late-definition', 2, 'inconclusive', '["late-evidence"]', '["late correction"]', 'Late evidence changed the conclusion.', '${hash}', '2026-08-15T00:00:00.000Z');
      INSERT INTO outcome_assessment_supersessions (workspace_id, trace_id, definition_id, prior_assessment_id, current_assessment_id, reason, created_at)
        VALUES ('late-ws', 'late-trace', 'late-definition', 'assessment-v1', 'assessment-v2', 'late evidence', '2026-08-15T00:00:00.000Z');
    `);
    assert.equal(database.prepare("SELECT COUNT(*) count FROM outcome_assessments").get().count, 2);
    assert.equal(database.prepare("SELECT COUNT(*) count FROM outcome_assessment_supersessions").get().count, 1);
    assert.throws(
      () => database.exec("UPDATE outcome_assessments SET label='unsupported' WHERE id='assessment-v1'"),
      /outcome assessments are immutable/,
    );
    assert.throws(
      () => database.exec("UPDATE outcome_assessment_supersessions SET reason='rewritten' WHERE current_assessment_id='assessment-v2'"),
      /outcome assessment supersessions are immutable/,
    );
  } finally {
    database.close();
  }
});

test("AC-05 keeps every Flight Recorder relation inside one workspace", async () => {
  const migration = await readFile(new URL("drizzle/0004_typical_omega_red.sql", root), "utf8");
  for (const target of [
    "flight_traces",
    "context_snapshots",
    "action_intents",
    "approval_grants",
    "effect_attempts",
    "outcome_assessments",
  ]) {
    assert.match(
      migration,
      new RegExp("REFERENCES `" + target + "`\\(`workspace_id`[^\\n]*`id`"),
    );
  }
  const database = await freshDatabase();
  const hash = "a".repeat(64);
  try {
    database.exec(`
      INSERT INTO users (id, email, display_name) VALUES
        ('tenant-user-a', 'a@example.test', 'A'),
        ('tenant-user-b', 'b@example.test', 'B');
      INSERT INTO workspaces (id, name, slug, owner_user_id) VALUES
        ('tenant-ws-a', 'A', 'tenant-a', 'tenant-user-a'),
        ('tenant-ws-b', 'B', 'tenant-b', 'tenant-user-b');
      INSERT INTO workspace_members (workspace_id, user_id, role) VALUES
        ('tenant-ws-a', 'tenant-user-a', 'owner'),
        ('tenant-ws-b', 'tenant-user-b', 'owner');
      INSERT INTO flight_traces (id, workspace_id, trace_key, fixture_key, truth_mode, current_state, retention_class, retention_until, created_by) VALUES
        ('tenant-trace-a', 'tenant-ws-a', 'tenant-trace-key-a', NULL, 'TEST', 'collecting', 'review_evidence', '2027-08-13T00:00:00.000Z', 'tenant-user-a'),
        ('tenant-trace-b', 'tenant-ws-b', 'tenant-trace-key-b', NULL, 'TEST', 'collecting', 'review_evidence', '2027-08-13T00:00:00.000Z', 'tenant-user-b');
      INSERT INTO flight_evidence (id, workspace_id, trace_id, evidence_key, truth_mode, source_kind, source_version, source_ref, captured_at, payload_json, content_hash, idempotency_key, created_by)
        VALUES ('tenant-evidence-a', 'tenant-ws-a', 'tenant-trace-a', 'tenant-evidence', 'TEST', 'test', 'v1', 'test://tenant-a', '2026-08-13T00:00:00.000Z', '{}', '${hash}', 'tenant-evidence-a-v1', 'tenant-user-a');
    `);
    assert.throws(() => database.exec(`
      INSERT INTO flight_evidence (id, workspace_id, trace_id, evidence_key, truth_mode, source_kind, source_version, source_ref, captured_at, payload_json, content_hash, idempotency_key, created_by)
        VALUES ('foreign-trace', 'tenant-ws-b', 'tenant-trace-a', 'foreign-trace', 'TEST', 'test', 'v1', 'test://foreign', '2026-08-13T00:00:00.000Z', '{}', '${hash}', 'foreign-trace-v1', 'tenant-user-b');
    `), /FOREIGN KEY constraint failed/);
    assert.throws(() => database.exec(`
      INSERT INTO flight_evidence (id, workspace_id, trace_id, evidence_key, truth_mode, source_kind, source_version, source_ref, captured_at, payload_json, content_hash, idempotency_key, created_by)
        VALUES ('foreign-actor', 'tenant-ws-a', 'tenant-trace-a', 'foreign-actor', 'TEST', 'test', 'v1', 'test://foreign', '2026-08-13T00:00:00.000Z', '{}', '${hash}', 'foreign-actor-v1', 'tenant-user-b');
    `), /FOREIGN KEY constraint failed/);
    assert.equal(database.prepare("SELECT COUNT(*) count FROM flight_evidence").get().count, 1);
    assert.deepEqual(database.prepare("PRAGMA foreign_key_check").all(), []);
  } finally {
    database.close();
  }
});

test("AC-06 preserves completed graph work and resumes only incomplete stable identities", async () => {
  const first = await buildPendingFlightRecorderDemo({
    userId: "recovery-user",
    workspaceId: "recovery-workspace",
    now: "2026-08-13T16:00:00.000Z",
  });
  const second = await buildPendingFlightRecorderDemo({
    userId: "recovery-user",
    workspaceId: "recovery-workspace",
    now: "2026-08-13T16:00:00.000Z",
  });
  assert.deepEqual(
    first.reasoningNodes.map(({ node }) => [node.id, node.nodeKey, node.attempt]),
    second.reasoningNodes.map(({ node }) => [node.id, node.nodeKey, node.attempt]),
  );
  const interrupted = first.reasoningNodes.map(({ node }, index) => ({
    id: node.id,
    nodeKey: node.nodeKey,
    attempt: node.attempt,
    currentState: index < 2 ? "succeeded" : index === 2 ? "running" : "pending",
    inputHash: node.inputHash,
    outputHash: index < 2 ? node.outputHash : null,
  }));
  const recovery = planReasoningRecovery(interrupted, first.contextSnapshot.manifestHash);
  assert.deepEqual(recovery.preserved.map((node) => node.id), interrupted.slice(0, 2).map((node) => node.id));
  assert.deepEqual(recovery.resume.map((node) => node.id), interrupted.slice(2).map((node) => node.id));
  assert.deepEqual(recovery.blocked, []);
  assert.throws(
    () => planReasoningRecovery([{ ...interrupted[2], inputHash: "b".repeat(64) }], first.contextSnapshot.manifestHash),
    /recovery input drift/,
  );
});

test("AC-07 rejects injection, undeclared context, duplicate order, and ambiguous retry", async () => {
  const source = {
    position: 1,
    sourceId: "declared",
    sourceKind: "fixture",
    sourceVersion: "v1",
    sourceRef: "fixture://declared",
    contentHash: "a".repeat(64),
    accessDecision: "denied",
    retrieval: {},
  };
  await assert.rejects(createContextManifest([source]), /denied source/);
  assert.match(validateReasoningArtifact({
    content: { instruction: "Bearer abcdefghijklmnopqrstuvwxyz" },
    evidenceCitations: ["foreign"],
    declaredEvidenceIds: ["declared"],
  }).join("; "), /undeclared evidence|secret-like/);
  const guards = await readFile(new URL("drizzle/0005_flight_recorder_guards.sql", root), "utf8");
  assert.match(guards, /effect event sequence is not the exact next value/);
  assert.match(guards, /trace event sequence is not globally gap-free/);
  assert.throws(() => assertTransition("effect", "indeterminate", "dispatching"), /invalid effect transition/);
  const database = await freshDatabase();
  const hash = "a".repeat(64);
  try {
    database.exec(`
      INSERT INTO users (id, email, display_name) VALUES ('order-user', 'order@example.test', 'Order');
      INSERT INTO workspaces (id, name, slug, owner_user_id) VALUES ('order-ws', 'Order', 'order', 'order-user');
      INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ('order-ws', 'order-user', 'owner');
      INSERT INTO flight_traces (id, workspace_id, trace_key, fixture_key, truth_mode, current_state, retention_class, retention_until, created_by)
        VALUES ('order-trace', 'order-ws', 'order-trace-key', NULL, 'TEST', 'collecting', 'review_evidence', '2027-08-13T00:00:00.000Z', 'order-user');
      INSERT INTO flight_evidence (id, workspace_id, trace_id, evidence_key, truth_mode, source_kind, source_version, source_ref, captured_at, payload_json, content_hash, idempotency_key, created_by)
        VALUES ('order-evidence', 'order-ws', 'order-trace', 'order-evidence', 'TEST', 'test', 'v1', 'test://order', '2026-08-13T00:00:00.000Z', '{}', '${hash}', 'order-ingress-v1', 'order-user');
      INSERT INTO flight_trace_events (id, workspace_id, trace_id, sequence, event_type, subject_type, subject_id, prior_state, current_state, actor_type, actor_id, payload_json, payload_hash, idempotency_key, occurred_at)
        VALUES ('order-event-1', 'order-ws', 'order-trace', 1, 'trace.collecting', 'trace', 'order-trace', NULL, 'collecting', 'system', 'release-verifier', '{}', '${hash}', 'order-event-v1', '2026-08-13T00:00:00.000Z');
    `);
    assert.throws(() => database.exec(`
      INSERT INTO flight_evidence (id, workspace_id, trace_id, evidence_key, truth_mode, source_kind, source_version, source_ref, captured_at, payload_json, content_hash, idempotency_key, created_by)
        VALUES ('order-evidence-duplicate', 'order-ws', 'order-trace', 'order-evidence-duplicate', 'TEST', 'test', 'v1', 'test://order-duplicate', '2026-08-13T00:00:00.000Z', '{}', '${hash}', 'order-ingress-v1', 'order-user');
    `), /UNIQUE constraint failed/);
    assert.throws(() => database.exec(`
      INSERT INTO flight_trace_events (id, workspace_id, trace_id, sequence, event_type, subject_type, subject_id, prior_state, current_state, actor_type, actor_id, payload_json, payload_hash, idempotency_key, occurred_at)
        VALUES ('order-event-3', 'order-ws', 'order-trace', 3, 'trace.collecting', 'trace', 'order-trace', NULL, 'collecting', 'system', 'release-verifier', '{}', '${hash}', 'order-event-v3', '2026-08-13T00:00:01.000Z');
    `), /trace event sequence is not globally gap-free|subject state history cannot restart/);
    assert.equal(database.prepare("SELECT COUNT(*) count FROM flight_trace_events").get().count, 1);
  } finally {
    database.close();
  }
});

test("AC-08 keeps truth modes and cold replay instructions unmistakable", async () => {
  const [ui, demo, graph, graphDefinition] = await Promise.all([
    readFile(new URL("app/CrossSignalApp.tsx", root), "utf8"),
    readFile(new URL("db/flight-recorder-demo.ts", root), "utf8"),
    readFile(new URL("db/flight-recorder-graph.ts", root), "utf8"),
    readFile(new URL("db/flight-recorder-graph-definition.ts", root), "utf8"),
  ]);
  assert.match(ui, /TruthBadge mode="FIXTURE"/);
  assert.match(ui, /TruthBadge mode="TEST"/);
  assert.match(ui, /correlated, not proven/i);
  assert.match(demo, /truthMode: "FIXTURE"/);
  assert.match(demo, /providerMode: "TEST"/);
  assert.match(graphDefinition, /crosssignal-fixed-graph-v1/);
  assert.equal((graphDefinition.match(/nodeKey:/g) ?? []).length, 6);
  assert.match(graph, /executionMode: "runtime"/);
  assert.match(graph, /measuredCostUsd: null/);
});
