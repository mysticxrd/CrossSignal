import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { replayGrade, replaySteps, replayVerdict, verifyRun } from "../db/replay.mjs";
import { loadReplay, RUNS } from "../db/replays/index.mjs";

const projectRoot = new URL("../", import.meta.url);
const DEMO = "r_c72728d0a839";

function tampered(runId, sequence, edit) {
  const bundle = structuredClone(RUNS.get(runId));
  const row = bundle.history[sequence - 1];
  row.payload = edit(row.payload);
  return bundle;
}

test("every committed recording is listed, ends with a final row and verifies", async () => {
  const files = (await readdir(new URL("db/replays/", projectRoot))).filter((name) => name.endsWith(".json"));
  assert.deepEqual(files.map((name) => name.slice(0, -".json".length)).sort(), [...RUNS.keys()].sort());
  for (const [runId, bundle] of RUNS) {
    const check = verifyRun(bundle);
    assert.equal(check.ok, true, runId);
    assert.equal(check.head, bundle.history.at(-1).hash, runId);
    assert.equal(bundle.history.at(-1).kind, "terminal", runId);
    assert.equal(bundle.grade.runId, runId);
  }
});

test("changing one row breaks the chain at that row", () => {
  const edited = tampered(DEMO, 16, (payload) => JSON.stringify({ ...JSON.parse(payload), exposedEvidenceIds: [] }));
  assert.deepEqual({ ok: verifyRun(edited).ok, brokenAt: verifyRun(edited).brokenAt }, { ok: false, brokenAt: 16 });
  const malformed = tampered(DEMO, 9, (payload) => payload.slice(1));
  assert.equal(verifyRun(malformed).brokenAt, 9);
  const moved = structuredClone(RUNS.get(DEMO));
  moved.run.scope.runId = "r_000000000000";
  assert.equal(verifyRun(moved).brokenAt, 1, "the run id is inside every row's hash");
});

test("the demo run replays as three tool calls ending in a rollback a person must approve", () => {
  const steps = replaySteps(RUNS.get(DEMO));
  assert.deepEqual(steps.filter((step) => step.kind === "query").map((step) => step.tool),
    ["revenue.inspect", "revenue.inspect", "engineering.inspect"]);
  assert.deepEqual(steps.filter((step) => step.kind === "refused").map((step) => step.sequence), [11]);
  const end = steps.at(-1);
  assert.equal(end.kind, "finding");
  assert.equal(end.modelVersion, "gemini-3.5-flash-lite");
  const { kind, target, approvalRequired } = end.finding.recommendation;
  assert.deepEqual({ kind, target, approvalRequired }, { kind: "simulated_rollback", target: "checkout", approvalRequired: true });
});

test("the page lists every recorded run of the case, the 0/5 one included", () => {
  assert.deepEqual(loadReplay(DEMO).siblings.map((s) => `${s.runId} ${s.score}/${s.maxScore}`),
    ["r_5761937b157e 5/5", "r_fcb7e11ebcfa 0/5", "r_c72728d0a839 5/5"]);
});

test("a recording that does not verify shows only the rows before the break and hides its finding", () => {
  const intact = verifyRun(RUNS.get(DEMO));
  assert.deepEqual(replayVerdict(intact), { rows: 20, finding: "verified", notice: null });
  for (const sequence of [1, 9, 20]) {
    const verdict = replayVerdict(verifyRun(tampered(DEMO, sequence, (payload) => payload.slice(1))));
    assert.deepEqual({ rows: verdict.rows, finding: verdict.finding }, { rows: sequence - 1, finding: "hidden" }, `broken at ${sequence}`);
    assert.match(verdict.notice ?? "", new RegExp(`row ${sequence},`), "the notice names the broken row");
  }
});

test("the grade quotes the finding, so a broken recording hides both", () => {
  const bundle = RUNS.get(DEMO);
  const shown = replayGrade(bundle, replayVerdict(verifyRun(bundle)));
  assert.ok(shown.some((c) => /e_5e49e17f68aa/.test(c.got)), "the intact grade names the blamed change");
  const broken = tampered(DEMO, 20, (payload) => payload.slice(1));
  assert.equal(replayGrade(broken, replayVerdict(verifyRun(broken))), null);
});

test("a malformed tool call is labelled invalid, not denied by budget", () => {
  const bundle = structuredClone(RUNS.get(DEMO));
  const row = bundle.history.find((r) => r.kind === "tool_attempt");
  const payload = JSON.parse(row.payload);
  row.payload = JSON.stringify({ ...payload, query: null, invalid: true, budgetDenied: false });
  const budget = structuredClone(RUNS.get(DEMO));
  const budgetRow = budget.history.find((r) => r.kind === "tool_attempt");
  budgetRow.payload = JSON.stringify({ ...payload, budgetDenied: true });
  const first = (b) => replaySteps(b).find((step) => step.kind === "query").denied;
  assert.deepEqual([first(bundle), first(budget), first(RUNS.get(DEMO))], ["invalid", "budget", null]);
});

test("unknown and path-like run ids find nothing", () => {
  for (const runId of ["r_000000000000", "../../package", "__proto__", "constructor", ""]) assert.equal(loadReplay(runId), null, runId);
});

test("the replay route is public and read-only", async () => {
  const page = await readFile(new URL("app/runs/[runId]/page.tsx", projectRoot), "utf8");
  assert.doesNotMatch(page, /requireCrossSignalUser|getCrossSignalUser|"use server"|"use client"|dangerouslySetInnerHTML|onClick/);
  assert.match(page, /loadReplay\(runId\)/);
  assert.match(page, /if \(!replay\) notFound\(\)/);
});
