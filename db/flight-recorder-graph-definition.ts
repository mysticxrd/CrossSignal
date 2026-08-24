export const REASONING_GRAPH_VERSION = "crosssignal-fixed-graph-v1";
export const REASONING_HANDLER_VERSION = "crosssignal-fixture-handlers-v1";
export const REASONING_ARTIFACT_SCHEMA_VERSION = "reasoning-artifact-v2";

export const REASONING_NODE_REGISTRY = Object.freeze([
  Object.freeze({
    nodeKey: "planner",
    role: "Scopes the reviewed onboarding-rescue playbook",
    predecessors: Object.freeze([]),
    artifactKind: "plan",
    citations: Object.freeze(["evidence:activation-drop", "evidence:onboarding-feedback"]),
  }),
  Object.freeze({
    nodeKey: "quantitative",
    role: "Checks the activation movement and cohort",
    predecessors: Object.freeze(["planner"]),
    artifactKind: "analysis",
    citations: Object.freeze(["evidence:activation-drop", "metric:activation-72h"]),
  }),
  Object.freeze({
    nodeKey: "qualitative",
    role: "Summarizes approved, redacted feedback",
    predecessors: Object.freeze(["planner"]),
    artifactKind: "analysis",
    citations: Object.freeze(["evidence:onboarding-feedback", "context:brand"]),
  }),
  Object.freeze({
    nodeKey: "experiment_design",
    role: "Pre-registers the TEST cohort and outcome",
    predecessors: Object.freeze(["planner"]),
    artifactKind: "analysis",
    citations: Object.freeze(["context:email-policy", "metric:activation-72h"]),
  }),
  Object.freeze({
    nodeKey: "skeptic",
    role: "Challenges causality and the traffic-quality alternative",
    predecessors: Object.freeze(["quantitative", "qualitative", "experiment_design"]),
    artifactKind: "critique",
    citations: Object.freeze(["evidence:activation-drop", "evidence:onboarding-feedback"]),
  }),
  Object.freeze({
    nodeKey: "synthesizer",
    role: "Drafts one bounded email action",
    predecessors: Object.freeze([
      "planner",
      "quantitative",
      "qualitative",
      "experiment_design",
      "skeptic",
    ]),
    artifactKind: "intent_draft",
    citations: Object.freeze([
      "evidence:activation-drop",
      "evidence:onboarding-feedback",
      "context:email-policy",
      "metric:activation-72h",
    ]),
  }),
] as const);

export type ReasoningNodeKey = (typeof REASONING_NODE_REGISTRY)[number]["nodeKey"];
