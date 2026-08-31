import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  L14_ACCEPTANCE_IDS,
  L14_CORRUPTIONS,
  L14_EVENT_KEYS,
  L14_NEGATIVE_CASES,
  L14_NEGATIVE_IDS,
  L14_ROUTE,
  L14_SCHEMA_VERSION,
  L14_TRACE_RESOLUTION_FIXTURE,
  l14FixtureDigest,
  validateL14Fixture,
} from "./fixtures/l14-trace-resolution.fixture.mjs";
import {
  fileHash,
  frontmatterValue,
  markdownHashBindings,
  runChecked,
} from "../_lib/verify-kit.mjs";

const root = resolve(import.meta.dirname, "../..");
const packagePath = resolve(import.meta.dirname, "output/DATA_PACKAGE.md");
const verifyPath = resolve(import.meta.dirname, "output/VERIFY.md");
const gatePath = resolve(import.meta.dirname, "output/HUMAN_GATE.md");
const fixturePath = resolve(import.meta.dirname, "fixtures/l14-trace-resolution.fixture.mjs");
const dataPackage = await readFile(packagePath, "utf8");
const gate = await readFile(gatePath, "utf8");

const expectedInputs = new Map([
  ["factory/02_data/CONTEXT.md", "592edb4458d1eff71887ace8f33e240229dd31f66db28c7f54d9b3c5af4dadb7"],
  ["factory/01_spec/output/SPEC.md", "b09aafe97ecfdd4e6c3085426275b7505c906766023f374e2d7d68f2e2202371"],
  ["factory/01_spec/output/HUMAN_GATE.md", "656fc931fe34749c2b1e3db29e6d15e80a0abae1c016d6047679ce410a45a584"],
  ["factory/_shared/ARCHITECTURE_SNAPSHOT.md", "e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084"],
  ["factory/_shared/QUALITY_GATES.md", "081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f"],
  ["factory/_lib/verify-kit.mjs", "b2c7434bf3acacbfb6323b33cf0b175f77d0e3b1d66aeadee6e9ea996c95015c"],
  ["app/chatgpt-auth.ts", "4265a2e7c2dcb3a6f4b7026f762bf5b6e4caec76cc13c0a45987ee9a9f2e42cc"],
  ["app/crosssignal-auth.ts", "4c6081befd4c0eee91d962a689f67ec5f5e612e0dc462fab1bec3d8d874890e0"],
  ["db/workspaces.ts", "d7f5b0d47fd294f2055c8f9247d9b8f5a0a7a1eb9c86e2daf5cb9d917e1a8eb6"],
  ["db/flight-recorder-schema.ts", "18f30283877491c7a15de0667134aa07cd1ff21e41f9b626f0377b145c46cd09"],
  ["db/flight-recorder-contracts.ts", "e6d61497b43979aeb8dd9154c49aec7a04949a8db22ea30107dd82c05f796192"],
  ["db/flight-recorder.ts", "4bf6802a6dc96463381d9a58135e10a1cc27a64e7a27159e99217061166411b0"],
  ["tests/fixtures/l04-authority-trace.fixture.mjs", "cd565ba32b846e2848be56c6ef8c705bb13088d6424f80feb962d96411afa464"],
]);

assert.equal(frontmatterValue(dataPackage, "type"), "stage-output");
assert.equal(frontmatterValue(dataPackage, "stage"), "02_data");
assert.equal(frontmatterValue(dataPackage, "status"), "ready-for-review");
const upstreamGate = await readFile(resolve(root, "factory/01_spec/output/HUMAN_GATE.md"), "utf8");
assert.equal(frontmatterValue(upstreamGate, "decision"), "accepted", "Stage 01 gate is not accepted");

const bindings = new Map(
  markdownHashBindings(dataPackage).map(({ input, expected }) => [input, expected]),
);
assert.equal(bindings.size, expectedInputs.size, "data-package input binding count drifted");
for (const [path, expected] of expectedInputs) {
  assert.equal(bindings.get(path), expected, `missing or changed binding: ${path}`);
  assert.equal(await fileHash(root, resolve(root, path)), expected, `stale input: ${path}`);
}

assert.deepEqual(validateL14Fixture(), []);
assert.equal(l14FixtureDigest(), "3b005060f11bf8da81788686d32a3e7325edbfaf86d9323680f1ef0fda657ee4");
assert.equal(await fileHash(root, fixturePath), "d219e789eb364782fdb9974c48caf1b385b49e134e6352af860c93c0d3e4dd0d");
assert.equal(L14_TRACE_RESOLUTION_FIXTURE.route, L14_ROUTE);
assert.equal(L14_TRACE_RESOLUTION_FIXTURE.success.pendingA.schemaVersion, L14_SCHEMA_VERSION);
assert.equal(L14_TRACE_RESOLUTION_FIXTURE.success.pendingA.eventCount, 28);
assert.equal(L14_TRACE_RESOLUTION_FIXTURE.success.completedB.eventCount, 49);
assert.equal(L14_CORRUPTIONS.length, 5);
assert.equal(L14_NEGATIVE_CASES.length, 12);
assert.deepEqual(L14_ACCEPTANCE_IDS, Array.from({ length: 14 }, (_, index) => `AC-L14-${String(index + 1).padStart(2, "0")}`));
assert.deepEqual(L14_NEGATIVE_IDS, Array.from({ length: 12 }, (_, index) => `NEG-L14-${String(index + 1).padStart(2, "0")}`));
assert.deepEqual(Object.keys(L14_TRACE_RESOLUTION_FIXTURE.unknownEvent.projected.details), []);
assert.deepEqual(Object.keys(L14_TRACE_RESOLUTION_FIXTURE.success.completedB.events[0]).sort(), L14_EVENT_KEYS);
assert.ok(Object.isFrozen(L14_TRACE_RESOLUTION_FIXTURE), "fixture root is mutable");

const packageAcceptance = [...dataPackage.matchAll(/`AC-L14-(\d{2})`/g)].map((match) => match[1]);
assert.deepEqual([...new Set(packageAcceptance)], Array.from({ length: 14 }, (_, index) => String(index + 1).padStart(2, "0")));
const packageNegatives = [...dataPackage.matchAll(/`NEG-L14-(\d{2})`/g)].map((match) => match[1]);
assert.deepEqual(
  [...new Set(packageNegatives)].sort(),
  Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0")),
);

for (const phrase of [
  "strict non-redirecting authentication read",
  "Bind both workspace and trace",
  "Reuse `projectFlightTraceEvents`",
  "compare serialized bytes",
  "no product schema, migration, endpoint, UI, mutation",
]) assert.ok(dataPackage.includes(phrase), `required data obligation missing: ${phrase}`);

const dataPackageHash = await fileHash(root, packagePath);
assert.equal(frontmatterValue(gate, "data_package_sha256"), dataPackageHash, "gate does not bind current data package");
const gateDecision = frontmatterValue(gate, "decision");
assert.ok(["pending", "accepted"].includes(gateDecision), "gate decision is invalid");
if (gateDecision === "accepted") {
  assert.equal(frontmatterValue(gate, "gate_status"), "closed");
  assert.notEqual(frontmatterValue(gate, "reviewer"), "pending");
  assert.notEqual(frontmatterValue(gate, "reviewed_at"), "pending");
  assert.equal(frontmatterValue(gate, "verification_sha256"), await fileHash(root, verifyPath));
}

const { stdout } = runChecked(
  "git",
  ["diff", "--name-only", "--", "app", "db", "drizzle", "worker", "tests"],
  { cwd: root },
);
assert.equal(stdout.trim(), "", "Stage 02 changed a durable product surface");

console.log("L14 Stage 02 data verification passed: 2 tenant success traces, 5 corruptions, 14 acceptance IDs, 12 negative cases.");
