import { cookies } from "next/headers";
import CrossSignalApp from "./CrossSignalApp";
import WorkspaceOnboarding from "./WorkspaceOnboarding";
import { requireCrossSignalUser } from "./crosssignal-auth";
import { ACTIVE_WORKSPACE_COOKIE } from "./workspace-config";
import { listOwnerWorkspaces } from "../db/workspaces";
import {
  getOrCreateSeededCase,
  listCaseEvents,
  listCaseEvidence,
} from "../db/cases";

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
  const workspace =
    workspaces.find((candidate) => candidate.id === requestedWorkspaceId) ??
    workspaces[0];
  const caseState = await getOrCreateSeededCase(owner.userId, workspace.id);
  const [evidenceItems, caseEvents] = await Promise.all([
    listCaseEvidence(owner.userId, workspace.id),
    listCaseEvents(owner.userId, workspace.id),
  ]);

  return (
    <CrossSignalApp
      key={workspace.id}
      owner={ownerSummary}
      workspace={workspace}
      workspaces={workspaces}
      initialCaseState={caseState}
      evidenceItems={evidenceItems}
      caseEvents={caseEvents}
    />
  );
}
