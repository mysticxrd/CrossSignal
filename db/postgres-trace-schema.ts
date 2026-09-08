import {
  bigint,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const cfrApp = pgSchema("cfr_app");

export const postgresWorkspaces = cfrApp.table("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  ownerUserId: text("owner_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
});

export const postgresWorkspaceMembers = cfrApp.table(
  "workspace_members",
  {
    workspaceId: text("workspace_id").notNull(),
    userId: text("user_id").notNull(),
    role: text("role").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.workspaceId, table.userId] })],
);

export const postgresFlightTraces = cfrApp.table("flight_traces", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  traceKey: text("trace_key").notNull(),
  fixtureKey: text("fixture_key"),
  truthMode: text("truth_mode").notNull(),
  currentState: text("current_state").notNull(),
  activeIntentId: text("active_intent_id"),
  retentionClass: text("retention_class").notNull(),
  retentionUntil: timestamp("retention_until", { withTimezone: true, mode: "date" }).notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
});

export const postgresFlightTraceEvents = cfrApp.table("flight_trace_events", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  traceId: text("trace_id").notNull(),
  sequence: bigint("sequence", { mode: "number" }).notNull(),
  eventType: text("event_type").notNull(),
  subjectType: text("subject_type").notNull(),
  subjectId: text("subject_id").notNull(),
  priorState: text("prior_state"),
  currentState: text("current_state").notNull(),
  actorType: text("actor_type").notNull(),
  actorId: text("actor_id"),
  payloadJson: jsonb("payload_json").notNull(),
  payloadHash: text("payload_hash").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" }).notNull(),
});
