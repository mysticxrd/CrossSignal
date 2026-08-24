import {
  createContextManifest,
  sealActionIntent,
  sealCanonical,
  stableStringify,
} from "./flight-recorder-contracts";

export const STAGE_03_FIXTURE_KEY = "onboarding-rescue:stage03-v1";
export const STAGE_03_TRACE_KEY = "onboarding-rescue-stage03-v1";
export const STAGE_03_SPENDING_CAP_USD = 0.15;

export const DEFAULT_ONBOARDING_SUBJECT =
  "A clearer first step for your workspace";
export const DEFAULT_ONBOARDING_BODY =
  "Hi — we noticed setup may be getting in the way. Here is the shortest path to reach first value in your workspace. This is a TEST email for the CrossSignal demo.";
export const DEFAULT_ONBOARDING_RECIPIENTS = [
  "maya@northstar.example.test",
  "noah@harbor.example.test",
  "zoe@fieldwork.example.test",
];

type DemoIdentity = {
  userId: string;
  workspaceId: string;
  now?: string;
};

type IntentInput = DemoIdentity & {
  traceId: string;
  contextSnapshotId: string;
  sourceArtifactId: string;
  outcomeDefinitionId: string;
  contextManifestHash: string;
  intentVersion: number;
  recipients: string[];
  subject: string;
  body: string;
};

function addMilliseconds(value: string, milliseconds: number): string {
  return new Date(Date.parse(value) + milliseconds).toISOString();
}

function requireIso(value: string): string {
  if (!Number.isFinite(Date.parse(value))) throw new Error("Demo time is invalid.");
  return new Date(value).toISOString();
}

async function workspaceScope(workspaceId: string): Promise<string> {
  const sealed = await sealCanonical({ workspaceId });
  return sealed.sha256.slice(0, 16);
}

async function buildOutcomeDefinition(input: {
  id: string;
  workspaceId: string;
  traceId: string;
  userId: string;
  now: string;
}) {
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
  return {
    id: input.id,
    workspaceId: input.workspaceId,
    traceId: input.traceId,
    definitionKey: "activation-within-72h-v1",
    metricName: "activation_within_72h",
    cohortJson: cohort.canonicalJson,
    cohortHash: cohort.sha256,
    baselineJson: baseline.canonicalJson,
    baselineHash: baseline.sha256,
    windowStartsAt: input.now,
    windowEndsAt: addMilliseconds(input.now, 72 * 60 * 60 * 1_000),
    assessmentRuleJson: outcomeRule.canonicalJson,
    assessmentRuleHash: outcomeRule.sha256,
    registeredBy: input.userId,
    registeredAt: input.now,
  };
}

export async function buildDemoIntent(input: IntentInput) {
  const now = requireIso(input.now ?? new Date().toISOString());
  const scope = await workspaceScope(input.workspaceId);
  const policy = await sealCanonical({
    policyVersion: "email-test-v1",
    approvalRequired: true,
    maxRecipients: 3,
    maxSpendUsd: STAGE_03_SPENDING_CAP_USD,
    providerMode: "TEST",
    blindRetryAfterAmbiguousDispatch: false,
  });
  const intent = await sealActionIntent({
    workspaceId: input.workspaceId,
    traceId: input.traceId,
    contextSnapshotId: input.contextSnapshotId,
    sourceArtifactId: input.sourceArtifactId,
    intentKey: `onboarding-rescue-email-test-v${input.intentVersion}`,
    recipients: input.recipients,
    subject: input.subject,
    body: input.body,
    evidenceIds: ["evidence:activation-drop", "evidence:onboarding-feedback"],
    metricDefinitionId: input.outcomeDefinitionId,
    contextManifestHash: input.contextManifestHash,
    policyVersion: "email-test-v1",
    policyHash: policy.sha256,
    nonce: `nonce_${scope}_v${input.intentVersion}`,
    expiresAt: addMilliseconds(now, 24 * 60 * 60 * 1_000),
    createdBy: input.userId,
  });

  return {
    intent: {
      id: `intent_${scope}_v${input.intentVersion}`,
      ...intent,
      createdAt: now,
    },
    policyDecision: {
      id: `policy_${scope}_v${input.intentVersion}`,
      workspaceId: input.workspaceId,
      traceId: input.traceId,
      intentId: `intent_${scope}_v${input.intentVersion}`,
      policyVersion: "email-test-v1",
      policyHash: policy.sha256,
      verdict: "approval_required" as const,
      reasonCodesJson: JSON.stringify([
        "external_email",
        "human_authority_required",
        "spend_cap_bound",
      ]),
      evaluatedPayloadHash: intent.canonicalPayloadHash,
      evaluatedContextHash: input.contextManifestHash,
      evaluatorVersion: "deterministic-policy-v1",
      decidedAt: now,
    },
    spendingCapUsd: STAGE_03_SPENDING_CAP_USD,
  };
}

export async function buildFlightRecorderSeed(input: DemoIdentity) {
  return buildFlightRecorderDemo(input, true);
}

export async function buildPendingFlightRecorderDemo(input: DemoIdentity) {
  return buildFlightRecorderDemo(input, false);
}

async function buildFlightRecorderDemo(input: DemoIdentity, seedOnly: boolean) {
  const requestedNow = requireIso(input.now ?? new Date().toISOString());
  const now = addMilliseconds(requestedNow, -10_000);
  const scope = await workspaceScope(input.workspaceId);
  const ids = {
    traceId: `trace_${scope}`,
    contextSnapshotId: `context_${scope}`,
    outcomeDefinitionId: `outcome_definition_${scope}`,
  };
  const sourcePayloads = [
    {
      position: 1,
      sourceId: "evidence:activation-drop",
      sourceKind: "mirrored_event",
      sourceVersion: "fixture-v1",
      sourceRef: "fixture://analytics/onboarding-activation",
      accessDecision: "allowed" as const,
      label: "Activation fell from 44% to 31%",
      summary: "42 eligible FIXTURE accounts showed a lower 72-hour activation rate.",
      payload: {
        truthMode: "FIXTURE",
        metric: "activation_within_72h",
        baselineRate: 0.44,
        recentRate: 0.31,
        eligibleAccounts: 42,
      },
    },
    {
      position: 2,
      sourceId: "evidence:onboarding-feedback",
      sourceKind: "approved_feedback",
      sourceVersion: "fixture-v1",
      sourceRef: "fixture://support/onboarding-feedback",
      accessDecision: "redacted" as const,
      label: "Five users described setup uncertainty",
      summary: "Approved, redacted FIXTURE feedback points to an unclear first step.",
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
      accessDecision: "allowed" as const,
      label: "Approved brand guidance",
      summary: "Be clear, useful, and honest; avoid fabricated urgency.",
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
      accessDecision: "allowed" as const,
      label: "Reviewed TEST email policy",
      summary: "Three recipients maximum, human approval required, no blind retry.",
      payload: {
        truthMode: "FIXTURE",
        maxRecipients: 3,
        maxSpendUsd: STAGE_03_SPENDING_CAP_USD,
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
      accessDecision: "allowed" as const,
      label: "Pre-registered outcome metric",
      summary: "Activation within 72 hours; correlation only for this three-person fixture.",
      payload: {
        truthMode: "FIXTURE",
        metric: "activation_within_72h",
        qualifyingEvent: "workspace_first_value",
        attribution: "correlated_only",
      },
    },
  ];
  const evidence = await Promise.all(
    sourcePayloads.map(async (source, index) => {
      const sealed = await sealCanonical(source.payload);
      return {
        id: `evidence_${scope}_${index + 1}`,
        workspaceId: input.workspaceId,
        traceId: ids.traceId,
        evidenceKey: source.sourceId,
        truthMode: "FIXTURE" as const,
        sourceKind: source.sourceKind,
        sourceVersion: source.sourceVersion,
        sourceRef: source.sourceRef,
        capturedAt: now,
        payloadJson: sealed.canonicalJson,
        contentHash: sealed.sha256,
        idempotencyKey: `${STAGE_03_FIXTURE_KEY}:${input.workspaceId}:${source.sourceId}`,
        createdBy: input.userId,
        label: source.label,
        summary: source.summary,
        contextSource: {
          position: source.position,
          sourceId: source.sourceId,
          sourceKind: source.sourceKind,
          sourceVersion: source.sourceVersion,
          sourceRef: source.sourceRef,
          contentHash: sealed.sha256,
          accessDecision: source.accessDecision,
          retrieval: {
            retrievedAt: now,
            adapter: "stage03-canonical-fixture",
            query: source.sourceRef,
          },
        },
      };
    }),
  );
  const context = await createContextManifest(
    evidence.map((item) => item.contextSource),
  );
  const outcomeDefinition = await buildOutcomeDefinition({
    id: ids.outcomeDefinitionId,
    workspaceId: input.workspaceId,
    traceId: ids.traceId,
    userId: input.userId,
    now,
  });
  const trace = {
    id: ids.traceId,
    workspaceId: input.workspaceId,
    traceKey: STAGE_03_TRACE_KEY,
    fixtureKey: STAGE_03_FIXTURE_KEY,
    truthMode: "FIXTURE" as const,
    currentState: "context_frozen" as const,
    retentionClass: "review_evidence" as const,
    retentionUntil: addMilliseconds(now, 365 * 24 * 60 * 60 * 1_000),
    createdBy: input.userId,
  };
  const contextSnapshot = {
    id: ids.contextSnapshotId,
    workspaceId: input.workspaceId,
    traceId: ids.traceId,
    snapshotKey: "onboarding-rescue-context-v1",
    truthMode: "FIXTURE" as const,
    currentState: "frozen" as const,
    sourceCount: context.sourceCount,
    orderedManifestJson: context.orderedManifestJson,
    manifestHash: context.manifestHash,
    createdBy: input.userId,
    frozenAt: now,
  };
  if (seedOnly) {
    return {
      ids,
      now,
      trace,
      evidence,
      contextSnapshot,
      outcomeDefinition,
      stableStringify,
    };
  }
  const graph = [
    ["planner", "Scopes the reviewed onboarding-rescue playbook", ["evidence:activation-drop", "evidence:onboarding-feedback"]],
    ["quantitative", "Checks the activation movement and cohort", ["evidence:activation-drop", "metric:activation-72h"]],
    ["qualitative", "Summarizes approved, redacted feedback", ["evidence:onboarding-feedback", "context:brand"]],
    ["experiment_design", "Pre-registers the TEST cohort and outcome", ["context:email-policy", "metric:activation-72h"]],
    ["skeptic", "Challenges causality and the traffic-quality alternative", ["evidence:activation-drop", "evidence:onboarding-feedback"]],
    ["synthesizer", "Drafts one bounded email action", sourcePayloads.map((source) => source.sourceId)],
  ] as const;
  const reasoningNodes = await Promise.all(
    graph.map(async ([nodeKey, role, citations], index) => {
      const content =
        nodeKey === "skeptic"
          ? {
              truthMode: "FIXTURE",
              nodeKey,
              summary: "The signal is useful, but it does not prove the email will cause activation.",
              challenge: "Small cohort and fixture timing require a correlated-only outcome label.",
              evidenceCitations: citations,
            }
          : {
              truthMode: "FIXTURE",
              nodeKey,
              summary: `Deterministic ${nodeKey} artifact for the reviewed onboarding-rescue playbook.`,
              evidenceCitations: citations,
            };
      const artifact = await sealCanonical(content);
      const nodeId = `node_${scope}_${nodeKey}`;
      return {
        role,
        node: {
          id: nodeId,
          workspaceId: input.workspaceId,
          traceId: ids.traceId,
          nodeKey,
          attempt: 1,
          currentState: "succeeded" as const,
          inputHash: context.manifestHash,
          outputHash: artifact.sha256,
          errorCode: null,
          startedAt: addMilliseconds(now, index * 1_000),
          completedAt: addMilliseconds(now, index * 1_000 + 500),
        },
        artifact: {
          id: `artifact_${scope}_${nodeKey}`,
          workspaceId: input.workspaceId,
          traceId: ids.traceId,
          nodeId,
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
  const intentBundle = await buildDemoIntent({
    ...input,
    now: addMilliseconds(now, 7_000),
    traceId: ids.traceId,
    contextSnapshotId: ids.contextSnapshotId,
    sourceArtifactId: `artifact_${scope}_synthesizer`,
    outcomeDefinitionId: ids.outcomeDefinitionId,
    contextManifestHash: context.manifestHash,
    intentVersion: 1,
    recipients: DEFAULT_ONBOARDING_RECIPIENTS,
    subject: DEFAULT_ONBOARDING_SUBJECT,
    body: DEFAULT_ONBOARDING_BODY,
  });

  const eventDescriptors = [
    ["trace.collecting", null, "collecting", "human", input.userId, { fixtureKey: STAGE_03_FIXTURE_KEY }],
    ["trace.context_frozen", "collecting", "context_frozen", "system", "crosssignal-context-v1", { manifestHash: context.manifestHash }],
    ["trace.reasoning", "context_frozen", "reasoning", "agent", "crosssignal-reviewed-playbook-v1", { nodeCount: reasoningNodes.length }],
    ["trace.awaiting_approval", "reasoning", "awaiting_approval", "system", "crosssignal-authority-v1", { intentId: intentBundle.intent.id }],
  ] as const;
  const flightTraceEvents = await Promise.all(
    eventDescriptors.map(async ([eventType, priorState, currentState, actorType, actorId, payload], index) => {
      const sealed = await sealCanonical(payload);
      const sequence = index + 1;
      return {
        id: `trace_event_${scope}_${sequence}`,
        workspaceId: input.workspaceId,
        traceId: ids.traceId,
        sequence,
        eventType,
        subjectType: "trace" as const,
        subjectId: ids.traceId,
        priorState,
        currentState,
        actorType,
        actorId,
        payloadJson: sealed.canonicalJson,
        payloadHash: sealed.sha256,
        idempotencyKey: `${STAGE_03_FIXTURE_KEY}:${input.workspaceId}:trace-event:${sequence}`,
        occurredAt: addMilliseconds(now, index * 2_000),
      };
    }),
  );

  return {
    ids,
    now,
    trace: { ...trace, currentState: "awaiting_approval" as const },
    evidence,
    contextSnapshot,
    reasoningNodes,
    outcomeDefinition,
    intentBundle,
    flightTraceEvents,
    stableStringify,
  };
}
