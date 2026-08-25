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

const inputHashes = Object.freeze({
  "factory/04_verify/CONTEXT.md": "915d621466df18aae1fdd25afb7d5f751d359bba10b5212b987bd413194f5393",
  "factory/03_build/output/BUILD_EVIDENCE.md": "4115ea1b852b8cbebcd11cdd9da341b1406424a7140d68c7195ccfe36b5ac246",
  "factory/03_build/output/VERIFY.md": "be0e44a282f52929a282bae5c034aff01ecfee81e9038067468cee9e80b8483a",
  "factory/03_build/output/HUMAN_GATE.md": "7d6776a41fc6d1c86cb2cd05668fbba106f4f0922aa34e3d366f148371ecfeeb",
  "factory/01_spec/output/SPEC.md": "a61807c8500b2b1038c8acdeb340d82999fc86c1be53bd428e6390f74204a527",
  "factory/02_data/output/DATA_PACKAGE.md": "a503213bfcccd597700fe6934c365855d90d422d9c03b015bf10b2a96438979d",
  "factory/02_data/fixtures/l04-authority-trace.fixture.mjs": "cd565ba32b846e2848be56c6ef8c705bb13088d6424f80feb962d96411afa464",
  "factory/_shared/ARCHITECTURE_SNAPSHOT.md": "e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084",
  "factory/_shared/QUALITY_GATES.md": "081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f",
  "factory/_lib/verify-kit.mjs": "b2c7434bf3acacbfb6323b33cf0b175f77d0e3b1d66aeadee6e9ea996c95015c",
  "factory/_lib/factory-state.mjs": "72870904445d54f01eea443ed5a5de1b2af2fd19df66e085a52bf47982594d28",
  "package.json": "c8a9ab36760f08998d304efdc6a4d514a22f8d7ea05ab8c8df992ecc09f75972",
  "eslint.config.mjs": "6090bd544865638d8c77a3443f037b3b289596a7ec1e1dccc3a13677e6d1ca83",
  "tsconfig.json": "379054f6cec60ebd0e18c47a3ce72b2cc1b3f7abd0037c668e87cb2070891147",
  "factory/01_spec/verify.mjs": "b714e852ec0afcc37c5fab0be8e7df885aed17faba08124a10da0fe964c1cf4d",
  "tests/icm-workspace.test.mjs": "549c1f9dd55c864a1bdb745ebae4b2fdfa168258a4fa9d29b7b06a68a05ba312",
});

const productHashes = Object.freeze({
  "db/flight-recorder-schema.ts": "18f30283877491c7a15de0667134aa07cd1ff21e41f9b626f0377b145c46cd09",
  "db/flight-recorder-contracts.ts": "e6d61497b43979aeb8dd9154c49aec7a04949a8db22ea30107dd82c05f796192",
  "db/flight-recorder.ts": "4bf6802a6dc96463381d9a58135e10a1cc27a64e7a27159e99217061166411b0",
  "db/flight-recorder-demo.ts": "40e489216a9dcb2d5ec9721ab70eae85c40cf39173a0e72a34dceaa63b6dd1ae",
  "db/flight-recorder-graph.ts": "e63e9473deeb3cc5491ae7413c5ef49235ce6ee8ab9bcddaeafd8deda15322dd",
  "db/migrations.ts": "a33c9d1a2435c4a93b1f8f9a779d99084e4903aca6c326d7f308667d285a53b1",
  "app/flight-recorder-types.ts": "69f588d2bc6f7584e66725026ff9fe247a7e7aed7de1ae074fc4ecbca062e7ea",
  "app/CrossSignalApp.tsx": "29cd9f0b0bb9b42074b0ffe51c113d8e626c2077ef6a0b88991011104b1ecacb",
  "drizzle/0008_l04_authority_history_trace_projection.sql": "afcda8bfbf26136c9e46b10f5e051639967c539e4087897a428d86be88389973",
  "drizzle/meta/0008_snapshot.json": "f64ece2bd27b3dcf2f2b216d2443118c97fbf3dad7dbd36cec990331d1bd4221",
  "drizzle/meta/_journal.json": "d671f5d25a21f2533ea2fdec2298dc610ae40d90bdab51c269a1175d74c0b422",
  "tests/flight-recorder-data.test.mjs": "d4be07a521bbfd19726d3ea2aa3bdd034620a2518a2375e8e4cf79ada8e032cf",
  "tests/flight-recorder-build.test.mjs": "7efeb3f0ca10d7b49b5d7498d364ab6c345b1919b74b6686bc774f664e52cedd",
  "tests/fixtures/l04-authority-trace.fixture.mjs": "cd565ba32b846e2848be56c6ef8c705bb13088d6424f80feb962d96411afa464",
});

async function checkHashes(bindings, label) {
  for (const [path, expected] of Object.entries(bindings)) {
    assert.equal(
      await fileHash(projectRoot, join(projectRoot, path)),
      expected,
      `${label} hash drift: ${path}`,
    );
  }
}

await checkHashes(inputHashes, "input");
await checkHashes(productHashes, "product");

const [buildEvidence, buildVerify, buildGate, spec, dataPackage, report, verify] =
  await Promise.all([
    readFile(join(projectRoot, "factory/03_build/output/BUILD_EVIDENCE.md"), "utf8"),
    readFile(join(projectRoot, "factory/03_build/output/VERIFY.md"), "utf8"),
    readFile(join(projectRoot, "factory/03_build/output/HUMAN_GATE.md"), "utf8"),
    readFile(join(projectRoot, "factory/01_spec/output/SPEC.md"), "utf8"),
    readFile(join(projectRoot, "factory/02_data/output/DATA_PACKAGE.md"), "utf8"),
    readFile(join(projectRoot, "factory/04_verify/output/VERIFICATION_REPORT.md"), "utf8"),
    readFile(join(projectRoot, "factory/04_verify/output/VERIFY.md"), "utf8"),
  ]);

assert.equal(frontmatterValue(buildGate, "gate_status"), "closed");
assert.equal(frontmatterValue(buildGate, "decision"), "accepted");
assert.equal(frontmatterValue(buildGate, "build_evidence_sha256"), inputHashes["factory/03_build/output/BUILD_EVIDENCE.md"]);
assert.equal(frontmatterValue(buildGate, "verification_sha256"), inputHashes["factory/03_build/output/VERIFY.md"]);
assert.equal(frontmatterValue(buildVerify, "status"), "passed");
assert.equal(frontmatterValue(report, "status"), "ready-for-review");
assert.equal(frontmatterValue(verify, "status"), "passed");

for (const id of L04_ACCEPTANCE_IDS) {
  assert.equal((report.match(new RegExp(id, "g")) ?? []).length, 1, `${id} report coverage must be exact`);
  assert.match(spec, new RegExp(id), `${id} missing from accepted specification`);
  assert.match(dataPackage, new RegExp(id), `${id} missing from accepted data package`);
}
for (const id of L04_NEGATIVE_IDS) {
  assert.equal((report.match(new RegExp(id, "g")) ?? []).length, 1, `${id} report coverage must be exact`);
  assert.match(spec, new RegExp(id), `${id} missing from accepted specification`);
  assert.match(dataPackage, new RegExp(id), `${id} missing from accepted data package`);
}

assert.deepEqual(validateL04Fixture(), []);
assert.equal(L04_ACCEPTANCE_IDS.length, 12);
assert.equal(L04_NEGATIVE_IDS.length, 12);
assert.equal(L04_RACE_SCHEDULES.length, 3);
assert.equal(L04_MIGRATION_CASES.length, 6);
assert.equal(L04_AUTHORITY_TRACE_FIXTURE.traceEvents.length, 34);
assert.equal(
  await fileHash(projectRoot, join(projectRoot, "factory/02_data/fixtures/l04-authority-trace.fixture.mjs")),
  await fileHash(projectRoot, join(projectRoot, "tests/fixtures/l04-authority-trace.fixture.mjs")),
  "durable L04 fixture drifted from accepted Stage 02 truth",
);

const [migration, runtime, contracts, appTypes, appUi, dataTests, buildTests] =
  await Promise.all([
    readFile(join(projectRoot, "drizzle/0008_l04_authority_history_trace_projection.sql"), "utf8"),
    readFile(join(projectRoot, "db/flight-recorder.ts"), "utf8"),
    readFile(join(projectRoot, "db/flight-recorder-contracts.ts"), "utf8"),
    readFile(join(projectRoot, "app/flight-recorder-types.ts"), "utf8"),
    readFile(join(projectRoot, "app/CrossSignalApp.tsx"), "utf8"),
    readFile(join(projectRoot, "tests/flight-recorder-data.test.mjs"), "utf8"),
    readFile(join(projectRoot, "tests/flight-recorder-build.test.mjs"), "utf8"),
  ]);

for (const marker of [
  "trg_l04_authority_events_append_only",
  "trg_l04_authority_events_delete_guard",
  "trg_l04_legacy_authority_control_frozen",
  "trg_l04_effect_authority_binding_exact",
  "trg_l04_effect_reserved_requires_authority",
  "trg_l04_trace_executing_requires_authority",
  "migration_l04_unresolvable_effect_authority",
  "migration_l04_incomplete_trace_history",
]) assert.match(migration, new RegExp(marker), `migration guard missing: ${marker}`);
assert.match(migration, /DELETE FROM `flight_traces` WHERE `truth_mode` = 'FIXTURE'/);
assert.doesNotMatch(migration, /DELETE FROM `workspace_authority_control_events`/);
assert.doesNotMatch(runtime, /SELECT kill_switch_engaged FROM workspace_authority_controls/);
assert.doesNotMatch(runtime, /UPDATE workspace_authority_controls/);
for (const marker of [
  "sealAuthorityControlEvent",
  "latestAuthorityControl",
  "effect_authority_control_bindings",
  "projectFlightTraceEvents",
]) assert.match(runtime + contracts, new RegExp(marker), `runtime contract missing: ${marker}`);
for (const marker of ["authorityControlHistory", "traceEvents", "Persisted FIXTURE trace"]) {
  assert.match(appTypes + appUi, new RegExp(marker), `review projection missing: ${marker}`);
}
for (const marker of [
  "l04_stale_authority_control",
  "l04_authority_history_immutable",
  "traceEventCount",
  "payloadJson",
  "L04 fixture",
]) assert.match(dataTests + buildTests, new RegExp(marker), `test evidence missing: ${marker}`);

const allowedProductChanges = new Set(Object.keys(productHashes));
const status = runChecked("git", ["status", "--porcelain=v1", "--untracked-files=all"], { cwd: projectRoot });
for (const line of status.stdout.split(/\r?\n/).filter(Boolean)) {
  const path = line.slice(3).replaceAll("\\", "/");
  if (path.startsWith("factory/") || path.startsWith("_archive/")) continue;
  assert.ok(allowedProductChanges.has(path), `unauthorized product path in L04 run: ${path}`);
  assert.doesNotMatch(path, /(?:^|\/)(?:app\/api|worker)(?:\/|$)|route\.ts$|middleware/i, `L14 surface entered: ${path}`);
}

const relevantTests = runChecked("node", [
  "node_modules/tsx/dist/cli.mjs",
  "--test",
  "factory/_lib/factory-tools.test.mjs",
  "tests/rendered-html.test.mjs",
  "tests/flight-recorder-data.test.mjs",
  "tests/flight-recorder-build.test.mjs",
], { cwd: projectRoot, timeout: 240_000 });
assert.match(`${relevantTests.stdout}${relevantTests.stderr}`, /# pass 75/);
assert.match(`${relevantTests.stdout}${relevantTests.stderr}`, /# fail 0/);

const focusedIcm = runChecked("node", [
  "node_modules/tsx/dist/cli.mjs",
  "--test",
  "--test-name-pattern",
  "fails the Spec gate",
  "tests/icm-workspace.test.mjs",
], { cwd: projectRoot, timeout: 120_000 });
assert.match(`${focusedIcm.stdout}${focusedIcm.stderr}`, /# pass 1/);
assert.match(`${focusedIcm.stdout}${focusedIcm.stderr}`, /# fail 0/);

runChecked("node", [
  "node_modules/eslint/bin/eslint.js",
  "app/CrossSignalApp.tsx",
  "app/flight-recorder-types.ts",
  "db/flight-recorder-schema.ts",
  "db/flight-recorder-contracts.ts",
  "db/flight-recorder-graph.ts",
  "db/flight-recorder.ts",
  "db/migrations.ts",
  "tests/flight-recorder-data.test.mjs",
  "tests/flight-recorder-build.test.mjs",
  "factory/01_spec/verify.mjs",
  "tests/icm-workspace.test.mjs",
  "factory/04_verify/verify.mjs",
], { cwd: projectRoot, timeout: 180_000 });

const buildVerification = runChecked("node", ["factory/03_build/verify.mjs"], {
  cwd: projectRoot,
  timeout: 300_000,
});
assert.match(`${buildVerification.stdout}${buildVerification.stderr}`, /Stage 03 build verification passed/);

const productionBuild = runChecked("node", ["node_modules/vinext/dist/cli.js", "build"], {
  cwd: projectRoot,
  timeout: 300_000,
});
assert.match(`${productionBuild.stdout}${productionBuild.stderr}`, /Build complete/);
runChecked("git", ["diff", "--check"], { cwd: projectRoot });

const stash = runChecked("git", ["stash", "list"], { cwd: projectRoot }).stdout;
assert.equal(stash.split(/\r?\n/).filter(Boolean).length, 3, "benchmark stash count changed");
for (const marker of [
  "preserve generated benchmark outputs before L06 seal",
  "preserve unrelated benchmark work before L06 seal",
  "preserve unrelated benchmark work before L08 seal",
]) assert.match(stash, new RegExp(marker), `benchmark stash missing: ${marker}`);

const reportHash = await fileHash(projectRoot, join(projectRoot, "factory/04_verify/output/VERIFICATION_REPORT.md"));
const verificationHash = await fileHash(projectRoot, join(projectRoot, "factory/04_verify/output/VERIFY.md"));
const gate = await readFile(join(projectRoot, "factory/04_verify/output/HUMAN_GATE.md"), "utf8");
const open = frontmatterValue(gate, "gate_status") === "open"
  && frontmatterValue(gate, "decision") === "pending";
const accepted = frontmatterValue(gate, "gate_status") === "closed"
  && frontmatterValue(gate, "decision") === "accepted";
assert.ok(open || accepted, "Stage 04 gate must be open or accepted");
assert.equal(frontmatterValue(gate, "verification_report_sha256"), reportHash);
assert.equal(frontmatterValue(gate, "verification_sha256"), verificationHash);

assert.match(buildEvidence, /No HTTP endpoint, route, middleware, worker/);
assert.match(report, /complete repository-level ICM[\s\S]*deferred to Stage 05/i);
assert.match(verify, /Stage 05 and L14 remain unauthorized/);

console.log("Stage 04 release-grade verification passed.");
console.log("Acceptance criteria: 12/12");
console.log("Negative cases: 12/12");
console.log("Independent relevant suite: 75 passed");
console.log("Focused ICM contract: 1 passed");
console.log("Authority races: 3; migration schedules: 6; trace events: 34");
console.log("Production build: passed");
console.log("Benchmark stashes preserved: 3");
