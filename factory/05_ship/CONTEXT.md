---
type: stage-contract
stage: 05_ship
unit: append-only-authority-control-history-and-trace-projection-completeness
status: active
---

# 05_ship - package the verified L04 release

One job: turn accepted L04 verification into a cold evaluator-ready package
that binds the governed product head and stops before commit or seal.

## Inputs

- Freshness dependency: `../04_verify/output/VERIFICATION_REPORT.md`
- Freshness dependency: `../04_verify/output/VERIFY.md`
- Freshness dependency: `../04_verify/output/HUMAN_GATE.md`
- Freshness dependency: `../03_build/output/BUILD_EVIDENCE.md`
- Freshness dependency: `../03_build/output/HUMAN_GATE.md`
- Freshness dependency: `../02_data/output/DATA_PACKAGE.md`
- Freshness dependency: `../02_data/output/HUMAN_GATE.md`
- Freshness dependency: `../01_spec/output/SPEC.md`
- Freshness dependency: `../01_spec/output/HUMAN_GATE.md`
- Freshness dependency: `../_shared/ARCHITECTURE_SNAPSHOT.md`
- Freshness dependency: `../_shared/QUALITY_GATES.md`
- Tooling dependency: `../_lib/verify-kit.mjs`
- Tooling dependency: `../_lib/factory-state.mjs`
- Tooling dependency: `../../package.json`
- Tooling dependency: `../../eslint.config.mjs`
- Tooling dependency: `../../tsconfig.json`
- Observed release contract: `../../tests/icm-workspace.test.mjs`
- Observed product: `../../db/flight-recorder-schema.ts`
- Observed product: `../../db/flight-recorder-contracts.ts`
- Observed product: `../../db/flight-recorder.ts`
- Observed product: `../../db/flight-recorder-demo.ts`
- Observed product: `../../db/flight-recorder-graph.ts`
- Observed product: `../../db/migrations.ts`
- Observed product: `../../app/flight-recorder-types.ts`
- Observed product: `../../app/CrossSignalApp.tsx`
- Observed product: `../../drizzle/0008_l04_authority_history_trace_projection.sql`
- Observed product: `../../drizzle/meta/0008_snapshot.json`
- Observed product: `../../drizzle/meta/_journal.json`
- Observed product: `../../tests/flight-recorder-data.test.mjs`
- Observed product: `../../tests/flight-recorder-build.test.mjs`
- Observed product: `../../tests/fixtures/l04-authority-trace.fixture.mjs`
- Authorized compatibility correction: `../01_spec/verify.mjs`
- Stage-owned surface: `output/RELEASE_MANIFEST.md`
- Stage-owned surface: `output/DEMO_SCRIPT.md`
- Stage-owned surface: `output/VERIFY.md`
- Stage-owned surface: `output/HUMAN_GATE.md`
- Stage-owned surface: `prepare.mjs`
- Stage-owned surface: `verify.mjs`

Do not load: `_archive/`, the source vault, later-run work, or undeclared
references. Do not change product/tests, prior accepted outputs, routes,
middleware, workers, providers, topology, or benchmark stashes.

## Process

1. Hash every input and confirm Stage 04 acceptance.
2. Bind the L04 product/evidence head in a release manifest.
3. Write a cold preparation check and evaluator script with truth labels,
   negative probes, expected results, and limitations.
4. Run applicable tests, focused import-safe ICM contracts, lint, build, Stage
   04 verification, factory status, and diff checks. Never run the ICM archive
   catalog case.
5. Record reproducible evidence, open the human gate, and stop.

## Outputs

- `output/RELEASE_MANIFEST.md`
- `output/DEMO_SCRIPT.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md` - opened for reviewer decision

## Verify

Run `node factory/05_ship/verify.mjs`. Fail on drift, incomplete coverage,
unsafe instructions, truth-label regression, L08/L06 regression, L14 entry,
archive dependency, stash loss, or test/lint/build failure. The complete factory
state/seal assertion waits for gate acceptance and commit.

## Human gate

The reviewer runs the cold script and binds all three outputs. Do not commit,
seal, or begin L14 without acceptance and a later explicit instruction.

## Failure routing

Return defects upstream. Stage 05 never patches product behavior or weakens a
guard to manufacture a shippable result.
