import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
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

const [previousGate, manifest, demo, verification, humanGate] = await Promise.all([
  read("factory/04_verify/output/HUMAN_GATE.md"),
  read("factory/05_ship/output/RELEASE_MANIFEST.md"),
  read("factory/05_ship/output/DEMO_SCRIPT.md"),
  read("factory/05_ship/output/VERIFY.md"),
  read("factory/05_ship/output/HUMAN_GATE.md"),
]);

assert.equal(frontmatterValue(previousGate, "gate_status"), "closed");
assert.equal(frontmatterValue(previousGate, "decision"), "accepted");

assert.equal(frontmatterValue(manifest, "stage"), "05_ship");
assert.equal(frontmatterValue(manifest, "status"), "proposed");
assert.equal(frontmatterValue(manifest, "truth_mode"), "TEST");
assert.equal(frontmatterValue(manifest, "release_verdict"), "passed-with-limitations");
const productHead = frontmatterValue(manifest, "product_head");
assert.match(productHead, /^[a-f0-9]{40}$/);
const commitCheck = spawnSync("git", ["cat-file", "-e", `${productHead}^{commit}`], {
  cwd: projectRoot,
  encoding: "utf8",
});
assert.equal(commitCheck.status, 0, "bound product head is not a local commit");
assert.match(manifest, /D1 remains the rollback path/);
assert.match(manifest, /migration ledger.*empty/is);
assert.match(manifest, /no\s+persistent.*credential/is);
assert.match(manifest, /not deployed/i);
assert.doesNotMatch(manifest, /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@/i, "connection secret leaked into manifest");

const bindings = hashBindings(manifest);
assert.equal(bindings.length, 5, "release manifest must bind exactly the five declared inputs");
for (const { path, expected } of bindings) {
  assert.equal(await hash(path), expected, `hash drifted for ${path}`);
}

for (const command of ["npm ci", "npm run verify:build", "npm run verify:release", "npm run verify:ship", "npm run build"]) {
  assert.match(demo, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}
assert.match(demo, /TEST/g);
assert.match(demo, /28.*49/s);
assert.match(demo, /five.*Unused\s+Index.*INFO/is);
assert.match(demo, /migration ledger.*empty/is);
assert.match(demo, /D1 remains/i);

assert.equal(frontmatterValue(verification, "status"), "passed");
assert.match(verification, /verify:build.*Exit code: `0`/s);
assert.match(verification, /verify:release.*Exit code: `0`/s);
assert.match(verification, /demo:prepare.*Exit code: `0`/s);
assert.match(verification, /verify:ship.*Exit code: `0`/s);
assert.match(verification, /git diff --check.*Exit code: `0`/s);

const shipGateStatus = frontmatterValue(humanGate, "gate_status");
const shipGateDecision = frontmatterValue(humanGate, "decision");
assert.ok(
  (shipGateStatus === "open" && shipGateDecision === "pending") ||
    (shipGateStatus === "closed" && shipGateDecision === "accepted"),
  "Stage 05 gate must be open for review or closed with acceptance",
);
assert.equal(
  frontmatterValue(humanGate, "release_manifest_sha256"),
  await hash("factory/05_ship/output/RELEASE_MANIFEST.md"),
);
assert.equal(
  frontmatterValue(humanGate, "demo_script_sha256"),
  await hash("factory/05_ship/output/DEMO_SCRIPT.md"),
);
assert.equal(
  frontmatterValue(humanGate, "verification_sha256"),
  await hash("factory/05_ship/output/VERIFY.md"),
);

console.log("Stage 05 release verification passed.");
