---
type: stage-contract
stage: 02
job: make-authority-correction-contracts-executable
---

# 02_data - define executable authority contracts

One job: turn the accepted L08 specification into canonical schema, state,
authority, migration, and deterministic interleaving contracts.

## Inputs

- Freshness dependency: `../01_spec/output/SPEC.md`
- Freshness dependency: `../01_spec/output/HUMAN_GATE.md`
- Freshness dependency: `../_shared/ARCHITECTURE_SNAPSHOT.md`
- Freshness dependency: `../_shared/QUALITY_GATES.md`
- Observed baseline: exact schema, fixture, and test paths named by the accepted specification
- Stage-owned surface: `fixtures/`, `output/DATA_PACKAGE.md`, and its verifier

Do not load: `_archive/`, later stages, dependency folders, generated build
output, or product paths not named by the accepted specification.

## Process

1. Bind each authority decision to the active intent identity or revision.
2. Define schema migration, backfill, and invalid-state rejection rules.
3. Encode the deterministic authorize-v1/edit-v2 interleaving fixture.
4. Write `DATA_PACKAGE.md`, fixtures, verification evidence, and stop.

## Outputs

- `output/DATA_PACKAGE.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md`

## Verify

Fail if identity, policy, payload, grant, kill switch, caps, or migration state
can diverge from the active intent while authorization succeeds.

## Human gate

Accept only if the contracts implement the accepted specification without
redefining its authority semantics.

## Failure routing

Correct Data or return ambiguity to Spec. Do not patch Build around it.
