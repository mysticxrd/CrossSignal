import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { users, workspaceMembers, workspaces } from "./schema";

const hashCheck = (column: { name: string }) =>
  sql`length(${column}) = 64 AND ${column} NOT GLOB '*[^0-9a-f]*'`;

export const workspaceAuthorityControls = sqliteTable(
  "workspace_authority_controls",
  {
    workspaceId: text("workspace_id")
      .primaryKey()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    killSwitchEngaged: integer("kill_switch_engaged", { mode: "boolean" })
      .notNull()
      .default(false),
    updatedBy: text("updated_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    foreignKey({
      name: "fk_workspace_authority_controls_membership",
      columns: [table.workspaceId, table.updatedBy],
      foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.userId],
    }),
    check(
      "chk_workspace_authority_controls_kill_switch",
      sql`${table.killSwitchEngaged} IN (0, 1)`,
    ),
  ],
);

export const workspaceAuthorityControlEvents = sqliteTable(
  "workspace_authority_control_events",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    sequence: integer("sequence").notNull(),
    controlKind: text("control_kind", { enum: ["kill_switch"] }).notNull(),
    priorState: integer("prior_state", { mode: "boolean" }),
    currentState: integer("current_state", { mode: "boolean" }).notNull(),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    reasonCode: text("reason_code", {
      enum: ["workspace_initialized", "migration_backfill", "owner_transition"],
    }).notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    payloadJson: text("payload_json").notNull(),
    contentHash: text("content_hash").notNull(),
    occurredAt: text("occurred_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_authority_control_events_workspace_id").on(
      table.workspaceId,
      table.id,
    ),
    uniqueIndex("idx_authority_control_events_sequence").on(
      table.workspaceId,
      table.sequence,
    ),
    uniqueIndex("idx_authority_control_events_idempotency").on(
      table.workspaceId,
      table.idempotencyKey,
    ),
    index("idx_authority_control_events_head").on(
      table.workspaceId,
      table.controlKind,
      table.sequence,
    ),
    foreignKey({
      name: "fk_authority_control_events_membership",
      columns: [table.workspaceId, table.actorUserId],
      foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.userId],
    }),
    check("chk_authority_control_events_sequence", sql`${table.sequence} >= 1`),
    check(
      "chk_authority_control_events_kind",
      sql`${table.controlKind} = 'kill_switch'`,
    ),
    check(
      "chk_authority_control_events_prior_state",
      sql`${table.priorState} IS NULL OR ${table.priorState} IN (0, 1)`,
    ),
    check(
      "chk_authority_control_events_current_state",
      sql`${table.currentState} IN (0, 1)`,
    ),
    check(
      "chk_authority_control_events_reason",
      sql`${table.reasonCode} IN ('workspace_initialized', 'migration_backfill', 'owner_transition')`,
    ),
    check("chk_authority_control_events_payload", sql`json_valid(${table.payloadJson})`),
    check("chk_authority_control_events_hash", hashCheck(table.contentHash)),
    check(
      "chk_authority_control_events_time",
      sql`unixepoch(${table.occurredAt}) IS NOT NULL`,
    ),
  ],
);

export const flightTraces = sqliteTable(
  "flight_traces",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    traceKey: text("trace_key").notNull(),
    fixtureKey: text("fixture_key"),
    truthMode: text("truth_mode", {
      enum: ["LIVE", "TEST", "FIXTURE"],
    }).notNull(),
    currentState: text("current_state", {
      enum: [
        "collecting",
        "context_frozen",
        "reasoning",
        "awaiting_approval",
        "executing",
        "observing",
        "assessed",
        "failed",
        "cancelled",
      ],
    })
      .notNull()
      .default("collecting"),
    activeIntentId: text("active_intent_id"),
    retentionClass: text("retention_class", {
      enum: ["ephemeral_demo", "review_evidence"],
    }).notNull(),
    retentionUntil: text("retention_until").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_flight_traces_workspace_key").on(
      table.workspaceId,
      table.traceKey,
    ),
    uniqueIndex("idx_flight_traces_workspace_id").on(
      table.workspaceId,
      table.id,
    ),
    index("idx_flight_traces_workspace_state").on(
      table.workspaceId,
      table.currentState,
    ),
    index("idx_flight_traces_workspace_active_intent").on(
      table.workspaceId,
      table.activeIntentId,
    ),
    foreignKey({
      name: "fk_flight_traces_workspace_creator_membership",
      columns: [table.workspaceId, table.createdBy],
      foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.userId],
    }),
    check(
      "chk_flight_traces_truth_mode",
      sql`${table.truthMode} IN ('LIVE', 'TEST', 'FIXTURE')`,
    ),
    check(
      "chk_flight_traces_state",
      sql`${table.currentState} IN ('collecting', 'context_frozen', 'reasoning', 'awaiting_approval', 'executing', 'observing', 'assessed', 'failed', 'cancelled')`,
    ),
    check(
      "chk_flight_traces_retention",
      sql`${table.retentionClass} IN ('ephemeral_demo', 'review_evidence')`,
    ),
    check(
      "chk_flight_traces_fixture_label",
      sql`${table.truthMode} <> 'FIXTURE' OR ${table.fixtureKey} IS NOT NULL`,
    ),
    check(
      "chk_flight_traces_retention_time",
      sql`unixepoch(${table.retentionUntil}) IS NOT NULL`,
    ),
  ],
);

export const flightEvidence = sqliteTable(
  "flight_evidence",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    traceId: text("trace_id").notNull(),
    evidenceKey: text("evidence_key").notNull(),
    truthMode: text("truth_mode", {
      enum: ["LIVE", "TEST", "FIXTURE"],
    }).notNull(),
    sourceKind: text("source_kind", {
      enum: [
        "mirrored_event",
        "approved_feedback",
        "signed_observation",
        "policy_document",
        "metric_definition",
      ],
    }).notNull(),
    sourceVersion: text("source_version").notNull(),
    sourceRef: text("source_ref").notNull(),
    capturedAt: text("captured_at").notNull(),
    payloadJson: text("payload_json").notNull(),
    contentHash: text("content_hash").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_flight_evidence_workspace_id").on(
      table.workspaceId,
      table.id,
    ),
    uniqueIndex("idx_flight_evidence_trace_key").on(
      table.workspaceId,
      table.traceId,
      table.evidenceKey,
    ),
    uniqueIndex("idx_flight_evidence_idempotency").on(
      table.workspaceId,
      table.idempotencyKey,
    ),
    foreignKey({
      name: "fk_flight_evidence_workspace_trace",
      columns: [table.workspaceId, table.traceId],
      foreignColumns: [flightTraces.workspaceId, flightTraces.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_flight_evidence_workspace_creator_membership",
      columns: [table.workspaceId, table.createdBy],
      foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.userId],
    }),
    check(
      "chk_flight_evidence_truth_mode",
      sql`${table.truthMode} IN ('LIVE', 'TEST', 'FIXTURE')`,
    ),
    check("chk_flight_evidence_payload_json", sql`json_valid(${table.payloadJson})`),
    check("chk_flight_evidence_content_hash", hashCheck(table.contentHash)),
  ],
);

export const contextSnapshots = sqliteTable(
  "context_snapshots",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    traceId: text("trace_id").notNull(),
    snapshotKey: text("snapshot_key").notNull(),
    truthMode: text("truth_mode", {
      enum: ["LIVE", "TEST", "FIXTURE"],
    }).notNull(),
    currentState: text("current_state", {
      enum: ["collecting", "frozen", "superseded"],
    })
      .notNull()
      .default("collecting"),
    sourceCount: integer("source_count").notNull(),
    orderedManifestJson: text("ordered_manifest_json").notNull(),
    manifestHash: text("manifest_hash").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    frozenAt: text("frozen_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_context_snapshots_workspace_id").on(
      table.workspaceId,
      table.id,
    ),
    uniqueIndex("idx_context_snapshots_workspace_id_trace").on(
      table.workspaceId,
      table.id,
      table.traceId,
    ),
    uniqueIndex("idx_context_snapshots_trace_key").on(
      table.workspaceId,
      table.traceId,
      table.snapshotKey,
    ),
    uniqueIndex("idx_context_snapshots_workspace_manifest").on(
      table.workspaceId,
      table.manifestHash,
    ),
    foreignKey({
      name: "fk_context_snapshots_workspace_trace",
      columns: [table.workspaceId, table.traceId],
      foreignColumns: [flightTraces.workspaceId, flightTraces.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_context_snapshots_workspace_creator_membership",
      columns: [table.workspaceId, table.createdBy],
      foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.userId],
    }),
    check(
      "chk_context_snapshots_truth_mode",
      sql`${table.truthMode} IN ('LIVE', 'TEST', 'FIXTURE')`,
    ),
    check(
      "chk_context_snapshots_state",
      sql`${table.currentState} IN ('collecting', 'frozen', 'superseded')`,
    ),
    check(
      "chk_context_snapshots_state_time",
      sql`(${table.currentState} = 'collecting' AND ${table.frozenAt} IS NULL) OR (${table.currentState} IN ('frozen', 'superseded') AND unixepoch(${table.frozenAt}) IS NOT NULL)`,
    ),
    check("chk_context_snapshots_source_count", sql`${table.sourceCount} > 0`),
    check(
      "chk_context_snapshots_manifest_json",
      sql`json_valid(${table.orderedManifestJson}) AND json_type(${table.orderedManifestJson}) = 'array' AND json_array_length(${table.orderedManifestJson}) = ${table.sourceCount}`,
    ),
    check("chk_context_snapshots_manifest_hash", hashCheck(table.manifestHash)),
  ],
);

export const contextSnapshotSupersessions = sqliteTable(
  "context_snapshot_supersessions",
  {
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    traceId: text("trace_id").notNull(),
    priorSnapshotId: text("prior_snapshot_id").notNull(),
    currentSnapshotId: text("current_snapshot_id").notNull(),
    reason: text("reason").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.currentSnapshotId] }),
    foreignKey({
      name: "fk_context_supersessions_workspace_prior",
      columns: [table.workspaceId, table.priorSnapshotId, table.traceId],
      foreignColumns: [
        contextSnapshots.workspaceId,
        contextSnapshots.id,
        contextSnapshots.traceId,
      ],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_context_supersessions_workspace_current",
      columns: [table.workspaceId, table.currentSnapshotId, table.traceId],
      foreignColumns: [
        contextSnapshots.workspaceId,
        contextSnapshots.id,
        contextSnapshots.traceId,
      ],
    }).onDelete("cascade"),
    check(
      "chk_context_supersessions_distinct",
      sql`${table.priorSnapshotId} <> ${table.currentSnapshotId}`,
    ),
  ],
);

export const contextSnapshotSources = sqliteTable(
  "context_snapshot_sources",
  {
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    snapshotId: text("snapshot_id").notNull(),
    position: integer("position").notNull(),
    sourceId: text("source_id").notNull(),
    sourceKind: text("source_kind").notNull(),
    sourceVersion: text("source_version").notNull(),
    sourceRef: text("source_ref").notNull(),
    contentHash: text("content_hash").notNull(),
    accessDecision: text("access_decision", {
      enum: ["allowed", "redacted", "denied"],
    }).notNull(),
    retrievalJson: text("retrieval_json").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.snapshotId, table.position] }),
    uniqueIndex("idx_context_sources_snapshot_source").on(
      table.workspaceId,
      table.snapshotId,
      table.sourceId,
    ),
    foreignKey({
      name: "fk_context_sources_workspace_snapshot",
      columns: [table.workspaceId, table.snapshotId],
      foreignColumns: [contextSnapshots.workspaceId, contextSnapshots.id],
    }).onDelete("cascade"),
    check("chk_context_sources_position", sql`${table.position} >= 1`),
    check("chk_context_sources_content_hash", hashCheck(table.contentHash)),
    check(
      "chk_context_sources_access_decision",
      sql`${table.accessDecision} IN ('allowed', 'redacted')`,
    ),
    check(
      "chk_context_sources_retrieval_json",
      sql`json_valid(${table.retrievalJson})`,
    ),
  ],
);

export const reasoningNodes = sqliteTable(
  "reasoning_nodes",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    traceId: text("trace_id").notNull(),
    nodeKey: text("node_key", {
      enum: [
        "planner",
        "quantitative",
        "qualitative",
        "experiment_design",
        "skeptic",
        "synthesizer",
      ],
    }).notNull(),
    logicalNodeId: text("logical_node_id").notNull(),
    graphVersion: text("graph_version").notNull(),
    executionMode: text("execution_mode", {
      enum: ["runtime", "precomputed_fixture"],
    }).notNull(),
    handlerVersion: text("handler_version").notNull(),
    predecessorOutputsJson: text("predecessor_outputs_json").notNull(),
    attempt: integer("attempt").notNull().default(1),
    currentState: text("current_state", {
      enum: ["pending", "running", "succeeded", "failed", "skipped"],
    })
      .notNull()
      .default("pending"),
    inputHash: text("input_hash").notNull(),
    outputHash: text("output_hash"),
    errorCode: text("error_code"),
    leaseToken: text("lease_token"),
    leaseExpiresAt: text("lease_expires_at"),
    completionTokenHash: text("completion_token_hash"),
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_reasoning_nodes_workspace_id").on(
      table.workspaceId,
      table.id,
    ),
    uniqueIndex("idx_reasoning_nodes_trace_identity").on(
      table.workspaceId,
      table.traceId,
      table.nodeKey,
      table.attempt,
    ),
    uniqueIndex("idx_reasoning_nodes_logical_attempt").on(
      table.workspaceId,
      table.logicalNodeId,
      table.attempt,
    ),
    uniqueIndex("idx_reasoning_nodes_active")
      .on(table.workspaceId, table.logicalNodeId)
      .where(sql`${table.currentState} IN ('pending', 'running')`),
    uniqueIndex("idx_reasoning_nodes_running")
      .on(table.workspaceId, table.logicalNodeId)
      .where(sql`${table.currentState} = 'running'`),
    uniqueIndex("idx_reasoning_nodes_succeeded")
      .on(table.workspaceId, table.logicalNodeId)
      .where(sql`${table.currentState} = 'succeeded'`),
    foreignKey({
      name: "fk_reasoning_nodes_workspace_trace",
      columns: [table.workspaceId, table.traceId],
      foreignColumns: [flightTraces.workspaceId, flightTraces.id],
    }).onDelete("cascade"),
    check(
      "chk_reasoning_nodes_key",
      sql`${table.nodeKey} IN ('planner', 'quantitative', 'qualitative', 'experiment_design', 'skeptic', 'synthesizer')`,
    ),
    check(
      "chk_reasoning_nodes_state",
      sql`${table.currentState} IN ('pending', 'running', 'succeeded', 'failed', 'skipped')`,
    ),
    check("chk_reasoning_nodes_attempt", sql`${table.attempt} >= 1`),
    check(
      "chk_reasoning_nodes_execution_mode",
      sql`${table.executionMode} IN ('runtime', 'precomputed_fixture')`,
    ),
    check(
      "chk_reasoning_nodes_predecessor_outputs_json",
      sql`json_valid(${table.predecessorOutputsJson}) AND json_type(${table.predecessorOutputsJson}) = 'array'`,
    ),
    check("chk_reasoning_nodes_input_hash", hashCheck(table.inputHash)),
    check(
      "chk_reasoning_nodes_output_hash",
      sql`${table.outputHash} IS NULL OR (${hashCheck(table.outputHash)})`,
    ),
    check(
      "chk_reasoning_nodes_state_payload",
      sql`(
        ${table.currentState} = 'pending'
        AND ${table.startedAt} IS NULL
        AND ${table.completedAt} IS NULL
        AND ${table.outputHash} IS NULL
        AND ${table.errorCode} IS NULL
        AND ${table.leaseToken} IS NULL
        AND ${table.leaseExpiresAt} IS NULL
        AND ${table.completionTokenHash} IS NULL
      ) OR (
        ${table.currentState} = 'running'
        AND ${table.startedAt} IS NOT NULL
        AND ${table.completedAt} IS NULL
        AND ${table.outputHash} IS NULL
        AND ${table.errorCode} IS NULL
        AND ${table.leaseToken} IS NOT NULL
        AND unixepoch(${table.leaseExpiresAt}) > unixepoch(${table.startedAt})
        AND ${table.completionTokenHash} IS NULL
      ) OR (
        ${table.currentState} = 'succeeded'
        AND ${table.startedAt} IS NOT NULL
        AND ${table.completedAt} IS NOT NULL
        AND ${table.outputHash} IS NOT NULL
        AND ${table.errorCode} IS NULL
        AND ${table.leaseToken} IS NULL
        AND ${table.leaseExpiresAt} IS NULL
        AND (${table.completionTokenHash} IS NULL OR (${hashCheck(table.completionTokenHash)}))
      ) OR (
        ${table.currentState} = 'failed'
        AND ${table.startedAt} IS NOT NULL
        AND ${table.completedAt} IS NOT NULL
        AND ${table.outputHash} IS NULL
        AND ${table.errorCode} IS NOT NULL
        AND ${table.leaseToken} IS NULL
        AND ${table.leaseExpiresAt} IS NULL
        AND ${table.completionTokenHash} IS NULL
      ) OR (
        ${table.currentState} = 'skipped'
        AND ${table.completedAt} IS NOT NULL
        AND ${table.outputHash} IS NULL
        AND ${table.leaseToken} IS NULL
        AND ${table.leaseExpiresAt} IS NULL
        AND ${table.completionTokenHash} IS NULL
      )`,
    ),
  ],
);

export const reasoningArtifacts = sqliteTable(
  "reasoning_artifacts",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    traceId: text("trace_id").notNull(),
    nodeId: text("node_id").notNull(),
    artifactKind: text("artifact_kind", {
      enum: ["plan", "analysis", "critique", "intent_draft"],
    }).notNull(),
    schemaVersion: text("schema_version").notNull(),
    contentJson: text("content_json").notNull(),
    contentHash: text("content_hash").notNull(),
    evidenceCitationsJson: text("evidence_citations_json").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_reasoning_artifacts_workspace_id").on(
      table.workspaceId,
      table.id,
    ),
    uniqueIndex("idx_reasoning_artifacts_node_kind").on(
      table.workspaceId,
      table.nodeId,
      table.artifactKind,
    ),
    foreignKey({
      name: "fk_reasoning_artifacts_workspace_trace",
      columns: [table.workspaceId, table.traceId],
      foreignColumns: [flightTraces.workspaceId, flightTraces.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_reasoning_artifacts_workspace_node",
      columns: [table.workspaceId, table.nodeId],
      foreignColumns: [reasoningNodes.workspaceId, reasoningNodes.id],
    }).onDelete("cascade"),
    check(
      "chk_reasoning_artifacts_kind",
      sql`${table.artifactKind} IN ('plan', 'analysis', 'critique', 'intent_draft')`,
    ),
    check(
      "chk_reasoning_artifacts_content_json",
      sql`json_valid(${table.contentJson})`,
    ),
    check(
      "chk_reasoning_artifacts_citations_json",
      sql`json_valid(${table.evidenceCitationsJson}) AND json_type(${table.evidenceCitationsJson}) = 'array' AND json_array_length(${table.evidenceCitationsJson}) > 0`,
    ),
    check("chk_reasoning_artifacts_content_hash", hashCheck(table.contentHash)),
  ],
);

export const actionIntents = sqliteTable(
  "action_intents",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    traceId: text("trace_id").notNull(),
    contextSnapshotId: text("context_snapshot_id").notNull(),
    sourceArtifactId: text("source_artifact_id").notNull(),
    supersedesIntentId: text("supersedes_intent_id"),
    intentKey: text("intent_key").notNull(),
    actionKind: text("action_kind", { enum: ["email_test"] }).notNull(),
    truthMode: text("truth_mode", { enum: ["TEST"] }).notNull(),
    recipientsJson: text("recipients_json").notNull(),
    recipientSetHash: text("recipient_set_hash").notNull(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    cohortCap: integer("cohort_cap").notNull(),
    evidenceIdsJson: text("evidence_ids_json").notNull(),
    metricDefinitionId: text("metric_definition_id").notNull(),
    contextManifestHash: text("context_manifest_hash").notNull(),
    policyVersion: text("policy_version").notNull(),
    policyHash: text("policy_hash").notNull(),
    nonce: text("nonce").notNull(),
    expiresAt: text("expires_at").notNull(),
    canonicalPayloadJson: text("canonical_payload_json").notNull(),
    canonicalPayloadHash: text("canonical_payload_hash").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_action_intents_workspace_id").on(
      table.workspaceId,
      table.id,
    ),
    uniqueIndex("idx_action_intents_trace_key").on(
      table.workspaceId,
      table.traceId,
      table.intentKey,
    ),
    uniqueIndex("idx_action_intents_workspace_payload").on(
      table.workspaceId,
      table.canonicalPayloadHash,
    ),
    uniqueIndex("idx_action_intents_workspace_nonce").on(
      table.workspaceId,
      table.nonce,
    ),
    uniqueIndex("idx_action_intents_one_successor")
      .on(table.workspaceId, table.traceId, table.supersedesIntentId)
      .where(sql`${table.supersedesIntentId} IS NOT NULL`),
    foreignKey({
      name: "fk_action_intents_workspace_trace",
      columns: [table.workspaceId, table.traceId],
      foreignColumns: [flightTraces.workspaceId, flightTraces.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_action_intents_workspace_context",
      columns: [table.workspaceId, table.contextSnapshotId],
      foreignColumns: [contextSnapshots.workspaceId, contextSnapshots.id],
    }),
    foreignKey({
      name: "fk_action_intents_workspace_artifact",
      columns: [table.workspaceId, table.sourceArtifactId],
      foreignColumns: [reasoningArtifacts.workspaceId, reasoningArtifacts.id],
    }),
    foreignKey({
      name: "fk_action_intents_workspace_metric_definition",
      columns: [table.workspaceId, table.metricDefinitionId],
      foreignColumns: [outcomeDefinitions.workspaceId, outcomeDefinitions.id],
    }),
    foreignKey({
      name: "fk_action_intents_workspace_creator_membership",
      columns: [table.workspaceId, table.createdBy],
      foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.userId],
    }),
    check("chk_action_intents_kind", sql`${table.actionKind} = 'email_test'`),
    check("chk_action_intents_truth_mode", sql`${table.truthMode} = 'TEST'`),
    check(
      "chk_action_intents_recipients_json",
      sql`json_valid(${table.recipientsJson}) AND json_type(${table.recipientsJson}) = 'array' AND json_array_length(${table.recipientsJson}) = ${table.cohortCap}`,
    ),
    check(
      "chk_action_intents_evidence_json",
      sql`json_valid(${table.evidenceIdsJson}) AND json_type(${table.evidenceIdsJson}) = 'array' AND json_array_length(${table.evidenceIdsJson}) > 0`,
    ),
    check(
      "chk_action_intents_canonical_json",
      sql`json_valid(${table.canonicalPayloadJson})`,
    ),
    check(
      "chk_action_intents_cohort_cap",
      sql`${table.cohortCap} BETWEEN 1 AND 3`,
    ),
    check("chk_action_intents_recipient_hash", hashCheck(table.recipientSetHash)),
    check("chk_action_intents_context_hash", hashCheck(table.contextManifestHash)),
    check("chk_action_intents_policy_hash", hashCheck(table.policyHash)),
    check("chk_action_intents_payload_hash", hashCheck(table.canonicalPayloadHash)),
    check(
      "chk_action_intents_expiry",
      sql`unixepoch(${table.expiresAt}) IS NOT NULL AND unixepoch(${table.expiresAt}) > unixepoch(${table.createdAt})`,
    ),
  ],
);

export const policyDecisions = sqliteTable(
  "policy_decisions",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    traceId: text("trace_id").notNull(),
    intentId: text("intent_id").notNull(),
    policyVersion: text("policy_version").notNull(),
    policyHash: text("policy_hash").notNull(),
    verdict: text("verdict", {
      enum: ["deny", "allow", "approval_required"],
    }).notNull(),
    reasonCodesJson: text("reason_codes_json").notNull(),
    evaluatedPayloadHash: text("evaluated_payload_hash").notNull(),
    evaluatedContextHash: text("evaluated_context_hash").notNull(),
    evaluatorVersion: text("evaluator_version").notNull(),
    decidedAt: text("decided_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_policy_decisions_workspace_id").on(
      table.workspaceId,
      table.id,
    ),
    uniqueIndex("idx_policy_decisions_intent_policy").on(
      table.workspaceId,
      table.intentId,
      table.policyHash,
    ),
    foreignKey({
      name: "fk_policy_decisions_workspace_trace",
      columns: [table.workspaceId, table.traceId],
      foreignColumns: [flightTraces.workspaceId, flightTraces.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_policy_decisions_workspace_intent",
      columns: [table.workspaceId, table.intentId],
      foreignColumns: [actionIntents.workspaceId, actionIntents.id],
    }).onDelete("cascade"),
    check(
      "chk_policy_decisions_verdict",
      sql`${table.verdict} IN ('deny', 'allow', 'approval_required')`,
    ),
    check(
      "chk_policy_decisions_reasons_json",
      sql`json_valid(${table.reasonCodesJson}) AND json_type(${table.reasonCodesJson}) = 'array' AND json_array_length(${table.reasonCodesJson}) > 0`,
    ),
    check("chk_policy_decisions_policy_hash", hashCheck(table.policyHash)),
    check("chk_policy_decisions_payload_hash", hashCheck(table.evaluatedPayloadHash)),
    check("chk_policy_decisions_context_hash", hashCheck(table.evaluatedContextHash)),
  ],
);

export const approvalGrants = sqliteTable(
  "approval_grants",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    traceId: text("trace_id").notNull(),
    intentId: text("intent_id").notNull(),
    policyDecisionId: text("policy_decision_id").notNull(),
    decision: text("decision", { enum: ["approved", "rejected"] }).notNull(),
    boundPayloadHash: text("bound_payload_hash").notNull(),
    boundContextHash: text("bound_context_hash").notNull(),
    boundPolicyHash: text("bound_policy_hash").notNull(),
    boundRecipientSetHash: text("bound_recipient_set_hash").notNull(),
    nonce: text("nonce").notNull(),
    expiresAt: text("expires_at").notNull(),
    approvedBy: text("approved_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    approvedAt: text("approved_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_approval_grants_workspace_id").on(
      table.workspaceId,
      table.id,
    ),
    uniqueIndex("idx_approval_grants_workspace_intent").on(
      table.workspaceId,
      table.intentId,
    ),
    uniqueIndex("idx_approval_grants_workspace_nonce").on(
      table.workspaceId,
      table.nonce,
    ),
    foreignKey({
      name: "fk_approval_grants_workspace_trace",
      columns: [table.workspaceId, table.traceId],
      foreignColumns: [flightTraces.workspaceId, flightTraces.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_approval_grants_workspace_intent",
      columns: [table.workspaceId, table.intentId],
      foreignColumns: [actionIntents.workspaceId, actionIntents.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_approval_grants_workspace_policy_decision",
      columns: [table.workspaceId, table.policyDecisionId],
      foreignColumns: [policyDecisions.workspaceId, policyDecisions.id],
    }),
    foreignKey({
      name: "fk_approval_grants_workspace_approver_membership",
      columns: [table.workspaceId, table.approvedBy],
      foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.userId],
    }),
    check(
      "chk_approval_grants_decision",
      sql`${table.decision} IN ('approved', 'rejected')`,
    ),
    check("chk_approval_grants_payload_hash", hashCheck(table.boundPayloadHash)),
    check("chk_approval_grants_context_hash", hashCheck(table.boundContextHash)),
    check("chk_approval_grants_policy_hash", hashCheck(table.boundPolicyHash)),
    check(
      "chk_approval_grants_recipient_hash",
      hashCheck(table.boundRecipientSetHash),
    ),
    check(
      "chk_approval_grants_expiry",
      sql`unixepoch(${table.expiresAt}) IS NOT NULL AND unixepoch(${table.approvedAt}) IS NOT NULL AND unixepoch(${table.expiresAt}) > unixepoch(${table.approvedAt})`,
    ),
  ],
);

export const effectAttempts = sqliteTable(
  "effect_attempts",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    traceId: text("trace_id").notNull(),
    intentId: text("intent_id").notNull(),
    approvalGrantId: text("approval_grant_id").notNull(),
    intendedEffectKey: text("intended_effect_key").notNull(),
    adapterKind: text("adapter_kind", { enum: ["email_test"] }).notNull(),
    providerMode: text("provider_mode", {
      enum: ["TEST", "FIXTURE"],
    }).notNull(),
    initialState: text("initial_state", { enum: ["reserved"] })
      .notNull()
      .default("reserved"),
    requestHash: text("request_hash").notNull(),
    reservedBy: text("reserved_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    reservedAt: text("reserved_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_effect_attempts_workspace_id").on(
      table.workspaceId,
      table.id,
    ),
    uniqueIndex("idx_effect_attempts_workspace_id_trace").on(
      table.workspaceId,
      table.id,
      table.traceId,
    ),
    uniqueIndex("idx_effect_attempts_intended_effect").on(
      table.workspaceId,
      table.intendedEffectKey,
    ),
    uniqueIndex("idx_effect_attempts_one_grant_use").on(
      table.workspaceId,
      table.approvalGrantId,
    ),
    foreignKey({
      name: "fk_effect_attempts_workspace_trace",
      columns: [table.workspaceId, table.traceId],
      foreignColumns: [flightTraces.workspaceId, flightTraces.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_effect_attempts_workspace_intent",
      columns: [table.workspaceId, table.intentId],
      foreignColumns: [actionIntents.workspaceId, actionIntents.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_effect_attempts_workspace_grant",
      columns: [table.workspaceId, table.approvalGrantId],
      foreignColumns: [approvalGrants.workspaceId, approvalGrants.id],
    }),
    foreignKey({
      name: "fk_effect_attempts_workspace_reserver_membership",
      columns: [table.workspaceId, table.reservedBy],
      foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.userId],
    }),
    check("chk_effect_attempts_adapter", sql`${table.adapterKind} = 'email_test'`),
    check(
      "chk_effect_attempts_provider_mode",
      sql`${table.providerMode} IN ('TEST', 'FIXTURE')`,
    ),
    check("chk_effect_attempts_initial_state", sql`${table.initialState} = 'reserved'`),
    check("chk_effect_attempts_request_hash", hashCheck(table.requestHash)),
    check(
      "chk_effect_attempts_reserved_time",
      sql`unixepoch(${table.reservedAt}) IS NOT NULL`,
    ),
  ],
);

export const effectAuthorityControlBindings = sqliteTable(
  "effect_authority_control_bindings",
  {
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    traceId: text("trace_id").notNull(),
    effectAttemptId: text("effect_attempt_id").notNull(),
    authorityControlEventId: text("authority_control_event_id").notNull(),
    authorityControlSequence: integer("authority_control_sequence").notNull(),
    authorityControlHash: text("authority_control_hash").notNull(),
    boundAt: text("bound_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.effectAttemptId] }),
    foreignKey({
      name: "fk_effect_authority_binding_effect",
      columns: [table.workspaceId, table.effectAttemptId, table.traceId],
      foreignColumns: [effectAttempts.workspaceId, effectAttempts.id, effectAttempts.traceId],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_effect_authority_binding_control",
      columns: [table.workspaceId, table.authorityControlEventId],
      foreignColumns: [workspaceAuthorityControlEvents.workspaceId, workspaceAuthorityControlEvents.id],
    }),
    check(
      "chk_effect_authority_binding_sequence",
      sql`${table.authorityControlSequence} >= 1`,
    ),
    check(
      "chk_effect_authority_binding_hash",
      hashCheck(table.authorityControlHash),
    ),
    check(
      "chk_effect_authority_binding_time",
      sql`unixepoch(${table.boundAt}) IS NOT NULL`,
    ),
  ],
);

export const effectAttemptEvents = sqliteTable(
  "effect_attempt_events",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    traceId: text("trace_id").notNull(),
    effectAttemptId: text("effect_attempt_id").notNull(),
    sequence: integer("sequence").notNull(),
    priorState: text("prior_state", {
      enum: [
        "reserved",
        "dispatching",
        "confirmed",
        "failed",
        "indeterminate",
        "reconciled_confirmed",
        "reconciled_failed",
      ],
    }),
    currentState: text("current_state", {
      enum: [
        "reserved",
        "dispatching",
        "confirmed",
        "failed",
        "indeterminate",
        "reconciled_confirmed",
        "reconciled_failed",
      ],
    }).notNull(),
    providerReceiptId: text("provider_receipt_id"),
    providerResponseHash: text("provider_response_hash"),
    errorCode: text("error_code"),
    payloadJson: text("payload_json").notNull().default("{}"),
    idempotencyKey: text("idempotency_key").notNull(),
    occurredAt: text("occurred_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_effect_attempt_events_workspace_id").on(
      table.workspaceId,
      table.id,
    ),
    uniqueIndex("idx_effect_attempt_events_sequence").on(
      table.workspaceId,
      table.effectAttemptId,
      table.sequence,
    ),
    uniqueIndex("idx_effect_attempt_events_idempotency").on(
      table.workspaceId,
      table.idempotencyKey,
    ),
    foreignKey({
      name: "fk_effect_attempt_events_workspace_trace",
      columns: [table.workspaceId, table.traceId],
      foreignColumns: [flightTraces.workspaceId, flightTraces.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_effect_attempt_events_workspace_attempt",
      columns: [table.workspaceId, table.effectAttemptId, table.traceId],
      foreignColumns: [
        effectAttempts.workspaceId,
        effectAttempts.id,
        effectAttempts.traceId,
      ],
    }).onDelete("cascade"),
    check("chk_effect_attempt_events_sequence", sql`${table.sequence} >= 1`),
    check(
      "chk_effect_attempt_events_prior_state",
      sql`${table.priorState} IS NULL OR ${table.priorState} IN ('reserved', 'dispatching', 'confirmed', 'failed', 'indeterminate', 'reconciled_confirmed', 'reconciled_failed')`,
    ),
    check(
      "chk_effect_attempt_events_current_state",
      sql`${table.currentState} IN ('reserved', 'dispatching', 'confirmed', 'failed', 'indeterminate', 'reconciled_confirmed', 'reconciled_failed')`,
    ),
    check(
      "chk_effect_attempt_events_payload_json",
      sql`json_valid(${table.payloadJson})`,
    ),
    check(
      "chk_effect_attempt_events_response_hash",
      sql`${table.providerResponseHash} IS NULL OR (${hashCheck(table.providerResponseHash)})`,
    ),
    check(
      "chk_effect_attempt_events_occurred_time",
      sql`unixepoch(${table.occurredAt}) IS NOT NULL`,
    ),
  ],
);

export const outcomeDefinitions = sqliteTable(
  "outcome_definitions",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    traceId: text("trace_id").notNull(),
    definitionKey: text("definition_key").notNull(),
    metricName: text("metric_name").notNull(),
    cohortJson: text("cohort_json").notNull(),
    cohortHash: text("cohort_hash").notNull(),
    baselineJson: text("baseline_json").notNull(),
    baselineHash: text("baseline_hash").notNull(),
    windowStartsAt: text("window_starts_at").notNull(),
    windowEndsAt: text("window_ends_at").notNull(),
    assessmentRuleJson: text("assessment_rule_json").notNull(),
    assessmentRuleHash: text("assessment_rule_hash").notNull(),
    registeredBy: text("registered_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    registeredAt: text("registered_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_outcome_definitions_workspace_id").on(
      table.workspaceId,
      table.id,
    ),
    uniqueIndex("idx_outcome_definitions_trace_key").on(
      table.workspaceId,
      table.traceId,
      table.definitionKey,
    ),
    foreignKey({
      name: "fk_outcome_definitions_workspace_trace",
      columns: [table.workspaceId, table.traceId],
      foreignColumns: [flightTraces.workspaceId, flightTraces.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_outcome_definitions_workspace_registrar_membership",
      columns: [table.workspaceId, table.registeredBy],
      foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.userId],
    }),
    check("chk_outcome_definitions_cohort_json", sql`json_valid(${table.cohortJson})`),
    check("chk_outcome_definitions_baseline_json", sql`json_valid(${table.baselineJson})`),
    check(
      "chk_outcome_definitions_rule_json",
      sql`json_valid(${table.assessmentRuleJson})`,
    ),
    check(
      "chk_outcome_definitions_window",
      sql`unixepoch(${table.windowStartsAt}) IS NOT NULL AND unixepoch(${table.windowEndsAt}) IS NOT NULL AND unixepoch(${table.windowStartsAt}) < unixepoch(${table.windowEndsAt})`,
    ),
    check("chk_outcome_definitions_cohort_hash", hashCheck(table.cohortHash)),
    check("chk_outcome_definitions_baseline_hash", hashCheck(table.baselineHash)),
    check(
      "chk_outcome_definitions_rule_hash",
      hashCheck(table.assessmentRuleHash),
    ),
  ],
);

export const outcomeObservations = sqliteTable(
  "outcome_observations",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    traceId: text("trace_id").notNull(),
    definitionId: text("definition_id").notNull(),
    sourceEvidenceId: text("source_evidence_id").notNull(),
    observationKey: text("observation_key").notNull(),
    truthMode: text("truth_mode", {
      enum: ["LIVE", "TEST", "FIXTURE"],
    }).notNull(),
    signatureStatus: text("signature_status", {
      enum: ["verified", "fixture", "invalid"],
    }).notNull(),
    valueJson: text("value_json").notNull(),
    valueHash: text("value_hash").notNull(),
    observedAt: text("observed_at").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_outcome_observations_workspace_id").on(
      table.workspaceId,
      table.id,
    ),
    uniqueIndex("idx_outcome_observations_definition_key").on(
      table.workspaceId,
      table.definitionId,
      table.observationKey,
    ),
    foreignKey({
      name: "fk_outcome_observations_workspace_trace",
      columns: [table.workspaceId, table.traceId],
      foreignColumns: [flightTraces.workspaceId, flightTraces.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_outcome_observations_workspace_definition",
      columns: [table.workspaceId, table.definitionId],
      foreignColumns: [outcomeDefinitions.workspaceId, outcomeDefinitions.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_outcome_observations_workspace_evidence",
      columns: [table.workspaceId, table.sourceEvidenceId],
      foreignColumns: [flightEvidence.workspaceId, flightEvidence.id],
    }),
    check(
      "chk_outcome_observations_truth_mode",
      sql`${table.truthMode} IN ('LIVE', 'TEST', 'FIXTURE')`,
    ),
    check(
      "chk_outcome_observations_signature",
      sql`${table.signatureStatus} IN ('verified', 'fixture', 'invalid')`,
    ),
    check(
      "chk_outcome_observations_truth_signature",
      sql`(${table.truthMode} = 'FIXTURE' AND ${table.signatureStatus} IN ('fixture', 'invalid')) OR (${table.truthMode} IN ('LIVE', 'TEST') AND ${table.signatureStatus} IN ('verified', 'invalid'))`,
    ),
    check("chk_outcome_observations_value_json", sql`json_valid(${table.valueJson})`),
    check("chk_outcome_observations_value_hash", hashCheck(table.valueHash)),
    check(
      "chk_outcome_observations_observed_time",
      sql`unixepoch(${table.observedAt}) IS NOT NULL`,
    ),
  ],
);

export const outcomeAssessments = sqliteTable(
  "outcome_assessments",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    traceId: text("trace_id").notNull(),
    definitionId: text("definition_id").notNull(),
    assessmentVersion: integer("assessment_version").notNull(),
    label: text("label", {
      enum: ["supported", "unsupported", "correlated", "inconclusive"],
    }).notNull(),
    evidenceIdsJson: text("evidence_ids_json").notNull(),
    limitationsJson: text("limitations_json").notNull(),
    rationaleSummary: text("rationale_summary").notNull(),
    contentHash: text("content_hash").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_outcome_assessments_workspace_id").on(
      table.workspaceId,
      table.id,
    ),
    uniqueIndex("idx_outcome_assessments_workspace_id_trace_definition").on(
      table.workspaceId,
      table.id,
      table.traceId,
      table.definitionId,
    ),
    uniqueIndex("idx_outcome_assessments_definition_version").on(
      table.workspaceId,
      table.definitionId,
      table.assessmentVersion,
    ),
    foreignKey({
      name: "fk_outcome_assessments_workspace_trace",
      columns: [table.workspaceId, table.traceId],
      foreignColumns: [flightTraces.workspaceId, flightTraces.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_outcome_assessments_workspace_definition",
      columns: [table.workspaceId, table.definitionId],
      foreignColumns: [outcomeDefinitions.workspaceId, outcomeDefinitions.id],
    }).onDelete("cascade"),
    check("chk_outcome_assessments_version", sql`${table.assessmentVersion} >= 1`),
    check(
      "chk_outcome_assessments_label",
      sql`${table.label} IN ('supported', 'unsupported', 'correlated', 'inconclusive')`,
    ),
    check(
      "chk_outcome_assessments_evidence_json",
      sql`json_valid(${table.evidenceIdsJson}) AND json_type(${table.evidenceIdsJson}) = 'array' AND json_array_length(${table.evidenceIdsJson}) > 0`,
    ),
    check(
      "chk_outcome_assessments_limitations_json",
      sql`json_valid(${table.limitationsJson}) AND json_type(${table.limitationsJson}) = 'array' AND json_array_length(${table.limitationsJson}) > 0`,
    ),
    check("chk_outcome_assessments_content_hash", hashCheck(table.contentHash)),
  ],
);

export const outcomeAssessmentSupersessions = sqliteTable(
  "outcome_assessment_supersessions",
  {
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    traceId: text("trace_id").notNull(),
    definitionId: text("definition_id").notNull(),
    priorAssessmentId: text("prior_assessment_id").notNull(),
    currentAssessmentId: text("current_assessment_id").notNull(),
    reason: text("reason").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.currentAssessmentId] }),
    foreignKey({
      name: "fk_outcome_supersessions_workspace_prior",
      columns: [
        table.workspaceId,
        table.priorAssessmentId,
        table.traceId,
        table.definitionId,
      ],
      foreignColumns: [
        outcomeAssessments.workspaceId,
        outcomeAssessments.id,
        outcomeAssessments.traceId,
        outcomeAssessments.definitionId,
      ],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_outcome_supersessions_workspace_current",
      columns: [
        table.workspaceId,
        table.currentAssessmentId,
        table.traceId,
        table.definitionId,
      ],
      foreignColumns: [
        outcomeAssessments.workspaceId,
        outcomeAssessments.id,
        outcomeAssessments.traceId,
        outcomeAssessments.definitionId,
      ],
    }).onDelete("cascade"),
    check(
      "chk_outcome_supersessions_distinct",
      sql`${table.priorAssessmentId} <> ${table.currentAssessmentId}`,
    ),
  ],
);

export const flightTraceEvents = sqliteTable(
  "flight_trace_events",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    traceId: text("trace_id").notNull(),
    sequence: integer("sequence").notNull(),
    eventType: text("event_type").notNull(),
    subjectType: text("subject_type", {
      enum: [
        "trace",
        "context",
        "graph",
        "intent",
        "policy",
        "approval",
        "effect",
        "outcome",
      ],
    }).notNull(),
    subjectId: text("subject_id").notNull(),
    priorState: text("prior_state"),
    currentState: text("current_state").notNull(),
    actorType: text("actor_type", {
      enum: ["human", "system", "agent", "adapter"],
    }).notNull(),
    actorId: text("actor_id"),
    payloadJson: text("payload_json").notNull().default("{}"),
    payloadHash: text("payload_hash").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    occurredAt: text("occurred_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_flight_trace_events_workspace_id").on(
      table.workspaceId,
      table.id,
    ),
    uniqueIndex("idx_flight_trace_events_sequence").on(
      table.workspaceId,
      table.traceId,
      table.sequence,
    ),
    uniqueIndex("idx_flight_trace_events_idempotency").on(
      table.workspaceId,
      table.idempotencyKey,
    ),
    index("idx_flight_trace_events_subject").on(
      table.workspaceId,
      table.subjectType,
      table.subjectId,
    ),
    foreignKey({
      name: "fk_flight_trace_events_workspace_trace",
      columns: [table.workspaceId, table.traceId],
      foreignColumns: [flightTraces.workspaceId, flightTraces.id],
    }).onDelete("cascade"),
    check("chk_flight_trace_events_sequence", sql`${table.sequence} >= 1`),
    check(
      "chk_flight_trace_events_subject_type",
      sql`${table.subjectType} IN ('trace', 'context', 'graph', 'intent', 'policy', 'approval', 'effect', 'outcome')`,
    ),
    check(
      "chk_flight_trace_events_actor_type",
      sql`${table.actorType} IN ('human', 'system', 'agent', 'adapter')`,
    ),
    check("chk_flight_trace_events_payload_json", sql`json_valid(${table.payloadJson})`),
    check("chk_flight_trace_events_payload_hash", hashCheck(table.payloadHash)),
    check(
      "chk_flight_trace_events_occurred_time",
      sql`unixepoch(${table.occurredAt}) IS NOT NULL`,
    ),
  ],
);
