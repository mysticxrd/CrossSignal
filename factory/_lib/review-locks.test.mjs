import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { deriveFactoryState } from "./factory-state.mjs";
import { checksHash, fileHash } from "./verify-kit.mjs";
import { strictFailure } from "../status.mjs";

async function accepted(root, name, { review = false, verdict = "pass", next = "" } = {}) {
  const stage = join(root, "factory", name), output = join(stage, "output");
  await mkdir(output, { recursive: true });
  await writeFile(join(stage, "CONTEXT.md"), "## Outputs\n- `output/PRIMARY.md`\n" + (review ? "- `output/REVIEW.md`\n" : "") + "- `output/VERIFY.md`\n- `output/HUMAN_GATE.md`\n");
  await writeFile(join(output, "PRIMARY.md"), "## Declared input hashes\n\nReview this evidence.\n");
  await writeFile(join(output, "VERIFY.md"), "status: passed\n");
  if (review) await writeFile(join(output, "REVIEW.md"), `reviewer: fresh-context\nprimary_sha256: ${await fileHash(root, join(output, "PRIMARY.md"))}\nverdict: ${verdict}\n\n## Findings\nNone.\n`);
  await bindGate(root, name, { review, next });
}

async function bindGate(root, name, { review = false, next = "" } = {}) {
  const output = join(root, "factory", name, "output");
  await writeFile(join(output, "HUMAN_GATE.md"), `gate_status: closed\ndecision: accepted\nprimary_sha256: ${await fileHash(root, join(output, "PRIMARY.md"))}\nverification_sha256: ${await fileHash(root, join(output, "VERIFY.md"))}\n` + (review ? `review_sha256: ${await fileHash(root, join(output, "REVIEW.md"))}\n` : "") + (next ? `next_checks_sha256: ${next}\n` : ""));
}

async function temporary(body) {
  const root = await mkdtemp(join(tmpdir(), "factory-review-"));
  try { await body(root); } finally {
    assert.equal(dirname(resolve(root)), resolve(tmpdir()));
    assert.ok(root.startsWith(join(tmpdir(), "factory-review-")));
    await rm(root, { recursive: true });
  }
}

test("a listed review must pass, bind the current primary and be bound by the gate", async () => temporary(async (root) => {
  await accepted(root, "01_spec", { review: true });
  assert.equal((await deriveFactoryState({ projectRoot: root, includeGit: false })).stages[0].status, "complete");
  const output = join(root, "factory/01_spec/output");
  await writeFile(join(output, "PRIMARY.md"), "## Declared input hashes\n\nEdited evidence.\n");
  await bindGate(root, "01_spec", { review: true });
  let state = await deriveFactoryState({ projectRoot: root, includeGit: false });
  assert.match(state.stages[0].reasons.join("\n"), /REVIEW.md does not bind/);
  await accepted(root, "01_spec", { review: true, verdict: "changes-requested" });
  state = await deriveFactoryState({ projectRoot: root, includeGit: false });
  assert.match(state.stages[0].reasons.join("\n"), /REVIEW.md has not passed/);
  await accepted(root, "01_spec", { review: true });
  const review = await readFile(join(output, "REVIEW.md"), "utf8");
  await writeFile(join(output, "REVIEW.md"), review.replace("fresh-context", "builder"));
  await bindGate(root, "01_spec", { review: true });
  state = await deriveFactoryState({ projectRoot: root, includeGit: false });
  assert.match(state.stages[0].reasons.join("\n"), /fresh-context reviewer/);
  await writeFile(join(output, "REVIEW.md"), review);
  state = await deriveFactoryState({ projectRoot: root, includeGit: false });
  assert.match(state.stages[0].reasons.join("\n"), /human gate does not bind current REVIEW.md/);
  await rm(join(output, "REVIEW.md"));
  state = await deriveFactoryState({ projectRoot: root, includeGit: false });
  assert.match(state.stages[0].reasons.join("\n"), /missing outputs: REVIEW.md/);
}));

test("check hashes normalize text, bind sorted paths and ignore output only", async () => temporary(async (root) => {
  await mkdir(join(root, "checks/nested"), { recursive: true });
  await mkdir(join(root, "checks/output"));
  await writeFile(join(root, "checks/z.md"), "alpha\r\nbeta\r\n");
  await writeFile(join(root, "checks/nested/a.bin"), Buffer.from([13, 10]));
  const before = await checksHash(join(root, "checks"));
  await writeFile(join(root, "checks/z.md"), "alpha\nbeta\n");
  await writeFile(join(root, "checks/output/ignored.md"), "output changed\n");
  assert.equal(await checksHash(join(root, "checks")), before);
  await rename(join(root, "checks/z.md"), join(root, "checks/a.md"));
  assert.notEqual(await checksHash(join(root, "checks")), before);
  const renamed = await checksHash(join(root, "checks"));
  await writeFile(join(root, "checks/nested/a.bin"), Buffer.from([10]));
  assert.notEqual(await checksHash(join(root, "checks")), renamed);
}));

test("previous-gate locks prevent completion; legacy and ordinary incompleteness do not fail strict", async () => temporary(async (root) => {
  await accepted(root, "01_spec"); await accepted(root, "02_data");
  let state = await deriveFactoryState({ projectRoot: root, includeGit: false });
  assert.deepEqual(state.stages.map((stage) => stage.checks), ["unlocked", "unlocked"]);
  const hash = await checksHash(join(root, "factory/02_data"));
  await bindGate(root, "01_spec", { next: hash });
  state = await deriveFactoryState({ projectRoot: root, includeGit: false });
  assert.equal(state.stages[1].checks, "locked");
  assert.equal(state.stages[1].status, "complete");
  await writeFile(join(root, "factory/02_data/check.mjs"), "export const changed = true;\n");
  state = await deriveFactoryState({ projectRoot: root, includeGit: false });
  assert.equal(state.stages[0].status, "complete");
  assert.equal(state.stages[1].checks, "changed");
  assert.notEqual(state.stages[1].status, "complete");
  assert.equal(strictFailure(state), true);
  for (const status of ["in-progress", "never-run", "stale", "blocked"]) {
    assert.equal(strictFailure({ stages: [{ status, checks: "unlocked" }], budgets: { breaches: [] } }), false);
  }
  assert.equal(strictFailure({ stages: [], budgets: { breaches: ["too large"] } }), true);
}));
