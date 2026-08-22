import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  STATE_TRANSITIONS,
  assertTransition,
  findSecretPaths,
  stableStringify,
  validateExecutionAuthority,
  validateOutcomeAssessment,
  validatePersistedActionIntent,
} from "../../db/flight-recorder-contracts.ts";
import {
  FIXTURE_KEY,
  buildGoldenFixture,
} from "./fixtures/onboarding-rescue.fixture.mjs";
import { buildResetPackage } from "./fixtures/reset.mjs";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const dataPackagePath = join(projectRoot, "factory/02_data/output/DATA_PACKAGE.md");
const declaredInputs = [
  "factory/01_spec/output/SPEC.md",
  "factory/01_spec/output/VERIFY.md",
  "factory/01_spec/output/HUMAN_GATE.md",
  "factory/_shared/ARCHITECTURE_SNAPSHOT.md",
  "factory/_shared/QUALITY_GATES.md",
  ".gitattributes",
  "db/",
  "drizzle/",
  "app/case-types.ts",
  "app/workspace-types.ts",
  "tests/",
  "factory/02_data/fixtures/",
  "factory/02_data/wrangler.verify.jsonc",
  "factory/02_data/verify.mjs",
  "drizzle.config.ts",
  "package.json",
  "package-lock.json",
];
const requiredTables = [
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
];
const requiredTriggers = [
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
];

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function fileHash(path) {
  const bytes = await readFile(path);
  const repositoryFile = repositoryPath(path);
  if (/\.(?:c|css|html|js|json|jsonc|jsx|md|mjs|sql|ts|tsx|txt|yml|yaml)$/.test(repositoryFile) || /(?:^|\/)\.gitattributes$/.test(repositoryFile)) {
    return sha256Bytes(Buffer.from(bytes.toString("utf8").replace(/\r\n?/g, "\n")));
  }
  return sha256Bytes(bytes);
}

async function walkFiles(path) {
  const entries = await readdir(path, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) files.push(...(await walkFiles(child)));
    else if (entry.isFile()) files.push(child);
  }
  return files;
}

function repositoryPath(path) {
  return relative(projectRoot, path).split(sep).join("/");
}

async function inputHash(input) {
  const absolute = join(projectRoot, input);
  if ((await stat(absolute)).isFile()) return fileHash(absolute);
  const files = await walkFiles(absolute);
  const lines = await Promise.all(
    files
      .sort((left, right) => repositoryPath(left).localeCompare(repositoryPath(right)))
      .map(async (path) => `${repositoryPath(path)}\0${await fileHash(path)}\n`),
  );
  return sha256Bytes(lines.join(""));
}

export async function computeDeclaredInputHashes() {
  return Object.fromEntries(
    await Promise.all(
      declaredInputs.map(async (input) => [input, await inputHash(input)]),
    ),
  );
}

function declaredHashMap(markdown) {
  const hashes = new Map();
  for (const match of markdown.matchAll(/^\| `([^`]+)` \| `([0-9a-f]{64})` \|$/gm)) {
    hashes.set(match[1], match[2]);
  }
  return hashes;
}

function frontmatterValue(markdown, key) {
  return markdown.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1]?.trim() ?? null;
}

function migrationNames(entries) {
  return entries.filter((name) => /^\d{4}_.+\.sql$/.test(name)).sort();
}

function quoteIdentifier(value) {
  invariant(/^[a-z_][a-z0-9_]*$/i.test(value), `unsafe SQL identifier: ${value}`);
  return `\`${value}\``;
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "number") {
    invariant(Number.isFinite(value), "cannot serialize a non-finite SQL number");
    return String(value);
  }
  invariant(typeof value === "string", "cannot serialize a non-scalar SQL value");
  return `'${value.replaceAll("'", "''")}'`;
}

function insertSql(table, record, columns = Object.keys(record)) {
  return `INSERT INTO ${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(", ")}) VALUES (${columns.map((column) => sqlLiteral(record[column])).join(", ")});`;
}

function updateSql(table, changes, predicate) {
  return `UPDATE ${quoteIdentifier(table)} SET ${Object.entries(changes)
    .map(([column, value]) => `${quoteIdentifier(column)} = ${sqlLiteral(value)}`)
    .join(", ")} WHERE ${predicate};`;
}

function snakeRecord(record, mapping) {
  return Object.fromEntries(
    Object.entries(mapping).map(([column, property]) => [column, record[property]]),
  );
}

function parseWrangler(stdout) {
  return JSON.parse(stdout);
}

function resultRow(result, index = -1) {
  const parsed = parseWrangler(result.stdout);
  const entry = index < 0 ? parsed.at(index) : parsed[index];
  return entry?.results?.[0];
}

function assertWranglerFailure(result, label, pattern) {
  invariant(result.exitCode !== 0, `${label} unexpectedly succeeded`);
  const output = `${result.stderr}\n${result.stdout}`;
  invariant(pattern.test(output), `${label} failed outside its intended guard: ${output}`);
}

function runDrizzleCheck() {
  const drizzlePath = join(projectRoot, "node_modules/drizzle-kit/bin.cjs");
  const result = spawnSync(
    process.execPath,
    [drizzlePath, "check", "--config", join(projectRoot, "drizzle.config.ts")],
    {
      cwd: projectRoot,
      encoding: "utf8",
      timeout: 30_000,
      env: process.env,
    },
  );
  invariant(!result.error, `drizzle-kit migration check: ${result.error?.message}`);
  invariant(
    result.status === 0,
    `drizzle-kit migration check failed (${result.status}): ${result.stderr || result.stdout}`,
  );
  return true;
}

async function verifyMigrationMetadata(sqlNames) {
  const journalPath = join(projectRoot, "drizzle/meta/_journal.json");
  const journal = JSON.parse(await readFile(journalPath, "utf8"));
  invariant(journal.version === "7", "Drizzle journal version is invalid");
  invariant(journal.dialect === "sqlite", "Drizzle journal dialect is invalid");
  invariant(journal.entries.length === sqlNames.length, "Drizzle journal and SQL counts diverge");

  let priorSnapshotId = "00000000-0000-0000-0000-000000000000";
  const snapshotIds = new Set();
  for (let index = 0; index < journal.entries.length; index += 1) {
    const entry = journal.entries[index];
    const sqlName = sqlNames[index];
    invariant(entry.idx === index, `Drizzle journal index is not contiguous at ${index}`);
    invariant(sqlName === `${entry.tag}.sql`, `Drizzle journal tag does not match SQL: ${entry.tag}`);
    const snapshot = JSON.parse(
      await readFile(join(projectRoot, `drizzle/meta/${String(index).padStart(4, "0")}_snapshot.json`), "utf8"),
    );
    invariant(snapshot.dialect === "sqlite", `snapshot ${index} has the wrong dialect`);
    invariant(snapshot.prevId === priorSnapshotId, `snapshot ${index} breaks the prevId chain`);
    invariant(!snapshotIds.has(snapshot.id), `snapshot ${index} repeats an id`);
    snapshotIds.add(snapshot.id);
    priorSnapshotId = snapshot.id;
  }

  return { entries: journal.entries.length, snapshotChainValid: true };
}

function runWrangler(args, persistencePath) {
  const wranglerPath = join(projectRoot, "node_modules/wrangler/bin/wrangler.js");
  const result = spawnSync(process.execPath, [wranglerPath, ...args], {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: 30_000,
    env: {
      ...process.env,
      WRANGLER_WRITE_LOGS: "false",
      WRANGLER_LOG_PATH: join(persistencePath, "wrangler-logs"),
    },
  });
  return {
    exitCode: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error,
  };
}

function assertWranglerSuccess(result, label) {
  invariant(!result.error, `${label}: ${result.error?.message}`);
  invariant(
    result.exitCode === 0,
    `${label} failed (${result.exitCode}): ${result.stderr || result.stdout}`,
  );
}

function d1Command(common, persistencePath, sql) {
  return runWrangler([...common, "--command", sql], persistencePath);
}

function fixtureMaterializationSql(fixture) {
  const statements = [];
  statements.push(
    insertSql("users", snakeRecord(fixture.user, {
      id: "id",
      email: "email",
      display_name: "displayName",
    })),
    insertSql("workspaces", snakeRecord(fixture.workspace, {
      id: "id",
      name: "name",
      slug: "slug",
      owner_user_id: "ownerUserId",
    })),
    insertSql("workspace_members", snakeRecord(fixture.workspaceMember, {
      workspace_id: "workspaceId",
      user_id: "userId",
      role: "role",
      joined_at: "joinedAt",
    })),
    insertSql("workspace_authority_controls", snakeRecord(fixture.workspaceAuthorityControl, {
      workspace_id: "workspaceId",
      kill_switch_engaged: "killSwitchEngaged",
      updated_by: "updatedBy",
      updated_at: "updatedAt",
    })),
  );

  const trace = snakeRecord(fixture.trace, {
    id: "id",
    workspace_id: "workspaceId",
    trace_key: "traceKey",
    fixture_key: "fixtureKey",
    truth_mode: "truthMode",
    current_state: "currentState",
    retention_class: "retentionClass",
    retention_until: "retentionUntil",
    created_by: "createdBy",
  });
  trace.current_state = "collecting";
  statements.push(insertSql("flight_traces", trace));

  for (const evidence of fixture.evidence) {
    statements.push(insertSql("flight_evidence", snakeRecord(evidence, {
      id: "id",
      workspace_id: "workspaceId",
      trace_id: "traceId",
      evidence_key: "evidenceKey",
      truth_mode: "truthMode",
      source_kind: "sourceKind",
      source_version: "sourceVersion",
      source_ref: "sourceRef",
      captured_at: "capturedAt",
      payload_json: "payloadJson",
      content_hash: "contentHash",
      idempotency_key: "idempotencyKey",
      created_by: "createdBy",
    })));
  }

  const snapshot = snakeRecord(fixture.contextSnapshot, {
    id: "id",
    workspace_id: "workspaceId",
    trace_id: "traceId",
    snapshot_key: "snapshotKey",
    truth_mode: "truthMode",
    current_state: "currentState",
    source_count: "sourceCount",
    ordered_manifest_json: "orderedManifestJson",
    manifest_hash: "manifestHash",
    created_by: "createdBy",
    frozen_at: "frozenAt",
  });
  snapshot.current_state = "collecting";
  snapshot.frozen_at = null;
  statements.push(insertSql("context_snapshots", snapshot));
  for (const evidence of fixture.evidence) {
    statements.push(insertSql("context_snapshot_sources", snakeRecord(
      {
        workspaceId: evidence.workspaceId,
        snapshotId: fixture.contextSnapshot.id,
        ...evidence.contextSource,
        retrievalJson: stableStringify(evidence.contextSource.retrieval),
      },
      {
        workspace_id: "workspaceId",
        snapshot_id: "snapshotId",
        position: "position",
        source_id: "sourceId",
        source_kind: "sourceKind",
        source_version: "sourceVersion",
        source_ref: "sourceRef",
        content_hash: "contentHash",
        access_decision: "accessDecision",
        retrieval_json: "retrievalJson",
      },
    )));
  }
  statements.push(
    updateSql(
      "context_snapshots",
      { current_state: "frozen", frozen_at: fixture.contextSnapshot.frozenAt },
      `id = ${sqlLiteral(fixture.contextSnapshot.id)}`,
    ),
    updateSql(
      "flight_traces",
      { current_state: "context_frozen" },
      `id = ${sqlLiteral(fixture.trace.id)}`,
    ),
  );

  for (const { node, artifact } of fixture.reasoningNodes) {
    const pending = snakeRecord(node, {
      id: "id",
      workspace_id: "workspaceId",
      trace_id: "traceId",
      node_key: "nodeKey",
      attempt: "attempt",
      current_state: "currentState",
      input_hash: "inputHash",
      output_hash: "outputHash",
      error_code: "errorCode",
      started_at: "startedAt",
      completed_at: "completedAt",
    });
    pending.current_state = "pending";
    pending.output_hash = null;
    pending.error_code = null;
    pending.started_at = null;
    pending.completed_at = null;
    statements.push(
      insertSql("reasoning_nodes", pending),
      updateSql(
        "reasoning_nodes",
        { current_state: "running", started_at: node.startedAt },
        `id = ${sqlLiteral(node.id)}`,
      ),
      updateSql(
        "reasoning_nodes",
        {
          current_state: "succeeded",
          output_hash: node.outputHash,
          completed_at: node.completedAt,
        },
        `id = ${sqlLiteral(node.id)}`,
      ),
      insertSql("reasoning_artifacts", snakeRecord(artifact, {
        id: "id",
        workspace_id: "workspaceId",
        trace_id: "traceId",
        node_id: "nodeId",
        artifact_kind: "artifactKind",
        schema_version: "schemaVersion",
        content_json: "contentJson",
        content_hash: "contentHash",
        evidence_citations_json: "evidenceCitationsJson",
      })),
    );
  }
  statements.push(
    updateSql(
      "flight_traces",
      { current_state: "reasoning" },
      `id = ${sqlLiteral(fixture.trace.id)}`,
    ),
    insertSql("outcome_definitions", snakeRecord(fixture.outcomeDefinition, {
      id: "id",
      workspace_id: "workspaceId",
      trace_id: "traceId",
      definition_key: "definitionKey",
      metric_name: "metricName",
      cohort_json: "cohortJson",
      cohort_hash: "cohortHash",
      baseline_json: "baselineJson",
      baseline_hash: "baselineHash",
      window_starts_at: "windowStartsAt",
      window_ends_at: "windowEndsAt",
      assessment_rule_json: "assessmentRuleJson",
      assessment_rule_hash: "assessmentRuleHash",
      registered_by: "registeredBy",
      registered_at: "registeredAt",
    })),
    insertSql("action_intents", snakeRecord(
      {
        ...fixture.intent,
        recipientsJson: stableStringify(fixture.intent.recipients),
        evidenceIdsJson: stableStringify(fixture.intent.evidenceIds),
      },
      {
        id: "id",
        workspace_id: "workspaceId",
        trace_id: "traceId",
        context_snapshot_id: "contextSnapshotId",
        source_artifact_id: "sourceArtifactId",
        intent_key: "intentKey",
        action_kind: "actionKind",
        truth_mode: "truthMode",
        recipients_json: "recipientsJson",
        recipient_set_hash: "recipientSetHash",
        subject: "subject",
        body: "body",
        cohort_cap: "cohortCap",
        evidence_ids_json: "evidenceIdsJson",
        metric_definition_id: "metricDefinitionId",
        context_manifest_hash: "contextManifestHash",
        policy_version: "policyVersion",
        policy_hash: "policyHash",
        nonce: "nonce",
        expires_at: "expiresAt",
        canonical_payload_json: "canonicalPayloadJson",
        canonical_payload_hash: "canonicalPayloadHash",
        created_by: "createdBy",
      },
    )),
    insertSql("policy_decisions", snakeRecord(fixture.policyDecision, {
      id: "id",
      workspace_id: "workspaceId",
      trace_id: "traceId",
      intent_id: "intentId",
      policy_version: "policyVersion",
      policy_hash: "policyHash",
      verdict: "verdict",
      reason_codes_json: "reasonCodesJson",
      evaluated_payload_hash: "evaluatedPayloadHash",
      evaluated_context_hash: "evaluatedContextHash",
      evaluator_version: "evaluatorVersion",
      decided_at: "decidedAt",
    })),
    updateSql(
      "flight_traces",
      { current_state: "awaiting_approval" },
      `id = ${sqlLiteral(fixture.trace.id)}`,
    ),
    insertSql("approval_grants", snakeRecord(fixture.approvalGrant, {
      id: "id",
      workspace_id: "workspaceId",
      trace_id: "traceId",
      intent_id: "intentId",
      policy_decision_id: "policyDecisionId",
      decision: "decision",
      bound_payload_hash: "boundPayloadHash",
      bound_context_hash: "boundContextHash",
      bound_policy_hash: "boundPolicyHash",
      bound_recipient_set_hash: "boundRecipientSetHash",
      nonce: "nonce",
      expires_at: "expiresAt",
      approved_by: "approvedBy",
      approved_at: "approvedAt",
    })),
    insertSql("effect_attempts", snakeRecord(fixture.effectAttempt, {
      id: "id",
      workspace_id: "workspaceId",
      trace_id: "traceId",
      intent_id: "intentId",
      approval_grant_id: "approvalGrantId",
      intended_effect_key: "intendedEffectKey",
      adapter_kind: "adapterKind",
      provider_mode: "providerMode",
      initial_state: "initialState",
      request_hash: "requestHash",
      reserved_by: "reservedBy",
      reserved_at: "reservedAt",
    })),
    updateSql(
      "flight_traces",
      { current_state: "executing" },
      `id = ${sqlLiteral(fixture.trace.id)}`,
    ),
  );

  for (const event of fixture.effectAttempt.events) {
    statements.push(insertSql("effect_attempt_events", snakeRecord(event, {
      id: "id",
      workspace_id: "workspaceId",
      trace_id: "traceId",
      effect_attempt_id: "effectAttemptId",
      sequence: "sequence",
      prior_state: "priorState",
      current_state: "currentState",
      provider_receipt_id: "providerReceiptId",
      provider_response_hash: "providerResponseHash",
      error_code: "errorCode",
      payload_json: "payloadJson",
      idempotency_key: "idempotencyKey",
      occurred_at: "occurredAt",
    })));
  }
  statements.push(
    updateSql(
      "flight_traces",
      { current_state: "observing" },
      `id = ${sqlLiteral(fixture.trace.id)}`,
    ),
    insertSql("outcome_observations", snakeRecord(fixture.outcomeObservation, {
      id: "id",
      workspace_id: "workspaceId",
      trace_id: "traceId",
      definition_id: "definitionId",
      source_evidence_id: "sourceEvidenceId",
      observation_key: "observationKey",
      truth_mode: "truthMode",
      signature_status: "signatureStatus",
      value_json: "valueJson",
      value_hash: "valueHash",
      observed_at: "observedAt",
    })),
    insertSql("outcome_assessments", snakeRecord(fixture.outcomeAssessment, {
      id: "id",
      workspace_id: "workspaceId",
      trace_id: "traceId",
      definition_id: "definitionId",
      assessment_version: "assessmentVersion",
      label: "label",
      evidence_ids_json: "evidenceIdsJson",
      limitations_json: "limitationsJson",
      rationale_summary: "rationaleSummary",
      content_hash: "contentHash",
    })),
    updateSql(
      "flight_traces",
      { current_state: "assessed" },
      `id = ${sqlLiteral(fixture.trace.id)}`,
    ),
  );
  for (const event of fixture.flightTraceEvents) {
    statements.push(insertSql("flight_trace_events", snakeRecord(event, {
      id: "id",
      workspace_id: "workspaceId",
      trace_id: "traceId",
      sequence: "sequence",
      event_type: "eventType",
      subject_type: "subjectType",
      subject_id: "subjectId",
      prior_state: "priorState",
      current_state: "currentState",
      actor_type: "actorType",
      actor_id: "actorId",
      payload_json: "payloadJson",
      payload_hash: "payloadHash",
      idempotency_key: "idempotencyKey",
      occurred_at: "occurredAt",
    })));
  }
  return statements.join("\n");
}

export async function verifyMigrations(sqlFiles, fixture) {
  const tempRoot = resolve(tmpdir());
  const persistencePath = await mkdtemp(join(tempRoot, "crosssignal-data-"));
  const resolvedPersistence = resolve(persistencePath);
  invariant(
    resolvedPersistence.startsWith(`${tempRoot}${sep}`),
    "migration probe escaped the operating-system temp directory",
  );

  try {
    const combinedPath = join(resolvedPersistence, "all-migrations.sql");
    const combined = (
      await Promise.all(sqlFiles.map((path) => readFile(path, "utf8")))
    ).join("\n--> statement-breakpoint\n");
    await writeFile(combinedPath, combined, "utf8");

    const common = [
      "d1",
      "execute",
      "DB",
      "--local",
      "--config",
      join(projectRoot, "factory/02_data/wrangler.verify.jsonc"),
      "--persist-to",
      resolvedPersistence,
      "--yes",
      "--json",
    ];
    const apply = runWrangler([...common, "--file", combinedPath], resolvedPersistence);
    assertWranglerSuccess(apply, "fresh D1 migration application");

    const objectNames = [...requiredTables, ...requiredTriggers]
      .map((name) => `'${name}'`)
      .join(",");
    const probeSql = `SELECT
      (SELECT COUNT(*) FROM sqlite_schema WHERE type = 'table' AND name IN (${requiredTables.map((name) => `'${name}'`).join(",")})) AS required_tables,
      (SELECT COUNT(*) FROM sqlite_schema WHERE type = 'trigger' AND name IN (${requiredTriggers.map((name) => `'${name}'`).join(",")})) AS required_triggers,
      (SELECT COUNT(*) FROM sqlite_schema WHERE name IN (${objectNames})) AS required_objects,
      (SELECT COUNT(*) FROM pragma_foreign_key_check) AS foreign_key_violations;`;
    const probe = runWrangler([...common, "--command", probeSql], resolvedPersistence);
    assertWranglerSuccess(probe, "fresh D1 schema probe");
    const parsed = JSON.parse(probe.stdout);
    const row = parsed?.[0]?.results?.[0];
    invariant(row?.required_tables === requiredTables.length, "fresh D1 is missing required tables");
    invariant(row?.required_triggers === requiredTriggers.length, "fresh D1 is missing required triggers");
    invariant(row?.required_objects === requiredTables.length + requiredTriggers.length, "fresh D1 object count is invalid");
    invariant(row?.foreign_key_violations === 0, "fresh D1 has foreign-key violations");

    const materialize = d1Command(
      common,
      resolvedPersistence,
      "SELECT 1;",
    );
    const fixturePath = join(resolvedPersistence, "canonical-fixture.sql");
    await writeFile(fixturePath, fixtureMaterializationSql(fixture), "utf8");
    const materializeFile = runWrangler(
      [...common, "--file", fixturePath],
      resolvedPersistence,
    );
    assertWranglerSuccess(materialize, "canonical fixture D1 readiness");
    assertWranglerSuccess(materializeFile, "canonical fixture materialization");

    const expectedCounts = {
      workspace_authority_controls: 1,
      flight_traces: 1,
      flight_evidence: fixture.evidence.length,
      context_snapshots: 1,
      context_snapshot_sources: fixture.evidence.length,
      context_snapshot_supersessions: 0,
      reasoning_nodes: fixture.reasoningNodes.length,
      reasoning_artifacts: fixture.reasoningNodes.length,
      outcome_definitions: 1,
      action_intents: 1,
      policy_decisions: 1,
      approval_grants: 1,
      effect_attempts: 1,
      effect_attempt_events: fixture.effectAttempt.events.length,
      outcome_observations: 1,
      outcome_assessments: 1,
      outcome_assessment_supersessions: 0,
      flight_trace_events: fixture.flightTraceEvents.length,
    };
    const countSql = `SELECT ${Object.entries(expectedCounts)
      .map(([table, count]) => `(SELECT COUNT(*) FROM ${quoteIdentifier(table)}) = ${count} AS ${quoteIdentifier(table)}`)
      .join(", ")}, (SELECT COUNT(*) FROM pragma_foreign_key_check) AS foreign_key_violations;`;
    const counts = d1Command(common, resolvedPersistence, countSql);
    assertWranglerSuccess(counts, "canonical fixture row-count probe");
    const countRow = resultRow(counts);
    invariant(countRow?.foreign_key_violations === 0, "materialized fixture has foreign-key violations");
    for (const table of Object.keys(expectedCounts)) {
      invariant(countRow?.[table] === 1, `materialized fixture has the wrong ${table} row count`);
    }

    const fixtureTraceId = fixture.trace.id;
    const fixtureWorkspaceId = fixture.workspace.id;
    const fixtureSnapshotId = fixture.contextSnapshot.id;
    const fixtureAttemptId = fixture.effectAttempt.id;
    const fixtureDefinitionId = fixture.outcomeDefinition.id;
    const fixtureObservationKey = fixture.outcomeObservation.observationKey;
    const hash = "a".repeat(64);
    const retrievalProbeSource = fixture.evidence[0].contextSource;
    const retrievalProbeManifest = stableStringify([retrievalProbeSource]);
    const retrievalDriftJson = stableStringify({
      ...retrievalProbeSource.retrieval,
      query: `${retrievalProbeSource.retrieval.query}#drift`,
    });
    const otherTraceSql = `
      INSERT INTO flight_traces (id, workspace_id, trace_key, fixture_key, truth_mode, current_state, retention_class, retention_until, created_by)
        VALUES ('trace_non_fixture_preserved', ${sqlLiteral(fixtureWorkspaceId)}, 'non-fixture-preserved', NULL, 'TEST', 'collecting', 'review_evidence', '2027-08-13T08:00:00.000Z', ${sqlLiteral(fixture.user.id)});`;
    const otherTrace = d1Command(common, resolvedPersistence, otherTraceSql);
    assertWranglerSuccess(otherTrace, "non-fixture reset sentinel setup");

    const negativeProbes = [
      [
        "trace jump",
        updateSql("flight_traces", { current_state: "collecting" }, `id = ${sqlLiteral(fixtureTraceId)}`),
        /invalid flight trace transition/i,
      ],
      [
        "truth-mode mutation",
        updateSql("flight_traces", { truth_mode: "TEST" }, `id = ${sqlLiteral(fixtureTraceId)}`),
        /flight trace identity and truth are immutable/i,
      ],
      [
        "non-fixture parent delete",
        `DELETE FROM workspaces WHERE id = ${sqlLiteral(fixtureWorkspaceId)};`,
        /non-fixture flight traces cannot be deleted/i,
      ],
      [
        "incomplete context freeze",
        `INSERT INTO context_snapshots (id, workspace_id, trace_id, snapshot_key, truth_mode, current_state, source_count, ordered_manifest_json, manifest_hash, created_by, frozen_at)
           VALUES ('ctx_incomplete_probe', ${sqlLiteral(fixtureWorkspaceId)}, ${sqlLiteral(fixtureTraceId)}, 'incomplete-probe', 'FIXTURE', 'collecting', 1, '[{"position":1,"sourceId":"probe","sourceKind":"policy_document","sourceVersion":"v1","sourceRef":"fixture://probe","contentHash":"${hash}","accessDecision":"allowed","retrieval":{}}]', '${hash}', ${sqlLiteral(fixture.user.id)}, NULL);
         UPDATE context_snapshots SET current_state = 'frozen', frozen_at = '2026-08-13T08:00:00.000Z' WHERE id = 'ctx_incomplete_probe';`,
        /invalid context snapshot transition or incomplete manifest/i,
      ],
      [
        "drifted context retrieval",
        `INSERT INTO context_snapshots (id, workspace_id, trace_id, snapshot_key, truth_mode, current_state, source_count, ordered_manifest_json, manifest_hash, created_by, frozen_at)
           VALUES ('ctx_retrieval_drift_probe', ${sqlLiteral(fixtureWorkspaceId)}, ${sqlLiteral(fixtureTraceId)}, 'retrieval-drift-probe', 'FIXTURE', 'collecting', 1, ${sqlLiteral(retrievalProbeManifest)}, ${sqlLiteral(sha256Bytes(retrievalProbeManifest))}, ${sqlLiteral(fixture.user.id)}, NULL);
         INSERT INTO context_snapshot_sources (workspace_id, snapshot_id, position, source_id, source_kind, source_version, source_ref, content_hash, access_decision, retrieval_json)
           VALUES (${sqlLiteral(fixtureWorkspaceId)}, 'ctx_retrieval_drift_probe', ${sqlLiteral(retrievalProbeSource.position)}, ${sqlLiteral(retrievalProbeSource.sourceId)}, ${sqlLiteral(retrievalProbeSource.sourceKind)}, ${sqlLiteral(retrievalProbeSource.sourceVersion)}, ${sqlLiteral(retrievalProbeSource.sourceRef)}, ${sqlLiteral(retrievalProbeSource.contentHash)}, ${sqlLiteral(retrievalProbeSource.accessDecision)}, ${sqlLiteral(retrievalDriftJson)});`,
        /context source does not exactly match its collecting manifest/i,
      ],
      [
        "node jump",
        `INSERT INTO reasoning_nodes (id, workspace_id, trace_id, node_key, attempt, current_state, input_hash)
           VALUES ('node_jump_probe', ${sqlLiteral(fixtureWorkspaceId)}, ${sqlLiteral(fixtureTraceId)}, 'planner', 2, 'pending', '${hash}');
         UPDATE reasoning_nodes SET current_state = 'succeeded', output_hash = '${hash}', started_at = '2026-08-13T08:00:00.000Z', completed_at = '2026-08-13T08:00:01.000Z' WHERE id = 'node_jump_probe';`,
        /invalid reasoning node transition or state payload/i,
      ],
      [
        "canonical intent mismatch",
        insertSql("action_intents", {
          id: "intent_canonical_drift_probe",
          workspace_id: fixtureWorkspaceId,
          trace_id: fixtureTraceId,
          context_snapshot_id: fixtureSnapshotId,
          source_artifact_id: fixture.intent.sourceArtifactId,
          intent_key: "canonical-drift-probe",
          action_kind: fixture.intent.actionKind,
          truth_mode: fixture.intent.truthMode,
          recipients_json: stableStringify(fixture.intent.recipients),
          recipient_set_hash: fixture.intent.recipientSetHash,
          subject: "mutated subject",
          body: fixture.intent.body,
          cohort_cap: fixture.intent.cohortCap,
          evidence_ids_json: stableStringify(fixture.intent.evidenceIds),
          metric_definition_id: fixture.intent.metricDefinitionId,
          context_manifest_hash: fixture.intent.contextManifestHash,
          policy_version: fixture.intent.policyVersion,
          policy_hash: fixture.intent.policyHash,
          nonce: "nonce_canonical_drift_probe",
          expires_at: fixture.intent.expiresAt,
          canonical_payload_json: fixture.intent.canonicalPayloadJson,
          canonical_payload_hash: "b".repeat(64),
          created_by: fixture.intent.createdBy,
        }),
        /intent flattened fields do not match canonical payload/i,
      ],
      [
        "cross-trace effect event",
        `INSERT INTO effect_attempt_events (id, workspace_id, trace_id, effect_attempt_id, sequence, prior_state, current_state, payload_json, idempotency_key, occurred_at)
           VALUES ('effect_cross_trace_probe', 'workspace_cross_trace_probe', 'trace_non_fixture_preserved', ${sqlLiteral(fixtureAttemptId)}, 1, NULL, 'reserved', '{}', 'effect-cross-trace-probe', '2026-08-13T08:02:00.000Z');`,
        /effect event is outside its attempt, trace, or time|FOREIGN KEY constraint failed/i,
      ],
      [
        "duplicate effect event",
        `INSERT INTO effect_attempt_events (id, workspace_id, trace_id, effect_attempt_id, sequence, prior_state, current_state, payload_json, idempotency_key, occurred_at)
           VALUES ('effect_duplicate_probe', ${sqlLiteral(fixtureWorkspaceId)}, ${sqlLiteral(fixtureTraceId)}, ${sqlLiteral(fixtureAttemptId)}, 3, 'dispatching', 'confirmed', '{}', 'effect-duplicate-probe', '2026-08-13T08:02:00.000Z');`,
        /effect event sequence is not the exact next value|UNIQUE constraint failed/i,
      ],
      [
        "out-of-order effect event",
        `INSERT INTO effect_attempt_events (id, workspace_id, trace_id, effect_attempt_id, sequence, prior_state, current_state, error_code, payload_json, idempotency_key, occurred_at)
           VALUES ('effect_gap_probe', ${sqlLiteral(fixtureWorkspaceId)}, ${sqlLiteral(fixtureTraceId)}, ${sqlLiteral(fixtureAttemptId)}, 5, 'indeterminate', 'reconciled_failed', 'probe', '{}', 'effect-gap-probe', '2026-08-13T08:02:00.000Z');`,
        /effect event sequence is not the exact next value/i,
      ],
      [
        "duplicate trace event",
        `INSERT INTO flight_trace_events (id, workspace_id, trace_id, sequence, event_type, subject_type, subject_id, prior_state, current_state, actor_type, payload_json, payload_hash, idempotency_key, occurred_at)
           VALUES ('trace_duplicate_probe', ${sqlLiteral(fixtureWorkspaceId)}, ${sqlLiteral(fixtureTraceId)}, 7, 'context.collecting', 'context', ${sqlLiteral(fixtureSnapshotId)}, NULL, 'collecting', 'system', '{}', '${hash}', 'trace-duplicate-probe', '2026-08-16T08:00:01.000Z');`,
        /trace event sequence is not globally gap-free|UNIQUE constraint failed/i,
      ],
      [
        "out-of-order trace event",
        `INSERT INTO flight_trace_events (id, workspace_id, trace_id, sequence, event_type, subject_type, subject_id, prior_state, current_state, actor_type, payload_json, payload_hash, idempotency_key, occurred_at)
           VALUES ('trace_gap_probe', ${sqlLiteral(fixtureWorkspaceId)}, ${sqlLiteral(fixtureTraceId)}, 9, 'graph.pending', 'graph', ${sqlLiteral(fixture.reasoningNodes[0].node.id)}, NULL, 'pending', 'system', '{}', '${hash}', 'trace-gap-probe', '2026-08-16T08:00:01.000Z');`,
        /trace event sequence is not globally gap-free/i,
      ],
      [
        "supported fixture outcome",
        `INSERT INTO outcome_assessments (id, workspace_id, trace_id, definition_id, assessment_version, label, evidence_ids_json, limitations_json, rationale_summary, content_hash)
           VALUES ('assessment_supported_fixture_probe', ${sqlLiteral(fixtureWorkspaceId)}, ${sqlLiteral(fixtureTraceId)}, ${sqlLiteral(fixtureDefinitionId)}, 2, 'supported', ${sqlLiteral(stableStringify([fixtureObservationKey]))}, '["fixture"]', 'unsupported claim', '${hash}');`,
        /fixture or unverified observations cannot support an outcome/i,
      ],
    ];
    for (const [label, sql, pattern] of negativeProbes) {
      assertWranglerFailure(d1Command(common, resolvedPersistence, sql), label, pattern);
    }

    const removeConsumedAttempt = d1Command(
      common,
      resolvedPersistence,
      `DELETE FROM effect_attempts WHERE id = ${sqlLiteral(fixtureAttemptId)};`,
    );
    assertWranglerSuccess(removeConsumedAttempt, "kill-switch probe isolation");
    const killSwitchOn = d1Command(
      common,
      resolvedPersistence,
      `UPDATE workspace_authority_controls SET kill_switch_engaged = 1 WHERE workspace_id = ${sqlLiteral(fixtureWorkspaceId)};`,
    );
    assertWranglerSuccess(killSwitchOn, "kill-switch probe setup");
    const killSwitchReservation = insertSql("effect_attempts", {
      id: "effect_kill_switch_probe",
      workspace_id: fixtureWorkspaceId,
      trace_id: fixtureTraceId,
      intent_id: fixture.intent.id,
      approval_grant_id: fixture.approvalGrant.id,
      intended_effect_key: "kill-switch-probe",
      adapter_kind: "email_test",
      provider_mode: "FIXTURE",
      initial_state: "reserved",
      request_hash: fixture.intent.canonicalPayloadHash,
      reserved_by: fixture.effectAttempt.reservedBy,
      reserved_at: "2026-08-13T08:01:02.000Z",
    });
    assertWranglerFailure(
      d1Command(common, resolvedPersistence, killSwitchReservation),
      "kill-switch effect reservation",
      /explicit disengaged kill switch/i,
    );
    const killSwitchOff = d1Command(
      common,
      resolvedPersistence,
      `UPDATE workspace_authority_controls SET kill_switch_engaged = 0 WHERE workspace_id = ${sqlLiteral(fixtureWorkspaceId)};`,
    );
    assertWranglerSuccess(killSwitchOff, "kill-switch probe cleanup");

    const resetPackage = await buildResetPackage(fixtureWorkspaceId);
    const reset = d1Command(
      common,
      resolvedPersistence,
      `${resetPackage.deleteSql.replace("?", sqlLiteral(resetPackage.deleteBindings[0])).replace("?", sqlLiteral(resetPackage.deleteBindings[1])).replace("?", sqlLiteral(resetPackage.deleteBindings[2]))};
       SELECT
         (SELECT COUNT(*) FROM flight_traces WHERE id = ${sqlLiteral(fixtureTraceId)}) AS fixture_trace,
         (SELECT COUNT(*) FROM flight_traces WHERE id = 'trace_non_fixture_preserved') AS non_fixture_trace,
         (SELECT COUNT(*) FROM workspaces WHERE id = ${sqlLiteral(fixtureWorkspaceId)}) AS workspace,
         (SELECT COUNT(*) FROM workspace_authority_controls WHERE workspace_id = ${sqlLiteral(fixtureWorkspaceId)}) AS authority_control,
         (SELECT COUNT(*) FROM pragma_foreign_key_check) AS foreign_key_violations;`,
    );
    assertWranglerSuccess(reset, "exact fixture trace reset");
    const resetRow = resultRow(reset);
    invariant(resetRow?.fixture_trace === 0, "fixture reset left the canonical trace");
    invariant(resetRow?.non_fixture_trace === 1, "fixture reset changed a non-fixture trace");
    invariant(resetRow?.workspace === 1, "fixture reset removed its workspace");
    invariant(resetRow?.authority_control === 1, "fixture reset removed authority controls");
    invariant(resetRow?.foreign_key_violations === 0, "fixture reset left foreign-key violations");

    return {
      migrationsApplied: sqlFiles.length,
      requiredTables: requiredTables.length,
      requiredTriggers: requiredTriggers.length,
      foreignKeyViolations: 0,
      fixtureTablesMaterialized: Object.keys(expectedCounts).length,
      fixtureTraceEvents: fixture.flightTraceEvents.length,
      fixtureEffectEvents: fixture.effectAttempt.events.length,
      negativeD1ProbesRejected: negativeProbes.length + 1,
      exactResetPreservedWorkspaceControlAndNonFixtureTrace: true,
    };
  } finally {
    const resolvedCleanup = resolve(persistencePath);
    invariant(
      resolvedCleanup.startsWith(`${tempRoot}${sep}`),
      "refusing recursive cleanup outside the operating-system temp directory",
    );
    await rm(resolvedCleanup, { recursive: true, force: true });
  }
}

export async function verifyDataPackage() {
  const [dataPackage, spec, specVerify, specGate, drizzleEntries] =
    await Promise.all([
      readFile(dataPackagePath, "utf8"),
      readFile(join(projectRoot, "factory/01_spec/output/SPEC.md"), "utf8"),
      readFile(join(projectRoot, "factory/01_spec/output/VERIFY.md"), "utf8"),
      readFile(join(projectRoot, "factory/01_spec/output/HUMAN_GATE.md"), "utf8"),
      readdir(join(projectRoot, "drizzle")),
    ]);

  invariant(frontmatterValue(specGate, "gate_status") === "closed", "Spec gate is not closed");
  invariant(frontmatterValue(specGate, "decision") === "accepted", "Spec gate is not accepted");
  invariant(
    frontmatterValue(specGate, "spec_sha256") === sha256Bytes(Buffer.from(spec)),
    "Spec gate does not bind the current Spec",
  );
  invariant(
    frontmatterValue(specGate, "verification_sha256") === sha256Bytes(Buffer.from(specVerify)),
    "Spec gate does not bind the current Spec verification",
  );

  for (const heading of [
    "## Acceptance boundary",
    "## Entity and ownership manifest",
    "## State machines",
    "## Canonicalization and validators",
    "## Golden fixture",
    "## Reset semantics",
    "## Migration manifest",
    "## Build handoff",
    "## Known limits",
    "## Declared input hashes",
  ]) {
    invariant(dataPackage.includes(heading), `Data Package is missing heading: ${heading}`);
  }

  const declared = declaredHashMap(dataPackage);
  invariant(declared.size === declaredInputs.length, "Data Package declared-input count is invalid");
  for (const input of declaredInputs) {
    invariant(declared.has(input), `Data Package does not declare input: ${input}`);
    const actual = await inputHash(input);
    invariant(declared.get(input) === actual, `Data Package input hash is stale: ${input}`);
  }

  invariant(
    Object.keys(STATE_TRANSITIONS).sort().join(",") ===
      "approval,context,effect,graph,intent,outcome,policy,trace",
    "a required state machine is missing",
  );

  const firstFixture = await buildGoldenFixture();
  const secondFixture = await buildGoldenFixture();
  const fixtureJson = stableStringify(firstFixture);
  invariant(fixtureJson === stableStringify(secondFixture), "golden fixture is not deterministic");
  const fixtureHash = sha256Bytes(Buffer.from(fixtureJson));
  invariant(
    dataPackage.includes(`fixture_sha256: ${fixtureHash}`),
    "Data Package fixture hash is stale",
  );
  invariant(firstFixture.fixtureKey === FIXTURE_KEY, "golden fixture key is invalid");
  invariant(firstFixture.trace.truthMode === "FIXTURE", "golden trace is not labeled FIXTURE");
  invariant(firstFixture.intent.truthMode === "TEST", "golden intent is not labeled TEST");
  invariant(firstFixture.intent.cohortCap === 3, "golden intent exceeds or misses its cohort cap");
  invariant(firstFixture.contextSnapshot.sourceCount === firstFixture.evidence.length, "context source count is unresolved");
  invariant(firstFixture.reasoningNodes.length === 6, "fixed reasoning graph is incomplete");
  invariant(findSecretPaths(firstFixture).length === 0, "golden fixture contains a secret-like value");
  invariant(
    (await validatePersistedActionIntent(firstFixture.intent)).length === 0,
    "golden persisted intent does not match its canonical payload",
  );

  const evidenceKeys = new Set(firstFixture.evidence.map((item) => item.evidenceKey));
  for (const pair of firstFixture.reasoningNodes) {
    for (const citation of JSON.parse(pair.artifact.evidenceCitationsJson)) {
      invariant(evidenceKeys.has(citation), `golden artifact has unresolved citation: ${citation}`);
    }
  }
  const assessmentEvidence = JSON.parse(firstFixture.outcomeAssessment.evidenceIdsJson);
  invariant(
    assessmentEvidence.every(
      (id) => evidenceKeys.has(id) || id === firstFixture.outcomeObservation.observationKey,
    ),
    "outcome assessment contains unresolved evidence",
  );

  const intent = firstFixture.intent;
  const policy = firstFixture.policyDecision;
  const grant = firstFixture.approvalGrant;
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
    now: "2026-08-13T08:02:00.000Z",
    priorAttemptCount: 0,
  };
  invariant(
    validateExecutionAuthority({ intent, policy, grant, request }).length === 0,
    "golden authority chain is invalid",
  );
  const negativeAuthority = [
    { ...request, actorWorkspaceId: "ws_other" },
    { ...request, killSwitchEngaged: true },
    { ...request, canonicalPayloadHash: "f".repeat(64) },
    { ...request, recipientSetHash: "e".repeat(64) },
    { ...request, priorAttemptCount: 1 },
    { ...request, now: "2026-08-15T08:02:00.000Z" },
  ];
  invariant(
    negativeAuthority.every(
      (candidate) =>
        validateExecutionAuthority({ intent, policy, grant, request: candidate }).length > 0,
    ),
    "an unauthorized execution path did not fail closed",
  );
  assertTransition("effect", "dispatching", "indeterminate");
  let ambiguousRetryRejected = false;
  try {
    assertTransition("effect", "indeterminate", "dispatching");
  } catch {
    ambiguousRetryRejected = true;
  }
  invariant(ambiguousRetryRejected, "indeterminate effects can be blindly retried");
  invariant(
    validateOutcomeAssessment({
      label: firstFixture.outcomeAssessment.label,
      evidenceIds: assessmentEvidence,
      limitations: JSON.parse(firstFixture.outcomeAssessment.limitationsJson),
      observationCount: 1,
      invalidSignatureCount: 0,
      observationTruthModes: [firstFixture.outcomeObservation.truthMode],
    }).length === 0,
    "golden outcome assessment is invalid",
  );

  const resetPackage = await buildResetPackage(firstFixture.workspace.id);
  invariant(resetPackage.fixtureKey === FIXTURE_KEY, "reset fixture key is invalid");
  invariant(resetPackage.deleteBindings.length === 3, "reset scope is not exact");

  const sqlNames = migrationNames(drizzleEntries);
  invariant(sqlNames.length === 6, "checked-in migration count is invalid");
  invariant(sqlNames.filter((name) => name.startsWith("0004_")).length === 1, "schema migration is missing or ambiguous");
  invariant(sqlNames.includes("0005_flight_recorder_guards.sql"), "guard migration is missing");
  const migrationsSource = await readFile(join(projectRoot, "db/migrations.ts"), "utf8");
  const runtimeTriggers = [...migrationsSource.matchAll(/"(trg_[a-z0-9_]+)"/g)].map(
    (match) => match[1],
  ).filter((name) => name !== "trg_evidence_observations_immutable");
  const stageRuntimeTriggers = runtimeTriggers.filter(
    (name) => name !== "trg_evidence_observations_immutable",
  );
  invariant(stageRuntimeTriggers.length === 53, "runtime compatibility must require 53 Stage 02 guard triggers");
  invariant(
    stableStringify([...stageRuntimeTriggers].sort()) === stableStringify([...requiredTriggers].sort()),
    "Data verifier trigger contract diverges from runtime compatibility",
  );
  const sqlFiles = sqlNames.map((name) => join(projectRoot, "drizzle", name));
  const sql = (await Promise.all(sqlFiles.map((path) => readFile(path, "utf8")))).join("\n");
  for (const table of requiredTables) {
    invariant(sql.includes(`CREATE TABLE \`${table}\``), `migration is missing table: ${table}`);
  }
  for (const trigger of requiredTriggers) {
    invariant(sql.includes(trigger), `migration is missing trigger: ${trigger}`);
  }
  const migrationMetadata = await verifyMigrationMetadata(sqlNames);
  const drizzleKitCheck = runDrizzleCheck();
  const migrationProbe = await verifyMigrations(sqlFiles, firstFixture);

  return {
    status: "passed",
    artifact: "factory/02_data/output/DATA_PACKAGE.md",
    fixtureKey: FIXTURE_KEY,
    fixtureSha256: fixtureHash,
    contextManifestSha256: firstFixture.contextSnapshot.manifestHash,
    intentPayloadSha256: firstFixture.intent.canonicalPayloadHash,
    stateMachines: Object.keys(STATE_TRANSITIONS).length,
    stageTables: requiredTables.length,
    guardTriggers: requiredTriggers.length,
    focusedContractTests: 7,
    unauthorizedPathsRejected: negativeAuthority.length + 3,
    migrationMetadata,
    drizzleKitCheck,
    migrationProbe,
  };
}

async function main() {
  process.stdout.write(`${JSON.stringify(await verifyDataPackage(), null, 2)}\n`);
}

const invokedUrl = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedUrl === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
