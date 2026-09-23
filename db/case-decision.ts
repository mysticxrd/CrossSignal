import { getDatabaseProvider, getSupabaseTraceFunctionConfig } from ".";
import { projectCaseDecision } from "./case-decision.mjs";
import { GOLDEN_SCENARIO } from "./revenue-leak.mjs";

export type DecisionEvent = {
  id: string; observedDay: string; window: string; segment: string;
  source: string; starts: number; completed: number; captures: number; revenueCents: number;
};
export type DecisionClaim = {
  id: string; finding: string; relation: "supports" | "contradicts";
  evidenceId: string; source: string; events: DecisionEvent[];
};
export type DecisionCase = {
  id: string; workspaceId: string; title: string; truthMode: "FIXTURE";
  status: string; scenarioId: string; signalId: string;
  investigationId: string; investigationHash: string;
  summary: string; limitations: string[];
  metrics: {
    baseline: { conversionBps: number; revenueCents: number };
    observed: { conversionBps: number; revenueCents: number };
    controlBaseline: { conversionBps: number };
    controlObserved: { conversionBps: number };
    relativeDropBps: number; controlRelativeDropBps: number;
    expectedRevenueCents: number; projectedLeakCents: number;
  };
  claims: DecisionClaim[];
};
export type DecisionCaseResult =
  | { kind: "found"; case: DecisionCase }
  | { kind: "not_found" }
  | { kind: "unavailable" };

export async function readCaseDecision(
  userId: string,
  workspaceId: string,
  fetcher: typeof fetch = fetch,
): Promise<DecisionCaseResult> {
  // Phase 3 has one seeded owner-workspace scenario. Other workspaces have no
  // Case; never clone fixture data across tenant boundaries during a read.
  if (getDatabaseProvider() !== "supabase" || workspaceId !== "l14-workspace-a") {
    return { kind: "not_found" };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const config = getSupabaseTraceFunctionConfig();
    const response = await fetcher(config.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-cfr-preview-token": config.token,
      },
      body: JSON.stringify({
        operation: "case.decision.read", userId, workspaceId,
        caseId: GOLDEN_SCENARIO.caseId,
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (response.status === 404) return { kind: "not_found" };
    if (!response.ok) return { kind: "unavailable" };
    const payload = await response.json();
    return { kind: "found", case: projectCaseDecision(payload, workspaceId) as DecisionCase };
  } catch (error) {
    console.error("Case decision read failed", error instanceof Error ? error.message : "unknown error");
    return { kind: "unavailable" };
  } finally {
    clearTimeout(timer);
  }
}
