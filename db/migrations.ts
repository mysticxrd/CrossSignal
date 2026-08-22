import { getD1 } from ".";

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
  "idx_reasoning_artifacts_workspace_id",
  "idx_reasoning_artifacts_node_kind",
  "idx_action_intents_workspace_id",
  "idx_action_intents_trace_key",
  "idx_action_intents_workspace_payload",
  "idx_action_intents_workspace_nonce",
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

  // Stage 02 transition, binding, immutability, deletion, and sequence guards.
  "trg_flight_traces_identity_immutable",
  "trg_flight_traces_transition",
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
  "trg_reasoning_nodes_transition",
  "trg_reasoning_nodes_delete_guard",
  "trg_reasoning_artifacts_immutable",
  "trg_reasoning_artifacts_bindings",
  "trg_reasoning_artifacts_delete_guard",
  "trg_action_intents_immutable",
  "trg_action_intents_delete_guard",
  "trg_action_intents_bindings",
  "trg_action_intents_canonical_binding",
  "trg_policy_decisions_immutable",
  "trg_policy_decisions_delete_guard",
  "trg_policy_decisions_bind_intent",
  "trg_approval_grants_immutable",
  "trg_approval_grants_delete_guard",
  "trg_approval_grants_bind_authority",
  "trg_effect_attempts_immutable",
  "trg_effect_attempts_delete_guard",
  "trg_effect_attempts_bind_grant",
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
] as const;

let compatibilityReady: Promise<void> | null = null;

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
}

export function ensureDatabaseCompatibility(): Promise<void> {
  compatibilityReady ??= verifyCheckedInMigrations().catch((error) => {
    compatibilityReady = null;
    throw error;
  });
  return compatibilityReady;
}
