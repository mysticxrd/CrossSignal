import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";
import {
  fileHash,
  frontmatterValue,
  markdownHashBindings,
  repositoryPath,
  runChecked,
} from "../_lib/verify-kit.mjs";

const projectRoot = resolve(import.meta.dirname, "../..");
const outputRoot = resolve(import.meta.dirname, "output");
const reportPath = resolve(outputRoot, "VERIFICATION_REPORT.md");
const verifyPath = resolve(outputRoot, "VERIFY.md");
const gatePath = resolve(outputRoot, "HUMAN_GATE.md");

const expectedBindings = new Map(Object.entries({
  "factory/04_verify/CONTEXT.md": "d5b7c506760afd06e4706d9e16fadfe51a97b7ce686c15fd84587988492732fa",
  "factory/03_build/output/BUILD_EVIDENCE.md": "f196e33acd0961016cd2a6b5857f9d09781ee72896fc156c8c22f50f577b67bc",
  "factory/03_build/output/HUMAN_GATE.md": "cf40bdb92a0a723290563e82b61f27bbc5183cc3f6d8afb7c64f6b24bc23b2c3",
  "factory/02_data/output/DATA_PACKAGE.md": "9fbda72f20659df210d95a6be5b1a13dbe4fde288461d5f435fcfdc8164bbaa6",
  "factory/01_spec/output/SPEC.md": "f90a9fa515c9e8357b12bb0374939fdeec7ba4580ffc6573d2f8384fdc67ea7c",
  "factory/_shared/ARCHITECTURE_SNAPSHOT.md": "e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084",
  "factory/_shared/QUALITY_GATES.md": "081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f",
  "db/flight-recorder.ts": "2cea63997ca52a5404fb02287297371c0a32d17d53a28512f7147243c01c6b39",
  "db/flight-recorder-graph.ts": "7ccfdf3bd101ec3152da9bf3eb3b366197e0fc7bc708a81ea24275e33d334061",
  "db/flight-recorder-demo.ts": "2d23a77f6ebea793650677872895c1376123a38bdeeec7f0dc6109a1bdbc08db",
  "db/flight-recorder-contracts.ts": "5057dd60c778165f11444875c5bfb6b669e8e889d1363ec9ebf5268af3bc9799",
  "db/flight-recorder-schema.ts": "aaf5a11d3f8e2a77c1d358891248c246551f9670493a4b0e8fb32b1e579ae9cb",
  "db/migrations.ts": "7d7512db9c1e49eeffa2089b6fb6ffee1c5071b899958d66ff3c8e198d5b1062",
  "drizzle/0007_l06_persisted_graph_executor.sql": "4649dc761eb877d4fc708bd6e8928e04375ccc1021486024b893eb62bec1cf1c",
  "drizzle/meta/0007_snapshot.json": "28d211019b32ddbd8ef3316b0a16e1a7163ce1bcff7ecb09c6e6419ea5f12eae",
  "drizzle/meta/_journal.json": "c8e05396284aef1f5307dcd0d6fd16a0c06cfa30a4cd227a46f7f8086ae634a7",
  "tests/flight-recorder-build.test.mjs": "7c5be086037e7dcb293ea6e76db17297d38ae1542c07231024ebe53e00359974",
  "tests/flight-recorder-release.test.mjs": "fda88e925e632e4d4aa25dc365712f2a14ae2074440d625c4974a145fe6c3b88",
  "app/flight-recorder-types.ts": "599890454757b677593540167c9359d2a6bd03b40bb361fc446128b58b4a1c24",
}));

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return { url: "cfr-verify:cloudflare-workers", shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === "cfr-verify:cloudflare-workers") {
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
  REASONING_HANDLER_VERSION,
  REASONING_NODE_REGISTRY,
  claimPersistedReasoningNode,
  installReasoningRuntimeHooksForTest,
  runPersistedReasoningGraph,
  summarizePersistedReasoningGraph,
} = await import("../../db/flight-recorder-graph.ts");
const { sealCanonical } = await import("../../db/flight-recorder-contracts.ts");
const { getOrCreateFlightRecorderSnapshot } = await import("../../db/flight-recorder.ts");

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

  runSync() {
    const result = this.database.prepare(this.sql).run(...this.values);
    return { success: true, meta: { changes: Number(result.changes ?? 0) } };
  }

  async run() {
    return this.runSync();
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
    applyMigration(database, await readFile(resolve(projectRoot, "drizzle", name), "utf8"));
  }
  return database;
}

function insert(database, table, record) {
  assert.match(table, /^[a-z_][a-z0-9_]*$/i);
  const columns = Object.keys(record);
  for (const column of columns) assert.match(column, /^[a-z_][a-z0-9_]*$/i);
  database.prepare(`INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`)
    .run(...Object.values(record));
}

function seedOwner(database, suffix) {
  const userId = `verify-owner-${suffix}`;
  const workspaceId = `verify-workspace-${suffix}`;
  insert(database, "users", {
    id: userId,
    email: `${userId}@example.test`,
    display_name: "Stage 04 verifier",
  });
  insert(database, "workspaces", {
    id: workspaceId,
    name: `Stage 04 ${suffix}`,
    slug: workspaceId,
    owner_user_id: userId,
  });
  insert(database, "workspace_members", {
    workspace_id: workspaceId,
    user_id: userId,
    role: "owner",
  });
  return {
    userId,
    workspaceId,
    request(traceId) {
      return { userId, actorWorkspaceId: workspaceId, workspaceId, traceId };
    },
  };
}

function traceIdFor(database, workspaceId) {
  const trace = database.prepare("SELECT id FROM flight_traces WHERE workspace_id = ? LIMIT 1")
    .get(workspaceId);
  assert.ok(trace?.id);
  return trace.id;
}

function scopeProjection(database, workspaceId) {
  const projection = {};
  for (const table of [
    "flight_traces",
    "reasoning_nodes",
    "reasoning_artifacts",
    "flight_trace_events",
    "action_intents",
    "policy_decisions",
    "approval_grants",
    "effect_attempts",
  ]) {
    projection[table] = Number(database.prepare(`SELECT COUNT(*) count FROM ${table} WHERE workspace_id = ?`)
      .get(workspaceId).count);
  }
  return projection;
}

async function runIndependentRuntimeProbe() {
  const database = await freshDatabase();
  globalThis.__cfrCloudflareEnv.DB = new TestD1Database(database);
  try {
    assert.equal(database.prepare("PRAGMA foreign_keys").get().foreign_keys, 1);
    assert.equal(
      database.prepare("SELECT COUNT(*) count FROM pragma_table_info('reasoning_nodes') WHERE name IN ('logical_node_id','execution_mode','predecessor_outputs_json','lease_token','completion_token_hash')")
        .get().count,
      5,
    );

    const cold = seedOwner(database, "cold");
    const invocations = Object.fromEntries(REASONING_NODE_REGISTRY.map(({ nodeKey }) => [nodeKey, 0]));
    let uninstall = installReasoningRuntimeHooksForTest({
      now: () => "2026-08-24T12:00:00.000Z",
      leaseToken: (nodeKey, attempt) => `verify-cold-${nodeKey}-${attempt}`,
      onHandlerInvocation: (nodeKey) => {
        invocations[nodeKey] += 1;
      },
    });
    let snapshot;
    try {
      snapshot = await getOrCreateFlightRecorderSnapshot(cold.userId, cold.workspaceId);
    } finally {
      uninstall();
    }
    const coldSummary = await summarizePersistedReasoningGraph(cold.request(snapshot.traceId));
    assert.equal(coldSummary.traceState, "awaiting_approval");
    assert.equal(coldSummary.graphVersion, REASONING_GRAPH_VERSION);
    assert.equal(coldSummary.truthMode, "FIXTURE");
    assert.equal(coldSummary.attempts.length, 6);
    assert.equal(coldSummary.artifacts.length, 6);
    assert.deepEqual(invocations, Object.fromEntries(REASONING_NODE_REGISTRY.map(({ nodeKey }) => [nodeKey, 1])));
    assert.ok(coldSummary.attempts.every((row) => row.current_state === "succeeded"));
    assert.ok(coldSummary.attempts.every((row) => row.execution_mode === "runtime"));
    assert.ok(coldSummary.attempts.every((row) => row.graph_version === REASONING_GRAPH_VERSION));
    assert.ok(coldSummary.attempts.every((row) => row.handler_version === REASONING_HANDLER_VERSION));
    assert.doesNotMatch(JSON.stringify(snapshot), /leaseToken|lease_token|verify-cold/);

    const context = database.prepare("SELECT manifest_hash FROM context_snapshots WHERE workspace_id = ? AND trace_id = ?")
      .get(cold.workspaceId, snapshot.traceId);
    const artifactByNodeId = new Map(coldSummary.artifacts.map((artifact) => [artifact.node_id, artifact]));
    for (const attempt of coldSummary.attempts) {
      const predecessorOutputs = JSON.parse(attempt.predecessor_outputs_json);
      const sealedInput = await sealCanonical({
        workspaceId: cold.workspaceId,
        traceId: snapshot.traceId,
        truthMode: "FIXTURE",
        contextManifestHash: context.manifest_hash,
        graphVersion: REASONING_GRAPH_VERSION,
        nodeKey: attempt.node_key,
        handlerVersion: REASONING_HANDLER_VERSION,
        attempt: Number(attempt.attempt),
        predecessorOutputs,
      });
      assert.equal(attempt.input_hash, sealedInput.sha256);
      const persistedNode = database.prepare("SELECT id, lease_token, lease_expires_at FROM reasoning_nodes WHERE workspace_id = ? AND trace_id = ? AND node_key = ? AND attempt = ?")
        .get(cold.workspaceId, snapshot.traceId, attempt.node_key, attempt.attempt);
      assert.equal(persistedNode.lease_token, null);
      assert.equal(persistedNode.lease_expires_at, null);
      const artifact = artifactByNodeId.get(persistedNode.id);
      assert.ok(artifact);
      assert.equal(attempt.output_hash, artifact.content_hash);
      const content = JSON.parse(artifact.content_json);
      assert.equal(content.truthMode, "FIXTURE");
      assert.equal(content.usage.status, "unknown");
      assert.equal(content.usage.measuredCostUsd, null);
    }
    assert.deepEqual(coldSummary.authorityCounts, {
      action_intents: 1,
      policy_decisions: 1,
      approval_grants: 0,
      effect_attempts: 0,
      outcome_observations: 0,
      outcome_assessments: 0,
    });
    assert.deepEqual(
      coldSummary.events.map(({ sequence }) => Number(sequence)),
      coldSummary.events.map((_, index) => index + 1),
    );
    assert.equal(new Set(coldSummary.events.map(({ idempotency_key }) => idempotency_key)).size, coldSummary.events.length);

    const beforeRejectedRequests = scopeProjection(database, cold.workspaceId);
    await assert.rejects(
      runPersistedReasoningGraph({ ...cold.request(snapshot.traceId), nodes: ["attacker"] }),
      new RegExp(REASONING_ERRORS.arbitraryGraph),
    );
    await assert.rejects(
      runPersistedReasoningGraph({ ...cold.request(snapshot.traceId), truthMode: "LIVE" }),
      new RegExp(REASONING_ERRORS.arbitraryGraph),
    );
    await assert.rejects(
      runPersistedReasoningGraph({ ...cold.request(snapshot.traceId), actorWorkspaceId: "foreign-workspace" }),
      new RegExp(REASONING_ERRORS.tenantMismatch),
    );
    assert.deepEqual(scopeProjection(database, cold.workspaceId), beforeRejectedRequests);

    const resume = seedOwner(database, "resume");
    uninstall = installReasoningRuntimeHooksForTest({
      now: () => "2026-08-24T12:10:00.000Z",
      leaseToken: (nodeKey, attempt) => `verify-resume-seed-${nodeKey}-${attempt}`,
      stopAfterCompletions: 3,
    });
    try {
      await assert.rejects(getOrCreateFlightRecorderSnapshot(resume.userId, resume.workspaceId));
    } finally {
      uninstall();
    }
    const resumeTraceId = traceIdFor(database, resume.workspaceId);
    const beforeResume = await summarizePersistedReasoningGraph(resume.request(resumeTraceId));
    const preserved = beforeResume.attempts.filter(({ current_state }) => current_state === "succeeded")
      .map((row) => ({ ...row }));
    assert.equal(preserved.length, 3);
    uninstall = installReasoningRuntimeHooksForTest({
      now: () => "2026-08-24T12:10:01.000Z",
      leaseToken: (nodeKey, attempt) => `verify-resume-rest-${nodeKey}-${attempt}`,
    });
    let afterResume;
    try {
      afterResume = await runPersistedReasoningGraph(resume.request(resumeTraceId));
    } finally {
      uninstall();
    }
    assert.equal(afterResume.traceState, "awaiting_approval");
    assert.equal(afterResume.artifacts.length, 6);
    assert.deepEqual(afterResume.attempts.slice(0, 3).map((row) => ({ ...row })), preserved);

    const crash = seedOwner(database, "crash");
    uninstall = installReasoningRuntimeHooksForTest({
      now: () => "2026-08-24T12:20:00.000Z",
      leaseToken: () => "verify-crash-planner-1",
      afterClaim: async (nodeKey) => nodeKey === "planner" ? "stop" : "continue",
    });
    try {
      await assert.rejects(getOrCreateFlightRecorderSnapshot(crash.userId, crash.workspaceId));
    } finally {
      uninstall();
    }
    const crashTraceId = traceIdFor(database, crash.workspaceId);
    uninstall = installReasoningRuntimeHooksForTest({ now: () => "2026-08-24T12:20:00.000Z" });
    try {
      assert.deepEqual(await claimPersistedReasoningNode(crash.request(crashTraceId), "planner"), {
        status: "busy",
        attempt: 1,
      });
    } finally {
      uninstall();
    }
    uninstall = installReasoningRuntimeHooksForTest({
      now: () => "2026-08-24T12:20:31.000Z",
      leaseToken: (nodeKey, attempt) => `verify-recovered-${nodeKey}-${attempt}`,
    });
    let afterRecovery;
    try {
      afterRecovery = await runPersistedReasoningGraph(crash.request(crashTraceId));
    } finally {
      uninstall();
    }
    const plannerAttempts = afterRecovery.attempts.filter(({ node_key }) => node_key === "planner");
    assert.equal(plannerAttempts.length, 2);
    assert.equal(plannerAttempts[0].current_state, "failed");
    assert.equal(plannerAttempts[0].error_code, REASONING_ERRORS.interruptedAttempt);
    assert.equal(plannerAttempts[1].current_state, "succeeded");

    const failure = seedOwner(database, "failure");
    uninstall = installReasoningRuntimeHooksForTest({
      now: () => "2026-08-24T12:30:00.000Z",
      leaseToken: (nodeKey, attempt) => `verify-failure-${nodeKey}-${attempt}`,
      failNode: "skeptic",
    });
    try {
      await assert.rejects(
        getOrCreateFlightRecorderSnapshot(failure.userId, failure.workspaceId),
        new RegExp(REASONING_ERRORS.handlerFailed),
      );
    } finally {
      uninstall();
    }
    const failureTraceId = traceIdFor(database, failure.workspaceId);
    const failureSummary = await summarizePersistedReasoningGraph(failure.request(failureTraceId));
    assert.equal(failureSummary.traceState, "failed");
    assert.equal(failureSummary.artifacts.length, 4);
    assert.deepEqual(failureSummary.authorityCounts, {
      action_intents: 0,
      policy_decisions: 0,
      approval_grants: 0,
      effect_attempts: 0,
      outcome_observations: 0,
      outcome_assessments: 0,
    });

    return {
      migrationsApplied: migrationNames.length,
      coldRuntimeAttempts: coldSummary.attempts.length,
      coldArtifacts: coldSummary.artifacts.length,
      recomputedInputHashes: coldSummary.attempts.length,
      resumePreservedNodes: preserved.length,
      recoveredPlannerAttempts: plannerAttempts.length,
      failedGraphArtifacts: failureSummary.artifacts.length,
      rejectedRequestsWithoutMutation: 3,
      authorityAfterGraph: { intents: 1, policies: 1, grants: 0, effects: 0 },
    };
  } finally {
    database.close();
  }
}

const [report, verification, gate, stageThreeGate] = await Promise.all([
  readFile(reportPath, "utf8"),
  readFile(verifyPath, "utf8"),
  readFile(gatePath, "utf8"),
  readFile(resolve(projectRoot, "factory/03_build/output/HUMAN_GATE.md"), "utf8"),
]);

assert.equal(frontmatterValue(stageThreeGate, "gate_status"), "closed");
assert.equal(frontmatterValue(stageThreeGate, "decision"), "accepted");
assert.equal(frontmatterValue(gate, "stage"), "04_verify");
assert.ok(["open", "closed"].includes(frontmatterValue(gate, "gate_status")));
assert.equal(frontmatterValue(verification, "status"), "passed");
assert.equal(frontmatterValue(gate, "verification_report_sha256"), await fileHash(projectRoot, reportPath));
assert.equal(frontmatterValue(gate, "verification_sha256"), await fileHash(projectRoot, verifyPath));

const bindings = markdownHashBindings(report);
assert.equal(bindings.length, expectedBindings.size, "Stage 04 binding count changed");
assert.deepEqual(new Set(bindings.map(({ input }) => input)), new Set(expectedBindings.keys()));
for (const { input, expected } of bindings) {
  assert.equal(expected, expectedBindings.get(input), `binding constant drifted: ${input}`);
  assert.equal(await fileHash(projectRoot, resolve(projectRoot, input)), expected, `Stage 04 binding drifted: ${input}`);
}

for (let criterion = 1; criterion <= 14; criterion += 1) {
  assert.match(report, new RegExp(`AC-L06-${String(criterion).padStart(2, "0")}[^\\n]*PASS`));
}
assert.match(report, /`FIXTURE` truth mode/i);
assert.match(report, /cost remains unknown/i);
assert.match(report, /L20, L04, and L14 remain open/);
assert.doesNotMatch(report, /production model (?:ran|executed)|exactly-once delivery|causally proved/i);
assert.match(verification, /independent persisted-runtime probe/i);
assert.match(verification, /git diff --check/);

const probe = await runIndependentRuntimeProbe();
const tsx = resolve(projectRoot, "node_modules/tsx/dist/cli.mjs");
const vinext = resolve(projectRoot, "node_modules/vinext/dist/cli.js");
const eslint = resolve(projectRoot, "node_modules/eslint/bin/eslint.js");

const tests = runChecked(
  process.execPath,
  [tsx, "--test", "tests/flight-recorder-build.test.mjs", "tests/flight-recorder-release.test.mjs"],
  { cwd: projectRoot, timeout: 120_000 },
);
assert.match(tests.stdout, /fail 0/);
assert.match(tests.stdout, /L06 resumes after every completed-node boundary without replay/);
assert.match(tests.stdout, /L06 concurrent executor calls converge on one canonical graph/);
assert.match(tests.stdout, /all fourteen L06 direct-database attacks fail with zero partial mutation/);
assert.match(tests.stdout, /production operations fail closed in both deterministic L08 schedules/);
assert.match(tests.stdout, /direct database guards reject the ten accepted L08 attacks/);

runChecked(process.execPath, [vinext, "build"], { cwd: projectRoot, timeout: 120_000 });
runChecked(
  process.execPath,
  [
    eslint,
    "app",
    "db",
    "worker",
    "tests",
    "factory/01_spec",
    "factory/02_data",
    "factory/03_build",
    "factory/04_verify",
    "factory/_lib",
    "--ignore-pattern",
    "output",
    "--ignore-pattern",
    "screenshots",
  ],
  { cwd: projectRoot, timeout: 120_000 },
);
runChecked(process.execPath, ["--test", "factory/_lib/factory-tools.test.mjs"], {
  cwd: projectRoot,
  timeout: 120_000,
});
runChecked("git", ["diff", "--check"], { cwd: projectRoot, timeout: 120_000 });

process.stdout.write(`${JSON.stringify({
  status: "passed",
  stage: "04_verify",
  unit: "persisted-graph-executor-correction",
  graphVersion: REASONING_GRAPH_VERSION,
  executionMode: "runtime",
  truthMode: "FIXTURE",
  acceptanceCriteria: 14,
  resumeBoundaries: 5,
  l06DatabaseAttacks: 14,
  l08DatabaseAttacks: 10,
  l08RaceSchedules: 2,
  migrationCases: 5,
  independentProbe: probe,
  costStatus: "unknown",
  remainingFindings: ["L20", "L04", "L14"],
  evidence: repositoryPath(projectRoot, reportPath),
}, null, 2)}\n`);
