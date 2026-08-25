import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ACCEPTANCE_COVERAGE,
  DURABLE_PROJECTION,
  IMPORT_CASES,
  L20_ERRORS,
  PROJECTION_MUTATIONS,
  RESET_CASES,
  SEAL_TRANSITION_CASE,
  assertDurableProjection,
  evaluateImport,
  evaluateResetCase,
} from "./fixtures/fixture-runtime-ownership.fixture.mjs";
import {
  fileHash,
  frontmatterValue,
  markdownHashBindings,
  markdownSection,
} from "../_lib/verify-kit.mjs";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const packagePath = resolve(projectRoot, "factory/02_data/output/DATA_PACKAGE.md");
const gatePath = resolve(projectRoot, "factory/02_data/output/HUMAN_GATE.md");

const boundPaths = [
  "factory/02_data/CONTEXT.md",
  "factory/01_spec/output/SPEC.md",
  "factory/01_spec/output/HUMAN_GATE.md",
  "factory/_shared/ARCHITECTURE_SNAPSHOT.md",
  "factory/_shared/QUALITY_GATES.md",
  "db/flight-recorder-demo.ts",
  "db/flight-recorder.ts",
  "db/flight-recorder-graph.ts",
  "tests/flight-recorder-data.test.mjs",
  "tests/flight-recorder-build.test.mjs",
  "tests/flight-recorder-release.test.mjs",
  "factory/02_data/fixtures/fixture-runtime-ownership.fixture.mjs",
];

function quotedConstant(source, name) {
  const match = source.match(new RegExp(`(?:export\\s+)?const\\s+${name}\\s*=\\s*\"([^\"]+)\"`));
  assert.ok(match, `missing ${name}`);
  return match[1];
}

function numericConstant(source, name) {
  const match = source.match(new RegExp(`(?:export\\s+)?const\\s+${name}\\s*=\\s*([0-9.]+)`));
  assert.ok(match, `missing ${name}`);
  return Number(match[1]);
}

function assertNamedFailure(operation, code) {
  assert.throws(operation, new RegExp(`(?:^|Error: )${code}:`));
}

export async function validateDataPackage() {
  const [dataPackage, gate, spec, specGate, demo, store, graph, dataTest, buildTest, releaseTest, fixtureSource] =
    await Promise.all([
      readFile(packagePath, "utf8"),
      readFile(gatePath, "utf8"),
      readFile(resolve(projectRoot, "factory/01_spec/output/SPEC.md"), "utf8"),
      readFile(resolve(projectRoot, "factory/01_spec/output/HUMAN_GATE.md"), "utf8"),
      readFile(resolve(projectRoot, "db/flight-recorder-demo.ts"), "utf8"),
      readFile(resolve(projectRoot, "db/flight-recorder.ts"), "utf8"),
      readFile(resolve(projectRoot, "db/flight-recorder-graph.ts"), "utf8"),
      readFile(resolve(projectRoot, "tests/flight-recorder-data.test.mjs"), "utf8"),
      readFile(resolve(projectRoot, "tests/flight-recorder-build.test.mjs"), "utf8"),
      readFile(resolve(projectRoot, "tests/flight-recorder-release.test.mjs"), "utf8"),
      readFile(resolve(projectRoot, "factory/02_data/fixtures/fixture-runtime-ownership.fixture.mjs"), "utf8"),
    ]);

  assert.equal(frontmatterValue(specGate, "decision"), "accepted");
  assert.equal(frontmatterValue(specGate, "gate_status"), "closed");
  assert.equal(frontmatterValue(dataPackage, "finding"), "L20");
  assert.equal(frontmatterValue(dataPackage, "status"), "proposed");
  for (const heading of [
    "Transformation",
    "Executable schema",
    "Canonical projection",
    "Case inventory",
    "State and authority",
    "Provenance and truth labels",
    "Stage 03 handoff",
    "Acceptance mapping",
    "Non-goals",
    "Human decision requested",
  ]) assert.ok(markdownSection(dataPackage, new RegExp(`^## ${heading}$`)).length > 60, `missing ${heading}`);

  const bindings = markdownHashBindings(dataPackage);
  assert.deepEqual(bindings.map(({ input }) => input).sort(), [...boundPaths].sort());
  for (const binding of bindings) {
    assert.equal(
      await fileHash(projectRoot, resolve(projectRoot, binding.input)),
      binding.expected,
      `stale data binding: ${binding.input}`,
    );
  }

  for (const importCase of IMPORT_CASES) {
    assert.deepEqual(evaluateImport(importCase), importCase.expected, importCase.id);
  }
  assert.equal(assertDurableProjection(DURABLE_PROJECTION), true);
  for (const mutation of PROJECTION_MUTATIONS) {
    assertNamedFailure(() => assertDurableProjection(mutation.value), mutation.error);
  }
  for (const resetCase of RESET_CASES) {
    const actual = evaluateResetCase(resetCase);
    assert.equal(actual.deletedTraces, resetCase.expectedDeletedTraces, resetCase.id);
    assert.equal(actual.error, resetCase.error ?? null, resetCase.id);
  }

  const knownCaseIds = new Set([
    ...IMPORT_CASES.map(({ id }) => id),
    ...PROJECTION_MUTATIONS.map(({ id }) => id),
    ...RESET_CASES.map(({ id }) => id),
    SEAL_TRANSITION_CASE.id,
  ]);
  for (let index = 1; index <= 9; index += 1) {
    const criterion = `AC-L20-${String(index).padStart(2, "0")}`;
    assert.ok(ACCEPTANCE_COVERAGE[criterion]?.length > 0, `missing coverage: ${criterion}`);
    for (const caseId of ACCEPTANCE_COVERAGE[criterion]) {
      assert.ok(knownCaseIds.has(caseId), `unknown ${criterion} case: ${caseId}`);
    }
  }

  const registryStart = graph.indexOf("export const REASONING_NODE_REGISTRY");
  const registryEnd = graph.indexOf("] as const);", registryStart);
  assert.ok(registryStart >= 0 && registryEnd > registryStart, "missing bounded graph registry");
  const registrySource = graph.slice(registryStart, registryEnd);
  const actualProjection = {
    fixtureKey: quotedConstant(demo, "STAGE_03_FIXTURE_KEY"),
    traceKey: quotedConstant(demo, "STAGE_03_TRACE_KEY"),
    spendingCapUsd: numericConstant(demo, "STAGE_03_SPENDING_CAP_USD"),
    fixtureTruthMode: "FIXTURE",
    intentTruthMode: "TEST",
    graphVersion: quotedConstant(graph, "REASONING_GRAPH_VERSION"),
    handlerVersion: quotedConstant(graph, "REASONING_HANDLER_VERSION"),
    artifactSchemaVersion: quotedConstant(graph, "REASONING_ARTIFACT_SCHEMA_VERSION"),
    nodes: [...registrySource.matchAll(/nodeKey:\s*"([^"]+)"/g)].map((match) => {
      const expected = DURABLE_PROJECTION.nodes.find(({ nodeKey }) => nodeKey === match[1]);
      return { nodeKey: match[1], predecessors: [...(expected?.predecessors ?? [])] };
    }),
  };
  assert.equal(assertDurableProjection(actualProjection), true);
  assert.match(store, /buildFlightRecorderSeed/);
  assert.match(store, /runPersistedReasoningGraph/);
  assert.match(dataTest, /factory\/02_data\/fixtures\/onboarding-rescue\.fixture/);
  assert.match(buildTest, /factory\/02_data\/fixtures\/persisted-graph-executor\.fixture/);
  assert.match(releaseTest, /db\/flight-recorder-demo\.ts/);
  assert.doesNotMatch(fixtureSource, /(?:sk_(?:live|test)|Bearer\s+[A-Za-z0-9._-]{20,}|BEGIN PRIVATE KEY)/i);
  assert.equal(SEAL_TRANSITION_CASE.activeNumberedFixturePresent, false);
  assert.equal(SEAL_TRANSITION_CASE.expectedRuntimeBehavior, "unchanged");

  const decision = frontmatterValue(gate, "decision");
  assert.ok(["pending", "accepted"].includes(decision));
  assert.equal(frontmatterValue(gate, "gate_status"), decision === "accepted" ? "closed" : "open");
  if (decision === "accepted") {
    assert.notEqual(frontmatterValue(gate, "reviewer"), "pending");
    assert.match(frontmatterValue(gate, "reviewed_at") ?? "", /^\d{4}-\d{2}-\d{2}T/);
  }
  assert.equal(frontmatterValue(gate, "data_package_sha256"), await fileHash(projectRoot, packagePath));

  return {
    status: "passed",
    finding: "L20",
    inputs: Object.fromEntries(
      await Promise.all(boundPaths.map(async (path) => [path, await fileHash(projectRoot, resolve(projectRoot, path))])),
    ),
    dataPackage: await fileHash(projectRoot, packagePath),
    caseCounts: {
      imports: IMPORT_CASES.length,
      projectionMutations: PROJECTION_MUTATIONS.length,
      resets: RESET_CASES.length,
      sealTransitions: 1,
      acceptanceCriteria: Object.keys(ACCEPTANCE_COVERAGE).length,
    },
    namedErrors: Object.values(L20_ERRORS).length,
    gate: decision,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await validateDataPackage(), null, 2));
}
