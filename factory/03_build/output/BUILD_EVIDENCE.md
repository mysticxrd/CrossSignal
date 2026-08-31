---
type: stage-output
stage: 03_build
unit: authenticated-tenant-scoped-redacted-ordered-trace-resolution-endpoint
status: passed
verified_at: 2026-08-31T12:42:35Z
truth_mode: FIXTURE
---

# L14 build evidence

## Build result

Stage 03 implements one read-only App Router endpoint:

```text
GET /api/workspaces/{workspaceId}/traces/{traceId}
```

The route uses strict ChatGPT identity without the interactive development
owner fallback, awaits dynamic parameters, rejects query parameters and invalid
identifiers before durable lookup, and delegates to a resolver whose membership,
trace, and event reads are all tenant-bound. The existing L04 projector remains
the only projection and redaction authority. Following Stage 04's requested
correction, the route loads the Cloudflare-backed resolver only after strict
authentication succeeds, so an unauthenticated Node production request cannot
crash while evaluating the database adapter import graph.

This evidence is local executable `FIXTURE` proof. It is not a claim about a
deployed endpoint, live tenant state, or external integration.

## Implemented surface

| Surface | Result |
|---|---|
| Strict identity | `getStrictCrossSignalUser` returns only authenticated ChatGPT identity; it neither redirects nor creates a development owner. |
| App Router route | One dynamic `GET` export, awaited `params`, default Node.js runtime, no mutation methods. |
| Runtime import boundary | The route has no eager resolver import; its resolver dependency dynamically loads the D1 adapter only after authentication. |
| Request handling | Authentication precedes lookup; empty query and bounded identifiers are required. |
| Tenant authority | Durable owner membership is checked with `(workspace_id, user_id, role='owner')`. |
| Trace resolution | Trace and event reads both bind `workspace_id` and `trace_id`; events order by sequence. |
| Projection | `projectFlightTraceEvents` supplies the complete L04 ordered redacted projection. |
| Failure behavior | Exact `400`, `401`, `404`, `409`, and `500` envelopes use `private, no-store`. |
| Read-only behavior | Repeated success and failure calls preserve durable trace, event, intent, grant, and effect counts. |

## Executable proof

The focused product suite passed 57 tests. Its L14 cases exercised:

- a real pending six-node trace with 28 events for owner A/workspace A;
- a real replacement and assessed trace with 49 events for owner B/workspace B;
- exact success keys, contiguous order, reused redaction, cache behavior, and
  repeated-read invariance;
- unauthenticated and development-fallback denial before lookup;
- malformed identifiers and query selection denial before lookup;
- byte-identical non-disclosing `404` responses for unauthorized, cross-tenant,
  and absent resources despite spoofed headers and cookies;
- a real persisted empty trace resolving to fail-closed `409`;
- all five corruption histories rejected by the real L04 projector before the
  handler returns `409` without partial events;
- an unknown secret-bearing event projected with `details: {}`;
- dependency detail masked behind stable `500` output.

The route source check also proves that the endpoint exports only `GET`, retains
the default Node.js runtime, delegates strict authentication, contains no write
operation, and forbids regression to an eager `resolveFlightTrace` import.

The rebuilt local production server then proved the corrected HTTP boundary:

- an unauthenticated request returned exact JSON `401`, content type JSON, and
  `Cache-Control: private, no-store`;
- an authenticated request without a local D1 binding reached handler error
  masking and returned exact JSON `500` with the same no-store header;
- neither request produced `ERR_UNSUPPORTED_ESM_URL_SCHEME` or a raw server
  error. The local server was stopped after the two probes.

## Acceptance coverage

| Criterion | Build proof |
|---|---|
| `AC-L14-01` | Dynamic GET route and exact `l14.trace-resolution.v1` response contract. |
| `AC-L14-02` | Strict identity returns `401` without lookup, including development mode; the local production HTTP route returned the exact `401` envelope. |
| `AC-L14-03` | Owner membership is derived from authenticated `userId` and requested workspace. |
| `AC-L14-04` | Membership, trace, and event queries carry tenant predicates. |
| `AC-L14-05` | Unauthorized, cross-tenant, and absent resources share identical `404` bytes. |
| `AC-L14-06` | Repeated handler reads preserve all tracked durable counts. |
| `AC-L14-07` | Exact success, trace, and event key sets are asserted. |
| `AC-L14-08` | Pending 28-event and completed 49-event histories are complete and contiguous. |
| `AC-L14-09` | Existing L04 projector supplies redaction and unknown-event empty details. |
| `AC-L14-10` | Five malformed histories fail projector integrity and map to `409` without events. |
| `AC-L14-11` | Invalid identifiers and any query parameter return `400` before lookup. |
| `AC-L14-12` | Exact cache and stable error envelopes are asserted; local production HTTP returned no-store JSON `401` and masked no-D1 JSON `500`. |
| `AC-L14-13` | Both accepted tenant success traces execute through the real handler and resolver. |
| `AC-L14-14` | All twelve ordered negative cases are represented below. |

## Negative coverage

| Case | Build proof |
|---|---|
| `NEG-L14-01` | Missing identity returns `401`; resolver count remains zero, and the production route no longer loads the Cloudflare adapter first. |
| `NEG-L14-02` | Strict helper bypasses development-owner fallback. |
| `NEG-L14-03` | Spoofed user, tenant, and active-workspace cookie grant no authority. |
| `NEG-L14-04` | Owner A requesting workspace B receives shared `404` bytes. |
| `NEG-L14-05` | Workspace A paired with trace B receives shared `404` bytes. |
| `NEG-L14-06` | Slash-bearing and overlength identifiers return `400` before lookup. |
| `NEG-L14-07` | Field-selection query returns `400` before lookup. |
| `NEG-L14-08` | Five projector corruptions fail closed and map to event-free `409`. |
| `NEG-L14-09` | Unknown event stays ordered and exposes empty details. |
| `NEG-L14-10` | Email body, bearer value, recipient, and provider payload do not project. |
| `NEG-L14-11` | Three repeated reads preserve durable counts. |
| `NEG-L14-12` | `SQLITE_BUSY` detail is absent from stable `500` response bytes. |

## Accepted input bindings

| Input | SHA-256 |
|---|---|
| `factory/03_build/CONTEXT.md` | `45fd8c59bf4c8b30fb5adb467a6cbd8bd565f151286dbea43994750f12f68658` |
| `factory/02_data/output/DATA_PACKAGE.md` | `a63729a4927b0b2688f0ce0e15f005cc62e013de97b79cdf8759aa6a078b6cb0` |
| `factory/02_data/output/HUMAN_GATE.md` | `631d4a43b0579408da75aa162a6b5039796c4aa8f99bdc537701f7ec21197d83` |
| `factory/_shared/ARCHITECTURE_SNAPSHOT.md` | `e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `factory/_lib/verify-kit.mjs` | `b2c7434bf3acacbfb6323b33cf0b175f77d0e3b1d66aeadee6e9ea996c95015c` |
| `factory/02_data/fixtures/l14-trace-resolution.fixture.mjs` | `d219e789eb364782fdb9974c48caf1b385b49e134e6352af860c93c0d3e4dd0d` |

The accepted fixture canonical object digest is
`3b005060f11bf8da81788686d32a3e7325edbfaf86d9323680f1ef0fda657ee4`.

## Observed baseline bindings

These hashes bind the pre-build L04 product head read by this stage. Modified
stage-owned paths are separately bound to their resulting product hashes below.

| Input | SHA-256 |
|---|---|
| `package.json` | `c8a9ab36760f08998d304efdc6a4d514a22f8d7ea05ab8c8df992ecc09f75972` |
| `app/chatgpt-auth.ts` | `4265a2e7c2dcb3a6f4b7026f762bf5b6e4caec76cc13c0a45987ee9a9f2e42cc` |
| `app/crosssignal-auth.ts` | `4c6081befd4c0eee91d962a689f67ec5f5e612e0dc462fab1bec3d8d874890e0` |
| `db/index.ts` | `c6fc9494d04c9457fc4178bed614d0e4ba7c5877e9d65ced11c691b735ec851e` |
| `db/workspaces.ts` | `d7f5b0d47fd294f2055c8f9247d9b8f5a0a7a1eb9c86e2daf5cb9d917e1a8eb6` |
| `db/flight-recorder-contracts.ts` | `e6d61497b43979aeb8dd9154c49aec7a04949a8db22ea30107dd82c05f796192` |
| `db/flight-recorder.ts` | `4bf6802a6dc96463381d9a58135e10a1cc27a64e7a27159e99217061166411b0` |
| `tests/flight-recorder-build.test.mjs` | `7efeb3f0ca10d7b49b5d7498d364ab6c345b1919b74b6686bc774f664e52cedd` |

## Product bindings

| Input | SHA-256 |
|---|---|
| `app/crosssignal-auth.ts` | `c6ab098131230d21491af33be98430ff9a12af081166a8c30bc6ff2b3bef7d7a` |
| `app/trace-resolution.ts` | `256b25f5350fe4c383f949dff9c6a2cdce7265626fbba62d1ee7439382f082fd` |
| `app/api/workspaces/[workspaceId]/traces/[traceId]/route.ts` | `418b13ecc92d5c5e7a075bab06e33b8195aea3205ebeacac66008cd53734d7e3` |
| `db/trace-resolution.ts` | `2c13169c911ed46ed96670361fb0b88382184dfb92e8e11da5c6e353f16536f9` |
| `tests/flight-recorder-build.test.mjs` | `6829c8405785647baba19975f60cde2b9dff62fb927bd27176725d74159df73b` |

## Explicit exclusions

Stage 03 adds no schema or migration, write endpoint, pagination, filtering,
CORS policy, UI, development authentication fallback, new projection format,
raw payload exposure, live credential, or deployment claim.
