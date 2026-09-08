---
type: stage-output
stage: 02_data
unit: authenticated-tenant-scoped-redacted-ordered-trace-resolution-endpoint
status: ready-for-review
---

# L14 executable data package

## Data decision

The executable source for Stage 03 is
`factory/02_data/fixtures/l14-trace-resolution.fixture.mjs`. It converts the
accepted HTTP specification into deterministic identities, memberships,
tenant-scoped traces, raw event rows, redacted success responses, stable error
envelopes, corruption variants, and negative cases. It imports the active L04
trace fixture so L14 does not invent a second event vocabulary or allowlist,
then expands its graph template across the six-node persisted runtime registry.

The fixture is `FIXTURE` truth. It is contract data, not evidence of a deployed
endpoint and not live tenant state.

## Ownership and provenance

| Object | Authority | Provenance |
|---|---|---|
| Authenticated user | Four `oai-authenticated-*` request headers parsed server-side | Existing ChatGPT authentication adapter |
| Workspace access | Durable `(workspace_id, user_id, role='owner')` membership | Existing `workspace_members` contract |
| Trace metadata | Durable row addressed by both `workspace_id` and `trace_id` | Existing `flight_traces` contract |
| Trace history | All durable rows addressed by both `workspace_id` and `trace_id` | Existing append-only `flight_trace_events` contract |
| Redacted event | Existing `projectFlightTraceEvents` behavior and L04 allowlist | Active L04 contracts and fixture |
| HTTP envelope | Accepted L14 specification | Stage 01 accepted output |

The route parameter `workspaceId` remains a requested resource key. The
authenticated user plus durable membership supplies authority. Neither the
fixture nor the eventual endpoint accepts a caller-supplied user, role, active
workspace cookie, or tenant header as authority.

## Request data contract

```text
method       = GET
route        = /api/workspaces/{workspaceId}/traces/{traceId}
workspaceId  = ^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$
traceId      = ^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$
query        = absent
auth         = strict ChatGPT identity headers
params       = Promise<{ workspaceId: string; traceId: string }>
```

Authentication precedes validation-backed database lookup. Malformed path data
and any query parameter produce no database call. A valid request may reach a
tenant-bound lookup only after strict identity exists.

## Success data contract

The success object has exactly six top-level keys:

```text
complete, eventCount, events, schemaVersion, trace, workspaceRef
```

`schemaVersion` is `l14.trace-resolution.v1`; `complete` is `true`;
`eventCount` equals `events.length`. `trace` has exactly `id`, `state`,
`traceKey`, and `truthMode`. Each event has exactly:

```text
actorDisplay, actorType, currentState, details, eventType, id,
occurredAt, payloadHash, priorState, sequence, subjectRef, subjectType
```

The fixture supplies two successful states:

| Fixture | Owner/workspace | Trace state | Event count | Purpose |
|---|---|---:|---:|---|
| `success.pendingA` | owner A / workspace A | `awaiting_approval` | `28` | Resolve a persisted six-node pending trace |
| `success.completedB` | owner B / workspace B | `assessed` | `49` | Resolve the complete replacement/authority/effect/outcome trace |

Both projections are contiguous from sequence `1`, contain every source row
once, carry `FIXTURE` truth, and exclude raw row fields.

## Error data contract

Every error has exactly `{ "error": { "code": string } }`, contains no
`events`, and is returned with `Cache-Control: private, no-store`.

| Status | Code | Fixture key |
|---:|---|---|
| `400` | `invalid_trace_request` | `errors.invalid` |
| `401` | `authentication_required` | `errors.unauthenticated` |
| `404` | `trace_not_found` | `errors.notFound` |
| `409` | `trace_projection_incomplete` | `errors.incomplete` |
| `500` | `trace_resolution_unavailable` | `errors.unavailable` |

Unauthorized workspace, absent workspace, absent trace, and a trace ID from a
different tenant all reuse the identical `errors.notFound.body` object. Tests
must compare serialized bytes, not merely status codes.

## Integrity and redaction variants

`L14_CORRUPTIONS` contains exactly five fail-closed histories:

1. sequence gap;
2. duplicate sequence;
3. mixed-tenant row;
4. invalid payload hash;
5. broken subject-state head.

Every variant resolves to `409 trace_projection_incomplete`, never a partial
event prefix. The unknown-future-event variant remains a valid `200` event in
sequence but has `details: {}`. Its raw payload contains an email address,
action body, bearer token, and provider payload expressly to prove that unknown
event types cannot widen the response.

## Tenant fixture topology

```text
owner A --owner--> workspace A --contains--> pending trace A
owner B --owner--> workspace B --contains--> completed trace B
owner A --denied--> workspace B / completed trace B
workspace A + trace B ---------------------> trace_not_found
```

Trace B is a real resource for owner B. Requests pairing trace B with owner A
or workspace A must be indistinguishable from absence. This tests tenant
non-disclosure without requiring an impossible duplicate global trace primary
key.

## Acceptance mapping

| Criterion | Executable fixture evidence |
|---|---|
| `AC-L14-01` | `route`, `schemaVersion`, exact success key constants |
| `AC-L14-02` | `NEG-L14-01`, `NEG-L14-02`, strict identity headers |
| `AC-L14-03` | `memberships`, spoofed user/tenant case |
| `AC-L14-04` | tenant topology and mixed-tenant corruption |
| `AC-L14-05` | one shared `errors.notFound` object for three attacks |
| `AC-L14-06` | `NEG-L14-11` before/after durable counts |
| `AC-L14-07` | exact success, trace, and event key constants |
| `AC-L14-08` | pending/completed event counts and contiguous validation |
| `AC-L14-09` | active L04 projection data and unknown-event redaction |
| `AC-L14-10` | five `L14_CORRUPTIONS`, all with no error events |
| `AC-L14-11` | malformed/overlength identifiers and query case |
| `AC-L14-12` | exact error keys, cache constant, unavailable masking case |
| `AC-L14-13` | `success.pendingA` and `success.completedB` |
| `AC-L14-14` | ordered `L14_NEGATIVE_CASES` set |

## Negative mapping

| ID | Fixture assertion |
|---|---|
| `NEG-L14-01` | Missing identity returns `401`, lookup count `0` |
| `NEG-L14-02` | Development mode does not create an API identity |
| `NEG-L14-03` | Spoofed tenant/user cannot grant access |
| `NEG-L14-04` | Owner A requesting workspace B gets shared `404` bytes |
| `NEG-L14-05` | Workspace A paired with trace B gets shared `404` bytes |
| `NEG-L14-06` | Decoded slash and 129-character identifier fail before lookup |
| `NEG-L14-07` | Field-selection query fails before lookup |
| `NEG-L14-08` | All five corruptions return `409` without events |
| `NEG-L14-09` | Unknown event remains ordered with empty details |
| `NEG-L14-10` | Email/body/bearer/provider values never enter projection |
| `NEG-L14-11` | Repeated reads preserve trace and event counts |
| `NEG-L14-12` | Internal dependency detail is replaced by stable `500` code |

## Stage 03 obligations

- Consume these constants and fixture cases from product tests; do not copy
  their values into a second test-only source.
- Implement a strict non-redirecting authentication read.
- Await App Router dynamic parameters.
- Validate identifiers and empty query before durable lookup.
- Bind both workspace and trace in every trace/event SQL query.
- Reuse `projectFlightTraceEvents` and map its integrity error to `409`.
- Snapshot durable counts around positive and negative handler calls.
- Compare every response's exact keys, cache header, status, and serialized
  error body.

## Explicit exclusions

The data package adds no product schema, migration, endpoint, UI, mutation,
pagination, filter, CORS policy, live credential, or new trace projection.

## Fixture binding

| Fixture | SHA-256 | Canonical object digest |
|---|---|---|
| `factory/02_data/fixtures/l14-trace-resolution.fixture.mjs` | `d219e789eb364782fdb9974c48caf1b385b49e134e6352af860c93c0d3e4dd0d` | `3b005060f11bf8da81788686d32a3e7325edbfaf86d9323680f1ef0fda657ee4` |

## Declared input bindings

| Input | SHA-256 |
|---|---|
| `factory/02_data/CONTEXT.md` | `592edb4458d1eff71887ace8f33e240229dd31f66db28c7f54d9b3c5af4dadb7` |
| `factory/01_spec/output/SPEC.md` | `b09aafe97ecfdd4e6c3085426275b7505c906766023f374e2d7d68f2e2202371` |
| `factory/01_spec/output/HUMAN_GATE.md` | `656fc931fe34749c2b1e3db29e6d15e80a0abae1c016d6047679ce410a45a584` |
| `factory/_shared/ARCHITECTURE_SNAPSHOT.md` | `e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `factory/_lib/verify-kit.mjs` | `b2c7434bf3acacbfb6323b33cf0b175f77d0e3b1d66aeadee6e9ea996c95015c` |
| `app/chatgpt-auth.ts` | `4265a2e7c2dcb3a6f4b7026f762bf5b6e4caec76cc13c0a45987ee9a9f2e42cc` |
| `app/crosssignal-auth.ts` | `4c6081befd4c0eee91d962a689f67ec5f5e612e0dc462fab1bec3d8d874890e0` |
| `db/workspaces.ts` | `d7f5b0d47fd294f2055c8f9247d9b8f5a0a7a1eb9c86e2daf5cb9d917e1a8eb6` |
| `db/flight-recorder-schema.ts` | `18f30283877491c7a15de0667134aa07cd1ff21e41f9b626f0377b145c46cd09` |
| `db/flight-recorder-contracts.ts` | `e6d61497b43979aeb8dd9154c49aec7a04949a8db22ea30107dd82c05f796192` |
| `db/flight-recorder.ts` | `4bf6802a6dc96463381d9a58135e10a1cc27a64e7a27159e99217061166411b0` |
| `tests/fixtures/l04-authority-trace.fixture.mjs` | `cd565ba32b846e2848be56c6ef8c705bb13088d6424f80feb962d96411afa464` |
