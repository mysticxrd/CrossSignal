---
type: build-specification
stage: 01_spec
unit: supabase-postgres-authenticated-trace-resolution-parity
status: proposed
truth_mode: TEST
---

# Supabase PostgreSQL trace-resolution parity specification

## Decision

Replace D1 incrementally, beginning with the already accepted read-only route:

```text
GET /api/workspaces/{workspaceId}/traces/{traceId}
```

This run ports the minimum relational surface needed to resolve that route from
Supabase PostgreSQL and proves byte-equivalent behavior in hosted `TEST`. It
does not migrate write paths or remove D1. The D1 implementation remains the
recoverable baseline until this slice is verified and accepted.

This is the first slice of the database replacement, not the final cutover.
Later governed runs will migrate authority, graph execution, effects, outcomes,
and remaining application persistence only after this read path proves the
connection, schema, tenant, and operational model.

## Customer and evaluator outcome

An authenticated owner can resolve the same complete, ordered, redacted trace
from Supabase PostgreSQL through the existing HTTP contract. A reviewer can
identify which backend served the request in protected evidence while public
response bytes remain provider-neutral. Cross-tenant, malformed, incomplete,
and unavailable cases keep their accepted fail-closed behavior.

## Bounded data surface

The first PostgreSQL schema contains only the route's durable dependencies:

- `workspaces`;
- `workspace_members`;
- `flight_traces`;
- `flight_trace_events`.

It includes every foreign key, uniqueness rule, sequence rule, append-only
guard, subject binding, trace-state transition guard, and index required by the
accepted L14 resolver and L04 projector. SQLite-specific syntax is translated
to native PostgreSQL types and PL/pgSQL trigger functions; constraints are not
dropped or weakened to make the migration pass.

The original `drizzle/` SQLite migrations remain immutable historical inputs.
PostgreSQL migration files live under a distinct Supabase-owned migration path
created by the supported Supabase migration workflow. Stage 02 must publish a
SQLite-to-PostgreSQL mapping for every included column, constraint, index, and
trigger before implementation begins.

## Runtime boundary

The Cloudflare/Vinext server remains the only caller of persistence. Browser
code receives no database password, secret key, service-role key, raw provider
error, or unrestricted Supabase client.

The proposed runtime adapter uses Drizzle's PostgreSQL surface with a
Cloudflare-compatible PostgreSQL driver. Hosted application traffic uses the
Supavisor transaction pooler over TLS with prepared statements disabled because
transaction mode does not support them. Schema migrations and administrative
verification use a direct or session connection intended for those operations.

Each request selects exactly one configured backend. The provider choice is
validated at startup or first database access and is recorded in protected TEST
evidence. An unavailable Supabase backend returns the accepted masked `500`;
it never silently falls back to D1. No request writes to both databases.

## Authentication and tenant enforcement

This slice preserves the existing strict application authentication contract;
adopting Supabase Auth is outside scope.

The PostgreSQL application role has no `BYPASSRLS`, no schema ownership, and
only the privileges needed for the read slice. Runtime tables are placed in a
non-exposed application schema. `anon` and `authenticated` receive no table or
function grants for this slice, and no table is opted into the Data API or
Realtime publication.

The server opens one read-only transaction, derives `userId` and `workspaceId`
from authenticated server state, and binds both as transaction-local settings.
RLS policies require the current user to be an owner member of the current
workspace. Resolver SQL also retains explicit workspace and trace predicates.
The transaction must roll back or end before its pooled connection is reused,
preventing tenant context from leaking across requests.

Any helper function is `SECURITY INVOKER` by default. If Stage 02 demonstrates
that a narrowly scoped `SECURITY DEFINER` helper is unavoidable, it must live in
a non-exposed schema, set an empty search path, verify the authenticated actor,
have `PUBLIC` execution revoked, and receive explicit tests and reviewer
approval. Permission errors never justify adding `SECURITY DEFINER`.

## Migration and proof sequence

1. Build the four-table PostgreSQL contract and its database tests locally.
2. Load only labeled TEST fixtures with stable source IDs and content hashes.
3. Prove table counts, primary identities, ordered event sequences, and canonical
   fixture digests match the accepted SQLite source fixtures.
4. Apply the reviewed migration to a dedicated Supabase TEST project or isolated
   development branch selected by the human before any hosted DDL.
5. Run the real route against Supabase for the accepted pending and completed
   histories plus all negative cases.
6. Exercise an explicit configuration cutover to Supabase and rollback to D1.
7. Leave D1 intact and keep Supabase disabled by default until Stage 04 accepts
   hosted evidence and Stage 05 binds the release.

The migration is additive. There is no LIVE data copy, destructive D1 cleanup,
dual write, automatic retry of an ambiguous operation, or production cutover in
this run.

## Observable acceptance criteria

| ID | Observable result |
|---|---|
| `AC-SP-01` | The unchanged L14 route returns the exact accepted success envelope from hosted Supabase TEST. |
| `AC-SP-02` | The accepted 28-event pending history and 49-event completed history resolve in contiguous order with identical projected values. |
| `AC-SP-03` | The four PostgreSQL tables match the accepted column, identity, foreign-key, uniqueness, and nullability contract. |
| `AC-SP-04` | PostgreSQL guards reject update/delete of append-only history and reject invalid event sequence, subject binding, and trace transitions with zero partial mutation. |
| `AC-SP-05` | The runtime database role lacks `BYPASSRLS`, schema ownership, and write privileges for this read slice. |
| `AC-SP-06` | Anonymous and ordinary authenticated Data API roles have no access to the application schema, tables, or helper functions. |
| `AC-SP-07` | Owner A can resolve workspace A, while owner A cannot distinguish workspace B, trace B, an absent workspace, or an absent trace; all return the accepted byte-identical `404`. |
| `AC-SP-08` | Reusing a pooled connection for owner B after owner A reveals no owner A rows or transaction-local tenant context. |
| `AC-SP-09` | Missing authentication returns exact `401`, forbidden query selection returns exact `400`, incomplete history returns event-free `409`, and unavailable Supabase returns masked `500`. |
| `AC-SP-10` | Unknown secret-bearing event fields remain absent from the response and persisted provider errors contain no credentials. |
| `AC-SP-11` | Three repeated reads preserve row counts and content hashes in all four PostgreSQL tables. |
| `AC-SP-12` | Each request uses exactly one explicit backend; tests prove no silent D1 fallback and no dual write. |
| `AC-SP-13` | A cold configuration rollback restores the accepted D1 route without schema repair, data mutation, or fixture regeneration. |
| `AC-SP-14` | Local PostgreSQL database tests and hosted TEST probes both pass; local success alone cannot satisfy the criterion. |
| `AC-SP-15` | Security and performance advisors are captured after hosted DDL, and every finding is resolved or explicitly blocks the gate. |
| `AC-SP-16` | Logs, artifacts, committed files, and browser output contain no database password, secret/service-role key, bearer token, or raw owner identifier. |

## Required negative cases

| ID | Attack or failure |
|---|---|
| `NEG-SP-01` | Browser or client code attempts to import privileged database configuration. |
| `NEG-SP-02` | Anonymous Data API access attempts to read any application table. |
| `NEG-SP-03` | Authenticated user requests another workspace or trace. |
| `NEG-SP-04` | Caller-supplied headers, cookies, query parameters, or payloads attempt to choose database identity or tenant settings. |
| `NEG-SP-05` | A pooled connection is reused after a prior tenant transaction. |
| `NEG-SP-06` | An event is inserted with a gap, duplicate sequence, foreign trace, or foreign workspace. |
| `NEG-SP-07` | Existing trace events or protected trace identity are updated or deleted. |
| `NEG-SP-08` | Supabase is unavailable, returns malformed rows, or exposes a provider error containing sensitive detail. |
| `NEG-SP-09` | Runtime configuration names Supabase but credentials are missing or invalid. |
| `NEG-SP-10` | Code attempts fallback from Supabase to D1 after a connection or query failure. |
| `NEG-SP-11` | Migration or fixture load fails midway. |
| `NEG-SP-12` | Hosted schema advisors report unresolved RLS, privilege, or index findings. |

## Rollback contract

Rollback is a configuration change performed before a request begins. It
selects the intact D1 adapter and requires the accepted D1 schema and fixture
checks to pass. It never copies newer PostgreSQL writes back to D1 because this
slice is read-only. If parity fails after Supabase selection, the request fails
closed; operators may select D1 for a later request after recording the failure.

Removing D1 bindings, migrations, adapters, or fixture coverage is expressly
deferred to a later accepted cutover run.

## Hosted target and cost gate

Stage 01 selects no existing Supabase project and makes no remote changes. The
connected account currently has projects, but none is inferred to belong to
Company Flight Recorder. Before Stage 03 hosted DDL, the human must select a
dedicated TEST project or approve an isolated development branch, its
organization, region, and any reported recurring cost. Production and unrelated
projects are excluded.

## Exclusions

- Supabase Auth, Storage, Realtime, Queues, Edge Functions, and client-side Data API access;
- write-path migration, graph execution, approvals, effects, outcomes, or LIVE data;
- mutation of existing Supabase projects without explicit target selection;
- deletion or modification of the accepted D1 migrations and evidence;
- public claims of production Supabase operation, causal outcomes, or exactly-once delivery.

## Current documentation constraints

The design uses current Supabase guidance: serverless Cloudflare runtimes may
use Postgres.js; transient application traffic belongs on transaction pooling;
transaction mode does not support prepared statements; migrations use direct or
session connections; exposed tables require explicit grants plus RLS; and pgTAP
can verify database structure, policies, functions, and integrity. The current
changelog's Data API auto-exposure change reinforces the explicit no-exposure
contract. These assumptions must be rechecked during implementation because the
platform changes independently of this repository.

## Declared input bindings

| Input | SHA-256 |
|---|---|
| `factory/01_spec/CONTEXT.md` | `740cde6585aab54644a12307b13944ec91029c9ab8f8f38775e5eba5e6d0a6de` |
| `factory/_shared/ARCHITECTURE_SNAPSHOT.md` | `e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `factory/_lib/verify-kit.mjs` | `b2c7434bf3acacbfb6323b33cf0b175f77d0e3b1d66aeadee6e9ea996c95015c` |
| `package.json` | `c8a9ab36760f08998d304efdc6a4d514a22f8d7ea05ab8c8df992ecc09f75972` |
| `drizzle.config.ts` | `3ec3fe6a06a9be54bbd980ec2fc72b014bfdc7d30b5c92d02aa0aa3c95e39b1a` |
| `vite.config.ts` | `4a8de6242dc5eecaf99f582ec511cd4f6ee367648b38d5599c90f462cdc89fd0` |
| `worker/index.ts` | `2ed36d7fa996e946d9d7695c5925e7760246f6bf8fa35c06f1bc515c087dc450` |
| `db/index.ts` | `c6fc9494d04c9457fc4178bed614d0e4ba7c5877e9d65ced11c691b735ec851e` |
| `db/migrations.ts` | `a33c9d1a2435c4a93b1f8f9a779d99084e4903aca6c326d7f308667d285a53b1` |
| `db/schema.ts` | `a9b641b3d901dd496a2cbecb8ce0527d085a5348d0a935d4424b2dde92cc1496` |
| `db/flight-recorder-schema.ts` | `18f30283877491c7a15de0667134aa07cd1ff21e41f9b626f0377b145c46cd09` |
| `db/trace-resolution.ts` | `2c13169c911ed46ed96670361fb0b88382184dfb92e8e11da5c6e353f16536f9` |
| `drizzle/` | `731872e4cf51b1fd99e860804622fd0e1a39903811590d7692f451a9fbaa2014` |
| `tests/flight-recorder-build.test.mjs` | `6829c8405785647baba19975f60cde2b9dff62fb927bd27176725d74159df73b` |
| `tests/flight-recorder-data.test.mjs` | `d4be07a521bbfd19726d3ea2aa3bdd034620a2518a2375e8e4cf79ada8e032cf` |
