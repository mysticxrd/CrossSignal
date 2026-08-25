import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  fileHash,
  frontmatterValue,
  runChecked,
} from "../_lib/verify-kit.mjs";

const projectRoot = resolve(import.meta.dirname, "../..");

const INPUT_HASHES = Object.freeze({
  "factory/04_verify/CONTEXT.md": "3b7c3111b792e1ff5a0b3636546e46204d90a59bbe1795835a76cd5621ff0b26",
  "factory/03_build/output/BUILD_EVIDENCE.md": "58ad6f35dc65a5f82ef219d9cd01522cb282bc64a4de548e8134890689aba3d2",
  "factory/03_build/output/HUMAN_GATE.md": "35f2c1163e8715958c85be2639fd67e14e87a5ac1a1ef710d12568d4b0918fa6",
  "factory/_shared/ARCHITECTURE_SNAPSHOT.md": "e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084",
  "factory/_shared/QUALITY_GATES.md": "081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f",
  "factory/_lib/verify-kit.mjs": "b2c7434bf3acacbfb6323b33cf0b175f77d0e3b1d66aeadee6e9ea996c95015c",
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

async function checkHashes(bindings, label) {
  for (const [path, expected] of Object.entries(bindings)) {
    assert.equal(
      await fileHash(projectRoot, resolve(projectRoot, path)),
      expected,
      `${label} hash drift: ${path}`,
    );
  }
}

await checkHashes(INPUT_HASHES, "input");
await checkHashes(PRODUCT_HASHES, "durable product");

const buildEvidence = await readFile(
  resolve(projectRoot, "factory/03_build/output/BUILD_EVIDENCE.md"),
  "utf8",
);
const buildGate = await readFile(
  resolve(projectRoot, "factory/03_build/output/HUMAN_GATE.md"),
  "utf8",
);
assert.equal(frontmatterValue(buildGate, "gate_status"), "closed");
assert.equal(frontmatterValue(buildGate, "decision"), "accepted");
assert.equal(
  frontmatterValue(buildGate, "build_evidence_sha256"),
  await fileHash(projectRoot, resolve(projectRoot, "factory/03_build/output/BUILD_EVIDENCE.md")),
);
assert.match(buildEvidence, /sole source of runtime fixture identity/i);

const sourceEntries = await Promise.all(
  Object.keys(PRODUCT_HASHES).map(async (path) => [
    path,
    await readFile(resolve(projectRoot, path), "utf8"),
  ]),
);
const sources = new Map(sourceEntries);
const combined = sourceEntries.map(([, source]) => source).join("\n");

assert.doesNotMatch(
  combined,
  /(?:from\s+|import\s*\()["'][^"']*(?:factory\/_|factory\/0[1-5]_)/,
  "durable output imports an active factory surface",
);
assert.doesNotMatch(
  combined,
  /(?:from\s+|import\s*\()["'][^"']*_archive\//,
  "durable output imports archived history",
);
for (const path of [
  "tests/flight-recorder-data.test.mjs",
  "tests/flight-recorder-build.test.mjs",
  "tests/flight-recorder-release.test.mjs",
]) {
  assert.doesNotMatch(sources.get(path), /factory\/0[1-5]_|factory\/_|_archive\//,
    `durable test depends on governed-run content: ${path}`);
}

assert.equal(
  (combined.match(/REASONING_NODE_REGISTRY\s*=/g) ?? []).length,
  1,
  "durable product must have exactly one graph registry definition",
);
assert.doesNotMatch(combined, /STAGE_03_/, "stage-numbered public export remains");
assert.match(sources.get("db/flight-recorder-demo.ts"), /REASONING_NODE_REGISTRY\.map/);
assert.match(sources.get("db/flight-recorder-graph.ts"), /for \(const node of REASONING_NODE_REGISTRY\)/);
assert.match(sources.get("db/flight-recorder-demo.ts"), /onboarding-rescue:stage03-v1/);
assert.match(sources.get("db/flight-recorder-demo.ts"), /onboarding-rescue-stage03-v1/);
assert.match(sources.get("db/flight-recorder-demo.ts"), /truthMode: "FIXTURE"/);
assert.match(sources.get("db/flight-recorder-demo.ts"), /providerMode: "TEST"/);
assert.equal(
  new Set(sources.get("tests/fixtures/persisted-graph-executor.fixture.mjs")
    .match(/DB-L06-\d{2}/g)).size,
  14,
  "all fourteen L06 attack identities must remain durable",
);

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
  ...Object.keys(PRODUCT_HASHES),
], { cwd: projectRoot, timeout: 180_000 });

const build = runChecked("node", [
  "node_modules/vinext/dist/cli.js",
  "build",
], { cwd: projectRoot, timeout: 240_000 });
assert.match(`${build.stdout}${build.stderr}`, /Build complete/);

runChecked("git", ["diff", "--check"], { cwd: projectRoot });

const primaryHash = await fileHash(
  projectRoot,
  resolve(projectRoot, "factory/04_verify/output/PRIMARY.md"),
);
const verificationHash = await fileHash(
  projectRoot,
  resolve(projectRoot, "factory/04_verify/output/VERIFY.md"),
);
const gate = await readFile(
  resolve(projectRoot, "factory/04_verify/output/HUMAN_GATE.md"),
  "utf8",
);
const gateOpen = frontmatterValue(gate, "gate_status") === "open"
  && frontmatterValue(gate, "decision") === "pending";
const gateAccepted = frontmatterValue(gate, "gate_status") === "closed"
  && frontmatterValue(gate, "decision") === "accepted";
assert.ok(gateOpen || gateAccepted, "verification gate must be open or accepted");
assert.equal(frontmatterValue(gate, "primary_sha256"), primaryHash);
assert.equal(frontmatterValue(gate, "verification_sha256"), verificationHash);

console.log("Stage 04 release-grade verification passed.");
console.log(`Bound inputs: ${Object.keys(INPUT_HASHES).length}`);
console.log(`Bound durable outputs: ${Object.keys(PRODUCT_HASHES).length}`);
console.log("Durable product tests: 66 passed");
console.log("Graph authority definitions: 1");
console.log("Production build: passed");
