import { verifyInvestigation } from "./case-investigator.mjs";
import { contentHash, GOLDEN_SCENARIO } from "./revenue-leak.mjs";

// The UI accepts only a fully verified, persisted FIXTURE Case. The response
// contains no evaluator ground truth, action intent, authority, or outcome.
export function projectCaseDecision(payload, workspaceId, caseId = GOLDEN_SCENARIO.caseId) {
  if (!payload || payload.kind !== "found" || !payload.snapshot
    || !payload.investigation || !Array.isArray(payload.investigationCitations)) {
    throw new TypeError("Case decision response is incomplete");
  }
  const scenario = { ...GOLDEN_SCENARIO, workspaceId };
  if (payload.snapshot.caseRow?.id !== caseId) throw new TypeError("Case identifier differs");
  const report = verifyInvestigation(payload.snapshot, payload.investigation, scenario);
  if (payload.investigationHash !== contentHash(report)) {
    throw new TypeError("Investigation hash differs");
  }
  const expectedRefs = report.claims.flatMap((claim) => claim.eventIds.map((eventId) => ({
    workspaceId, investigationId: report.id, claimId: claim.id,
    evidenceId: claim.evidenceId, eventId,
  })));
  const key = (row) => `${row.claimId}/${row.evidenceId}/${row.eventId}`;
  const sort = (rows) => [...rows].sort((a, b) => key(a).localeCompare(key(b)));
  if (contentHash(sort(payload.investigationCitations)) !== contentHash(sort(expectedRefs))) {
    throw new TypeError("Investigation citations differ");
  }
  const evidenceById = new Map(payload.snapshot.evidenceRows.map((row) => [row.id, row]));
  const eventById = new Map(payload.snapshot.eventRows.map((row) => [row.id, row]));
  const metrics = payload.snapshot.signalRow.metrics;
  return {
    id: caseId, workspaceId, title: payload.snapshot.caseRow.title,
    truthMode: "FIXTURE", status: payload.snapshot.caseRow.status,
    scenarioId: scenario.id, signalId: payload.snapshot.signalRow.id,
    investigationId: report.id, investigationHash: payload.investigationHash,
    summary: report.summary, limitations: report.limitations,
    metrics: {
      baseline: metrics.baseline, observed: metrics.observed,
      controlBaseline: metrics.controlBaseline, controlObserved: metrics.controlObserved,
      relativeDropBps: metrics.relativeDropBps,
      controlRelativeDropBps: metrics.controlRelativeDropBps,
      expectedRevenueCents: metrics.expectedRevenueCents,
      projectedLeakCents: metrics.projectedLeakCents,
    },
    claims: report.claims.map((claim) => ({
      id: claim.id, finding: claim.finding, relation: claim.relation,
      evidenceId: claim.evidenceId,
      source: evidenceById.get(claim.evidenceId).source,
      events: claim.eventIds.map((eventId) => {
        const event = eventById.get(eventId);
        return {
          id: event.id, observedDay: event.observedDay, window: event.window,
          segment: event.segment, source: event.source, starts: event.starts,
          completed: event.completed, captures: event.captures,
          revenueCents: event.revenueCents,
        };
      }),
    })),
  };
}
