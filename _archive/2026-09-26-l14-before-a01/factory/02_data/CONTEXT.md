---
type: stage-contract
stage: 02_data
status: waiting
unit: supabase-postgres-authenticated-trace-resolution-parity
---

# 02_data - make the accepted PostgreSQL contract executable

One job: turn the accepted Supabase parity specification into PostgreSQL schema,
policy, fixture, and migration contracts.

## Inputs

- Freshness dependency: `../01_spec/output/SPEC.md`
- Freshness dependency: `../01_spec/output/HUMAN_GATE.md`
- Freshness dependency: `../_shared/ARCHITECTURE_SNAPSHOT.md`
- Freshness dependency: `../_shared/QUALITY_GATES.md`
- SQLite source contract: `../../db/schema.ts`
- SQLite source contract: `../../db/flight-recorder-schema.ts`
- Resolver read contract: `../../db/trace-resolution.ts`
- Immutable SQLite migrations: `../../drizzle/`
- Accepted fixture and invariant evidence: `../../tests/flight-recorder-data.test.mjs`
- Accepted route parity evidence: `../../tests/flight-recorder-build.test.mjs`
- Accepted L14 parity fixture: `fixtures/l14-trace-resolution.fixture.mjs`
- Verification primitives: `../_lib/verify-kit.mjs`
- Repository verification commands: `../../package.json`

Do not load: later stages, `_archive/`, the whole repository, or any reference
not named above.

## Outputs

- `output/DATA_PACKAGE.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md`

## Human gate

The reviewer accepts ownership, provenance, tenant policy, constraints,
fixtures, rollback, and verification before Stage 03.
