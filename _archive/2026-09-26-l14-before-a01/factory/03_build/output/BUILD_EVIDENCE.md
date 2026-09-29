---
type: build-evidence
stage: 03_build
unit: supabase-postgres-authenticated-trace-resolution-parity
status: proposed
truth_mode: TEST
target_project_ref: tonuxepirauyqcwbwenw
---

# Supabase authenticated trace-resolution build evidence

## Outcome

The accepted authenticated trace-resolution slice now has a Supabase
PostgreSQL implementation and hosted TEST proof. Runtime selection is explicit:
`CFR_DATABASE_PROVIDER=d1` keeps the existing D1 resolver, while
`CFR_DATABASE_PROVIDER=supabase` requires a Supavisor transaction-pooler URL on
port `6543` and dispatches to the PostgreSQL adapter. There is no silent
provider fallback.

The PostgreSQL adapter opens one read-only transaction, sets
`app.current_user_id` and `app.current_workspace_id` as transaction-local
settings, and retains explicit tenant predicates in every read. It uses
`postgres@3.4.9` with TLS, prepared statements disabled, and a one-connection
client suitable for the selected transaction-pooler path.

## Hosted TEST target

The selected target is Supabase project `company-flight-recorder-test`, project
reference `tonuxepirauyqcwbwenw`, in organization `CrossSignal`. At execution
time the dashboard showed the Free Plan, Nano/free compute, Mumbai
`ap-south-1`, and a healthy project. The Data API was disabled and automatic
RLS was enabled.

All three repository migrations were applied in lexical order. The exact
accepted fixture then loaded 2 workspaces, 2 workspace members, 2 traces, and 77 events. Its package digest was
`8d87c72cb8c8d84575f16b66672fe8094930b631dbba58cf7e9b2df0a8ed396e`.

## Hosted corrections and verification

The first fixture attempt failed transactionally with PostgreSQL error `23514`
because the accepted source data identifies its trace subject as
`trace_l04_onboarding`, while the read-model trace IDs are `l14-trace-a` and
`l14-trace-b`. No fixture rows committed. The trigger was corrected so later
`subject_type='trace'` events bind to the first trace-subject event in that
trace and still reject subject switching. The correction is preserved in the
initial migration and in migration `202609080002` for already-created targets.

Hosted transactional SQL verification passed after the migration granted the
SQL Editor's non-superuser `postgres` administrator membership in
`cfr_trace_reader`. The tests explicitly use `SET LOCAL ROLE cfr_trace_reader`;
application traffic must never use `postgres`. The verified observations were:

- the pending trace returned 28 events for its owner;
- the completed trace returned 49 events for its owner;
- both cross-tenant reads returned zero rows;
- missing transaction-local tenant settings returned zero rows;
- reader mutation, sequence gaps, invalid transitions, foreign trace subjects,
  and event mutation were rejected; and
- all test mutations rolled back.

The Supabase Advisor Center was refreshed after the RLS-expression and
foreign-key index fixes. The final state contained only six `Unused Index` INFO
notices. These are expected for a newly loaded 77-event TEST dataset; the
indexes serve accepted tenant queries and integrity paths. The earlier Auth RLS
Initialization Plan warnings and unindexed foreign-key notices were cleared.
Supabase documents the remaining advisory at
<https://supabase.com/docs/guides/observability/advisors?queryGroups=lint&lint=0005_unused_index>.

## Runtime adapter proof

A short-lived login inheriting only `cfr_trace_reader` exercised the real
`db/supabase-trace-resolution.ts` adapter through Supavisor's transaction
endpoint. The safe result was:

```json
{"provider":"supabase","pooler":"transaction","pendingEvents":28,"completedEvents":49,"crossTenant":"not_found"}
```

The cross-tenant adapter result was `not_found`.

The login's membership was revoked, the role was dropped, and the local probe
script and secret file were deleted immediately afterward. A hosted query
confirmed `probe_removed: true`. No database password, OAuth token, connection
string, or runtime login is retained in the repository or Stage 03 evidence.

## Bound implementation artifacts

| Artifact | SHA-256 |
|---|---|
| `db/postgres-trace-schema.ts` | `870aa3a1fc9d960fe8b21d319907500cab2c48f6583f7e8fb892756a60a93209` |
| `db/supabase-trace-resolution.ts` | `4f9070ff076be6adb01f60489e523b50e1c9947a299550967189c3112bb2e70d` |
| `db/index.ts` | `6bebce0b0cd7008c395ab9997a65ac695d931ce2edd483fc7eba00cbf93ff02e` |
| `db/trace-resolution.ts` | `97d14e05c37db95218931adc30cca2e6172b7605bdfd1809b0ad31d18c835e7f` |
| `worker/index.ts` | `b88b7a6c166e97e61687cae6d106a4130648b9abc460b05677c59a2699215c7a` |
| `supabase/migrations/202609080001_trace_resolution_read_model.sql` | `7bb8095610b9f1a7f881c5e74f8b4be3caf4b7eece95da2a36d66f88afd897f2` |
| `supabase/migrations/202609080002_fix_trace_subject_binding.sql` | `f4f243fbd5b2a11e0b87b542938d59a2591663b498605bcbf81fddaf57b9091d` |
| `supabase/migrations/202609080003_optimize_trace_read_model.sql` | `b5b3b26fedd72c244dab4a9ce22b164ae34137f20e700bbec1231cdf71e505e8` |
| `supabase/tests/trace_resolution_read_model.sql` | `ce0496f547b53e081d0c06c2ddd7fab5ca9a7f5b6ae2d644aaeea17799b9c6aa` |
| `supabase/README.md` | `e4d93dddb8bea6e69b27505a1da6eb225ad33c5d54030be6ccdfe5e2f94b7eec` |
| `factory/03_build/generate-supabase-fixture-sql.mjs` | `0f29bd1dd28980650e7943b3f3de574ec65547641e2b3eb0270798390446f270` |
| `tests/supabase-trace-resolution.test.mjs` | `9974d804edbc7ce4b7be20fecd0350e03010132a5f959bdcf5817c1292c11850` |
| `package.json` | `36de379db867a33162a44a026a51206e40df01571f1551c686f4e6b050df7369` |
| `package-lock.json` | `0f5c0194664c27837a14a008344c9f51a7f51942569f9350d70006ee876d2b21` |

## Declared input bindings

| Input | SHA-256 |
|---|---|
| `factory/03_build/CONTEXT.md` | `f0395528d80dfcf6a6a673a34e590ee97001fe5c586817ed6dbb956e986915f7` |
| `factory/02_data/output/DATA_PACKAGE.md` | `325c122ed0983a40f25a04a88697c2aa7536fb099dce49f0a369f837c70b1861` |
| `factory/02_data/output/HUMAN_GATE.md` | `d24286f9b772d9fa66ef3775dbf3d8fdaac5dacf481b088f0745b7069abf3220` |
| `factory/_shared/ARCHITECTURE_SNAPSHOT.md` | `e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `factory/02_data/postgres/0001_trace_resolution_read_model.sql` | `11818cf9c18ad92029bb624018582f665481e7b4cd986a577370c3f2fd914cdb` |
| `factory/02_data/postgres/0001_trace_resolution_read_model.tests.sql` | `29e37960cec710a707e011509ccdec56f051fbac95cbc250be266f236ae4fa0b` |
| `factory/02_data/fixtures/supabase-trace-resolution.fixture.mjs` | `cfc5ee7e900595ba0fbc220bd8b6208671f5060da1dbec107a5301ad13dc95f1` |
| `db/index.ts` | `6bebce0b0cd7008c395ab9997a65ac695d931ce2edd483fc7eba00cbf93ff02e` |
| `db/trace-resolution.ts` | `97d14e05c37db95218931adc30cca2e6172b7605bdfd1809b0ad31d18c835e7f` |
| `db/flight-recorder-contracts.ts` | `e6d61497b43979aeb8dd9154c49aec7a04949a8db22ea30107dd82c05f796192` |
| `app/trace-resolution.ts` | `256b25f5350fe4c383f949dff9c6a2cdce7265626fbba62d1ee7439382f082fd` |
| `app/api/workspaces/[workspaceId]/traces/[traceId]/route.ts` | `418b13ecc92d5c5e7a075bab06e33b8195aea3205ebeacac66008cd53734d7e3` |
| `worker/index.ts` | `b88b7a6c166e97e61687cae6d106a4130648b9abc460b05677c59a2699215c7a` |
| `vite.config.ts` | `4a8de6242dc5eecaf99f582ec511cd4f6ee367648b38d5599c90f462cdc89fd0` |
| `package.json` | `36de379db867a33162a44a026a51206e40df01571f1551c686f4e6b050df7369` |
| `package-lock.json` | `0f5c0194664c27837a14a008344c9f51a7f51942569f9350d70006ee876d2b21` |
| `tests/flight-recorder-build.test.mjs` | `6829c8405785647baba19975f60cde2b9dff62fb927bd27176725d74159df73b` |
| `factory/_lib/verify-kit.mjs` | `b2c7434bf3acacbfb6323b33cf0b175f77d0e3b1d66aeadee6e9ea996c95015c` |

## Remaining boundary

This slice does not justify removing D1. The accepted four-table scope still
cannot preserve full non-trace subject binding or write-authority guards. The
Supabase adapter is implemented and proven in TEST, but no persistent
least-privilege runtime login or deployment secret has been created. That
credential and deployed route configuration belong to a later human-approved
step after this Stage 03 gate.
