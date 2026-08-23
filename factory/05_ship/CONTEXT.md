---
type: stage-contract
stage: 05
job: ship-reviewed-authority-correction
---

# 05_ship - package the authority correction

One job: bind the verified L08 correction to a reviewer-runnable release without
claiming resolution of the other post-release audit findings.

## Inputs

- Freshness dependency: `../04_verify/output/VERIFICATION_REPORT.md`
- Freshness dependency: `../04_verify/output/HUMAN_GATE.md`
- Freshness dependency: `../_shared/ARCHITECTURE_SNAPSHOT.md`
- Freshness dependency: `../_shared/QUALITY_GATES.md`
- Observed baseline: accepted release head and runnable correction evidence
- Stage-owned surface: release manifest and reviewer instructions

Do not load: `_archive/`, dependency folders, generated build output, or
unrelated audit findings.

## Process

1. Bind the accepted evidence and complete product head.
2. Document migration, rollback, and deterministic regression commands.
3. State the exact corrected invariant and explicit remaining findings.
4. Write `RELEASE_MANIFEST.md`, verify it cold, and stop.

## Outputs

- `output/RELEASE_MANIFEST.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md`

## Verify

Fail if the manifest misses product-head coverage, overclaims audit closure, or
requires hidden repair to demonstrate the corrected authority behavior.

## Human gate

Accept only if the correction is independently runnable and its scope is exact.

## Failure routing

Return failures to their owning stage. Do not patch release evidence.
