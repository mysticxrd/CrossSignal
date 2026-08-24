import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  fileHash,
  markdownHashBindings,
  markdownSection,
  repositoryPath,
} from "../_lib/verify-kit.mjs";

const projectRoot = resolve(import.meta.dirname, "../..");
const specPath = resolve(import.meta.dirname, "output/SPEC.md");
const contextPath = resolve(import.meta.dirname, "CONTEXT.md");

const expectedInputs = new Map(Object.entries({
  "factory/01_spec/CONTEXT.md": "e4341599a1d85f531806381787f9fa15bc5cee9e827ec9a113cae9d3f37488d0",
  "factory/_shared/ARCHITECTURE_SNAPSHOT.md": "e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084",
  "factory/_shared/QUALITY_GATES.md": "081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f",
  "db/flight-recorder.ts": "ab984e95650e30ff338ef8896a413267d5be6189709dd034060cf3eca31b1cc6",
  "db/flight-recorder-demo.ts": "74a8d6b28ddab26e1392e3bf43318ff3e7290ba4950d2806ab98efbb5387c369",
  "db/flight-recorder-contracts.ts": "5057dd60c778165f11444875c5bfb6b669e8e889d1363ec9ebf5268af3bc9799",
  "db/flight-recorder-schema.ts": "b86b23ca9a079fb6b458a631e75e7371d1723677be3c23ba82d154a0c2297b11",
  "tests/flight-recorder-build.test.mjs": "98a7c9232b2aa96a6fddd92e605ec07f540326876ae9020e2775602729cc57a9",
  "tests/flight-recorder-release.test.mjs": "65d341700d5378e79be376656ee0a8380108c3891ff560ea5ae912985ddc1e8c",
}));

function requireText(text, pattern, label) {
  assert.match(text, pattern, `missing specification requirement: ${label}`);
}

const [spec, context, repository, demo, contracts, schema, releaseTests] = await Promise.all([
  readFile(specPath, "utf8"),
  readFile(contextPath, "utf8"),
  readFile(resolve(projectRoot, "db/flight-recorder.ts"), "utf8"),
  readFile(resolve(projectRoot, "db/flight-recorder-demo.ts"), "utf8"),
  readFile(resolve(projectRoot, "db/flight-recorder-contracts.ts"), "utf8"),
  readFile(resolve(projectRoot, "db/flight-recorder-schema.ts"), "utf8"),
  readFile(resolve(projectRoot, "tests/flight-recorder-release.test.mjs"), "utf8"),
]);

assert.match(context, /^unit: persisted-graph-executor-correction$/m);
assert.match(context, /output\/SPEC\.md/);
assert.match(context, /output\/VERIFY\.md/);
assert.match(context, /output\/HUMAN_GATE\.md/);

const bindingSection = markdownSection(spec, /^## Declared input hashes$/);
const bindings = markdownHashBindings(bindingSection);
assert.equal(bindings.length, expectedInputs.size, "declared input count changed");
assert.deepEqual(new Set(bindings.map(({ input }) => input)), new Set(expectedInputs.keys()));
for (const { input, expected } of bindings) {
  assert.equal(expected, expectedInputs.get(input), `declared hash constant drifted: ${input}`);
  const path = resolve(projectRoot, input);
  assert.equal(await fileHash(projectRoot, path), expected, `declared input drifted: ${input}`);
}

const acceptanceIds = [...spec.matchAll(/\*\*(AC-L06-\d{2})\s+—/g)].map((match) => match[1]);
assert.deepEqual(
  acceptanceIds,
  Array.from({ length: 14 }, (_, index) => `AC-L06-${String(index + 1).padStart(2, "0")}`),
  "acceptance criteria must be unique and contiguous",
);

for (const [pattern, label] of [
  [/crosssignal-fixed-graph-v1/, "fixed graph version"],
  [/caller-supplied nodes,\s+edges, handlers, graph versions, or arbitrary DAGs fail closed/s, "no arbitrary graph"],
  [/planner[\s\S]+quantitative[\s\S]+qualitative[\s\S]+experiment_design[\s\S]+skeptic[\s\S]+synthesizer/, "six-node topology"],
  [/compare-and-set claim[\s\S]+lease token[\s\S]+Only the claim owner may finalize/i, "durable claim ownership"],
  [/l06_interrupted_attempt/, "stable interruption error"],
  [/preserves completed IDs\/hashes\/timestamps/, "between-node preservation"],
  [/two barrier-controlled executor calls[\s\S]+no partial duplicate writes/i, "concurrent schedule"],
  [/zero intent, policy, grant, effect,\s+or outcome rows/s, "fail-closed downstream authority"],
  [/Running fixture handlers through a real executor does not make their\s+business evidence `LIVE`/s, "truth-mode boundary"],
  [/leaves L20, L04, and L14\s+open/s, "remaining findings"],
  [/Wall-clock\s+sleeps and probabilistic races are not acceptable evidence/s, "deterministic tests"],
]) requireText(spec, pattern, label);

for (const heading of [
  "Decision",
  "Baseline finding",
  "Fixed graph contract",
  "Runtime boundary",
  "Interruption, duplication, and failure",
  "Persistence and trace evidence",
  "Truth and claims",
  "Acceptance criteria",
  "Required deterministic schedules",
  "Scope and non-goals",
  "Declared input hashes",
  "Review questions",
]) assert.match(spec, new RegExp(`^## ${heading}$`, "m"), `missing section: ${heading}`);

assert.match(demo, /const graph = \[/);
assert.match(demo, /currentState: "succeeded" as const/);
assert.match(repository, /for \(const \{ node, artifact \} of demo\.reasoningNodes\)/);
assert.match(repository, /SET current_state = 'running'/);
assert.match(repository, /SET current_state = 'succeeded'/);
assert.match(releaseTests, /planReasoningRecovery\(interrupted/);
assert.match(contracts, /graph:\s*\{\s*pending: \["running", "skipped"\]/s);
assert.match(schema, /"reasoning_nodes"/);
assert.match(schema, /"planner"[\s\S]+"quantitative"[\s\S]+"qualitative"[\s\S]+"experiment_design"[\s\S]+"skeptic"[\s\S]+"synthesizer"/);

process.stdout.write(`${JSON.stringify({
  status: "passed",
  stage: "01_spec",
  unit: "persisted-graph-executor-correction",
  finding: "L06",
  declaredInputs: Object.fromEntries(bindings.map(({ input, expected }) => [input, expected])),
  acceptanceCriteria: acceptanceIds.length,
  fixedNodes: 6,
  deterministicSchedules: 8,
  baselineGap: "fixture-built succeeded nodes are batch-materialized without a runtime executor",
  remainingFindings: ["L20", "L04", "L14"],
  spec: repositoryPath(projectRoot, specPath),
}, null, 2)}\n`);
