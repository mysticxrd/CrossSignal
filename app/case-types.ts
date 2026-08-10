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

export type CaseActionResult =
  | { ok: true; caseState: CaseSnapshot; reused: boolean }
  | { ok: false; error: string };
