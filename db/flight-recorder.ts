import type {
  ExecutionScenario,
  FlightRecorderSnapshot,
} from "../app/flight-recorder-types";
import {
  assertExecutionAuthority,
  sealCanonical,
  stableStringify,
  validatePersistedActionIntent,
} from "./flight-recorder-contracts";
import {
  buildDemoIntent,
  buildPendingFlightRecorderDemo,
  STAGE_03_FIXTURE_KEY,
  STAGE_03_SPENDING_CAP_USD,
  STAGE_03_TRACE_KEY,
} from "./flight-recorder-demo";
import { getD1 } from ".";
import { ensureDatabaseCompatibility } from "./migrations";
import { ownerCanAccessWorkspace } from "./workspaces";

type TraceRow = {
  id: string;
  workspace_id: string;
  trace_key: string;
  current_state: FlightRecorderSnapshot["traceState"];
  active_intent_id: string | null;
  truth_mode: "FIXTURE";
};

type IntentRow = {
  id: string;
  workspace_id: string;
  trace_id: string;
  context_snapshot_id: string;
  source_artifact_id: string;
  supersedes_intent_id: string | null;
  intent_key: string;
  action_kind: "email_test";
  truth_mode: "TEST";
  recipients_json: string;
  recipient_set_hash: string;
  subject: string;
  body: string;
  cohort_cap: number;
  evidence_ids_json: string;
  metric_definition_id: string;
  context_manifest_hash: string;
  policy_version: string;
  policy_hash: string;
  nonce: string;
  expires_at: string;
  canonical_payload_json: string;
  canonical_payload_hash: string;
  created_by: string;
};

type PolicyRow = {
  id: string;
  workspace_id: string;
  intent_id: string;
  policy_hash: string;
  verdict: "approval_required";
  evaluated_payload_hash: string;
  evaluated_context_hash: string;
  evaluator_version: string;
};

type GrantRow = {
  id: string;
  decision: "approved" | "rejected";
  approved_at: string;
  approved_by: string;
  expires_at: string;
  bound_payload_hash: string;
  bound_context_hash: string;
  bound_policy_hash: string;
  bound_recipient_set_hash: string;
  nonce: string;
};

let authorizationBeforeWriteBarrier: (() => Promise<void>) | null = null;
let replacementBeforeWriteBarrier: (() => Promise<void>) | null = null;

export function installAuthorizationRaceBarrierForTest(
  barrier: (() => Promise<void>) | null,
): () => void {
  authorizationBeforeWriteBarrier = barrier;
  return () => {
    authorizationBeforeWriteBarrier = null;
  };
}

export function installReplacementRaceBarrierForTest(
  barrier: (() => Promise<void>) | null,
): () => void {
  replacementBeforeWriteBarrier = barrier;
  return () => {
    replacementBeforeWriteBarrier = null;
  };
}

function parseStringArray(value: string, field: string): string[] {
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string")) {
    throw new Error(`Stored ${field} is invalid.`);
  }
  return parsed;
}

function intentVersion(intentKey: string): number {
  const match = intentKey.match(/-v(\d+)$/);
  return match ? Number(match[1]) : 1;
}

function toPersistedIntent(row: IntentRow) {
  return {
    workspaceId: row.workspace_id,
    traceId: row.trace_id,
    contextSnapshotId: row.context_snapshot_id,
    sourceArtifactId: row.source_artifact_id,
    intentKey: row.intent_key,
    actionKind: row.action_kind,
    truthMode: row.truth_mode,
    recipients: parseStringArray(row.recipients_json, "intent recipients"),
    recipientSetHash: row.recipient_set_hash,
    subject: row.subject,
    body: row.body,
    cohortCap: Number(row.cohort_cap),
    evidenceIds: parseStringArray(row.evidence_ids_json, "intent evidence"),
    metricDefinitionId: row.metric_definition_id,
    contextManifestHash: row.context_manifest_hash,
    policyVersion: row.policy_version,
    policyHash: row.policy_hash,
    nonce: row.nonce,
    expiresAt: row.expires_at,
    createdBy: row.created_by,
    canonicalPayloadJson: row.canonical_payload_json,
    canonicalPayloadHash: row.canonical_payload_hash,
  };
}

async function requireOwner(userId: string, workspaceId: string): Promise<void> {
  await ensureDatabaseCompatibility();
  if (!(await ownerCanAccessWorkspace(userId, workspaceId))) {
    throw new Error("Workspace access was denied.");
  }
}

async function findTrace(workspaceId: string): Promise<TraceRow | null> {
  return getD1()
    .prepare(`SELECT id, workspace_id, trace_key, current_state, active_intent_id, truth_mode
      FROM flight_traces
      WHERE workspace_id = ? AND fixture_key = ? AND trace_key = ?
      LIMIT 1`)
    .bind(workspaceId, STAGE_03_FIXTURE_KEY, STAGE_03_TRACE_KEY)
    .first<TraceRow>();
}

function sourceInsert(demo: Awaited<ReturnType<typeof buildPendingFlightRecorderDemo>>) {
  const d1 = getD1();
  return demo.evidence.flatMap((item) => [
    d1
      .prepare(`INSERT INTO flight_evidence (
        id, workspace_id, trace_id, evidence_key, truth_mode, source_kind,
        source_version, source_ref, captured_at, payload_json, content_hash,
        idempotency_key, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        item.id,
        item.workspaceId,
        item.traceId,
        item.evidenceKey,
        item.truthMode,
        item.sourceKind,
        item.sourceVersion,
        item.sourceRef,
        item.capturedAt,
        item.payloadJson,
        item.contentHash,
        item.idempotencyKey,
        item.createdBy,
      ),
    d1
      .prepare(`INSERT INTO context_snapshot_sources (
        workspace_id, snapshot_id, position, source_id, source_kind,
        source_version, source_ref, content_hash, access_decision, retrieval_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        item.workspaceId,
        demo.contextSnapshot.id,
        item.contextSource.position,
        item.contextSource.sourceId,
        item.contextSource.sourceKind,
        item.contextSource.sourceVersion,
        item.contextSource.sourceRef,
        item.contextSource.contentHash,
        item.contextSource.accessDecision,
        stableStringify(item.contextSource.retrieval),
      ),
  ]);
}

async function materializePendingDemo(userId: string, workspaceId: string): Promise<void> {
  if (await findTrace(workspaceId)) return;
  const d1 = getD1();
  const demo = await buildPendingFlightRecorderDemo({ userId, workspaceId });
  const statements = [
    d1
      .prepare(`INSERT OR IGNORE INTO workspace_authority_controls (
        workspace_id, kill_switch_engaged, updated_by, updated_at
      ) VALUES (?, 0, ?, ?)`)
      .bind(workspaceId, userId, demo.now),
    d1
      .prepare(`INSERT INTO flight_traces (
        id, workspace_id, trace_key, fixture_key, truth_mode, current_state,
        retention_class, retention_until, created_by
      ) VALUES (?, ?, ?, ?, ?, 'collecting', ?, ?, ?)`)
      .bind(
        demo.trace.id,
        workspaceId,
        demo.trace.traceKey,
        demo.trace.fixtureKey,
        demo.trace.truthMode,
        demo.trace.retentionClass,
        demo.trace.retentionUntil,
        userId,
      ),
    d1
      .prepare(`INSERT INTO context_snapshots (
        id, workspace_id, trace_id, snapshot_key, truth_mode, current_state,
        source_count, ordered_manifest_json, manifest_hash, created_by, frozen_at
      ) VALUES (?, ?, ?, ?, ?, 'collecting', ?, ?, ?, ?, NULL)`)
      .bind(
        demo.contextSnapshot.id,
        workspaceId,
        demo.trace.id,
        demo.contextSnapshot.snapshotKey,
        demo.contextSnapshot.truthMode,
        demo.contextSnapshot.sourceCount,
        demo.contextSnapshot.orderedManifestJson,
        demo.contextSnapshot.manifestHash,
        userId,
      ),
    ...sourceInsert(demo),
    d1
      .prepare(`UPDATE context_snapshots
        SET current_state = 'frozen', frozen_at = ?
        WHERE id = ? AND workspace_id = ? AND current_state = 'collecting'`)
      .bind(demo.contextSnapshot.frozenAt, demo.contextSnapshot.id, workspaceId),
    d1
      .prepare(`UPDATE flight_traces SET current_state = 'context_frozen', updated_at = ?
        WHERE id = ? AND workspace_id = ? AND current_state = 'collecting'`)
      .bind(demo.now, demo.trace.id, workspaceId),
  ];

  for (const { node, artifact } of demo.reasoningNodes) {
    statements.push(
      d1
        .prepare(`INSERT INTO reasoning_nodes (
          id, workspace_id, trace_id, node_key, attempt, current_state,
          input_hash, output_hash, error_code, started_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, 'pending', ?, NULL, NULL, NULL, NULL)`)
        .bind(
          node.id,
          workspaceId,
          demo.trace.id,
          node.nodeKey,
          node.attempt,
          node.inputHash,
        ),
      d1
        .prepare(`UPDATE reasoning_nodes
          SET current_state = 'running', started_at = ?, updated_at = ?
          WHERE id = ? AND workspace_id = ? AND current_state = 'pending'`)
        .bind(node.startedAt, node.startedAt, node.id, workspaceId),
      d1
        .prepare(`UPDATE reasoning_nodes
          SET current_state = 'succeeded', output_hash = ?, completed_at = ?, updated_at = ?
          WHERE id = ? AND workspace_id = ? AND current_state = 'running'`)
        .bind(node.outputHash, node.completedAt, node.completedAt, node.id, workspaceId),
      d1
        .prepare(`INSERT INTO reasoning_artifacts (
          id, workspace_id, trace_id, node_id, artifact_kind, schema_version,
          content_json, content_hash, evidence_citations_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(
          artifact.id,
          workspaceId,
          demo.trace.id,
          artifact.nodeId,
          artifact.artifactKind,
          artifact.schemaVersion,
          artifact.contentJson,
          artifact.contentHash,
          artifact.evidenceCitationsJson,
        ),
    );
  }

  const definition = demo.outcomeDefinition;
  const intent = demo.intentBundle.intent;
  const policy = demo.intentBundle.policyDecision;
  statements.push(
    d1
      .prepare(`UPDATE flight_traces SET current_state = 'reasoning', updated_at = ?
        WHERE id = ? AND workspace_id = ? AND current_state = 'context_frozen'`)
      .bind(demo.now, demo.trace.id, workspaceId),
    d1
      .prepare(`INSERT INTO outcome_definitions (
        id, workspace_id, trace_id, definition_key, metric_name, cohort_json,
        cohort_hash, baseline_json, baseline_hash, window_starts_at,
        window_ends_at, assessment_rule_json, assessment_rule_hash,
        registered_by, registered_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        definition.id,
        workspaceId,
        demo.trace.id,
        definition.definitionKey,
        definition.metricName,
        definition.cohortJson,
        definition.cohortHash,
        definition.baselineJson,
        definition.baselineHash,
        definition.windowStartsAt,
        definition.windowEndsAt,
        definition.assessmentRuleJson,
        definition.assessmentRuleHash,
        userId,
        definition.registeredAt,
      ),
    intentStatement(intent, null),
    policyStatement(policy),
    d1
      .prepare(`UPDATE flight_traces SET current_state = 'awaiting_approval', updated_at = ?
        WHERE id = ? AND workspace_id = ? AND current_state = 'reasoning'`)
      .bind(policy.decidedAt, demo.trace.id, workspaceId),
  );
  for (const event of demo.flightTraceEvents) statements.push(traceEventStatement(event));
  await d1.batch(statements);
}

function intentStatement(
  intent: Awaited<ReturnType<typeof buildDemoIntent>>["intent"],
  supersedesIntentId: string | null,
) {
  return getD1()
    .prepare(`INSERT INTO action_intents (
      id, workspace_id, trace_id, context_snapshot_id, source_artifact_id, supersedes_intent_id,
      intent_key, action_kind, truth_mode, recipients_json, recipient_set_hash,
      subject, body, cohort_cap, evidence_ids_json, metric_definition_id,
      context_manifest_hash, policy_version, policy_hash, nonce, expires_at,
      canonical_payload_json, canonical_payload_hash, created_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      intent.id,
      intent.workspaceId,
      intent.traceId,
      intent.contextSnapshotId,
      intent.sourceArtifactId,
      supersedesIntentId,
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

function traceEventStatement(event: {
  id: string;
  workspaceId: string;
  traceId: string;
  sequence: number;
  eventType: string;
  subjectType: "trace";
  subjectId: string;
  priorState: string | null;
  currentState: string;
  actorType: "human" | "system" | "agent" | "adapter";
  actorId: string | null;
  payloadJson: string;
  payloadHash: string;
  idempotencyKey: string;
  occurredAt: string;
}) {
  return getD1()
    .prepare(`INSERT INTO flight_trace_events (
      id, workspace_id, trace_id, sequence, event_type, subject_type,
      subject_id, prior_state, current_state, actor_type, actor_id,
      payload_json, payload_hash, idempotency_key, occurred_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(
      event.id,
      event.workspaceId,
      event.traceId,
      event.sequence,
      event.eventType,
      event.subjectType,
      event.subjectId,
      event.priorState,
      event.currentState,
      event.actorType,
      event.actorId,
      event.payloadJson,
      event.payloadHash,
      event.idempotencyKey,
      event.occurredAt,
    );
}

async function activeIntent(
  workspaceId: string,
  traceId: string,
  activeIntentId: string | null,
): Promise<IntentRow> {
  if (!activeIntentId) throw new Error("The trace has no active action intent.");
  const row = await getD1()
    .prepare(`SELECT * FROM action_intents
      WHERE id = ? AND workspace_id = ? AND trace_id = ? LIMIT 1`)
    .bind(activeIntentId, workspaceId, traceId)
    .first<IntentRow>();
  if (!row) throw new Error("The proposed action could not be loaded.");
  return row;
}

async function activePolicy(workspaceId: string, intentId: string): Promise<PolicyRow> {
  const row = await getD1()
    .prepare(`SELECT id, workspace_id, intent_id, policy_hash, verdict,
      evaluated_payload_hash, evaluated_context_hash, evaluator_version
      FROM policy_decisions WHERE workspace_id = ? AND intent_id = ? LIMIT 1`)
    .bind(workspaceId, intentId)
    .first<PolicyRow>();
  if (!row) throw new Error("The policy decision could not be loaded.");
  return row;
}

export async function getOrCreateFlightRecorderSnapshot(
  userId: string,
  workspaceId: string,
): Promise<FlightRecorderSnapshot> {
  await requireOwner(userId, workspaceId);
  await materializePendingDemo(userId, workspaceId);
  return readFlightRecorderSnapshot(userId, workspaceId);
}

export async function readFlightRecorderSnapshot(
  userId: string,
  workspaceId: string,
): Promise<FlightRecorderSnapshot> {
  await requireOwner(userId, workspaceId);
  const trace = await findTrace(workspaceId);
  if (!trace) throw new Error("The onboarding-rescue trace is not ready.");
  const d1 = getD1();
  const intentRow = await activeIntent(workspaceId, trace.id, trace.active_intent_id);
  const policy = await activePolicy(workspaceId, intentRow.id);
  const [control, grant, effect, context, evidence, nodes, outcome, eventCount] =
    await Promise.all([
      d1
        .prepare(`SELECT kill_switch_engaged FROM workspace_authority_controls
          WHERE workspace_id = ? LIMIT 1`)
        .bind(workspaceId)
        .first<{ kill_switch_engaged: number }>(),
      d1
        .prepare(`SELECT id, decision, approved_at, approved_by, expires_at,
          bound_payload_hash, bound_context_hash, bound_policy_hash,
          bound_recipient_set_hash, nonce
          FROM approval_grants WHERE workspace_id = ? AND intent_id = ? LIMIT 1`)
        .bind(workspaceId, intentRow.id)
        .first<GrantRow>(),
      d1
        .prepare(`SELECT attempt.id, attempt.provider_mode,
          (SELECT current_state FROM effect_attempt_events latest
            WHERE latest.workspace_id = attempt.workspace_id
              AND latest.effect_attempt_id = attempt.id
            ORDER BY sequence DESC LIMIT 1) AS current_state,
          (SELECT provider_receipt_id FROM effect_attempt_events latest
            WHERE latest.workspace_id = attempt.workspace_id
              AND latest.effect_attempt_id = attempt.id
            ORDER BY sequence DESC LIMIT 1) AS provider_receipt_id,
          (SELECT error_code FROM effect_attempt_events latest
            WHERE latest.workspace_id = attempt.workspace_id
              AND latest.effect_attempt_id = attempt.id
            ORDER BY sequence DESC LIMIT 1) AS error_code,
          (SELECT COUNT(*) FROM effect_attempt_events events
            WHERE events.workspace_id = attempt.workspace_id
              AND events.effect_attempt_id = attempt.id) AS event_count
          FROM effect_attempts attempt
          WHERE attempt.workspace_id = ? AND attempt.intent_id = ? LIMIT 1`)
        .bind(workspaceId, intentRow.id)
        .first<{
          id: string;
          provider_mode: "FIXTURE" | "TEST";
          current_state: NonNullable<FlightRecorderSnapshot["execution"]>["state"];
          provider_receipt_id: string | null;
          error_code: string | null;
          event_count: number;
        }>(),
      d1
        .prepare(`SELECT source_count, manifest_hash FROM context_snapshots
          WHERE workspace_id = ? AND trace_id = ? AND current_state = 'frozen' LIMIT 1`)
        .bind(workspaceId, trace.id)
        .first<{ source_count: number; manifest_hash: string }>(),
      d1
        .prepare(`SELECT evidence_key, truth_mode, source_version, content_hash,
          json_extract(payload_json, '$.metric') AS metric,
          json_extract(payload_json, '$.theme') AS theme,
          json_extract(payload_json, '$.promise') AS promise,
          json_extract(payload_json, '$.approvalRequired') AS approval_required,
          json_extract(payload_json, '$.attribution') AS attribution
          FROM flight_evidence WHERE workspace_id = ? AND trace_id = ?
          ORDER BY rowid ASC`)
        .bind(workspaceId, trace.id)
        .all<{
          evidence_key: string;
          truth_mode: "FIXTURE";
          source_version: string;
          content_hash: string;
          metric: string | null;
          theme: string | null;
          promise: string | null;
          approval_required: number | null;
          attribution: string | null;
        }>(),
      d1
        .prepare(`SELECT node_key, current_state, output_hash,
          (SELECT COUNT(*) FROM json_each(artifact.evidence_citations_json)) AS evidence_count
          FROM reasoning_nodes node
          JOIN reasoning_artifacts artifact
            ON artifact.workspace_id = node.workspace_id AND artifact.node_id = node.id
          WHERE node.workspace_id = ? AND node.trace_id = ?
          ORDER BY CASE node.node_key
            WHEN 'planner' THEN 1 WHEN 'quantitative' THEN 2
            WHEN 'qualitative' THEN 3 WHEN 'experiment_design' THEN 4
            WHEN 'skeptic' THEN 5 ELSE 6 END`)
        .bind(workspaceId, trace.id)
        .all<{
          node_key: string;
          current_state: "succeeded" | "failed" | "skipped";
          output_hash: string | null;
          evidence_count: number;
        }>(),
      d1
        .prepare(`SELECT definition.metric_name, definition.baseline_json,
          observation.value_json, assessment.label, assessment.limitations_json,
          assessment.rationale_summary
          FROM outcome_assessments assessment
          JOIN outcome_definitions definition
            ON definition.workspace_id = assessment.workspace_id
              AND definition.id = assessment.definition_id
          JOIN outcome_observations observation
            ON observation.workspace_id = assessment.workspace_id
              AND observation.definition_id = assessment.definition_id
          WHERE assessment.workspace_id = ? AND assessment.trace_id = ?
          ORDER BY assessment.assessment_version DESC LIMIT 1`)
        .bind(workspaceId, trace.id)
        .first<{
          metric_name: string;
          baseline_json: string;
          value_json: string;
          label: "correlated" | "supported" | "unsupported" | "inconclusive";
          limitations_json: string;
          rationale_summary: string;
        }>(),
      d1
        .prepare(`SELECT COUNT(*) AS count FROM flight_trace_events
          WHERE workspace_id = ? AND trace_id = ?`)
        .bind(workspaceId, trace.id)
        .first<{ count: number }>(),
    ]);

  const recipients = parseStringArray(intentRow.recipients_json, "recipients");
  const labelByKey: Record<string, [string, string]> = {
    "evidence:activation-drop": [
      "Activation fell from 44% to 31%",
      "42 eligible FIXTURE accounts showed a lower 72-hour activation rate.",
    ],
    "evidence:onboarding-feedback": [
      "Five users described setup uncertainty",
      "Approved, redacted FIXTURE feedback points to an unclear first step.",
    ],
    "context:brand": [
      "Approved brand guidance",
      "The proposed email must be clear, useful, and honest.",
    ],
    "context:email-policy": [
      "Reviewed TEST email policy",
      "Three recipients maximum, human approval required, no blind retry.",
    ],
    "metric:activation-72h": [
      "Pre-registered activation metric",
      "Activation within 72 hours; correlation only for this fixture.",
    ],
  };
  const roleByNode: Record<string, [string, string]> = {
    planner: ["Planner", "Scopes the reviewed onboarding-rescue playbook"],
    quantitative: ["Quantitative worker", "Checks the activation movement and cohort"],
    qualitative: ["Qualitative worker", "Summarizes approved, redacted feedback"],
    experiment_design: ["Experiment worker", "Pre-registers the TEST cohort and outcome"],
    skeptic: ["Skeptic review", "Challenges causality and alternative explanations"],
    synthesizer: ["Synthesizer", "Drafts one bounded email action"],
  };
  const executionExplanation: Record<string, string> = {
    reserved: "The one-time effect is reserved but has not been dispatched.",
    dispatching: "The TEST adapter is dispatching the exact approved payload.",
    confirmed: "The FIXTURE provider confirmed acceptance of all three TEST messages.",
    failed: "The TEST action failed. Nothing is presented as sent, and no retry was attempted.",
    indeterminate: "The provider response was ambiguous. CrossSignal stopped and did not retry.",
    reconciled_confirmed: "The ambiguous attempt was later reconciled as confirmed.",
    reconciled_failed: "The ambiguous attempt was later reconciled as failed.",
  };
  const baseline = outcome ? (JSON.parse(outcome.baseline_json) as { activationRate: number }) : null;
  const observed = outcome
    ? (JSON.parse(outcome.value_json) as { activatedAccounts: number; eligibleAccounts: number })
    : null;

  return {
    workspaceId,
    traceId: trace.id,
    traceKey: trace.trace_key,
    traceState: trace.current_state,
    truthMode: trace.truth_mode,
    killSwitchEngaged: Boolean(control?.kill_switch_engaged ?? 1),
    intent: {
      id: intentRow.id,
      version: intentVersion(intentRow.intent_key),
      recipients,
      subject: intentRow.subject,
      body: intentRow.body,
      cohortCap: Number(intentRow.cohort_cap),
      spendingCapUsd: STAGE_03_SPENDING_CAP_USD,
      expiresAt: intentRow.expires_at,
      canonicalPayloadHash: intentRow.canonical_payload_hash,
      recipientSetHash: intentRow.recipient_set_hash,
      contextManifestHash: intentRow.context_manifest_hash,
      policyVersion: intentRow.policy_version,
      policyHash: intentRow.policy_hash,
    },
    policy: {
      verdict: policy.verdict,
      plainEnglish: `Send this email to these ${recipients.length} people. Cost is capped at $${STAGE_03_SPENDING_CAP_USD.toFixed(2)}. Do you authorize this action?`,
      evaluatorVersion: policy.evaluator_version,
    },
    approval: grant
      ? {
          decision: grant.decision,
          approvedAt: grant.approved_at,
          approvedBy: grant.approved_by,
          grantId: grant.id,
        }
      : null,
    execution: effect
      ? {
          state: effect.current_state,
          providerMode: effect.provider_mode,
          providerReceiptId: effect.provider_receipt_id,
          errorCode: effect.error_code,
          explanation: executionExplanation[effect.current_state],
          attemptCount: 1,
        }
      : null,
    outcome:
      outcome && baseline && observed
        ? {
            observedLabel: "Observed",
            assessmentLabel: outcome.label,
            metricName: outcome.metric_name,
            activatedAccounts: observed.activatedAccounts,
            eligibleAccounts: observed.eligibleAccounts,
            baselineRate: baseline.activationRate,
            observedRate: observed.activatedAccounts / observed.eligibleAccounts,
            limitations: parseStringArray(outcome.limitations_json, "outcome limitations"),
            rationale: outcome.rationale_summary,
          }
        : null,
    evidence: evidence.results.map((row: {
      evidence_key: string;
      truth_mode: "FIXTURE";
      source_version: string;
      content_hash: string;
    }) => ({
      key: row.evidence_key,
      label: labelByKey[row.evidence_key]?.[0] ?? row.evidence_key,
      summary: labelByKey[row.evidence_key]?.[1] ?? "Persisted FIXTURE evidence.",
      truthMode: row.truth_mode,
      sourceVersion: row.source_version,
      contentHash: row.content_hash,
    })),
    playbook: nodes.results.map((row: {
      node_key: string;
      current_state: "succeeded" | "failed" | "skipped";
      output_hash: string | null;
      evidence_count: number;
    }) => ({
      key: row.node_key,
      label: roleByNode[row.node_key]?.[0] ?? row.node_key,
      role: roleByNode[row.node_key]?.[1] ?? "Reviewed playbook step",
      state: row.current_state,
      evidenceCount: Number(row.evidence_count),
      outputHash: row.output_hash,
    })),
    context: {
      sourceCount: Number(context?.source_count ?? 0),
      manifestHash: context?.manifest_hash ?? "",
    },
    traceEventCount: Number(eventCount?.count ?? 0),
  };
}

export async function replacePendingIntent(input: {
  userId: string;
  workspaceId: string;
  recipients: string[];
  subject: string;
  body: string;
}): Promise<FlightRecorderSnapshot> {
  await requireOwner(input.userId, input.workspaceId);
  const trace = await findTrace(input.workspaceId);
  if (!trace || trace.current_state !== "awaiting_approval") {
    throw new Error("Only a pending action can be edited.");
  }
  const prior = await activeIntent(input.workspaceId, trace.id, trace.active_intent_id);
  const priorGrant = await getD1()
    .prepare("SELECT id FROM approval_grants WHERE workspace_id = ? AND intent_id = ? LIMIT 1")
    .bind(input.workspaceId, prior.id)
    .first<{ id: string }>();
  if (priorGrant) throw new Error("An approved action cannot be edited. Reset the fixture first.");
  const context = await getD1()
    .prepare(`SELECT id, manifest_hash FROM context_snapshots
      WHERE workspace_id = ? AND trace_id = ? AND current_state = 'frozen' LIMIT 1`)
    .bind(input.workspaceId, trace.id)
    .first<{ id: string; manifest_hash: string }>();
  const definition = await getD1()
    .prepare(`SELECT id FROM outcome_definitions
      WHERE workspace_id = ? AND trace_id = ? LIMIT 1`)
    .bind(input.workspaceId, trace.id)
    .first<{ id: string }>();
  if (!context || !definition) throw new Error("The frozen action context is incomplete.");
  const next = await buildDemoIntent({
    userId: input.userId,
    workspaceId: input.workspaceId,
    traceId: trace.id,
    contextSnapshotId: context.id,
    sourceArtifactId: prior.source_artifact_id,
    outcomeDefinitionId: definition.id,
    contextManifestHash: context.manifest_hash,
    intentVersion: intentVersion(prior.intent_key) + 1,
    recipients: input.recipients,
    subject: input.subject,
    body: input.body,
    now: new Date().toISOString(),
  });
  await replacementBeforeWriteBarrier?.();
  try {
    await getD1().batch([
      intentStatement(next.intent, prior.id),
      policyStatement(next.policyDecision),
    ]);
  } catch (error) {
    if (String(error).includes("l08_intent_activation_rejected")) {
      throw new Error("l08_intent_activation_rejected");
    }
    throw error;
  }
  return readFlightRecorderSnapshot(input.userId, input.workspaceId);
}

export async function setWorkspaceKillSwitch(input: {
  userId: string;
  workspaceId: string;
  engaged: boolean;
}): Promise<FlightRecorderSnapshot> {
  await requireOwner(input.userId, input.workspaceId);
  const result = await getD1()
    .prepare(`UPDATE workspace_authority_controls
      SET kill_switch_engaged = ?, updated_by = ?, updated_at = ?
      WHERE workspace_id = ?`)
    .bind(input.engaged ? 1 : 0, input.userId, new Date().toISOString(), input.workspaceId)
    .run();
  if (!result.success) throw new Error("The global pause control could not be updated.");
  return readFlightRecorderSnapshot(input.userId, input.workspaceId);
}

async function nextTraceEvent(input: {
  workspaceId: string;
  traceId: string;
  eventType: string;
  priorState: string;
  currentState: string;
  actorType: "human" | "system" | "agent" | "adapter";
  actorId: string;
  payload: Record<string, unknown>;
  occurredAt: string;
}) {
  const row = await getD1()
    .prepare(`SELECT COALESCE(MAX(sequence), 0) AS sequence
      FROM flight_trace_events WHERE workspace_id = ? AND trace_id = ?`)
    .bind(input.workspaceId, input.traceId)
    .first<{ sequence: number }>();
  const sequence = Number(row?.sequence ?? 0) + 1;
  const payload = await sealCanonical(input.payload);
  return {
    id: crypto.randomUUID(),
    workspaceId: input.workspaceId,
    traceId: input.traceId,
    sequence,
    eventType: input.eventType,
    subjectType: "trace" as const,
    subjectId: input.traceId,
    priorState: input.priorState,
    currentState: input.currentState,
    actorType: input.actorType,
    actorId: input.actorId,
    payloadJson: payload.canonicalJson,
    payloadHash: payload.sha256,
    idempotencyKey: `${input.traceId}:${input.eventType}:${sequence}`,
    occurredAt: input.occurredAt,
  };
}

export async function authorizeAndExecute(input: {
  userId: string;
  workspaceId: string;
  scenario: ExecutionScenario;
}): Promise<FlightRecorderSnapshot> {
  await requireOwner(input.userId, input.workspaceId);
  const trace = await findTrace(input.workspaceId);
  if (!trace || trace.current_state !== "awaiting_approval") {
    throw new Error("This action is no longer awaiting authorization.");
  }
  const intentRow = await activeIntent(input.workspaceId, trace.id, trace.active_intent_id);
  const intent = toPersistedIntent(intentRow);
  const resealErrors = await validatePersistedActionIntent(intent);
  if (resealErrors.length > 0) throw new Error(resealErrors.join("; "));
  const policy = await activePolicy(input.workspaceId, intentRow.id);
  await authorizationBeforeWriteBarrier?.();
  const d1 = getD1();
  const control = await d1
    .prepare(`SELECT kill_switch_engaged FROM workspace_authority_controls
      WHERE workspace_id = ? LIMIT 1`)
    .bind(input.workspaceId)
    .first<{ kill_switch_engaged: number }>();
  const priorAttempts = await d1
    .prepare(`SELECT COUNT(*) AS count FROM effect_attempts
      WHERE workspace_id = ? AND intent_id = ?`)
    .bind(input.workspaceId, intentRow.id)
    .first<{ count: number }>();
  const now = new Date().toISOString();
  const grantId = crypto.randomUUID();
  const grant = {
    workspaceId: input.workspaceId,
    intentId: intentRow.id,
    decision: "approved" as const,
    boundPayloadHash: intent.canonicalPayloadHash,
    boundContextHash: intent.contextManifestHash,
    boundPolicyHash: intent.policyHash,
    boundRecipientSetHash: intent.recipientSetHash,
    nonce: intent.nonce,
    expiresAt: intent.expiresAt,
    approvedBy: input.userId,
  };
  assertExecutionAuthority({
    intent: {
      id: intentRow.id,
      workspaceId: intent.workspaceId,
      traceId: intent.traceId,
      recipientSetHash: intent.recipientSetHash,
      contextManifestHash: intent.contextManifestHash,
      policyHash: intent.policyHash,
      nonce: intent.nonce,
      expiresAt: intent.expiresAt,
      canonicalPayloadHash: intent.canonicalPayloadHash,
    },
    policy: {
      workspaceId: policy.workspace_id,
      intentId: policy.intent_id,
      verdict: policy.verdict,
      policyHash: policy.policy_hash,
      evaluatedPayloadHash: policy.evaluated_payload_hash,
      evaluatedContextHash: policy.evaluated_context_hash,
    },
    grant,
    request: {
      workspaceId: input.workspaceId,
      traceId: trace.id,
      intentId: intentRow.id,
      actorUserId: input.userId,
      actorWorkspaceId: input.workspaceId,
      killSwitchEngaged: Boolean(control?.kill_switch_engaged ?? 1),
      canonicalPayloadHash: intent.canonicalPayloadHash,
      contextManifestHash: intent.contextManifestHash,
      policyHash: intent.policyHash,
      recipientSetHash: intent.recipientSetHash,
      nonce: intent.nonce,
      now,
      priorAttemptCount: Number(priorAttempts?.count ?? 0),
    },
  });

  const effectId = crypto.randomUUID();
  const effectTime = new Date(Date.parse(now) + 1_000).toISOString();
  const dispatchTime = new Date(Date.parse(now) + 2_000).toISOString();
  const terminalTime = new Date(Date.parse(now) + 3_000).toISOString();
  const terminalState = input.scenario;
  const providerPayload = await sealCanonical(
    input.scenario === "confirmed"
      ? {
          truthMode: "FIXTURE",
          providerMode: "TEST",
          accepted: intent.cohortCap,
          receiptId: `fixture-email-${effectId.slice(0, 8)}`,
          spendUsd: STAGE_03_SPENDING_CAP_USD,
        }
      : {
          truthMode: "FIXTURE",
          providerMode: "TEST",
          errorCode:
            input.scenario === "failed"
              ? "fixture_provider_rejected"
              : "fixture_provider_timeout_after_dispatch",
          retryAttempted: false,
        },
  );
  const providerReceiptId =
    input.scenario === "confirmed" ? `fixture-email-${effectId.slice(0, 8)}` : null;
  const errorCode =
    input.scenario === "failed"
      ? "fixture_provider_rejected"
      : input.scenario === "indeterminate"
        ? "fixture_provider_timeout_after_dispatch"
        : null;
  const executingEvent = await nextTraceEvent({
    workspaceId: input.workspaceId,
    traceId: trace.id,
    eventType: "trace.executing",
    priorState: "awaiting_approval",
    currentState: "executing",
    actorType: "human",
    actorId: input.userId,
    payload: { grantId, effectId, intentId: intentRow.id },
    occurredAt: effectTime,
  });
  const terminalTraceState = input.scenario === "confirmed" ? "observing" : "failed";
  const terminalEvent = await nextTraceEvent({
    workspaceId: input.workspaceId,
    traceId: trace.id,
    eventType:
      input.scenario === "confirmed" ? "trace.observing" : `trace.${input.scenario}`,
    priorState: "executing",
    currentState: terminalTraceState,
    actorType: "adapter",
    actorId: "fixture-email-adapter-v1",
    payload: {
      effectId,
      effectState: terminalState,
      errorCode,
      retryAttempted: false,
    },
    occurredAt: terminalTime,
  });
  terminalEvent.sequence = executingEvent.sequence + 1;
  terminalEvent.idempotencyKey = `${trace.id}:${terminalEvent.eventType}:${terminalEvent.sequence}`;

  const statements = [
    d1
      .prepare(`INSERT INTO approval_grants (
        id, workspace_id, trace_id, intent_id, policy_decision_id, decision,
        bound_payload_hash, bound_context_hash, bound_policy_hash,
        bound_recipient_set_hash, nonce, expires_at, approved_by, approved_at
      ) VALUES (?, ?, ?, ?, ?, 'approved', ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        grantId,
        input.workspaceId,
        trace.id,
        intentRow.id,
        policy.id,
        grant.boundPayloadHash,
        grant.boundContextHash,
        grant.boundPolicyHash,
        grant.boundRecipientSetHash,
        grant.nonce,
        grant.expiresAt,
        input.userId,
        now,
      ),
    d1
      .prepare(`INSERT INTO effect_attempts (
        id, workspace_id, trace_id, intent_id, approval_grant_id,
        intended_effect_key, adapter_kind, provider_mode, initial_state,
        request_hash, reserved_by, reserved_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'email_test', 'FIXTURE', 'reserved', ?, ?, ?)`)
      .bind(
        effectId,
        input.workspaceId,
        trace.id,
        intentRow.id,
        grantId,
        `email-test:${intentRow.canonical_payload_hash}`,
        intentRow.canonical_payload_hash,
        input.userId,
        effectTime,
      ),
    d1
      .prepare(`INSERT INTO effect_attempt_events (
        id, workspace_id, trace_id, effect_attempt_id, sequence, prior_state,
        current_state, provider_receipt_id, provider_response_hash, error_code,
        payload_json, idempotency_key, occurred_at
      ) VALUES (?, ?, ?, ?, 1, NULL, 'reserved', NULL, NULL, NULL, '{}', ?, ?)`)
      .bind(crypto.randomUUID(), input.workspaceId, trace.id, effectId, `${effectId}:1`, effectTime),
    d1
      .prepare(`INSERT INTO effect_attempt_events (
        id, workspace_id, trace_id, effect_attempt_id, sequence, prior_state,
        current_state, provider_receipt_id, provider_response_hash, error_code,
        payload_json, idempotency_key, occurred_at
      ) VALUES (?, ?, ?, ?, 2, 'reserved', 'dispatching', NULL, NULL, NULL, '{}', ?, ?)`)
      .bind(crypto.randomUUID(), input.workspaceId, trace.id, effectId, `${effectId}:2`, dispatchTime),
    d1
      .prepare(`INSERT INTO effect_attempt_events (
        id, workspace_id, trace_id, effect_attempt_id, sequence, prior_state,
        current_state, provider_receipt_id, provider_response_hash, error_code,
        payload_json, idempotency_key, occurred_at
      ) VALUES (?, ?, ?, ?, 3, 'dispatching', ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        crypto.randomUUID(),
        input.workspaceId,
        trace.id,
        effectId,
        terminalState,
        providerReceiptId,
        input.scenario === "confirmed" ? providerPayload.sha256 : null,
        errorCode,
        providerPayload.canonicalJson,
        `${effectId}:3`,
        terminalTime,
      ),
    d1
      .prepare(`UPDATE flight_traces SET current_state = 'executing', updated_at = ?
        WHERE id = ? AND workspace_id = ? AND current_state = 'awaiting_approval'
          AND active_intent_id = ?`)
      .bind(effectTime, trace.id, input.workspaceId, intentRow.id),
    traceEventStatement(executingEvent),
    d1
      .prepare(`UPDATE flight_traces SET current_state = ?, updated_at = ?
        WHERE id = ? AND workspace_id = ? AND current_state = 'executing'`)
      .bind(terminalTraceState, terminalTime, trace.id, input.workspaceId),
    traceEventStatement(terminalEvent),
  ];

  if (input.scenario === "confirmed") {
    const evidenceId = await d1
      .prepare(`SELECT id FROM flight_evidence
        WHERE workspace_id = ? AND trace_id = ? AND evidence_key = 'metric:activation-72h' LIMIT 1`)
      .bind(input.workspaceId, trace.id)
      .first<{ id: string }>();
    const definition = await d1
      .prepare(`SELECT id FROM outcome_definitions
        WHERE workspace_id = ? AND trace_id = ? LIMIT 1`)
      .bind(input.workspaceId, trace.id)
      .first<{ id: string }>();
    if (!evidenceId || !definition) throw new Error("Outcome registration is incomplete.");
    const observation = await sealCanonical({
      truthMode: "FIXTURE",
      activatedAccounts: 1,
      eligibleAccounts: 3,
      window: `${terminalTime}/${new Date(Date.parse(terminalTime) + 72 * 60 * 60 * 1_000).toISOString()}`,
    });
    const limitations = [
      "FIXTURE data",
      "three-recipient TEST cohort",
      "no causal inference",
    ];
    const assessment = await sealCanonical({
      label: "correlated",
      evidenceIds: ["evidence:activation-drop", "activation-window-stage03-v1"],
      limitations,
      rationaleSummary: "One activation followed the intervention, but the fixture only supports correlation.",
    });
    const observationId = crypto.randomUUID();
    const assessmentId = crypto.randomUUID();
    const assessedAt = new Date(Date.parse(terminalTime) + 1_000).toISOString();
    const assessedEvent = await nextTraceEvent({
      workspaceId: input.workspaceId,
      traceId: trace.id,
      eventType: "trace.assessed",
      priorState: "observing",
      currentState: "assessed",
      actorType: "system",
      actorId: "crosssignal-outcome-fixture-v1",
      payload: {
        observationId,
        assessmentId,
        assessmentLabel: "correlated",
      },
      occurredAt: assessedAt,
    });
    assessedEvent.sequence = terminalEvent.sequence + 1;
    assessedEvent.idempotencyKey = `${trace.id}:trace.assessed:${assessedEvent.sequence}`;
    statements.push(
      d1
        .prepare(`INSERT INTO outcome_observations (
          id, workspace_id, trace_id, definition_id, source_evidence_id,
          observation_key, truth_mode, signature_status, value_json,
          value_hash, observed_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'FIXTURE', 'fixture', ?, ?, ?)`)
        .bind(
          observationId,
          input.workspaceId,
          trace.id,
          definition.id,
          evidenceId.id,
          "activation-window-stage03-v1",
          observation.canonicalJson,
          observation.sha256,
          assessedAt,
        ),
      d1
        .prepare(`INSERT INTO outcome_assessments (
          id, workspace_id, trace_id, definition_id, assessment_version,
          label, evidence_ids_json, limitations_json, rationale_summary, content_hash
        ) VALUES (?, ?, ?, ?, 1, 'correlated', ?, ?, ?, ?)`)
        .bind(
          assessmentId,
          input.workspaceId,
          trace.id,
          definition.id,
          JSON.stringify(["evidence:activation-drop", "activation-window-stage03-v1"]),
          JSON.stringify(limitations),
          "One activation followed the intervention; no causal claim is made.",
          assessment.sha256,
        ),
      d1
        .prepare(`UPDATE flight_traces SET current_state = 'assessed', updated_at = ?
          WHERE id = ? AND workspace_id = ? AND current_state = 'observing'`)
        .bind(assessedAt, trace.id, input.workspaceId),
      traceEventStatement(assessedEvent),
    );
  }

  try {
    await d1.batch(statements);
  } catch (error) {
    const message = String(error);
    if (
      message.includes("l08_stale_or_superseded_intent") ||
      message.includes("l08_trace_execution_projection_mismatch")
    ) {
      throw new Error("l08_stale_or_superseded_intent");
    }
    throw error;
  }
  return readFlightRecorderSnapshot(input.userId, input.workspaceId);
}

export async function resetFlightRecorderFixture(
  userId: string,
  workspaceId: string,
): Promise<FlightRecorderSnapshot> {
  await requireOwner(userId, workspaceId);
  const trace = await findTrace(workspaceId);
  if (trace) {
    const deleted = await getD1()
      .prepare(`DELETE FROM flight_traces
        WHERE id = ? AND workspace_id = ? AND fixture_key = ? AND truth_mode = 'FIXTURE'`)
      .bind(trace.id, workspaceId, STAGE_03_FIXTURE_KEY)
      .run();
    if (!deleted.success) throw new Error("The exact fixture trace could not be reset.");
  }
  await materializePendingDemo(userId, workspaceId);
  return readFlightRecorderSnapshot(userId, workspaceId);
}
