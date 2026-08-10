export type WorkspaceRole = "owner";

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
};

export type OwnerSummary = {
  displayName: string;
  email: string;
  fullName: string | null;
};

export type WorkspaceActionResult =
  | { ok: true; workspaceId: string }
  | { ok: false; error: string };
