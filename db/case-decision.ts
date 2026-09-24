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
export type CaseCheckReceipt = {
  workspaceId: string; responseId: string; proposalHash: string;
  recordedBy: string; runReference: string;
  captureStatus: "captured" | "not_captured" | "indeterminate";
  checkedAt: string; recordedAt: string; contentHash: string;
  supersedesReceiptHash?: string;
};
export type DecisionCase = {
  id: string; workspaceId: string; title: string; truthMode: "FIXTURE";
  status: string; scenarioId: string; signalId: string;
  investigationId: string; investigationHash: string;
  response: {
    proposal: {
      id: string; workspaceId: string; caseId: string; truthMode: "FIXTURE";
      intent: {
        kind: string; instruction: string; target: string; environment: "TEST";
        recipients: string[]; maxCostCents: number; maxRuns: number; externalWrite: boolean;
      };
      authority: { requiredRole: string; approvalBinds: string; execution: string };
      measurement: {
        metric: string; baseline: string; followUp: string; minimumStarts: number;
        assessment: string; status: string;
      };
      uncertainty: string;
    };
    proposalHash: string;
    approval: { approvedBy: string; approvedAt: string } | null;
    receipt: CaseCheckReceipt | null;
    trialReceipt: CaseCheckReceipt | null;
    trialMarker: {
      workspaceId: string; responseId: string; receiptHash: string;
      markedBy: string; reason: "trial_submission";
      markedAt: string; contentHash: string;
    } | null;
  };
  outcome: {
    status: "awaiting_check" | "awaiting_follow_up_events" | "collecting" | "insufficient_starts" | "assessed";
    label: "correlated_only" | null; eventIds: string[];
    daysRecorded?: number; starts?: number; minimumStarts?: number;
    completed?: number; captures?: number; revenueCents?: number;
    conversionBps?: number; incidentConversionBps?: number; changeBps?: number;
    limitation?: string; days?: string[];
  };
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

export async function approveSavedCaseResponse(
  userId: string,
  workspaceId: string,
  caseId: string,
  responseId: string,
  responseHash: string,
  fetcher: typeof fetch = fetch,
): Promise<{ ok: true; reused: boolean } | { ok: false; error: string }> {
  if (getDatabaseProvider() !== "supabase" || workspaceId !== "l14-workspace-a") {
    return { ok: false, error: "This Case response is available in TEST only." };
  }
  try {
    const config = getSupabaseTraceFunctionConfig();
    const response = await fetcher(config.url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-cfr-preview-token": config.token },
      body: JSON.stringify({ operation: "case.response.approve", userId, workspaceId,
        caseId, responseId, responseHash }),
      cache: "no-store",
    });
    if (!response.ok) return { ok: false, error: response.status === 409
      ? "The proposal changed. Reload the Case before approving."
      : response.status === 404 ? "The Case response is unavailable."
        : "Approval could not be saved." };
    const result = await response.json();
    return result?.kind === "approved" && typeof result.reused === "boolean"
      ? { ok: true, reused: result.reused }
      : { ok: false, error: "Approval response was invalid." };
  } catch (error) {
    console.error("Case response approval failed", error instanceof Error ? error.message : "unknown error");
    return { ok: false, error: "Approval could not be saved." };
  }
}

export async function recordSavedCaseCheck(
  userId: string, workspaceId: string, caseId: string, responseId: string,
  responseHash: string, runReference: string,
  captureStatus: "captured" | "not_captured" | "indeterminate",
  fetcher: typeof fetch = fetch,
): Promise<{ ok: true; reused: boolean } | { ok: false; error: string }> {
  if (getDatabaseProvider() !== "supabase" || workspaceId !== "l14-workspace-a") {
    return { ok: false, error: "This Case check is available in TEST only." };
  }
  try {
    const config = getSupabaseTraceFunctionConfig();
    const response = await fetcher(config.url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-cfr-preview-token": config.token },
      body: JSON.stringify({ operation: "case.check.record", userId, workspaceId,
        caseId, responseId, responseHash, runReference, captureStatus }),
      cache: "no-store",
    });
    if (!response.ok) return { ok: false, error: response.status === 409
      ? "An approval is required, or a different check receipt is already saved. Reload the Case."
      : response.status === 404 ? "The Case response is unavailable."
        : "The TEST check receipt could not be saved." };
    const result = await response.json();
    return result?.kind === "recorded" && typeof result.reused === "boolean"
      ? { ok: true, reused: result.reused }
      : { ok: false, error: "The TEST check receipt response was invalid." };
  } catch (error) {
    console.error("Case check receipt failed", error instanceof Error ? error.message : "unknown error");
    return { ok: false, error: "The TEST check receipt could not be saved." };
  }
}

export async function markSavedCaseCheckTrial(
  userId: string, workspaceId: string, caseId: string, responseId: string,
  responseHash: string, receiptHash: string, fetcher: typeof fetch = fetch,
): Promise<{ ok: true; reused: boolean } | { ok: false; error: string }> {
  if (getDatabaseProvider() !== "supabase" || workspaceId !== "l14-workspace-a") {
    return { ok: false, error: "This Case check is available in TEST only." };
  }
  try {
    const config = getSupabaseTraceFunctionConfig();
    const response = await fetcher(config.url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-cfr-preview-token": config.token },
      body: JSON.stringify({ operation: "case.check.trial", userId, workspaceId,
        caseId, responseId, responseHash, receiptHash }),
      cache: "no-store",
    });
    if (!response.ok) return { ok: false, error: response.status === 409
      ? "The receipt changed or was already used. Reload the Case."
      : response.status === 404 ? "The Case receipt is unavailable."
        : "The trial marker could not be saved." };
    const result = await response.json();
    return result?.kind === "marked" && typeof result.reused === "boolean"
      ? { ok: true, reused: result.reused }
      : { ok: false, error: "The trial marker response was invalid." };
  } catch (error) {
    console.error("Case trial marker failed", error instanceof Error ? error.message : "unknown error");
    return { ok: false, error: "The trial marker could not be saved." };
  }
}
