import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  fileHash,
  frontmatterValue,
  markdownHashBindings,
  markdownSection,
  repositoryPath,
} from "../_lib/verify-kit.mjs";

const stageRoot = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(stageRoot, "../..");
const contextPath = resolve(stageRoot, "CONTEXT.md");
const specPath = resolve(stageRoot, "output/SPEC.md");
const gatePath = resolve(stageRoot, "output/HUMAN_GATE.md");

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function requireText(document, value, label = value) {
  const normalizedDocument = document.replace(/\s+/g, " ");
  const normalizedValue = value.replace(/\s+/g, " ");
  invariant(normalizedDocument.includes(normalizedValue), `SPEC.md is missing ${label}`);
}

// Kept as a pure compatibility API for the repository-level ICM contract test.
// The governed L04 verifier below remains the authoritative Stage 01 check.
export function validateSpec(document) {
  const errors = [];
  for (const heading of [
    "Relationship to Result",
    "Public evidence",
    "Product definition",
    "Primary user and problem",
    "Golden path",
    "Scope",
    "Acceptance criteria",
    "Current repository truth",
    "Evaluator thesis",
    "Explicit non-claims",
  ]) {
    if (!new RegExp(`^## ${heading}$`, "m").test(document)) {
      errors.push(`missing heading: ${heading}`);
    }
  }
  if (/\bResult-(?:native|internal)\b|Result(?:'s)? private (?:stack|API|implementation)/i.test(document)) {
    errors.push("unsupported Result claim");
  }
  return errors;
}

const expectedInputs = [
  "factory/01_spec/CONTEXT.md",
  "factory/_shared/ARCHITECTURE_SNAPSHOT.md",
  "factory/_shared/QUALITY_GATES.md",
  "factory/_lib/verify-kit.mjs",
  "factory/_lib/factory-state.mjs",
  "db/flight-recorder-schema.ts",
  "db/flight-recorder-contracts.ts",
  "db/flight-recorder.ts",
  "db/flight-recorder-demo.ts",
  "db/flight-recorder-graph.ts",
  "app/flight-recorder-types.ts",
  "app/CrossSignalApp.tsx",
  "drizzle/0004_typical_omega_red.sql",
  "drizzle/0005_flight_recorder_guards.sql",
  "drizzle/0006_l08_active_intent_authority.sql",
  "tests/flight-recorder-data.test.mjs",
  "tests/flight-recorder-build.test.mjs",
];

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
const [context, spec, gate] = await Promise.all([
  readFile(contextPath, "utf8"),
  readFile(specPath, "utf8"),
  readFile(gatePath, "utf8"),
]);

invariant(frontmatterValue(context, "type") === "stage-contract", "Stage 01 contract type is invalid");
invariant(frontmatterValue(context, "stage") === "01_spec", "Stage 01 contract identity is invalid");
invariant(
  frontmatterValue(context, "unit") === "append-only-authority-control-history-and-trace-projection-completeness",
  "Stage 01 contract unit is invalid",
);
invariant(frontmatterValue(context, "status") === "active", "Stage 01 contract is not active");
invariant(!context.includes("_archive/2026"), "Stage 01 declares an archive input");

const declaredInputs = [...context.matchAll(
  /^- (?:Freshness dependency|Tooling dependency|Observed baseline): `([^`]+)`$/gm,
)].map((match) => repositoryPath(projectRoot, resolve(stageRoot, match[1])));
invariant(
  JSON.stringify(declaredInputs) === JSON.stringify(expectedInputs.slice(1)),
  `Stage 01 declared inputs differ from the bounded set:\n${declaredInputs.join("\n")}`,
);

invariant(frontmatterValue(spec, "type") === "stage-primary-output", "SPEC.md type is invalid");
invariant(frontmatterValue(spec, "stage") === "01_spec", "SPEC.md stage is invalid");
invariant(frontmatterValue(spec, "status") === "ready-for-review", "SPEC.md is not ready for review");
invariant(frontmatterValue(spec, "truth_mode") === "repository-observed", "SPEC.md truth mode is invalid");

for (const heading of [
  "Product outcome",
  "Current repository evidence",
  "Bounded scope",
  "Authority-control history contract",
  "Complete trace-event contract",
  "Observable acceptance criteria",
  "Required negative cases",
  "Stage handoff",
  "Declared input hashes",
]) {
  invariant(markdownSection(spec, new RegExp(`^## ${heading}$`)).length > 0, `SPEC.md is missing ${heading}`);
}

const hashSection = markdownSection(spec, /^## Declared input hashes$/);
const bindings = markdownHashBindings(hashSection);
invariant(bindings.length === expectedInputs.length, "SPEC.md does not bind every declared input exactly once");
invariant(
  JSON.stringify(bindings.map(({ input }) => input)) === JSON.stringify(expectedInputs),
  "SPEC.md input bindings differ from the declared ordered input set",
);
for (const binding of bindings) {
  const actual = await fileHash(projectRoot, resolve(projectRoot, binding.input));
  invariant(actual === binding.expected, `Input hash drift: ${binding.input}`);
}

for (const evidence of [
  "stores one mutable row per workspace",
  "do not yet emit a complete",
  "`traceEventCount`, not the ordered durable events",
  "L08's",
]) requireText(spec, evidence, `repository evidence: ${evidence}`);

for (const requirement of [
  "Events are the canonical source for effective kill-switch state",
  "absence, ambiguity, invalid ordering, or an unverifiable head fails closed as `engaged`",
  "Requesting the already-effective value is an idempotent no-op",
  "one serializable winner",
  "using the row's workspace,",
  "must not delete workspace authority-control history",
  "same accepted write boundary",
  "references the exact workspace control history",
  "sorted by integer `sequence ASC`",
  "`traceEventCount` remains a compatibility field and must equal `traceEvents.length`",
  "never sorts by timestamp, silently deduplicates, paginates, truncates, or drops unknown event types",
  "must not expose raw `payload_json`",
  "Unknown or malformed payload fields are omitted",
]) requireText(spec, requirement, `authority/trace requirement: ${requirement}`);

for (const field of [
  "event identity",
  "workspace identity",
  "sequence",
  "control kind",
  "prior state",
  "current state",
  "actor identity",
  "reason code",
  "idempotency key",
  "occurred time",
  "content hash",
]) requireText(spec, `| ${field} |`, `authority-history field ${field}`);

for (let index = 1; index <= 12; index += 1) {
  const id = `L04-AC${String(index).padStart(2, "0")}`;
  invariant((spec.match(new RegExp(id, "g")) ?? []).length === 1, `${id} must appear exactly once`);
}
for (let index = 1; index <= 12; index += 1) {
  const id = `L04-N${String(index).padStart(2, "0")}`;
  invariant((spec.match(new RegExp(id, "g")) ?? []).length === 1, `${id} must appear exactly once`);
}

const scope = markdownSection(spec, /^## Bounded scope$/);
for (const exclusion of [
  "an HTTP/API trace-resolution endpoint",
  "new authentication or role semantics",
  "a generic audit-log platform",
  "changes to L08 active-intent selection",
  "raw chain-of-thought",
]) invariant(scope.includes(exclusion), `L04 scope is missing exclusion: ${exclusion}`);
invariant(spec.includes("L14 will separately expose it"), "L14 handoff is not explicit");
invariant(spec.includes("No L14 HTTP endpoint") || spec.includes("No L14 HTTP endpoint"), "L14 endpoint must be an explicit negative acceptance criterion");

invariant(frontmatterValue(gate, "gate_status") === "open", "Human gate must remain open");
invariant(frontmatterValue(gate, "decision") === "pending", "Human gate must remain pending");
invariant(frontmatterValue(gate, "spec_sha256") === "pending", "Human gate prematurely binds SPEC.md");
invariant(frontmatterValue(gate, "verification_sha256") === "pending", "Human gate prematurely binds VERIFY.md");

console.log("Stage 01 specification verification passed.");
console.log(`Declared inputs: ${bindings.length}`);
console.log("Acceptance criteria: 12");
console.log("Negative cases: 12");
console.log("Human gate: open / pending");
}
