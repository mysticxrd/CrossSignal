/** @typedef {import("./workspace-types").WorkspaceSummary} WorkspaceSummary */

/**
 * @param {WorkspaceSummary[]} workspaces
 * @param {string | undefined} requestedWorkspaceId
 * @returns {WorkspaceSummary}
 */
export function selectAuthorizedWorkspace(workspaces, requestedWorkspaceId) {
  const fallback = workspaces[0];
  if (!fallback) throw new Error("No authorized workspace is available.");
  if (
    typeof requestedWorkspaceId !== "string" ||
    requestedWorkspaceId.length === 0 ||
    requestedWorkspaceId.length > 128
  ) {
    return fallback;
  }

  return (
    workspaces.find((workspace) => workspace.id === requestedWorkspaceId) ??
    fallback
  );
}
