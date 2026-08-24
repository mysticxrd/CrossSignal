import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
const evidencePath = resolve(outputRoot, "BUILD_EVIDENCE.md");
const verifyPath = resolve(outputRoot, "VERIFY.md");
const gatePath = resolve(outputRoot, "HUMAN_GATE.md");

const expectedBindings = new Map(Object.entries({
  "factory/03_build/CONTEXT.md": "8471a47ce278431b010eea0084b74c5e37d4e6ac173535952f44fc2573ffbd23",
  "factory/02_data/output/DATA_PACKAGE.md": "9fbda72f20659df210d95a6be5b1a13dbe4fde288461d5f435fcfdc8164bbaa6",
  "factory/02_data/output/HUMAN_GATE.md": "965ecd2509782de2a1ecabaf18eee311d9c7bb2c75980711d2da6648d4291c29",
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
  "tests/flight-recorder-build.test.mjs": "7c5be086037e7dcb293ea6e76db17297d38ae1542c07231024ebe53e00359974",
  "tests/flight-recorder-release.test.mjs": "fda88e925e632e4d4aa25dc365712f2a14ae2074440d625c4974a145fe6c3b88",
  "app/flight-recorder-types.ts": "599890454757b677593540167c9359d2a6bd03b40bb361fc446128b58b4a1c24",
}));

const [evidence, verification, gate, stageTwoGate, repository, graph, migration, tests, types] =
  await Promise.all([
    readFile(evidencePath, "utf8"),
    readFile(verifyPath, "utf8"),
    readFile(gatePath, "utf8"),
    readFile(resolve(projectRoot, "factory/02_data/output/HUMAN_GATE.md"), "utf8"),
    readFile(resolve(projectRoot, "db/flight-recorder.ts"), "utf8"),
    readFile(resolve(projectRoot, "db/flight-recorder-graph.ts"), "utf8"),
    readFile(resolve(projectRoot, "drizzle/0007_l06_persisted_graph_executor.sql"), "utf8"),
    readFile(resolve(projectRoot, "tests/flight-recorder-build.test.mjs"), "utf8"),
    readFile(resolve(projectRoot, "app/flight-recorder-types.ts"), "utf8"),
  ]);

assert.equal(frontmatterValue(stageTwoGate, "gate_status"), "closed");
assert.equal(frontmatterValue(stageTwoGate, "decision"), "accepted");
assert.equal(frontmatterValue(gate, "stage"), "03_build");
assert.ok(["open", "closed"].includes(frontmatterValue(gate, "gate_status")));
assert.equal(frontmatterValue(verification, "status"), "passed");
assert.equal(frontmatterValue(gate, "build_evidence_sha256"), await fileHash(projectRoot, evidencePath));
assert.equal(frontmatterValue(gate, "verification_sha256"), await fileHash(projectRoot, verifyPath));

const bindings = markdownHashBindings(evidence);
assert.equal(bindings.length, expectedBindings.size, "Stage 03 binding count changed");
assert.deepEqual(new Set(bindings.map(({ input }) => input)), new Set(expectedBindings.keys()));
for (const { input, expected } of bindings) {
  assert.equal(expected, expectedBindings.get(input), `binding constant drifted: ${input}`);
  assert.equal(
    await fileHash(projectRoot, resolve(projectRoot, input)),
    expected,
    `Stage 03 binding drifted: ${input}`,
  );
}

assert.doesNotMatch(repository, /for \(const \{ node, artifact \} of demo\.reasoningNodes\)/);
assert.match(repository, /runPersistedReasoningGraph/);
assert.match(graph, /crosssignal-fixed-graph-v1/);
assert.match(graph, /crosssignal-fixture-handlers-v1/);
assert.match(graph, /predecessorOutputs/);
assert.match(graph, /l06_interrupted_attempt/);
assert.match(graph, /completion_token_hash/);
assert.match(graph, /measuredCostUsd: null/);
assert.match(migration, /precomputed_fixture/);
assert.match(migration, /migration_l06_invalid_history/);
assert.match(migration, /idx_reasoning_nodes_succeeded/);
assert.match(migration, /l06_workspace_trace_mismatch/);
assert.match(tests, /boundary-\$\{boundary\}/);
assert.match(tests, /all fourteen L06 direct-database attacks fail with zero partial mutation/);
assert.match(tests, /production operations fail closed in both deterministic L08 schedules/);
assert.match(tests, /direct database guards reject the ten accepted L08 attacks/);
assert.doesNotMatch(types, /leaseToken/);
assert.match(evidence, /L20, L04, and L14 remain open/);
assert.match(evidence, /unknown cost/i);
assert.match(evidence, /persisted runtime executor/i);

const tsx = resolve(projectRoot, "node_modules/tsx/dist/cli.mjs");
const vinext = resolve(projectRoot, "node_modules/vinext/dist/cli.js");
const eslint = resolve(projectRoot, "node_modules/eslint/bin/eslint.js");

const testResult = runChecked(
  process.execPath,
  [tsx, "--test", "tests/flight-recorder-build.test.mjs", "tests/flight-recorder-release.test.mjs"],
  { cwd: projectRoot, timeout: 120_000 },
);
assert.match(testResult.stdout, /fail 0/);

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
  stage: "03_build",
  unit: "persisted-graph-executor-correction",
  graphVersion: "crosssignal-fixed-graph-v1",
  executionMode: "runtime",
  truthMode: "FIXTURE",
  fixedNodes: 6,
  resumeBoundaries: 5,
  l06DatabaseAttacks: 14,
  l08DatabaseAttacks: 10,
  l08RaceSchedules: 2,
  migrationCases: 5,
  authorityAfterGraph: { intents: 1, policies: 1, grants: 0, effects: 0 },
  costStatus: "unknown",
  remainingFindings: ["L20", "L04", "L14"],
  evidence: repositoryPath(projectRoot, evidencePath),
}, null, 2)}\n`);
