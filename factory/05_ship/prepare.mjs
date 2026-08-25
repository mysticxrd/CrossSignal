import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { deriveFactoryState } from "../_lib/factory-state.mjs";
import { fileHash, frontmatterValue } from "../_lib/verify-kit.mjs";
import { validateL04Fixture } from "../../tests/fixtures/l04-authority-trace.fixture.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const gatePath = join(projectRoot, "factory/04_verify/output/HUMAN_GATE.md");
const reportPath = join(projectRoot, "factory/04_verify/output/VERIFICATION_REPORT.md");
const verifyPath = join(projectRoot, "factory/04_verify/output/VERIFY.md");

const gate = await readFile(gatePath, "utf8");
assert.equal(frontmatterValue(gate, "gate_status"), "closed");
assert.equal(frontmatterValue(gate, "decision"), "accepted");
assert.equal(frontmatterValue(gate, "verification_report_sha256"), await fileHash(projectRoot, reportPath));
assert.equal(frontmatterValue(gate, "verification_sha256"), await fileHash(projectRoot, verifyPath));
assert.deepEqual(validateL04Fixture(), []);

const state = await deriveFactoryState({ projectRoot, includeGit: false });
assert.ok(
  state.activeStage === "05_ship" || state.activeStage === null,
  `unexpected active stage: ${state.activeStage}`,
);
assert.deepEqual(state.stages.slice(0, 4).map((stage) => stage.status), [
  "complete",
  "complete",
  "complete",
  "complete",
]);
if (state.activeStage === null) assert.equal(state.stages[4].status, "complete");

console.log("L04 cold release preparation passed.");
console.log("Accepted verification: Stage 04");
console.log("Truth: persisted FIXTURE evidence; TEST effect adapter; no LIVE provider claim");
console.log("Review: factory/05_ship/output/DEMO_SCRIPT.md");
console.log("Verify: node factory/05_ship/verify.mjs");
