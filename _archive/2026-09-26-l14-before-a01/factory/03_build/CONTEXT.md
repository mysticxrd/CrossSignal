---
type: stage-contract
stage: 03_build
status: waiting
unit: supabase-postgres-authenticated-trace-resolution-parity
---

# 03_build - implement one durable Supabase parity slice

One job: build the accepted authenticated trace-resolution slice against
Supabase PostgreSQL and produce local plus hosted TEST evidence.

## Inputs

- Freshness dependency: `../02_data/output/DATA_PACKAGE.md`
- Freshness dependency: `../02_data/output/HUMAN_GATE.md`
- Freshness dependency: `../_shared/ARCHITECTURE_SNAPSHOT.md`
- Freshness dependency: `../_shared/QUALITY_GATES.md`
- Accepted PostgreSQL migration: `../02_data/postgres/0001_trace_resolution_read_model.sql`
- Accepted PostgreSQL SQL tests: `../02_data/postgres/0001_trace_resolution_read_model.tests.sql`
- Accepted PostgreSQL fixture: `../02_data/fixtures/supabase-trace-resolution.fixture.mjs`
- Database environment boundary: `../../db/index.ts`
- Existing D1 resolver: `../../db/trace-resolution.ts`
- Provider-neutral projection contract: `../../db/flight-recorder-contracts.ts`
- Server request contract: `../../app/trace-resolution.ts`
- Route boundary: `../../app/api/workspaces/[workspaceId]/traces/[traceId]/route.ts`
- Cloudflare environment boundary: `../../worker/index.ts`
- Runtime build configuration: `../../vite.config.ts`
- Dependency and command contracts: `../../package.json`
- Dependency lock: `../../package-lock.json`
- Existing route verification: `../../tests/flight-recorder-build.test.mjs`
- Verification primitives: `../_lib/verify-kit.mjs`

Do not load: later stages, `_archive/`, the whole repository, or any reference
not named above.

## Outputs

- `output/BUILD_EVIDENCE.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md`

## Human gate

The reviewer runs the complete TEST golden path and accepts evidence before
Stage 04.
