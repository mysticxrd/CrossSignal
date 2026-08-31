import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { deriveFactoryState } from "../_lib/factory-state.mjs";
import {
  fileHash,
  frontmatterValue,
  markdownHashBindings,
  markdownSection,
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
  "factory/05_ship/CONTEXT.md": "8ede87ed09ff4ec41246e48b869d926e77258568697c0e811edaaf15749c9811",
  "factory/04_verify/output/VERIFICATION_REPORT.md": "08517d722b9da7140174549b3279bbc9d4bd0335ec21237b6efb7212c8cb4b7a",
  "factory/04_verify/output/VERIFY.md": "03b5076c97c56d00daae7b7bb2ff13e12d07a14255b1cc8b0e714c6531d84b9a",
  "factory/04_verify/output/HUMAN_GATE.md": "e529623ba2938d7f4391eeeabb47ed35cf6ac49db574acf36a0b838396b5c741",
  "factory/03_build/output/BUILD_EVIDENCE.md": "4115ea1b852b8cbebcd11cdd9da341b1406424a7140d68c7195ccfe36b5ac246",
  "factory/03_build/output/HUMAN_GATE.md": "7d6776a41fc6d1c86cb2cd05668fbba106f4f0922aa34e3d366f148371ecfeeb",
  "factory/02_data/output/DATA_PACKAGE.md": "a503213bfcccd597700fe6934c365855d90d422d9c03b015bf10b2a96438979d",
  "factory/02_data/output/HUMAN_GATE.md": "d9e7efd6b2084026e5ee8c7a993670df2fba89539da0bc51c460f272e2b8aaa9",
  "factory/01_spec/output/SPEC.md": "a61807c8500b2b1038c8acdeb340d82999fc86c1be53bd428e6390f74204a527",
  "factory/01_spec/output/HUMAN_GATE.md": "a8944174459eed47ebbcb8ba3ed896d96fc6430c7629a95e2a1662473af13a73",
  "factory/_shared/ARCHITECTURE_SNAPSHOT.md": "e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084",
  "factory/_shared/QUALITY_GATES.md": "081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f",
  "factory/_lib/verify-kit.mjs": "b2c7434bf3acacbfb6323b33cf0b175f77d0e3b1d66aeadee6e9ea996c95015c",
  "factory/_lib/factory-state.mjs": "72870904445d54f01eea443ed5a5de1b2af2fd19df66e085a52bf47982594d28",
  "package.json": "c8a9ab36760f08998d304efdc6a4d514a22f8d7ea05ab8c8df992ecc09f75972",
  "eslint.config.mjs": "6090bd544865638d8c77a3443f037b3b289596a7ec1e1dccc3a13677e6d1ca83",
  "tsconfig.json": "379054f6cec60ebd0e18c47a3ce72b2cc1b3f7abd0037c668e87cb2070891147",
  "tests/icm-workspace.test.mjs": "549c1f9dd55c864a1bdb745ebae4b2fdfa168258a4fa9d29b7b06a68a05ba312",
  "factory/01_spec/verify.mjs": "b714e852ec0afcc37c5fab0be8e7df885aed17faba08124a10da0fe964c1cf4d",
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
    assert.equal(await fileHash(projectRoot, join(projectRoot, path)), expected, `${label} drift: ${path}`);
  }
}

await checkHashes(inputHashes, "input");
await checkHashes(productHashes, "release head");

const [stageFourGate, manifest, demo, verification, context] = await Promise.all([
  readFile(join(projectRoot, "factory/04_verify/output/HUMAN_GATE.md"), "utf8"),
  readFile(join(projectRoot, "factory/05_ship/output/RELEASE_MANIFEST.md"), "utf8"),
  readFile(join(projectRoot, "factory/05_ship/output/DEMO_SCRIPT.md"), "utf8"),
  readFile(join(projectRoot, "factory/05_ship/output/VERIFY.md"), "utf8"),
  readFile(join(projectRoot, "factory/05_ship/CONTEXT.md"), "utf8"),
]);

assert.equal(frontmatterValue(stageFourGate, "gate_status"), "closed");
assert.equal(frontmatterValue(stageFourGate, "decision"), "accepted");
assert.equal(frontmatterValue(stageFourGate, "verification_report_sha256"), inputHashes["factory/04_verify/output/VERIFICATION_REPORT.md"]);
assert.equal(frontmatterValue(stageFourGate, "verification_sha256"), inputHashes["factory/04_verify/output/VERIFY.md"]);
assert.equal(frontmatterValue(manifest, "status"), "ready-for-review");
assert.equal(frontmatterValue(demo, "status"), "ready-for-review");
assert.equal(frontmatterValue(verification, "status"), "passed");
assert.ok((context.match(/[A-Za-z0-9_-]+/g) ?? []).length <= 500, "Stage 05 contract exceeds cold-load budget");
assert.match(context, /Do not load: `_archive\/`/);

for (const heading of [
  "Release identity",
  "Truth manifest",
  "Architecture",
  "Threat model",
  "Cold setup",
  "Proof index",
  "Residual limits",
  "Declared input hashes",
]) assert.match(manifest, new RegExp(`^## ${heading}$`, "m"), `manifest missing ${heading}`);

for (const id of [...L04_ACCEPTANCE_IDS, ...L04_NEGATIVE_IDS]) {
  assert.equal((manifest.match(new RegExp(id, "g")) ?? []).length, 1, `${id} release proof must be exact`);
}
assert.deepEqual(validateL04Fixture(), []);
assert.equal(L04_ACCEPTANCE_IDS.length, 12);
assert.equal(L04_NEGATIVE_IDS.length, 12);
assert.equal(L04_RACE_SCHEDULES.length, 3);
assert.equal(L04_MIGRATION_CASES.length, 6);
assert.equal(L04_AUTHORITY_TRACE_FIXTURE.traceEvents.length, 34);

for (const marker of [
  "FIXTURE",
  "TEST",
  "Persisted FIXTURE trace",
  "latest unengaged control event",
  "Reset the exact FIXTURE trace",
  "No L14 HTTP trace-resolution endpoint exists",
  "correlated fixture evidence, not causal inference",
]) assert.match(`${manifest}\n${demo}`, new RegExp(marker), `release instruction missing: ${marker}`);
assert.doesNotMatch(
  `${manifest}\n${demo}`,
  /(?:sends? (?:a )?LIVE email|proves? (?:a )?production tenant|causally proved)/i,
);
assert.doesNotMatch(`${manifest}\n${demo}`, /_archive\//, "release package depends on archived history");

const scriptBindings = {
  "factory/05_ship/prepare.mjs": await fileHash(projectRoot, join(projectRoot, "factory/05_ship/prepare.mjs")),
  "factory/05_ship/verify.mjs": await fileHash(projectRoot, join(projectRoot, "factory/05_ship/verify.mjs")),
};
const manifestBindings = new Map(markdownHashBindings(markdownSection(manifest, /^## Declared input hashes$/))
  .map(({ input, expected }) => [input, expected]));
for (const [path, expected] of Object.entries({ ...inputHashes, ...productHashes, ...scriptBindings })) {
  assert.equal(manifestBindings.get(path), expected, `manifest release binding missing or stale: ${path}`);
}
assert.equal(manifestBindings.size, Object.keys(inputHashes).length + Object.keys(productHashes).length + 2);

const allowedProductChanges = new Set(Object.keys(productHashes));
const status = runChecked("git", ["status", "--porcelain=v1", "--untracked-files=all"], { cwd: projectRoot });
for (const line of status.stdout.split(/\r?\n/).filter(Boolean)) {
  const path = line.slice(3).replaceAll("\\", "/");
  if (path.startsWith("factory/") || path.startsWith("_archive/")) continue;
  assert.ok(allowedProductChanges.has(path), `unbound product path: ${path}`);
  assert.doesNotMatch(path, /(?:^|\/)(?:app\/api|worker)(?:\/|$)|route\.ts$|middleware/i, `L14 surface entered: ${path}`);
}

const preparation = runChecked("node", ["factory/05_ship/prepare.mjs"], { cwd: projectRoot });
assert.match(preparation.stdout, /L04 cold release preparation passed/);

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
], { cwd: projectRoot });
assert.match(`${focusedIcm.stdout}${focusedIcm.stderr}`, /# pass 1/);
assert.match(`${focusedIcm.stdout}${focusedIcm.stderr}`, /# fail 0/);

runChecked("node", [
  "node_modules/eslint/bin/eslint.js",
  ...Object.keys(productHashes),
  "factory/01_spec/verify.mjs",
  "factory/05_ship/prepare.mjs",
  "factory/05_ship/verify.mjs",
  "tests/icm-workspace.test.mjs",
], { cwd: projectRoot, timeout: 180_000 });

const stageFour = runChecked("node", ["factory/04_verify/verify.mjs"], {
  cwd: projectRoot,
  timeout: 360_000,
});
assert.match(`${stageFour.stdout}${stageFour.stderr}`, /Stage 04 release-grade verification passed/);

const build = runChecked("node", ["node_modules/vinext/dist/cli.js", "build"], {
  cwd: projectRoot,
  timeout: 300_000,
});
assert.match(`${build.stdout}${build.stderr}`, /Build complete/);
runChecked("git", ["diff", "--check"], { cwd: projectRoot });

const factoryState = await deriveFactoryState({ projectRoot, includeGit: false });
assert.ok(
  factoryState.activeStage === "05_ship" || factoryState.activeStage === null,
  `unexpected active stage: ${factoryState.activeStage}`,
);
assert.deepEqual(factoryState.stages.slice(0, 4).map((stage) => stage.status), [
  "complete",
  "complete",
  "complete",
  "complete",
]);
if (factoryState.activeStage === null) assert.equal(factoryState.stages[4].status, "complete");

const stash = runChecked("git", ["stash", "list"], { cwd: projectRoot }).stdout;
assert.equal(stash.split(/\r?\n/).filter(Boolean).length, 3, "benchmark stash count changed");
for (const marker of [
  "preserve generated benchmark outputs before L06 seal",
  "preserve unrelated benchmark work before L06 seal",
  "preserve unrelated benchmark work before L08 seal",
]) assert.match(stash, new RegExp(marker), `benchmark stash missing: ${marker}`);

const manifestHash = await fileHash(projectRoot, join(projectRoot, "factory/05_ship/output/RELEASE_MANIFEST.md"));
const demoHash = await fileHash(projectRoot, join(projectRoot, "factory/05_ship/output/DEMO_SCRIPT.md"));
const verificationHash = await fileHash(projectRoot, join(projectRoot, "factory/05_ship/output/VERIFY.md"));
const gate = await readFile(join(projectRoot, "factory/05_ship/output/HUMAN_GATE.md"), "utf8");
const open = frontmatterValue(gate, "gate_status") === "open" && frontmatterValue(gate, "decision") === "pending";
const accepted = frontmatterValue(gate, "gate_status") === "closed" && frontmatterValue(gate, "decision") === "accepted";
assert.ok(open || accepted, "Stage 05 gate must be open or accepted");
assert.equal(frontmatterValue(gate, "release_manifest_sha256"), manifestHash);
assert.equal(frontmatterValue(gate, "demo_script_sha256"), demoHash);
assert.equal(frontmatterValue(gate, "verification_sha256"), verificationHash);

console.log("Stage 05 evaluator release verification passed.");
console.log("Acceptance criteria: 12/12; negative cases: 12/12");
console.log("Independent relevant suite: 75 passed");
console.log("Authority races: 3; migration schedules: 6; trace events: 34");
console.log("Production build: passed");
console.log("Benchmark stashes preserved: 3");
