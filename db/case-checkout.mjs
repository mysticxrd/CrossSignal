import { contentHash } from "./revenue-leak.mjs";
import { buildSimulatedCheckout, CHECKOUT_LIMIT } from "../supabase/functions/_shared/case-checkout.mjs";

export function verifySimulatedCheckouts(rows, workspaceId, caseId, responseId, proposalHash) {
  if (!Array.isArray(rows) || rows.length > CHECKOUT_LIMIT) throw new TypeError("Synthetic checkout rows are invalid");
  const seen = new Set();
  return rows.map((row) => {
    if (!row || Object.keys(row).sort().join("|") !== "artifact|contentHash"
      || !row.artifact || typeof row.artifact !== "object") throw new TypeError("Synthetic checkout record is invalid");
    const a = row.artifact;
    if (a.workspaceId !== workspaceId || a.caseId !== caseId || a.responseId !== responseId
      || a.proposalHash !== proposalHash || seen.has(a.runId)) throw new TypeError("Synthetic checkout binding differs");
    const expected = buildSimulatedCheckout({ workspaceId, caseId, responseId, proposalHash,
      runId: a.runId, scenario: a.scenario, recordedBy: a.recordedBy, executedAt: a.executedAt });
    if (contentHash(a) !== contentHash(expected) || row.contentHash !== contentHash(expected)) {
      throw new TypeError("Synthetic checkout artifact differs");
    }
    seen.add(a.runId);
    return { ...expected, contentHash: row.contentHash };
  }).sort((a, b) => b.executedAt.localeCompare(a.executedAt) || a.runId.localeCompare(b.runId));
}
