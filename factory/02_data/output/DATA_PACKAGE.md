---
type: data-package
stage: 02_data
unit: supabase-postgres-authenticated-trace-resolution-parity
status: proposed
truth_mode: TEST
---

# Supabase PostgreSQL trace-resolution data package

## Decision

The first Supabase slice is a private, read-only PostgreSQL projection in the
`cfr_app` schema. It contains the four accepted route dependencies, a no-login
least-privilege reader role, forced row-level security, deterministic FIXTURE
rows, and a transactional SQL verification contract. No hosted project has
been selected and no remote DDL has been executed.

Stage 03 may use this package to implement and locally exercise the PostgreSQL
adapter. Applying it to hosted Supabase remains separately gated by explicit
TEST project selection.

## Executable artifacts

| Artifact | Purpose | SHA-256 |
|---|---|---|
| `factory/02_data/postgres/0001_trace_resolution_read_model.sql` | Transactional schema, role, grants, RLS policies, indexes, and guards | `11818cf9c18ad92029bb624018582f665481e7b4cd986a577370c3f2fd914cdb` |
| `factory/02_data/postgres/0001_trace_resolution_read_model.tests.sql` | Transactional privilege, isolation, leakage, sequence, transition, and immutability tests | `29e37960cec710a707e011509ccdec56f051fbac95cbc250be266f236ae4fa0b` |
| `factory/02_data/fixtures/l14-trace-resolution.fixture.mjs` | Accepted provider-neutral L14 response contract | `d219e789eb364782fdb9974c48caf1b385b49e134e6352af860c93c0d3e4dd0d` |
| `factory/02_data/fixtures/supabase-trace-resolution.fixture.mjs` | Four-table PostgreSQL FIXTURE transform and executable validator | `cfc5ee7e900595ba0fbc220bd8b6208671f5060da1dbec107a5301ad13dc95f1` |

## SQLite-to-PostgreSQL table map

### `workspaces`

| SQLite column | PostgreSQL column/type | Constraint translation |
|---|---|---|
| `id text` | `id text` | Primary key preserved. |
| `name text` | `name text` | `NOT NULL` preserved. |
| `slug text` | `slug text` | Unique constraint preserved as `uq_workspaces_slug`. |
| `owner_user_id text` | `owner_user_id text` | Required value and lookup index preserved. A deferred composite FK requires the owner membership in the same load transaction; the direct FK to excluded `users` is deferred. |
| `created_at text` | `created_at timestamptz` | Required and default-now semantics preserved with native time validation. |
| `updated_at text` | `updated_at timestamptz` | Required and default-now semantics preserved with native time validation. |

### `workspace_members`

| SQLite column | PostgreSQL column/type | Constraint translation |
|---|---|---|
| `workspace_id text` | `workspace_id text` | Composite primary key member; FK to `workspaces(id)` with cascade preserved. |
| `user_id text` | `user_id text` | Composite primary key member and lookup index preserved. The FK to excluded `users` is deferred. |
| `role text` | `role text` | `NOT NULL` and owner-only check preserved. |
| `joined_at text` | `joined_at timestamptz` | Required and default-now semantics preserved. |

### `flight_traces`

| SQLite column | PostgreSQL column/type | Constraint translation |
|---|---|---|
| `id text` | `id text` | Global primary key preserved. |
| `workspace_id text` | `workspace_id text` | FK to `workspaces(id)` with cascade and unique `(workspace_id,id)` preserved. |
| `trace_key text` | `trace_key text` | Required and unique within workspace preserved. |
| `fixture_key text` | `fixture_key text` | Nullable; required when `truth_mode='FIXTURE'`. |
| `truth_mode text` | `truth_mode text` | `LIVE`, `TEST`, and `FIXTURE` check preserved. |
| `current_state text` | `current_state text` | Default and nine-state check preserved. |
| `active_intent_id text` | `active_intent_id text` | Scalar and workspace lookup index preserved; write-path authority validation is deferred. |
| `retention_class text` | `retention_class text` | Two-value check preserved. |
| `retention_until text` | `retention_until timestamptz` | SQLite `unixepoch` validity check becomes native type validation. |
| `created_by text` | `created_by text` | Composite owner membership FK preserved; direct FK to excluded `users` is deferred. |
| `created_at text` | `created_at timestamptz` | Required and default-now semantics preserved. |
| `updated_at text` | `updated_at timestamptz` | Required and default-now semantics preserved. |

### `flight_trace_events`

| SQLite column | PostgreSQL column/type | Constraint translation |
|---|---|---|
| `id text` | `id text` | Global primary key and unique `(workspace_id,id)` preserved. |
| `workspace_id text` | `workspace_id text` | Workspace FK and every tenant-scoped unique/index prefix preserved. |
| `trace_id text` | `trace_id text` | Composite FK to `(workspace_id,id)` and ordered lookup index preserved. |
| `sequence integer` | `sequence bigint` | Positive check and unique `(workspace_id,trace_id,sequence)` preserved. |
| `event_type text` | `event_type text` | Required open vocabulary preserved for forward-compatible redaction. |
| `subject_type text` | `subject_type text` | Eight-value check preserved. |
| `subject_id text` | `subject_id text` | Required subject reference preserved. |
| `prior_state text` | `prior_state text` | Nullable initial-state semantics preserved. |
| `current_state text` | `current_state text` | Required state preserved. |
| `actor_type text` | `actor_type text` | Four-value check preserved. |
| `actor_id text` | `actor_id text` | Nullable non-human actor and required owner member for human actor preserved by trigger. |
| `payload_json text` | `payload_json jsonb` | JSON validity becomes native; adapter must select `payload_json::text` for the existing projector. |
| `payload_hash text` | `payload_hash text` | Exact lowercase 64-hex check preserved with a PostgreSQL regex. |
| `idempotency_key text` | `idempotency_key text` | Workspace uniqueness preserved. |
| `occurred_at text` | `occurred_at timestamptz` | SQLite time validity becomes native and monotonic ordering remains trigger-enforced. |

PostgreSQL adds the foreign-key-side and route indexes the read path needs:
workspace owner, membership user, trace state, active intent, event subject,
and `(workspace_id,trace_id,sequence)` order. PostgreSQL does not create foreign
key indexes automatically, so every included referencing/filter column is
covered explicitly or by a leading unique/primary-key prefix.

## Guard map

| SQLite guard | PostgreSQL result |
|---|---|
| `trg_flight_traces_identity_immutable` | Ported as a `SECURITY INVOKER` trigger with an empty function search path. |
| Event update and non-FIXTURE delete guards | Ported. FIXTURE cleanup remains possible; durable TEST/LIVE event deletion fails. |
| Global sequence and event-time guard | Ported with a per-trace transaction advisory lock to serialize concurrent append validation. |
| Human actor membership | Ported against `workspace_members`. |
| Trace subject binding | Ported: `subject_type='trace'` requires `subject_id=trace_id`; the composite trace FK prevents foreign workspace/trace rows. |
| Per-subject head and state machine | Ported for all eight subject types. |
| Non-trace subject-to-source-row binding | Deferred because its source tables are outside the accepted four-table slice. |
| L08 active-intent and L04 execution-authority projection guards | Deferred with their write-path tables; the reader role cannot mutate either projection. |

## Scope correction requiring human ownership

The accepted Stage 01 text asks the four-table slice to preserve every subject
binding guard. The SQLite non-trace guard queries `context_snapshots`,
`reasoning_nodes`, `action_intents`, `policy_decisions`, `approval_grants`,
`effect_attempts`, and outcome tables. Full referential enforcement therefore
cannot coexist with a four-table schema.

This package preserves the read contract, composite tenant/trace binding,
human membership, sequence, time, immutability, and every subject state
transition. It does not claim source-row referential proof for non-trace
subjects or write-path authority. Stage 03 may prove read-only route parity,
but `AC-SP-04` remains only partially satisfiable until a later write slice
migrates the referenced tables or an accepted specification revision narrows
that criterion. D1 cannot be removed while this limitation remains.

## Tenant and privilege contract

- `cfr_app` is a private schema and is not added to Supabase Data API exposed schemas.
- `anon`, `authenticated`, and `service_role` receive neither schema usage nor table/function privileges.
- `cfr_trace_reader` is `NOLOGIN`, non-superuser, non-creator, non-replication, and has no `BYPASSRLS`.
- A separately managed runtime login may inherit `cfr_trace_reader`; its secret is never committed or sent to the browser.
- All four tables enable and force RLS. Policies exist only for `SELECT TO cfr_trace_reader`.
- Policies require transaction-local `app.current_user_id` and `app.current_workspace_id`; the membership row must be owner-scoped.
- The resolver keeps explicit workspace/trace predicates in addition to RLS.
- Hosted traffic must begin a read-only transaction, set both values locally, perform all reads, and end the transaction before returning the Supavisor transaction-mode connection.
- Prepared statements remain disabled for transaction pooling; migration/test connections use direct or session mode over TLS.

Custom settings carry server-asserted application identity. They are safe only
behind the existing authenticated server boundary and do not replace that
boundary. The read role itself has no mutation privilege.

## Deterministic fixture contract

The PostgreSQL fixture is labeled `FIXTURE` for a hosted `TEST` environment.
It derives from the accepted L14 response fixture and exports four tables,
stable counts, per-table SHA-256 digests, a source digest, and a package digest.

| Table | Rows | Logical digest |
|---|---:|---|
| `workspaces` | 2 | `2f77d9452f259766ffe35d06d0090706b73e1f9383dfca08c8020509aaec5f2b` |
| `workspace_members` | 2 | `a77b46faa3136fb5350b1f2523e9610ad7dc819bc8a4e4a63c9ff4a373c37a91` |
| `flight_traces` | 2 | `44dfb50bac770ff9657cf94ed859ccd8423c9fb0140c8ca426a7ba0d784ab2de` |
| `flight_trace_events` | 77 | `9f17bd65ffab0cd87122a58e72b2faad9b46409c24065fb6ef87fd43cc318b78` |

Source digest: `3b005060f11bf8da81788686d32a3e7325edbfaf86d9323680f1ef0fda657ee4`.
Package digest: `8d87c72cb8c8d84575f16b66672fe8094930b631dbba58cf7e9b2df0a8ed396e`.

The fixture contains one 28-event pending trace and one 49-event completed
trace. Human actor IDs are rebound from the reusable L04 template identity to
the matching L14 workspace owner; actor IDs are not part of the public
projection. JSON payloads become logical JSON values for `jsonb`; their stored
source payload hashes and allowlisted public projections remain unchanged.

## Load and verification sequence

1. Apply the migration through the supported Supabase migration path using a direct or session connection.
2. In one transaction, load workspaces, members, traces, then events ordered by workspace, trace, and sequence.
3. Compare all four counts and logical digests with this package before enabling the adapter.
4. Run `0001_trace_resolution_read_model.tests.sql`; it rolls back every test mutation.
5. Verify owner A sees only 28 events, owner B sees only 49, an empty setting sees zero, and settings do not survive a transaction boundary.
6. Run Supabase security and performance advisors. Any finding blocks hosted acceptance until resolved.
7. Preserve the unchanged D1 database and configuration rollback path.

Stage 02 validation is static because no local PostgreSQL client/server is
available and no remote target is authorized. Stage 03 must execute the
migration and SQL test contract against PostgreSQL; static validation cannot
satisfy hosted acceptance.

## Rollback

The migration is additive and runs in one transaction. Before adapter
selection, failure rolls the schema transaction back. After a TEST load, the
dedicated test schema/project may be reset only under the later hosted target
authorization. Application rollback selects D1 before a request begins; it
does not copy PostgreSQL rows back to D1. No D1 migration, fixture, binding, or
adapter is removed by this package.

## Declared input bindings

| Input | SHA-256 |
|---|---|
| `factory/02_data/CONTEXT.md` | `b57f6e2f6009097f3e8b1bd211a0de0d720fd02d45be41fc45366dc621e0e465` |
| `factory/01_spec/output/SPEC.md` | `0e1990a042bde9b443482f9862e85158414d5098ed6c9348bfb9a08a931741d7` |
| `factory/01_spec/output/HUMAN_GATE.md` | `cfd37c326c0549f0168cd1c87384d1392ea79558515f23317fc698fe20a86c2f` |
| `factory/_shared/ARCHITECTURE_SNAPSHOT.md` | `e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `db/schema.ts` | `a9b641b3d901dd496a2cbecb8ce0527d085a5348d0a935d4424b2dde92cc1496` |
| `db/flight-recorder-schema.ts` | `18f30283877491c7a15de0667134aa07cd1ff21e41f9b626f0377b145c46cd09` |
| `db/trace-resolution.ts` | `2c13169c911ed46ed96670361fb0b88382184dfb92e8e11da5c6e353f16536f9` |
| `drizzle/` | `731872e4cf51b1fd99e860804622fd0e1a39903811590d7692f451a9fbaa2014` |
| `tests/flight-recorder-data.test.mjs` | `d4be07a521bbfd19726d3ea2aa3bdd034620a2518a2375e8e4cf79ada8e032cf` |
| `tests/flight-recorder-build.test.mjs` | `6829c8405785647baba19975f60cde2b9dff62fb927bd27176725d74159df73b` |
| `factory/02_data/fixtures/l14-trace-resolution.fixture.mjs` | `d219e789eb364782fdb9974c48caf1b385b49e134e6352af860c93c0d3e4dd0d` |
| `factory/_lib/verify-kit.mjs` | `b2c7434bf3acacbfb6323b33cf0b175f77d0e3b1d66aeadee6e9ea996c95015c` |
| `package.json` | `c8a9ab36760f08998d304efdc6a4d514a22f8d7ea05ab8c8df992ecc09f75972` |

The verifier recomputes these bindings and rejects drift.
