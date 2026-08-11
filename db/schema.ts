import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const workspaces = sqliteTable(
  "workspaces",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_workspaces_slug").on(table.slug),
    index("idx_workspaces_owner_user_id").on(table.ownerUserId),
  ],
);

export const workspaceMembers = sqliteTable(
  "workspace_members",
  {
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner"] }).notNull(),
    joinedAt: text("joined_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.userId] }),
    index("idx_workspace_members_user_id").on(table.userId),
    check("chk_workspace_members_role", sql`${table.role} = 'owner'`),
  ],
);

export const cases = sqliteTable(
  "cases",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    caseKey: text("case_key").notNull(),
    title: text("title").notNull(),
    stage: integer("stage").notNull().default(0),
    cycle: integer("cycle").notNull().default(1),
    issueTitle: text("issue_title").notNull(),
    externalReceiptId: text("external_receipt_id"),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_cases_workspace_case_key").on(
      table.workspaceId,
      table.caseKey,
    ),
    uniqueIndex("idx_cases_workspace_id").on(table.workspaceId, table.id),
    index("idx_cases_workspace_stage").on(table.workspaceId, table.stage),
    foreignKey({
      name: "fk_cases_workspace_creator_membership",
      columns: [table.workspaceId, table.createdBy],
      foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.userId],
    }),
    check("chk_cases_stage", sql`${table.stage} BETWEEN 0 AND 5`),
    check("chk_cases_cycle", sql`${table.cycle} >= 1`),
  ],
);

export const caseEvents = sqliteTable(
  "case_events",
  {
    id: text("id").primaryKey(),
    caseId: text("case_id").notNull(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    cycle: integer("cycle").notNull(),
    eventType: text("event_type").notNull(),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    payloadJson: text("payload_json").notNull().default("{}"),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_case_events_workspace_idempotency").on(
      table.workspaceId,
      table.idempotencyKey,
    ),
    index("idx_case_events_case_created_at").on(table.caseId, table.createdAt),
    foreignKey({
      name: "fk_case_events_workspace_case",
      columns: [table.workspaceId, table.caseId],
      foreignColumns: [cases.workspaceId, cases.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_case_events_workspace_actor_membership",
      columns: [table.workspaceId, table.actorUserId],
      foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.userId],
    }),
    check("chk_case_events_cycle", sql`${table.cycle} >= 1`),
  ],
);

export const approvals = sqliteTable(
  "approvals",
  {
    id: text("id").primaryKey(),
    caseId: text("case_id").notNull(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    cycle: integer("cycle").notNull(),
    gate: text("gate", {
      enum: ["evidence", "intervention", "learning"],
    }).notNull(),
    payloadHash: text("payload_hash").notNull(),
    approvedBy: text("approved_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    externalReceiptId: text("external_receipt_id"),
    approvedAt: text("approved_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_approvals_case_cycle_gate").on(
      table.workspaceId,
      table.caseId,
      table.cycle,
      table.gate,
    ),
    index("idx_approvals_case_id").on(table.caseId),
    foreignKey({
      name: "fk_approvals_workspace_case",
      columns: [table.workspaceId, table.caseId],
      foreignColumns: [cases.workspaceId, cases.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_approvals_workspace_approver_membership",
      columns: [table.workspaceId, table.approvedBy],
      foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.userId],
    }),
    check("chk_approvals_cycle", sql`${table.cycle} >= 1`),
    check(
      "chk_approvals_gate",
      sql`${table.gate} IN ('evidence', 'intervention', 'learning')`,
    ),
  ],
);

export const evidenceObservations = sqliteTable(
  "evidence_observations",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    evidenceKey: text("evidence_key").notNull(),
    source: text("source").notNull(),
    sourceClass: text("source_class", {
      enum: [
        "source-posthog",
        "source-stripe",
        "source-support",
        "source-github",
      ],
    }).notNull(),
    eyebrow: text("eyebrow").notNull(),
    title: text("title").notNull(),
    displayValue: text("display_value").notNull(),
    delta: text("delta").notNull(),
    detail: text("detail").notNull(),
    queryText: text("query_text").notNull(),
    observedWindow: text("observed_window").notNull(),
    ingestedAt: text("ingested_at").notNull(),
    contentHash: text("content_hash").notNull(),
    identityLevel: text("identity_level").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("idx_evidence_observations_workspace_key").on(
      table.workspaceId,
      table.evidenceKey,
    ),
    uniqueIndex("idx_evidence_observations_workspace_id").on(
      table.workspaceId,
      table.id,
    ),
    foreignKey({
      name: "fk_evidence_workspace_creator_membership",
      columns: [table.workspaceId, table.createdBy],
      foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.userId],
    }),
    check(
      "chk_evidence_source_class",
      sql`${table.sourceClass} IN ('source-posthog', 'source-stripe', 'source-support', 'source-github')`,
    ),
  ],
);

export const caseEvidence = sqliteTable(
  "case_evidence",
  {
    caseId: text("case_id").notNull(),
    evidenceId: text("evidence_id").notNull(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    relation: text("relation", {
      enum: ["supports", "contradicts"],
    }).notNull(),
    position: integer("position").notNull(),
    linkedAt: text("linked_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({ columns: [table.caseId, table.evidenceId] }),
    index("idx_case_evidence_workspace_case").on(
      table.workspaceId,
      table.caseId,
    ),
    foreignKey({
      name: "fk_case_evidence_workspace_case",
      columns: [table.workspaceId, table.caseId],
      foreignColumns: [cases.workspaceId, cases.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_case_evidence_workspace_evidence",
      columns: [table.workspaceId, table.evidenceId],
      foreignColumns: [
        evidenceObservations.workspaceId,
        evidenceObservations.id,
      ],
    }).onDelete("restrict"),
    check(
      "chk_case_evidence_relation",
      sql`${table.relation} IN ('supports', 'contradicts')`,
    ),
    check("chk_case_evidence_position", sql`${table.position} >= 1`),
  ],
);
