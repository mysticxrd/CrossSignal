import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import {
  fileHash,
  frontmatterValue,
  markdownHashBindings,
  markdownSection,
} from "../_lib/verify-kit.mjs";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const specPath = resolve(projectRoot, "factory/01_spec/output/SPEC.md");
const gatePath = resolve(projectRoot, "factory/01_spec/output/HUMAN_GATE.md");
const contextPath = resolve(projectRoot, "factory/01_spec/CONTEXT.md");

const declaredInputs = [
  "factory/01_spec/CONTEXT.md",
  "factory/_shared/ARCHITECTURE_SNAPSHOT.md",
  "factory/_shared/QUALITY_GATES.md",
  "db/flight-recorder-demo.ts",
  "db/flight-recorder.ts",
  "db/flight-recorder-graph.ts",
  "tests/flight-recorder-data.test.mjs",
  "tests/flight-recorder-build.test.mjs",
  "tests/flight-recorder-release.test.mjs",
];

export async function validateSpec() {
  const [spec, gate, context, dataTest, buildTest, releaseTest, runtimeStore] =
    await Promise.all([
      readFile(specPath, "utf8"),
      readFile(gatePath, "utf8"),
      readFile(contextPath, "utf8"),
      readFile(resolve(projectRoot, "tests/flight-recorder-data.test.mjs"), "utf8"),
      readFile(resolve(projectRoot, "tests/flight-recorder-build.test.mjs"), "utf8"),
      readFile(resolve(projectRoot, "tests/flight-recorder-release.test.mjs"), "utf8"),
      readFile(resolve(projectRoot, "db/flight-recorder.ts"), "utf8"),
    ]);

  assert.equal(frontmatterValue(spec, "finding"), "L20");
  assert.equal(frontmatterValue(spec, "status"), "proposed");
  for (const heading of [
    "Decision",
    "Finding and baseline evidence",
    "Ownership contract",
    "Observable behavior",
    "Compatibility and migration",
    "Failure behavior",
    "Acceptance criteria",
    "Verification matrix",
    "Non-goals",
    "Human decision requested",
  ]) {
    assert.ok(markdownSection(spec, new RegExp(`^## ${heading}$`)).length > 80, `missing ${heading}`);
  }
  for (let index = 1; index <= 9; index += 1) {
    assert.match(spec, new RegExp(`AC-L20-${String(index).padStart(2, "0")}`));
  }
  for (const required of [
    "db/flight-recorder-demo.ts",
    "db/flight-recorder-graph.ts",
    "factory/02_data/fixtures",
    "precomputed_fixture",
    "FIXTURE",
    "TEST",
    "L04",
    "L14",
    "benchmark stash",
  ]) assert.ok(spec.includes(required), `missing required term: ${required}`);

  const inputSection = markdownSection(context, /^## Inputs$/);
  assert.doesNotMatch(
    inputSection,
    /(?:Freshness dependency|Observed baseline|Stage-owned surface):.*_archive\//,
  );
  assert.match(dataTest, /factory\/02_data\/fixtures\/onboarding-rescue\.fixture/);
  assert.match(buildTest, /factory\/02_data\/fixtures\/persisted-graph-executor\.fixture/);
  assert.match(releaseTest, /db\/flight-recorder-demo\.ts/);
  assert.match(runtimeStore, /buildFlightRecorderSeed/);
  assert.match(runtimeStore, /runPersistedReasoningGraph/);

  const bindings = markdownHashBindings(spec);
  assert.deepEqual(bindings.map(({ input }) => input).sort(), [...declaredInputs].sort());
  for (const binding of bindings) {
    assert.equal(
      await fileHash(projectRoot, resolve(projectRoot, binding.input)),
      binding.expected,
      `stale input binding: ${binding.input}`,
    );
  }

  const decision = frontmatterValue(gate, "decision");
  const gateStatus = frontmatterValue(gate, "gate_status");
  assert.ok(["pending", "accepted"].includes(decision), "invalid gate decision");
  assert.equal(gateStatus, decision === "accepted" ? "closed" : "open");
  if (decision === "accepted") {
    assert.notEqual(frontmatterValue(gate, "reviewer"), "pending");
    assert.match(frontmatterValue(gate, "reviewed_at") ?? "", /^\d{4}-\d{2}-\d{2}T/);
    assert.match(frontmatterValue(gate, "verification_sha256") ?? "", /^[0-9a-f]{64}$/);
  }
  assert.equal(frontmatterValue(gate, "spec_sha256"), await fileHash(projectRoot, specPath));
  return {
    status: "passed",
    finding: "L20",
    inputs: Object.fromEntries(
      await Promise.all(declaredInputs.map(async (path) => [path, await fileHash(projectRoot, resolve(projectRoot, path))])),
    ),
    specification: await fileHash(projectRoot, specPath),
    gate: decision,
    checks: 10 + 9 + 9 + 8 + declaredInputs.length,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await validateSpec(), null, 2));
}
