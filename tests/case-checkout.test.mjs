import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { buildSimulatedCheckout, canonicalCheckout, CHECKOUT_LIMIT } from "../supabase/functions/_shared/case-checkout.mjs";
import { verifySimulatedCheckouts } from "../db/case-checkout.mjs";
import { contentHash } from "../db/revenue-leak.mjs";

const input = { workspaceId: "l14-workspace-a", caseId: "case-golden-mobile-checkout",
  responseId: "response-test", proposalHash: "a".repeat(64), runId: `sim_${randomUUID()}`,
  scenario: "capture", recordedBy: `sha256:${"b".repeat(64)}`, executedAt: "2026-09-24T12:00:00.000Z" };
function rows(artifact = buildSimulatedCheckout(input)) { return [{ artifact, contentHash: contentHash(artifact) }]; }
function verify(data) { return verifySimulatedCheckouts(data, input.workspaceId, input.caseId, input.responseId, input.proposalHash); }

test("capture and decline are deterministic simulations with unique trace references and zero charge", () => {
  for (const scenario of ["capture", "decline"]) {
    const a = buildSimulatedCheckout({ ...input, scenario });
    assert.deepEqual(a, buildSimulatedCheckout({ ...input, scenario }));
    assert.equal(a.captureStatus, scenario === "capture" ? "simulated_captured" : "simulated_declined");
    assert.equal(a.chargedCents, 0);
    assert.equal(a.truthMode, "SIMULATED");
    assert.equal(a.businessOutcome, "not_measured");
    assert.equal(a.deviceVerification, "pending");
    assert.equal(new Set(a.events.map(e => e.id)).size, 3);
    assert.deepEqual(a.events.map(e => e.sequence), [1, 2, 3]);
  }
  const second = buildSimulatedCheckout({ ...input, runId: `sim_${randomUUID()}` });
  assert.notEqual(second.runId, input.runId);
  assert.equal(second.events.some(e => buildSimulatedCheckout(input).events.some(old => e.id === old.id)), false);
  assert.equal(canonicalCheckout({ z: 1, a: [2] }), '{"a":[2],"z":1}');
});

test("invalid checkout input cannot introduce real modes, arbitrary amounts, or evaluator data", () => {
  for (const patch of [{ scenario: "real" }, { runId: "old-trial-reference" }, { executedAt: "2026-02-30T12:00:00.000Z" },
    { recordedBy: "owner" }, { workspaceId: "" }, { proposalHash: "wrong" }, { amount: 100 },
    { truthMode: "LIVE" }, { groundTruth: "expected answer" }]) {
    assert.throws(() => buildSimulatedCheckout({ ...input, ...patch }));
  }
});

test("saved simulations survive reload; changed tenant, result, trace, hash and duplicates fail closed", () => {
  const saved = rows();
  assert.equal(verify(JSON.parse(JSON.stringify(saved)))[0].runId, input.runId);
  for (const change of [a => { a.workspaceId = "foreign"; }, a => { a.caseId = "foreign"; },
    a => { a.proposalHash = "c".repeat(64); }, a => { a.captureStatus = "captured"; },
    a => { a.chargedCents = 5000; }, a => { a.deviceVerification = "verified"; },
    a => { a.events[1].id = "unrelated-event"; }, a => { a.businessOutcome = "recovered"; },
    a => { a.groundTruth = {}; }]) {
    const data = rows(); change(data[0].artifact); data[0].contentHash = contentHash(data[0].artifact);
    assert.throws(() => verify(data));
  }
  assert.throws(() => verify([{ ...saved[0], contentHash: "0".repeat(64) }]));
  assert.throws(() => verify([saved[0], saved[0]]));
  assert.throws(() => verify(Array.from({ length: CHECKOUT_LIMIT + 1 }, () => saved[0])));
});
