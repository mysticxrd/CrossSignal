import { getD1 } from ".";
import {
  sealAuthorityControlEvent,
  sealCanonical,
  stableStringify,
  validatePersistedAuthorityControlEvent,
  type AuthorityControlEvent,
} from "./flight-recorder-contracts";

const REQUIRED_SCHEMA_OBJECTS = [
  // Durable product baseline.
  "users",
  "workspaces",
  "workspace_members",
  "cases",
  "case_events",
  "approvals",
  "evidence_observations",
  "case_evidence",
  "idx_cases_workspace_id",
  "idx_evidence_observations_workspace_id",
  "trg_evidence_observations_immutable",

  // Stage 02 tables. Runtime access requires the complete chain of custody,
  // including authority controls and explicit supersession records.
  "workspace_authority_controls",
  "workspace_authority_control_events",
  "effect_authority_control_bindings",
  "flight_traces",
  "flight_evidence",
  "context_snapshots",
  "context_snapshot_sources",
  "context_snapshot_supersessions",
  "reasoning_nodes",
  "reasoning_artifacts",
  "outcome_definitions",
  "action_intents",
  "policy_decisions",
  "approval_grants",
  "effect_attempts",
  "effect_attempt_events",
  "outcome_observations",
  "outcome_assessments",
  "outcome_assessment_supersessions",
  "flight_trace_events",

  // Stage 02 identity, tenant, idempotency, and one-time-authority indexes.
  "idx_flight_traces_workspace_key",
  "idx_flight_traces_workspace_id",
  "idx_flight_traces_workspace_state",
  "idx_flight_traces_workspace_active_intent",
  "idx_flight_evidence_workspace_id",
  "idx_flight_evidence_trace_key",
  "idx_flight_evidence_idempotency",
  "idx_context_snapshots_workspace_id",
  "idx_context_snapshots_workspace_id_trace",
  "idx_context_snapshots_trace_key",
  "idx_context_snapshots_workspace_manifest",
  "idx_context_sources_snapshot_source",
  "idx_reasoning_nodes_workspace_id",
  "idx_reasoning_nodes_trace_identity",
  "idx_reasoning_nodes_logical_attempt",
  "idx_reasoning_nodes_active",
  "idx_reasoning_nodes_running",
  "idx_reasoning_nodes_succeeded",
  "idx_reasoning_artifacts_workspace_id",
  "idx_reasoning_artifacts_node_kind",
  "idx_action_intents_workspace_id",
  "idx_action_intents_trace_key",
  "idx_action_intents_workspace_payload",
  "idx_action_intents_workspace_nonce",
  "idx_action_intents_one_successor",
  "idx_policy_decisions_workspace_id",
  "idx_policy_decisions_intent_policy",
  "idx_approval_grants_workspace_id",
  "idx_approval_grants_workspace_intent",
  "idx_approval_grants_workspace_nonce",
  "idx_effect_attempts_workspace_id",
  "idx_effect_attempts_workspace_id_trace",
  "idx_effect_attempts_intended_effect",
  "idx_effect_attempts_one_grant_use",
  "idx_effect_attempt_events_workspace_id",
  "idx_effect_attempt_events_sequence",
  "idx_effect_attempt_events_idempotency",
  "idx_outcome_definitions_workspace_id",
  "idx_outcome_definitions_trace_key",
  "idx_outcome_observations_workspace_id",
  "idx_outcome_observations_definition_key",
  "idx_outcome_assessments_workspace_id",
  "idx_outcome_assessments_workspace_id_trace_definition",
  "idx_outcome_assessments_definition_version",
  "idx_flight_trace_events_workspace_id",
  "idx_flight_trace_events_sequence",
  "idx_flight_trace_events_idempotency",
  "idx_flight_trace_events_subject",
  "idx_authority_control_events_workspace_id",
  "idx_authority_control_events_sequence",
  "idx_authority_control_events_idempotency",
  "idx_authority_control_events_head",

  // Stage 02 transition, binding, immutability, deletion, and sequence guards.
  "trg_flight_traces_identity_immutable",
  "trg_flight_traces_transition",
  "trg_flight_traces_active_intent_transition",
  "trg_flight_traces_required_active_intent",
  "trg_flight_traces_delete_guard",
  "trg_flight_evidence_immutable",
  "trg_flight_evidence_delete_guard",
  "trg_context_snapshots_identity_immutable",
  "trg_context_snapshots_transition",
  "trg_context_snapshots_delete_guard",
  "trg_context_snapshot_sources_immutable",
  "trg_context_snapshot_sources_bind_manifest",
  "trg_context_snapshot_sources_delete_guard",
  "trg_context_supersessions_bindings",
  "trg_context_supersessions_immutable",
  "trg_context_supersessions_delete_guard",
  "trg_reasoning_nodes_identity_immutable",
  "trg_l06_reasoning_nodes_input_immutable",
  "trg_reasoning_nodes_transition",
  "trg_l06_reasoning_nodes_runtime_insert",
  "trg_reasoning_nodes_delete_guard",
  "trg_reasoning_artifacts_immutable",
  "trg_reasoning_artifacts_bindings",
  "trg_l06_reasoning_artifact_runtime_contract",
  "trg_l06_reasoning_artifact_scope",
  "trg_l06_action_intent_graph_complete",
  "trg_l06_trace_reasoning_handoff",
  "trg_reasoning_artifacts_delete_guard",
  "trg_action_intents_immutable",
  "trg_action_intents_delete_guard",
  "trg_action_intents_bindings",
  "trg_action_intents_canonical_binding",
  "trg_policy_decisions_immutable",
  "trg_policy_decisions_delete_guard",
  "trg_policy_decisions_bind_intent",
  "trg_policy_decisions_activate_intent",
  "trg_approval_grants_immutable",
  "trg_approval_grants_delete_guard",
  "trg_approval_grants_bind_authority",
  "trg_approval_grants_bind_active_intent",
  "trg_effect_attempts_immutable",
  "trg_effect_attempts_delete_guard",
  "trg_effect_attempts_bind_grant",
  "trg_effect_attempts_bind_active_intent",
  "trg_effect_attempt_events_append_only",
  "trg_effect_attempt_events_delete_guard",
  "trg_effect_attempt_events_attempt_binding",
  "trg_effect_attempt_events_transition",
  "trg_outcome_definitions_immutable",
  "trg_outcome_definitions_delete_guard",
  "trg_outcome_observations_immutable",
  "trg_outcome_observations_delete_guard",
  "trg_outcome_observations_bindings",
  "trg_outcome_assessments_immutable",
  "trg_outcome_assessments_delete_guard",
  "trg_outcome_assessments_bindings",
  "trg_outcome_supersessions_bindings",
  "trg_outcome_supersessions_immutable",
  "trg_outcome_supersessions_delete_guard",
  "trg_flight_trace_events_append_only",
  "trg_flight_trace_events_delete_guard",
  "trg_flight_trace_events_sequence",
  "trg_flight_trace_events_subject_binding",
  "trg_flight_trace_events_transition",
  "trg_flight_trace_events_executing_projection",
  "trg_l04_authority_events_append_only",
  "trg_l04_authority_events_delete_guard",
  "trg_l04_authority_events_sequence",
  "trg_l04_authority_events_actor",
  "trg_l04_legacy_authority_control_frozen",
  "trg_l04_legacy_authority_control_frozen_delete",
  "trg_l04_effect_authority_bindings_immutable",
  "trg_l04_effect_authority_bindings_delete_guard",
  "trg_l04_effect_authority_binding_exact",
  "trg_l04_effect_reserved_requires_authority",
  "trg_l04_trace_executing_requires_authority",
] as const;

let compatibilityReady: Promise<void> | null = null;
let compatibilityDatabase: unknown = null;

async function verifyCheckedInMigrations(): Promise<void> {
  const d1 = getD1();

  await d1.prepare("PRAGMA foreign_keys = ON").run();
  const foreignKeys = await d1
    .prepare("PRAGMA foreign_keys")
    .first<{ foreign_keys: number }>();
  if (Number(foreignKeys?.foreign_keys) !== 1) {
    throw new Error("D1 foreign-key enforcement is unavailable.");
  }

  const missing: string[] = [];
  for (let start = 0; start < REQUIRED_SCHEMA_OBJECTS.length; start += 32) {
    const expected = REQUIRED_SCHEMA_OBJECTS.slice(start, start + 32);
    const placeholders = expected.map(() => "?").join(", ");
    const result = await d1
      .prepare(`SELECT name FROM sqlite_schema WHERE name IN (${placeholders})`)
      .bind(...expected)
      .all<{ name: string }>();
    const present = new Set(
      result.results.map((row: { name: string }) => row.name),
    );
    missing.push(...expected.filter((name) => !present.has(name)));
  }

  if (missing.length > 0) {
    throw new Error(
      `Database schema is not ready. Apply the checked-in Drizzle migrations; missing: ${missing.join(", ")}.`,
    );
  }

  const [traceColumns, intentColumns, reasoningColumns] = await Promise.all([
    d1.prepare("PRAGMA table_info('flight_traces')").all<{ name: string }>(),
    d1.prepare("PRAGMA table_info('action_intents')").all<{ name: string }>(),
    d1.prepare("PRAGMA table_info('reasoning_nodes')").all<{ name: string }>(),
  ]);
  if (!traceColumns.results.some((column: { name: string }) => column.name === "active_intent_id")) {
    throw new Error("Database schema is not ready. Apply migration 0006; missing: flight_traces.active_intent_id.");
  }
  if (!intentColumns.results.some((column: { name: string }) => column.name === "supersedes_intent_id")) {
    throw new Error("Database schema is not ready. Apply migration 0006; missing: action_intents.supersedes_intent_id.");
  }
  for (const name of [
    "logical_node_id",
    "graph_version",
    "execution_mode",
    "handler_version",
    "predecessor_outputs_json",
    "lease_token",
    "lease_expires_at",
    "completion_token_hash",
  ]) {
    if (!reasoningColumns.results.some((column: { name: string }) => column.name === name)) {
      throw new Error(`Database schema is not ready. Apply migration 0007; missing: reasoning_nodes.${name}.`);
    }
  }

  await backfillLegacyAuthorityControls();
}

type LegacyAuthorityRow = {
  workspace_id: string;
  kill_switch_engaged: number;
  updated_by: string;
  updated_at: string;
  membership_user_id: string | null;
};

type StoredAuthorityRow = {
  id: string;
  workspace_id: string;
  sequence: number;
  control_kind: "kill_switch";
  prior_state: number | null;
  current_state: number;
  actor_user_id: string;
  reason_code: AuthorityControlEvent["reasonCode"];
  idempotency_key: string;
  payload_json: string;
  content_hash: string;
  occurred_at: string;
};

function mapStoredAuthority(row: StoredAuthorityRow): AuthorityControlEvent {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    sequence: row.sequence,
    controlKind: row.control_kind,
    priorState: row.prior_state === null ? null : row.prior_state === 1,
    currentState: row.current_state === 1,
    actorUserId: row.actor_user_id,
    reasonCode: row.reason_code,
    idempotencyKey: row.idempotency_key,
    payloadJson: row.payload_json,
    contentHash: row.content_hash,
    occurredAt: row.occurred_at,
  };
}

async function backfillLegacyAuthorityControls(): Promise<void> {
  const d1 = getD1();
  const legacy = await d1.prepare(`SELECT controls.workspace_id, controls.kill_switch_engaged,
      controls.updated_by, controls.updated_at, member.user_id AS membership_user_id
    FROM workspace_authority_controls controls
    LEFT JOIN workspace_members member
      ON member.workspace_id = controls.workspace_id AND member.user_id = controls.updated_by
    ORDER BY controls.workspace_id`).all<LegacyAuthorityRow>();

  for (const row of legacy.results) {
    if ((row.kill_switch_engaged !== 0 && row.kill_switch_engaged !== 1)
      || row.membership_user_id !== row.updated_by
      || !Number.isFinite(Date.parse(row.updated_at))) {
      throw new Error("migration_l04_invalid_authority_history");
    }
    const identity = await sealCanonical({ kind: "migration", workspaceId: row.workspace_id });
    const expected = await sealAuthorityControlEvent({
      id: `authority_control_${identity.sha256.slice(0, 24)}`,
      workspaceId: row.workspace_id,
      sequence: 1,
      priorState: null,
      currentState: row.kill_switch_engaged === 1,
      actorUserId: row.updated_by,
      reasonCode: "migration_backfill",
      idempotencyKey: `l04:migration:${row.workspace_id}:kill_switch`,
      occurredAt: row.updated_at,
    });

    await d1.prepare(`INSERT OR IGNORE INTO workspace_authority_control_events (
      id, workspace_id, sequence, control_kind, prior_state, current_state,
      actor_user_id, reason_code, idempotency_key, payload_json, content_hash, occurred_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        expected.id,
        expected.workspaceId,
        expected.sequence,
        expected.controlKind,
        expected.priorState,
        expected.currentState ? 1 : 0,
        expected.actorUserId,
        expected.reasonCode,
        expected.idempotencyKey,
        expected.payloadJson,
        expected.contentHash,
        expected.occurredAt,
      ).run();

    const stored = await d1.prepare(`SELECT id, workspace_id, sequence, control_kind,
        prior_state, current_state, actor_user_id, reason_code, idempotency_key,
        payload_json, content_hash, occurred_at
      FROM workspace_authority_control_events
      WHERE workspace_id = ? AND sequence = 1`).bind(row.workspace_id).first<StoredAuthorityRow>();
    if (!stored) throw new Error("migration_l04_invalid_authority_history");
    const mapped = mapStoredAuthority(stored);
    const validationErrors = await validatePersistedAuthorityControlEvent(mapped);
    if (validationErrors.length > 0) throw new Error("migration_l04_invalid_authority_history");
    if (stableStringify(mapped) !== stableStringify(expected)) {
      throw new Error("migration_l04_ambiguous_authority_history");
    }
  }
}

export function ensureDatabaseCompatibility(): Promise<void> {
  const database = getD1();
  if (compatibilityDatabase !== database) {
    compatibilityDatabase = database;
    compatibilityReady = null;
  }
  compatibilityReady ??= verifyCheckedInMigrations().catch((error) => {
    if (compatibilityDatabase === database) compatibilityReady = null;
    throw error;
  });
  return compatibilityReady;
}
