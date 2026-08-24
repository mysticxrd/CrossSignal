---
type: stage-contract
stage: 01_spec
unit: fixture-runtime-source-of-truth-correction
status: active
---

# 01_spec - bind fixture ownership to durable runtime truth

One job: turn L20 fixture/runtime source-of-truth drift into one accepted,
observable correction specification without changing product code or data.

## Inputs

- Freshness dependency: `../_shared/ARCHITECTURE_SNAPSHOT.md`
- Freshness dependency: `../_shared/QUALITY_GATES.md`
- Observed baseline: `../../db/flight-recorder-demo.ts`
- Observed baseline: `../../db/flight-recorder.ts`
- Observed baseline: `../../db/flight-recorder-graph.ts`
- Observed baseline: `../../tests/flight-recorder-data.test.mjs`
- Observed baseline: `../../tests/flight-recorder-build.test.mjs`
- Observed baseline: `../../tests/flight-recorder-release.test.mjs`
- Stage-owned surface: `CONTEXT.md`
- Stage-owned surface: `verify.mjs`
- Stage-owned surface: `output/SPEC.md`
- Stage-owned surface: `output/VERIFY.md`
- Stage-owned surface: `output/HUMAN_GATE.md`

The human task directive supplies the finding label and required sequence. The
repository baseline supplies the observable defect and correction boundary.
Do not load later stages, `_archive/`, dependency folders, generated build
output, benchmark stash contents beyond read-only finding provenance, or the
whole repository.

## Process

1. Hash the contract, two shared references, and six observed baseline files.
2. Specify one durable fixture source of truth and the allowed factory
   projection boundary.
3. Resolve ownership, compatibility, failure behavior, migration expectations,
   acceptance criteria, verification cases, and explicit non-goals.
4. Write `SPEC.md`, run the stage verifier, record evidence, and stop.

## Outputs

- `output/SPEC.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md` - reviewer-owned decision record

## Verify

Run `node factory/01_spec/verify.mjs`. The verifier must bind every declared
input and the specification by SHA-256, reject missing ownership or acceptance
sections, reject `_archive/` as an active dependency, and leave the gate open
for a person.

## Human gate

The reviewer confirms that the correction eliminates run-scoped imports from
durable runtime/tests, retains fixture truth labeling and deterministic replay,
and does not broaden into L04 or L14. Record reviewed hashes and choose
`accepted`, `changes-requested`, or `rejected`. Do not begin Stage 02 without
`accepted`.

## Failure routing

Correct this specification or a declared baseline. Never edit product code,
data contracts, later stages, archives, or benchmark stashes from Stage 01.
