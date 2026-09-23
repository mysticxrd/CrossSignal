import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  investigatePersistedCase, validatePersistedCaseSnapshot, verifyInvestigation,
} from "../db/case-investigator.mjs";
import {
  buildGoldenEvents, contentHash, detectRevenueLeak, GOLDEN_SCENARIO,
} from "../db/revenue-leak.mjs";

function fixtureSnapshot() {
  const { caseRecord, signal, evidence, events } = detectRevenueLeak(GOLDEN_SCENARIO, buildGoldenEvents());
  return {
    caseRow: {
      workspaceId: caseRecord.workspaceId, id: caseRecord.id,
      scenarioId: caseRecord.scenarioId, scenarioVersion: caseRecord.scenarioVersion,
      scenarioHash: contentHash(GOLDEN_SCENARIO), title: caseRecord.title,
      status: caseRecord.status, truthMode: caseRecord.truthMode,
      contentHash: contentHash(caseRecord),
    },
    signalRow: {
      workspaceId: signal.workspaceId, id: signal.id, caseId: signal.caseId,
      kind: signal.kind, methodVersion: signal.methodVersion, detected: signal.detected,
      metrics: signal.metrics, contentHash: contentHash(signal),
    },
    evidenceRows: evidence.map((item) => ({
      workspaceId: item.workspaceId, id: item.id, caseId: item.caseId,
      source: item.source, relation: item.relation, claim: item.claim,
      truthMode: item.truthMode, contentHash: contentHash(item),
    })),
    eventRows: events.map((item) => ({ ...item, truthMode: "FIXTURE", contentHash: contentHash(item) })),
    citationRows: evidence.flatMap((item) => item.eventIds.map((eventId) => ({
      workspaceId: item.workspaceId, evidenceId: item.id, eventId,
    }))),
  };
}

test("Investigator reads only the verified Case, raw events, and citations", () => {
  const snapshot = fixtureSnapshot();
  const result = investigatePersistedCase(snapshot);
  assert.equal(result.status, "ready_for_review");
  assert.equal(result.truthMode, "FIXTURE");
  assert.equal(result.assessment, "targeted_drop_supported_cause_unconfirmed");
  assert.deepEqual(result.claims.map((claim) => claim.relation), ["supports", "supports", "contradicts"]);
  assert.deepEqual(result.claims.map((claim) => claim.eventIds.length), [14, 14, 14]);
  assert.match(result.summary, /cause is unconfirmed/);
  assert.match(result.claims[0].finding, /20\.00% to 8\.57%/);
  assert.match(result.claims[1].finding, /\$800\.00/);
  assert.equal(verifyInvestigation(snapshot, result), result);
});

test("event and row order do not change the investigation, and JSON save/reload verifies", () => {
  const snapshot = fixtureSnapshot();
  const reordered = structuredClone(snapshot);
  reordered.eventRows.reverse();
  reordered.evidenceRows.reverse();
  reordered.citationRows.reverse();
  const original = investigatePersistedCase(snapshot);
  const replayed = investigatePersistedCase(reordered);
  assert.deepEqual(replayed, original);
  assert.deepEqual(verifyInvestigation(JSON.parse(JSON.stringify(snapshot)),
    JSON.parse(JSON.stringify(original))), original);
});

test("tenant, truth, data, and citation tampering fail closed", () => {
  const base = fixtureSnapshot();
  for (const mutate of [
    (s) => { s.caseRow.workspaceId = "phase1-golden-b"; },
    (s) => { s.eventRows[0].truthMode = "LIVE"; },
    (s) => { s.eventRows[0].starts = 21; },
    (s) => { s.eventRows.pop(); },
    (s) => { s.signalRow.metrics.projectedLeakCents = 1; },
    (s) => { s.evidenceRows[0].relation = "contradicts"; },
    (s) => { s.citationRows[0].workspaceId = "phase1-golden-b"; },
    (s) => { s.citationRows.pop(); },
    (s) => { s.groundTruth = { expectedDetection: true }; },
  ]) {
    const snapshot = structuredClone(base);
    mutate(snapshot);
    assert.throws(() => validatePersistedCaseSnapshot(snapshot));
  }
  const altered = investigatePersistedCase(base);
  altered.claims[0].eventIds.pop();
  assert.throws(() => verifyInvestigation(base, altered), /differs/);
});

test("persisted setup SQL matches the bounded report without evaluator answers or destructive steps", () => {
  const artifact = investigatePersistedCase(fixtureSnapshot());
  const sql = readFileSync(fileURLToPath(new URL("../supabase/scenarios/golden_investigation.sql", import.meta.url)), "utf8");
  assert.match(sql, new RegExp(contentHash(artifact)));
  assert.match(sql, /on conflict do nothing/g);
  assert.match(sql, /investigation citations differ from verified evidence/);
  assert.doesNotMatch(sql, /groundTruth|expectedDetection|\b(delete|truncate|drop)\s+(from|table)\b/i);
});
