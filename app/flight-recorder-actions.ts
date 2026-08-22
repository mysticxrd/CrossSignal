"use server";

import { revalidatePath } from "next/cache";
import {
  authorizeAndExecute,
  replacePendingIntent,
  resetFlightRecorderFixture,
  setWorkspaceKillSwitch,
} from "../db/flight-recorder";
import type {
  ExecutionScenario,
  FlightRecorderActionResult,
} from "./flight-recorder-types";
import { getCrossSignalUser } from "./crosssignal-auth";

function cleanWorkspaceId(value: unknown): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 128) {
    throw new Error("Workspace selection is invalid.");
  }
  return value;
}

function cleanText(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== "string") throw new Error(`${label} is required.`);
  const cleaned = value.trim().replace(/\r\n/g, "\n");
  if (cleaned.length < 1 || cleaned.length > maxLength) {
    throw new Error(`${label} must be between 1 and ${maxLength} characters.`);
  }
  return cleaned;
}

function cleanRecipients(value: unknown): string[] {
  if (!Array.isArray(value)) throw new Error("Recipients are invalid.");
  const recipients = value.map((item) => cleanText(item, "Recipient", 254));
  if (recipients.length < 1 || recipients.length > 3) {
    throw new Error("Choose between one and three TEST recipients.");
  }
  return recipients;
}

function failure(error: unknown): FlightRecorderActionResult {
  return {
    ok: false,
    error: error instanceof Error ? error.message : "The control action failed.",
  };
}

export async function editProposedAction(
  workspaceId: unknown,
  recipients: unknown,
  subject: unknown,
  body: unknown,
): Promise<FlightRecorderActionResult> {
  const user = await getCrossSignalUser();
  if (!user) return { ok: false, error: "Sign in is required." };
  try {
    const snapshot = await replacePendingIntent({
      userId: user.userId,
      workspaceId: cleanWorkspaceId(workspaceId),
      recipients: cleanRecipients(recipients),
      subject: cleanText(subject, "Subject", 160),
      body: cleanText(body, "Email body", 2_000),
    });
    revalidatePath("/");
    return {
      ok: true,
      kind: "intent-replaced",
      snapshot,
      message: `New intent v${snapshot.intent.version} created. Any earlier approval is unusable.`,
    };
  } catch (error) {
    return failure(error);
  }
}

export async function authorizeAction(
  workspaceId: unknown,
  scenario: unknown,
): Promise<FlightRecorderActionResult> {
  const user = await getCrossSignalUser();
  if (!user) return { ok: false, error: "Sign in is required." };
  if (!new Set<ExecutionScenario>(["confirmed", "failed", "indeterminate"]).has(scenario as ExecutionScenario)) {
    return { ok: false, error: "Execution scenario is invalid." };
  }
  try {
    const snapshot = await authorizeAndExecute({
      userId: user.userId,
      workspaceId: cleanWorkspaceId(workspaceId),
      scenario: scenario as ExecutionScenario,
    });
    revalidatePath("/");
    const message =
      scenario === "confirmed"
        ? "The exact approved TEST action was confirmed. The observed outcome is labeled correlated, not proven."
        : scenario === "failed"
          ? "The provider rejected the TEST action. No success is claimed and no retry occurred."
          : "The provider response was ambiguous. CrossSignal stopped and did not retry.";
    return { ok: true, kind: "executed", snapshot, message };
  } catch (error) {
    return failure(error);
  }
}

export async function updateGlobalPause(
  workspaceId: unknown,
  engaged: unknown,
): Promise<FlightRecorderActionResult> {
  const user = await getCrossSignalUser();
  if (!user) return { ok: false, error: "Sign in is required." };
  if (typeof engaged !== "boolean") {
    return { ok: false, error: "Global pause value is invalid." };
  }
  try {
    const snapshot = await setWorkspaceKillSwitch({
      userId: user.userId,
      workspaceId: cleanWorkspaceId(workspaceId),
      engaged,
    });
    revalidatePath("/");
    return {
      ok: true,
      kind: "kill-switch-updated",
      snapshot,
      message: engaged
        ? "All new agent actions are paused immediately."
        : "Agent actions may be proposed again; each consequential action still needs exact authorization.",
    };
  } catch (error) {
    return failure(error);
  }
}

export async function resetFlightRecorderDemo(
  workspaceId: unknown,
): Promise<FlightRecorderActionResult> {
  const user = await getCrossSignalUser();
  if (!user) return { ok: false, error: "Sign in is required." };
  try {
    const snapshot = await resetFlightRecorderFixture(
      user.userId,
      cleanWorkspaceId(workspaceId),
    );
    revalidatePath("/");
    return {
      ok: true,
      kind: "reset",
      snapshot,
      message: "The exact FIXTURE trace was reset. Workspace membership and the global pause control were preserved.",
    };
  } catch (error) {
    return failure(error);
  }
}
