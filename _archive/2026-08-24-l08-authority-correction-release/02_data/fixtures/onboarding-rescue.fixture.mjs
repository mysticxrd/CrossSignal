import {
  createContextManifest,
  sealActionIntent,
  sealCanonical,
} from "../../../db/flight-recorder-contracts.ts";

export const FIXTURE_VERSION = "2026-08-13.1";
export const FIXTURE_KEY = `onboarding-rescue:${FIXTURE_VERSION}`;
export const FIXTURE_TIME = "2026-08-13T08:00:00.000Z";

function fixtureTime(offsetMs) {
  return new Date(Date.parse(FIXTURE_TIME) + offsetMs).toISOString();
}

const ids = {
  userId: "usr_crosssignal_owner_fixture",
  workspaceId: "ws_crosssignal_fixture",
  traceId: "trace_onboarding_rescue_fixture_v1",
  contextSnapshotId: "ctx_onboarding_rescue_fixture_v1",
  outcomeDefinitionId: "metric_activation_72h_fixture_v1",
  policyDecisionId: "policy_onboarding_rescue_fixture_v1",
  approvalGrantId: "grant_onboarding_rescue_fixture_v1",
  intentId: "intent_onboarding_rescue_fixture_v1",
  effectAttemptId: "effect_onboarding_rescue_fixture_v1",
  outcomeObservationId: "observation_activation_fixture_v1",
  outcomeAssessmentId: "assessment_activation_fixture_v1",
};

const sourcePayloads = [
  {
    position: 1,
    sourceId: "evidence:activation-drop",
    sourceKind: "mirrored_event",
    sourceVersion: "fixture-v1",
    sourceRef: "fixture://analytics/onboarding-activation",
    accessDecision: "allowed",
    payload: {
      truthMode: "FIXTURE",
      metric: "activation_within_72h",
      baselineRate: 0.44,
      recentRate: 0.31,
      eligibleAccounts: 42,
      window: "2026-08-01/2026-08-07",
    },
  },
  {
    position: 2,
    sourceId: "evidence:onboarding-feedback",
    sourceKind: "approved_feedback",
    sourceVersion: "fixture-v1",
    sourceRef: "fixture://support/onboarding-feedback",
    accessDecision: "redacted",
    payload: {
      truthMode: "FIXTURE",
      theme: "setup uncertainty",
      records: 5,
      redaction: "synthetic identities omitted",
    },
  },
  {
    position: 3,
    sourceId: "context:brand",
    sourceKind: "policy_document",
    sourceVersion: "brand-v1",
    sourceRef: "fixture://company-brain/brand",
    accessDecision: "allowed",
    payload: {
      truthMode: "FIXTURE",
      promise: "clear, useful, and honest",
      prohibited: ["fabricated urgency", "unqualified causal claim"],
    },
  },
  {
    position: 4,
    sourceId: "context:email-policy",
    sourceKind: "policy_document",
    sourceVersion: "email-test-v1",
    sourceRef: "fixture://policy/email-test",
    accessDecision: "allowed",
    payload: {
      truthMode: "FIXTURE",
      maxRecipients: 3,
      approvalRequired: true,
      providerMode: "TEST",
      blindRetryAfterAmbiguousDispatch: false,
    },
  },
  {
    position: 5,
    sourceId: "metric:activation-72h",
    sourceKind: "metric_definition",
    sourceVersion: "metric-v1",
    sourceRef: "fixture://metrics/activation-72h",
    accessDecision: "allowed",
    payload: {
      truthMode: "FIXTURE",
      metric: "activation_within_72h",
      qualifyingEvent: "workspace_first_value",
      attribution: "correlated_only",
    },
  },
];

async function evidenceRecord(source) {
  const sealed = await sealCanonical(source.payload);
  return {
    id: source.sourceId.replaceAll(":", "_"),
    workspaceId: ids.workspaceId,
    traceId: ids.traceId,
    evidenceKey: source.sourceId,
    truthMode: "FIXTURE",
    sourceKind: source.sourceKind,
    sourceVersion: source.sourceVersion,
    sourceRef: source.sourceRef,
    capturedAt: FIXTURE_TIME,
    payloadJson: sealed.canonicalJson,
    contentHash: sealed.sha256,
    idempotencyKey: `${FIXTURE_KEY}:${source.sourceId}`,
    createdBy: ids.userId,
    contextSource: {
      position: source.position,
      sourceId: source.sourceId,
      sourceKind: source.sourceKind,
      sourceVersion: source.sourceVersion,
      sourceRef: source.sourceRef,
      contentHash: sealed.sha256,
      accessDecision: source.accessDecision,
      retrieval: {
        retrievedAt: FIXTURE_TIME,
        adapter: "canonical-fixture",
        query: source.sourceRef,
      },
    },
  };
}

export async function buildGoldenFixture() {
  const evidence = await Promise.all(sourcePayloads.map(evidenceRecord));
  const context = await createContextManifest(
    evidence.map((item) => item.contextSource),
  );

  const policy = await sealCanonical({
    policyVersion: "email-test-v1",
    approvalRequired: true,
    maxRecipients: 3,
    providerMode: "TEST",
    blindRetryAfterAmbiguousDispatch: false,
  });
  const outcomeRule = await sealCanonical({
    metric: "activation_within_72h",
    minimumEligibleAccounts: 3,
    allowedLabels: ["supported", "unsupported", "correlated", "inconclusive"],
    causalClaimAllowed: false,
  });
  const cohort = await sealCanonical({
    accountIds: ["acct_fixture_01", "acct_fixture_02", "acct_fixture_03"],
    truthMode: "FIXTURE",
  });
  const baseline = await sealCanonical({
    activationRate: 0.31,
    eligibleAccounts: 42,
    sourceEvidenceId: "evidence:activation-drop",
  });

  const graphNodes = [
    ["planner", ["evidence:activation-drop", "evidence:onboarding-feedback"]],
    ["quantitative", ["evidence:activation-drop", "metric:activation-72h"]],
    ["qualitative", ["evidence:onboarding-feedback", "context:brand"]],
    ["experiment_design", ["context:email-policy", "metric:activation-72h"]],
    ["skeptic", ["evidence:activation-drop", "evidence:onboarding-feedback"]],
    ["synthesizer", sourcePayloads.map((source) => source.sourceId)],
  ];
  const reasoningNodes = await Promise.all(
    graphNodes.map(async ([nodeKey, citations], index) => {
      const artifact = await sealCanonical({
        truthMode: "FIXTURE",
        nodeKey,
        summary: `Deterministic ${nodeKey} artifact for the onboarding-rescue golden fixture.`,
        evidenceCitations: citations,
      });
      return {
        node: {
          id: `node_${nodeKey}_fixture_v1`,
          workspaceId: ids.workspaceId,
          traceId: ids.traceId,
          nodeKey,
          attempt: 1,
          currentState: "succeeded",
          inputHash: context.manifestHash,
          outputHash: artifact.sha256,
          errorCode: null,
          startedAt: new Date(Date.parse(FIXTURE_TIME) + index * 1_000).toISOString(),
          completedAt: new Date(Date.parse(FIXTURE_TIME) + index * 1_000 + 500).toISOString(),
        },
        artifact: {
          id: `artifact_${nodeKey}_fixture_v1`,
          workspaceId: ids.workspaceId,
          traceId: ids.traceId,
          nodeId: `node_${nodeKey}_fixture_v1`,
          artifactKind:
            nodeKey === "planner"
              ? "plan"
              : nodeKey === "skeptic"
                ? "critique"
                : nodeKey === "synthesizer"
                  ? "intent_draft"
                  : "analysis",
          schemaVersion: "reasoning-artifact-v1",
          contentJson: artifact.canonicalJson,
          contentHash: artifact.sha256,
          evidenceCitationsJson: JSON.stringify(citations),
        },
      };
    }),
  );

  const intent = await sealActionIntent({
    workspaceId: ids.workspaceId,
    traceId: ids.traceId,
    contextSnapshotId: ids.contextSnapshotId,
    sourceArtifactId: "artifact_synthesizer_fixture_v1",
    intentKey: "onboarding-rescue-email-test-v1",
    recipients: [
      "fixture.one@example.test",
      "fixture.two@example.test",
      "fixture.three@example.test",
    ],
    subject: "A clearer first step for your workspace",
    body: "FIXTURE TEST: Here is the shortest path to reach first value in your workspace.",
    evidenceIds: ["evidence:activation-drop", "evidence:onboarding-feedback"],
    metricDefinitionId: ids.outcomeDefinitionId,
    contextManifestHash: context.manifestHash,
    policyVersion: "email-test-v1",
    policyHash: policy.sha256,
    nonce: "nonce_onboarding_rescue_fixture_v1",
    expiresAt: "2026-08-14T08:00:00.000Z",
    createdBy: ids.userId,
  });

  const providerReceipt = await sealCanonical({
    truthMode: "FIXTURE",
    providerMode: "TEST",
    accepted: 3,
    receiptId: "fixture-email-receipt-001",
  });
  const observation = await sealCanonical({
    truthMode: "FIXTURE",
    activatedAccounts: 1,
    eligibleAccounts: 3,
    window: "2026-08-13T08:00:00.000Z/2026-08-16T08:00:00.000Z",
  });
  const assessment = await sealCanonical({
    label: "correlated",
    evidenceIds: ["evidence:activation-drop", "activation-window-fixture-v1"],
    limitations: [
      "FIXTURE data",
      "three-recipient TEST cohort",
      "no causal inference",
    ],
    rationaleSummary: "One activation followed the intervention, but the fixture only supports correlation.",
  });

  const effectEvents = [
    {
      id: "effect_event_reserved_fixture_v1",
      workspaceId: ids.workspaceId,
      traceId: ids.traceId,
      effectAttemptId: ids.effectAttemptId,
      sequence: 1,
      priorState: null,
      currentState: "reserved",
      providerReceiptId: null,
      providerResponseHash: null,
      errorCode: null,
      payloadJson: "{}",
      idempotencyKey: `${FIXTURE_KEY}:effect-event:1`,
      occurredAt: "2026-08-13T08:01:01.000Z",
    },
    {
      id: "effect_event_dispatching_fixture_v1",
      workspaceId: ids.workspaceId,
      traceId: ids.traceId,
      effectAttemptId: ids.effectAttemptId,
      sequence: 2,
      priorState: "reserved",
      currentState: "dispatching",
      providerReceiptId: null,
      providerResponseHash: null,
      errorCode: null,
      payloadJson: "{}",
      idempotencyKey: `${FIXTURE_KEY}:effect-event:2`,
      occurredAt: "2026-08-13T08:01:02.000Z",
    },
    {
      id: "effect_event_confirmed_fixture_v1",
      workspaceId: ids.workspaceId,
      traceId: ids.traceId,
      effectAttemptId: ids.effectAttemptId,
      sequence: 3,
      priorState: "dispatching",
      currentState: "confirmed",
      providerReceiptId: "fixture-email-receipt-001",
      providerResponseHash: providerReceipt.sha256,
      errorCode: null,
      payloadJson: providerReceipt.canonicalJson,
      idempotencyKey: `${FIXTURE_KEY}:effect-event:3`,
      occurredAt: "2026-08-13T08:01:03.000Z",
    },
  ];

  const traceEventDescriptors = [
    {
      eventType: "trace.collecting",
      priorState: null,
      currentState: "collecting",
      actorType: "human",
      actorId: ids.userId,
      occurredAt: fixtureTime(-1_000),
      payload: { fixtureKey: FIXTURE_KEY, truthMode: "FIXTURE" },
    },
    {
      eventType: "trace.context_frozen",
      priorState: "collecting",
      currentState: "context_frozen",
      actorType: "system",
      actorId: "crosssignal-context-fixture-v1",
      occurredAt: FIXTURE_TIME,
      payload: {
        contextSnapshotId: ids.contextSnapshotId,
        manifestHash: context.manifestHash,
        sourceCount: context.sourceCount,
      },
    },
    {
      eventType: "trace.reasoning",
      priorState: "context_frozen",
      currentState: "reasoning",
      actorType: "agent",
      actorId: "crosssignal-fixed-graph-v1",
      occurredAt: fixtureTime(5_500),
      payload: {
        artifactIds: reasoningNodes.map(({ artifact }) => artifact.id),
        nodeIds: reasoningNodes.map(({ node }) => node.id),
      },
    },
    {
      eventType: "trace.awaiting_approval",
      priorState: "reasoning",
      currentState: "awaiting_approval",
      actorType: "system",
      actorId: "crosssignal-authority-fixture-v1",
      occurredAt: "2026-08-13T08:00:07.000Z",
      payload: {
        canonicalPayloadHash: intent.canonicalPayloadHash,
        intentId: ids.intentId,
        policyDecisionId: ids.policyDecisionId,
      },
    },
    {
      eventType: "trace.executing",
      priorState: "awaiting_approval",
      currentState: "executing",
      actorType: "human",
      actorId: ids.userId,
      occurredAt: "2026-08-13T08:01:01.000Z",
      payload: {
        approvalGrantId: ids.approvalGrantId,
        effectAttemptId: ids.effectAttemptId,
      },
    },
    {
      eventType: "trace.observing",
      priorState: "executing",
      currentState: "observing",
      actorType: "adapter",
      actorId: "fixture-email-adapter-v1",
      occurredAt: "2026-08-13T08:01:03.000Z",
      payload: {
        effectAttemptId: ids.effectAttemptId,
        effectState: "confirmed",
        providerReceiptId: "fixture-email-receipt-001",
      },
    },
    {
      eventType: "trace.assessed",
      priorState: "observing",
      currentState: "assessed",
      actorType: "system",
      actorId: "crosssignal-outcome-fixture-v1",
      occurredAt: "2026-08-16T08:00:00.000Z",
      payload: {
        assessmentId: ids.outcomeAssessmentId,
        assessmentLabel: "correlated",
        observationId: ids.outcomeObservationId,
        outcomeDefinitionId: ids.outcomeDefinitionId,
      },
    },
  ];
  const flightTraceEvents = await Promise.all(
    traceEventDescriptors.map(async (event, index) => {
      const payload = await sealCanonical(event.payload);
      const sequence = index + 1;
      return {
        id: `trace_event_${String(sequence).padStart(2, "0")}_fixture_v1`,
        workspaceId: ids.workspaceId,
        traceId: ids.traceId,
        sequence,
        eventType: event.eventType,
        subjectType: "trace",
        subjectId: ids.traceId,
        priorState: event.priorState,
        currentState: event.currentState,
        actorType: event.actorType,
        actorId: event.actorId,
        payloadJson: payload.canonicalJson,
        payloadHash: payload.sha256,
        idempotencyKey: `${FIXTURE_KEY}:trace-event:${sequence}`,
        occurredAt: event.occurredAt,
      };
    }),
  );

  return {
    fixtureKey: FIXTURE_KEY,
    fixtureVersion: FIXTURE_VERSION,
    reset: {
      scope: "trace_fixture_identity",
      workspaceId: ids.workspaceId,
      fixtureKey: FIXTURE_KEY,
      truthMode: "FIXTURE",
      order: ["delete exact FIXTURE trace", "reinsert canonical trace graph"],
      preserves: [
        "fixture user",
        "fixture workspace",
        "workspace membership",
        "workspace authority controls",
        "other workspace traces",
        "non-fixture traces",
        "prior release evidence",
      ],
    },
    user: {
      id: ids.userId,
      email: "owner@crosssignal.example",
      displayName: "CrossSignal Fixture Owner",
    },
    workspace: {
      id: ids.workspaceId,
      name: "CrossSignal Golden Fixture",
      slug: "crosssignal-golden-fixture",
      ownerUserId: ids.userId,
    },
    workspaceMember: {
      workspaceId: ids.workspaceId,
      userId: ids.userId,
      role: "owner",
      joinedAt: FIXTURE_TIME,
    },
    workspaceAuthorityControl: {
      workspaceId: ids.workspaceId,
      killSwitchEngaged: false,
      updatedBy: ids.userId,
      updatedAt: FIXTURE_TIME,
    },
    trace: {
      id: ids.traceId,
      workspaceId: ids.workspaceId,
      traceKey: "onboarding-rescue-fixture-v1",
      fixtureKey: FIXTURE_KEY,
      truthMode: "FIXTURE",
      currentState: "assessed",
      retentionClass: "review_evidence",
      retentionUntil: "2027-08-13T08:00:00.000Z",
      createdBy: ids.userId,
    },
    evidence,
    contextSnapshot: {
      id: ids.contextSnapshotId,
      workspaceId: ids.workspaceId,
      traceId: ids.traceId,
      snapshotKey: "onboarding-rescue-context-v1",
      truthMode: "FIXTURE",
      currentState: "frozen",
      sourceCount: context.sourceCount,
      orderedManifestJson: context.orderedManifestJson,
      manifestHash: context.manifestHash,
      createdBy: ids.userId,
      frozenAt: FIXTURE_TIME,
    },
    reasoningNodes,
    outcomeDefinition: {
      id: ids.outcomeDefinitionId,
      workspaceId: ids.workspaceId,
      traceId: ids.traceId,
      definitionKey: "activation-within-72h-v1",
      metricName: "activation_within_72h",
      cohortJson: cohort.canonicalJson,
      cohortHash: cohort.sha256,
      baselineJson: baseline.canonicalJson,
      baselineHash: baseline.sha256,
      windowStartsAt: FIXTURE_TIME,
      windowEndsAt: "2026-08-16T08:00:00.000Z",
      assessmentRuleJson: outcomeRule.canonicalJson,
      assessmentRuleHash: outcomeRule.sha256,
      registeredBy: ids.userId,
      registeredAt: FIXTURE_TIME,
    },
    intent: { id: ids.intentId, ...intent },
    policyDecision: {
      id: ids.policyDecisionId,
      workspaceId: ids.workspaceId,
      traceId: ids.traceId,
      intentId: ids.intentId,
      policyVersion: "email-test-v1",
      policyHash: policy.sha256,
      verdict: "approval_required",
      reasonCodesJson: JSON.stringify(["external_email", "human_authority_required"]),
      evaluatedPayloadHash: intent.canonicalPayloadHash,
      evaluatedContextHash: context.manifestHash,
      evaluatorVersion: "deterministic-policy-v1",
      decidedAt: "2026-08-13T08:00:07.000Z",
    },
    approvalGrant: {
      id: ids.approvalGrantId,
      workspaceId: ids.workspaceId,
      traceId: ids.traceId,
      intentId: ids.intentId,
      policyDecisionId: ids.policyDecisionId,
      decision: "approved",
      boundPayloadHash: intent.canonicalPayloadHash,
      boundContextHash: context.manifestHash,
      boundPolicyHash: policy.sha256,
      boundRecipientSetHash: intent.recipientSetHash,
      nonce: intent.nonce,
      expiresAt: intent.expiresAt,
      approvedBy: ids.userId,
      approvedAt: "2026-08-13T08:01:00.000Z",
    },
    effectAttempt: {
      id: ids.effectAttemptId,
      workspaceId: ids.workspaceId,
      traceId: ids.traceId,
      intentId: ids.intentId,
      approvalGrantId: ids.approvalGrantId,
      intendedEffectKey: "email-test:onboarding-rescue:cohort-v1",
      adapterKind: "email_test",
      providerMode: "FIXTURE",
      initialState: "reserved",
      requestHash: intent.canonicalPayloadHash,
      reservedBy: ids.userId,
      reservedAt: "2026-08-13T08:01:01.000Z",
      events: effectEvents,
    },
    outcomeObservation: {
      id: ids.outcomeObservationId,
      workspaceId: ids.workspaceId,
      traceId: ids.traceId,
      definitionId: ids.outcomeDefinitionId,
      sourceEvidenceId: "metric_activation-72h",
      observationKey: "activation-window-fixture-v1",
      truthMode: "FIXTURE",
      signatureStatus: "fixture",
      valueJson: observation.canonicalJson,
      valueHash: observation.sha256,
      observedAt: "2026-08-16T08:00:00.000Z",
    },
    outcomeAssessment: {
      id: ids.outcomeAssessmentId,
      workspaceId: ids.workspaceId,
      traceId: ids.traceId,
      definitionId: ids.outcomeDefinitionId,
      assessmentVersion: 1,
      label: "correlated",
      evidenceIdsJson: JSON.stringify([
        "evidence:activation-drop",
        "activation-window-fixture-v1",
      ]),
      limitationsJson: JSON.stringify([
        "FIXTURE data",
        "three-recipient TEST cohort",
        "no causal inference",
      ]),
      rationaleSummary: "One activation followed the intervention; no causal claim is made.",
      contentHash: assessment.sha256,
    },
    flightTraceEvents,
  };
}
