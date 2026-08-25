import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  fileHash,
  frontmatterValue,
  runChecked,
} from "../_lib/verify-kit.mjs";
import {
  L04_ACCEPTANCE_IDS,
  L04_AUTHORITY_TRACE_FIXTURE,
  L04_MIGRATION_CASES,
  L04_NEGATIVE_IDS,
  L04_RACE_SCHEDULES,
  validateL04Fixture,
} from "../../tests/fixtures/l04-authority-trace.fixture.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const expectedInputs = new Map(Object.entries({
  "factory/03_build/CONTEXT.md": "e0134c4e73046a6e3dbd87b3af6b123d8cb0b6e7e0a00b8d184705fe50021524",
  "factory/02_data/output/DATA_PACKAGE.md": "a503213bfcccd597700fe6934c365855d90d422d9c03b015bf10b2a96438979d",
  "factory/02_data/output/HUMAN_GATE.md": "d9e7efd6b2084026e5ee8c7a993670df2fba89539da0bc51c460f272e2b8aaa9",
  "factory/02_data/fixtures/l04-authority-trace.fixture.mjs": "cd565ba32b846e2848be56c6ef8c705bb13088d6424f80feb962d96411afa464",
  "factory/_shared/ARCHITECTURE_SNAPSHOT.md": "e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084",
  "factory/_shared/QUALITY_GATES.md": "081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f",
  "factory/_lib/verify-kit.mjs": "b2c7434bf3acacbfb6323b33cf0b175f77d0e3b1d66aeadee6e9ea996c95015c",
  "factory/_lib/factory-state.mjs": "72870904445d54f01eea443ed5a5de1b2af2fd19df66e085a52bf47982594d28",
  "package.json": "c8a9ab36760f08998d304efdc6a4d514a22f8d7ea05ab8c8df992ecc09f75972",
  "drizzle.config.ts": "3ec3fe6a06a9be54bbd980ec2fc72b014bfdc7d30b5c92d02aa0aa3c95e39b1a",
  "eslint.config.mjs": "6090bd544865638d8c77a3443f037b3b289596a7ec1e1dccc3a13677e6d1ca83",
  "tsconfig.json": "379054f6cec60ebd0e18c47a3ce72b2cc1b3f7abd0037c668e87cb2070891147",
}));

const stageOwnedProduct = new Set([
  "db/flight-recorder-schema.ts",
  "db/flight-recorder-contracts.ts",
  "db/flight-recorder.ts",
  "db/flight-recorder-demo.ts",
  "db/flight-recorder-graph.ts",
  "db/migrations.ts",
  "app/flight-recorder-types.ts",
  "app/CrossSignalApp.tsx",
  "drizzle/0008_l04_authority_history_trace_projection.sql",
  "drizzle/meta/0008_snapshot.json",
  "drizzle/meta/_journal.json",
  "tests/flight-recorder-data.test.mjs",
  "tests/flight-recorder-build.test.mjs",
  "tests/fixtures/l04-authority-trace.fixture.mjs",
]);

for (const [path, expected] of expectedInputs) {
  assert.equal(await fileHash(projectRoot, join(projectRoot, path)), expected, `input drift: ${path}`);
}

const gate = await readFile(join(projectRoot, "factory/02_data/output/HUMAN_GATE.md"), "utf8");
assert.equal(frontmatterValue(gate, "decision"), "accepted");
assert.equal(frontmatterValue(gate, "gate_status"), "closed");
assert.equal(frontmatterValue(gate, "data_package_sha256"), expectedInputs.get("factory/02_data/output/DATA_PACKAGE.md"));

const upstreamFixtureHash = await fileHash(projectRoot, join(projectRoot, "factory/02_data/fixtures/l04-authority-trace.fixture.mjs"));
const durableFixtureHash = await fileHash(projectRoot, join(projectRoot, "tests/fixtures/l04-authority-trace.fixture.mjs"));
assert.equal(durableFixtureHash, upstreamFixtureHash, "durable L04 fixture drifted from accepted Stage 02 truth");
assert.deepEqual(validateL04Fixture(), []);
assert.equal(L04_AUTHORITY_TRACE_FIXTURE.traceEvents.length, 34);
assert.equal(L04_ACCEPTANCE_IDS.length, 12);
assert.equal(L04_NEGATIVE_IDS.length, 12);
assert.equal(L04_RACE_SCHEDULES.length, 3);
assert.equal(L04_MIGRATION_CASES.length, 6);

const migration = await readFile(join(projectRoot, "drizzle/0008_l04_authority_history_trace_projection.sql"), "utf8");
for (const object of [
  "workspace_authority_control_events",
  "effect_authority_control_bindings",
  "idx_authority_control_events_sequence",
  "trg_l04_authority_events_append_only",
  "trg_l04_authority_events_delete_guard",
  "trg_l04_authority_events_sequence",
  "trg_l04_authority_events_actor",
  "trg_l04_legacy_authority_control_frozen",
  "trg_l04_effect_authority_binding_exact",
  "trg_l04_effect_reserved_requires_authority",
  "trg_l04_trace_executing_requires_authority",
  "migration_l04_unresolvable_effect_authority",
  "migration_l04_incomplete_trace_history",
]) assert.match(migration, new RegExp(object), `migration object missing: ${object}`);
assert.match(migration, /DELETE FROM `flight_traces` WHERE `truth_mode` = 'FIXTURE'/);
assert.doesNotMatch(migration, /DELETE FROM `workspace_authority_control_events`/);

const [snapshot, journal, runtime, contracts, appTypes, appUi, dataTests, buildTests] = await Promise.all([
  readFile(join(projectRoot, "drizzle/meta/0008_snapshot.json"), "utf8"),
  readFile(join(projectRoot, "drizzle/meta/_journal.json"), "utf8"),
  readFile(join(projectRoot, "db/flight-recorder.ts"), "utf8"),
  readFile(join(projectRoot, "db/flight-recorder-contracts.ts"), "utf8"),
  readFile(join(projectRoot, "app/flight-recorder-types.ts"), "utf8"),
  readFile(join(projectRoot, "app/CrossSignalApp.tsx"), "utf8"),
  readFile(join(projectRoot, "tests/flight-recorder-data.test.mjs"), "utf8"),
  readFile(join(projectRoot, "tests/flight-recorder-build.test.mjs"), "utf8"),
]);
for (const table of ["workspace_authority_control_events", "effect_authority_control_bindings"]) {
  assert.match(snapshot, new RegExp(table));
}
assert.match(journal, /0008_l04_authority_history_trace_projection/);
assert.doesNotMatch(runtime, /SELECT kill_switch_engaged FROM workspace_authority_controls/);
assert.doesNotMatch(runtime, /UPDATE workspace_authority_controls/);
for (const marker of ["sealAuthorityControlEvent", "latestAuthorityControl", "effect_authority_control_bindings", "projectFlightTraceEvents"]) {
  assert.match(runtime + contracts, new RegExp(marker));
}
for (const marker of ["authorityControlHistory", "traceEvents", "Persisted FIXTURE trace"]) {
  assert.match(appTypes + appUi, new RegExp(marker));
}
for (const marker of ["l04_stale_authority_control", "migration_backfill", "l04_authority_history_immutable", "traceEventCount", "payloadJson", "L04 fixture"]) {
  assert.match(dataTests + buildTests, new RegExp(marker));
}

const status = runChecked("git", ["status", "--porcelain=v1", "--untracked-files=all"], { cwd: projectRoot });
for (const line of status.stdout.split(/\r?\n/).filter(Boolean)) {
  const path = line.slice(3).replaceAll("\\", "/");
  if (path.startsWith("factory/") || path.startsWith("_archive/")) continue;
  assert.ok(stageOwnedProduct.has(path), `unauthorized Stage 03 path: ${path}`);
}
for (const forbidden of ["app/api/", "route.ts", "middleware", "worker/"]) {
  assert.equal([...stageOwnedProduct].some((path) => path.includes(forbidden)), false, `L14/out-of-scope surface entered: ${forbidden}`);
}

runChecked("node", ["node_modules/tsx/dist/cli.mjs", "--test", "tests/flight-recorder-data.test.mjs", "tests/flight-recorder-build.test.mjs"], { cwd: projectRoot, timeout: 180_000 });
runChecked("node", ["node_modules/eslint/bin/eslint.js", "app/CrossSignalApp.tsx", "app/flight-recorder-types.ts", "db/flight-recorder-schema.ts", "db/flight-recorder-contracts.ts", "db/flight-recorder-graph.ts", "db/flight-recorder.ts", "db/migrations.ts", "tests/flight-recorder-data.test.mjs", "tests/flight-recorder-build.test.mjs"], { cwd: projectRoot, timeout: 180_000 });
runChecked("node", ["node_modules/vinext/dist/cli.js", "build"], { cwd: projectRoot, timeout: 180_000 });

for (const output of ["BUILD_EVIDENCE.md", "VERIFY.md", "HUMAN_GATE.md"]) {
  await readFile(join(projectRoot, "factory/03_build/output", output), "utf8");
}
const verify = await readFile(join(projectRoot, "factory/03_build/output/VERIFY.md"), "utf8");
assert.equal(frontmatterValue(verify, "status"), "passed");

console.log("Stage 03 build verification passed: L04 durable history, exact binding, complete redacted projection, regressions, lint, and production build are green.");
