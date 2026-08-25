import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  fileHash,
  frontmatterValue,
  markdownHashBindings,
  markdownSection,
  repositoryPath,
  runChecked,
} from "../_lib/verify-kit.mjs";
import {
  L04_ACCEPTANCE_IDS,
  L04_AUTHORITY_TRACE_FIXTURE,
  L04_FIXTURE_VERSION,
  L04_MIGRATION_CASES,
  L04_NEGATIVE_IDS,
  L04_PROJECTION_DETAIL_ALLOWLIST,
  L04_RACE_SCHEDULES,
  projectTraceEvents,
  validateL04Fixture,
} from "./fixtures/l04-authority-trace.fixture.mjs";

const stageRoot = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(stageRoot, "../..");
const contextPath = resolve(stageRoot, "CONTEXT.md");
const packagePath = resolve(stageRoot, "output/DATA_PACKAGE.md");
const gatePath = resolve(stageRoot, "output/HUMAN_GATE.md");
const specPath = resolve(stageRoot, "../01_spec/output/SPEC.md");
const specGatePath = resolve(stageRoot, "../01_spec/output/HUMAN_GATE.md");

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function includesNormalized(document, value) {
  return document.replace(/\s+/g, " ").includes(value.replace(/\s+/g, " "));
}

const expectedInputs = [
  "factory/02_data/CONTEXT.md",
  "factory/01_spec/output/SPEC.md",
  "factory/01_spec/output/HUMAN_GATE.md",
  "factory/_shared/ARCHITECTURE_SNAPSHOT.md",
  "factory/_shared/QUALITY_GATES.md",
  "factory/_lib/verify-kit.mjs",
  "factory/_lib/factory-state.mjs",
  "db/flight-recorder-schema.ts",
  "db/flight-recorder-contracts.ts",
  "db/flight-recorder.ts",
  "db/flight-recorder-demo.ts",
  "db/flight-recorder-graph.ts",
  "db/migrations.ts",
  "app/flight-recorder-types.ts",
  "app/CrossSignalApp.tsx",
  "drizzle/0004_typical_omega_red.sql",
  "drizzle/0005_flight_recorder_guards.sql",
  "drizzle/0006_l08_active_intent_authority.sql",
  "drizzle/0007_l06_persisted_graph_executor.sql",
  "tests/flight-recorder-data.test.mjs",
  "tests/flight-recorder-build.test.mjs",
];

const [context, dataPackage, gate, spec, specGate] = await Promise.all([
  readFile(contextPath, "utf8"),
  readFile(packagePath, "utf8"),
  readFile(gatePath, "utf8"),
  readFile(specPath, "utf8"),
  readFile(specGatePath, "utf8"),
]);

invariant(frontmatterValue(context, "type") === "stage-contract", "Stage 02 contract type is invalid");
invariant(frontmatterValue(context, "stage") === "02_data", "Stage 02 contract identity is invalid");
invariant(frontmatterValue(context, "status") === "active", "Stage 02 contract is not active");
invariant(frontmatterValue(specGate, "gate_status") === "closed", "Stage 01 gate is not closed");
invariant(frontmatterValue(specGate, "decision") === "accepted", "Stage 01 gate is not accepted");
invariant(
  frontmatterValue(specGate, "spec_sha256") === await fileHash(projectRoot, specPath),
  "Stage 01 gate does not bind the current specification",
);

const declaredInputs = [...context.matchAll(
  /^- (?:Freshness dependency|Tooling dependency|Observed baseline): `([^`]+)`$/gm,
)].map((match) => repositoryPath(projectRoot, resolve(stageRoot, match[1])));
invariant(
  JSON.stringify(declaredInputs) === JSON.stringify(expectedInputs.slice(1)),
  `Stage 02 declared inputs differ from the bounded set:\n${declaredInputs.join("\n")}`,
);
invariant(!context.includes("_archive/2026"), "Stage 02 declares an archive input");

invariant(frontmatterValue(dataPackage, "type") === "stage-primary-output", "DATA_PACKAGE.md type is invalid");
invariant(frontmatterValue(dataPackage, "stage") === "02_data", "DATA_PACKAGE.md stage is invalid");
invariant(frontmatterValue(dataPackage, "status") === "ready-for-review", "Data package is not ready for review");
invariant(frontmatterValue(dataPackage, "fixture_version") === L04_FIXTURE_VERSION, "Fixture version drift");

for (const heading of [
  "Data-package outcome",
  "Ownership and truth",
  "Durable schema contract",
  "Migration and compatibility contract",
  "Authority mutation and race contract",
  "Trace subject-event catalog",
  "Ordered redacted projection contract",
  "Executable fixture contract",
  "Stage 03 change map",
  "Acceptance and negative coverage",
  "Declared input hashes",
]) invariant(markdownSection(dataPackage, new RegExp(`^## ${heading}$`)).length > 0, `Missing section: ${heading}`);

const bindings = markdownHashBindings(markdownSection(dataPackage, /^## Declared input hashes$/));
invariant(bindings.length === expectedInputs.length, "Data package does not bind every declared input exactly once");
invariant(
  JSON.stringify(bindings.map(({ input }) => input)) === JSON.stringify(expectedInputs),
  "Data-package input bindings differ from the declared ordered set",
);
for (const binding of bindings) {
  invariant(
    await fileHash(projectRoot, resolve(projectRoot, binding.input)) === binding.expected,
    `Input hash drift: ${binding.input}`,
  );
}

for (const name of [
  "workspace_authority_control_events",
  "effect_authority_control_bindings",
  "idx_authority_control_events_workspace_id",
  "idx_authority_control_events_sequence",
  "idx_authority_control_events_idempotency",
  "idx_authority_control_events_head",
  "trg_l04_authority_events_append_only",
  "trg_l04_authority_events_delete_guard",
  "trg_l04_authority_events_sequence",
  "trg_l04_authority_events_actor",
  "trg_l04_legacy_authority_control_frozen",
  "trg_l04_effect_authority_bindings_immutable",
  "trg_l04_effect_authority_binding_exact",
  "trg_l04_effect_reserved_requires_authority",
  "trg_l04_trace_executing_requires_authority",
]) invariant(dataPackage.includes(name), `Missing schema object: ${name}`);

for (const errorCode of [
  "l04_authority_history_immutable",
  "l04_authority_history_sequence",
  "l04_authority_history_noop",
  "l04_authority_history_actor_mismatch",
  "l04_legacy_authority_control_frozen",
  "l04_missing_authority_control",
  "l04_stale_authority_control",
  "l04_effect_authority_immutable",
  "l04_trace_authority_projection_mismatch",
  "l04_trace_projection_incomplete",
  "migration_l04_invalid_authority_history",
  "migration_l04_ambiguous_authority_history",
  "migration_l04_unresolvable_effect_authority",
  "migration_l04_incomplete_trace_history",
]) invariant(dataPackage.includes(errorCode), `Missing stable failure: ${errorCode}`);

for (const requirement of [
  "Canonical ordered workspace kill-switch history",
  "Frozen migration input; never runtime authority after L04",
  "same D1 batch",
  "rolls back the complete authority/effect boundary",
  "Delete only existing `flight_traces.truth_mode = 'FIXTURE'` rows",
  "never invents historical authority for durable non-FIXTURE effects",
  "`INSERT OR IGNORE`, reread, and byte-compare",
  "desired value equal to current is a no-op",
  "Unknown event types remain in the ordered list with empty details",
  "Raw `payload_json`, idempotency key,",
  "No route, endpoint, middleware, authentication protocol",
]) invariant(includesNormalized(dataPackage, requirement), `Missing data invariant: ${requirement}`);

const fixtureErrors = validateL04Fixture(L04_AUTHORITY_TRACE_FIXTURE);
invariant(fixtureErrors.length === 0, `Executable fixture failed:\n${fixtureErrors.join("\n")}`);
invariant(L04_AUTHORITY_TRACE_FIXTURE.controlHistory.length === 3, "Control history fixture count drift");
invariant(L04_AUTHORITY_TRACE_FIXTURE.traceEvents.length === 34, "Trace event fixture count drift");
invariant(L04_AUTHORITY_TRACE_FIXTURE.traceEventCount === 34, "Projected trace count drift");
invariant(L04_RACE_SCHEDULES.length === 3, "Race schedule coverage drift");
invariant(L04_MIGRATION_CASES.length === 6, "Migration case coverage drift");
invariant(Object.keys(L04_PROJECTION_DETAIL_ALLOWLIST).length === 8, "Redaction allowlist subject coverage drift");

const mixedProjection = projectTraceEvents(
  [...L04_AUTHORITY_TRACE_FIXTURE.collisionRows, ...L04_AUTHORITY_TRACE_FIXTURE.traceEvents].reverse(),
  L04_AUTHORITY_TRACE_FIXTURE.identity.workspaceId,
  L04_AUTHORITY_TRACE_FIXTURE.identity.traceId,
);
invariant(mixedProjection.length === 34, "Tenant collision rows leaked into the projection");
invariant(mixedProjection.every((event, index) => event.sequence === index + 1), "Projection is not sequence ordered");
const projectionJson = JSON.stringify(mixedProjection);
for (const forbidden of ["payloadJson", "idempotencyKey", "actorId", "@example", "Bearer ", "recipients", "emailBody"]) {
  invariant(!projectionJson.includes(forbidden), `Projection leaked forbidden token: ${forbidden}`);
}

for (const id of L04_ACCEPTANCE_IDS) {
  invariant(spec.includes(id), `Accepted specification is missing ${id}`);
  invariant((dataPackage.match(new RegExp(id, "g")) ?? []).length === 1, `${id} coverage must appear exactly once`);
}
for (const id of L04_NEGATIVE_IDS) {
  invariant(spec.includes(id), `Accepted specification is missing ${id}`);
  invariant((dataPackage.match(new RegExp(id, "g")) ?? []).length === 1, `${id} coverage must appear exactly once`);
}

const changeMap = markdownSection(dataPackage, /^## Stage 03 change map$/);
for (const path of [
  "db/flight-recorder-schema.ts",
  "drizzle/0008_l04_authority_history_trace_projection.sql",
  "db/migrations.ts",
  "db/flight-recorder-contracts.ts",
  "db/flight-recorder-demo.ts",
  "db/flight-recorder-graph.ts",
  "db/flight-recorder.ts",
  "app/flight-recorder-types.ts",
  "app/CrossSignalApp.tsx",
  "tests/flight-recorder-data.test.mjs",
  "tests/flight-recorder-build.test.mjs",
  "tests/fixtures/l04-authority-trace.fixture.mjs",
]) invariant(changeMap.includes(path), `Stage 03 change map is missing ${path}`);
for (const forbiddenPath of ["app/api/", "route.ts", "middleware.ts", "worker/"]) {
  invariant(!changeMap.includes(forbiddenPath), `L14 or unrelated scope entered the change map: ${forbiddenPath}`);
}

const productStatus = runChecked(
  "git",
  ["status", "--porcelain=v1", "--untracked-files=all", "--", "app", "db", "drizzle", "worker", "tests"],
  { cwd: projectRoot },
).stdout.trim();
invariant(productStatus === "", `Stage 02 modified durable product paths:\n${productStatus}`);

invariant(frontmatterValue(gate, "gate_status") === "open", "Stage 02 human gate must remain open");
invariant(frontmatterValue(gate, "decision") === "pending", "Stage 02 human gate must remain pending");
invariant(frontmatterValue(gate, "data_package_sha256") === "pending", "Stage 02 gate prematurely binds the data package");
invariant(frontmatterValue(gate, "verification_sha256") === "pending", "Stage 02 gate prematurely binds verification");

console.log("Stage 02 data verification passed.");
console.log(`Declared inputs: ${bindings.length}`);
console.log(`Fixture: ${L04_FIXTURE_VERSION}`);
console.log("Control events: 3");
console.log("Trace events/projected events: 34/34");
console.log("Race schedules: 3");
console.log("Migration cases: 6");
console.log("Acceptance/negative coverage: 12/12");
console.log("Durable product changes: none");
console.log("Human gate: open / pending");
