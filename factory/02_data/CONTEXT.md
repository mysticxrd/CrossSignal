---
type: stage-contract
stage: 02_data
unit: fixture-runtime-source-of-truth-correction
status: active
---

# 02_data - make fixture ownership executable

One job: transform the accepted L20 specification into hash-bound ownership,
projection-drift, seal-transition, and reset-isolation cases without changing
product code.

## Inputs

- Freshness dependency: `../01_spec/output/SPEC.md`
- Freshness dependency: `../01_spec/output/HUMAN_GATE.md`
- Freshness dependency: `../_shared/ARCHITECTURE_SNAPSHOT.md`
- Freshness dependency: `../_shared/QUALITY_GATES.md`
- Observed baseline: `../../db/flight-recorder-demo.ts`
- Observed baseline: `../../db/flight-recorder.ts`
- Observed baseline: `../../db/flight-recorder-graph.ts`
- Observed baseline: `../../tests/flight-recorder-data.test.mjs`
- Observed baseline: `../../tests/flight-recorder-build.test.mjs`
- Observed baseline: `../../tests/flight-recorder-release.test.mjs`
- Stage-owned surface: `CONTEXT.md`
- Stage-owned surface: `fixtures/fixture-runtime-ownership.fixture.mjs`
- Stage-owned surface: `verify.mjs`
- Stage-owned surface: `output/DATA_PACKAGE.md`
- Stage-owned surface: `output/VERIFY.md`
- Stage-owned surface: `output/HUMAN_GATE.md`

Do not load later stages, `_archive/`, dependency folders, generated build
output, the source vault, or any benchmark stash. Do not edit the accepted
Stage 01 verifier or outputs.

## Process

1. Hash the four freshness dependencies and six observed baseline files.
2. Encode allowed dependency direction, durable projection values, graph
   parity, exact reset preservation, seal-transition behavior, and named drift
   errors as deterministic executable cases.
3. Verify the current baseline projection, every negative mutation, complete
   acceptance-criterion coverage, and absence of secrets/archive authority.
4. Write the data package and evidence, then stop.

## Outputs

- `output/DATA_PACKAGE.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md` - reviewer-owned decision record

## Verify

Run `node factory/02_data/verify.mjs`. It must execute all fixture cases, bind
the accepted specification/gate/shared references and observed durable files,
prove named failures for forbidden imports and projection drift, and leave the
human gate open.

## Human gate

The reviewer confirms that cases are deterministic, distinguish factory
projection from durable authority, cover seal transitions and tenant-safe
reset, preserve fixture/runtime labels, and hand Stage 03 an unambiguous build
contract. Record current hashes and choose `accepted`, `changes-requested`, or
`rejected`. Do not begin Stage 03 without `accepted`.

## Failure routing

Correct the Stage 02 fixture, package, or verifier, or return to the accepted
specification. Never patch product code, later stages, archives, or stashes from
this stage.
