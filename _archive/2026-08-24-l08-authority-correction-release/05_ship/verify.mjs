import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  frontmatterValue,
  markdownHashBindings,
  markdownSection,
  pathHash,
} from "../_lib/verify-kit.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");

async function read(relative) {
  return readFile(join(root, relative), "utf8");
}

function runNode(args, timeout = 180_000) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    timeout,
  });
  assert.equal(
    result.status,
    0,
    `node ${args.join(" ")} failed:\n${result.error?.message ?? result.stderr ?? result.stdout}`,
  );
  return `${result.stdout}\n${result.stderr}`;
}

const [manifest, demoScript, verificationReport, verificationGate, architecture, quality, readme] =
  await Promise.all([
    read("factory/05_ship/output/RELEASE_MANIFEST.md"),
    read("factory/05_ship/output/DEMO_SCRIPT.md"),
    read("factory/04_verify/output/VERIFICATION_REPORT.md"),
    read("factory/04_verify/output/HUMAN_GATE.md"),
    read("factory/_shared/ARCHITECTURE_SNAPSHOT.md"),
    read("factory/_shared/QUALITY_GATES.md"),
    read("README.md"),
  ]);

assert.equal(frontmatterValue(verificationReport, "status"), "ready-for-review");
assert.equal(frontmatterValue(verificationGate, "gate_status"), "closed");
assert.equal(frontmatterValue(verificationGate, "decision"), "accepted");
assert.equal(
  frontmatterValue(verificationGate, "verification_report_sha256"),
  await pathHash(root, join(root, "factory/04_verify/output/VERIFICATION_REPORT.md")),
);
assert.equal(frontmatterValue(manifest, "status"), "ready-for-review");
assert.equal(frontmatterValue(manifest, "release_id"), "crosssignal-l08-authority-correction-v1");
assert.equal(frontmatterValue(manifest, "truth_mode"), "FIXTURE");
assert.equal(frontmatterValue(manifest, "effect_mode"), "TEST");

for (const token of [
  "flight_traces.active_intent_id",
  "l08_stale_or_superseded_intent",
  "l08_intent_activation_rejected",
  "migration 0006",
  "node factory/04_verify/verify.mjs",
  "node factory/05_ship/prepare.mjs",
  "L06",
  "L20",
  "L04",
  "L14",
]) assert.match(manifest, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));

assert.match(manifest, /human control layer for consequential agent actions/i);
assert.match(manifest, /single-user UI does not visually prove tenant isolation/i);
assert.match(manifest, /no (?:blind |silent )?retry/i);
assert.match(manifest, /not proven/i);
assert.match(manifest, /normal runtime[^\n]+never infers[^\n]+(?:time|order)/i);
assert.match(demoScript, /^truth_mode: FIXTURE$/m);
assert.match(demoScript, /^effect_mode: TEST$/m);
assert.match(readme, /npm run verify:ship/);
assert.match(architecture, /Any payload, context, policy, recipient, cap, or display mutation creates a/);
assert.match(quality, /Changed, stale, replayed, cross-tenant, or directly invoked authority fails/);

const bindingSection = markdownSection(manifest, /^## Declared input bindings$/);
const bindings = markdownHashBindings(bindingSection);
const requiredBindings = new Set([
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
  "factory/02_data/fixtures/superseded-intent-authority.fixture.mjs",
  "factory/03_build/verify.mjs",
  "factory/04_verify/verify.mjs",
  "factory/05_ship/prepare.mjs",
  "factory/05_ship/verify.mjs",
  "factory/05_ship/output/DEMO_SCRIPT.md",
]);
assert.deepEqual(new Set(bindings.map(({ input }) => input)), requiredBindings);
const declaredInputs = {};
for (const { input, expected } of bindings) {
  const actual = await pathHash(root, resolve(root, input.replace(/[\\/]$/, "")));
  assert.equal(actual, expected, `release-head drift: ${input}`);
  declaredInputs[input] = actual;
}

const prepareOutput = runNode(["factory/05_ship/prepare.mjs"]);
assert.match(prepareOutput, /ready through migration 0006|prepared and verified through migration 0006/);
const verifyOutput = runNode(["factory/04_verify/verify.mjs"]);
assert.match(verifyOutput, /"deterministicSchedules": 2/);
assert.match(verifyOutput, /"directDatabaseAttacks": 10/);
assert.match(verifyOutput, /"migrationCases": 5/);
const buildTests = runNode(["--import", "tsx", "--test", "tests/flight-recorder-build.test.mjs"]);
assert.match(buildTests, /tests 15/);
assert.match(buildTests, /fail 0/);
const shipTests = runNode(["--import", "tsx", "--test", "tests/flight-recorder-ship.test.mjs"]);
assert.match(shipTests, /tests 5/);
assert.match(shipTests, /fail 0/);

console.log(JSON.stringify({
  status: "passed",
  releaseId: "crosssignal-l08-authority-correction-v1",
  correctedFinding: "L08",
  acceptedVerifyGate: true,
  coldPreparation: "migration 0006 ready and idempotent",
  deterministicSchedules: 2,
  directDatabaseAttacks: 10,
  migrationCases: 5,
  focusedTests: { build: 15, ship: 5 },
  remainingFindings: ["L06", "L20", "L04", "L14"],
  declaredInputs,
}, null, 2));
