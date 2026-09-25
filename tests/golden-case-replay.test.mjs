import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const root = new URL("../", import.meta.url);
function run(script, args = []) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: root, encoding: "utf8", maxBuffer: 4 * 1024 * 1024,
  });
}

test("fresh offline product replays are identical and the separate grader accepts them", () => {
  const first = run("scripts/golden-case-replay.mjs");
  const second = run("scripts/golden-case-replay.mjs");
  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(first.stdout, second.stdout);
  const path = join(tmpdir(), `crosssignal-golden-replay-${randomUUID()}.json`);
  try {
    writeFileSync(path, first.stdout);
    const graded = run("tests/evaluator/grade-golden-case.mjs", [path]);
    assert.equal(graded.status, 0, graded.stderr);
    assert.match(graded.stdout, /Local golden-Case replay — PASS/);
    const original = JSON.parse(first.stdout);
    for (const mutate of [
      (a) => { a.detection.signal.metrics.projectedLeakCents = 0; },
      (a) => { a.snapshot.citationRows.pop(); },
      (a) => { a.decision.simulationOutcome.status = "verified_anyway"; },
      (a) => { a.failures[0].outcome = "accepted"; },
    ]) {
      const changed = structuredClone(original);
      mutate(changed);
      writeFileSync(path, JSON.stringify(changed));
      assert.notEqual(run("tests/evaluator/grade-golden-case.mjs", [path]).status, 0);
    }
  } finally {
    unlinkSync(path);
  }
});
