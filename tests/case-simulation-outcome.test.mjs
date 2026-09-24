import test from "node:test";
import assert from "node:assert/strict";
import { assessCaseSimulation } from "../db/case-simulation-outcome.mjs";
import { buildSimulatedCheckout } from "../supabase/functions/_shared/case-checkout.mjs";
import { contentHash } from "../db/revenue-leak.mjs";

const binding = ["l14-workspace-a", "case-golden-mobile-checkout", "response-test", "a".repeat(64)];
function row(scenario, n) {
  const artifact = buildSimulatedCheckout({ workspaceId: binding[0], caseId: binding[1],
    responseId: binding[2], proposalHash: binding[3],
    runId: `sim_00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    scenario, recordedBy: `sha256:${"b".repeat(64)}`, executedAt: `2026-09-25T12:00:0${n}.000Z` });
  return { artifact, contentHash: contentHash(artifact) };
}
const assess = rows => assessCaseSimulation(rows, ...binding);

test("simulation lifecycle requires both chosen scenarios, never closes the revenue Case", () => {
  assert.equal(assess([]).status, "awaiting_runs");
  assert.equal(assess([row("capture", 1)]).status, "in_progress");
  assert.equal(assess([row("decline", 1)]).status, "in_progress");
  assert.equal(assess([row("capture", 1), row("capture", 2)]).status, "in_progress");
  const result = assess([row("capture", 1), row("decline", 2), row("decline", 3)]);
  assert.equal(result.status, "verified");
  assert.deepEqual(result.transitions.map(t => [t.from, t.to]),
    [["awaiting_runs", "in_progress"], ["in_progress", "verified"], ["verified", "verified"]]);
  assert.equal(result.caseResolution, "unresolved");
  assert.equal(result.actualChargedCents, 0);
  assert.equal(result.deviceVerification, "pending");
  assert.equal(result.businessOutcome, "not_measured");
});

test("assessment is stable across reload/order and binds every run hash and trace", () => {
  const rows = [row("decline", 1), row("capture", 2)];
  const result = assess(rows);
  assert.deepEqual(assess(JSON.parse(JSON.stringify(rows)).reverse()), result);
  assert.equal(result.transitions[1].runHash, rows[1].contentHash);
  assert.deepEqual(result.transitions[1].eventIds, rows[1].artifact.events.map(e => e.id));
  const { contentHash: hash, ...artifact } = result;
  assert.equal(hash, contentHash(artifact));
  assert.notEqual(assess([...rows, row("capture", 3)]).contentHash, hash);
});

test("assessment fails closed on foreign, duplicated, or tampered records", () => {
  for (const change of [a => { a.workspaceId = "foreign"; }, a => { a.caseId = "foreign"; },
    a => { a.proposalHash = "c".repeat(64); }, a => { a.captureStatus = "simulated_captured"; },
    a => { a.events.pop(); }, a => { a.groundTruth = "fixed"; }]) {
    const saved = row("decline", 1); change(saved.artifact);
    saved.contentHash = contentHash(saved.artifact);
    assert.throws(() => assess([saved]));
  }
  const saved = row("capture", 1);
  assert.throws(() => assess([saved, saved]));
});
