import { createHash } from "node:crypto";
import {
  L04_AUTHORITY_TRACE_FIXTURE,
  L04_PROJECTION_DETAIL_ALLOWLIST,
} from "../../../tests/fixtures/l04-authority-trace.fixture.mjs";

const deepFreeze = (value) => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
};

const stableStringify = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export const L14_ROUTE = "/api/workspaces/{workspaceId}/traces/{traceId}";
export const L14_SCHEMA_VERSION = "l14.trace-resolution.v1";
export const L14_CACHE_CONTROL = "private, no-store";
export const L14_IDENTIFIER_PATTERN = "^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$";

export const L14_SUCCESS_KEYS = deepFreeze([
  "complete",
  "eventCount",
  "events",
  "schemaVersion",
  "trace",
  "workspaceRef",
]);
export const L14_TRACE_KEYS = deepFreeze(["id", "state", "traceKey", "truthMode"]);
export const L14_EVENT_KEYS = deepFreeze([
  "actorDisplay",
  "actorType",
  "currentState",
  "details",
  "eventType",
  "id",
  "occurredAt",
  "payloadHash",
  "priorState",
  "sequence",
  "subjectRef",
  "subjectType",
]);
export const L14_ERROR_KEYS = deepFreeze(["error"]);
export const L14_ERROR_DETAIL_KEYS = deepFreeze(["code"]);

const identity = deepFreeze({
  ownerA: {
    userId: "l14-owner-a",
    email: "owner-a@example.test",
    headers: {
      "oai-authenticated-user-id": "l14-owner-a",
      "oai-authenticated-user-email": "owner-a@example.test",
      "oai-authenticated-user-full-name": "Owner%20A",
      "oai-authenticated-user-full-name-encoding": "percent-encoded-utf-8",
    },
  },
  ownerB: {
    userId: "l14-owner-b",
    email: "owner-b@example.test",
    headers: {
      "oai-authenticated-user-id": "l14-owner-b",
      "oai-authenticated-user-email": "owner-b@example.test",
      "oai-authenticated-user-full-name": "Owner%20B",
      "oai-authenticated-user-full-name-encoding": "percent-encoded-utf-8",
    },
  },
  workspaceA: "l14-workspace-a",
  workspaceB: "l14-workspace-b",
  traceA: "l14-trace-a",
  traceB: "l14-trace-b",
});

const l04SourceRows = L04_AUTHORITY_TRACE_FIXTURE.traceEvents;
const graphTemplates = l04SourceRows.filter((row) => row.subjectType === "graph");
const additionalGraphRows = [
  "quantitative",
  "qualitative",
  "experiment_design",
  "skeptic",
  "synthesizer",
].flatMap((nodeKey) => graphTemplates.map((template) => {
  const payload = JSON.parse(template.payloadJson);
  payload.nodeKey = nodeKey;
  if (payload.outputHash) payload.outputHash = sha256(`l14-${nodeKey}-output`);
  const payloadJson = stableStringify(payload);
  return {
    ...template,
    id: `trace_event_l14_${nodeKey}_${template.currentState}`,
    subjectId: `node_l14_${nodeKey}_attempt_1`,
    payloadJson,
    payloadHash: sha256(payloadJson),
  };
}));
const graphInsertion = l04SourceRows.findIndex((row) => row.eventType === "intent.drafted");
const sourceRows = [
  ...l04SourceRows.slice(0, graphInsertion),
  ...additionalGraphRows,
  ...l04SourceRows.slice(graphInsertion),
].map((row, index) => ({
  ...row,
  sequence: index + 1,
  occurredAt: new Date(Date.parse("2026-08-13T09:00:00.000Z") + (index + 1) * 1_000).toISOString(),
  idempotencyKey: `l14:${row.workspaceId}:${row.traceId}:${index + 1}`,
}));
const actorDisplay = {
  human: "Workspace owner",
  system: "CrossSignal system",
  agent: "Bounded reasoning agent",
  adapter: "Labeled adapter",
};
const sourceProjection = sourceRows.map((row) => {
  const payload = JSON.parse(row.payloadJson);
  const allowed = new Set(L04_PROJECTION_DETAIL_ALLOWLIST[row.subjectType] ?? []);
  return {
    id: row.id,
    sequence: row.sequence,
    eventType: row.eventType,
    subjectType: row.subjectType,
    subjectRef: row.subjectId,
    priorState: row.priorState,
    currentState: row.currentState,
    actorType: row.actorType,
    actorDisplay: actorDisplay[row.actorType],
    occurredAt: row.occurredAt,
    payloadHash: row.payloadHash,
    details: Object.fromEntries(Object.entries(payload).filter(([key]) => allowed.has(key))),
  };
});
const pendingLength = sourceRows.findIndex((row) => row.eventType === "trace.awaiting_approval") + 1;

function rowsFor(workspaceId, traceId, suffix, limit = sourceRows.length) {
  return sourceRows.slice(0, limit).map((row) => ({
    ...row,
    id: `${row.id}_${suffix}`,
    workspaceId,
    traceId,
  }));
}

function projectionFor(suffix, limit = sourceProjection.length) {
  return sourceProjection.slice(0, limit).map((event) => ({
    ...event,
    id: `${event.id}_${suffix}`,
  }));
}

const traces = deepFreeze({
  pendingA: {
    id: identity.traceA,
    workspaceId: identity.workspaceA,
    traceKey: "l14-pending-trace-a",
    state: "awaiting_approval",
    truthMode: "FIXTURE",
    rows: rowsFor(identity.workspaceA, identity.traceA, "pending_a", pendingLength),
  },
  completedB: {
    id: identity.traceB,
    workspaceId: identity.workspaceB,
    traceKey: "l14-completed-trace-b",
    state: "assessed",
    truthMode: "FIXTURE",
    rows: rowsFor(identity.workspaceB, identity.traceB, "completed_b"),
  },
});

function successResponse(trace, events) {
  return {
    schemaVersion: L14_SCHEMA_VERSION,
    workspaceRef: trace.workspaceId,
    trace: {
      id: trace.id,
      traceKey: trace.traceKey,
      state: trace.state,
      truthMode: trace.truthMode,
    },
    eventCount: events.length,
    events,
    complete: true,
  };
}

const success = deepFreeze({
  pendingA: successResponse(traces.pendingA, projectionFor("pending_a", pendingLength)),
  completedB: successResponse(traces.completedB, projectionFor("completed_b")),
});

export const L14_ERRORS = deepFreeze({
  invalid: { status: 400, body: { error: { code: "invalid_trace_request" } } },
  unauthenticated: { status: 401, body: { error: { code: "authentication_required" } } },
  notFound: { status: 404, body: { error: { code: "trace_not_found" } } },
  incomplete: { status: 409, body: { error: { code: "trace_projection_incomplete" } } },
  unavailable: { status: 500, body: { error: { code: "trace_resolution_unavailable" } } },
});

const baseCompletedRows = traces.completedB.rows;
const secretPayload = stableStringify({
  effectRef: "effect_l04_v2",
  actionBody: "private email body",
  bearer: "Bearer l14-secret-token-value",
  recipient: "hidden@example.test",
  providerPayload: { accepted: 3 },
});

export const L14_CORRUPTIONS = deepFreeze([
  {
    id: "sequence-gap",
    rows: baseCompletedRows.filter((row) => row.sequence !== 2),
    expected: L14_ERRORS.incomplete,
  },
  {
    id: "duplicate-sequence",
    rows: baseCompletedRows.map((row, index) => index === 2 ? { ...row, sequence: 2 } : row),
    expected: L14_ERRORS.incomplete,
  },
  {
    id: "mixed-tenant-row",
    rows: baseCompletedRows.map((row, index) => index === 1 ? { ...row, workspaceId: identity.workspaceA } : row),
    expected: L14_ERRORS.incomplete,
  },
  {
    id: "bad-payload-hash",
    rows: baseCompletedRows.map((row, index) => index === 1 ? { ...row, payloadHash: "0".repeat(64) } : row),
    expected: L14_ERRORS.incomplete,
  },
  {
    id: "broken-subject-head",
    rows: baseCompletedRows.map((row, index) => index === 1 ? { ...row, priorState: "invented" } : row),
    expected: L14_ERRORS.incomplete,
  },
]);

const unknownRow = {
  ...baseCompletedRows[0],
  id: "l14-unknown-event",
  eventType: "trace.future_event",
  payloadJson: secretPayload,
  payloadHash: sha256(secretPayload),
};
const unknownProjection = {
  ...success.completedB.events[0],
  id: unknownRow.id,
  eventType: unknownRow.eventType,
  payloadHash: unknownRow.payloadHash,
  details: {},
};

export const L14_ACCEPTANCE_IDS = deepFreeze(
  Array.from({ length: 14 }, (_, index) => `AC-L14-${String(index + 1).padStart(2, "0")}`),
);
export const L14_NEGATIVE_IDS = deepFreeze(
  Array.from({ length: 12 }, (_, index) => `NEG-L14-${String(index + 1).padStart(2, "0")}`),
);

export const L14_NEGATIVE_CASES = deepFreeze([
  { id: "NEG-L14-01", request: { headers: {} }, expected: L14_ERRORS.unauthenticated, lookupCount: 0 },
  { id: "NEG-L14-02", request: { headers: {}, nodeEnv: "development" }, expected: L14_ERRORS.unauthenticated, lookupCount: 0 },
  { id: "NEG-L14-03", request: { headers: identity.ownerA.headers, spoofedTenant: identity.workspaceB, spoofedUser: identity.ownerB.userId }, expected: L14_ERRORS.notFound },
  { id: "NEG-L14-04", request: { headers: identity.ownerA.headers, workspaceId: identity.workspaceB, traceId: identity.traceB }, expected: L14_ERRORS.notFound },
  { id: "NEG-L14-05", request: { headers: identity.ownerA.headers, workspaceId: identity.workspaceA, traceId: identity.traceB }, expected: L14_ERRORS.notFound },
  { id: "NEG-L14-06", requests: [{ workspaceId: "bad%2Fid" }, { traceId: "x".repeat(129) }], expected: L14_ERRORS.invalid, lookupCount: 0 },
  { id: "NEG-L14-07", request: { query: "?fields=payloadJson" }, expected: L14_ERRORS.invalid, lookupCount: 0 },
  { id: "NEG-L14-08", corruptions: L14_CORRUPTIONS.map(({ id }) => id), expected: L14_ERRORS.incomplete, errorHasEvents: false },
  { id: "NEG-L14-09", row: unknownRow, projected: unknownProjection, expectedStatus: 200 },
  { id: "NEG-L14-10", rawRow: unknownRow, projected: unknownProjection, forbiddenValues: ["private email body", "Bearer l14-secret-token-value", "hidden@example.test", "providerPayload"] },
  { id: "NEG-L14-11", repeatCount: 3, before: { traceCount: 2, eventCount: traces.pendingA.rows.length + traces.completedB.rows.length }, after: { traceCount: 2, eventCount: traces.pendingA.rows.length + traces.completedB.rows.length } },
  { id: "NEG-L14-12", dependencyError: "SQLITE_BUSY: internal detail", expected: L14_ERRORS.unavailable, forbiddenResponse: "SQLITE_BUSY" },
]);

export const L14_TRACE_RESOLUTION_FIXTURE = deepFreeze({
  version: "l14-trace-resolution-fixture-v1",
  truthMode: "FIXTURE",
  route: L14_ROUTE,
  identifierPattern: L14_IDENTIFIER_PATTERN,
  cacheControl: L14_CACHE_CONTROL,
  identity,
  memberships: [
    { workspaceId: identity.workspaceA, userId: identity.ownerA.userId, role: "owner" },
    { workspaceId: identity.workspaceB, userId: identity.ownerB.userId, role: "owner" },
  ],
  traces,
  success,
  errors: L14_ERRORS,
  corruptions: L14_CORRUPTIONS,
  unknownEvent: { row: unknownRow, projected: unknownProjection },
  acceptanceIds: L14_ACCEPTANCE_IDS,
  negativeIds: L14_NEGATIVE_IDS,
  negativeCases: L14_NEGATIVE_CASES,
});

function sortedKeys(value) {
  return Object.keys(value).sort();
}

export function validateL14Fixture(fixture = L14_TRACE_RESOLUTION_FIXTURE) {
  const errors = [];
  if (fixture.truthMode !== "FIXTURE") errors.push("fixture truth mode is not explicit");
  if (fixture.route !== L14_ROUTE) errors.push("route drifted");
  if (new Set(fixture.acceptanceIds).size !== 14) errors.push("acceptance coverage is incomplete");
  if (new Set(fixture.negativeIds).size !== 12) errors.push("negative coverage is incomplete");
  if (fixture.negativeCases.map(({ id }) => id).join() !== fixture.negativeIds.join()) errors.push("negative case order drifted");
  if (fixture.corruptions.length !== 5) errors.push("corruption coverage is incomplete");

  for (const response of Object.values(fixture.success)) {
    if (sortedKeys(response).join() !== L14_SUCCESS_KEYS.join()) errors.push("success top-level shape drifted");
    if (sortedKeys(response.trace).join() !== L14_TRACE_KEYS.join()) errors.push("trace shape drifted");
    if (!response.complete || response.eventCount !== response.events.length) errors.push("success response is incomplete");
    response.events.forEach((event, index) => {
      if (sortedKeys(event).join() !== L14_EVENT_KEYS.join()) errors.push("event shape drifted");
      if (event.sequence !== index + 1) errors.push("event order is not contiguous");
    });
    const serialized = JSON.stringify(response);
    for (const forbidden of ["payloadJson", "idempotencyKey", "actorId", "@example.test", "Bearer ", "private email body", "providerPayload"]) {
      if (serialized.includes(forbidden)) errors.push(`success response leaked ${forbidden}`);
    }
  }

  for (const failure of Object.values(fixture.errors)) {
    if (sortedKeys(failure.body).join() !== L14_ERROR_KEYS.join()) errors.push("error top-level shape drifted");
    if (sortedKeys(failure.body.error).join() !== L14_ERROR_DETAIL_KEYS.join()) errors.push("error detail shape drifted");
    if ("events" in failure.body) errors.push("error contains partial events");
  }
  const notFoundBytes = stableStringify(fixture.errors.notFound.body);
  for (const id of ["NEG-L14-03", "NEG-L14-04", "NEG-L14-05"]) {
    const item = fixture.negativeCases.find((entry) => entry.id === id);
    if (stableStringify(item.expected.body) !== notFoundBytes) errors.push(`${id} discloses tenant existence`);
  }
  if (Object.keys(fixture.unknownEvent.projected.details).length !== 0) errors.push("unknown event widened details");
  const unknownSerialized = JSON.stringify(fixture.unknownEvent.projected);
  for (const forbidden of ["private email body", "Bearer l14-secret-token-value", "hidden@example.test", "providerPayload"]) {
    if (unknownSerialized.includes(forbidden)) errors.push(`unknown event leaked ${forbidden}`);
  }
  const invariantCase = fixture.negativeCases.find(({ id }) => id === "NEG-L14-11");
  if (stableStringify(invariantCase.before) !== stableStringify(invariantCase.after)) errors.push("read-only counts drifted");
  return [...new Set(errors)];
}

export function l14FixtureDigest(fixture = L14_TRACE_RESOLUTION_FIXTURE) {
  return sha256(stableStringify(fixture));
}
