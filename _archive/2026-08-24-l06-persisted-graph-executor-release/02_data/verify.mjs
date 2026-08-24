import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  fileHash,
  frontmatterValue,
  markdownHashBindings,
  markdownSection,
  repositoryPath,
} from "../_lib/verify-kit.mjs";
import {
  ACCEPTED_SCHEDULES,
  DIRECT_DATABASE_ATTACKS,
  FIXTURE_TRUTH_MODE,
  GRAPH_VERSION,
  NODE_ORDER,
  NODE_REGISTRY,
  STABLE_ERRORS,
  advanceClockPastLease,
  assertRuntimeRequest,
  buildExecutorFixture,
  claimNode,
  finalizeNode,
  recoverExpiredAttempt,
  runReadyGraph,
  summarizeFixture,
} from "./fixtures/persisted-graph-executor.fixture.mjs";

const projectRoot = resolve(import.meta.dirname, "../..");
const packagePath = resolve(import.meta.dirname, "output/DATA_PACKAGE.md");
const fixturePath = resolve(import.meta.dirname, "fixtures/persisted-graph-executor.fixture.mjs");

const expectedBindings = new Map(Object.entries({
  "factory/02_data/CONTEXT.md": "c4e7c6e44af8e0abe82aca39ce48754066caf1b3114f3aa51925bba766e37888",
  "factory/01_spec/output/SPEC.md": "f90a9fa515c9e8357b12bb0374939fdeec7ba4580ffc6573d2f8384fdc67ea7c",
  "factory/01_spec/output/HUMAN_GATE.md": "beb2466f7082e9cca93550db9be7c3bf06c43caa184422d9c1b6ad8700f74664",
  "factory/_shared/ARCHITECTURE_SNAPSHOT.md": "e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084",
  "factory/_shared/QUALITY_GATES.md": "081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f",
  "db/flight-recorder-contracts.ts": "5057dd60c778165f11444875c5bfb6b669e8e889d1363ec9ebf5268af3bc9799",
  "db/flight-recorder-schema.ts": "b86b23ca9a079fb6b458a631e75e7371d1723677be3c23ba82d154a0c2297b11",
  "db/flight-recorder-demo.ts": "74a8d6b28ddab26e1392e3bf43318ff3e7290ba4950d2806ab98efbb5387c369",
  "factory/02_data/fixtures/persisted-graph-executor.fixture.mjs": "fb2d985e76b6f05bfdda04cfa42b6effbf1dd75d96e1756947e7f555463f9051",
}));

function ids(rows, key = "id") {
  return rows.map((row) => row[key]);
}

function assertUnique(values, label) {
  assert.equal(new Set(values).size, values.length, `${label} must be unique`);
}

function expectCode(fn, code) {
  return assert.rejects(fn, new RegExp(code));
}

const [dataPackage, stageOneGate, schema, demo] = await Promise.all([
  readFile(packagePath, "utf8"),
  readFile(resolve(projectRoot, "factory/01_spec/output/HUMAN_GATE.md"), "utf8"),
  readFile(resolve(projectRoot, "db/flight-recorder-schema.ts"), "utf8"),
  readFile(resolve(projectRoot, "db/flight-recorder-demo.ts"), "utf8"),
]);

assert.equal(frontmatterValue(stageOneGate, "gate_status"), "closed");
assert.equal(frontmatterValue(stageOneGate, "decision"), "accepted");
assert.equal(frontmatterValue(stageOneGate, "spec_sha256"), expectedBindings.get("factory/01_spec/output/SPEC.md"));

const bindingSection = markdownSection(dataPackage, /^## Declared input bindings$/);
const bindings = markdownHashBindings(bindingSection);
assert.equal(bindings.length, expectedBindings.size, "binding count changed");
assert.deepEqual(new Set(bindings.map(({ input }) => input)), new Set(expectedBindings.keys()));
for (const { input, expected } of bindings) {
  assert.equal(expected, expectedBindings.get(input), `binding constant drifted: ${input}`);
  assert.equal(await fileHash(projectRoot, resolve(projectRoot, input)), expected, `binding drifted: ${input}`);
}

assert.equal(GRAPH_VERSION, "crosssignal-fixed-graph-v1");
assert.equal(FIXTURE_TRUTH_MODE, "FIXTURE");
assert.deepEqual(NODE_ORDER, [
  "planner",
  "quantitative",
  "qualitative",
  "experiment_design",
  "skeptic",
  "synthesizer",
]);
assert.deepEqual(NODE_REGISTRY.map(({ nodeKey, predecessors }) => [nodeKey, [...predecessors]]), [
  ["planner", []],
  ["quantitative", ["planner"]],
  ["qualitative", ["planner"]],
  ["experiment_design", ["planner"]],
  ["skeptic", ["quantitative", "qualitative", "experiment_design"]],
  ["synthesizer", ["planner", "quantitative", "qualitative", "experiment_design", "skeptic"]],
]);
assert.equal(ACCEPTED_SCHEDULES.length, 8);
assert.deepEqual(ids(ACCEPTED_SCHEDULES), Array.from({ length: 8 }, (_, index) => `S-L06-${String(index + 1).padStart(2, "0")}`));
assert.equal(DIRECT_DATABASE_ATTACKS.length, 14);
assert.deepEqual(ids(DIRECT_DATABASE_ATTACKS), Array.from({ length: 14 }, (_, index) => `DB-L06-${String(index + 1).padStart(2, "0")}`));
assertUnique(DIRECT_DATABASE_ATTACKS.map(({ attack }) => attack), "attack descriptions");

for (const nodeKey of NODE_ORDER) assert.match(schema, new RegExp(`"${nodeKey}"`));
assert.match(schema, /idx_reasoning_nodes_trace_identity/);
assert.match(schema, /currentState[\s\S]+"pending"[\s\S]+"running"[\s\S]+"succeeded"[\s\S]+"failed"[\s\S]+"skipped"/);
assert.match(demo, /currentState: "succeeded" as const/);
assert.match(dataPackage, /existing rows backfill to `precomputed_fixture`/);
assert.match(dataPackage, /create an attempt row only when all predecessor\s+artifacts exist/s);
assert.match(dataPackage, /Passing Stage 02\s+does not prove a database executor exists/s);
assert.match(dataPackage, /L20, L04, and L14 remain open/);

const first = await buildExecutorFixture();
const second = await buildExecutorFixture();
assert.deepEqual(summarizeFixture(first), summarizeFixture(second), "fixture identities are not stable");
assert.equal(first.attempts.length, 1);
assert.equal(first.attempts[0].nodeKey, "planner");
assert.equal(first.attempts[0].currentState, "pending");

const cold = await buildExecutorFixture();
await runReadyGraph(cold);
const coldSummary = summarizeFixture(cold);
assert.equal(coldSummary.traceState, "awaiting_approval");
assert.equal(coldSummary.attempts.length, 6);
assert.ok(coldSummary.attempts.every(({ currentState }) => currentState === "succeeded"));
assert.equal(coldSummary.artifacts.length, 6);
assert.ok(coldSummary.artifacts.every(({ truthMode }) => truthMode === "FIXTURE"));
assert.deepEqual(coldSummary.handlerInvocations, Object.fromEntries(NODE_ORDER.map((nodeKey) => [nodeKey, 1])));
assert.deepEqual(coldSummary.authorityCounts, { intents: 1, policies: 1, grants: 0, effects: 0, outcomes: 0 });
assertUnique(coldSummary.events.map(({ sequence }) => sequence), "event sequences");
assertUnique(coldSummary.events.map(({ idempotencyKey }) => idempotencyKey), "event idempotency keys");
assert.equal(cold.authority.intents[0].sourceArtifactId, cold.artifacts.find(({ logicalNodeId }) => logicalNodeId.endsWith("_synthesizer")).id);

for (let boundary = 1; boundary <= 5; boundary += 1) {
  const resumed = await buildExecutorFixture({ traceId: `trace_resume_${boundary}` });
  await runReadyGraph(resumed, { stopAfter: boundary });
  const preserved = new Map(resumed.artifacts.map(({ logicalNodeId, contentHash }) => [logicalNodeId, contentHash]));
  await runReadyGraph(resumed);
  assert.equal(resumed.traceState, "awaiting_approval");
  assert.deepEqual(resumed.handlerInvocations, Object.fromEntries(NODE_ORDER.map((nodeKey) => [nodeKey, 1])));
  for (const [logicalNodeId, contentHash] of preserved) {
    assert.equal(resumed.artifacts.find((artifact) => artifact.logicalNodeId === logicalNodeId).contentHash, contentHash);
  }
}

const crashed = await buildExecutorFixture({ traceId: "trace_claim_crash" });
await runReadyGraph(crashed, { stopAfter: 1 });
const crashToken = "lease_crash_quantitative_1";
assert.equal((await claimNode(crashed, "quantitative", crashToken)).status, "claimed");
assert.equal((await claimNode(crashed, "quantitative", "lease_competitor")).status, "busy");
advanceClockPastLease(crashed, "quantitative");
const recovery = await recoverExpiredAttempt(crashed, "quantitative");
assert.equal(recovery.priorAttempt.errorCode, STABLE_ERRORS.interruptedAttempt);
assert.equal(recovery.nextAttempt.attempt, 2);
await runReadyGraph(crashed);
assert.equal(crashed.traceState, "awaiting_approval");
assert.deepEqual(crashed.attempts.filter(({ nodeKey }) => nodeKey === "quantitative").map(({ attempt, currentState }) => [attempt, currentState]), [[1, "failed"], [2, "succeeded"]]);
assert.equal(crashed.handlerInvocations.quantitative, 1);

const concurrent = await buildExecutorFixture({ traceId: "trace_concurrent" });
const ownerToken = "lease_owner_planner";
assert.equal((await claimNode(concurrent, "planner", ownerToken)).status, "claimed");
assert.equal((await claimNode(concurrent, "planner", "lease_loser_planner")).status, "busy");
await expectCode(() => finalizeNode(concurrent, "planner", "lease_loser_planner"), STABLE_ERRORS.claimOwnership);
assert.equal((await finalizeNode(concurrent, "planner", ownerToken)).status, "succeeded");
assert.equal((await finalizeNode(concurrent, "planner", ownerToken)).status, "idempotent");
await runReadyGraph(concurrent);
assert.equal(concurrent.handlerInvocations.planner, 1);
assert.equal(concurrent.artifacts.filter(({ logicalNodeId }) => logicalNodeId.endsWith("_planner")).length, 1);

const failed = await buildExecutorFixture({ traceId: "trace_skeptic_failure" });
await runReadyGraph(failed, { failAt: "skeptic" });
assert.equal(failed.traceState, "failed");
assert.equal(failed.artifacts.length, 4);
assert.equal(failed.handlerInvocations.skeptic, 1);
assert.equal(failed.attempts.some(({ nodeKey }) => nodeKey === "synthesizer"), false);
assert.deepEqual(summarizeFixture(failed).authorityCounts, { intents: 0, policies: 0, grants: 0, effects: 0, outcomes: 0 });

const drifted = await buildExecutorFixture({ traceId: "trace_input_drift" });
await runReadyGraph(drifted, { stopAfter: 1 });
drifted.artifacts[0].contentHash = "b".repeat(64);
await expectCode(() => claimNode(drifted, "quantitative", "lease_drift"), STABLE_ERRORS.inputDrift);
assert.equal(drifted.handlerInvocations.quantitative, 0);
assert.equal(drifted.artifacts.length, 1);

const tenant = await buildExecutorFixture({ traceId: "trace_tenant" });
const tenantBefore = summarizeFixture(tenant);
await expectCode(
  () => claimNode(tenant, "planner", "lease_foreign", {
    actorWorkspaceId: "workspace_foreign",
    workspaceId: tenant.workspaceId,
    traceId: tenant.traceId,
  }),
  STABLE_ERRORS.tenantMismatch,
);
assert.throws(
  () => assertRuntimeRequest(tenant, {
    actorWorkspaceId: tenant.workspaceId,
    workspaceId: tenant.workspaceId,
    traceId: tenant.traceId,
    nodes: ["attacker"],
  }),
  new RegExp(STABLE_ERRORS.arbitraryGraph),
);
assert.deepEqual(summarizeFixture(tenant), tenantBefore);

for (const mutation of [{ undeclaredCitation: true }, { secret: true }]) {
  const invalid = await buildExecutorFixture({ traceId: `trace_invalid_${Object.keys(mutation)[0]}` });
  const token = `lease_invalid_${Object.keys(mutation)[0]}`;
  await claimNode(invalid, "planner", token);
  await expectCode(() => finalizeNode(invalid, "planner", token, mutation), STABLE_ERRORS.invalidArtifact);
  assert.equal(invalid.artifacts.length, 0);
  assert.equal(invalid.authority.intents.length, 0);
}

process.stdout.write(`${JSON.stringify({
  status: "passed",
  stage: "02_data",
  unit: "persisted-graph-executor-correction",
  graphVersion: GRAPH_VERSION,
  fixedNodes: NODE_ORDER.length,
  schedules: ACCEPTED_SCHEDULES.length,
  resumeBoundaries: 5,
  directDatabaseAttacks: DIRECT_DATABASE_ATTACKS.length,
  stableErrors: Object.keys(STABLE_ERRORS).length,
  truthMode: FIXTURE_TRUTH_MODE,
  coldAuthorityCounts: coldSummary.authorityCounts,
  remainingFindings: ["L20", "L04", "L14"],
  fixture: repositoryPath(projectRoot, fixturePath),
  dataPackage: repositoryPath(projectRoot, packagePath),
}, null, 2)}\n`);
