import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

const root = new URL("../", import.meta.url);
const migrationNames = [
  "0000_dry_chat.sql",
  "0001_gigantic_shriek.sql",
  "0002_funny_madripoor.sql",
  "0003_faithful_guardsmen.sql",
  "0004_typical_omega_red.sql",
  "0005_flight_recorder_guards.sql",
];

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

async function freshDatabase() {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  for (const name of migrationNames) {
    applyMigration(database, await readFile(new URL(`drizzle/${name}`, root), "utf8"));
  }
  return database;
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
