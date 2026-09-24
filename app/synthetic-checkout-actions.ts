"use server";

import { revalidatePath } from "next/cache";
import { getCrossSignalUser } from "./crosssignal-auth";
import { executeSavedCaseCheckout, readCaseDecision } from "../db/case-decision";
import { RUN_ID } from "../supabase/functions/_shared/case-checkout.mjs";

export async function runSyntheticCheckoutAction(workspaceId: unknown, caseId: unknown,
  proposalHash: unknown, runId: unknown, scenario: unknown) {
  const user = await getCrossSignalUser();
  if (!user) return { ok: false as const, error: "Sign in is required." };
  if (typeof workspaceId !== "string" || typeof caseId !== "string"
    || typeof proposalHash !== "string" || !/^[0-9a-f]{64}$/.test(proposalHash)
    || typeof runId !== "string" || !RUN_ID.test(runId)
    || (scenario !== "capture" && scenario !== "decline")) {
    return { ok: false as const, error: "Synthetic checkout input is invalid." };
  }
  const current = await readCaseDecision(user.userId, workspaceId);
  if (current.kind !== "found" || current.case.id !== caseId
    || current.case.response.proposalHash !== proposalHash) {
    return { ok: false as const, error: "The verified Case is unavailable. Reload the Case." };
  }
  const result = await executeSavedCaseCheckout(user.userId, workspaceId, caseId,
    current.case.response.proposal.id, proposalHash, runId, scenario);
  if (result.ok) revalidatePath("/");
  return result;
}
