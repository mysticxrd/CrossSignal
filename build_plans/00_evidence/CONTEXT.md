---
id: phase-00-evidence
phase: phase-00
purpose: acceptance-evidence-shelf
---

# Phase 00 evidence

## Inputs

- Phase contract: `../00_foundation_and_demo_contract.md`
- Release scope: `../_shared/DEMO_RELEASE_PROFILE.md`
- Universal gates: `../_shared/QUALITY_GATES.md`
- Requirement ownership: `../TRACEABILITY.md`
- Product implementation: `../../app/`, `../../db/`, `../../drizzle/`, and
  `../../tests/`

## Process

Each milestone gets one numbered folder. Read its `CONTEXT.md`, produce only the
named evidence, run the milestone checks, and update the phase plan only after
the proof exists. Evidence reports record both passing checks and unresolved
gates; a pending human decision is never inferred from implementation progress.

## Outputs

- `P00_M1/` — evaluation contract, truthfulness audit, and owner scope gate.
- Later milestone folders are created only when that milestone begins.

## Human check

Open the active milestone folder cold. Its contract plus linked artifacts must
show what was inspected, what changed, what passed, and what still needs an
owner decision without relying on chat history.
