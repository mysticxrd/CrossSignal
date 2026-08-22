import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { deriveFactoryState, evaluateSeal } from "./factory-state.mjs";
import { pathHash } from "./verify-kit.mjs";

test("normalizes text hashes while preserving directory path identity", async () => {
  const root = await mkdtemp(join(tmpdir(), "factory-hash-"));
  try {
    await mkdir(join(root, "one"));
    await mkdir(join(root, "two"));
    await writeFile(join(root, "one/value.md"), "alpha\r\nbeta\r\n");
    await writeFile(join(root, "two/value.md"), "alpha\nbeta\n");
    assert.equal(
      await pathHash(root, join(root, "one/value.md")),
      await pathHash(root, join(root, "two/value.md")),
    );
    assert.notEqual(await pathHash(root, join(root, "one")), await pathHash(root, join(root, "two")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("does not reactivate upstream stages for downstream-owned historical drift", async () => {
  const state = await deriveFactoryState({ includeGit: false });
  assert.deepEqual(state.stages.slice(0, -1).map((stage) => stage.status), [
    "complete", "complete", "complete", "complete",
  ]);
  assert.ok(state.stages.slice(0, -1).some((stage) => stage.historicalDrift.length > 0));
  assert.equal(state.activeStage, state.stages.at(-1).status === "complete" ? null : "05_ship");
  assert.equal(state.stages.at(-1).head, "fresh");
});

test("sealing requires both complete evidence and a clean commit", () => {
  const state = { stages: [{ status: "complete", head: "fresh" }] };
  assert.equal(evaluateSeal(state, { clean: true, head: "abc" }).sealed, true);
  const dirty = evaluateSeal(state, { clean: false, head: "abc" });
  assert.equal(dirty.sealed, false);
  assert.match(dirty.reasons.join("\n"), /not clean/);
});
