import { verifySimulatedCheckouts } from "./case-checkout.mjs";
import { contentHash } from "./revenue-leak.mjs";

// This assesses harness coverage, never incident recovery. Rebuild from saved,
// verified runs on every read; do not accept a caller-provided assessment.
export function assessCaseSimulation(rows, workspaceId, caseId, responseId, proposalHash) {
  const runs = verifySimulatedCheckouts(rows, workspaceId, caseId, responseId, proposalHash)
    .sort((a, b) => a.executedAt.localeCompare(b.executedAt) || a.runId.localeCompare(b.runId));
  const counts = { capture: 0, decline: 0 };
  const state = () => counts.capture && counts.decline ? "verified"
    : counts.capture || counts.decline ? "in_progress" : "awaiting_runs";
  const transitions = runs.map((run) => {
    const from = state();
    counts[run.scenario] += 1;
    return { runId: run.runId, runHash: run.contentHash, executedAt: run.executedAt,
      scenario: run.scenario, result: run.captureStatus, eventIds: run.events.map(e => e.id),
      from, to: state() };
  });
  const assessment = { methodVersion: "simulation-coverage-v1", truthMode: "SIMULATED",
    workspaceId, caseId, responseId, proposalHash, status: state(),
    criteria: "One verified capture scenario and one verified decline scenario",
    counts, runCount: runs.length, transitions, actualChargedCents: 0,
    caseResolution: "unresolved", deviceVerification: "pending", businessOutcome: "not_measured" };
  return { ...assessment, contentHash: contentHash(assessment) };
}
