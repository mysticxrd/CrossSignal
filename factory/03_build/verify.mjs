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
    .update((await read(relative)).replaceAll("\r\n", "\n"))
    .digest("hex");
}

function runNode(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    timeout: 120_000,
  });
  assert.equal(
    result.status,
    0,
    `node ${args.join(" ")} failed:\n${result.error?.message ?? result.stderr ?? result.stdout}`,
  );
  return `${result.stdout}\n${result.stderr}`;
}

const [dataPackage, dataVerify, dataGate, schema, compatibility, runtime, migration, snapshot, journal, tests] =
  await Promise.all([
    read("factory/02_data/output/DATA_PACKAGE.md"),
    read("factory/02_data/output/VERIFY.md"),
    read("factory/02_data/output/HUMAN_GATE.md"),
    read("db/flight-recorder-schema.ts"),
    read("db/migrations.ts"),
    read("db/flight-recorder.ts"),
    read("drizzle/0006_l08_active_intent_authority.sql"),
    read("drizzle/meta/0006_snapshot.json"),
    read("drizzle/meta/_journal.json"),
    read("tests/flight-recorder-build.test.mjs"),
  ]);

assert.match(dataGate, /gate_status: closed/);
assert.match(dataGate, /decision: accepted/);
assert.match(dataGate, new RegExp(`data_package_sha256: ${await hash("factory/02_data/output/DATA_PACKAGE.md")}`));
assert.match(dataGate, new RegExp(`verification_sha256: ${await hash("factory/02_data/output/VERIFY.md")}`));
assert.match(dataPackage, /active_intent_id` is the sole database-owned authority head/);
assert.match(dataVerify, /status: passed/);

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
  AUTHORITY_ERRORS.pointerRejected,
  AUTHORITY_ERRORS.projectionMismatch,
  AUTHORITY_ERRORS.migrationHistoricalMismatch,
  AUTHORITY_ERRORS.migrationMissingHead,
]) assert.match(migration, new RegExp(token));

assert.match(migration, /ORDER BY prior_intent\.`created_at` DESC, prior_intent\.`rowid` DESC/);
assert.match(migration, /ORDER BY latest\.`created_at` DESC, latest\.`rowid` DESC/);
assert.match(migration, /DROP TRIGGER `trg_action_intents_immutable`/);
assert.match(migration, /CREATE TRIGGER `trg_action_intents_immutable`/);
assert.match(snapshot, /"active_intent_id"/);
assert.match(snapshot, /"supersedes_intent_id"/);
assert.match(journal, /0006_l08_active_intent_authority/);

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
assert.match(runtime, /intentStatement\(next\.intent, prior\.id\)/);
assert.match(runtime, /installAuthorizationRaceBarrierForTest/);
assert.match(runtime, /installReplacementRaceBarrierForTest/);
assert.match(runtime, /AND active_intent_id = \?/);
assert.match(runtime, /l08_stale_or_superseded_intent/);
assert.match(runtime, /l08_intent_activation_rejected/);

const fixture = buildAuthorityRaceFixture();
assert.deepEqual(validateAuthorityRaceFixture(fixture), []);
assert.equal(Object.keys(fixture.schedules).length, 2);
assert.equal(fixture.directDatabaseAttacks.length, 10);
assert.equal(MIGRATION_CASES.length, 5);
assert.match(tests, /production operations fail closed in both deterministic L08 schedules/);
assert.match(tests, /direct database guards reject the ten accepted L08 attacks/);
assert.match(tests, /migration 0006 handles the canonical L08 matrix atomically/);

const dataTestOutput = runNode(["--import", "tsx", "--test", "tests/flight-recorder-data.test.mjs"]);
assert.match(dataTestOutput, /tests 7/);
const buildTestOutput = runNode(["--import", "tsx", "--test", "tests/flight-recorder-build.test.mjs"]);
assert.match(buildTestOutput, /tests 15/);

const declaredInputPaths = [
  "factory/03_build/CONTEXT.md",
  "factory/02_data/output/DATA_PACKAGE.md",
  "factory/02_data/output/VERIFY.md",
  "factory/02_data/output/HUMAN_GATE.md",
  "factory/_shared/ARCHITECTURE_SNAPSHOT.md",
  "factory/_shared/QUALITY_GATES.md",
  "db/flight-recorder-schema.ts",
  "db/migrations.ts",
  "db/flight-recorder.ts",
  "drizzle/0006_l08_active_intent_authority.sql",
  "drizzle/meta/0006_snapshot.json",
  "drizzle/meta/_journal.json",
  "tests/flight-recorder-data.test.mjs",
  "tests/flight-recorder-build.test.mjs",
  "factory/02_data/fixtures/onboarding-rescue.fixture.mjs",
  "factory/02_data/fixtures/reset.mjs",
  "factory/02_data/fixtures/superseded-intent-authority.fixture.mjs",
  "package.json",
];
const declaredInputs = Object.fromEntries(
  await Promise.all(declaredInputPaths.map(async (path) => [path, await hash(path)])),
);

console.log(JSON.stringify({
  status: "passed",
  finding: "L08",
  redReproduction: "sealed 0005 accepted a stale v1 grant after v2 replacement",
  deterministicSchedules: 2,
  directDatabaseAttacks: 10,
  migrationCases: 5,
  targetedTests: { data: 7, build: 15 },
  declaredInputs,
}, null, 2));
