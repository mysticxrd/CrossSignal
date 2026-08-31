---
type: stage-contract
stage: 02_data
unit: append-only-authority-control-history-and-trace-projection-completeness
status: active
---

# 02_data - make the L04 authority and trace contracts executable

One job: turn the accepted L04 specification into one hash-bound executable data
package covering schema, migration, authority events, ordered trace projection,
redaction, concurrency schedules, and negative fixtures without changing the
durable product.

## Inputs

- Freshness dependency: `../01_spec/output/SPEC.md`
- Freshness dependency: `../01_spec/output/HUMAN_GATE.md`
- Freshness dependency: `../_shared/ARCHITECTURE_SNAPSHOT.md`
- Freshness dependency: `../_shared/QUALITY_GATES.md`
- Tooling dependency: `../_lib/verify-kit.mjs`
- Tooling dependency: `../_lib/factory-state.mjs`
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
- Observed baseline: `../../tests/flight-recorder-data.test.mjs`
- Observed baseline: `../../tests/flight-recorder-build.test.mjs`
- Stage-owned surface: `output/DATA_PACKAGE.md`
- Stage-owned surface: `output/VERIFY.md`
- Stage-owned surface: `output/HUMAN_GATE.md`
- Stage-owned surface: `fixtures/l04-authority-trace.fixture.mjs`
- Stage-owned surface: `verify.mjs`

Do not load: later stages, `_archive/`, the source vault, the whole repository,
or any product path not named above.

## Process

1. Read and hash the accepted specification, gate, shared references, tooling,
   and declared product baselines by role.
2. Resolve exact durable identities, constraints, migration/backfill phases,
   control-event authority checks, trace-event state chains, and redaction
   allowlists.
3. Encode the golden tenant, collision tenant, control transitions, authority
   lineage, projection, duplicate/no-op cases, migration failures, and race
   schedules in one deterministic executable fixture.
4. Map all twelve accepted criteria and negative cases to Stage 03 product
   paths and exact verification assertions.
5. Write the data package and verification record, then stop.

## Outputs

- `output/DATA_PACKAGE.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md` - opened for reviewer decision

## Verify

Run `node factory/02_data/verify.mjs`. It must execute the fixture and fail
closed on input drift, missing schema or migration constraints, ambiguous
control/trace ordering, non-idempotent backfill, incomplete authority subject
chains, projection omission or cross-tenant inclusion, secret leakage, missing
race schedules, uncovered accepted criteria/negative cases, or L14 scope entry.

Record the exact command, timestamp, environment, exit code, fixture result,
and normalized artifact hashes in `output/VERIFY.md` with `status: passed`.

## Human gate

The reviewer edits `DATA_PACKAGE.md` if needed, records the reviewed data
package and verification hashes in `HUMAN_GATE.md`, and chooses `accepted`,
`changes-requested`, or `rejected`. Do not begin Stage 03 without `accepted`.

## Failure routing

Correct the Stage 02 data package or return to the accepted specification.
Never patch Stage 03 product code to compensate for an ambiguous data contract.
