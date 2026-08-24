import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import {
  buildDemoIntent,
  buildPendingFlightRecorderDemo,
  DEFAULT_ONBOARDING_BODY,
  DEFAULT_ONBOARDING_RECIPIENTS,
  DEFAULT_ONBOARDING_SUBJECT,
  STAGE_03_SPENDING_CAP_USD,
} from "../db/flight-recorder-demo.ts";
import {
  assertExecutionAuthority,
  sealCanonical,
  stableStringify,
  validateExecutionAuthority,
  validateOutcomeAssessment,
  validatePersistedActionIntent,
} from "../db/flight-recorder-contracts.ts";
import {
  DIRECT_DATABASE_ATTACKS as L06_DATABASE_ATTACKS,
} from "../factory/02_data/fixtures/persisted-graph-executor.fixture.mjs";
const AUTHORITY_ERRORS = Object.freeze({
  staleAuthorization: "l08_stale_or_superseded_intent",
  activationRejected: "l08_intent_activation_rejected",
  pointerRejected: "l08_active_intent_pointer_rejected",
  projectionMismatch: "l08_trace_execution_projection_mismatch",
  migrationHistoricalMismatch: "migration_l08_historical_authority_mismatch",
  migrationMissingHead: "migration_l08_required_state_missing_active_intent",
});

const MIGRATION_CASES = Object.freeze([
  { name: "empty", expected: "migrated" },
  { name: "pending-v1", expected: "migrated" },
  { name: "pending-v2", expected: "migrated" },
  { name: "completed-v1", expected: "migrated" },
  { name: "invalid-historical-race", expected: "aborted" },
]);

const L08_DATABASE_ATTACKS = Object.freeze([
  "grant-superseded-v1",
  "reserve-effect-for-superseded-v1",
  "cross-workspace-active-head",
  "cross-trace-active-head",
  "clear-active-head-after-activation",
  "move-active-head-without-an-exact-policy",
  "move-active-head-against-the-immutable-predecessor-edge",
  "authorize-with-kill-switch-engaged",
  "replay-grant-or-intended-effect",
  "commit-after-zero-row-trace-executing-compare-and-swap",
]);

const root = new URL("../", import.meta.url);

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return { url: "cfr-test:cloudflare-workers", shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === "cfr-test:cloudflare-workers") {
      return {
        format: "module",
        source: "export const env = (globalThis.__cfrCloudflareEnv ??= {});",
        shortCircuit: true,
      };
    }
    return nextLoad(url, context);
  },
});

const {
  REASONING_ERRORS,
  REASONING_GRAPH_VERSION,
  REASONING_NODE_REGISTRY,
  claimPersistedReasoningNode,
  finalizePersistedReasoningNode,
  installReasoningRuntimeHooksForTest,
  runPersistedReasoningGraph,
  summarizePersistedReasoningGraph,
} = await import("../db/flight-recorder-graph.ts");
const { getOrCreateFlightRecorderSnapshot } = await import("../db/flight-recorder.ts");

const migrationNames = [
  "0000_dry_chat.sql",
  "0001_gigantic_shriek.sql",
  "0002_funny_madripoor.sql",
  "0003_faithful_guardsmen.sql",
  "0004_typical_omega_red.sql",
  "0005_flight_recorder_guards.sql",
  "0006_l08_active_intent_authority.sql",
];
const runtimeMigrationNames = [
  ...migrationNames,
  "0007_l06_persisted_graph_executor.sql",
];

class TestD1Statement {
  constructor(database, sql, values = []) {
    this.database = database;
    this.sql = sql;
    this.values = values;
  }

  bind(...values) {
    return new TestD1Statement(this.database, this.sql, values);
  }

  async first() {
    return this.database.prepare(this.sql).get(...this.values) ?? null;
  }

  async all() {
    return { success: true, results: this.database.prepare(this.sql).all(...this.values) };
  }

  async run() {
    return this.runSync();
  }

  runSync() {
    const result = this.database.prepare(this.sql).run(...this.values);
    return { success: true, meta: { changes: Number(result.changes ?? 0) } };
  }
}

class TestD1Database {
  constructor(database) {
    this.database = database;
  }

  prepare(sql) {
    return new TestD1Statement(this.database, sql);
  }

  async batch(statements) {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const results = statements.map((statement) => statement.runSync());
      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function applyMigration(database, migration) {
  for (const statement of migration.split("--> statement-breakpoint")) {
    if (statement.trim()) database.exec(statement);
  }
}

function quoteIdentifier(value) {
  assert.match(value, /^[a-z_][a-z0-9_]*$/i);
  return `\`${value}\``;
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "number") return String(value);
  assert.equal(typeof value, "string");
  return `'${value.replaceAll("'", "''")}'`;
}

function insert(database, table, record) {
  const columns = Object.keys(record);
  database.exec(`INSERT INTO ${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(",")})
    VALUES (${columns.map((column) => sqlLiteral(record[column])).join(",")})`);
}

function snake(record, mapping) {
  return Object.fromEntries(
    Object.entries(mapping).map(([column, property]) => [column, record[property]]),
  );
}

async function freshDatabase(names = migrationNames) {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  for (const name of names) {
    applyMigration(database, await readFile(new URL(`drizzle/${name}`, root), "utf8"));
  }
  return database;
}

function applyMigrationAtomically(database, migration) {
  database.exec("BEGIN IMMEDIATE");
  try {
    applyMigration(database, migration);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

async function materializePending(database, options = {}) {
  const now = options.now ?? "2026-08-13T16:00:00.000Z";
  const userId = options.userId ?? "stage03-owner";
  const workspaceId = options.workspaceId ?? "stage03-workspace";
  const demo = await buildPendingFlightRecorderDemo({ userId, workspaceId, now });
  insert(database, "users", { id: userId, email: `${userId}@example.test`, display_name: "Stage 03 Owner" });
  insert(database, "workspaces", { id: workspaceId, name: "Stage 03", slug: workspaceId, owner_user_id: userId });
  insert(database, "workspace_members", { workspace_id: workspaceId, user_id: userId, role: "owner" });
  insert(database, "workspace_authority_controls", { workspace_id: workspaceId, kill_switch_engaged: 0, updated_by: userId, updated_at: demo.now });
  insert(database, "flight_traces", {
    id: demo.trace.id,
    workspace_id: workspaceId,
    trace_key: demo.trace.traceKey,
    fixture_key: demo.trace.fixtureKey,
    truth_mode: demo.trace.truthMode,
    current_state: "collecting",
    retention_class: demo.trace.retentionClass,
    retention_until: demo.trace.retentionUntil,
    created_by: userId,
  });
  for (const evidence of demo.evidence) {
    insert(database, "flight_evidence", snake(evidence, {
      id: "id", workspace_id: "workspaceId", trace_id: "traceId",
      evidence_key: "evidenceKey", truth_mode: "truthMode",
      source_kind: "sourceKind", source_version: "sourceVersion",
      source_ref: "sourceRef", captured_at: "capturedAt",
      payload_json: "payloadJson", content_hash: "contentHash",
      idempotency_key: "idempotencyKey", created_by: "createdBy",
    }));
  }
  insert(database, "context_snapshots", {
    id: demo.contextSnapshot.id,
    workspace_id: workspaceId,
    trace_id: demo.trace.id,
    snapshot_key: demo.contextSnapshot.snapshotKey,
    truth_mode: "FIXTURE",
    current_state: "collecting",
    source_count: demo.contextSnapshot.sourceCount,
    ordered_manifest_json: demo.contextSnapshot.orderedManifestJson,
    manifest_hash: demo.contextSnapshot.manifestHash,
    created_by: userId,
    frozen_at: null,
  });
  for (const evidence of demo.evidence) {
    insert(database, "context_snapshot_sources", {
      workspace_id: workspaceId,
      snapshot_id: demo.contextSnapshot.id,
      position: evidence.contextSource.position,
      source_id: evidence.contextSource.sourceId,
      source_kind: evidence.contextSource.sourceKind,
      source_version: evidence.contextSource.sourceVersion,
      source_ref: evidence.contextSource.sourceRef,
      content_hash: evidence.contextSource.contentHash,
      access_decision: evidence.contextSource.accessDecision,
      retrieval_json: stableStringify(evidence.contextSource.retrieval),
    });
  }
  database.prepare("UPDATE context_snapshots SET current_state='frozen', frozen_at=? WHERE id=?")
    .run(demo.contextSnapshot.frozenAt, demo.contextSnapshot.id);
  database.prepare("UPDATE flight_traces SET current_state='context_frozen' WHERE id=?").run(demo.trace.id);
  for (const { node, artifact } of demo.reasoningNodes) {
    insert(database, "reasoning_nodes", {
      id: node.id, workspace_id: workspaceId, trace_id: demo.trace.id,
      node_key: node.nodeKey, attempt: 1, current_state: "pending",
      input_hash: node.inputHash, output_hash: null, error_code: null,
      started_at: null, completed_at: null,
    });
    database.prepare("UPDATE reasoning_nodes SET current_state='running', started_at=? WHERE id=?").run(node.startedAt, node.id);
    database.prepare("UPDATE reasoning_nodes SET current_state='succeeded', output_hash=?, completed_at=? WHERE id=?").run(node.outputHash, node.completedAt, node.id);
    insert(database, "reasoning_artifacts", snake(artifact, {
      id: "id", workspace_id: "workspaceId", trace_id: "traceId",
      node_id: "nodeId", artifact_kind: "artifactKind",
      schema_version: "schemaVersion", content_json: "contentJson",
      content_hash: "contentHash", evidence_citations_json: "evidenceCitationsJson",
    }));
  }
  database.prepare("UPDATE flight_traces SET current_state='reasoning' WHERE id=?").run(demo.trace.id);
  insert(database, "outcome_definitions", snake(demo.outcomeDefinition, {
    id: "id", workspace_id: "workspaceId", trace_id: "traceId",
    definition_key: "definitionKey", metric_name: "metricName",
    cohort_json: "cohortJson", cohort_hash: "cohortHash",
    baseline_json: "baselineJson", baseline_hash: "baselineHash",
    window_starts_at: "windowStartsAt", window_ends_at: "windowEndsAt",
    assessment_rule_json: "assessmentRuleJson", assessment_rule_hash: "assessmentRuleHash",
    registered_by: "registeredBy", registered_at: "registeredAt",
  }));
  const intent = demo.intentBundle.intent;
  insert(database, "action_intents", {
    id: intent.id, workspace_id: workspaceId, trace_id: demo.trace.id,
    context_snapshot_id: intent.contextSnapshotId, source_artifact_id: intent.sourceArtifactId,
    intent_key: intent.intentKey, action_kind: intent.actionKind, truth_mode: intent.truthMode,
    recipients_json: stableStringify(intent.recipients), recipient_set_hash: intent.recipientSetHash,
    subject: intent.subject, body: intent.body, cohort_cap: intent.cohortCap,
    evidence_ids_json: stableStringify(intent.evidenceIds), metric_definition_id: intent.metricDefinitionId,
    context_manifest_hash: intent.contextManifestHash, policy_version: intent.policyVersion,
    policy_hash: intent.policyHash, nonce: intent.nonce, expires_at: intent.expiresAt,
    canonical_payload_json: intent.canonicalPayloadJson, canonical_payload_hash: intent.canonicalPayloadHash,
    created_by: userId, created_at: intent.createdAt,
  });
  insert(database, "policy_decisions", snake(demo.intentBundle.policyDecision, {
    id: "id", workspace_id: "workspaceId", trace_id: "traceId",
    intent_id: "intentId", policy_version: "policyVersion", policy_hash: "policyHash",
    verdict: "verdict", reason_codes_json: "reasonCodesJson",
    evaluated_payload_hash: "evaluatedPayloadHash", evaluated_context_hash: "evaluatedContextHash",
    evaluator_version: "evaluatorVersion", decided_at: "decidedAt",
  }));
  database.prepare("UPDATE flight_traces SET current_state='awaiting_approval' WHERE id=?").run(demo.trace.id);
  return demo;
}

async function insertLegacyReplacement(database, demo, options = {}) {
  const prior = demo.intentBundle.intent;
  const next = await buildDemoIntent({
    userId: demo.trace.createdBy,
    workspaceId: demo.trace.workspaceId,
    traceId: demo.trace.id,
    contextSnapshotId: demo.contextSnapshot.id,
    sourceArtifactId: prior.sourceArtifactId,
    outcomeDefinitionId: demo.outcomeDefinition.id,
    contextManifestHash: demo.contextSnapshot.manifestHash,
    intentVersion: 2,
    recipients: DEFAULT_ONBOARDING_RECIPIENTS.slice(0, 2),
    subject: `${DEFAULT_ONBOARDING_SUBJECT} — legacy v2`,
    body: DEFAULT_ONBOARDING_BODY,
    now: "2026-08-13T16:01:00.000Z",
  });
  insert(database, "action_intents", {
    id: next.intent.id, workspace_id: next.intent.workspaceId, trace_id: next.intent.traceId,
    context_snapshot_id: next.intent.contextSnapshotId, source_artifact_id: next.intent.sourceArtifactId,
    intent_key: next.intent.intentKey, action_kind: next.intent.actionKind, truth_mode: next.intent.truthMode,
    recipients_json: stableStringify(next.intent.recipients), recipient_set_hash: next.intent.recipientSetHash,
    subject: next.intent.subject, body: next.intent.body, cohort_cap: next.intent.cohortCap,
    evidence_ids_json: stableStringify(next.intent.evidenceIds), metric_definition_id: next.intent.metricDefinitionId,
    context_manifest_hash: next.intent.contextManifestHash, policy_version: next.intent.policyVersion,
    policy_hash: next.intent.policyHash, nonce: next.intent.nonce, expires_at: next.intent.expiresAt,
    canonical_payload_json: next.intent.canonicalPayloadJson, canonical_payload_hash: next.intent.canonicalPayloadHash,
    created_by: next.intent.createdBy, created_at: next.intent.createdAt,
    ...(options.includeSupersedes ? { supersedes_intent_id: prior.id } : {}),
  });
  if (options.includePolicy !== false) {
    insert(database, "policy_decisions", snake(next.policyDecision, {
      id: "id", workspace_id: "workspaceId", trace_id: "traceId",
      intent_id: "intentId", policy_version: "policyVersion", policy_hash: "policyHash",
      verdict: "verdict", reason_codes_json: "reasonCodesJson",
      evaluated_payload_hash: "evaluatedPayloadHash", evaluated_context_hash: "evaluatedContextHash",
      evaluator_version: "evaluatorVersion", decided_at: "decidedAt",
    }));
  }
  return next;
}

function insertApprovalGrant(database, demo, id = `${demo.intentBundle.intent.id}-grant`) {
  const intent = demo.intentBundle.intent;
  const policy = demo.intentBundle.policyDecision;
  insert(database, "approval_grants", {
    id, workspace_id: intent.workspaceId, trace_id: intent.traceId,
    intent_id: intent.id, policy_decision_id: policy.id, decision: "approved",
    bound_payload_hash: intent.canonicalPayloadHash, bound_context_hash: intent.contextManifestHash,
    bound_policy_hash: intent.policyHash, bound_recipient_set_hash: intent.recipientSetHash,
    nonce: intent.nonce, expires_at: intent.expiresAt, approved_by: intent.createdBy,
    approved_at: "2026-08-13T16:01:01.000Z",
  });
  return id;
}

function insertLegacyAuthority(database, demo) {
  const intent = demo.intentBundle.intent;
  const grantId = insertApprovalGrant(database, demo);
  insert(database, "effect_attempts", {
    id: `${intent.id}-effect`, workspace_id: intent.workspaceId, trace_id: intent.traceId,
    intent_id: intent.id, approval_grant_id: grantId,
    intended_effect_key: `email-test:${intent.canonicalPayloadHash}`,
    adapter_kind: "email_test", provider_mode: "FIXTURE", initial_state: "reserved",
    request_hash: intent.canonicalPayloadHash, reserved_by: intent.createdBy,
    reserved_at: "2026-08-13T16:01:02.000Z",
  });
}

function assessLegacyTrace(database, traceId) {
  database.prepare("UPDATE flight_traces SET current_state='executing' WHERE id=?").run(traceId);
  database.prepare("UPDATE flight_traces SET current_state='observing' WHERE id=?").run(traceId);
  database.prepare("UPDATE flight_traces SET current_state='assessed' WHERE id=?").run(traceId);
}

test("migration 0006 handles the canonical L08 matrix atomically", async (t) => {
  const migration = await readFile(new URL("drizzle/0006_l08_active_intent_authority.sql", root), "utf8");
  for (const migrationCase of MIGRATION_CASES) {
    await t.test(migrationCase.name, async () => {
      const database = await freshDatabase(migrationNames.slice(0, -1));
      let demo = null;
      let replacement = null;
      if (migrationCase.name !== "empty") {
        demo = await materializePending(database, {
          userId: `migration-${migrationCase.name}-owner`,
          workspaceId: `migration-${migrationCase.name}-workspace`,
        });
      }
      if (migrationCase.name === "pending-v2" || migrationCase.name === "invalid-historical-race") {
        replacement = await insertLegacyReplacement(database, demo);
      }
      if (migrationCase.name === "completed-v1" || migrationCase.name === "invalid-historical-race") {
        insertLegacyAuthority(database, demo);
        assessLegacyTrace(database, demo.trace.id);
      }

      if (migrationCase.expected === "aborted") {
        assert.throws(
          () => applyMigrationAtomically(database, migration),
          new RegExp(AUTHORITY_ERRORS.migrationHistoricalMismatch),
        );
        assert.equal(
          database.prepare("SELECT COUNT(*) count FROM pragma_table_info('flight_traces') WHERE name='active_intent_id'").get().count,
          0,
        );
        assert.equal(
          database.prepare("SELECT COUNT(*) count FROM sqlite_schema WHERE type='trigger' AND name='trg_action_intents_immutable'").get().count,
          1,
        );
      } else {
        assert.doesNotThrow(() => applyMigrationAtomically(database, migration));
        if (!demo) {
          assert.equal(database.prepare("SELECT COUNT(*) count FROM flight_traces").get().count, 0);
        } else {
          const head = database.prepare("SELECT active_intent_id FROM flight_traces WHERE id=?").get(demo.trace.id);
          const expectedIntentId = replacement?.intent.id ?? demo.intentBundle.intent.id;
          assert.equal(head.active_intent_id, expectedIntentId);
          if (replacement) {
            assert.equal(
              database.prepare("SELECT supersedes_intent_id FROM action_intents WHERE id=?").get(replacement.intent.id).supersedes_intent_id,
              demo.intentBundle.intent.id,
            );
          }
        }
      }
      database.close();
    });
  }
});

test("builds a control-first pending action with no grant or effect", async () => {
  const database = await freshDatabase();
  const demo = await materializePending(database);
  assert.equal(database.prepare("SELECT current_state FROM flight_traces").get().current_state, "awaiting_approval");
  assert.equal(database.prepare("SELECT COUNT(*) count FROM approval_grants").get().count, 0);
  assert.equal(database.prepare("SELECT COUNT(*) count FROM effect_attempts").get().count, 0);
  assert.equal(JSON.parse(database.prepare("SELECT recipients_json FROM action_intents").get().recipients_json).length, 3);
  assert.equal(demo.intentBundle.spendingCapUsd, STAGE_03_SPENDING_CAP_USD);
  assert.equal(database.prepare("SELECT COUNT(*) count FROM reasoning_nodes WHERE current_state='succeeded'").get().count, 6);
  database.close();
});

test("editing creates a new immutable intent and does not grant authority", async () => {
  const database = await freshDatabase();
  const demo = await materializePending(database);
  const next = await buildDemoIntent({
    userId: demo.trace.createdBy,
    workspaceId: demo.trace.workspaceId,
    traceId: demo.trace.id,
    contextSnapshotId: demo.contextSnapshot.id,
    sourceArtifactId: demo.intentBundle.intent.sourceArtifactId,
    outcomeDefinitionId: demo.outcomeDefinition.id,
    contextManifestHash: demo.contextSnapshot.manifestHash,
    intentVersion: 2,
    recipients: DEFAULT_ONBOARDING_RECIPIENTS.slice(0, 2),
    subject: `${DEFAULT_ONBOARDING_SUBJECT} — revised`,
    body: DEFAULT_ONBOARDING_BODY,
    now: "2026-08-13T16:01:00.000Z",
  });
  assert.notEqual(next.intent.canonicalPayloadHash, demo.intentBundle.intent.canonicalPayloadHash);
  assert.notEqual(next.intent.recipientSetHash, demo.intentBundle.intent.recipientSetHash);
  assert.equal(next.intent.cohortCap, 2);
  assert.equal(database.prepare("SELECT COUNT(*) count FROM approval_grants").get().count, 0);
  database.close();
});

test("a superseded intent cannot acquire a grant after replacement wins", async () => {
  const database = await freshDatabase();
  const demo = await materializePending(database);
  const prior = demo.intentBundle.intent;
  const next = await buildDemoIntent({
    userId: demo.trace.createdBy,
    workspaceId: demo.trace.workspaceId,
    traceId: demo.trace.id,
    contextSnapshotId: demo.contextSnapshot.id,
    sourceArtifactId: prior.sourceArtifactId,
    outcomeDefinitionId: demo.outcomeDefinition.id,
    contextManifestHash: demo.contextSnapshot.manifestHash,
    intentVersion: 2,
    recipients: DEFAULT_ONBOARDING_RECIPIENTS.slice(0, 2),
    subject: `${DEFAULT_ONBOARDING_SUBJECT} — replacement wins`,
    body: DEFAULT_ONBOARDING_BODY,
    now: "2026-08-13T16:01:00.000Z",
  });
  insert(database, "action_intents", {
    id: next.intent.id, workspace_id: next.intent.workspaceId, trace_id: next.intent.traceId,
    context_snapshot_id: next.intent.contextSnapshotId, source_artifact_id: next.intent.sourceArtifactId,
    supersedes_intent_id: prior.id,
    intent_key: next.intent.intentKey, action_kind: next.intent.actionKind, truth_mode: next.intent.truthMode,
    recipients_json: stableStringify(next.intent.recipients), recipient_set_hash: next.intent.recipientSetHash,
    subject: next.intent.subject, body: next.intent.body, cohort_cap: next.intent.cohortCap,
    evidence_ids_json: stableStringify(next.intent.evidenceIds), metric_definition_id: next.intent.metricDefinitionId,
    context_manifest_hash: next.intent.contextManifestHash, policy_version: next.intent.policyVersion,
    policy_hash: next.intent.policyHash, nonce: next.intent.nonce, expires_at: next.intent.expiresAt,
    canonical_payload_json: next.intent.canonicalPayloadJson, canonical_payload_hash: next.intent.canonicalPayloadHash,
    created_by: next.intent.createdBy, created_at: next.intent.createdAt,
  });
  insert(database, "policy_decisions", snake(next.policyDecision, {
    id: "id", workspace_id: "workspaceId", trace_id: "traceId",
    intent_id: "intentId", policy_version: "policyVersion", policy_hash: "policyHash",
    verdict: "verdict", reason_codes_json: "reasonCodesJson",
    evaluated_payload_hash: "evaluatedPayloadHash", evaluated_context_hash: "evaluatedContextHash",
    evaluator_version: "evaluatorVersion", decided_at: "decidedAt",
  }));
  assert.throws(() => insert(database, "approval_grants", {
    id: "stale-v1-grant", workspace_id: prior.workspaceId, trace_id: prior.traceId,
    intent_id: prior.id, policy_decision_id: demo.intentBundle.policyDecision.id,
    decision: "approved", bound_payload_hash: prior.canonicalPayloadHash,
    bound_context_hash: prior.contextManifestHash, bound_policy_hash: prior.policyHash,
    bound_recipient_set_hash: prior.recipientSetHash, nonce: prior.nonce,
    expires_at: prior.expiresAt, approved_by: prior.createdBy,
    approved_at: "2026-08-13T16:01:01.000Z",
  }), /l08_stale_or_superseded_intent/);
  database.close();
});

test("production operations fail closed in both deterministic L08 schedules", async () => {
  const database = await freshDatabase(runtimeMigrationNames);
  const userId = "l08-runtime-owner";
  const workspaceId = "l08-runtime-workspace";
  insert(database, "users", { id: userId, email: "l08-runtime@example.test", display_name: "L08 Runtime Owner" });
  insert(database, "workspaces", { id: workspaceId, name: "L08 Runtime", slug: workspaceId, owner_user_id: userId });
  insert(database, "workspace_members", { workspace_id: workspaceId, user_id: userId, role: "owner" });
  globalThis.__cfrCloudflareEnv ??= {};
  globalThis.__cfrCloudflareEnv.DB = new TestD1Database(database);
  const runtime = await import("../db/flight-recorder.ts");
  await runtime.getOrCreateFlightRecorderSnapshot(userId, workspaceId);

  const authorizationLoaded = deferred();
  const resumeAuthorization = deferred();
  const removeAuthorizationBarrier = runtime.installAuthorizationRaceBarrierForTest(async () => {
    authorizationLoaded.resolve();
    await resumeAuthorization.promise;
  });
  const staleAuthorization = runtime.authorizeAndExecute({ userId, workspaceId, scenario: "confirmed" });
  await authorizationLoaded.promise;
  const edited = await runtime.replacePendingIntent({
    userId,
    workspaceId,
    recipients: DEFAULT_ONBOARDING_RECIPIENTS.slice(0, 2),
    subject: `${DEFAULT_ONBOARDING_SUBJECT} — deterministic edit wins`,
    body: DEFAULT_ONBOARDING_BODY,
  });
  assert.equal(edited.intent.version, 2);
  assert.equal(edited.traceState, "awaiting_approval");
  resumeAuthorization.resolve();
  await assert.rejects(staleAuthorization, /l08_stale_or_superseded_intent/);
  removeAuthorizationBarrier();
  assert.equal(database.prepare("SELECT COUNT(*) count FROM approval_grants").get().count, 0);
  assert.equal(database.prepare("SELECT COUNT(*) count FROM effect_attempts").get().count, 0);
  assert.equal(database.prepare("SELECT COUNT(*) count FROM outcome_observations").get().count, 0);
  assert.equal(database.prepare("SELECT COUNT(*) count FROM outcome_assessments").get().count, 0);
  assert.equal(database.prepare("SELECT COUNT(*) count FROM flight_trace_events WHERE current_state IN ('executing','observing','assessed','failed')").get().count, 0);
  const exactV2 = await runtime.authorizeAndExecute({ userId, workspaceId, scenario: "confirmed" });
  assert.equal(exactV2.intent.version, 2);
  assert.equal(database.prepare("SELECT COUNT(*) count FROM effect_attempts").get().count, 1);

  await runtime.resetFlightRecorderFixture(userId, workspaceId);
  const replacementLoaded = deferred();
  const resumeReplacement = deferred();
  const removeReplacementBarrier = runtime.installReplacementRaceBarrierForTest(async () => {
    replacementLoaded.resolve();
    await resumeReplacement.promise;
  });
  const losingReplacement = runtime.replacePendingIntent({
    userId,
    workspaceId,
    recipients: DEFAULT_ONBOARDING_RECIPIENTS.slice(0, 2),
    subject: `${DEFAULT_ONBOARDING_SUBJECT} — deterministic authorization wins`,
    body: DEFAULT_ONBOARDING_BODY,
  });
  await replacementLoaded.promise;
  const exactV1 = await runtime.authorizeAndExecute({ userId, workspaceId, scenario: "confirmed" });
  assert.equal(exactV1.intent.version, 1);
  resumeReplacement.resolve();
  await assert.rejects(losingReplacement, /l08_intent_activation_rejected/);
  removeReplacementBarrier();
  assert.equal(database.prepare("SELECT COUNT(*) count FROM action_intents WHERE intent_key LIKE '%-v2'").get().count, 0);
  assert.equal(database.prepare("SELECT COUNT(*) count FROM policy_decisions WHERE intent_id NOT IN (SELECT active_intent_id FROM flight_traces)").get().count, 0);
  assert.equal(database.prepare("SELECT COUNT(*) count FROM effect_attempts").get().count, 1);

  await runtime.resetFlightRecorderFixture(userId, workspaceId);
  const failedV1 = await runtime.authorizeAndExecute({ userId, workspaceId, scenario: "failed" });
  assert.equal(failedV1.intent.version, 1);
  assert.equal(failedV1.execution.state, "failed");
  assert.equal(database.prepare("SELECT COUNT(*) count FROM effect_attempts").get().count, 1);

  await runtime.resetFlightRecorderFixture(userId, workspaceId);
  await runtime.replacePendingIntent({
    userId,
    workspaceId,
    recipients: DEFAULT_ONBOARDING_RECIPIENTS.slice(0, 2),
    subject: `${DEFAULT_ONBOARDING_SUBJECT} — indeterminate v2`,
    body: DEFAULT_ONBOARDING_BODY,
  });
  const indeterminateV2 = await runtime.authorizeAndExecute({ userId, workspaceId, scenario: "indeterminate" });
  assert.equal(indeterminateV2.intent.version, 2);
  assert.equal(indeterminateV2.execution.state, "indeterminate");
  assert.equal(database.prepare("SELECT COUNT(*) count FROM effect_attempts").get().count, 1);
  database.close();
});

test("direct database guards reject the ten accepted L08 attacks", async () => {
  const observed = [];
  const pending = async (name) => {
    const database = await freshDatabase();
    const demo = await materializePending(database, {
      userId: `attack-${name}-owner`,
      workspaceId: `attack-${name}-workspace`,
    });
    return { database, demo };
  };

  {
    const { database, demo } = await pending("stale-grant");
    await insertLegacyReplacement(database, demo, { includeSupersedes: true });
    assert.throws(() => insertApprovalGrant(database, demo), /l08_stale_or_superseded_intent/);
    observed.push("grant-superseded-v1");
    database.close();
  }
  {
    const { database, demo } = await pending("stale-effect");
    const grantId = insertApprovalGrant(database, demo);
    const intent = demo.intentBundle.intent;
    assert.throws(() => insert(database, "effect_attempts", {
      id: "stale-effect", workspace_id: intent.workspaceId, trace_id: intent.traceId,
      intent_id: "superseded-intent", approval_grant_id: grantId,
      intended_effect_key: "email-test:stale", adapter_kind: "email_test",
      provider_mode: "FIXTURE", initial_state: "reserved", request_hash: intent.canonicalPayloadHash,
      reserved_by: intent.createdBy, reserved_at: "2026-08-13T16:01:02.000Z",
    }), /l08_stale_or_superseded_intent/);
    observed.push("reserve-effect-for-superseded-v1");
    database.close();
  }
  {
    const database = await freshDatabase();
    const first = await materializePending(database, { userId: "attack-cross-a", workspaceId: "attack-cross-workspace-a" });
    const second = await materializePending(database, { userId: "attack-cross-b", workspaceId: "attack-cross-workspace-b" });
    assert.throws(
      () => database.prepare("UPDATE flight_traces SET active_intent_id=? WHERE id=?").run(second.intentBundle.intent.id, first.trace.id),
      /l08_active_intent_pointer_rejected/,
    );
    observed.push("cross-workspace-active-head");
    assert.throws(
      () => database.prepare("UPDATE flight_traces SET active_intent_id=? WHERE id=?").run(first.intentBundle.intent.id, second.trace.id),
      /l08_active_intent_pointer_rejected/,
    );
    observed.push("cross-trace-active-head");
    database.close();
  }
  {
    const { database, demo } = await pending("clear-head");
    assert.throws(
      () => database.prepare("UPDATE flight_traces SET active_intent_id=NULL WHERE id=?").run(demo.trace.id),
      /l08_active_intent_pointer_rejected/,
    );
    observed.push("clear-active-head-after-activation");
    database.close();
  }
  {
    const { database, demo } = await pending("missing-policy");
    const replacement = await insertLegacyReplacement(database, demo, { includeSupersedes: true, includePolicy: false });
    assert.throws(
      () => database.prepare("UPDATE flight_traces SET active_intent_id=? WHERE id=?").run(replacement.intent.id, demo.trace.id),
      /l08_active_intent_pointer_rejected/,
    );
    observed.push("move-active-head-without-an-exact-policy");
    database.close();
  }
  {
    const { database, demo } = await pending("backward-head");
    await insertLegacyReplacement(database, demo, { includeSupersedes: true });
    assert.throws(
      () => database.prepare("UPDATE flight_traces SET active_intent_id=? WHERE id=?").run(demo.intentBundle.intent.id, demo.trace.id),
      /l08_active_intent_pointer_rejected/,
    );
    observed.push("move-active-head-against-the-immutable-predecessor-edge");
    database.close();
  }
  {
    const { database, demo } = await pending("kill-switch");
    const intent = demo.intentBundle.intent;
    const grantId = insertApprovalGrant(database, demo);
    database.prepare("UPDATE workspace_authority_controls SET kill_switch_engaged=1 WHERE workspace_id=?").run(intent.workspaceId);
    assert.throws(() => insert(database, "effect_attempts", {
      id: "kill-effect", workspace_id: intent.workspaceId, trace_id: intent.traceId,
      intent_id: intent.id, approval_grant_id: grantId, intended_effect_key: "email-test:kill",
      adapter_kind: "email_test", provider_mode: "FIXTURE", initial_state: "reserved",
      request_hash: intent.canonicalPayloadHash, reserved_by: intent.createdBy,
      reserved_at: "2026-08-13T16:01:02.000Z",
    }), /kill switch/);
    observed.push("authorize-with-kill-switch-engaged");
    database.close();
  }
  {
    const { database, demo } = await pending("replay");
    insertApprovalGrant(database, demo, "replay-grant-one");
    assert.throws(() => insertApprovalGrant(database, demo, "replay-grant-two"), /UNIQUE|replay/);
    observed.push("replay-grant-or-intended-effect");
    database.close();
  }
  {
    const { database, demo } = await pending("zero-cas");
    const intent = demo.intentBundle.intent;
    const payload = await sealCanonical({ intentId: intent.id, attack: "zero-row-cas" });
    const sequence = Number(database.prepare("SELECT MAX(sequence) sequence FROM flight_trace_events WHERE trace_id=?").get(demo.trace.id).sequence) + 1;
    database.exec("BEGIN IMMEDIATE");
    database.prepare("UPDATE flight_traces SET current_state='executing' WHERE id=? AND active_intent_id='not-the-head'").run(demo.trace.id);
    assert.throws(() => insert(database, "flight_trace_events", {
      id: "zero-cas-event", workspace_id: intent.workspaceId, trace_id: intent.traceId,
      sequence, event_type: "trace.executing", subject_type: "trace", subject_id: intent.traceId,
      prior_state: "awaiting_approval", current_state: "executing", actor_type: "human",
      actor_id: intent.createdBy, payload_json: payload.canonicalJson, payload_hash: payload.sha256,
      idempotency_key: "zero-cas-event", occurred_at: "2026-08-13T16:01:03.000Z",
    }), /l08_trace_execution_projection_mismatch/);
    database.exec("ROLLBACK");
    observed.push("commit-after-zero-row-trace-executing-compare-and-swap");
    database.close();
  }

  assert.deepEqual(observed, L08_DATABASE_ATTACKS);
});

test("kill switch denies effect authority before reservation", async () => {
  const database = await freshDatabase();
  const demo = await materializePending(database);
  database.exec("UPDATE workspace_authority_controls SET kill_switch_engaged=1");
  const intent = demo.intentBundle.intent;
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
    approvedBy: intent.createdBy,
  };
  const errors = validateExecutionAuthority({
    intent: { id: intent.id, ...intent },
    policy: demo.intentBundle.policyDecision,
    grant,
    request: {
      workspaceId: intent.workspaceId, traceId: intent.traceId, intentId: intent.id,
      actorUserId: intent.createdBy, actorWorkspaceId: intent.workspaceId,
      killSwitchEngaged: true, canonicalPayloadHash: intent.canonicalPayloadHash,
      contextManifestHash: intent.contextManifestHash, policyHash: intent.policyHash,
      recipientSetHash: intent.recipientSetHash, nonce: intent.nonce,
      now: "2026-08-13T16:01:00.000Z", priorAttemptCount: 0,
    },
  });
  assert.ok(errors.includes("kill switch is engaged or unavailable"));
  assert.throws(() => database.exec(`INSERT INTO effect_attempts (
    id, workspace_id, trace_id, intent_id, approval_grant_id, intended_effect_key,
    adapter_kind, provider_mode, initial_state, request_hash, reserved_by, reserved_at
  ) VALUES ('nope','stage03-workspace','${demo.trace.id}','${intent.id}','missing','blocked',
    'email_test','FIXTURE','reserved','${intent.canonicalPayloadHash}','stage03-owner','2026-08-13T16:01:01.000Z')`), /kill switch|FOREIGN KEY/);
  database.close();
});

test("exact approval permits one reservation and a confirmed effect", async () => {
  const database = await freshDatabase();
  const demo = await materializePending(database);
  const intent = demo.intentBundle.intent;
  const approvedAt = "2026-08-13T16:01:00.000Z";
  const grant = {
    id: "stage03-grant", workspaceId: intent.workspaceId, traceId: intent.traceId,
    intentId: intent.id, policyDecisionId: demo.intentBundle.policyDecision.id,
    decision: "approved", boundPayloadHash: intent.canonicalPayloadHash,
    boundContextHash: intent.contextManifestHash, boundPolicyHash: intent.policyHash,
    boundRecipientSetHash: intent.recipientSetHash, nonce: intent.nonce,
    expiresAt: intent.expiresAt, approvedBy: intent.createdBy, approvedAt,
  };
  assert.deepEqual(await validatePersistedActionIntent(intent), []);
  assert.doesNotThrow(() => assertExecutionAuthority({
    intent: { id: intent.id, ...intent },
    policy: demo.intentBundle.policyDecision,
    grant,
    request: {
      workspaceId: intent.workspaceId, traceId: intent.traceId, intentId: intent.id,
      actorUserId: intent.createdBy, actorWorkspaceId: intent.workspaceId,
      killSwitchEngaged: false, canonicalPayloadHash: intent.canonicalPayloadHash,
      contextManifestHash: intent.contextManifestHash, policyHash: intent.policyHash,
      recipientSetHash: intent.recipientSetHash, nonce: intent.nonce,
      now: approvedAt, priorAttemptCount: 0,
    },
  }));
  insert(database, "approval_grants", snake(grant, {
    id: "id", workspace_id: "workspaceId", trace_id: "traceId", intent_id: "intentId",
    policy_decision_id: "policyDecisionId", decision: "decision",
    bound_payload_hash: "boundPayloadHash", bound_context_hash: "boundContextHash",
    bound_policy_hash: "boundPolicyHash", bound_recipient_set_hash: "boundRecipientSetHash",
    nonce: "nonce", expires_at: "expiresAt", approved_by: "approvedBy", approved_at: "approvedAt",
  }));
  insert(database, "effect_attempts", {
    id: "stage03-effect", workspace_id: intent.workspaceId, trace_id: intent.traceId,
    intent_id: intent.id, approval_grant_id: grant.id,
    intended_effect_key: `email-test:${intent.canonicalPayloadHash}`,
    adapter_kind: "email_test", provider_mode: "FIXTURE", initial_state: "reserved",
    request_hash: intent.canonicalPayloadHash, reserved_by: intent.createdBy,
    reserved_at: "2026-08-13T16:01:01.000Z",
  });
  insert(database, "effect_attempt_events", { id: "e1", workspace_id: intent.workspaceId, trace_id: intent.traceId, effect_attempt_id: "stage03-effect", sequence: 1, prior_state: null, current_state: "reserved", provider_receipt_id: null, provider_response_hash: null, error_code: null, payload_json: "{}", idempotency_key: "stage03-effect:1", occurred_at: "2026-08-13T16:01:01.000Z" });
  insert(database, "effect_attempt_events", { id: "e2", workspace_id: intent.workspaceId, trace_id: intent.traceId, effect_attempt_id: "stage03-effect", sequence: 2, prior_state: "reserved", current_state: "dispatching", provider_receipt_id: null, provider_response_hash: null, error_code: null, payload_json: "{}", idempotency_key: "stage03-effect:2", occurred_at: "2026-08-13T16:01:02.000Z" });
  const receipt = await sealCanonical({ accepted: 3, mode: "FIXTURE" });
  insert(database, "effect_attempt_events", { id: "e3", workspace_id: intent.workspaceId, trace_id: intent.traceId, effect_attempt_id: "stage03-effect", sequence: 3, prior_state: "dispatching", current_state: "confirmed", provider_receipt_id: "fixture-receipt", provider_response_hash: receipt.sha256, error_code: null, payload_json: receipt.canonicalJson, idempotency_key: "stage03-effect:3", occurred_at: "2026-08-13T16:01:03.000Z" });
  assert.equal(database.prepare("SELECT COUNT(*) count FROM effect_attempts").get().count, 1);
  assert.throws(() => insert(database, "effect_attempts", {
    id: "duplicate", workspace_id: intent.workspaceId, trace_id: intent.traceId,
    intent_id: intent.id, approval_grant_id: grant.id, intended_effect_key: "duplicate",
    adapter_kind: "email_test", provider_mode: "FIXTURE", initial_state: "reserved",
    request_hash: intent.canonicalPayloadHash, reserved_by: intent.createdBy,
    reserved_at: "2026-08-13T16:01:04.000Z",
  }), /replay|UNIQUE/);
  database.close();
});

test("failed and indeterminate result states are terminal without retry", async () => {
  const source = await readFile(new URL("db/flight-recorder.ts", root), "utf8");
  const ui = await readFile(new URL("app/CrossSignalApp.tsx", root), "utf8");
  assert.match(source, /fixture_provider_rejected/);
  assert.match(source, /fixture_provider_timeout_after_dispatch/);
  assert.match(source, /retryAttempted: false/);
  assert.doesNotMatch(source, /setTimeout\(|retry\(/);
  assert.match(ui, /Nothing happens/);
  assert.match(ui, /Authorize exact action/);
  assert.match(ui, /Pause all actions/);
  assert.match(ui, /FAILED · NO RETRY/);
  assert.match(ui, /INDETERMINATE · NO RETRY/);
  assert.match(ui, /Correlated/);
  assert.match(ui, /Proven/);
  assert.match(ui, /single-user screen does not visually prove tenant isolation/);
});

test("fixture outcome can only be correlated, never proven by provenance", () => {
  assert.deepEqual(validateOutcomeAssessment({
    label: "correlated",
    evidenceIds: ["evidence:activation-drop", "activation-window-stage03-v1"],
    limitations: ["FIXTURE data", "small TEST cohort", "no causal inference"],
    observationCount: 1,
    invalidSignatureCount: 0,
    observationTruthModes: ["FIXTURE"],
  }), []);
  assert.ok(validateOutcomeAssessment({
    label: "supported",
    evidenceIds: ["evidence:activation-drop"],
    limitations: ["FIXTURE data"],
    observationCount: 1,
    invalidSignatureCount: 0,
    observationTruthModes: ["FIXTURE"],
  }).includes("FIXTURE observations cannot support an outcome"));
});

async function freshRuntimeHarness(suffix) {
  const database = await freshDatabase(runtimeMigrationNames);
  const userId = `l06-owner-${suffix}`;
  const workspaceId = `l06-workspace-${suffix}`;
  insert(database, "users", {
    id: userId,
    email: `${userId}@example.test`,
    display_name: "L06 Runtime Owner",
  });
  insert(database, "workspaces", {
    id: workspaceId,
    name: `L06 ${suffix}`,
    slug: workspaceId,
    owner_user_id: userId,
  });
  insert(database, "workspace_members", {
    workspace_id: workspaceId,
    user_id: userId,
    role: "owner",
  });
  globalThis.__cfrCloudflareEnv.DB = new TestD1Database(database);
  return {
    database,
    userId,
    workspaceId,
    request(traceId) {
      return { userId, actorWorkspaceId: workspaceId, workspaceId, traceId };
    },
  };
}

test("L06 cold product path invokes six runtime handlers and stops before authority", async () => {
  const harness = await freshRuntimeHarness("cold");
  const invocations = Object.fromEntries(REASONING_NODE_REGISTRY.map((node) => [node.nodeKey, 0]));
  const uninstall = installReasoningRuntimeHooksForTest({
    now: () => "2026-08-24T12:00:00.000Z",
    leaseToken: (nodeKey, attempt) => `lease-l06-cold-${nodeKey}-${attempt}`,
    onHandlerInvocation: (nodeKey) => {
      invocations[nodeKey] += 1;
    },
  });
  try {
    const snapshot = await getOrCreateFlightRecorderSnapshot(harness.userId, harness.workspaceId);
    const summary = await summarizePersistedReasoningGraph(harness.request(snapshot.traceId));
    assert.equal(snapshot.traceState, "awaiting_approval");
    assert.equal(snapshot.truthMode, "FIXTURE");
    assert.equal(summary.graphVersion, REASONING_GRAPH_VERSION);
    assert.equal(summary.attempts.length, 6);
    assert.equal(summary.artifacts.length, 6);
    assert.ok(summary.attempts.every((node) => node.current_state === "succeeded"));
    assert.ok(summary.attempts.every((node) => node.execution_mode === "runtime"));
    assert.ok(summary.artifacts.every((artifact) => JSON.parse(artifact.content_json).truthMode === "FIXTURE"));
    assert.deepEqual(invocations, Object.fromEntries(REASONING_NODE_REGISTRY.map((node) => [node.nodeKey, 1])));
    assert.deepEqual(summary.authorityCounts, {
      action_intents: 1,
      policy_decisions: 1,
      approval_grants: 0,
      effect_attempts: 0,
      outcome_observations: 0,
      outcome_assessments: 0,
    });
    assert.ok(snapshot.playbook.every((node) => node.executionMode === "runtime"));
    assert.ok(snapshot.playbook.every((node) => node.role.startsWith("Runtime executor")));
  } finally {
    uninstall();
    harness.database.close();
  }
});

async function seedRuntimeBoundary(harness, hooks) {
  const uninstall = installReasoningRuntimeHooksForTest({
    now: () => "2026-08-24T12:00:00.000Z",
    leaseToken: (nodeKey, attempt) => `lease-l06-boundary-${nodeKey}-${attempt}`,
    ...hooks,
  });
  try {
    await assert.rejects(
      getOrCreateFlightRecorderSnapshot(harness.userId, harness.workspaceId),
    );
  } finally {
    uninstall();
  }
  const trace = harness.database.prepare(
    "SELECT id FROM flight_traces WHERE workspace_id=? LIMIT 1",
  ).get(harness.workspaceId);
  assert.ok(trace?.id);
  return trace.id;
}

test("L06 resumes after every completed-node boundary without replay", async (t) => {
  for (let boundary = 1; boundary <= 5; boundary += 1) {
    await t.test(`boundary-${boundary}`, async () => {
      const harness = await freshRuntimeHarness(`resume-${boundary}`);
      const invocations = Object.fromEntries(REASONING_NODE_REGISTRY.map((node) => [node.nodeKey, 0]));
      try {
        const traceId = await seedRuntimeBoundary(harness, {
          stopAfterCompletions: boundary,
          onHandlerInvocation: (nodeKey) => {
            invocations[nodeKey] += 1;
          },
        });
        const request = harness.request(traceId);
        const before = await summarizePersistedReasoningGraph(request);
        const preserved = before.attempts
          .filter((node) => node.current_state === "succeeded")
          .map((node) => ({ ...node }));
        assert.equal(preserved.length, boundary);
        const uninstall = installReasoningRuntimeHooksForTest({
          now: () => "2026-08-24T12:00:01.000Z",
          leaseToken: (nodeKey, attempt) => `lease-l06-resume-${boundary}-${nodeKey}-${attempt}`,
          onHandlerInvocation: (nodeKey) => {
            invocations[nodeKey] += 1;
          },
        });
        let after;
        try {
          after = await runPersistedReasoningGraph(request);
        } finally {
          uninstall();
        }
        assert.equal(after.traceState, "awaiting_approval");
        assert.equal(after.artifacts.length, 6);
        assert.deepEqual(
          after.attempts
            .filter((node) => node.current_state === "succeeded")
            .slice(0, boundary)
            .map((node) => ({ ...node })),
          preserved,
        );
        assert.deepEqual(
          invocations,
          Object.fromEntries(REASONING_NODE_REGISTRY.map((node) => [node.nodeKey, 1])),
        );
      } finally {
        harness.database.close();
      }
    });
  }
});

test("L06 preserves an expired claimed attempt before completing a later attempt", async () => {
  const harness = await freshRuntimeHarness("claim-crash");
  let clock = "2026-08-24T12:00:00.000Z";
  const invocations = { planner: 0 };
  try {
    const traceId = await seedRuntimeBoundary(harness, {
      now: () => clock,
      afterClaim: async (nodeKey) => nodeKey === "planner" ? "stop" : "continue",
      onHandlerInvocation: (nodeKey) => {
        if (nodeKey === "planner") invocations.planner += 1;
      },
    });
    const request = harness.request(traceId);
    assert.deepEqual(await claimPersistedReasoningNode(request, "planner"), {
      status: "busy",
      attempt: 1,
    });
    clock = "2026-08-24T12:00:31.000Z";
    const uninstall = installReasoningRuntimeHooksForTest({
      now: () => clock,
      leaseToken: (nodeKey, attempt) => `lease-l06-recovered-${nodeKey}-${attempt}`,
      onHandlerInvocation: (nodeKey) => {
        if (nodeKey === "planner") invocations.planner += 1;
      },
    });
    let summary;
    try {
      summary = await runPersistedReasoningGraph(request);
    } finally {
      uninstall();
    }
    const plannerAttempts = summary.attempts.filter((node) => node.node_key === "planner");
    assert.equal(plannerAttempts.length, 2);
    assert.equal(plannerAttempts[0].current_state, "failed");
    assert.equal(plannerAttempts[0].error_code, REASONING_ERRORS.interruptedAttempt);
    assert.equal(plannerAttempts[1].attempt, 2);
    assert.equal(plannerAttempts[1].current_state, "succeeded");
    assert.equal(invocations.planner, 1);
    assert.equal(summary.artifacts.length, 6);
  } finally {
    harness.database.close();
  }
});

test("L06 rejects a foreign claim token and makes same-token finalize idempotent", async () => {
  const harness = await freshRuntimeHarness("finalize-owner");
  const leaseToken = "lease-l06-owned-planner-1";
  try {
    const traceId = await seedRuntimeBoundary(harness, {
      leaseToken: () => leaseToken,
      afterClaim: async (nodeKey) => nodeKey === "planner" ? "stop" : "continue",
    });
    const request = harness.request(traceId);
    const uninstall = installReasoningRuntimeHooksForTest({
      now: () => "2026-08-24T12:00:01.000Z",
      leaseToken: (nodeKey, attempt) => `lease-l06-finalize-rest-${nodeKey}-${attempt}`,
    });
    try {
      await assert.rejects(
        finalizePersistedReasoningNode(request, "planner", "lease-l06-foreign-token"),
        new RegExp(REASONING_ERRORS.claimOwnership),
      );
      const first = await finalizePersistedReasoningNode(request, "planner", leaseToken);
      const second = await finalizePersistedReasoningNode(request, "planner", leaseToken);
      assert.equal(first.status, "succeeded");
      assert.equal(second.status, "idempotent");
      assert.equal(second.artifactId, first.artifactId);
      assert.equal(second.outputHash, first.outputHash);
      const summary = await runPersistedReasoningGraph(request);
      assert.equal(summary.artifacts.length, 6);
      assert.equal(summary.authorityCounts.action_intents, 1);
    } finally {
      uninstall();
    }
  } finally {
    harness.database.close();
  }
});

test("L06 concurrent executor calls converge on one canonical graph", async () => {
  const harness = await freshRuntimeHarness("concurrent");
  try {
    const traceId = await seedRuntimeBoundary(harness, { stopAfterCompletions: 1 });
    const request = harness.request(traceId);
    const gate = deferred();
    let arrivals = 0;
    const uninstall = installReasoningRuntimeHooksForTest({
      now: () => "2026-08-24T12:00:02.000Z",
      leaseToken: (nodeKey, attempt) => `lease-l06-concurrent-${nodeKey}-${attempt}-${arrivals}`,
      beforeClaimCommit: async (nodeKey) => {
        if (nodeKey !== "quantitative") return;
        arrivals += 1;
        if (arrivals === 2) gate.resolve();
        await gate.promise;
      },
    });
    try {
      await Promise.all([
        runPersistedReasoningGraph(request),
        runPersistedReasoningGraph(request),
      ]);
    } finally {
      uninstall();
    }
    const summary = await runPersistedReasoningGraph(request);
    assert.equal(arrivals, 2);
    assert.equal(summary.traceState, "awaiting_approval");
    assert.equal(summary.artifacts.length, 6);
    assert.equal(new Set(summary.artifacts.map((artifact) => artifact.node_id)).size, 6);
    assert.equal(summary.authorityCounts.action_intents, 1);
    assert.equal(summary.authorityCounts.policy_decisions, 1);
    assert.equal(summary.authorityCounts.approval_grants, 0);
    assert.deepEqual(
      summary.events.map((event) => event.sequence),
      summary.events.map((_, index) => index + 1),
    );
    assert.equal(
      new Set(summary.events.map((event) => event.idempotency_key)).size,
      summary.events.length,
    );
  } finally {
    harness.database.close();
  }
});

test("L06 handler and artifact failures stop before synthesizer authority", async (t) => {
  for (const failure of ["handler", "secret", "citation"]) {
    await t.test(failure, async () => {
      const harness = await freshRuntimeHarness(`failure-${failure}`);
      const invocations = Object.fromEntries(REASONING_NODE_REGISTRY.map((node) => [node.nodeKey, 0]));
      const uninstall = installReasoningRuntimeHooksForTest({
        now: () => "2026-08-24T12:00:00.000Z",
        leaseToken: (nodeKey, attempt) => `lease-l06-failure-${failure}-${nodeKey}-${attempt}`,
        failNode: failure === "handler" ? "skeptic" : undefined,
        mutateArtifact: failure === "secret"
          ? (nodeKey, content) => {
              if (nodeKey === "skeptic") content.apiKey = "sk_live_1234567890abcdef";
            }
          : failure === "citation"
            ? (nodeKey, _content, citations) => {
                if (nodeKey === "skeptic") citations.push("evidence:not-declared");
              }
            : undefined,
        onHandlerInvocation: (nodeKey) => {
          invocations[nodeKey] += 1;
        },
      });
      try {
        await assert.rejects(
          getOrCreateFlightRecorderSnapshot(harness.userId, harness.workspaceId),
          new RegExp(failure === "handler" ? REASONING_ERRORS.handlerFailed : REASONING_ERRORS.invalidArtifact),
        );
      } finally {
        uninstall();
      }
      const trace = harness.database.prepare("SELECT id FROM flight_traces WHERE workspace_id=?").get(harness.workspaceId);
      const summary = await summarizePersistedReasoningGraph(harness.request(trace.id));
      assert.equal(summary.traceState, "failed");
      assert.equal(summary.artifacts.length, 4);
      assert.equal(invocations.synthesizer, 0);
      assert.deepEqual(summary.authorityCounts, {
        action_intents: 0,
        policy_decisions: 0,
        approval_grants: 0,
        effect_attempts: 0,
        outcome_observations: 0,
        outcome_assessments: 0,
      });
      harness.database.close();
    });
  }
});

test("migration 0007 preserves legacy truth labels and aborts invalid history atomically", async (t) => {
  const migration = await readFile(
    new URL("drizzle/0007_l06_persisted_graph_executor.sql", root),
    "utf8",
  );
  for (const migrationCase of ["empty", "current-l08", "interrupted", "completed", "invalid-history"]) {
    await t.test(migrationCase, async () => {
      const database = await freshDatabase(migrationNames);
      let demo = null;
      if (migrationCase !== "empty") {
        demo = await materializePending(database, {
          userId: `l06-migration-${migrationCase}-owner`,
          workspaceId: `l06-migration-${migrationCase}-workspace`,
        });
      }
      if (migrationCase === "completed") assessLegacyTrace(database, demo.trace.id);
      if (migrationCase === "interrupted" || migrationCase === "invalid-history") {
        const planner = demo.reasoningNodes[0].node;
        insert(database, "reasoning_nodes", {
          id: `${planner.id}-attempt-2`,
          workspace_id: planner.workspaceId,
          trace_id: planner.traceId,
          node_key: planner.nodeKey,
          attempt: 2,
          current_state: "pending",
          input_hash: planner.inputHash,
          output_hash: null,
          error_code: null,
          started_at: null,
          completed_at: null,
        });
        database.prepare(`UPDATE reasoning_nodes SET current_state='running', started_at=?
          WHERE id=?`).run("2026-08-13T16:02:00.000Z", `${planner.id}-attempt-2`);
        if (migrationCase === "invalid-history") {
          database.prepare(`UPDATE reasoning_nodes SET current_state='succeeded', output_hash=?, completed_at=?
            WHERE id=?`).run(planner.outputHash, "2026-08-13T16:02:01.000Z", `${planner.id}-attempt-2`);
        }
      }

      if (migrationCase === "invalid-history") {
        assert.throws(
          () => applyMigrationAtomically(database, migration),
          /migration_l06_invalid_history/,
        );
        assert.equal(
          database.prepare(`SELECT COUNT(*) count FROM pragma_table_info('reasoning_nodes')
            WHERE name='execution_mode'`).get().count,
          0,
        );
      } else {
        assert.doesNotThrow(() => applyMigrationAtomically(database, migration));
        if (demo) {
          assert.equal(
            database.prepare("SELECT COUNT(*) count FROM reasoning_nodes WHERE execution_mode='precomputed_fixture'").get().count,
            migrationCase === "interrupted" ? 7 : 6,
          );
          assert.equal(
            database.prepare("SELECT COUNT(*) count FROM reasoning_nodes WHERE execution_mode='runtime'").get().count,
            0,
          );
        }
        if (migrationCase === "interrupted") {
          const row = database.prepare(`SELECT current_state, error_code FROM reasoning_nodes
            WHERE attempt=2 AND node_key='planner'`).get();
          assert.deepEqual({ ...row }, {
            current_state: "failed",
            error_code: REASONING_ERRORS.interruptedAttempt,
          });
        }
        assert.deepEqual(database.prepare("PRAGMA foreign_key_check").all(), []);
      }
      database.close();
    });
  }
});

test("L06 rejects caller graph control, tenant mismatch, and persisted input drift before handlers", async () => {
  const harness = await freshRuntimeHarness("boundary-attacks");
  let invocationCount = 0;
  try {
    const traceId = await seedRuntimeBoundary(harness, { stopAfterCompletions: 1 });
    const request = harness.request(traceId);
    const before = await summarizePersistedReasoningGraph(request);
    await assert.rejects(
      runPersistedReasoningGraph({ ...request, nodes: ["attacker"] }),
      new RegExp(REASONING_ERRORS.arbitraryGraph),
    );
    await assert.rejects(
      runPersistedReasoningGraph({ ...request, actorWorkspaceId: "foreign-workspace" }),
      new RegExp(REASONING_ERRORS.tenantMismatch),
    );
    const uninstall = installReasoningRuntimeHooksForTest({
      now: () => "2026-08-24T12:00:01.000Z",
      leaseToken: (nodeKey, attempt) => `lease-l06-input-drift-${nodeKey}-${attempt}`,
      beforeClaimCommit: async (nodeKey) => {
        if (nodeKey !== "quantitative") return;
        harness.database.prepare(`UPDATE reasoning_nodes SET input_hash=?
          WHERE workspace_id=? AND trace_id=? AND node_key='quantitative'`).run(
          "f".repeat(64),
          harness.workspaceId,
          traceId,
        );
      },
      onHandlerInvocation: () => {
        invocationCount += 1;
      },
    });
    try {
      await assert.rejects(
        runPersistedReasoningGraph(request),
        new RegExp(REASONING_ERRORS.inputDrift),
      );
    } finally {
      uninstall();
    }
    const after = await summarizePersistedReasoningGraph(request);
    assert.equal(invocationCount, 0);
    assert.equal(after.artifacts.length, before.artifacts.length);
    assert.equal(after.authorityCounts.action_intents, 0);
    assert.equal(after.authorityCounts.effect_attempts, 0);
    assert.equal(L06_DATABASE_ATTACKS.length, 14);
  } finally {
    harness.database.close();
  }
});

function runtimeProjection(database, workspaceId) {
  const trace = database.prepare(`SELECT id, current_state, active_intent_id FROM flight_traces
    WHERE workspace_id=? LIMIT 1`).get(workspaceId);
  const count = (table) => database.prepare(`SELECT COUNT(*) count FROM ${table}
    WHERE workspace_id=?`).get(workspaceId).count;
  return {
    trace: trace ? { ...trace } : null,
    nodes: count("reasoning_nodes"),
    artifacts: count("reasoning_artifacts"),
    events: count("flight_trace_events"),
    intents: count("action_intents"),
    policies: count("policy_decisions"),
    grants: count("approval_grants"),
    effects: count("effect_attempts"),
    observations: count("outcome_observations"),
    assessments: count("outcome_assessments"),
  };
}

function directRuntimeAttempt(database, input) {
  insert(database, "reasoning_nodes", {
    id: input.id,
    workspace_id: input.workspaceId,
    trace_id: input.traceId,
    node_key: input.nodeKey,
    logical_node_id: input.logicalNodeId,
    graph_version: REASONING_GRAPH_VERSION,
    execution_mode: "runtime",
    handler_version: "crosssignal-fixture-handlers-v1",
    predecessor_outputs_json: input.predecessorOutputsJson,
    attempt: input.attempt ?? 1,
    current_state: "pending",
    input_hash: input.inputHash ?? "a".repeat(64),
    output_hash: null,
    error_code: null,
    lease_token: null,
    lease_expires_at: null,
    completion_token_hash: null,
    started_at: null,
    completed_at: null,
  });
}

test("all fourteen L06 direct-database attacks fail with zero partial mutation", async (t) => {
  for (const attack of L06_DATABASE_ATTACKS) {
    await t.test(`${attack.id} ${attack.attack}`, async () => {
      const harness = await freshRuntimeHarness(attack.id.toLowerCase());
      let uninstall = null;
      try {
        let traceId;
        let operation;
        if (["DB-L06-08", "DB-L06-09", "DB-L06-10", "DB-L06-11"].includes(attack.id)) {
          const ownedToken = `lease-${attack.id.toLowerCase()}-owned-planner`;
          traceId = await seedRuntimeBoundary(harness, {
            leaseToken: () => ownedToken,
            afterClaim: async (nodeKey) => nodeKey === "planner" ? "stop" : "continue",
          });
          if (attack.id === "DB-L06-08") {
            uninstall = installReasoningRuntimeHooksForTest({
              now: () => "2026-08-24T12:00:01.000Z",
            });
            operation = () => finalizePersistedReasoningNode(
              harness.request(traceId),
              "planner",
              "lease-db-l06-08-foreign-token",
            );
          } else if (attack.id === "DB-L06-09") {
            uninstall = installReasoningRuntimeHooksForTest({
              now: () => "2026-08-24T12:00:31.000Z",
            });
            operation = () => finalizePersistedReasoningNode(
              harness.request(traceId),
              "planner",
              ownedToken,
            );
          } else {
            const planner = harness.database.prepare(`SELECT * FROM reasoning_nodes
              WHERE workspace_id=? AND node_key='planner'`).get(harness.workspaceId);
            const citations = ["evidence:activation-drop", "evidence:onboarding-feedback"];
            const content = {
              truthMode: "FIXTURE",
              graphVersion: REASONING_GRAPH_VERSION,
              nodeKey: "planner",
              handlerVersion: "crosssignal-fixture-handlers-v1",
              summary: "direct attack payload",
              predecessorOutputs: [],
              evidenceCitations: citations,
              usage: { status: "unknown", measuredCostUsd: null },
              ...(attack.id === "DB-L06-11" ? { apiKey: "sk_live_1234567890abcdef" } : {}),
            };
            const sealed = await sealCanonical(content);
            harness.database.prepare(`UPDATE reasoning_nodes SET current_state='succeeded',
              output_hash=?, lease_token=NULL, lease_expires_at=NULL,
              completion_token_hash=?, completed_at=? WHERE id=?`).run(
              sealed.sha256,
              "c".repeat(64),
              "2026-08-24T12:00:01.000Z",
              planner.id,
            );
            operation = () => insert(harness.database, "reasoning_artifacts", {
              id: `artifact-${attack.id}`,
              workspace_id: harness.workspaceId,
              trace_id: traceId,
              node_id: planner.id,
              artifact_kind: "plan",
              schema_version: "reasoning-artifact-v2",
              content_json: sealed.canonicalJson,
              content_hash: sealed.sha256,
              evidence_citations_json: attack.id === "DB-L06-10"
                ? stableStringify([...citations, "metric:activation-72h"])
                : stableStringify(citations),
            });
          }
        } else if (["DB-L06-03", "DB-L06-12"].includes(attack.id)) {
          const runtimeUninstall = installReasoningRuntimeHooksForTest({
            now: () => "2026-08-24T12:00:00.000Z",
            leaseToken: (nodeKey, attempt) => `lease-${attack.id}-${nodeKey}-${attempt}`,
          });
          try {
            const snapshot = await getOrCreateFlightRecorderSnapshot(harness.userId, harness.workspaceId);
            traceId = snapshot.traceId;
          } finally {
            runtimeUninstall();
          }
          const artifact = harness.database.prepare(`SELECT artifact.*, node.node_key
            FROM reasoning_artifacts artifact JOIN reasoning_nodes node ON node.id=artifact.node_id
            WHERE artifact.workspace_id=? AND node.node_key='planner'`).get(harness.workspaceId);
          if (attack.id === "DB-L06-03") {
            operation = () => insert(harness.database, "reasoning_artifacts", {
              id: `${artifact.id}-foreign-trace`,
              workspace_id: harness.workspaceId,
              trace_id: "foreign-trace",
              node_id: artifact.node_id,
              artifact_kind: artifact.artifact_kind,
              schema_version: artifact.schema_version,
              content_json: artifact.content_json,
              content_hash: artifact.content_hash,
              evidence_citations_json: artifact.evidence_citations_json,
            });
          } else {
            operation = () => insert(harness.database, "reasoning_artifacts", {
              id: `${artifact.id}-conflict`,
              workspace_id: harness.workspaceId,
              trace_id: traceId,
              node_id: artifact.node_id,
              artifact_kind: artifact.artifact_kind,
              schema_version: artifact.schema_version,
              content_json: "{}",
              content_hash: "f".repeat(64),
              evidence_citations_json: artifact.evidence_citations_json,
            });
          }
        } else {
          traceId = await seedRuntimeBoundary(harness, { stopAfterCompletions: 1 });
          const planner = harness.database.prepare(`SELECT * FROM reasoning_nodes
            WHERE workspace_id=? AND node_key='planner'`).get(harness.workspaceId);
          const plannerArtifact = harness.database.prepare(`SELECT * FROM reasoning_artifacts
            WHERE workspace_id=? AND node_id=?`).get(harness.workspaceId, planner.id);
          if (attack.id === "DB-L06-01") {
            operation = () => summarizePersistedReasoningGraph({
              ...harness.request(traceId),
              actorWorkspaceId: "foreign-workspace",
            });
          } else if (attack.id === "DB-L06-02") {
            operation = () => directRuntimeAttempt(harness.database, {
              id: "foreign-workspace-attempt",
              workspaceId: "foreign-workspace",
              traceId,
              nodeKey: "quantitative",
              logicalNodeId: "foreign-logical-node",
              predecessorOutputsJson: stableStringify([
                { nodeKey: "planner", outputHash: planner.output_hash },
              ]),
            });
          } else if (attack.id === "DB-L06-04") {
            operation = () => directRuntimeAttempt(harness.database, {
              id: "unregistered-node-attempt",
              workspaceId: harness.workspaceId,
              traceId,
              nodeKey: "attacker_node",
              logicalNodeId: "unregistered-logical-node",
              predecessorOutputsJson: "[]",
            });
          } else if (attack.id === "DB-L06-05") {
            operation = () => directRuntimeAttempt(harness.database, {
              id: "caller-edge-attempt",
              workspaceId: harness.workspaceId,
              traceId,
              nodeKey: "planner",
              logicalNodeId: planner.logical_node_id,
              predecessorOutputsJson: stableStringify([
                { nodeKey: "qualitative", outputHash: planner.output_hash },
              ]),
              attempt: 2,
            });
          } else if (attack.id === "DB-L06-06") {
            operation = () => directRuntimeAttempt(harness.database, {
              id: "early-skeptic-attempt",
              workspaceId: harness.workspaceId,
              traceId,
              nodeKey: "skeptic",
              logicalNodeId: "early-skeptic-logical",
              predecessorOutputsJson: stableStringify([
                { nodeKey: "quantitative", outputHash: "a".repeat(64) },
                { nodeKey: "qualitative", outputHash: "b".repeat(64) },
                { nodeKey: "experiment_design", outputHash: "c".repeat(64) },
              ]),
            });
          } else if (attack.id === "DB-L06-07") {
            operation = () => directRuntimeAttempt(harness.database, {
              id: "drifted-quantitative-attempt",
              workspaceId: harness.workspaceId,
              traceId,
              nodeKey: "quantitative",
              logicalNodeId: "drifted-quantitative-logical",
              predecessorOutputsJson: stableStringify([
                { nodeKey: "planner", outputHash: "f".repeat(64) },
              ]),
            });
          } else if (attack.id === "DB-L06-10" || attack.id === "DB-L06-11") {
            const citations = ["evidence:activation-drop", "evidence:onboarding-feedback"];
            const content = {
              truthMode: "FIXTURE",
              graphVersion: REASONING_GRAPH_VERSION,
              nodeKey: "planner",
              handlerVersion: "crosssignal-fixture-handlers-v1",
              summary: "direct attack payload",
              predecessorOutputs: [],
              evidenceCitations: citations,
              usage: { status: "unknown", measuredCostUsd: null },
              ...(attack.id === "DB-L06-11" ? { apiKey: "sk_live_1234567890abcdef" } : {}),
            };
            const sealed = await sealCanonical(content);
            harness.database.prepare(`UPDATE reasoning_nodes SET current_state='running',
              lease_token=?, lease_expires_at=?, started_at=? WHERE id=?`).run(
              "lease-direct-artifact-attack",
              "2026-08-24T12:00:30.000Z",
              "2026-08-24T12:00:00.000Z",
              planner.id,
            );
            harness.database.prepare(`UPDATE reasoning_nodes SET current_state='succeeded',
              output_hash=?, lease_token=NULL, lease_expires_at=NULL,
              completion_token_hash=?, completed_at=? WHERE id=?`).run(
              sealed.sha256,
              "c".repeat(64),
              "2026-08-24T12:00:01.000Z",
              planner.id,
            );
            harness.database.prepare("DELETE FROM reasoning_artifacts WHERE id=?").run(plannerArtifact.id);
            operation = () => insert(harness.database, "reasoning_artifacts", {
              id: `artifact-${attack.id}`,
              workspace_id: harness.workspaceId,
              trace_id: traceId,
              node_id: planner.id,
              artifact_kind: "plan",
              schema_version: "reasoning-artifact-v2",
              content_json: sealed.canonicalJson,
              content_hash: sealed.sha256,
              evidence_citations_json: attack.id === "DB-L06-10"
                ? stableStringify([...citations, "metric:activation-72h"])
                : stableStringify(citations),
            });
          } else if (attack.id === "DB-L06-13") {
            operation = () => insert(harness.database, "action_intents", {
              id: "early-intent",
              workspace_id: harness.workspaceId,
              trace_id: traceId,
              context_snapshot_id: harness.database.prepare("SELECT id FROM context_snapshots WHERE trace_id=?").get(traceId).id,
              source_artifact_id: plannerArtifact.id,
              supersedes_intent_id: null,
              intent_key: "early-intent-v1",
              action_kind: "email_test",
              truth_mode: "TEST",
              recipients_json: '["test@example.test"]',
              recipient_set_hash: "a".repeat(64),
              subject: "blocked",
              body: "blocked",
              cohort_cap: 1,
              evidence_ids_json: '["evidence:activation-drop"]',
              metric_definition_id: harness.database.prepare("SELECT id FROM outcome_definitions WHERE trace_id=?").get(traceId).id,
              context_manifest_hash: "b".repeat(64),
              policy_version: "blocked",
              policy_hash: "c".repeat(64),
              nonce: "blocked",
              expires_at: "2026-08-25T12:00:00.000Z",
              canonical_payload_json: "{}",
              canonical_payload_hash: "d".repeat(64),
              created_by: harness.userId,
              created_at: "2026-08-24T12:00:00.000Z",
            });
          } else if (attack.id === "DB-L06-14") {
            operation = () => harness.database.prepare(`UPDATE flight_traces
              SET current_state='awaiting_approval' WHERE workspace_id=? AND id=?`).run(
              harness.workspaceId,
              traceId,
            );
          }
        }

        const before = runtimeProjection(harness.database, harness.workspaceId);
        const expected = new RegExp(attack.expectedError);
        await assert.rejects(Promise.resolve().then(operation), expected);
        assert.deepEqual(runtimeProjection(harness.database, harness.workspaceId), before);
      } finally {
        uninstall?.();
        harness.database.close();
      }
    });
  }
});
