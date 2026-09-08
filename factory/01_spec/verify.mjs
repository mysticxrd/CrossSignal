import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  fileHash,
  frontmatterValue,
  markdownHashBindings,
  pathHash,
} from "../_lib/verify-kit.mjs";

const projectRoot = resolve(import.meta.dirname, "../..");
const fromRoot = (path) => resolve(projectRoot, path);
const read = (path) => readFile(fromRoot(path), "utf8");

const expectedInputs = new Map([
  ["factory/01_spec/CONTEXT.md", "740cde6585aab54644a12307b13944ec91029c9ab8f8f38775e5eba5e6d0a6de"],
  ["factory/_shared/ARCHITECTURE_SNAPSHOT.md", "e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084"],
  ["factory/_shared/QUALITY_GATES.md", "081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f"],
  ["factory/_lib/verify-kit.mjs", "b2c7434bf3acacbfb6323b33cf0b175f77d0e3b1d66aeadee6e9ea996c95015c"],
  ["package.json", "c8a9ab36760f08998d304efdc6a4d514a22f8d7ea05ab8c8df992ecc09f75972"],
  ["drizzle.config.ts", "3ec3fe6a06a9be54bbd980ec2fc72b014bfdc7d30b5c92d02aa0aa3c95e39b1a"],
  ["vite.config.ts", "4a8de6242dc5eecaf99f582ec511cd4f6ee367648b38d5599c90f462cdc89fd0"],
  ["worker/index.ts", "2ed36d7fa996e946d9d7695c5925e7760246f6bf8fa35c06f1bc515c087dc450"],
  ["db/index.ts", "c6fc9494d04c9457fc4178bed614d0e4ba7c5877e9d65ced11c691b735ec851e"],
  ["db/migrations.ts", "a33c9d1a2435c4a93b1f8f9a779d99084e4903aca6c326d7f308667d285a53b1"],
  ["db/schema.ts", "a9b641b3d901dd496a2cbecb8ce0527d085a5348d0a935d4424b2dde92cc1496"],
  ["db/flight-recorder-schema.ts", "18f30283877491c7a15de0667134aa07cd1ff21e41f9b626f0377b145c46cd09"],
  ["db/trace-resolution.ts", "2c13169c911ed46ed96670361fb0b88382184dfb92e8e11da5c6e353f16536f9"],
  ["drizzle/", "731872e4cf51b1fd99e860804622fd0e1a39903811590d7692f451a9fbaa2014"],
  ["tests/flight-recorder-build.test.mjs", "6829c8405785647baba19975f60cde2b9dff62fb927bd27176725d74159df73b"],
  ["tests/flight-recorder-data.test.mjs", "d4be07a521bbfd19726d3ea2aa3bdd034620a2518a2375e8e4cf79ada8e032cf"],
]);

for (const [path, expected] of expectedInputs) {
  assert.equal(await pathHash(projectRoot, fromRoot(path.replace(/[\\/]$/, ""))), expected, `${path} drifted`);
}

const [spec, verification, gate] = await Promise.all([
  read("factory/01_spec/output/SPEC.md"),
  read("factory/01_spec/output/VERIFY.md"),
  read("factory/01_spec/output/HUMAN_GATE.md"),
]);

assert.equal(frontmatterValue(spec, "status"), "proposed");
assert.equal(frontmatterValue(spec, "truth_mode"), "TEST");
assert.equal(frontmatterValue(verification, "status"), "passed");
assert.equal(frontmatterValue(gate, "gate_status"), "open");
assert.equal(frontmatterValue(gate, "decision"), "pending");

const bindings = new Map(markdownHashBindings(spec).map(({ input, expected }) => [input, expected]));
assert.equal(bindings.size, expectedInputs.size);
for (const [path, expected] of expectedInputs) assert.equal(bindings.get(path), expected, `${path} is not bound`);

for (let index = 1; index <= 16; index += 1) {
  assert.ok(spec.includes(`AC-SP-${String(index).padStart(2, "0")}`), `missing acceptance ${index}`);
}
for (let index = 1; index <= 12; index += 1) {
  assert.ok(spec.includes(`NEG-SP-${String(index).padStart(2, "0")}`), `missing negative ${index}`);
}

for (const required of [
  "Supavisor transaction pooler",
  "prepared statements disabled",
  "no `BYPASSRLS`",
  "transaction-local settings",
  "no silent D1 fallback",
  "No request writes to both databases",
  "D1 implementation remains",
  "selects no existing Supabase project",
  "Security and performance advisors",
  "local success alone cannot satisfy",
]) assert.ok(spec.includes(required), `missing required contract: ${required}`);

for (const forbidden of [
  /service[_ -]?role[^\n]*(browser|client)/i,
  /delete[^\n]+D1/i,
  /automatic[^\n]+fallback/i,
]) assert.doesNotMatch(spec, forbidden);

const verificationBindings = new Map(markdownHashBindings(verification).map(({ input, expected }) => [input, expected]));
for (const path of ["factory/01_spec/CONTEXT.md", "factory/01_spec/verify.mjs", "factory/01_spec/output/SPEC.md"]) {
  assert.equal(verificationBindings.get(path), await fileHash(projectRoot, fromRoot(path)), `${path} missing from verification`);
}

assert.equal(frontmatterValue(gate, "spec_sha256"), await fileHash(projectRoot, fromRoot("factory/01_spec/output/SPEC.md")));
assert.equal(frontmatterValue(gate, "verification_sha256"), await fileHash(projectRoot, fromRoot("factory/01_spec/output/VERIFY.md")));

console.log("Supabase Stage 01 specification verification passed: 16 acceptance criteria, 12 negative cases, explicit tenant and rollback boundaries, and no remote mutation.");
