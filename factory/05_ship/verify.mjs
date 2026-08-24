import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  fileHash,
  frontmatterValue,
  markdownHashBindings,
  markdownSection,
  pathHash,
  runChecked,
} from "../_lib/verify-kit.mjs";

const stageRoot = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(stageRoot, "../..");
const outputRoot = resolve(stageRoot, "output");
const manifestPath = resolve(outputRoot, "RELEASE_MANIFEST.md");
const demoPath = resolve(outputRoot, "DEMO_SCRIPT.md");
const verifyPath = resolve(outputRoot, "VERIFY.md");
const gatePath = resolve(outputRoot, "HUMAN_GATE.md");

function inside(path, parent) {
  const relation = relative(parent, path);
  return relation === "" || (!relation.startsWith(`..${sep}`) && relation !== "..");
}

function resolveBinding(input) {
  const path = input.startsWith(".")
    ? resolve(dirname(manifestPath), input)
    : resolve(projectRoot, input);
  if (!inside(path, projectRoot)) throw new Error(`Release binding escapes repository: ${input}`);
  return path;
}

function parsePreparation(stdout) {
  const line = stdout.trim().split(/\r?\n/).at(-1);
  return JSON.parse(line);
}

const manifest = await readFile(manifestPath, "utf8");
const demo = await readFile(demoPath, "utf8");
const gate = await readFile(gatePath, "utf8");
const stageFourReportPath = resolve(projectRoot, "factory/04_verify/output/VERIFICATION_REPORT.md");
const stageFourGatePath = resolve(projectRoot, "factory/04_verify/output/HUMAN_GATE.md");
const stageFourReport = await readFile(stageFourReportPath, "utf8");
const stageFourGate = await readFile(stageFourGatePath, "utf8");

assert.equal(frontmatterValue(manifest, "status"), "ready-for-review");
assert.equal(frontmatterValue(demo, "status"), "ready-for-review");
assert.equal(frontmatterValue(stageFourGate, "gate_status"), "closed");
assert.equal(frontmatterValue(stageFourGate, "decision"), "accepted");
assert.equal(
  frontmatterValue(stageFourGate, "verification_report_sha256"),
  await fileHash(projectRoot, stageFourReportPath),
  "Stage 04 gate must bind the current verification report",
);
assert.match(stageFourReport, /^## Verdict$/m);
assert.match(stageFourReport, /^PASS\./m);

for (const heading of [
  "## Release identity",
  "## Truth manifest",
  "## Architecture",
  "## Threat model",
  "## Cold setup",
  "## Proof index",
  "## Corrected and remaining findings",
  "## Residual limits",
  "## Declared input bindings",
]) {
  assert.match(manifest, new RegExp(`^${heading}$`, "m"), `missing ${heading}`);
}

for (const text of [manifest, demo]) {
  assert.match(text, /FIXTURE/);
  assert.match(text, /TEST/);
  assert.match(text, /runtime/i);
  assert.match(text, /correlated, not proven/i);
  assert.match(text, /no (?:blind |silent )?retry/i);
  assert.doesNotMatch(text, /Result[- ]native|production[- ]proven|exactly[- ]once delivery is proven/i);
}
assert.match(manifest, /single-user UI does not visually prove tenant isolation/i);
assert.match(manifest, /measured cost remains unknown/i);
assert.match(manifest, /L20/);
assert.match(manifest, /L04/);
assert.match(manifest, /L14/);

for (const phrase of [
  "npm install",
  "npm run demo:prepare",
  "npm run dev",
  "http://localhost:3000/",
  "Reset exact FIXTURE trace for replay",
  "Pause all actions",
  "Edit proposed action",
  "Provider times out after dispatch",
  "INDETERMINATE · NO RETRY",
  "Authorize exact action",
  "## 90-second narrative",
]) {
  assert.ok(demo.includes(phrase), `demo script is missing: ${phrase}`);
}

const expectedBindings = new Set([
  "factory/05_ship/CONTEXT.md",
  "factory/04_verify/output/VERIFICATION_REPORT.md",
  "factory/04_verify/output/HUMAN_GATE.md",
  "factory/_shared/ARCHITECTURE_SNAPSHOT.md",
  "factory/_shared/QUALITY_GATES.md",
  "README.md",
  "package.json",
  "app/",
  "db/",
  "drizzle/",
  "worker/",
  "tests/",
  "factory/05_ship/prepare.mjs",
  "factory/05_ship/verify.mjs",
  "factory/05_ship/output/DEMO_SCRIPT.md",
]);
const bindingSection = markdownSection(manifest, /^## Declared input bindings$/);
const bindings = markdownHashBindings(bindingSection);
assert.equal(bindings.length, expectedBindings.size, "release manifest binding count changed");
assert.equal(new Set(bindings.map((binding) => binding.input)).size, bindings.length, "duplicate release binding");
for (const binding of bindings) {
  assert.ok(expectedBindings.delete(binding.input), `undeclared release binding: ${binding.input}`);
  assert.equal(
    await pathHash(projectRoot, resolveBinding(binding.input)),
    binding.expected,
    `release-head drift: ${binding.input}`,
  );
}
assert.deepEqual([...expectedBindings], [], "release-head coverage is incomplete");

assert.equal(frontmatterValue(gate, "gate_status"), "open");
assert.equal(frontmatterValue(gate, "decision"), "pending");
assert.equal(frontmatterValue(gate, "release_manifest_sha256"), await fileHash(projectRoot, manifestPath));
assert.equal(frontmatterValue(gate, "demo_script_sha256"), await fileHash(projectRoot, demoPath));
try {
  await access(verifyPath);
  assert.equal(frontmatterValue(gate, "verification_sha256"), await fileHash(projectRoot, verifyPath));
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
  assert.equal(frontmatterValue(gate, "verification_sha256"), "pending");
}

const coldRoot = await mkdtemp(resolve(stageRoot, ".verify-cold-"));
assert.ok(inside(coldRoot, stageRoot) && coldRoot !== stageRoot, "Unsafe cold cleanup target.");
let coldFirst;
let coldSecond;
try {
  const prepareArgs = [
    "factory/05_ship/prepare.mjs",
    "--persist-to",
    relative(projectRoot, coldRoot),
  ];
  coldFirst = runChecked(process.execPath, prepareArgs, { cwd: projectRoot, timeout: 240_000 });
  coldSecond = runChecked(process.execPath, prepareArgs, { cwd: projectRoot, timeout: 240_000 });
} finally {
  await rm(coldRoot, { recursive: true, force: true });
}
const firstPreparation = parsePreparation(coldFirst.stdout);
const secondPreparation = parsePreparation(coldSecond.stdout);
assert.deepEqual(
  {
    status: firstPreparation.status,
    migrationsApplied: firstPreparation.migrationsApplied,
    reasoningColumns: firstPreparation.reasoningColumns,
    l06RuntimeTriggers: firstPreparation.l06RuntimeTriggers,
    idempotentNoop: firstPreparation.idempotentNoop,
  },
  {
    status: "prepared",
    migrationsApplied: 8,
    reasoningColumns: 8,
    l06RuntimeTriggers: 6,
    idempotentNoop: false,
  },
);
assert.equal(secondPreparation.idempotentNoop, true);
assert.equal(secondPreparation.migrationsApplied, 8);
assert.equal(secondPreparation.reasoningColumns, 8);
assert.equal(secondPreparation.truthMode, "FIXTURE");
assert.equal(secondPreparation.effectMode, "TEST");

const tsx = resolve(projectRoot, "node_modules/tsx/dist/cli.mjs");
const vinext = resolve(projectRoot, "node_modules/vinext/dist/cli.js");
const eslint = resolve(projectRoot, "node_modules/eslint/bin/eslint.js");

const independent = runChecked(
  process.execPath,
  [tsx, "factory/04_verify/verify.mjs"],
  { cwd: projectRoot, timeout: 180_000 },
);
assert.match(independent.stdout, /"status": "passed"/);
assert.match(independent.stdout, /"coldRuntimeAttempts": 6/);
assert.match(independent.stdout, /"recoveredPlannerAttempts": 2/);
assert.match(independent.stdout, /"costStatus": "unknown"/);

const tests = runChecked(
  process.execPath,
  [tsx, "--test", "tests/flight-recorder-build.test.mjs", "tests/flight-recorder-release.test.mjs"],
  { cwd: projectRoot, timeout: 180_000 },
);
assert.match(tests.stdout, /L06 cold product path invokes six runtime handlers/);
assert.match(tests.stdout, /L06 concurrent executor calls converge on one canonical graph/);
assert.match(tests.stdout, /all fourteen L06 direct-database attacks fail with zero partial mutation/);
assert.match(tests.stdout, /production operations fail closed in both deterministic L08 schedules/);

runChecked(process.execPath, [vinext, "build"], { cwd: projectRoot, timeout: 180_000 });
runChecked(
  process.execPath,
  [
    eslint,
    "app",
    "db",
    "worker",
    "tests/flight-recorder-build.test.mjs",
    "tests/flight-recorder-release.test.mjs",
    "factory/05_ship/prepare.mjs",
    "factory/05_ship/verify.mjs",
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
  stage: "05_ship",
  unit: "persisted-graph-executor-correction",
  graphVersion: "crosssignal-fixed-graph-v1",
  executionMode: "runtime",
  truthMode: "FIXTURE",
  effectMode: "TEST",
  releaseHeadBindings: bindings.length,
  coldPreparationRuns: 2,
  migrationsApplied: 8,
  coldRuntimeAttempts: 6,
  recoveredPlannerAttempts: 2,
  l06DatabaseAttacks: 14,
  l08RaceSchedules: 2,
  l08DatabaseAttacks: 10,
  measuredCost: "unknown",
  correctedFinding: "L06",
  remainingFindings: ["L20", "L04", "L14"],
  evidence: "factory/05_ship/output/RELEASE_MANIFEST.md",
}, null, 2)}\n`);
