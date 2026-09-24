import assert from "node:assert/strict";
import test from "node:test";
import { assessCaseFollowUp } from "../db/case-outcome.mjs";
import { contentHash } from "../db/revenue-leak.mjs";
import { buildCaseFollowUpSql } from "../scripts/generate-case-follow-up-sql.mjs";

const workspaceId = "l14-workspace-a";
const caseId = "case-golden-mobile-checkout";
const responseId = `response-${caseId}-v1`;
const receipt = { workspaceId, responseId, checkedAt: "2026-09-15T10:00:00.000Z" };
const response = { workspaceId, caseId, id: responseId, measurement: { minimumStarts: 100 } };
const incidentMetrics = { observed: { conversionBps: 857 } };

function events() {
  const rows = [];
  for (let day = 16; day <= 22; day += 1) {
    const observedDay = `2026-09-${day}`;
    const completed = 3;
    for (const source of ["checkout_analytics", "payment_ledger"]) {
      const artifact = { workspaceId, id: `follow-up-${observedDay}-${source}`,
        caseId, responseId, source, segment: "mobile_safari", observedDay,
        starts: source === "checkout_analytics" ? 20 : 0,
        completed: source === "checkout_analytics" ? completed : 0,
        captures: source === "payment_ledger" ? completed : 0,
        revenueCents: source === "payment_ledger" ? completed * 5000 : 0 };
      rows.push({ ...artifact, truthMode: "FIXTURE", contentHash: contentHash(artifact),
        recordedAt: "2026-09-23T12:00:00.000Z" });
    }
  }
  return rows;
}

test("seven separately recorded days produce only a correlation label", () => {
  const result = assessCaseFollowUp(events(), receipt, response, incidentMetrics);
  assert.equal(result.status, "assessed");
  assert.equal(result.label, "correlated_only");
  assert.equal(result.starts, 140);
  assert.equal(result.completed, 21);
  assert.equal(result.revenueCents, 105000);
  assert.equal(result.conversionBps, 1500);
  assert.equal(result.changeBps, 643);
  assert.equal(result.eventIds.length, 14);
  assert.equal("recoveredRevenueCents" in result, false);
  assert.deepEqual(assessCaseFollowUp(events().reverse(), receipt, response, incidentMetrics), result);
});

test("missing receipt and incomplete or low-volume follow-up stay pending", () => {
  assert.equal(assessCaseFollowUp([], null, response, incidentMetrics).status, "awaiting_check");
  assert.throws(() => assessCaseFollowUp(events(), null, response, incidentMetrics));
  assert.equal(assessCaseFollowUp([], receipt, response, incidentMetrics).status, "awaiting_follow_up_events");
  assert.equal(assessCaseFollowUp(events().slice(0, 4), receipt, response, incidentMetrics).status, "collecting");
  const low = events().map((row) => row.source === "checkout_analytics"
    ? { ...row, starts: 10 } : row);
  low.forEach((row) => {
    const { truthMode, contentHash: hash, recordedAt, ...artifact } = row;
    void truthMode; void hash; void recordedAt;
    row.contentHash = contentHash(artifact);
  });
  assert.equal(assessCaseFollowUp(low, receipt, response, incidentMetrics).status, "insufficient_starts");
});

test("foreign, tampered, duplicated, pre-check and inconsistent observations fail closed", () => {
  for (const change of [
    (rows) => { rows[0].workspaceId = "foreign-workspace"; },
    (rows) => { rows[0].completed = 99; },
    (rows) => { rows[0].truthMode = "LIVE"; },
    (rows) => { rows[0].groundTruth = "bug"; },
    (rows) => { rows[0].observedDay = "2026-09-14"; },
    (rows) => { rows.push({ ...rows[0] }); },
    (rows) => {
      rows[1].captures = 2;
      const { truthMode, contentHash: hash, recordedAt, ...artifact } = rows[1];
      void truthMode; void hash; void recordedAt;
      rows[1].contentHash = contentHash(artifact);
    },
  ]) {
    const rows = events();
    change(rows);
    assert.throws(() => assessCaseFollowUp(rows, receipt, response, incidentMetrics));
  }
});

test("follow-up import is receipt-bound, repeatable and does not alter incident events", () => {
  const input = { receipt: { ...receipt, caseId, contentHash: "c".repeat(64) },
    events: events().map(({ truthMode, contentHash: hash, recordedAt, ...artifact }) => {
      void truthMode; void hash; void recordedAt;
      return artifact;
    }) };
  const sql = buildCaseFollowUpSql(input, "2026-09-23T12:00:00.000Z");
  assert.match(sql, /case_response_receipts receipt/);
  assert.match(sql, /receipt\.content_hash = 'c{64}'/);
  assert.match(sql, /on conflict do nothing/);
  assert.doesNotMatch(sql, /\b(delete|truncate|drop|update)\b/i);
  assert.throws(() => buildCaseFollowUpSql({ ...input, receipt: { ...input.receipt,
    contentHash: "wrong" } }, "2026-09-23T12:00:00.000Z"));
});
