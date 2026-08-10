"use server";

import { revalidatePath } from "next/cache";
import { transitionSeededCase } from "../db/cases";
import { getCrossSignalUser } from "./crosssignal-auth";
import type { CaseActionResult, CaseCommand } from "./case-types";

type CaseActionPayload = {
  issueTitle?: string;
  reviewerNote?: string;
};

const allowedCommands = new Set<CaseCommand>([
  "approve_evidence",
  "approve_intervention",
  "mark_implemented",
  "simulate_measurement",
  "accept_learning",
  "reset_case",
]);

function cleanOptionalText(
  value: unknown,
  maxLength: number,
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new Error("Case input is invalid.");
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (!cleaned || cleaned.length > maxLength) {
    throw new Error(`Case input must be between 1 and ${maxLength} characters.`);
  }
  return cleaned;
}

export async function updateSeededCaseAction(
  workspaceId: unknown,
  command: unknown,
  payload: CaseActionPayload = {},
): Promise<CaseActionResult> {
  const user = await getCrossSignalUser();
  if (!user) return { ok: false, error: "Sign in is required." };
  if (typeof workspaceId !== "string" || workspaceId.length > 128) {
    return { ok: false, error: "Workspace selection is invalid." };
  }
  if (typeof command !== "string" || !allowedCommands.has(command as CaseCommand)) {
    return { ok: false, error: "Case action is invalid." };
  }

  try {
    const next = await transitionSeededCase({
      userId: user.userId,
      workspaceId,
      command: command as CaseCommand,
      issueTitle: cleanOptionalText(payload.issueTitle, 140),
      reviewerNote: cleanOptionalText(payload.reviewerNote, 500),
    });
    revalidatePath("/");
    return { ok: true, caseState: next.caseState, reused: next.reused };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Case update failed.",
    };
  }
}
