---
type: stage-contract
status: blank
stage: 02_data
unit: persisted-graph-executor-correction
---

# 02_data - make the graph-execution contract executable

One job: turn the accepted L06 specification into executable fixtures and data
contracts for the fixed runtime graph.

## Inputs

- Freshness dependency: `../01_spec/output/SPEC.md`
- Freshness dependency: `../01_spec/output/HUMAN_GATE.md`
- Freshness dependency: `../_shared/ARCHITECTURE_SNAPSHOT.md`
- Freshness dependency: `../_shared/QUALITY_GATES.md`
- Observed baseline: `../../db/flight-recorder-contracts.ts`
- Observed baseline: `../../db/flight-recorder-schema.ts`
- Observed baseline: `../../db/flight-recorder-demo.ts`
- Stage-owned surface: `fixtures/persisted-graph-executor.fixture.mjs`
- Stage-owned surface: `output/DATA_PACKAGE.md`
- Stage-owned surface: `output/VERIFY.md`
- Stage-owned surface: `output/HUMAN_GATE.md`
- Stage-owned surface: `verify.mjs`

Do not load later stages, `_archive/`, unrelated product areas, or the source
vault.

## Process

1. Hash the accepted specification, gate, and shared references.
2. Define executable node, dependency, state-transition, evidence, cost, and
   recovery cases for the one fixed graph.
3. Include deterministic happy, interruption/resume, duplicate, out-of-order,
   failure, and cross-workspace negative cases.
4. Write the data package and verifier, then stop.

## Outputs

- `output/DATA_PACKAGE.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md`

## Verify

Create `verify.mjs` using `../_lib/verify-kit.mjs`. It must execute the fixture,
validate stable identities and expected transitions, reject forbidden graph or
tenant mutations, and prove that FIXTURE data cannot be mistaken for runtime
proof. Record exact commands, hashes, environment, results, and
`status: passed | failed` in `output/VERIFY.md`.

## Human gate

The reviewer binds `DATA_PACKAGE.md` and `VERIFY.md` hashes and records a gate
decision. Do not begin Stage 03 without `accepted`.

## Failure routing

Correct this data contract or reopen Stage 01. Never patch product code to hide
an ambiguous fixture or oracle.
