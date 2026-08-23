export const AUTHORITY_FIXTURE_VERSION = "2026-08-22.1";
export const AUTHORITY_FIXTURE_KEY = `l08-superseded-intent:${AUTHORITY_FIXTURE_VERSION}`;

export const AUTHORITY_ERRORS = Object.freeze({
  staleAuthorization: "l08_stale_or_superseded_intent",
  activationRejected: "l08_intent_activation_rejected",
  pointerRejected: "l08_active_intent_pointer_rejected",
  projectionMismatch: "l08_trace_execution_projection_mismatch",
  migrationHistoricalMismatch: "migration_l08_historical_authority_mismatch",
  migrationMissingHead: "migration_l08_required_state_missing_active_intent",
});

export const REQUIRED_ACTIVE_HEAD_STATES = Object.freeze([
  "awaiting_approval",
  "executing",
  "observing",
  "assessed",
]);

export const MIGRATION_CASES = Object.freeze([
  Object.freeze({
    name: "empty",
    traceState: null,
    legacyIntentOrder: [],
    authorityIntentIds: [],
    expected: "migrated",
    activeIntentId: null,
  }),
  Object.freeze({
    name: "pending-v1",
    traceState: "awaiting_approval",
    legacyIntentOrder: ["intent-v1"],
    policyIntentIds: ["intent-v1"],
    authorityIntentIds: [],
    expected: "migrated",
    activeIntentId: "intent-v1",
  }),
  Object.freeze({
    name: "pending-v2",
    traceState: "awaiting_approval",
    legacyIntentOrder: ["intent-v1", "intent-v2"],
    policyIntentIds: ["intent-v1", "intent-v2"],
    authorityIntentIds: [],
    expected: "migrated",
    activeIntentId: "intent-v2",
  }),
  Object.freeze({
    name: "completed-v1",
    traceState: "assessed",
    legacyIntentOrder: ["intent-v1"],
    policyIntentIds: ["intent-v1"],
    authorityIntentIds: ["intent-v1"],
    expected: "migrated",
    activeIntentId: "intent-v1",
  }),
  Object.freeze({
    name: "invalid-historical-race",
    traceState: "assessed",
    legacyIntentOrder: ["intent-v1", "intent-v2"],
    policyIntentIds: ["intent-v1", "intent-v2"],
    authorityIntentIds: ["intent-v1"],
    expected: "aborted",
    error: AUTHORITY_ERRORS.migrationHistoricalMismatch,
  }),
]);

const noRejectedWrites = Object.freeze({
  approvalGrants: 0,
  effectAttempts: 0,
  effectEvents: 0,
  executingOrTerminalTraceEvents: 0,
  outcomeObservations: 0,
  outcomeAssessments: 0,
  costRecords: 0,
  providerCalls: 0,
  providerReceipts: 0,
});

export function buildAuthorityRaceFixture() {
  return {
    fixtureKey: AUTHORITY_FIXTURE_KEY,
    truthMode: "FIXTURE",
    identities: {
      workspaceId: "ws_l08_authority_fixture",
      traceId: "trace_l08_authority_fixture",
      actorUserId: "usr_l08_owner_fixture",
      v1IntentId: "intent_l08_v1",
      v1PolicyId: "policy_l08_v1",
      v2IntentId: "intent_l08_v2",
      v2PolicyId: "policy_l08_v2",
    },
    initialProjection: {
      traceState: "awaiting_approval",
      activeIntentId: "intent_l08_v1",
      visibleIntentId: "intent_l08_v1",
      v1SupersedesIntentId: null,
      v2SupersedesIntentId: "intent_l08_v1",
      approvalGrantCount: 0,
      effectAttemptCount: 0,
    },
    productionBarrier: {
      operation: "authorizeAndExecute",
      phase: "after-active-intent-and-policy-load-before-write-batch",
      implementation: "manual-promise-barrier-or-two-controlled-database-connections",
      forbidden: ["timer", "random-scheduling", "copied-authorization-sql", "test-only-authority-validator"],
    },
    schedules: {
      editWins: {
        steps: [
          "authorization-loads-active-v1-and-policy-v1",
          "authorization-pauses-at-production-barrier",
          "replacement-batch-inserts-v2-with-supersedes-v1",
          "replacement-batch-inserts-policy-v2-and-promotes-active-head-to-v2",
          "authorization-resumes-and-attempts-its-real-v1-write-batch",
          "active-head-grant-guard-aborts-the-complete-v1-batch",
        ],
        expectedError: AUTHORITY_ERRORS.staleAuthorization,
        expectedProjection: {
          traceState: "awaiting_approval",
          activeIntentId: "intent_l08_v2",
          visibleIntentId: "intent_l08_v2",
        },
        rejectedAuthorizationWrites: noRejectedWrites,
        continuation: "exact-authorization-of-v2-succeeds-once",
      },
      authorizationWins: {
        steps: [
          "authorization-loads-active-v1-and-policy-v1",
          "authorization-v1-write-batch-commits-once",
          "replacement-attempt-inserts-v2-and-policy-v2-in-one-real-batch",
          "policy-activation-sentinel-aborts-because-v1-is-authorized-and-trace-is-not-awaiting",
        ],
        expectedError: AUTHORITY_ERRORS.activationRejected,
        expectedProjection: {
          activeIntentId: "intent_l08_v1",
          v2IntentCount: 0,
          v2PolicyCount: 0,
          v1EffectCount: 1,
        },
      },
    },
    directDatabaseAttacks: [
      "grant-superseded-v1",
      "reserve-effect-for-superseded-v1",
      "cross-workspace-active-head",
      "cross-trace-active-head",
      "clear-active-head-after-activation",
      "move-active-head-without-an-exact-policy",
      "move-active-head-against-the-immutable-predecessor-edge",
      "authorize-with-kill-switch-engaged",
      "replay-grant-or-intended-effect",
      "commit-after-zero-row-trace-executing-compare-and-swap",
    ],
  };
}

export function validateAuthorityRaceFixture(fixture = buildAuthorityRaceFixture()) {
  const errors = [];
  const ids = fixture.identities ?? {};
  const initial = fixture.initialProjection ?? {};
  if (fixture.fixtureKey !== AUTHORITY_FIXTURE_KEY) errors.push("fixture key drifted");
  if (fixture.truthMode !== "FIXTURE") errors.push("fixture truth mode is not FIXTURE");
  if (initial.activeIntentId !== ids.v1IntentId) errors.push("initial active head is not v1");
  if (initial.visibleIntentId !== ids.v1IntentId) errors.push("initial visible intent is not the active head");
  if (initial.v2SupersedesIntentId !== ids.v1IntentId) errors.push("v2 does not explicitly supersede v1");
  if (fixture.productionBarrier?.operation !== "authorizeAndExecute") errors.push("barrier is not on the production authorization path");
  if (!fixture.productionBarrier?.phase?.includes("before-write-batch")) errors.push("barrier is not before the production write batch");
  const editWins = fixture.schedules?.editWins;
  if (editWins?.expectedError !== AUTHORITY_ERRORS.staleAuthorization) errors.push("edit-wins error is not named");
  if (editWins?.expectedProjection?.activeIntentId !== ids.v2IntentId) errors.push("edit-wins head is not v2");
  if (Object.values(editWins?.rejectedAuthorizationWrites ?? {}).some((count) => count !== 0)) errors.push("rejected authorization permits partial writes");
  const authorizationWins = fixture.schedules?.authorizationWins;
  if (authorizationWins?.expectedProjection?.activeIntentId !== ids.v1IntentId) errors.push("authorization-wins head is not v1");
  if (authorizationWins?.expectedProjection?.v2IntentCount !== 0 || authorizationWins?.expectedProjection?.v2PolicyCount !== 0) errors.push("authorization-wins permits a partial replacement");
  if (authorizationWins?.expectedProjection?.v1EffectCount !== 1) errors.push("authorization-wins is not exactly once");
  if ((fixture.directDatabaseAttacks ?? []).length < 10) errors.push("direct database attack matrix is incomplete");
  const names = new Set(MIGRATION_CASES.map((item) => item.name));
  for (const required of ["empty", "pending-v1", "pending-v2", "completed-v1", "invalid-historical-race"]) {
    if (!names.has(required)) errors.push(`migration case is missing: ${required}`);
  }
  return errors;
}
