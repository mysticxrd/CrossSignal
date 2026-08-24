import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  fileHash,
  frontmatterValue,
  markdownHashBindings,
  markdownSection,
  pathHash,
  runChecked,
} from "../_lib/verify-kit.mjs";
import {
  RELEASE_BINDING_PATHS,
  prepareReleaseCandidate,
} from "./prepare.mjs";

const projectRoot = resolve(import.meta.dirname, "../..");
const baseCommit = "bed7f21a19d3b71abc0e3c58e13fd8e30ed5a2dd";
const branch = "codex/l20-fixture-runtime-source-of-truth";

const durableOutputs = Object.freeze([
  "db/flight-recorder-demo.ts",
  "db/flight-recorder-graph-definition.ts",
  "db/flight-recorder-graph.ts",
  "db/flight-recorder.ts",
  "tests/fixtures/persisted-graph-executor.fixture.mjs",
  "tests/flight-recorder-data.test.mjs",
  "tests/flight-recorder-build.test.mjs",
  "tests/flight-recorder-release.test.mjs",
]);

const manifestPath = resolve(projectRoot, "factory/05_ship/output/RELEASE_MANIFEST.md");
const demoPath = resolve(projectRoot, "factory/05_ship/output/DEMO_SCRIPT.md");
const verifyPath = resolve(projectRoot, "factory/05_ship/output/VERIFY.md");
const gatePath = resolve(projectRoot, "factory/05_ship/output/HUMAN_GATE.md");
const manifest = await readFile(manifestPath, "utf8");
const demo = await readFile(demoPath, "utf8");

assert.equal(frontmatterValue(manifest, "sealed_base"), baseCommit);
assert.equal(frontmatterValue(manifest, "candidate_branch"), branch);
assert.equal(frontmatterValue(manifest, "release_commit"), "pending-human-gate");

const bindingSection = markdownSection(manifest, /^## Declared input bindings$/);
const bindings = markdownHashBindings(bindingSection);
assert.deepEqual(
  bindings.map(({ input }) => input),
  [...RELEASE_BINDING_PATHS],
  "release binding path order or coverage drifted",
);
for (const binding of bindings) {
  assert.equal(
    await pathHash(projectRoot, resolve(projectRoot, binding.input)),
    binding.expected,
    `release binding drift: ${binding.input}`,
  );
}

const stage04PrimaryPath = resolve(projectRoot, "factory/04_verify/output/PRIMARY.md");
const stage04Gate = await readFile(
  resolve(projectRoot, "factory/04_verify/output/HUMAN_GATE.md"),
  "utf8",
);
assert.equal(frontmatterValue(stage04Gate, "gate_status"), "closed");
assert.equal(frontmatterValue(stage04Gate, "decision"), "accepted");
assert.equal(
  frontmatterValue(stage04Gate, "primary_sha256"),
  await fileHash(projectRoot, stage04PrimaryPath),
  "Stage 04 gate no longer binds its primary evidence",
);

const prepared = await prepareReleaseCandidate();
assert.equal(prepared.head, baseCommit);
assert.equal(prepared.branch, branch);
const inventorySection = markdownSection(manifest, /^## Governed candidate inventory$/);
const declaredInventory = [...inventorySection.matchAll(/^- `([^`]+)`$/gm)]
  .map((match) => match[1]);
assert.deepEqual(declaredInventory, prepared.candidatePaths, "candidate path inventory drift");

assert.equal(prepared.stashes.length, 3, "benchmark stash count drifted");
assert.match(prepared.stashes[0], /preserve generated benchmark outputs before L06 seal/);
assert.match(prepared.stashes[1], /preserve unrelated benchmark work before L06 seal/);
assert.match(prepared.stashes[2], /preserve unrelated benchmark work before L08 seal/);

const sourceEntries = await Promise.all(durableOutputs.map(async (path) => [
  path,
  await readFile(resolve(projectRoot, path), "utf8"),
]));
const combined = sourceEntries.map(([, source]) => source).join("\n");
assert.doesNotMatch(
  combined,
  /(?:from\s+|import\s*\()["'][^"']*(?:factory\/_|factory\/0[1-5]_|_archive\/)/,
  "durable L20 output depends on active factory or archive content",
);
assert.equal((combined.match(/REASONING_NODE_REGISTRY\s*=/g) ?? []).length, 1);
assert.doesNotMatch(combined, /STAGE_03_/);

assert.match(demo, /node factory\/05_ship\/prepare\.mjs/);
assert.match(demo, /node factory\/05_ship\/verify\.mjs/);
assert.match(demo, /node factory\/status\.mjs/);
assert.match(demo, /node factory\/seal\.mjs/);
assert.match(demo, /66 passed/);
assert.match(demo, /FIXTURE/);
assert.match(demo, /TEST/);
assert.match(manifest, /Do not apply, pop, drop, or rewrite benchmark stashes/);
assert.match(manifest, /L04/);
assert.match(manifest, /L14/);

const tests = runChecked("node", [
  "node_modules/tsx/dist/cli.mjs",
  "--test",
  "tests/flight-recorder-data.test.mjs",
  "tests/flight-recorder-build.test.mjs",
  "tests/flight-recorder-release.test.mjs",
], { cwd: projectRoot, timeout: 180_000 });
assert.match(`${tests.stdout}${tests.stderr}`, /# pass 66/);
assert.match(`${tests.stdout}${tests.stderr}`, /# fail 0/);

runChecked("node", [
  "node_modules/eslint/bin/eslint.js",
  ...durableOutputs,
], { cwd: projectRoot, timeout: 180_000 });

const build = runChecked("node", [
  "node_modules/vinext/dist/cli.js",
  "build",
], { cwd: projectRoot, timeout: 240_000 });
assert.match(`${build.stdout}${build.stderr}`, /Build complete/);
runChecked("git", ["diff", "--check"], { cwd: projectRoot });

const gate = await readFile(gatePath, "utf8");
assert.equal(frontmatterValue(gate, "gate_status"), "open");
assert.equal(frontmatterValue(gate, "decision"), "pending");
assert.equal(
  frontmatterValue(gate, "release_manifest_sha256"),
  await fileHash(projectRoot, manifestPath),
);
assert.equal(
  frontmatterValue(gate, "demo_script_sha256"),
  await fileHash(projectRoot, demoPath),
);
assert.equal(
  frontmatterValue(gate, "verification_sha256"),
  await fileHash(projectRoot, verifyPath),
);

console.log("Stage 05 ship verification passed.");
console.log(`Release bindings: ${bindings.length}`);
console.log(`Candidate paths: ${declaredInventory.length}`);
console.log("Durable product tests: 66 passed");
console.log("Production build: passed");
console.log("Benchmark stashes preserved: 3");
