import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, relative } from "node:path";
import { spawnSync } from "node:child_process";

import {
  ACCEPTANCE_COVERAGE,
  DURABLE_PROJECTION,
  IMPORT_CASES,
  PROJECTION_MUTATIONS,
  RESET_CASES,
  SEAL_TRANSITION_CASE,
  assertDurableProjection,
  evaluateImport,
  evaluateResetCase,
} from "../02_data/fixtures/fixture-runtime-ownership.fixture.mjs";

const projectRoot = resolve(import.meta.dirname, "../..");

const INPUT_HASHES = Object.freeze({
  "factory/03_build/CONTEXT.md": "a07fae976105a3828daf955bd690ca0aae5f6876befed3f081148b6dd739072f",
  "factory/02_data/output/DATA_PACKAGE.md": "c59eca1d8f968d7b103f9f2bebc7bd44e066d52baf7747220078c077273b33da",
  "factory/02_data/output/HUMAN_GATE.md": "5a1b649ae622d76f0f960e8a7da2afb6964004978393ec8e0273a8f5a5d2adbc",
  "factory/_shared/ARCHITECTURE_SNAPSHOT.md": "e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084",
  "factory/_shared/QUALITY_GATES.md": "081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f",
});

const PRODUCT_HASHES = Object.freeze({
  "db/flight-recorder-demo.ts": "40e489216a9dcb2d5ec9721ab70eae85c40cf39173a0e72a34dceaa63b6dd1ae",
  "db/flight-recorder-graph-definition.ts": "31c0e55b72d2e4712b94c77e4e7cbd7b7d92638f9e0178979d16e952e4d30b39",
  "db/flight-recorder-graph.ts": "248137ac1b37e252895ae4d4138a12062bd5c3bae8244c978f266c92de120cfd",
  "db/flight-recorder.ts": "5f173de447f77c2eafa6aad607b3a4ce5d43836523453be292fb8961d5a5659a",
  "tests/fixtures/persisted-graph-executor.fixture.mjs": "3c9f911d80704616ef926aff69e85334514ebf620021553845da738f4e2580f9",
  "tests/flight-recorder-data.test.mjs": "09ccb1926136f3611d618f62742be8e08a2ac399d2a67e70515af7c381d25624",
  "tests/flight-recorder-build.test.mjs": "0997721d66d69d8b66ee79f577ac1047a7d5af6f01ccba07d9fafa045c55b2a8",
  "tests/flight-recorder-release.test.mjs": "4e406531692b62dfd506099e92107b05935bc191ac2795bb036de956b76b26d8",
});

function sha256(path) {
  return createHash("sha256").update(readFileSync(resolve(projectRoot, path))).digest("hex");
}

function checkHashes(bindings, label) {
  for (const [path, expected] of Object.entries(bindings)) {
    assert.equal(sha256(path), expected, `${label} hash drift: ${path}`);
  }
}

function filesUnder(path) {
  const absolute = resolve(projectRoot, path);
  if (!statSync(absolute).isDirectory()) return [path];
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const child = resolve(absolute, entry.name);
    const projectPath = relative(projectRoot, child).replaceAll("\\", "/");
    return entry.isDirectory() ? filesUnder(projectPath) : [projectPath];
  });
}

function runNodeTool(script, args, label) {
  const result = spawnSync(process.execPath, [resolve(projectRoot, script), ...args], {
    cwd: projectRoot,
    encoding: "utf8",
    env: { ...process.env, FORCE_COLOR: "0" },
  });
  if (result.status !== 0) {
    throw new Error(`${label} failed\n${result.stdout}\n${result.stderr}`);
  }
  return `${result.stdout}${result.stderr}`;
}

checkHashes(INPUT_HASHES, "input");
checkHashes(PRODUCT_HASHES, "product output");

const dataGate = readFileSync(resolve(projectRoot, "factory/02_data/output/HUMAN_GATE.md"), "utf8");
assert.match(dataGate, /gate_status: closed/);
assert.match(dataGate, /decision: accepted/);

for (const testCase of IMPORT_CASES) {
  assert.deepEqual(evaluateImport(testCase), testCase.expected, testCase.id);
}
assert.equal(assertDurableProjection(DURABLE_PROJECTION), true);
for (const mutation of PROJECTION_MUTATIONS) {
  assert.throws(
    () => assertDurableProjection(mutation.value),
    (error) => error instanceof Error && error.message.startsWith(`${mutation.error}:`),
    mutation.id,
  );
}
for (const resetCase of RESET_CASES) {
  assert.deepEqual(evaluateResetCase(resetCase), {
    deletedTraces: resetCase.expectedDeletedTraces,
    error: resetCase.error ?? null,
  }, resetCase.id);
}
assert.equal(SEAL_TRANSITION_CASE.activeNumberedFixturePresent, false);
assert.equal(SEAL_TRANSITION_CASE.expectedRuntimeBehavior, "unchanged");
assert.deepEqual(Object.keys(ACCEPTANCE_COVERAGE).sort(),
  Array.from({ length: 9 }, (_, index) => `AC-L20-${String(index + 1).padStart(2, "0")}`));

const durableProductFiles = ["app", "db", "worker"].flatMap(filesUnder)
  .filter((path) => /\.(?:[cm]?[jt]sx?)$/.test(path));
const durableTestFiles = [
  "tests/flight-recorder-data.test.mjs",
  "tests/flight-recorder-build.test.mjs",
  "tests/flight-recorder-release.test.mjs",
];
const sources = new Map([...durableProductFiles, ...durableTestFiles]
  .map((path) => [path, readFileSync(resolve(projectRoot, path), "utf8")]));

for (const [path, source] of sources) {
  assert.doesNotMatch(source, /(?:from\s+|import\s*\()["'][^"']*(?:factory\/_|factory\/0[1-5]_)/,
    `active factory import: ${path}`);
  assert.doesNotMatch(source, /(?:from\s+|import\s*\()["'][^"']*_archive\//,
    `archive import: ${path}`);
}
for (const path of durableTestFiles) {
  assert.doesNotMatch(sources.get(path), /factory\/02_data\/fixtures\//,
    `numbered fixture dependency: ${path}`);
}
assert.doesNotMatch(sources.get("tests/flight-recorder-release.test.mjs"),
  /factory\/03_build\/output\//, "release test depends on active build evidence");

const registryDefinitions = [...sources.values()]
  .reduce((count, source) => count + (source.match(/REASONING_NODE_REGISTRY\s*=/g)?.length ?? 0), 0);
assert.equal(registryDefinitions, 1, "durable product must contain one graph registry definition");
for (const [path, source] of sources) {
  assert.doesNotMatch(source, /STAGE_03_/, `stage-numbered public export remains: ${path}`);
}

const definition = sources.get("db/flight-recorder-graph-definition.ts");
const demo = sources.get("db/flight-recorder-demo.ts");
const graph = sources.get("db/flight-recorder-graph.ts");
assert.match(definition, /crosssignal-fixed-graph-v1/);
assert.match(definition, /crosssignal-fixture-handlers-v1/);
assert.match(definition, /reasoning-artifact-v2/);
assert.match(demo, /REASONING_NODE_REGISTRY\.map/);
assert.match(demo, /truthMode: "FIXTURE"/);
assert.match(graph, /from "\.\/flight-recorder-graph-definition"/);

const attackFixture = readFileSync(resolve(projectRoot,
  "tests/fixtures/persisted-graph-executor.fixture.mjs"), "utf8");
assert.equal(new Set(attackFixture.match(/DB-L06-\d{2}/g)).size, 14,
  "durable attack fixture must preserve all fourteen cases");

const testOutput = runNodeTool("node_modules/tsx/dist/cli.mjs", [
  "--test",
  "tests/flight-recorder-data.test.mjs",
  "tests/flight-recorder-build.test.mjs",
  "tests/flight-recorder-release.test.mjs",
], "durable product tests");
assert.match(testOutput, /# pass 66/);
assert.match(testOutput, /# fail 0/);

runNodeTool("node_modules/eslint/bin/eslint.js", [
  "db/flight-recorder-demo.ts",
  "db/flight-recorder-graph-definition.ts",
  "db/flight-recorder-graph.ts",
  "db/flight-recorder.ts",
  "tests/fixtures/persisted-graph-executor.fixture.mjs",
  "tests/flight-recorder-data.test.mjs",
  "tests/flight-recorder-build.test.mjs",
  "tests/flight-recorder-release.test.mjs",
], "focused lint");

const evidenceHash = sha256("factory/03_build/output/BUILD_EVIDENCE.md");
const verificationHash = sha256("factory/03_build/output/VERIFY.md");
const gate = readFileSync(resolve(projectRoot, "factory/03_build/output/HUMAN_GATE.md"), "utf8");
const gateIsOpen = /gate_status: open/.test(gate) && /decision: pending/.test(gate);
const gateIsAccepted = /gate_status: closed/.test(gate) && /decision: accepted/.test(gate);
assert.ok(gateIsOpen || gateIsAccepted, "build gate must be open or accepted");
assert.match(gate, new RegExp(`build_evidence_sha256: ${evidenceHash}`));
assert.match(gate, new RegExp(`verification_sha256: ${verificationHash}`));

console.log("Stage 03 build verification passed.");
console.log(`Bound inputs: ${Object.keys(INPUT_HASHES).length}`);
console.log(`Bound durable outputs: ${Object.keys(PRODUCT_HASHES).length}`);
console.log(`Stage 02 cases: ${IMPORT_CASES.length + PROJECTION_MUTATIONS.length + RESET_CASES.length + 2}`);
console.log("Durable product tests: 66 passed");
console.log("Graph authority definitions: 1");
