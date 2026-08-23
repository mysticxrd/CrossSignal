---
type: stage-contract
stage: 04
job: verify-superseded-intent-cannot-be-authorized
---

# 04_verify - prove the authority invariant

One job: independently verify that only the trace's exact active intent can be
authorized across normal, edited, concurrent, migrated, and failure states.

## Inputs

- Freshness dependency: `../03_build/output/BUILD_EVIDENCE.md`
- Freshness dependency: `../03_build/output/HUMAN_GATE.md`
- Freshness dependency: `../_shared/ARCHITECTURE_SNAPSHOT.md`
- Freshness dependency: `../_shared/QUALITY_GATES.md`
- Observed baseline: accepted product and test paths declared by Build
- Stage-owned surface: verification cases and `output/VERIFICATION_REPORT.md`

Do not load: `_archive/`, Ship, dependency folders, generated build output, or
unrelated audit findings.

## Process

1. Reproduce the pre-fix interleaving against the corrected invariant.
2. Verify positive, negative, concurrency, migration, and rollback behavior.
3. Resolve every acceptance criterion with inspectable evidence.
4. Write `VERIFICATION_REPORT.md` and stop.

## Outputs

- `output/VERIFICATION_REPORT.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md`

## Verify

Fail on flaky scheduling, untested migration state, stale grants, mismatched
policy or payload bindings, or evidence that cannot be rerun.

## Human gate

Accept only if the vulnerable interleaving deterministically fails closed and
all accepted authority semantics remain green.

## Failure routing

Route implementation defects to Build and contract defects to their owner.
