import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { digest } from "../db/benchmark/contracts.mjs";
import { attestationsOf, parseOts, sha256 } from "../db/ots.mjs";
import { checkStamp, replayGrade, replaySteps, replayVerdict, verifyRun } from "../db/replay.mjs";
import { loadReplay, RUNS, STAMPS } from "../db/replays/index.mjs";

const projectRoot = new URL("../", import.meta.url);
const DEMO = "r_c72728d0a839";

const verdictOf = (bundle) => replayVerdict(verifyRun(bundle), checkStamp(bundle, STAMPS[bundle.run.scope.runId]));

function tampered(runId, sequence, edit) {
  const bundle = structuredClone(RUNS.get(runId));
  const row = bundle.history[sequence - 1];
  row.payload = edit(row.payload);
  return bundle;
}

test("every committed recording is listed, ends with a final row and verifies", async () => {
  const files = (await readdir(new URL("db/replays/", projectRoot))).filter((name) => /^r_[0-9a-f]{12}.json$/.test(name));
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
  assert.equal(intact.ok, true);
  assert.deepEqual(verdictOf(RUNS.get(DEMO)), { rows: 20, finding: "verified", notice: null });
  for (const sequence of [1, 9, 20]) {
    const verdict = verdictOf(tampered(DEMO, sequence, (payload) => payload.slice(1)));
    assert.deepEqual({ rows: verdict.rows, finding: verdict.finding }, { rows: sequence - 1, finding: "hidden" }, `broken at ${sequence}`);
    assert.match(verdict.notice ?? "", new RegExp(`row ${sequence},`), "the notice names the broken row");
  }
});

test("the grade quotes the finding, so a broken recording hides both", () => {
  const bundle = RUNS.get(DEMO);
  const shown = replayGrade(bundle, verdictOf(bundle));
  assert.ok(shown.some((c) => /e_5e49e17f68aa/.test(c.got)), "the intact grade names the blamed change");
  const broken = tampered(DEMO, 20, (payload) => payload.slice(1));
  assert.equal(replayGrade(broken, verdictOf(broken)), null);
});

test("every recording has an OpenTimestamps proof of its exact bytes, and stamps.json describes that proof", () => {
  assert.deepEqual(Object.keys(STAMPS).sort(), [...RUNS.keys()].sort());
  for (const runId of RUNS.keys()) {
    const bytes = readFileSync(new URL(`db/replays/${runId}.json`, projectRoot));
    const proof = parseOts(readFileSync(new URL(`db/replays/${runId}.json.ots`, projectRoot)));
    assert.ok(proof.digest.equals(sha256(bytes)), `${runId}: the proof is for these bytes`);
    assert.equal(STAMPS[runId].sha256, proof.digest.toString("hex"), runId);
    const found = attestationsOf(proof.digest, proof.tree);
    assert.deepEqual(STAMPS[runId].calendars.toSorted(), found.filter((a) => a.kind === "pending").map((a) => a.uri).toSorted(), runId);
    const heights = found.filter((a) => a.kind === "bitcoin").map((a) => a.height);
    assert.equal(STAMPS[runId].bitcoin?.height ?? null, heights.length ? Math.min(...heights) : null, runId);
    // The page hashes its imported copy, so that copy must hash like the file.
    const stamped = loadReplay(runId).stamped;
    assert.equal(stamped.sha256, proof.digest.toString("hex"), runId);
    assert.ok(["pending", "anchored"].includes(stamped.state), runId);
  }
});

// The attack the chain alone cannot see: edit a row, then recompute every hash after it.
function rechained(bundle) {
  const scope = bundle.run.scope;
  let previousHash = "0".repeat(64);
  for (const row of bundle.history) {
    row.previous_hash = previousHash;
    row.hash = digest({ scope, sequence: row.sequence, kind: row.kind, payload: JSON.parse(row.payload), previousHash });
    previousHash = row.hash;
  }
  return bundle;
}

test("a recording rewritten with a fresh chain still loses its finding, because its bytes no longer match the stamp", () => {
  const terminal = RUNS.get(DEMO).history.length;
  const forged = rechained(tampered(DEMO, terminal, (payload) => payload.replace("simulated_rollback", "no_action")));
  assert.equal(verifyRun(forged).ok, true, "the chain alone calls the forgery intact");
  const stamped = checkStamp(forged, STAMPS[DEMO]);
  assert.equal(stamped.state, "changed");
  const verdict = replayVerdict(verifyRun(forged), stamped);
  assert.equal(verdict.finding, "hidden");
  assert.match(verdict.notice, /changed after it was timestamped on 2026-/);
  assert.equal(replayGrade(forged, verdict), null);
});

test("a recording without a stamp shows its steps but not its finding", () => {
  const bundle = RUNS.get(DEMO);
  const verdict = replayVerdict(verifyRun(bundle), checkStamp(bundle, undefined));
  assert.deepEqual({ rows: verdict.rows, finding: verdict.finding }, { rows: 20, finding: "hidden" });
  assert.match(verdict.notice, /no timestamp/);
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
