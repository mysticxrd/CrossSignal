---
type: stage-contract
stage: 03
job: build-atomic-active-intent-authorization
---

# 03_build - implement the atomic authority correction

One job: implement the accepted data package as a durable schema, transaction,
and test change.

## Inputs

- Freshness dependency: `../02_data/output/DATA_PACKAGE.md`
- Freshness dependency: `../02_data/output/HUMAN_GATE.md`
- Freshness dependency: `../_shared/ARCHITECTURE_SNAPSHOT.md`
- Freshness dependency: `../_shared/QUALITY_GATES.md`
- Observed baseline: exact product paths named by the accepted data package
- Stage-owned surface: exact migration, database, and test paths accepted by Data

Do not load: `_archive/`, later stages, dependency folders, generated build
output, or unrelated audit findings.

## Process

1. Add and backfill the active-intent binding.
2. Maintain it on creation and edit in the owning transaction.
3. Enforce exact active-intent equality atomically during authorization.
4. Add the deterministic regression and negative tests.
5. Write `BUILD_EVIDENCE.md`, verify the slice, and stop.

## Outputs

- `output/BUILD_EVIDENCE.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md`

## Verify

Run the accepted targeted tests plus repository build, lint, and test gates.
The original vulnerable interleaving must fail closed.

## Human gate

Accept only after reviewing the migration and running the complete authority
path with the deterministic race harness.

## Failure routing

Correct Build or return a contract defect upstream. Never weaken the invariant.
