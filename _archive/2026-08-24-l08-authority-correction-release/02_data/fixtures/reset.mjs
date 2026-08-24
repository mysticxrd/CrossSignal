import { FIXTURE_KEY, buildGoldenFixture } from "./onboarding-rescue.fixture.mjs";

const FIXTURE_WORKSPACE_ID = "ws_crosssignal_fixture";
const FIXTURE_TRUTH_MODE = "FIXTURE";

export const RESET_SQL = Object.freeze([
  `DELETE FROM flight_traces WHERE workspace_id = ? AND fixture_key = ? AND truth_mode = ?`,
]);

export async function buildResetPackage(workspaceId = FIXTURE_WORKSPACE_ID) {
  if (workspaceId !== FIXTURE_WORKSPACE_ID) {
    throw new Error("fixture reset refuses any workspace outside its exact canonical scope");
  }
  const fixture = await buildGoldenFixture();
  if (
    fixture.fixtureKey !== FIXTURE_KEY ||
    fixture.workspace.id !== workspaceId ||
    fixture.trace.workspaceId !== workspaceId ||
    fixture.trace.fixtureKey !== FIXTURE_KEY ||
    fixture.trace.truthMode !== FIXTURE_TRUTH_MODE
  ) {
    throw new Error("fixture reset package does not match its declared scope");
  }
  return {
    workspaceId,
    traceId: fixture.trace.id,
    fixtureKey: FIXTURE_KEY,
    truthMode: FIXTURE_TRUTH_MODE,
    deleteSql: RESET_SQL[0],
    deleteBindings: [workspaceId, FIXTURE_KEY, FIXTURE_TRUTH_MODE],
    fixture,
  };
}
