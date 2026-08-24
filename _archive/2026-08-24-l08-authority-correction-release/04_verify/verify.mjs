import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AUTHORITY_ERRORS,
  MIGRATION_CASES,
  buildAuthorityRaceFixture,
  validateAuthorityRaceFixture,
} from "../02_data/fixtures/superseded-intent-authority.fixture.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");

async function read(relative) {
  return readFile(join(root, relative), "utf8");
}

async function hash(relative) {
  return createHash("sha256")
    .update((await read(relative)).replace(/\r\n?/g, "\n"))
    .digest("hex");
}

function runNode(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    timeout: 180_000,
  });
  assert.equal(
    result.status,
    0,
    `node ${args.join(" ")} failed:\n${result.error?.message ?? result.stderr ?? result.stdout}`,
  );
  return `${result.stdout}\n${result.stderr}`;
}

const [context, buildEvidence, buildGate, architecture, quality, schema, compatibility, runtime, migration, tests] =
  await Promise.all([
    read("factory/04_verify/CONTEXT.md"),
    read("factory/03_build/output/BUILD_EVIDENCE.md"),
    read("factory/03_build/output/HUMAN_GATE.md"),
    read("factory/_shared/ARCHITECTURE_SNAPSHOT.md"),
    read("factory/_shared/QUALITY_GATES.md"),
    read("db/flight-recorder-schema.ts"),
    read("db/migrations.ts"),
    read("db/flight-recorder.ts"),
    read("drizzle/0006_l08_active_intent_authority.sql"),
    read("tests/flight-recorder-build.test.mjs"),
  ]);

assert.match(buildGate, /^gate_status: closed$/m);
assert.match(buildGate, /^decision: accepted$/m);
assert.match(buildGate, new RegExp(`^build_evidence_sha256: ${await hash("factory/03_build/output/BUILD_EVIDENCE.md")}$`, "m"));
assert.match(buildEvidence, /^finding: L08$/m);
assert.match(context, /independently verify that only the trace's exact active intent can be\s+authorized/);
assert.match(architecture, /Any payload, context, policy, recipient, cap, or display mutation creates a\s+new intent and invalidates prior approval/);
assert.match(quality, /Changed, stale, replayed, cross-tenant, or directly invoked authority fails\s+closed/);

const artifactBindings = [...buildEvidence.matchAll(/^\| `([^`]+)` \| `([0-9a-f]{64})` \|$/gm)];
const acceptedArtifactPaths = new Set([
  "db/flight-recorder-schema.ts",
  "db/migrations.ts",
  "db/flight-recorder.ts",
  "drizzle/0006_l08_active_intent_authority.sql",
  "drizzle/meta/0006_snapshot.json",
  "drizzle/meta/_journal.json",
  "tests/flight-recorder-build.test.mjs",
  "factory/03_build/verify.mjs",
]);
const observedBindings = {};
for (const [, path, expected] of artifactBindings) {
  if (!acceptedArtifactPaths.has(path)) continue;
  const actual = await hash(path);
  assert.equal(actual, expected, `accepted Build artifact drift: ${path}`);
  observedBindings[path] = actual;
}
assert.equal(Object.keys(observedBindings).length, acceptedArtifactPaths.size);

for (const token of [
  "activeIntentId: text(\"active_intent_id\")",
  "supersedesIntentId: text(\"supersedes_intent_id\")",
  "idx_flight_traces_workspace_active_intent",
  "idx_action_intents_one_successor",
]) assert.match(schema, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

for (const token of [
  "trg_flight_traces_active_intent_transition",
  "trg_policy_decisions_activate_intent",
  "trg_flight_traces_required_active_intent",
  "trg_approval_grants_bind_active_intent",
  "trg_effect_attempts_bind_active_intent",
  "trg_flight_trace_events_executing_projection",
  AUTHORITY_ERRORS.staleAuthorization,
  AUTHORITY_ERRORS.activationRejected,
  AUTHORITY_ERRORS.projectionMismatch,
  AUTHORITY_ERRORS.migrationHistoricalMismatch,
]) assert.match(migration, new RegExp(token));

for (const token of [
  "active_intent_id",
  "supersedes_intent_id",
  "idx_flight_traces_workspace_active_intent",
  "idx_action_intents_one_successor",
  "trg_policy_decisions_activate_intent",
  "trg_approval_grants_bind_active_intent",
  "trg_effect_attempts_bind_active_intent",
  "trg_flight_trace_events_executing_projection",
]) assert.match(compatibility, new RegExp(token));

const activeLookup = runtime.slice(
  runtime.indexOf("async function activeIntent"),
  runtime.indexOf("async function activePolicy"),
);
assert.match(activeLookup, /WHERE id = \? AND workspace_id = \? AND trace_id = \? LIMIT 1/);
assert.doesNotMatch(activeLookup, /ORDER BY|created_at|rowid|MAX\(/);
assert.match(runtime, /activeIntent\(workspaceId, trace\.id, trace\.active_intent_id\)/);
assert.match(runtime, /AND active_intent_id = \?/);
assert.match(runtime, /installAuthorizationRaceBarrierForTest/);
assert.match(runtime, /installReplacementRaceBarrierForTest/);
assert.match(runtime, /l08_stale_or_superseded_intent/);
assert.match(runtime, /l08_intent_activation_rejected/);

const fixture = buildAuthorityRaceFixture();
assert.deepEqual(validateAuthorityRaceFixture(fixture), []);
assert.equal(Object.keys(fixture.schedules).length, 2);
assert.equal(fixture.directDatabaseAttacks.length, 10);
assert.equal(MIGRATION_CASES.length, 5);

for (const title of [
  "a superseded intent cannot acquire a grant after replacement wins",
  "production operations fail closed in both deterministic L08 schedules",
  "direct database guards reject the ten accepted L08 attacks",
  "migration 0006 handles the canonical L08 matrix atomically",
  "failed and indeterminate result states are terminal without retry",
]) assert.match(tests, new RegExp(title));

const buildOutput = runNode(["--import", "tsx", "--test", "tests/flight-recorder-build.test.mjs"]);
assert.match(buildOutput, /tests 15/);
assert.match(buildOutput, /fail 0/);
const dataOutput = runNode(["--import", "tsx", "--test", "tests/flight-recorder-data.test.mjs"]);
assert.match(dataOutput, /tests 7/);
assert.match(dataOutput, /fail 0/);

const declaredInputPaths = [
  "factory/04_verify/CONTEXT.md",
  "factory/03_build/output/BUILD_EVIDENCE.md",
  "factory/03_build/output/HUMAN_GATE.md",
  "factory/_shared/ARCHITECTURE_SNAPSHOT.md",
  "factory/_shared/QUALITY_GATES.md",
  "factory/02_data/fixtures/superseded-intent-authority.fixture.mjs",
];
const declaredInputs = Object.fromEntries(
  await Promise.all(declaredInputPaths.map(async (path) => [path, await hash(path)])),
);

console.log(JSON.stringify({
  status: "passed",
  finding: "L08",
  acceptanceCriteriaResolved: [
    "exact-active-head",
    "edit-wins-no-partial-authority",
    "authorization-wins-no-partial-replacement",
    "transactional-guard-alignment",
    "runtime-order-independence",
    "atomic-migration-matrix",
    "direct-database-attack-matrix",
    "terminal-results-no-retry",
  ],
  deterministicSchedules: 2,
  directDatabaseAttacks: 10,
  migrationCases: 5,
  targetedTests: { data: 7, build: 15 },
  declaredInputs,
  observedBindings,
}, null, 2));
