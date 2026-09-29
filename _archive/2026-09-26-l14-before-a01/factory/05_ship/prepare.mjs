import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "../..");
const read = (path) => readFile(resolve(projectRoot, path), "utf8");
const value = (markdown, key) => {
  const line = markdown.split(/\r?\n/).find((entry) => entry.startsWith(`${key}:`));
  assert.ok(line, `missing ${key}`);
  return line.slice(key.length + 1).trim();
};

const [previousGate, manifest, demo, verification, humanGate] = await Promise.all([
  read("factory/04_verify/output/HUMAN_GATE.md"),
  read("factory/05_ship/output/RELEASE_MANIFEST.md"),
  read("factory/05_ship/output/DEMO_SCRIPT.md"),
  read("factory/05_ship/output/VERIFY.md"),
  read("factory/05_ship/output/HUMAN_GATE.md"),
]);

assert.equal(value(previousGate, "decision"), "accepted");
assert.equal(value(manifest, "truth_mode"), "TEST");
assert.equal(value(humanGate, "stage"), "05_ship");

console.log("Stage 05 cold-review package prepared.");
console.log(`Product head: ${value(manifest, "product_head")}`);
console.log("Review: factory/05_ship/output/RELEASE_MANIFEST.md");
console.log("Runbook: factory/05_ship/output/DEMO_SCRIPT.md");
console.log("Evidence: factory/05_ship/output/VERIFY.md");
