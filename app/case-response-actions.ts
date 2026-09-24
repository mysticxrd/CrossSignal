"use server";

import { revalidatePath } from "next/cache";
import { getCrossSignalUser } from "./crosssignal-auth";
import { approveSavedCaseResponse, readCaseDecision, recordSavedCaseCheck } from "../db/case-decision";

export async function approveCaseResponseAction(
  workspaceId: unknown,
  caseId: unknown,
  proposalHash: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCrossSignalUser();
  if (!user) return { ok: false, error: "Sign in is required." };
  if (typeof workspaceId !== "string" || typeof caseId !== "string"
    || typeof proposalHash !== "string" || !/^[0-9a-f]{64}$/.test(proposalHash)) {
    return { ok: false, error: "Case approval input is invalid." };
  }
  const current = await readCaseDecision(user.userId, workspaceId);
  if (current.kind !== "found" || current.case.id !== caseId
    || current.case.response.proposalHash !== proposalHash) {
    return { ok: false, error: "The verified Case response is unavailable. Reload the Case." };
  }
  const result = await approveSavedCaseResponse(user.userId, workspaceId, caseId,
    current.case.response.proposal.id, proposalHash);
  if (!result.ok) return result;
  revalidatePath("/");
  return { ok: true };
}

export async function recordCaseCheckAction(
  workspaceId: unknown, caseId: unknown, proposalHash: unknown,
  runReference: unknown, captureStatus: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCrossSignalUser();
  if (!user) return { ok: false, error: "Sign in is required." };
  if (typeof workspaceId !== "string" || typeof caseId !== "string"
    || typeof proposalHash !== "string" || !/^[0-9a-f]{64}$/.test(proposalHash)
    || typeof runReference !== "string" || !/^[A-Za-z0-9_-]{8,64}$/.test(runReference)
    || !["captured", "not_captured", "indeterminate"].includes(String(captureStatus))) {
    return { ok: false, error: "Enter a TEST run reference and capture result." };
  }
  const current = await readCaseDecision(user.userId, workspaceId);
  if (current.kind !== "found" || current.case.id !== caseId
    || current.case.response.proposalHash !== proposalHash
    || !current.case.response.approval) {
    return { ok: false, error: "The approved Case response is unavailable. Reload the Case." };
  }
  const result = await recordSavedCaseCheck(user.userId, workspaceId, caseId,
    current.case.response.proposal.id, proposalHash, runReference,
    captureStatus as "captured" | "not_captured" | "indeterminate");
  if (!result.ok) return result;
  revalidatePath("/");
  return { ok: true };
}
