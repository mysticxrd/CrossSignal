---
type: stage-contract
status: blank
stage: 03_build
unit: persisted-graph-executor-correction
---

# 03_build - implement the bounded persisted graph executor

One job: turn the accepted L06 data package into one durable runtime execution
slice for the fixed reasoning graph.

## Inputs

- Freshness dependency: `../02_data/output/DATA_PACKAGE.md`
- Freshness dependency: `../02_data/output/HUMAN_GATE.md`
- Freshness dependency: `../01_spec/output/SPEC.md`
- Freshness dependency: `../_shared/ARCHITECTURE_SNAPSHOT.md`
- Freshness dependency: `../_shared/QUALITY_GATES.md`
- Observed baseline: `../../db/flight-recorder.ts`
- Observed baseline: `../../db/flight-recorder-contracts.ts`
- Observed baseline: `../../db/flight-recorder-schema.ts`
- Observed baseline: `../../worker/`
- Observed baseline: `../../app/flight-recorder-actions.ts`
- Observed baseline: `../../app/flight-recorder-types.ts`
- Stage-owned surface: `../../db/`
- Stage-owned surface: `../../worker/`
- Stage-owned surface: `../../drizzle/`
- Stage-owned surface: `../../app/flight-recorder-actions.ts`
- Stage-owned surface: `../../app/flight-recorder-types.ts`
- Stage-owned surface: `../../tests/flight-recorder-build.test.mjs`
- Stage-owned surface: `../../tests/flight-recorder-release.test.mjs`
- Stage-owned surface: `output/BUILD_EVIDENCE.md`
- Stage-owned surface: `output/VERIFY.md`
- Stage-owned surface: `output/HUMAN_GATE.md`
- Stage-owned surface: `verify.mjs`

Do not load later stages, `_archive/`, unrelated product areas, or the source
vault. Schema or UI changes are allowed only when the accepted data package
requires them.

## Process

1. Implement stable node identities, dependency checks, durable transitions,
   and append-only execution evidence for the fixed graph.
2. Resume only incomplete work after interruption and preserve completed nodes.
3. Keep authority and external-effect checks on their existing trusted paths.
4. Prove the complete accepted data package and write build evidence, then stop.

## Outputs

- `output/BUILD_EVIDENCE.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md`

## Verify

Create `verify.mjs` using `../_lib/verify-kit.mjs`. Run focused and workspace
tests, migrations when applicable, lint, build, diff inspection, and the
accepted deterministic schedules. Evidence must distinguish actual runtime
execution from fixtures and show persisted node-level recovery. Record exact
commands, hashes, environment, results, and `status: passed | failed`.

## Human gate

The reviewer runs the fixed graph path, inspects persisted trace evidence, and
binds `BUILD_EVIDENCE.md` and `VERIFY.md`. Do not begin Stage 04 without an
`accepted` decision.

## Failure routing

Correct this implementation or reopen the stage that owns the faulty contract.
Never weaken authority, durability, or truth labeling to make the demo pass.
