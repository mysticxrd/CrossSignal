---
type: stage-contract
stage: 04_verify
unit: append-only-authority-control-history-and-trace-projection-completeness
status: active
---

# 04_verify - establish release-grade L04 evidence

One job: independently verify the accepted L04 build against every accepted
criterion and negative case, record reproducible release-grade evidence, and
stop without changing product behavior or entering the L14 endpoint.

## Inputs

- Freshness dependency: `../03_build/output/BUILD_EVIDENCE.md`
- Freshness dependency: `../03_build/output/VERIFY.md`
- Freshness dependency: `../03_build/output/HUMAN_GATE.md`
- Freshness dependency: `../01_spec/output/SPEC.md`
- Freshness dependency: `../02_data/output/DATA_PACKAGE.md`
- Freshness dependency: `../02_data/fixtures/l04-authority-trace.fixture.mjs`
- Freshness dependency: `../_shared/ARCHITECTURE_SNAPSHOT.md`
- Freshness dependency: `../_shared/QUALITY_GATES.md`
- Tooling dependency: `../_lib/verify-kit.mjs`
- Tooling dependency: `../_lib/factory-state.mjs`
- Tooling dependency: `../../package.json`
- Tooling dependency: `../../eslint.config.mjs`
- Tooling dependency: `../../tsconfig.json`
- Authorized upstream compatibility correction: `../01_spec/verify.mjs`
- Observed compatibility contract: `../../tests/icm-workspace.test.mjs`
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
- Stage-owned surface: `output/VERIFICATION_REPORT.md`
- Stage-owned surface: `output/VERIFY.md`
- Stage-owned surface: `output/HUMAN_GATE.md`
- Stage-owned surface: `verify.mjs`

Do not load or change: product code, product tests, later stages, `_archive/`,
the source vault, routes/endpoints, middleware, worker code, provider behavior,
graph topology, or any path not named above.

## Process

1. Read and hash every declared input by role; confirm Stage 03 is accepted.
2. Independently map all twelve acceptance criteria and twelve negative cases
   to durable schema, runtime, fixture, test, and UI evidence.
3. Run fixture validation, the product data/build suite, L08/L06 regressions,
   lint, production build, rendered-output checks, the focused import-safe ICM
   specification contract, and Stage 03 verification. Do not execute the ICM
   catalog case that deliberately reads `_archive/`; its end-of-pipeline state
   case remains owned by Stage 05 after Ship outputs exist.
4. Inspect migration atomicity, authority races, tenant collisions, redaction,
   bounded reset, truth labels, and L14 scope exclusion.
5. Record exact commands, results, hashes, limitations, and release risks.
6. Write the report and verification artifacts, then stop.

## Outputs

- `output/VERIFICATION_REPORT.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md` - opened for reviewer decision

## Verify

Run `node factory/04_verify/verify.mjs`. It must fail on input drift, an
unaccepted Stage 03 gate, missing criterion/negative coverage, fixture drift,
mutable or ambiguous authority history, stale/missing effect binding, incomplete
or unsafe projection, tenant leakage, reset loss, truth/provider mislabeling,
L08/L06 regression, unauthorized product mutation, L14 scope entry, lint/test/
build/render failure, or incomplete verification artifacts.

Record exact commands, timestamps, environment, exit codes, output summaries,
and normalized input/product/report hashes in `output/VERIFY.md` with
`status: passed`.

## Human gate

The reviewer inspects criterion resolution, negative evidence, residual risks,
and reproducibility, then binds `VERIFICATION_REPORT.md` and `VERIFY.md` hashes
with `accepted`, `changes-requested`, or `rejected`. Do not begin Stage 05
without `accepted`.

## Failure routing

Return any defect to Stage 03 or its upstream contract. Stage 04 never patches
the product or weakens a guard to manufacture a passing report.
