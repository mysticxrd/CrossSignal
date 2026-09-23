import { cookies } from "next/headers";
import CrossSignalApp from "./CrossSignalApp";
import WorkspaceOnboarding from "./WorkspaceOnboarding";
import { requireCrossSignalUser } from "./crosssignal-auth";
import { ACTIVE_WORKSPACE_COOKIE } from "./workspace-config";
import { selectAuthorizedWorkspace } from "./workspace-selection.mjs";
import { listOwnerWorkspaces } from "../db/workspaces";
import { getOrCreateFlightRecorderSnapshot } from "../db/flight-recorder";
import { readCaseDecision } from "../db/case-decision";

export const dynamic = "force-dynamic";

export default async function Home() {
  const owner = await requireCrossSignalUser("/");
  const workspaces = await listOwnerWorkspaces(owner);
  const ownerSummary = {
    displayName: owner.displayName,
    email: owner.email,
    fullName: owner.fullName,
  };

  if (workspaces.length === 0) {
    return <WorkspaceOnboarding owner={ownerSummary} />;
  }

  const cookieStore = await cookies();
  const requestedWorkspaceId = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;
  const workspace = selectAuthorizedWorkspace(
    workspaces,
    requestedWorkspaceId,
  );
  const [flightRecorder, decisionCase] = await Promise.all([
    getOrCreateFlightRecorderSnapshot(owner.userId, workspace.id),
    readCaseDecision(owner.userId, workspace.id),
  ]);

  return (
    <CrossSignalApp
      key={workspace.id}
      owner={ownerSummary}
      workspace={workspace}
      workspaces={workspaces}
      initialFlightRecorder={flightRecorder}
      decisionCase={decisionCase}
    />
  );
}
