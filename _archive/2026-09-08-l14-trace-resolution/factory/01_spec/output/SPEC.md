---
type: stage-output
stage: 01_spec
unit: authenticated-tenant-scoped-redacted-ordered-trace-resolution-endpoint
status: ready-for-review
---

# L14 authenticated trace-resolution endpoint specification

## Decision

Add one read-only App Router route handler:

`GET /api/workspaces/{workspaceId}/traces/{traceId}`

It resolves an already-persisted CrossSignal flight trace for an authenticated
workspace owner and returns the complete L04 redacted event projection in
ascending sequence order. The endpoint is a resolution surface, not a trace
creation surface, an execution path, or a second projection implementation.

## Why this slice

L04 made trace history complete, ordered, integrity-checked, and redacted, but
the durable product exposes that projection only through its internal snapshot
read. L14 gives an evaluator or same-origin client one explicit HTTP contract
that proves authentication, tenant isolation, redaction, and order together.

## Request contract

| Property | Required behavior |
|---|---|
| Method | `GET` only |
| Path | `/api/workspaces/{workspaceId}/traces/{traceId}` |
| Authentication | Strict server-side ChatGPT identity; no redirect and no local-development fallback |
| Tenant selector | `workspaceId` is only a requested resource key; authorization is derived from the authenticated user and durable workspace membership |
| Trace selector | `traceId` addresses an existing durable trace inside the authorized workspace |
| Identifier grammar | Each decoded identifier matches `^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$` |
| Query string | No query parameters are accepted in v1 |
| Body | Ignored by HTTP semantics; clients do not send one |
| Cache | Every response carries `Cache-Control: private, no-store` |

Authentication must be evaluated before workspace or trace lookup. Caller
headers, cookies, query parameters, and response fields never establish user or
tenant authority. In particular, the existing development-owner fallback used
by the interactive page is not authentication for this endpoint.

## Success response

The route returns `200` and JSON with this exact top-level shape:

```json
{
  "schemaVersion": "l14.trace-resolution.v1",
  "workspaceRef": "workspace-id",
  "trace": {
    "id": "trace-id",
    "traceKey": "durable-trace-key",
    "state": "assessed",
    "truthMode": "FIXTURE"
  },
  "eventCount": 4,
  "events": [],
  "complete": true
}
```

`events` uses the existing `RedactedTraceEvent` contract and existing
`projectFlightTraceEvents` implementation. Every event contains only:

- `id`, `sequence`, `eventType`, `subjectType`, `subjectRef`;
- `priorState`, `currentState`;
- `actorType`, the fixed non-identifying `actorDisplay` label;
- `occurredAt`, `payloadHash`;
- `details`, populated only from the L04 subject allowlist for known event
  types and `{}` for an unknown future event type.

`eventCount` equals `events.length`. `complete` is `true` only after the reader
has loaded every persisted event for the tenant-bound trace and the existing
projector has verified contiguous sequences, workspace/trace binding,
canonical payloads, hashes, and subject-state continuity. Events are sorted by
numeric `sequence` ascending and must be exactly `1..eventCount`. The endpoint
does not paginate or return a partial prefix.

## Redaction boundary

The response must not contain raw `payloadJson`, `idempotencyKey`, `actorId`,
authentication headers, cookies, bearer tokens, secret-like values, email
addresses, recipient lists, action subject/body, provider response payloads,
or any other field outside the projection allowlist. A new or unknown event
type does not widen the response; it resolves with empty `details`.

Stable opaque event, subject, workspace, and trace references plus stored
SHA-256 integrity hashes are permitted. They are returned only after tenant
authorization succeeds.

## Failure contract

All failures are JSON, carry `Cache-Control: private, no-store`, and expose no
stack, SQL, provider detail, identity header, or durable membership fact.

| Status | Stable code | When |
|---|---|---|
| `400` | `invalid_trace_request` | An identifier is malformed or any query parameter is present |
| `401` | `authentication_required` | Strict authenticated identity is absent or invalid; no redirect |
| `404` | `trace_not_found` | Requested workspace is unauthorized or absent, or the trace is absent from that workspace |
| `409` | `trace_projection_incomplete` | Persisted rows exist but the complete integrity-checked projection cannot be produced |
| `500` | `trace_resolution_unavailable` | An unexpected dependency or runtime failure occurs |

The `404` body is byte-equivalent for an absent workspace, an unauthorized
workspace, an absent trace, and a trace identifier that exists only in another
workspace. The handler must not query a trace by `traceId` without the same SQL
predicate also binding `workspace_id`. Integrity failure returns no events and
never degrades to a partial `200`.

## Durable implementation boundary for later stages

- Add one strict, non-redirecting API authentication helper adjacent to the
  existing CrossSignal authentication adapter. It may reuse ChatGPT identity
  parsing but must not accept the development-owner fallback.
- Add one read-only database resolver that first verifies durable owner access,
  then selects the trace and its events with both `workspace_id` and `trace_id`
  predicates, and passes every row to `projectFlightTraceEvents`.
- Add one dynamic Node.js App Router route handler at the specified path. Await
  dynamic route `params` under the repository's Next.js 16 contract.
- Do not call `getOrCreateFlightRecorderSnapshot`, materialize fixtures, mutate
  cookies, dispatch effects, append trace events, or add permissive CORS.
- Keep all response construction server-side. No UI change is required.

## Acceptance criteria

- **AC-L14-01 — exact surface:** `GET /api/workspaces/{workspaceId}/traces/{traceId}` is the only new public route and emits the v1 JSON contract.
- **AC-L14-02 — strict authentication:** a request without valid ChatGPT identity returns `401 authentication_required`, does not redirect, and cannot use the development-owner fallback.
- **AC-L14-03 — server-derived authority:** authorization uses the authenticated user plus durable workspace ownership; caller-supplied identity, active-workspace cookies, and tenant-like headers do not grant access.
- **AC-L14-04 — tenant-bound lookup:** both trace metadata and every event query bind the requested `workspace_id` and `trace_id`.
- **AC-L14-05 — non-disclosure:** absent, unauthorized, and cross-tenant-collision requests return the same `404 trace_not_found` representation.
- **AC-L14-06 — read-only resolution:** a successful or failed request creates, updates, deletes, or dispatches nothing and never materializes the demo fixture.
- **AC-L14-07 — exact response:** success contains only `schemaVersion`, `workspaceRef`, `trace`, `eventCount`, `events`, and `complete`, with the specified nested trace and event fields.
- **AC-L14-08 — complete order:** success returns every event once in contiguous ascending sequence order and `eventCount === events.length`.
- **AC-L14-09 — reused redaction:** the endpoint uses `projectFlightTraceEvents`; forbidden raw fields and sensitive values are absent, and unknown event types have empty `details`.
- **AC-L14-10 — fail-closed integrity:** tenant mismatch, sequence gaps/duplicates, invalid canonical JSON/hash, or broken subject continuity returns `409 trace_projection_incomplete` with no partial events.
- **AC-L14-11 — bounded input:** malformed or overlength identifiers and any query parameter return `400 invalid_trace_request` before database resolution.
- **AC-L14-12 — HTTP safety:** every response is JSON with `Cache-Control: private, no-store`; unexpected failures use the stable `500 trace_resolution_unavailable` envelope without internal detail.
- **AC-L14-13 — positive proof:** an authenticated owner resolves both a pending and a completed persisted trace and receives the same redacted projection produced by the internal projector.
- **AC-L14-14 — negative proof:** automated tests cover missing auth, spoofed identity/tenant inputs, absent resources, cross-tenant ID collision, malformed input, unknown events, corrupt/gapped rows, secret leakage, and write-count invariance.

## Required negative matrix

| ID | Attack or fault | Required result |
|---|---|---|
| `NEG-L14-01` | No authenticated identity headers | `401`; no redirect or lookup |
| `NEG-L14-02` | Development mode without authenticated identity | `401`; fallback identity rejected |
| `NEG-L14-03` | Caller spoofs user or tenant in query/header/cookie | Spoof ignored; no access gained |
| `NEG-L14-04` | Owner A requests workspace B | Same `404` bytes as an absent workspace |
| `NEG-L14-05` | Trace ID exists in workspace B but is requested through workspace A | Same `404` bytes as an absent trace |
| `NEG-L14-06` | Empty, decoded-invalid, or overlength path identifier | `400`; no database resolution |
| `NEG-L14-07` | Any query parameter, including pagination or field selection | `400`; response contract cannot be widened |
| `NEG-L14-08` | Sequence gap, duplicate, mixed tenant/trace row, bad payload hash, or broken subject head | `409`; no `events` member in the error envelope |
| `NEG-L14-09` | Unknown future event type with otherwise valid row | `200`; event retained in order with `details: {}` |
| `NEG-L14-10` | Payload contains email, action body, bearer token, or provider payload | `200`; value absent because it is not allowlisted |
| `NEG-L14-11` | Repeated success, `404`, and `409` requests | Durable table counts and trace state remain unchanged |
| `NEG-L14-12` | Unexpected database/runtime failure | `500`; stable code only, no internal error detail |

## Verification obligation for later stages

Stage 02 must turn the request, response, error, fixture, and negative matrix
into executable data contracts. Stage 03 must implement the route and exercise
the real handler against isolated tenant data. Stage 04 must resolve all
fourteen acceptance criteria, run build/lint/tests, and inspect both successful
and failing responses for leakage. Stage 05 must bind the exact route, product
head, commands, and cold reviewer procedure.

## Explicit exclusions

No mutation method, trace creation, fixture reset, authorization action,
external effect, UI page, streaming/SSE, pagination, filtering, search, bulk
trace list, collaboration role model, bearer-token API, public CORS, OpenAPI
catalog, new event projection, schema migration, or claim of Result integration.

## Declared input bindings

| Input | SHA-256 |
|---|---|
| `factory/01_spec/CONTEXT.md` | `ec2c145a85802c01ad5796e9619c72e700ea19350397f58b1379a12fc9f5a47e` |
| `factory/_shared/ARCHITECTURE_SNAPSHOT.md` | `e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `factory/_lib/verify-kit.mjs` | `b2c7434bf3acacbfb6323b33cf0b175f77d0e3b1d66aeadee6e9ea996c95015c` |
| `package.json` | `c8a9ab36760f08998d304efdc6a4d514a22f8d7ea05ab8c8df992ecc09f75972` |
| `app/crosssignal-auth.ts` | `4c6081befd4c0eee91d962a689f67ec5f5e612e0dc462fab1bec3d8d874890e0` |
| `app/page.tsx` | `b72866126a09ffa1e0f51e127564b22b56430d16ea5d5c4f7878822c55624722` |
| `db/flight-recorder-contracts.ts` | `e6d61497b43979aeb8dd9154c49aec7a04949a8db22ea30107dd82c05f796192` |
| `db/flight-recorder.ts` | `4bf6802a6dc96463381d9a58135e10a1cc27a64e7a27159e99217061166411b0` |
| `tests/flight-recorder-build.test.mjs` | `7efeb3f0ca10d7b49b5d7498d364ab6c345b1919b74b6686bc774f664e52cedd` |
| `tests/flight-recorder-data.test.mjs` | `d4be07a521bbfd19726d3ea2aa3bdd034620a2518a2375e8e4cf79ada8e032cf` |
