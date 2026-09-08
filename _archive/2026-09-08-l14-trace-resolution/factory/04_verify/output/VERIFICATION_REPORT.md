---
type: stage-output
stage: 04_verify
unit: authenticated-tenant-scoped-redacted-ordered-trace-resolution-endpoint
status: passed
verified_at: 2026-08-31T13:14:56Z
truth_mode: FIXTURE
---

# L14 verification report

## Result

Stage 04 independently verifies the complete L14 promise. The corrected local
production route reaches strict authentication before loading the Cloudflare D1
adapter, returns the exact no-store `401` contract without identity, rejects an
authenticated field-selection query with the exact no-store `400` contract,
and masks the unavailable local D1 dependency behind the exact no-store `500`
contract. The prior route-loader failure was not observed.

The durable success, isolation, integrity, secrecy, ordering, and read-only
boundaries are executable local `FIXTURE` evidence through the real handler,
tenant-bound resolver, migrated in-memory database, and L04 projector. This is
not a deployed or live-integration claim.

## Story

An authenticated GET enters the dynamic route, derives the actor from trusted
identity headers, performs owner-membership plus workspace-and-trace-bound
reads, projects the rows through L04's integrity and redaction authority, and
returns a complete ordered no-store response without mutating durable state.

There is no L14 UI entry point. Browser rendering is not applicable; the user
boundary is the HTTP API route.

## Flow status

| Boundary | Status | Evidence |
|---|---|---|
| Production compilation | passed | Vinext built all five environments and emitted `lambda /api/workspaces/:workspaceId/traces/:traceId`. |
| HTTP route entry and authentication | passed, local runtime | Unauthenticated GET returned exact JSON `401`; the Cloudflare-backed resolver was not eagerly evaluated. |
| Request validation | passed, local runtime and fixture | Authenticated field-selection query returned exact JSON `400` before D1 lookup; identifier and query cases also passed in the focused suite. |
| API to durable data | passed, FIXTURE | The real resolver checked owner membership and bound trace/event reads to both workspace and trace. |
| Data to projection | passed, FIXTURE | The real L04 projector produced a 28-event pending history and a 49-event completed history and rejected all five corruption histories. |
| Projection to response | passed, FIXTURE | Exact response keys, contiguous sequence, redacted details, stable errors, no-store caching, and byte-identical non-disclosing `404` bodies passed. |
| Read-only behavior | passed, FIXTURE | Three repeated reads preserved trace, event, intent, grant, and effect counts. |
| Dependency failure masking | passed, local runtime and fixture | Authenticated valid GET without local D1 returned exact JSON `500`; dependency detail remained absent. |

## Production HTTP evidence

Unauthenticated route entry:

```text
HTTP/1.1 401 Unauthorized
cache-control: private, no-store
content-type: application/json

{"error":{"code":"authentication_required"}}
```

Authenticated request with a forbidden field-selection query:

```text
HTTP/1.1 400 Bad Request
cache-control: private, no-store
content-type: application/json

{"error":{"code":"invalid_trace_request"}}
```

Authenticated valid request without a local D1 binding:

```text
HTTP/1.1 500 Internal Server Error
cache-control: private, no-store
content-type: application/json

{"error":{"code":"trace_resolution_unavailable"}}
```

The production server emitted no route-loader error during these probes and
was stopped afterward. The `500` demonstrates stable failure masking only; it
does not claim a local or deployed D1 integration.

## Executable fixture evidence

The focused suite ran 57/57 focused tests passed. Its L14 cases executed two
real tenant histories through the handler and resolver:

- owner A and workspace A: 28-event pending trace in contiguous order;
- owner B and workspace B: 49-event completed trace in contiguous order;
- all five corruption histories rejected by the real L04 projector and mapped
  to event-free `409` output;
- unauthorized, cross-tenant, cross-trace, and absent resources shared one
  byte-identical `404` response;
- unknown secret-bearing payload fields projected to empty details;
- repeated reads left all tracked durable counts unchanged.

## Acceptance outcomes

| Criterion | Stage 04 outcome |
|---|---|
| `AC-L14-01` | passed: dynamic GET and exact `l14.trace-resolution.v1` response contract are bound and exercised. |
| `AC-L14-02` | passed: strict identity denies missing identity before resolver loading; production HTTP returned exact `401`. |
| `AC-L14-03` | passed: authenticated `userId` and requested workspace determine owner membership. |
| `AC-L14-04` | passed: membership, trace, and event queries carry tenant predicates. |
| `AC-L14-05` | passed: unauthorized, cross-tenant, cross-trace, and absent resources produce identical `404` bytes. |
| `AC-L14-06` | passed: repeated reads preserve trace, event, intent, grant, and effect counts. |
| `AC-L14-07` | passed: exact success, trace, and event key sets are asserted. |
| `AC-L14-08` | passed: pending 28-event and completed 49-event histories are complete and contiguous. |
| `AC-L14-09` | passed: L04 projection controls redaction and unknown-event empty details. |
| `AC-L14-10` | passed: five malformed histories fail closed as event-free `409`. |
| `AC-L14-11` | passed: invalid identifiers and query selection return `400` before lookup; query rejection is also proven over production HTTP. |
| `AC-L14-12` | passed: exact cache and stable `400`, `401`, `404`, `409`, and `500` envelopes are exercised. |
| `AC-L14-13` | passed in FIXTURE mode: both tenant success traces execute through the real handler, resolver, migrated database, and projector. |
| `AC-L14-14` | passed: all twelve ordered negative cases resolve below. |

## Negative outcomes

| Case | Stage 04 outcome |
|---|---|
| `NEG-L14-01` | passed: missing identity returns exact `401`, zero fixture lookup, and production route does not load D1 first. |
| `NEG-L14-02` | passed: strict authentication does not admit the development-owner fallback. |
| `NEG-L14-03` | passed: spoofed user, tenant, and active-workspace values grant no authority. |
| `NEG-L14-04` | passed: owner A requesting workspace B receives the shared `404` bytes. |
| `NEG-L14-05` | passed: workspace A paired with trace B receives the shared `404` bytes. |
| `NEG-L14-06` | passed: slash-bearing and overlength identifiers return `400` before lookup. |
| `NEG-L14-07` | passed: field selection returns `400` before lookup, including the production HTTP probe. |
| `NEG-L14-08` | passed: all five projector corruptions fail closed without partial events. |
| `NEG-L14-09` | passed: an unknown event remains ordered with empty details. |
| `NEG-L14-10` | passed: secret-bearing body, credential, recipient, and provider fields do not project. |
| `NEG-L14-11` | passed: three repeated reads preserve durable counts. |
| `NEG-L14-12` | passed: internal dependency detail is absent from stable `500` bytes, including local production masking. |

## Declared input bindings

| Input | SHA-256 |
|---|---|
| `factory/04_verify/CONTEXT.md` | `dde59637a7da7ce046dbe867b6ebbe7c399d42c7e1ee56f173ac061daf369eb6` |
| `factory/03_build/output/BUILD_EVIDENCE.md` | `19da3d7be1858a6d1b56f62be420a683e2a9e54fb85feef8697902c013f13c1b` |
| `factory/03_build/output/HUMAN_GATE.md` | `0de4131a5aa6fe2f35d706077f7d3407b42d7f0ced98aede56584a4e03f078fa` |
| `factory/_shared/ARCHITECTURE_SNAPSHOT.md` | `e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `factory/_lib/verify-kit.mjs` | `b2c7434bf3acacbfb6323b33cf0b175f77d0e3b1d66aeadee6e9ea996c95015c` |
| `package.json` | `c8a9ab36760f08998d304efdc6a4d514a22f8d7ea05ab8c8df992ecc09f75972` |
| `app/crosssignal-auth.ts` | `c6ab098131230d21491af33be98430ff9a12af081166a8c30bc6ff2b3bef7d7a` |
| `app/trace-resolution.ts` | `256b25f5350fe4c383f949dff9c6a2cdce7265626fbba62d1ee7439382f082fd` |
| `app/api/workspaces/[workspaceId]/traces/[traceId]/route.ts` | `418b13ecc92d5c5e7a075bab06e33b8195aea3205ebeacac66008cd53734d7e3` |
| `db/trace-resolution.ts` | `2c13169c911ed46ed96670361fb0b88382184dfb92e8e11da5c6e353f16536f9` |
| `tests/flight-recorder-build.test.mjs` | `6829c8405785647baba19975f60cde2b9dff62fb927bd27176725d74159df73b` |
| `factory/02_data/fixtures/l14-trace-resolution.fixture.mjs` | `d219e789eb364782fdb9974c48caf1b385b49e134e6352af860c93c0d3e4dd0d` |

The accepted fixture canonical object digest is
`3b005060f11bf8da81788686d32a3e7325edbfaf86d9323680f1ef0fda657ee4`.

## Limits

Stage 04 proves local production route behavior at the authentication,
validation, and masked-dependency boundaries and proves the complete durable
success flow with labeled fixtures. It does not claim a deployed endpoint,
live tenant data, live D1 configuration, external integration, or UI flow.
