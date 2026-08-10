import type {
  CaseCommand,
  CaseSnapshot,
  CaseStage,
} from "../app/case-types";
import { getD1 } from ".";
import {
  ensureWorkspaceSchema,
  ownerCanAccessWorkspace,
} from "./workspaces";

const CASE_KEY = "CS-014" as const;
const CASE_TITLE = "Mobile Safari checkout regression after release";
const DEFAULT_ISSUE_TITLE =
  "Fix Mobile Safari checkout submission and add regression coverage";

type CaseRow = {
  id: string;
  case_key: typeof CASE_KEY;
  title: string;
  stage: number;
  cycle: number;
  issue_title: string;
  external_receipt_id: string | null;
  event_count: number;
  last_event_type: string | null;
  last_event_at: string | null;
  created_at: string;
};

type TransitionInput = {
  userId: string;
  workspaceId: string;
  command: CaseCommand;
  issueTitle?: string;
  reviewerNote?: string;
};

const transitions: Record<
  Exclude<CaseCommand, "reset_case">,
  {
    expected: CaseStage;
    target: CaseStage;
    eventType: string;
    gate?: "evidence" | "intervention" | "learning";
  }
> = {
  approve_evidence: {
    expected: 0,
    target: 1,
    eventType: "evidence_approved",
    gate: "evidence",
  },
  approve_intervention: {
    expected: 1,
    target: 2,
    eventType: "intervention_approved",
    gate: "intervention",
  },
  mark_implemented: {
    expected: 2,
    target: 3,
    eventType: "implementation_confirmed",
  },
  simulate_measurement: {
    expected: 3,
    target: 4,
    eventType: "measurement_completed",
  },
  accept_learning: {
    expected: 4,
    target: 5,
    eventType: "learning_accepted",
    gate: "learning",
  },
};

let schemaReady: Promise<void> | null = null;

async function initializeCaseSchema(): Promise<void> {
  await ensureWorkspaceSchema();
  const d1 = getD1();
  await d1.batch([
    d1.prepare(`CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY NOT NULL,
      workspace_id TEXT NOT NULL,
      case_key TEXT NOT NULL,
      title TEXT NOT NULL,
      stage INTEGER NOT NULL DEFAULT 0,
      cycle INTEGER NOT NULL DEFAULT 1,
      issue_title TEXT NOT NULL,
      external_receipt_id TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS case_events (
      id TEXT PRIMARY KEY NOT NULL,
      case_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      cycle INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      actor_user_id TEXT NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}',
      idempotency_key TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
      FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE RESTRICT
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY NOT NULL,
      case_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      cycle INTEGER NOT NULL,
      gate TEXT NOT NULL,
      payload_hash TEXT NOT NULL,
      approved_by TEXT NOT NULL,
      external_receipt_id TEXT,
      approved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
      FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE RESTRICT
    )`),
    d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_cases_workspace_case_key ON cases(workspace_id, case_key)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_cases_workspace_stage ON cases(workspace_id, stage)"),
    d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_case_events_workspace_idempotency ON case_events(workspace_id, idempotency_key)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_case_events_case_created_at ON case_events(case_id, created_at)"),
    d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_approvals_case_cycle_gate ON approvals(workspace_id, case_id, cycle, gate)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_approvals_case_id ON approvals(case_id)"),
    d1.prepare("PRAGMA optimize"),
  ]);
}

export async function ensureCaseSchema(): Promise<void> {
  schemaReady ??= initializeCaseSchema().catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

function toCaseStage(value: number): CaseStage {
  if (Number.isInteger(value) && value >= 0 && value <= 5) {
    return value as CaseStage;
  }
  throw new Error("Stored case stage is invalid.");
}

function receiptLabel(receiptId: string | null): string | null {
  if (!receiptId) return null;
  const match = receiptId.match(/#\d+$/);
  return match?.[0] ?? receiptId;
}

function toCaseSnapshot(row: CaseRow): CaseSnapshot {
  return {
    caseKey: row.case_key,
    title: row.title,
    stage: toCaseStage(row.stage),
    cycle: row.cycle,
    issueTitle: row.issue_title,
    externalReceiptLabel: receiptLabel(row.external_receipt_id),
    eventCount: Number(row.event_count),
    lastEventType: row.last_event_type ?? "case_materialized",
    lastEventAt: row.last_event_at ?? row.created_at,
  };
}

async function readSeededCase(workspaceId: string): Promise<CaseRow | null> {
  return getD1()
    .prepare(`SELECT
      c.id,
      c.case_key,
      c.title,
      c.stage,
      c.cycle,
      c.issue_title,
      c.external_receipt_id,
      c.created_at,
      COUNT(ce.id) AS event_count,
      (SELECT event_type FROM case_events latest
        WHERE latest.case_id = c.id
        ORDER BY latest.created_at DESC, latest.rowid DESC LIMIT 1) AS last_event_type,
      MAX(ce.created_at) AS last_event_at
    FROM cases c
    LEFT JOIN case_events ce ON ce.case_id = c.id
    WHERE c.workspace_id = ? AND c.case_key = ?
    GROUP BY c.id
    LIMIT 1`)
    .bind(workspaceId, CASE_KEY)
    .first<CaseRow>();
}

async function requireOwnedCase(
  userId: string,
  workspaceId: string,
): Promise<CaseRow> {
  const allowed = await ownerCanAccessWorkspace(userId, workspaceId);
  if (!allowed) throw new Error("Workspace access was denied.");
  const row = await readSeededCase(workspaceId);
  if (!row) throw new Error("Case could not be loaded.");
  return row;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function getOrCreateSeededCase(
  userId: string,
  workspaceId: string,
): Promise<CaseSnapshot> {
  await ensureCaseSchema();
  const allowed = await ownerCanAccessWorkspace(userId, workspaceId);
  if (!allowed) throw new Error("Workspace access was denied.");

  const d1 = getD1();
  const caseId = crypto.randomUUID();
  await d1
    .prepare(`INSERT OR IGNORE INTO cases (
      id, workspace_id, case_key, title, stage, cycle, issue_title, created_by
    ) VALUES (?, ?, ?, ?, 0, 1, ?, ?)`)
    .bind(
      caseId,
      workspaceId,
      CASE_KEY,
      CASE_TITLE,
      DEFAULT_ISSUE_TITLE,
      userId,
    )
    .run();

  const row = await readSeededCase(workspaceId);
  if (!row) throw new Error("Case could not be materialized.");

  await d1
    .prepare(`INSERT OR IGNORE INTO case_events (
      id, case_id, workspace_id, cycle, event_type, actor_user_id, payload_json, idempotency_key
    ) VALUES (?, ?, ?, 1, 'case_materialized', ?, ?, ?)`)
    .bind(
      crypto.randomUUID(),
      row.id,
      workspaceId,
      userId,
      JSON.stringify({ caseKey: CASE_KEY, source: "seeded_demo" }),
      `${row.id}:1:case_materialized`,
    )
    .run();

  const materialized = await readSeededCase(workspaceId);
  if (!materialized) throw new Error("Case could not be loaded.");
  return toCaseSnapshot(materialized);
}

async function resetSeededCase(
  input: TransitionInput,
  current: CaseRow,
): Promise<{ caseState: CaseSnapshot; reused: boolean }> {
  const nextCycle = current.cycle + 1;
  const idempotencyKey = `${current.id}:${nextCycle}:case_reset`;
  const d1 = getD1();

  await d1.batch([
    d1
      .prepare(`INSERT OR IGNORE INTO case_events (
        id, case_id, workspace_id, cycle, event_type, actor_user_id, payload_json, idempotency_key
      ) SELECT ?, id, workspace_id, ?, 'case_reset', ?, ?, ?
        FROM cases WHERE id = ? AND workspace_id = ? AND cycle = ?`)
      .bind(
        crypto.randomUUID(),
        nextCycle,
        input.userId,
        JSON.stringify({ reason: "manual_scan", previousStage: current.stage }),
        idempotencyKey,
        current.id,
        input.workspaceId,
        current.cycle,
      ),
    d1
      .prepare(`UPDATE cases SET
        stage = 0,
        cycle = ?,
        issue_title = ?,
        external_receipt_id = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND workspace_id = ? AND cycle = ?`)
      .bind(
        nextCycle,
        DEFAULT_ISSUE_TITLE,
        current.id,
        input.workspaceId,
        current.cycle,
      ),
  ]);

  const updated = await requireOwnedCase(input.userId, input.workspaceId);
  return {
    caseState: toCaseSnapshot(updated),
    reused: updated.cycle !== nextCycle,
  };
}

export async function transitionSeededCase(
  input: TransitionInput,
): Promise<{ caseState: CaseSnapshot; reused: boolean }> {
  await ensureCaseSchema();
  await getOrCreateSeededCase(input.userId, input.workspaceId);
  const current = await requireOwnedCase(input.userId, input.workspaceId);

  if (input.command === "reset_case") {
    return resetSeededCase(input, current);
  }

  const transition = transitions[input.command];
  if (current.stage !== transition.expected) {
    if (current.stage >= transition.target) {
      return { caseState: toCaseSnapshot(current), reused: true };
    }
    throw new Error("This case gate is not available yet.");
  }

  const issueTitle =
    input.command === "approve_intervention"
      ? input.issueTitle ?? current.issue_title
      : current.issue_title;
  const receiptId =
    input.command === "approve_intervention"
      ? `github:atlas/checkout#${183 + current.cycle}`
      : current.external_receipt_id;
  const payload = {
    caseKey: CASE_KEY,
    cycle: current.cycle,
    command: input.command,
    reviewerNote: input.reviewerNote,
    issueTitle,
    targetMetric: "paid_conversion_v3",
    cohort: "mobile_safari_paid",
    measurementWindowDays: 14,
  };
  const payloadJson = JSON.stringify(payload);
  const payloadHash = await sha256(payloadJson);
  const idempotencyKey = `${current.id}:${current.cycle}:${transition.eventType}`;
  const d1 = getD1();
  const eventStatement = d1
    .prepare(`INSERT OR IGNORE INTO case_events (
      id, case_id, workspace_id, cycle, event_type, actor_user_id, payload_json, idempotency_key
    ) SELECT ?, id, workspace_id, cycle, ?, ?, ?, ?
      FROM cases
      WHERE id = ? AND workspace_id = ? AND cycle = ? AND stage = ?`)
    .bind(
      crypto.randomUUID(),
      transition.eventType,
      input.userId,
      payloadJson,
      idempotencyKey,
      current.id,
      input.workspaceId,
      current.cycle,
      transition.expected,
    );
  const updateStatement = d1
    .prepare(`UPDATE cases SET
      stage = ?,
      issue_title = ?,
      external_receipt_id = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND workspace_id = ? AND cycle = ? AND stage = ?`)
    .bind(
      transition.target,
      issueTitle,
      receiptId,
      current.id,
      input.workspaceId,
      current.cycle,
      transition.expected,
    );

  let batchResults;
  if (transition.gate) {
    const approvalStatement = d1
      .prepare(`INSERT OR IGNORE INTO approvals (
        id, case_id, workspace_id, cycle, gate, payload_hash, approved_by, external_receipt_id
      ) SELECT ?, id, workspace_id, cycle, ?, ?, ?, ?
        FROM cases
        WHERE id = ? AND workspace_id = ? AND cycle = ? AND stage = ?`)
      .bind(
        crypto.randomUUID(),
        transition.gate,
        payloadHash,
        input.userId,
        receiptId,
        current.id,
        input.workspaceId,
        current.cycle,
        transition.expected,
      );
    batchResults = await d1.batch([
      approvalStatement,
      eventStatement,
      updateStatement,
    ]);
  } else {
    batchResults = await d1.batch([eventStatement, updateStatement]);
  }

  const updated = await requireOwnedCase(input.userId, input.workspaceId);
  if (updated.stage < transition.target) {
    throw new Error("The case changed before this gate was recorded. Try again.");
  }
  return {
    caseState: toCaseSnapshot(updated),
    reused: (batchResults.at(-1)?.meta.changes ?? 0) === 0,
  };
}
