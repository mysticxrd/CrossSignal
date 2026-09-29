---
type: verification-record
stage: 02_data
unit: supabase-postgres-authenticated-trace-resolution-parity
status: passed
verified_at: 2026-09-08T13:03:00+05:30
truth_mode: TEST
---

# Supabase Stage 02 verification

## Result

The Stage 02 data package passes executable fixture validation, static
PostgreSQL contract validation, the existing D1 data and route suites, lint,
and diff inspection. No PostgreSQL server was available locally and no hosted
Supabase target is authorized, so the migration and transactional SQL test
file have not yet executed against PostgreSQL. That execution remains a hard
Stage 03 requirement and cannot be replaced by this static result.

## Environment

- Windows `Microsoft Windows NT 10.0.26200.0`
- Node.js `v22.15.0`
- Repository branch `codex/supabase-migration`
- Local truth mode `TEST` with fixtures explicitly labeled `FIXTURE`
- No remote Supabase project selected or mutated

## Commands and evidence

| Command | Time | Exit | Evidence |
|---|---|---:|---|
| `npm run verify:data` | 2026-09-08T13:03:00+05:30 | 0 | 9/9 existing data tests passed, then the Stage 02 verifier passed. |
| `node_modules/.bin/tsx.cmd --test tests/flight-recorder-build.test.mjs` | 2026-09-08T12:58:00+05:30 | 0 | 57/57 tests passed, including L14 pending/completed parity, tenant failures, redaction, and no-mutation reads. |
| `npm run lint` | 2026-09-08T13:03:00+05:30 | 0 | ESLint completed with no findings. |
| `git diff --check` | 2026-09-08T13:03:00+05:30 | 0 | No whitespace errors. |

The Windows npm shim was invoked through Node's installed `npm-cli.js`, as in
the accepted repository workflow.

## Corrected runner attempt

An initial direct command, `node --test tests/flight-recorder-data.test.mjs
tests/flight-recorder-build.test.mjs`, exited 1 before running the suites
because native Node did not load imported `.ts` files. It was not repeated.
The repository-declared `tsx` runner then executed both suites successfully as
recorded above. This was a command correction, not a product or test change.

## Stage verifier coverage

`factory/02_data/verify.mjs` confirmed:

- the upstream Stage 01 gate is closed, human-reviewed, and accepted;
- all 14 declared input hashes and four executable artifact hashes are fresh;
- exactly four tables are created in private schema `cfr_app`;
- the reader role is no-login, least-privilege, and lacks `BYPASSRLS`;
- all four tables enable and force RLS and have owner-scoped read policies;
- `anon`, `authenticated`, and `service_role` have no schema or table access;
- timestamps use `timestamptz`, payloads use `jsonb`, and event sequence uses `bigint`;
- transaction-local actor/workspace settings, advisory append locking, constraints, indexes, and guards are present;
- the PostgreSQL fixture has counts `2 / 2 / 2 / 77`, validates cleanly, and binds stable source, table, and package digests;
- the SQL test contract covers role privileges, tenant isolation, transaction leakage, mutation denial, sequence gaps, trace subject binding, invalid transitions, human membership, and event immutability;
- the partial non-trace subject-binding limitation and its D1-retention consequence are explicit;
- no connection URI, Supabase secret key, or JWT-shaped token appears in the new Stage 02 artifacts.

Verifier output:

```text
Supabase Stage 02 data verification passed: four private PostgreSQL tables, 77 deterministic fixture events, forced tenant RLS, least-privilege reader, transactional SQL tests, and explicit non-trace subject-binding limitation.
```

## PostgreSQL execution boundary

`psql` was not present. Static checks cannot prove PostgreSQL syntax, migration
atomicity, RLS behavior, transaction-pool tenant clearing, query plans, or
Supabase advisors. Stage 03 must run the migration, deterministic load, and
`0001_trace_resolution_read_model.tests.sql` against a selected TEST target,
then capture security and performance advisors. Any failure blocks Stage 03.

## Bound artifacts

| Artifact | SHA-256 |
|---|---|
| `factory/02_data/output/DATA_PACKAGE.md` | `325c122ed0983a40f25a04a88697c2aa7536fb099dce49f0a369f837c70b1861` |
| `factory/02_data/verify.mjs` | `b8d155672cd1bb7d33f8b2eeda90778d98486258c69c944933d6ab5d530a002c` |
| `factory/02_data/postgres/0001_trace_resolution_read_model.sql` | `11818cf9c18ad92029bb624018582f665481e7b4cd986a577370c3f2fd914cdb` |
| `factory/02_data/postgres/0001_trace_resolution_read_model.tests.sql` | `29e37960cec710a707e011509ccdec56f051fbac95cbc250be266f236ae4fa0b` |
| `factory/02_data/fixtures/l14-trace-resolution.fixture.mjs` | `d219e789eb364782fdb9974c48caf1b385b49e134e6352af860c93c0d3e4dd0d` |
| `factory/02_data/fixtures/supabase-trace-resolution.fixture.mjs` | `cfc5ee7e900595ba0fbc220bd8b6208671f5060da1dbec107a5301ad13dc95f1` |

This verification opens the Stage 02 human gate. It does not accept the gate,
authorize hosted DDL, or satisfy Stage 03 PostgreSQL execution evidence.
