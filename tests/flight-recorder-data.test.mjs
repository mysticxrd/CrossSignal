import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import {
  assertTransition,
  createContextManifest,
  sealActionIntent,
  stableStringify,
  validateExecutionAuthority,
  validateOutcomeAssessment,
  validatePersistedActionIntent,
  validateReasoningArtifact,
} from "../db/flight-recorder-contracts.ts";
import {
  FIXTURE_KEY,
  buildGoldenFixture,
} from "../factory/02_data/fixtures/onboarding-rescue.fixture.mjs";
import { buildResetPackage } from "../factory/02_data/fixtures/reset.mjs";

const projectRoot = new URL("../", import.meta.url);

test("canonical JSON and context manifests are stable, ordered, and closed", async () => {
  assert.equal(stableStringify({ b: 2, a: 1 }), '{"a":1,"b":2}');
  assert.equal(stableStringify({ a: 1, b: 2 }), stableStringify({ b: 2, a: 1 }));

  const sources = [
    {
      position: 1,
      sourceId: "evidence:one",
      sourceKind: "mirrored_event",
      sourceVersion: "v1",
      sourceRef: "fixture://one",
      contentHash: "a".repeat(64),
      accessDecision: "allowed",
      retrieval: { adapter: "fixture" },
    },
  ];
  const first = await createContextManifest(sources);
  const second = await createContextManifest(sources);
  assert.deepEqual(first, second);
  await assert.rejects(
    createContextManifest([{ ...sources[0], accessDecision: "denied" }]),
    /denied source/,
  );
  await assert.rejects(
    createContextManifest([{ ...sources[0], position: 2 }]),
    /positions must be contiguous/,
  );
});

test("all declared state machines reject impossible transitions", () => {
  assert.doesNotThrow(() => assertTransition("trace", "collecting", "context_frozen"));
  assert.throws(() => assertTransition("trace", "collecting", "assessed"), /invalid trace transition/);
  assert.doesNotThrow(() => assertTransition("context", "frozen", "superseded"));
  assert.throws(() => assertTransition("graph", "pending", "succeeded"), /invalid graph transition/);
  assert.doesNotThrow(() => assertTransition("intent", "approved", "consumed"));
  assert.throws(() => assertTransition("policy", "deny", "allow"), /invalid policy transition/);
  assert.throws(() => assertTransition("approval", "consumed", "approved"), /invalid approval transition/);
  assert.doesNotThrow(() => assertTransition("effect", "dispatching", "indeterminate"));
  assert.throws(() => assertTransition("effect", "indeterminate", "dispatching"), /invalid effect transition/);
  assert.doesNotThrow(() => assertTransition("outcome", "assessed", "superseded"));
});

test("intent sealing binds recipients, evidence, context, policy, nonce, and expiry", async () => {
  const base = {
    workspaceId: "ws_a",
    traceId: "trace_a",
    contextSnapshotId: "ctx_a",
    sourceArtifactId: "artifact_a",
    intentKey: "intent-a",
    recipients: ["One@Example.test", "two@example.test"],
    subject: "Try the shorter onboarding path",
    body: "TEST message body",
    evidenceIds: ["evidence:one"],
    metricDefinitionId: "metric_a",
    contextManifestHash: "a".repeat(64),
    policyVersion: "v1",
    policyHash: "b".repeat(64),
    nonce: "nonce-a",
    expiresAt: "2026-08-14T00:00:00.000Z",
    createdBy: "user_a",
  };
  const sealed = await sealActionIntent(base);
  assert.deepEqual(sealed.recipients, ["one@example.test", "two@example.test"]);
  assert.equal(sealed.cohortCap, 2);
  assert.match(sealed.canonicalPayloadHash, /^[0-9a-f]{64}$/);
  assert.deepEqual(await validatePersistedActionIntent(sealed), []);

  const mutated = await sealActionIntent({ ...base, recipients: ["three@example.test"] });
  assert.notEqual(mutated.canonicalPayloadHash, sealed.canonicalPayloadHash);
  assert.match(
    (await validatePersistedActionIntent({
      ...sealed,
      canonicalPayloadJson: stableStringify({
        ...JSON.parse(sealed.canonicalPayloadJson),
        subject: "Mutated canonical subject",
      }),
    })).join("; "),
    /flattened fields do not match its canonical payload/,
  );
  assert.match(
    (await validatePersistedActionIntent({
      ...sealed,
      subject: "Mutated flattened subject",
    })).join("; "),
    /flattened fields do not match its canonical payload/,
  );
  assert.match(
    (await validatePersistedActionIntent({
      ...sealed,
      canonicalPayloadHash: "c".repeat(64),
    })).join("; "),
    /canonical payload hash is invalid/,
  );
  await assert.rejects(
    sealActionIntent({ ...base, recipients: ["a@example.test", "b@example.test", "c@example.test", "d@example.test"] }),
    /1-3 recipients/,
  );
  await assert.rejects(
    sealActionIntent({ ...base, body: "Bearer abcdefghijklmnopqrstuvwxyz" }),
    /secret-like/,
  );
});

test("execution authority fails closed on tenant drift, mutation, replay, expiry, and ambiguity", async () => {
  const fixture = await buildGoldenFixture();
  const intent = fixture.intent;
  const policy = fixture.policyDecision;
  const grant = fixture.approvalGrant;
  const request = {
    workspaceId: intent.workspaceId,
    traceId: intent.traceId,
    intentId: intent.id,
    actorUserId: grant.approvedBy,
    actorWorkspaceId: intent.workspaceId,
    killSwitchEngaged: false,
    canonicalPayloadHash: intent.canonicalPayloadHash,
    contextManifestHash: intent.contextManifestHash,
    policyHash: intent.policyHash,
    recipientSetHash: intent.recipientSetHash,
    nonce: intent.nonce,
    now: "2026-08-13T08:02:00.000Z",
    priorAttemptCount: 0,
  };
  assert.deepEqual(validateExecutionAuthority({ intent, policy, grant, request }), []);
  const authorityErrors = (overrides) =>
    validateExecutionAuthority({
      intent,
      policy,
      grant,
      request: { ...request, ...overrides },
    }).join("; ");

  assert.match(authorityErrors({ killSwitchEngaged: true }), /kill switch is engaged/);
  assert.match(authorityErrors({ actorWorkspaceId: "ws_b" }), /actor workspace mismatch/);
  assert.match(
    authorityErrors({ canonicalPayloadHash: "c".repeat(64) }),
    /request payload was mutated/,
  );
  assert.match(
    authorityErrors({ recipientSetHash: "d".repeat(64) }),
    /recipient set was mutated/,
  );
  assert.match(authorityErrors({ priorAttemptCount: 1 }), /already consumed/);
  assert.match(authorityErrors({ now: "2026-08-15T08:02:00.000Z" }), /expired/);
  assert.throws(() => assertTransition("effect", "indeterminate", "dispatching"), /invalid effect transition/);
});

test("reasoning and outcome contracts reject undeclared evidence, secrets, and overclaims", () => {
  assert.deepEqual(
    validateReasoningArtifact({
      content: { conclusion: "Use a three-person TEST cohort." },
      evidenceCitations: ["evidence:one"],
      declaredEvidenceIds: ["evidence:one"],
    }),
    [],
  );
  assert.match(
    validateReasoningArtifact({
      content: { conclusion: "Use a three-person TEST cohort." },
      evidenceCitations: ["evidence:other"],
      declaredEvidenceIds: ["evidence:one"],
    }).join("; "),
    /undeclared evidence/,
  );
  assert.match(
    validateReasoningArtifact({
      content: { token: "sk-test_abcdefghijklmnopqrstuvwxyz" },
      evidenceCitations: ["evidence:one"],
      declaredEvidenceIds: ["evidence:one"],
    }).join("; "),
    /secret-like/,
  );

  assert.deepEqual(
    validateOutcomeAssessment({
      label: "correlated",
      evidenceIds: ["observation:one"],
      limitations: ["small TEST cohort"],
      observationCount: 1,
      invalidSignatureCount: 0,
      observationTruthModes: ["TEST"],
    }),
    [],
  );
  assert.match(
    validateOutcomeAssessment({
      label: "correlated",
      evidenceIds: ["observation:one"],
      limitations: [],
      observationCount: 1,
      invalidSignatureCount: 0,
      observationTruthModes: ["TEST"],
    }).join("; "),
    /no limitations/,
  );
  assert.match(
    validateOutcomeAssessment({
      label: "correlated",
      evidenceIds: ["observation:one"],
      limitations: ["small TEST cohort"],
      observationCount: 0,
      invalidSignatureCount: 0,
      observationTruthModes: [],
    }).join("; "),
    /without observations must be inconclusive/,
  );
  assert.match(
    validateOutcomeAssessment({
      label: "supported",
      evidenceIds: ["observation:one"],
      limitations: ["signature failed"],
      observationCount: 1,
      invalidSignatureCount: 1,
      observationTruthModes: ["LIVE"],
    }).join("; "),
    /invalid signed observations cannot support/,
  );
  assert.match(
    validateOutcomeAssessment({
      label: "supported",
      evidenceIds: ["observation:one"],
      limitations: ["fixture observation"],
      observationCount: 1,
      invalidSignatureCount: 0,
      observationTruthModes: ["FIXTURE"],
    }).join("; "),
    /FIXTURE observations cannot support/,
  );
});

test("golden fixture is deterministic, fully labeled, reconstructable, and narrowly resettable", async () => {
  const first = await buildGoldenFixture();
  const second = await buildGoldenFixture();
  assert.equal(stableStringify(first), stableStringify(second));
  assert.equal(first.fixtureKey, FIXTURE_KEY);
  assert.equal(first.trace.truthMode, "FIXTURE");
  assert.equal(first.intent.truthMode, "TEST");
  assert.equal(first.intent.cohortCap, 3);
  assert.deepEqual(first.workspaceMember, {
    workspaceId: first.workspace.id,
    userId: first.user.id,
    role: "owner",
    joinedAt: "2026-08-13T08:00:00.000Z",
  });
  assert.deepEqual(first.workspaceAuthorityControl, {
    workspaceId: first.workspace.id,
    killSwitchEngaged: false,
    updatedBy: first.user.id,
    updatedAt: "2026-08-13T08:00:00.000Z",
  });
  assert.equal(first.contextSnapshot.currentState, "frozen");
  assert.equal(first.reasoningNodes.length, 6);
  assert.equal(first.evidence.length, first.contextSnapshot.sourceCount);
  assert.equal(first.effectAttempt.events.length, 3);
  assert.equal(first.effectAttempt.reservedBy, first.user.id);
  for (const [index, event] of first.effectAttempt.events.entries()) {
    assert.equal(event.workspaceId, first.workspace.id);
    assert.equal(event.traceId, first.trace.id);
    assert.equal(event.effectAttemptId, first.effectAttempt.id);
    assert.equal(event.sequence, index + 1);
    assert.match(event.id, /^effect_event_/);
    assert.match(event.idempotencyKey, /:effect-event:\d+$/);
    assert.ok(Number.isFinite(Date.parse(event.occurredAt)));
    assert.equal(typeof event.payloadJson, "string");
    assert.ok("providerReceiptId" in event);
    assert.ok("providerResponseHash" in event);
    assert.ok("errorCode" in event);
  }
  assert.equal(first.effectAttempt.events.at(-1).currentState, "confirmed");
  assert.deepEqual(
    first.flightTraceEvents.map((event) => event.currentState),
    [
      "collecting",
      "context_frozen",
      "reasoning",
      "awaiting_approval",
      "executing",
      "observing",
      "assessed",
    ],
  );
  for (const [index, event] of first.flightTraceEvents.entries()) {
    assert.equal(event.workspaceId, first.workspace.id);
    assert.equal(event.traceId, first.trace.id);
    assert.equal(event.sequence, index + 1);
    assert.equal(event.subjectType, "trace");
    assert.equal(event.subjectId, first.trace.id);
    assert.match(event.payloadHash, /^[0-9a-f]{64}$/);
    assert.match(event.idempotencyKey, /:trace-event:\d+$/);
    assert.ok(Number.isFinite(Date.parse(event.occurredAt)));
  }
  assert.equal(first.outcomeAssessment.label, "correlated");
  assert.match(first.outcomeAssessment.limitationsJson, /FIXTURE|TEST|causal/);

  const reset = await buildResetPackage(first.workspace.id);
  assert.deepEqual(reset.deleteBindings, [first.workspace.id, FIXTURE_KEY, "FIXTURE"]);
  assert.equal(
    reset.deleteSql,
    "DELETE FROM flight_traces WHERE workspace_id = ? AND fixture_key = ? AND truth_mode = ?",
  );
  assert.equal(reset.traceId, first.trace.id);
  assert.equal(reset.truthMode, "FIXTURE");
  await assert.rejects(buildResetPackage("ws_not_fixture"), /refuses any workspace/);
});

test("migration enforces workspace ownership, immutable authority, and append-only evidence", async () => {
  const migrationNames = (await readdir(new URL("drizzle/", projectRoot)))
    .filter((name) => /^000[45]_.+\.sql$/.test(name))
    .sort();
  assert.equal(migrationNames.length, 2, "Stage 02 schema and guard migrations are required");
  const migration = (
    await Promise.all(
      migrationNames.map((name) =>
        readFile(new URL(`drizzle/${name}`, projectRoot), "utf8"),
      ),
    )
  ).join("\n");
  for (const table of [
    "flight_traces",
    "flight_evidence",
    "context_snapshots",
    "reasoning_nodes",
    "reasoning_artifacts",
    "outcome_definitions",
    "action_intents",
    "policy_decisions",
    "approval_grants",
    "effect_attempts",
    "effect_attempt_events",
    "outcome_observations",
    "outcome_assessments",
    "flight_trace_events",
  ]) {
    assert.match(migration, new RegExp("CREATE TABLE `" + table + "`"));
  }
  assert.match(migration, /idx_effect_attempts_intended_effect/);
  assert.match(migration, /idx_effect_attempts_one_grant_use/);
  assert.match(migration, /workspace_id`,`intent_id/);
  assert.match(migration, /trg_action_intents_immutable/);
  assert.match(migration, /trg_approval_grants_immutable/);
  assert.match(migration, /trg_flight_evidence_immutable/);
  assert.match(migration, /trg_flight_traces_transition/);
  assert.match(migration, /trg_context_snapshots_transition/);
  assert.match(migration, /trg_context_supersessions_immutable/);
  assert.match(migration, /trg_reasoning_nodes_transition/);
  assert.match(migration, /trg_action_intents_canonical_binding/);
  assert.match(migration, /trg_flight_trace_events_append_only/);
  assert.match(migration, /trg_flight_trace_events_delete_guard/);
  assert.match(migration, /trg_effect_attempt_events_attempt_binding/);
  assert.match(migration, /trg_outcome_supersessions_immutable/);
  assert.match(migration, /trg_flight_trace_events_subject_binding/);
  assert.match(migration, /trg_flight_trace_events_transition/);
});
