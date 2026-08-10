"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  createOwnerWorkspace,
  ownerCanAccessWorkspace,
} from "../db/workspaces";
import { getCrossSignalUser } from "./crosssignal-auth";
import { ACTIVE_WORKSPACE_COOKIE } from "./workspace-config";
import type { WorkspaceActionResult } from "./workspace-types";

async function setActiveWorkspaceCookie(workspaceId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function createWorkspaceAction(
  name: unknown,
): Promise<WorkspaceActionResult> {
  const user = await getCrossSignalUser();
  if (!user) return { ok: false, error: "Sign in is required." };
  if (typeof name !== "string") {
    return { ok: false, error: "Workspace name is required." };
  }

  try {
    const workspace = await createOwnerWorkspace(user, name);
    await setActiveWorkspaceCookie(workspace.id);
    revalidatePath("/");
    return { ok: true, workspaceId: workspace.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Workspace creation failed.",
    };
  }
}

export async function selectWorkspaceAction(
  workspaceId: unknown,
): Promise<WorkspaceActionResult> {
  const user = await getCrossSignalUser();
  if (!user) return { ok: false, error: "Sign in is required." };
  if (typeof workspaceId !== "string" || workspaceId.length > 128) {
    return { ok: false, error: "Workspace selection is invalid." };
  }

  try {
    const allowed = await ownerCanAccessWorkspace(user.userId, workspaceId);
    if (!allowed) return { ok: false, error: "Workspace access was denied." };

    await setActiveWorkspaceCookie(workspaceId);
    revalidatePath("/");
    return { ok: true, workspaceId };
  } catch {
    return { ok: false, error: "Workspace selection failed." };
  }
}
