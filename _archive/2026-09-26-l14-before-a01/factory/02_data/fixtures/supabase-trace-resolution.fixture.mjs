import { createHash } from "node:crypto";
import {
  L14_TRACE_RESOLUTION_FIXTURE,
  l14FixtureDigest,
  validateL14Fixture,
} from "./l14-trace-resolution.fixture.mjs";

const FIXED_CREATED_AT = "2026-08-13T09:00:00.000Z";
const RETENTION_UNTIL = "2027-08-31T00:00:00.000Z";

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const ownerByWorkspace = new Map([
  [L14_TRACE_RESOLUTION_FIXTURE.identity.workspaceA, L14_TRACE_RESOLUTION_FIXTURE.identity.ownerA.userId],
  [L14_TRACE_RESOLUTION_FIXTURE.identity.workspaceB, L14_TRACE_RESOLUTION_FIXTURE.identity.ownerB.userId],
]);

const workspaces = L14_TRACE_RESOLUTION_FIXTURE.memberships.map(({ workspaceId, userId }) => ({
  id: workspaceId,
  name: workspaceId,
  slug: workspaceId,
  owner_user_id: userId,
  created_at: FIXED_CREATED_AT,
  updated_at: FIXED_CREATED_AT,
}));

const workspaceMembers = L14_TRACE_RESOLUTION_FIXTURE.memberships.map((row) => ({
  workspace_id: row.workspaceId,
  user_id: row.userId,
  role: row.role,
  joined_at: FIXED_CREATED_AT,
}));

const sourceTraces = Object.values(L14_TRACE_RESOLUTION_FIXTURE.traces);
const flightTraces = sourceTraces.map((trace) => ({
  id: trace.id,
  workspace_id: trace.workspaceId,
  trace_key: trace.traceKey,
  fixture_key: L14_TRACE_RESOLUTION_FIXTURE.version,
  truth_mode: "FIXTURE",
  current_state: trace.state,
  active_intent_id: [...trace.rows].reverse().find(({ subjectType }) => subjectType === "intent")?.subjectId ?? null,
  retention_class: "review_evidence",
  retention_until: RETENTION_UNTIL,
  created_by: ownerByWorkspace.get(trace.workspaceId),
  created_at: FIXED_CREATED_AT,
  updated_at: trace.rows.at(-1)?.occurredAt ?? FIXED_CREATED_AT,
}));

const flightTraceEvents = sourceTraces.flatMap((trace) => trace.rows.map((row) => ({
  id: row.id,
  workspace_id: row.workspaceId,
  trace_id: row.traceId,
  sequence: row.sequence,
  event_type: row.eventType,
  subject_type: row.subjectType,
  subject_id: row.subjectId,
  prior_state: row.priorState,
  current_state: row.currentState,
  actor_type: row.actorType,
  actor_id: row.actorType === "human" ? ownerByWorkspace.get(row.workspaceId) : row.actorId,
  payload_json: JSON.parse(row.payloadJson),
  payload_hash: row.payloadHash,
  idempotency_key: row.idempotencyKey,
  occurred_at: row.occurredAt,
})));

const tables = Object.freeze({
  workspaces: Object.freeze(workspaces),
  workspace_members: Object.freeze(workspaceMembers),
  flight_traces: Object.freeze(flightTraces),
  flight_trace_events: Object.freeze(flightTraceEvents),
});

const tableDigests = Object.freeze(Object.fromEntries(
  Object.entries(tables).map(([name, rows]) => [name, sha256(stableStringify(rows))]),
));

export const SUPABASE_TRACE_RESOLUTION_FIXTURE = Object.freeze({
  version: "supabase-trace-resolution-fixture-v1",
  truthMode: "FIXTURE",
  targetEnvironment: "TEST",
  sourceVersion: L14_TRACE_RESOLUTION_FIXTURE.version,
  sourceDigest: l14FixtureDigest(L14_TRACE_RESOLUTION_FIXTURE),
  tables,
  counts: Object.freeze(Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, rows.length]))),
  tableDigests,
  packageDigest: sha256(stableStringify({ source: l14FixtureDigest(L14_TRACE_RESOLUTION_FIXTURE), tableDigests })),
});

export function validateSupabaseTraceResolutionFixture(fixture = SUPABASE_TRACE_RESOLUTION_FIXTURE) {
  const errors = [...validateL14Fixture(L14_TRACE_RESOLUTION_FIXTURE)];
  if (fixture.truthMode !== "FIXTURE" || fixture.targetEnvironment !== "TEST") errors.push("truth labels drifted");
  if (fixture.sourceDigest !== l14FixtureDigest(L14_TRACE_RESOLUTION_FIXTURE)) errors.push("source digest drifted");
  if (fixture.counts.workspaces !== 2 || fixture.counts.workspace_members !== 2 || fixture.counts.flight_traces !== 2 || fixture.counts.flight_trace_events !== 77) errors.push("table counts drifted");

  const memberKeys = new Set(fixture.tables.workspace_members.map((row) => `${row.workspace_id}\0${row.user_id}\0${row.role}`));
  const traceKeys = new Set(fixture.tables.flight_traces.map((row) => `${row.workspace_id}\0${row.id}`));
  const eventIds = new Set();
  const idempotencyKeys = new Set();
  for (const trace of fixture.tables.flight_traces) {
    if (!memberKeys.has(`${trace.workspace_id}\0${trace.created_by}\0owner`)) errors.push(`trace creator is not an owner: ${trace.id}`);
    if (trace.truth_mode !== "FIXTURE" || !trace.fixture_key) errors.push(`trace truth label drifted: ${trace.id}`);
  }
  for (const trace of fixture.tables.flight_traces) {
    const rows = fixture.tables.flight_trace_events.filter((row) => row.workspace_id === trace.workspace_id && row.trace_id === trace.id);
    rows.forEach((row, index) => {
      if (row.sequence !== index + 1) errors.push(`event sequence drifted: ${trace.id}`);
      if (!/^[0-9a-f]{64}$/.test(row.payload_hash)) errors.push(`payload hash is malformed: ${row.id}`);
      if (!traceKeys.has(`${row.workspace_id}\0${row.trace_id}`)) errors.push(`event trace binding drifted: ${row.id}`);
      if (row.actor_type === "human" && !memberKeys.has(`${row.workspace_id}\0${row.actor_id}\0owner`)) errors.push(`human actor is not an owner: ${row.id}`);
      if (eventIds.has(row.id)) errors.push(`duplicate event id: ${row.id}`);
      if (idempotencyKeys.has(`${row.workspace_id}\0${row.idempotency_key}`)) errors.push(`duplicate idempotency key: ${row.id}`);
      eventIds.add(row.id);
      idempotencyKeys.add(`${row.workspace_id}\0${row.idempotency_key}`);
    });
  }
  for (const [name, rows] of Object.entries(fixture.tables)) {
    if (fixture.tableDigests[name] !== sha256(stableStringify(rows))) errors.push(`${name} digest drifted`);
  }
  return [...new Set(errors)];
}
