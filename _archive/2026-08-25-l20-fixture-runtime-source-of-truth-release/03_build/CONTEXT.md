---
type: stage-contract
stage: 03_build
unit: fixture-runtime-source-of-truth-correction
status: active
---

# 03_build - consolidate durable fixture and graph authority

One job: implement the accepted L20 data package as one durable vertical slice
whose runtime and product tests are independent of numbered factory fixtures.

## Inputs

- Freshness dependency: `../02_data/output/DATA_PACKAGE.md`
- Freshness dependency: `../02_data/output/HUMAN_GATE.md`
- Freshness dependency: `../_shared/ARCHITECTURE_SNAPSHOT.md`
- Freshness dependency: `../_shared/QUALITY_GATES.md`
- Observed baseline: `../../db/flight-recorder-demo.ts`
- Observed baseline: `../../db/flight-recorder.ts`
- Observed baseline: `../../db/flight-recorder-graph.ts`
- Observed baseline: `../../tests/flight-recorder-data.test.mjs`
- Observed baseline: `../../tests/flight-recorder-build.test.mjs`
- Observed baseline: `../../tests/flight-recorder-release.test.mjs`
- Observed baseline: `../../package.json`
- Stage-owned surface: `../../db/flight-recorder-demo.ts`
- Stage-owned surface: `../../db/flight-recorder-graph-definition.ts`
- Stage-owned surface: `../../db/flight-recorder-graph.ts`
- Stage-owned surface: `../../db/flight-recorder.ts`
- Stage-owned surface: `../../tests/fixtures/persisted-graph-executor.fixture.mjs`
- Stage-owned surface: `../../tests/flight-recorder-data.test.mjs`
- Stage-owned surface: `../../tests/flight-recorder-build.test.mjs`
- Stage-owned surface: `../../tests/flight-recorder-release.test.mjs`
- Stage-owned surface: `CONTEXT.md`
- Stage-owned surface: `verify.mjs`
- Stage-owned surface: `output/BUILD_EVIDENCE.md`
- Stage-owned surface: `output/VERIFY.md`
- Stage-owned surface: `output/HUMAN_GATE.md`

Do not load later stages, `_archive/`, dependency folders, generated build
output, the source vault, or benchmark stashes. Do not edit accepted Stage 01
or Stage 02 contracts, verifiers, fixtures, or outputs.

## Process

1. Hash the accepted data package/gate, shared references, and seven observed
   baseline files.
2. Extract the pure fixed-graph definition into the durable product tree,
   derive runtime and legacy precomputed projections from it, and replace
   stage-numbered public fixture names without changing persisted values.
3. Move durable L06 test vectors under `tests/fixtures/`, redirect durable
   tests away from numbered factory fixtures, and add determinism, dependency,
   projection, seal-transition, runtime, reset, compatibility, and negative
   coverage.
4. Run targeted product tests, type/build/lint checks appropriate to this stage,
   replay the accepted Stage 02 executable cases, and run the Build verifier.
   Record evidence and stop. The accepted Stage 02 verifier retains historical
   baseline hashes and is not rewritten after downstream product changes.

## Outputs

- `output/BUILD_EVIDENCE.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md` - reviewer-owned decision record

## Verify

Run `node factory/03_build/verify.mjs`. It must bind accepted inputs and product
outputs, execute Stage 02 cases and durable product tests, reject active
factory/archive imports and duplicate graph authority, prove exact reset and
runtime persistence, and leave the human gate open.

## Human gate

The reviewer runs the durable golden path, inspects the dependency direction
and graph-definition diff, confirms fixture/runtime labels and compatibility,
and verifies L04/L14 remain untouched. Record current hashes and choose
`accepted`, `changes-requested`, or `rejected`. Do not begin Stage 04 without
`accepted`.

## Failure routing

Correct this build or return to the accepted data package. Never weaken an
upstream contract, patch later stages, load archives, or alter benchmark
stashes to make the build pass.
