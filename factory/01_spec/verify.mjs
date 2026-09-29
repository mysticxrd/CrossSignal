import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fileHash, frontmatterValue, markdownHashBindings, markdownSection } from "../_lib/verify-kit.mjs";

const root = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const read = (path) => readFile(resolve(root, path), "utf8");
const specPath = "factory/01_spec/output/SPEC.md";
const verifyPath = "factory/01_spec/output/VERIFY.md";
const gatePath = "factory/01_spec/output/HUMAN_GATE.md";
const inputs = [
  "factory/01_spec/CONTEXT.md", "factory/_shared/A01_DIRECTION.md",
  "factory/_shared/QUALITY_GATES.md", "factory/TRANSITION.md",
  "docs/a01-synthetic-investigation-handoff.md", "docs/hiring-mvp-direction.md",
  "docs/hiring-mvp-reconciliation-evidence.md", "db/revenue-leak.mjs",
  "db/case-investigator.mjs", "db/case-response.mjs", "db/flight-recorder-contracts.ts",
  "supabase/functions/_shared/case-checkout.mjs", "scripts/run-golden-case-replay.mjs",
  "scripts/run-case-scenario-matrix.mjs", "factory/_lib/verify-kit.mjs",
  "factory/_lib/factory-state.mjs",
];

export function validateSpec(spec) {
  const errors = [];
  for (const heading of ["Bounded product contract", "Acceptance checklist",
    "Initial domain-tool contract", "Simulator and evaluator isolation",
    "Approval, intervention, and durable outcome", "Initial independent rubric and failure evidence",
    "Concrete A01 observation targets", "Decisions and deferred dependencies", "Declared input hashes"]) {
    if (!spec.includes(`## ${heading}\n`)) errors.push(`missing heading: ${heading}`);
  }
  for (let index = 1; index <= 12; index++) {
    const id = `A01-${String(index).padStart(2, "0")}`;
    if (spec.split(`| ${id} |`).length !== 2) errors.push(`missing or repeated acceptance: ${id}`);
  }
  for (let index = 1; index <= 9; index++) {
    const id = `NEG-A01-${String(index).padStart(2, "0")}`;
    if (spec.split(`| ${id} |`).length !== 2) errors.push(`missing or repeated failure: ${id}`);
  }
  for (const invariant of ["SIMULATED", "deterministic_baseline", "manual-check approval",
    "Global Pause", "No paid model calls", "insufficient evidence", "private world state",
    "ten tool calls", "three hypothesis revisions", "no filesystem access",
    "No LIVE writes", "model evaluation remains pending", "15 simulated minutes",
    "200 attempts", "94%", "58b2aa09b7208bb9a7b9b3cee5a12adeb54c8a11"]) {
    if (!spec.includes(invariant)) errors.push(`missing invariant: ${invariant}`);
  }
  return errors;
}

async function checkBindings(markdown, expectedPaths, label) {
  const bindings = markdownHashBindings(markdownSection(markdown, /^## Declared input hashes$/));
  assert.deepEqual(bindings.map((item) => item.input).sort(), [...expectedPaths].sort(), `${label}: missing/extra/duplicate inputs`);
  for (const item of bindings) {
    assert.equal(item.expected, await fileHash(root, resolve(root, item.input)), `${label}: source drift: ${item.input}`);
  }
}

export async function verifySpec({ checkSpecOnly = false } = {}) {
  const spec = (await read(specPath)).replace(/\r\n?/g, "\n");
  assert.equal(frontmatterValue(spec, "unit"), "a01-synthetic-revenue-investigation");
  assert.equal(frontmatterValue(spec, "status"), "ready-for-review");
  assert.deepEqual(validateSpec(spec), []);
  await checkBindings(spec, inputs, "spec");

  // Deliberate corruption probes verify the bounded specification checks.
  assert.ok(validateSpec(spec.replace("| A01-05 |", "| removed |"))
    .some((error) => error.includes("A01-05")));
  assert.ok(validateSpec(spec.replace("| NEG-A01-03 |", "| removed |"))
    .some((error) => error.includes("NEG-A01-03")));
  assert.ok(validateSpec(spec.replaceAll("no filesystem access", "unrestricted filesystem access"))
    .some((error) => error.includes("filesystem")));
  const hashBindings = markdownHashBindings(markdownSection(spec, /^## Declared input hashes$/));
  await assert.rejects(checkBindings(spec.replace(hashBindings[0].expected, "0".repeat(64)), inputs, "tamper probe"), /source drift/);

  if (!checkSpecOnly) {
    const [verification, gate] = await Promise.all([read(verifyPath), read(gatePath)]);
    assert.equal(frontmatterValue(verification, "status"), "passed");
    await checkBindings(verification, ["factory/01_spec/CONTEXT.md", "factory/01_spec/verify.mjs", specPath], "verification");
    const actualSpec = await fileHash(root, resolve(root, specPath));
    const actualVerify = await fileHash(root, resolve(root, verifyPath));
    function checkGate(document) {
      assert.equal(frontmatterValue(document, "stage"), "01_spec");
      assert.equal(frontmatterValue(document, "spec_sha256"), actualSpec, "gate Spec hash differs");
      assert.equal(frontmatterValue(document, "verification_sha256"), actualVerify, "gate verification hash differs");
      const decision = frontmatterValue(document, "decision");
      assert.ok(["pending", "accepted", "changes-requested", "rejected"].includes(decision));
      assert.equal(frontmatterValue(document, "gate_status"), decision === "pending" ? "open" : "closed");
      if (decision !== "pending") {
        assert.ok(![null, "pending"].includes(frontmatterValue(document, "reviewer")), "human reviewer is required");
        assert.ok(Number.isFinite(Date.parse(frontmatterValue(document, "reviewed_at"))), "review time is required");
      }
    }
    checkGate(gate);
    await assert.rejects(async () => checkGate(gate.replace(actualSpec, "0".repeat(64))), /gate Spec hash differs/);
  }
  return { acceptance: 12, failures: 9, sourceBindings: inputs.length, gateChecked: !checkSpecOnly };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await verifySpec({ checkSpecOnly: process.argv.includes("--check-spec") });
  console.log(`A01 Spec verification PASS: ${result.acceptance} acceptance criteria, ${result.failures} failure experiments, ${result.sourceBindings} input hashes, corruption probes; human gate ${result.gateChecked ? "hashes checked (no acceptance granted)" : "not checked in --check-spec mode"}.`);
}
