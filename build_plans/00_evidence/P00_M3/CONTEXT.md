---
id: p00-m3-evidence
phase: phase-00
milestone: P00-M3
status: complete
---

# P00-M3 — State ownership and service boundaries

## Inputs

- `../../00_PROGRAM.md`
- `../../00_foundation_and_demo_contract.md`
- `../../_shared/QUALITY_GATES.md`
- `../../../PRD.md` sections 9, 10, 14–16, 19–20, and 26
- Current Sites/D1 implementation and P00-M2 migration policy

## Process

1. Give every semantic artifact, runtime record, authorization record, and
   diagnostic record exactly one canonical owner.
2. Select a private Git strategy behind an application interface.
3. Define the server-only identity/context envelope and EVE run mapping.
4. Define hash binding and fail-closed reconstruction across ICM and D1.
5. Separate expiring runtime traces from the permanent business ledger.
6. Record rejected alternatives and rollback boundaries.

## Outputs

- `ADR-001_ICM_REPOSITORY.md`
- `ADR-002_STATE_AND_AUTHORITY.md`
- `ADR-003_EVE_SERVICE_BOUNDARY.md`
- `ADR-004_TRACE_AND_LEDGER_RETENTION.md`
- `STATE_OWNERSHIP_DIAGRAM.md`
- `ACCEPTANCE_EVIDENCE.md`

## Human check

Pick any artifact, human review, approval, EVE run, action receipt, metric, or
learning. The ADRs must name one canonical owner, reconstruction source, hash
link, and mismatch behavior. No path may require the browser or model to choose
a tenant, hold a credential, or convert semantic review into operational
authorization by itself.
