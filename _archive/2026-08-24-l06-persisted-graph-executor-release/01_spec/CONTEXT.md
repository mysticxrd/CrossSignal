---
type: stage-contract
status: blank
stage: 01_spec
unit: persisted-graph-executor-correction
---

# 01_spec - specify actual bounded graph execution

One job: turn finding L06 into an accepted specification for executing the
fixed reasoning graph at runtime instead of presenting fixture-built graph
records as execution proof.

## Inputs

- Freshness dependency: `../_shared/ARCHITECTURE_SNAPSHOT.md`
- Freshness dependency: `../_shared/QUALITY_GATES.md`
- Observed baseline: `../../db/flight-recorder.ts`
- Observed baseline: `../../db/flight-recorder-demo.ts`
- Observed baseline: `../../db/flight-recorder-contracts.ts`
- Observed baseline: `../../db/flight-recorder-schema.ts`
- Observed baseline: `../../tests/flight-recorder-build.test.mjs`
- Observed baseline: `../../tests/flight-recorder-release.test.mjs`
- Stage-owned surface: `output/SPEC.md`
- Stage-owned surface: `output/VERIFY.md`
- Stage-owned surface: `output/HUMAN_GATE.md`
- Stage-owned surface: `verify.mjs`

The contract must stay inside the approved fixed planner / workers / skeptic /
synthesizer graph. It must not introduce an arbitrary DAG engine, general
agent orchestrator, new authority path, or unlabeled simulated execution.

Do not load later stages, `_archive/`, unrelated product areas, or the source
vault.

## Process

1. Establish precisely where the current demo constructs graph evidence
   without a runtime executor.
2. Define the bounded runtime contract: node identities, dependencies, durable
   state, resumability, failure behavior, evidence, costs, and truth labels.
3. State observable acceptance criteria and explicit non-goals.
4. Write the specification and verification record, then stop.

## Outputs

- `output/SPEC.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md`

## Verify

Create `verify.mjs` from the stage template conventions and import helpers from
`../_lib/verify-kit.mjs`. Verification must prove declared-input coverage,
stable acceptance-criterion identifiers, explicit interruption and duplicate
handling, persisted evidence requirements, truth-mode honesty, and the bounded
non-goals. Record exact commands, hashes, environment, results, and
`status: passed | failed` in `output/VERIFY.md`.

## Human gate

The reviewer binds `SPEC.md` and `VERIFY.md` hashes and records `accepted`,
`changes-requested`, or `rejected`. Do not begin Stage 02 without `accepted`.

## Failure routing

Correct this specification or an approved shared source. Never defer an
unresolved execution invariant to a later stage.
