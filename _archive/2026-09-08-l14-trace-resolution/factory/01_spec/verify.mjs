import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  fileHash,
  frontmatterValue,
  markdownHashBindings,
  runChecked,
} from "../_lib/verify-kit.mjs";

const root = resolve(import.meta.dirname, "../..");
const specPath = resolve(import.meta.dirname, "output/SPEC.md");
const verifyPath = resolve(import.meta.dirname, "output/VERIFY.md");
const gatePath = resolve(import.meta.dirname, "output/HUMAN_GATE.md");
const spec = await readFile(specPath, "utf8");
const gate = await readFile(gatePath, "utf8");

const expectedInputs = new Map([
  ["factory/01_spec/CONTEXT.md", "ec2c145a85802c01ad5796e9619c72e700ea19350397f58b1379a12fc9f5a47e"],
  ["factory/_shared/ARCHITECTURE_SNAPSHOT.md", "e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084"],
  ["factory/_shared/QUALITY_GATES.md", "081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f"],
  ["factory/_lib/verify-kit.mjs", "b2c7434bf3acacbfb6323b33cf0b175f77d0e3b1d66aeadee6e9ea996c95015c"],
  ["package.json", "c8a9ab36760f08998d304efdc6a4d514a22f8d7ea05ab8c8df992ecc09f75972"],
  ["app/crosssignal-auth.ts", "4c6081befd4c0eee91d962a689f67ec5f5e612e0dc462fab1bec3d8d874890e0"],
  ["app/page.tsx", "b72866126a09ffa1e0f51e127564b22b56430d16ea5d5c4f7878822c55624722"],
  ["db/flight-recorder-contracts.ts", "e6d61497b43979aeb8dd9154c49aec7a04949a8db22ea30107dd82c05f796192"],
  ["db/flight-recorder.ts", "4bf6802a6dc96463381d9a58135e10a1cc27a64e7a27159e99217061166411b0"],
  ["tests/flight-recorder-build.test.mjs", "7efeb3f0ca10d7b49b5d7498d364ab6c345b1919b74b6686bc774f664e52cedd"],
  ["tests/flight-recorder-data.test.mjs", "d4be07a521bbfd19726d3ea2aa3bdd034620a2518a2375e8e4cf79ada8e032cf"],
]);

assert.equal(frontmatterValue(spec, "type"), "stage-output");
assert.equal(frontmatterValue(spec, "stage"), "01_spec");
assert.equal(frontmatterValue(spec, "status"), "ready-for-review");
const gateDecision = frontmatterValue(gate, "decision");
assert.ok(["pending", "accepted"].includes(gateDecision), "gate decision is invalid");

const declaredBindings = new Map(
  markdownHashBindings(spec).map(({ input, expected }) => [input, expected]),
);
assert.equal(declaredBindings.size, expectedInputs.size, "spec input binding count drifted");
for (const [path, expected] of expectedInputs) {
  assert.equal(declaredBindings.get(path), expected, `missing or changed binding: ${path}`);
  assert.equal(await fileHash(root, resolve(root, path)), expected, `stale input: ${path}`);
}

const requiredPhrases = [
  "GET /api/workspaces/{workspaceId}/traces/{traceId}",
  "no local-development fallback",
  "projectFlightTraceEvents",
  "Cache-Control: private, no-store",
  "authentication_required",
  "trace_not_found",
  "trace_projection_incomplete",
  "trace_resolution_unavailable",
  "eventCount === events.length",
  "also binding `workspace_id`",
  "does not paginate or return a partial prefix",
  "Unknown future event type",
  "Durable table counts and trace state remain unchanged",
  "No mutation method",
];
for (const phrase of requiredPhrases) {
  assert.ok(spec.includes(phrase), `required contract phrase missing: ${phrase}`);
}

const acceptanceIds = [...spec.matchAll(/\*\*AC-L14-(\d{2})\b/g)].map((match) => match[1]);
assert.deepEqual(acceptanceIds, Array.from({ length: 14 }, (_, index) => String(index + 1).padStart(2, "0")));
const negativeIds = [...spec.matchAll(/`NEG-L14-(\d{2})`/g)].map((match) => match[1]);
assert.deepEqual(negativeIds, Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0")));

for (const forbidden of [
  "Result's private stack",
  "exactly-once delivery is guaranteed",
  "chain-of-thought",
  "permissive CORS is required",
]) {
  assert.equal(spec.includes(forbidden), false, `forbidden claim present: ${forbidden}`);
}

const specHash = await fileHash(root, specPath);
assert.ok(
  gate.includes(`| \`factory/01_spec/output/SPEC.md\` | \`${specHash}\` |`),
  "gate does not bind the current spec",
);
if (gateDecision === "accepted") {
  const verifyHash = await fileHash(root, verifyPath);
  assert.notEqual(frontmatterValue(gate, "reviewer"), "pending", "accepted gate has no reviewer");
  assert.notEqual(frontmatterValue(gate, "reviewed_at"), "pending", "accepted gate has no timestamp");
  assert.ok(
    gate.includes(`| \`factory/01_spec/output/VERIFY.md\` | \`${verifyHash}\` |`),
    "accepted gate does not bind the current verification record",
  );
}

const { stdout } = runChecked(
  "git",
  ["diff", "--name-only", "--", "app", "db", "drizzle", "worker", "tests"],
  { cwd: root },
);
assert.equal(stdout.trim(), "", "Stage 01 changed a durable product surface");

console.log("L14 Stage 01 specification verification passed: 14 acceptance criteria, 12 negative cases, 11 bound inputs.");
