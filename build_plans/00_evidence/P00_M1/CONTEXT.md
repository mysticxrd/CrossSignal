---
id: p00-m1-evidence
phase: phase-00
milestone: P00-M1
status: pending_owner_approval
---

# P00-M1 — Freeze the evaluation contract

## Inputs

- `../../00_foundation_and_demo_contract.md`
- `../../_shared/DEMO_RELEASE_PROFILE.md`
- `../../_shared/QUALITY_GATES.md`
- `../../TRACEABILITY.md`
- `../../../PRD.md` sections 4, 8–11, 13–16, 19–24, and 26–28
- Current UI and persistence implementation under `../../../app/` and
  `../../../db/`

## Process

1. Compare the documented baseline with the repository and executable checks.
2. Freeze the evaluator story, fixture identity, date model, and reset boundary.
3. Classify each material visible product claim using the release taxonomy.
4. Remove or relabel copy that implies unimplemented live behavior.
5. Keep all production remainders visible and non-blocking for the demo profile.
6. Present the release profile as one explicit project-owner decision.

## Outputs

- `BASELINE_AUDIT.md`
- `THREE_MINUTE_STORY.md`
- `GOLDEN_FIXTURE.md`
- `CLAIM_REGISTER.md`
- `DEFERRED_SCOPE_REGISTER.md`
- `OWNER_APPROVAL_GATE.md`
- `ACCEPTANCE_EVIDENCE.md`

## Human check

The project owner can identify the nature of every source, computation, runtime
step, side effect, time jump, and publication claim from the UI and these files,
then accept or reject one release-profile gate without approving later
architecture or implementation decisions by accident.
