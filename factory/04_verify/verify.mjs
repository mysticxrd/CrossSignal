import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "../..");
const fromRoot = (path) => resolve(projectRoot, path);
const read = (path) => readFile(fromRoot(path), "utf8");
const normalize = (value) => value.replace(/\r\n/g, "\n");
const hash = async (path) =>
  createHash("sha256").update(normalize(await read(path))).digest("hex");

function frontmatterValue(markdown, key) {
  const match = normalize(markdown).match(/^---\n([\s\S]*?)\n---/);
  assert.ok(match, "missing frontmatter");
  const line = match[1].split("\n").find((entry) => entry.startsWith(`${key}:`));
  assert.ok(line, `missing frontmatter key ${key}`);
  return line.slice(key.length + 1).trim();
}

function hashBindings(markdown) {
  return [...normalize(markdown).matchAll(/^\| `([^`]+)` \| `([a-f0-9]{64})` \|$/gm)]
    .map((match) => ({ path: match[1], expected: match[2] }));
}

const [previousGate, report, verification, humanGate] = await Promise.all([
  read("factory/03_build/output/HUMAN_GATE.md"),
  read("factory/04_verify/output/VERIFICATION_REPORT.md"),
  read("factory/04_verify/output/VERIFY.md"),
  read("factory/04_verify/output/HUMAN_GATE.md"),
]);

assert.equal(frontmatterValue(previousGate, "gate_status"), "closed");
assert.equal(frontmatterValue(previousGate, "decision"), "accepted");

assert.equal(frontmatterValue(report, "stage"), "04_verify");
assert.equal(frontmatterValue(report, "status"), "proposed");
assert.equal(frontmatterValue(report, "verdict"), "passed-with-limitations");
assert.match(report, /2 workspaces, 2 workspace members, 2 traces, and 77 events/);
assert.match(report, /tenant A.*28.*foreign.*0/is);
assert.match(report, /tenant B.*49.*foreign.*0/is);
assert.match(report, /visible_without_context.*0/);
assert.match(report, /all_select_granted.*true/);
assert.match(report, /any_insert_granted.*false/);
assert.match(report, /any_update_granted.*false/);
assert.match(report, /any_delete_granted.*false/);
assert.match(report, /zero security advisories/i);
assert.match(report, /five.*Unused Index.*INFO/is);
assert.match(report, /migration ledger is empty/i);
assert.match(report, /D1 remains the rollback path/i);
assert.match(report, /no persistent.*credential/is);
assert.doesNotMatch(report, /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@/i, "connection secret leaked into report");

const bindings = hashBindings(report);
assert.equal(bindings.length, 5, "verification report must bind exactly the five declared inputs");
for (const { path, expected } of bindings) {
  assert.equal(await hash(path), expected, `hash drifted for ${path}`);
}

assert.equal(frontmatterValue(verification, "status"), "passed");
assert.match(verification, /63 tests passed/);
assert.match(verification, /Lint.*Exit code: `0`/s);
assert.match(verification, /Production build.*Exit code: `0`/s);
assert.match(verification, /Supabase connector.*Exit code: `0`/s);
assert.match(verification, /git diff --check.*Exit code: `0`/s);

const releaseGateStatus = frontmatterValue(humanGate, "gate_status");
const releaseGateDecision = frontmatterValue(humanGate, "decision");
assert.ok(
  (releaseGateStatus === "open" && releaseGateDecision === "pending") ||
    (releaseGateStatus === "closed" && releaseGateDecision === "accepted"),
  "Stage 04 gate must be open for review or closed with acceptance",
);
assert.equal(
  frontmatterValue(humanGate, "verification_report_sha256"),
  await hash("factory/04_verify/output/VERIFICATION_REPORT.md"),
);
assert.equal(
  frontmatterValue(humanGate, "verification_sha256"),
  await hash("factory/04_verify/output/VERIFY.md"),
);

console.log("Stage 04 release verification passed.");
