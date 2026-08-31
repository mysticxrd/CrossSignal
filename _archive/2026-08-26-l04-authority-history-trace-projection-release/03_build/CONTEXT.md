---
type: stage-contract
stage: 03_build
unit: append-only-authority-control-history-and-trace-projection-completeness
status: active
---

# 03_build - implement the L04 durable vertical slice

One job: implement the accepted append-only authority-control history, exact
effect binding, complete authority subject events, and ordered redacted trace
projection as one durable migration/runtime/UI/test slice without entering the
L14 endpoint or unrelated product work.

## Inputs

- Freshness dependency: `../02_data/output/DATA_PACKAGE.md`
- Freshness dependency: `../02_data/output/HUMAN_GATE.md`
- Freshness dependency: `../02_data/fixtures/l04-authority-trace.fixture.mjs`
- Freshness dependency: `../_shared/ARCHITECTURE_SNAPSHOT.md`
- Freshness dependency: `../_shared/QUALITY_GATES.md`
- Tooling dependency: `../_lib/verify-kit.mjs`
- Tooling dependency: `../_lib/factory-state.mjs`
- Tooling dependency: `../../package.json`
- Tooling dependency: `../../drizzle.config.ts`
- Tooling dependency: `../../eslint.config.mjs`
- Tooling dependency: `../../tsconfig.json`
- Observed baseline: `../../db/flight-recorder-schema.ts`
- Observed baseline: `../../db/flight-recorder-contracts.ts`
- Observed baseline: `../../db/flight-recorder.ts`
- Observed baseline: `../../db/flight-recorder-demo.ts`
- Observed baseline: `../../db/flight-recorder-graph.ts`
- Observed baseline: `../../db/migrations.ts`
- Observed baseline: `../../app/flight-recorder-types.ts`
- Observed baseline: `../../app/CrossSignalApp.tsx`
- Observed baseline: `../../drizzle/0004_typical_omega_red.sql`
- Observed baseline: `../../drizzle/0005_flight_recorder_guards.sql`
- Observed baseline: `../../drizzle/0006_l08_active_intent_authority.sql`
- Observed baseline: `../../drizzle/0007_l06_persisted_graph_executor.sql`
- Observed baseline: `../../drizzle/meta/0007_snapshot.json`
- Observed baseline: `../../drizzle/meta/_journal.json`
- Observed baseline: `../../tests/flight-recorder-data.test.mjs`
- Observed baseline: `../../tests/flight-recorder-build.test.mjs`
- Stage-owned surface: `../../db/flight-recorder-schema.ts`
- Stage-owned surface: `../../db/flight-recorder-contracts.ts`
- Stage-owned surface: `../../db/flight-recorder.ts`
- Stage-owned surface: `../../db/flight-recorder-demo.ts`
- Stage-owned surface: `../../db/flight-recorder-graph.ts`
- Stage-owned surface: `../../db/migrations.ts`
- Stage-owned surface: `../../app/flight-recorder-types.ts`
- Stage-owned surface: `../../app/CrossSignalApp.tsx`
- Stage-owned surface: `../../drizzle/0008_l04_authority_history_trace_projection.sql`
- Stage-owned surface: `../../drizzle/meta/0008_snapshot.json`
- Stage-owned surface: `../../drizzle/meta/_journal.json`
- Stage-owned surface: `../../tests/flight-recorder-data.test.mjs`
- Stage-owned surface: `../../tests/flight-recorder-build.test.mjs`
- Stage-owned surface: `../../tests/fixtures/l04-authority-trace.fixture.mjs`
- Stage-owned surface: `output/BUILD_EVIDENCE.md`
- Stage-owned surface: `output/VERIFY.md`
- Stage-owned surface: `output/HUMAN_GATE.md`
- Stage-owned surface: `verify.mjs`

Do not load or change: later stages, `_archive/`, the source vault, any route or
endpoint, middleware, worker code, provider behavior, graph topology, or any
product path not named above.

## Process

1. Read and hash all declared inputs by role; confirm Stage 02 is accepted.
2. Copy the accepted fixture into durable tests before product tests depend on
   it.
3. Implement schema and migration guards, then compatibility/bootstrap logic.
4. Implement canonical control transitions, exact effect binding, complete
   subject events, projection validation/redaction, and minimal reviewer UI.
5. Extend durable data/build tests for every accepted criterion, negative case,
   migration schedule, tenant collision, race, reset, and L08/L06 regression.
6. Run focused tests, lint, production build, verifier, and diff inspection.
7. Write build evidence and verification, then stop.

## Outputs

- `output/BUILD_EVIDENCE.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md` - opened for reviewer decision

## Verify

Run `node factory/03_build/verify.mjs`. It must fail on input drift, unauthorized
paths, missing migration objects/metadata, mutable or ambiguous authority
history, a stale effect binding, incomplete/unsafe trace projection, missing
fixture/race/migration/tenant/reset coverage, L08/L06 regression, fixture truth
mislabeling, secret leakage, L14 scope entry, lint failure, test failure, or
production build failure.

Record exact commands, timestamps, environment, exit codes, output summaries,
and normalized input/product/output hashes in `output/VERIFY.md` with
`status: passed`.

## Human gate

The reviewer runs the complete golden path, inspects authority toggles and the
ordered trace, then binds `BUILD_EVIDENCE.md` and `VERIFY.md` hashes with one of
`accepted`, `changes-requested`, or `rejected`. Do not begin Stage 04 without
`accepted`.

## Failure routing

Correct Stage 03 within the accepted data package, or return upstream for a
contract change. Never weaken a durable guard or enter L14 to hide a failure.
