import type {
  CaseCommand,
  CaseEventSnapshot,
  CaseSnapshot,
  CaseStage,
  EvidenceItem,
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

type EvidenceSeed = Omit<
  EvidenceItem,
  "id" | "stamp" | "hash" | "ingested"
> & {
  evidenceKey: string;
  ingestedAt: string;
};

const evidenceSeeds: EvidenceSeed[] = [
  {
    evidenceKey: "EV-01",
    source: "PostHog",
    sourceClass: "source-posthog",
    eyebrow: "PRODUCT ANALYTICS",
    title: "Mobile Safari paid conversion",
    value: "4.8%",
    delta: "−22.4%",
    detail:
      "Paid conversion fell from 6.2% to 4.8% across comparable seven-day windows. 184 eligible sessions were observed after the release.",
    query:
      "funnel(landing_view → checkout_success) · browser = Mobile Safari · campaign = summer_launch",
    observed: "24 Jul – 7 Aug 2026",
    ingestedAt: "2026-08-08 02:14:00",
    identityLevel: "Aggregate · no person-level join",
    relation: "supports",
  },
  {
    evidenceKey: "EV-02",
    source: "Stripe",
    sourceClass: "source-stripe",
    eyebrow: "REVENUE",
    title: "Net-new test revenue",
    value: "$3,420",
    delta: "−17.1%",
    detail:
      "Net-new test-mode revenue declined for the same campaign cohort. Refunds and plan mix stayed within the normal range.",
    query:
      "sum(net_amount) · livemode = false · linked cohort = summer_launch · currency = USD",
    observed: "24 Jul – 7 Aug 2026",
    ingestedAt: "2026-08-08 02:16:00",
    identityLevel: "Aggregate · no person-level join",
    relation: "supports",
  },
  {
    evidenceKey: "EV-03",
    source: "Support import",
    sourceClass: "source-support",
    eyebrow: "CUSTOMER VOICE",
    title: "Checkout failure theme",
    value: "3 messages",
    delta: "7 days",
    detail:
      "Three independent, synthetic support records mention the checkout button failing or stalling on iPhone devices.",
    query:
      "taxonomy.checkout_failure v3 · distinct source records · device terms: iPhone, Safari",
    observed: "2 Aug – 7 Aug 2026",
    ingestedAt: "2026-08-08 02:19:00",
    identityLevel: "Record-level · synthetic identities removed",
    relation: "supports",
  },
  {
    evidenceKey: "EV-04",
    source: "GitHub",
    sourceClass: "source-github",
    eyebrow: "RELEASE ACTIVITY",
    title: "Checkout UI release",
    value: "PR #181",
    delta: "+19h",
    detail:
      "A checkout interaction change reached production nineteen hours before the regression window began.",
    query:
      "repo:atlas/checkout · merged PRs touching /checkout · deployment environment = production",
    observed: "31 Jul 2026, 16:42 UTC",
    ingestedAt: "2026-08-08 02:21:00",
    identityLevel: "Repository metadata · no private diff stored",
    relation: "supports",
  },
  {
    evidenceKey: "EV-05",
    source: "PostHog",
    sourceClass: "source-posthog",
    eyebrow: "SKEPTIC CHECK",
    title: "Desktop conversion held",
    value: "6.4%",
    delta: "+0.3%",
    detail:
      "Desktop paid conversion remained flat, which argues against a campaign-wide traffic-quality explanation.",
    query:
      "funnel(landing_view → checkout_success) · browser family = Desktop · campaign = summer_launch",
    observed: "24 Jul – 7 Aug 2026",
    ingestedAt: "2026-08-08 02:14:00",
    identityLevel: "Aggregate · no person-level join",
    relation: "contradicts",
  },
];

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

type EvidenceRow = {
  evidence_key: string;
  source: string;
  source_class: EvidenceItem["sourceClass"];
  eyebrow: string;
  title: string;
  display_value: string;
  delta: string;
  detail: string;
  query_text: string;
  observed_window: string;
  ingested_at: string;
  content_hash: string;
  identity_level: string;
  relation: EvidenceItem["relation"];
};

type EventRow = {
  id: string;
  event_type: string;
  cycle: number;
  payload_json: string;
  created_at: string;
  actor_name: string;
  approval_hash: string | null;
  external_receipt_id: string | null;
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
    d1.prepare(`CREATE TABLE IF NOT EXISTS evidence_observations (
      id TEXT PRIMARY KEY NOT NULL,
      workspace_id TEXT NOT NULL,
      evidence_key TEXT NOT NULL,
      source TEXT NOT NULL,
      source_class TEXT NOT NULL,
      eyebrow TEXT NOT NULL,
      title TEXT NOT NULL,
      display_value TEXT NOT NULL,
      delta TEXT NOT NULL,
      detail TEXT NOT NULL,
      query_text TEXT NOT NULL,
      observed_window TEXT NOT NULL,
      ingested_at TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      identity_level TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
    )`),
    d1.prepare(`CREATE TABLE IF NOT EXISTS case_evidence (
      case_id TEXT NOT NULL,
      evidence_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      relation TEXT NOT NULL,
      position INTEGER NOT NULL,
      linked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (case_id, evidence_id),
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
      FOREIGN KEY (evidence_id) REFERENCES evidence_observations(id) ON DELETE RESTRICT,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    )`),
    d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_cases_workspace_case_key ON cases(workspace_id, case_key)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_cases_workspace_stage ON cases(workspace_id, stage)"),
    d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_case_events_workspace_idempotency ON case_events(workspace_id, idempotency_key)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_case_events_case_created_at ON case_events(case_id, created_at)"),
    d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_approvals_case_cycle_gate ON approvals(workspace_id, case_id, cycle, gate)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_approvals_case_id ON approvals(case_id)"),
    d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_evidence_observations_workspace_key ON evidence_observations(workspace_id, evidence_key)"),
    d1.prepare("CREATE INDEX IF NOT EXISTS idx_case_evidence_workspace_case ON case_evidence(workspace_id, case_id)"),
    d1.prepare(`CREATE TRIGGER IF NOT EXISTS trg_evidence_observations_immutable
      BEFORE UPDATE ON evidence_observations
      BEGIN
        SELECT RAISE(ABORT, 'evidence observations are immutable');
      END`),
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

function formatUtcTimestamp(value: string): string {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/,
  );
  if (!match) return value;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${Number(match[3])} ${months[Number(match[2]) - 1]} ${match[1]} · ${match[4]}:${match[5]} UTC`;
}

async function seedCaseEvidence(
  userId: string,
  workspaceId: string,
  caseId: string,
): Promise<void> {
  const d1 = getD1();
  const existing = await d1
    .prepare("SELECT COUNT(*) AS count FROM case_evidence WHERE case_id = ? AND workspace_id = ?")
    .bind(caseId, workspaceId)
    .first<{ count: number }>();

  if (Number(existing?.count ?? 0) < evidenceSeeds.length) {
    const seeded = await Promise.all(
      evidenceSeeds.map(async (item) => ({
        ...item,
        contentHash: await sha256(
          JSON.stringify({ ...item, relation: undefined }),
        ),
      })),
    );
    const statements = seeded.flatMap((item, index) => [
      d1
        .prepare(`INSERT OR IGNORE INTO evidence_observations (
          id, workspace_id, evidence_key, source, source_class, eyebrow, title,
          display_value, delta, detail, query_text, observed_window, ingested_at,
          content_hash, identity_level, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(
          crypto.randomUUID(),
          workspaceId,
          item.evidenceKey,
          item.source,
          item.sourceClass,
          item.eyebrow,
          item.title,
          item.value,
          item.delta,
          item.detail,
          item.query,
          item.observed,
          item.ingestedAt,
          item.contentHash,
          item.identityLevel,
          userId,
        ),
      d1
        .prepare(`INSERT OR IGNORE INTO case_evidence (
          case_id, evidence_id, workspace_id, relation, position
        ) SELECT ?, id, ?, ?, ?
          FROM evidence_observations
          WHERE workspace_id = ? AND evidence_key = ?`)
        .bind(
          caseId,
          workspaceId,
          item.relation,
          index + 1,
          workspaceId,
          item.evidenceKey,
        ),
    ]);

    await d1.batch(statements);
  }
  await d1
    .prepare(`INSERT OR IGNORE INTO case_events (
      id, case_id, workspace_id, cycle, event_type, actor_user_id, payload_json, idempotency_key
    ) SELECT ?, id, workspace_id, cycle, 'evidence_registered', ?, ?, ?
      FROM cases WHERE id = ? AND workspace_id = ?`)
    .bind(
      crypto.randomUUID(),
      userId,
      JSON.stringify({ observationCount: evidenceSeeds.length, registryVersion: 1 }),
      `${caseId}:evidence_registered:v1`,
      caseId,
      workspaceId,
    )
    .run();
}

function parseEventPayload(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function payloadText(
  payload: Record<string, unknown>,
  key: string,
): string | null {
  return typeof payload[key] === "string" ? payload[key] : null;
}

function eventPresentation(
  row: EventRow,
): Pick<CaseEventSnapshot, "label" | "detail" | "kind"> {
  const payload = parseEventPayload(row.payload_json);
  switch (row.event_type) {
    case "case_materialized":
      return {
        label: "Fixture case materialized",
        detail: "Versioned fixture decision case created inside this workspace.",
        kind: "system",
      };
    case "evidence_registered":
      return {
        label: "Fixture evidence registered",
        detail: "Five immutable D1 fixture observations linked to the case.",
        kind: "system",
      };
    case "case_reset":
      return {
        label: "Fixture cycle reset",
        detail: "A new D1 review cycle opened without running a detector or deleting prior events.",
        kind: "system",
      };
    case "evidence_approved":
      return {
        label: "Fixture evidence approved",
        detail:
          payloadText(payload, "reviewerNote") ??
          "Evidence threshold accepted for intervention planning.",
        kind: "review",
      };
    case "intervention_approved":
      return {
        label: "Fixture intervention approved",
        detail: `One fixture issue payload saved with no external write: ${payloadText(payload, "issueTitle") ?? "scoped checkout fix"}.`,
        kind: "action",
      };
    case "implementation_confirmed":
      return {
        label: "Fixture implementation confirmed",
        detail: "The owner recorded the frozen fixture implementation and cohort attestation.",
        kind: "action",
      };
    case "measurement_completed":
      return {
        label: "Simulated-time outcome saved",
        detail: "The fixture outcome improved by 18.7% across 73 synthetic eligible sessions.",
        kind: "measurement",
      };
    case "learning_accepted":
      return {
        label: "Fixture learning event accepted",
        detail: "The D1 event is saved; no canonical ICM Company Brain was changed.",
        kind: "learning",
      };
    default:
      return {
        label: row.event_type.replaceAll("_", " "),
        detail: "Attributed case event stored in the workspace ledger.",
        kind: "system",
      };
  }
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

  await seedCaseEvidence(userId, workspaceId, row.id);

  const materialized = await readSeededCase(workspaceId);
  if (!materialized) throw new Error("Case could not be loaded.");
  return toCaseSnapshot(materialized);
}

export async function listCaseEvidence(
  userId: string,
  workspaceId: string,
): Promise<EvidenceItem[]> {
  await ensureCaseSchema();
  const current = await requireOwnedCase(userId, workspaceId);
  const result = await getD1()
    .prepare(`SELECT
      eo.evidence_key,
      eo.source,
      eo.source_class,
      eo.eyebrow,
      eo.title,
      eo.display_value,
      eo.delta,
      eo.detail,
      eo.query_text,
      eo.observed_window,
      eo.ingested_at,
      eo.content_hash,
      eo.identity_level,
      ce.relation
    FROM case_evidence ce
    INNER JOIN evidence_observations eo ON eo.id = ce.evidence_id
    WHERE ce.case_id = ? AND ce.workspace_id = ?
    ORDER BY ce.position ASC`)
    .bind(current.id, workspaceId)
    .all<EvidenceRow>();

  return result.results.map((row) => ({
    id: row.evidence_key.toLowerCase(),
    stamp: row.evidence_key.replace("-", "–"),
    source: row.source,
    sourceClass: row.source_class,
    eyebrow: row.eyebrow,
    title: row.title,
    value: row.display_value,
    delta: row.delta,
    detail: row.detail,
    query: row.query_text,
    observed: row.observed_window,
    ingested: formatUtcTimestamp(row.ingested_at),
    hash: `sha256:${row.content_hash}`,
    identityLevel: row.identity_level,
    relation: row.relation,
  }));
}

export async function listCaseEvents(
  userId: string,
  workspaceId: string,
): Promise<CaseEventSnapshot[]> {
  await ensureCaseSchema();
  const current = await requireOwnedCase(userId, workspaceId);
  const result = await getD1()
    .prepare(`SELECT
      ce.id,
      ce.event_type,
      ce.cycle,
      ce.payload_json,
      ce.created_at,
      u.display_name AS actor_name,
      a.payload_hash AS approval_hash,
      a.external_receipt_id
    FROM case_events ce
    INNER JOIN users u ON u.id = ce.actor_user_id
    LEFT JOIN approvals a
      ON a.case_id = ce.case_id
      AND a.cycle = ce.cycle
      AND a.gate = CASE ce.event_type
        WHEN 'evidence_approved' THEN 'evidence'
        WHEN 'intervention_approved' THEN 'intervention'
        WHEN 'learning_accepted' THEN 'learning'
        ELSE NULL
      END
    WHERE ce.case_id = ? AND ce.workspace_id = ?
    ORDER BY ce.created_at DESC, ce.rowid DESC
    LIMIT 50`)
    .bind(current.id, workspaceId)
    .all<EventRow>();

  return result.results.map((row) => {
    const presentation = eventPresentation(row);
    return {
      id: row.id,
      eventType: row.event_type,
      label: presentation.label,
      detail: presentation.detail,
      actorName: row.actor_name,
      cycle: row.cycle,
      occurredAt: formatUtcTimestamp(row.created_at),
      approvalHash: row.approval_hash,
      receiptLabel: receiptLabel(row.external_receipt_id),
      kind: presentation.kind,
    };
  });
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
      ? `fixture-github:atlas/checkout#${183 + current.cycle}`
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
