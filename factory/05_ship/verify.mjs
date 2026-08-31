import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  fileHash,
  frontmatterValue,
  markdownHashBindings,
} from "../_lib/verify-kit.mjs";
import { prepareL14Release } from "./prepare.mjs";

const projectRoot = resolve(import.meta.dirname, "../..");
const fromRoot = (path) => resolve(projectRoot, path);
const read = (path) => readFile(fromRoot(path), "utf8");

const expectedInputs = new Map([
  ["factory/05_ship/CONTEXT.md", "02d9af49229f2c6565180623b84f5feafcffc7733b83b870dd1725ca6e28a394"],
  ["factory/04_verify/output/VERIFICATION_REPORT.md", "1db772fa55840bdb8d5dab2daa26da1ca8e21ea1d91d0153b19415b34b950400"],
  ["factory/04_verify/output/HUMAN_GATE.md", "c3e0ef560d74a0501e9ed0576793f80fcb03132519362fda93a76817ce546aef"],
  ["factory/_shared/ARCHITECTURE_SNAPSHOT.md", "e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084"],
  ["factory/_shared/QUALITY_GATES.md", "081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f"],
  ["factory/_lib/verify-kit.mjs", "b2c7434bf3acacbfb6323b33cf0b175f77d0e3b1d66aeadee6e9ea996c95015c"],
  ["factory/_lib/factory-state.mjs", "72870904445d54f01eea443ed5a5de1b2af2fd19df66e085a52bf47982594d28"],
  ["factory/status.mjs", "a1bfc445aeab8e9672885c13bc73aabf0aaef0a90f9d44f8ae17cf36b2cfbbe5"],
  ["factory/seal.mjs", "3677085ff09b983e03dd69b7b27d060eca32fa155464f7df3de3dad11bafb65e"],
  ["package.json", "c8a9ab36760f08998d304efdc6a4d514a22f8d7ea05ab8c8df992ecc09f75972"],
]);

for (const [path, expected] of expectedInputs) {
  assert.equal(await fileHash(projectRoot, fromRoot(path)), expected, `${path} drifted`);
}

const [manifest, verification, gate] = await Promise.all([
  read("factory/05_ship/output/RELEASE_MANIFEST.md"),
  read("factory/05_ship/output/VERIFY.md"),
  read("factory/05_ship/output/HUMAN_GATE.md"),
]);

assert.equal(frontmatterValue(manifest, "status"), "passed");
assert.equal(frontmatterValue(manifest, "truth_mode"), "FIXTURE");
assert.equal(frontmatterValue(verification, "status"), "passed");
assert.equal(frontmatterValue(gate, "gate_status"), "open");
assert.equal(frontmatterValue(gate, "decision"), "pending");

await prepareL14Release();

for (const [path, expected] of expectedInputs) {
  const binding = markdownHashBindings(manifest).find((item) => item.input === path);
  assert.equal(binding?.expected, expected, `${path} is not bound in the release manifest`);
}

const verificationBindings = new Map(
  markdownHashBindings(verification).map(({ input, expected }) => [input, expected]),
);
for (const path of [
  "factory/05_ship/prepare.mjs",
  "factory/05_ship/verify.mjs",
  "factory/05_ship/output/RELEASE_MANIFEST.md",
  "factory/05_ship/output/DEMO_SCRIPT.md",
]) {
  assert.equal(
    verificationBindings.get(path),
    await fileHash(projectRoot, fromRoot(path)),
    `${path} is not bound in VERIFY.md`,
  );
}

assert.equal(
  frontmatterValue(gate, "release_manifest_sha256"),
  await fileHash(projectRoot, fromRoot("factory/05_ship/output/RELEASE_MANIFEST.md")),
);
assert.equal(
  frontmatterValue(gate, "demo_script_sha256"),
  await fileHash(projectRoot, fromRoot("factory/05_ship/output/DEMO_SCRIPT.md")),
);
assert.equal(
  frontmatterValue(gate, "verification_sha256"),
  await fileHash(projectRoot, fromRoot("factory/05_ship/output/VERIFY.md")),
);

console.log(
  "L14 Stage 05 ship verification passed: complete release-head binding, cold evaluator path, accepted Stage 04 evidence, and explicit FIXTURE limits.",
);
