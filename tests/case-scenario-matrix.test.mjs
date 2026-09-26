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
    cwd: root, encoding: "utf8", maxBuffer: 8 * 1024 * 1024,
  });
}

test("counterfactual replay is repeatable and hidden grader rejects altered labels, metrics, and traces", () => {
  const first = run("scripts/case-scenario-matrix.mjs");
  const second = run("scripts/case-scenario-matrix.mjs");
  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(first.stdout, second.stdout);
  const path = join(tmpdir(), `crosssignal-matrix-${randomUUID()}.json`);
  try {
    writeFileSync(path, first.stdout);
    const graded = run("tests/evaluator/grade-case-scenario-matrix.mjs", [path]);
    assert.equal(graded.status, 0, graded.stderr);
    assert.match(graded.stdout, /Local Case scenario matrix — PASS/);
    const original = JSON.parse(first.stdout);
    for (const mutate of [
      (a) => { a.cases[0].observation.detected = false; },
      (a) => { a.cases[1].observation.metrics.relativeDropBps = 5714; },
      (a) => { a.cases[0].observation.evidence[0].eventIds.pop(); },
      (a) => { a.cases.at(-1).observation.kind = "derived"; },
    ]) {
      const changed = structuredClone(original);
      mutate(changed);
      writeFileSync(path, JSON.stringify(changed));
      assert.notEqual(run("tests/evaluator/grade-case-scenario-matrix.mjs", [path]).status, 0);
    }
  } finally {
    unlinkSync(path);
  }
});
