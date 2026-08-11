export type CaseStage = 0 | 1 | 2 | 3 | 4 | 5;

export type CaseCommand =
  | "approve_evidence"
  | "approve_intervention"
  | "mark_implemented"
  | "simulate_measurement"
  | "accept_learning"
  | "reset_case";

export type CaseSnapshot = {
  caseKey: "CS-014";
  title: string;
  stage: CaseStage;
  cycle: number;
  issueTitle: string;
  externalReceiptLabel: string | null;
  eventCount: number;
  lastEventType: string;
  lastEventAt: string;
};

export type EvidenceItem = {
  id: string;
  stamp: string;
  source: string;
  sourceClass:
    | "source-posthog"
    | "source-stripe"
    | "source-support"
    | "source-github";
  eyebrow: string;
  title: string;
  value: string;
  delta: string;
  detail: string;
  query: string;
  observed: string;
  ingested: string;
  hash: string;
  identityLevel: string;
  relation: "supports" | "contradicts";
};

export type CaseEventSnapshot = {
  id: string;
  eventType: string;
  label: string;
  detail: string;
  actorName: string;
  cycle: number;
  occurredAt: string;
  approvalHash: string | null;
  receiptLabel: string | null;
  kind: "system" | "review" | "action" | "measurement" | "learning";
};

export type CaseActionResult =
  | { ok: true; caseState: CaseSnapshot; reused: boolean }
  | { ok: false; error: string };
