---
id: phase-00-retrospective-gate-03
historical_gate: P00-M3
classification: retrospective-owner-visibility
---

# Gate 3 — State ownership

## 1. Gate purpose

This gate had to answer: **Where does each kind of CrossSignal truth live, and
what happens when semantic meaning and operational authorization disagree?**
It mattered because ICM, EVE, D1, Git, the UI, and runtime traces can all appear
to contain “state.” Without one authority per fact, retries or recovery could
silently overwrite a human decision, authorize an action from the wrong record,
or lose business history when a runtime trace expires.

## 2. Starting situation

The PRD named a Git-backed ICM workspace, EVE durable sessions, an operational
database, and an application ledger, but the Phase 00 product only had Sites,
D1, and the seeded cockpit. No canonical ICM repository or product EVE runtime
existed. The deployment boundary, Git hosting strategy, approval/hash
relationship, run mapping, retention split, and mismatch behavior had not been
selected.

## 3. What was decided

Three authorities were kept distinct:

- **ICM semantic decision state:** human-readable stage contracts, artifacts,
  review meaning, semantic status, and accepted Company Brain knowledge in one
  app-managed private Git repository per workspace.
- **EVE durable execution state:** sessions, checkpoints, cursors, cancellation,
  bounded work, and expiring diagnostic traces.
- **D1 operational authorization and persistence:** identity, membership,
  approvals, action intent, idempotency, reconciliation, run correlation, and
  the permanent business ledger.

An ICM review alone never authorizes a side effect. D1 approval must bind the
current reviewed artifact and action hashes. A mismatch fails closed and becomes
visible instead of allowing either store to overwrite the other. The UI is a
projection, not an authority.

Rejected alternatives included D1 Markdown blobs as a second Company Brain,
an EVE sandbox as canonical memory, UI-owned lifecycle state, trace retention as
the ledger, a customer repository for demo infrastructure, and one Git repository
for all tenants. The ADRs say “accepted” and commit `b580441` was authored by
`mysticxrd`, but there is no explicit owner decision record. The repository does
not prove the owner saw or accepted these choices in real time.

## 4. What was implemented

This gate implemented architecture records, not the described product services:
four ADRs define repository strategy, authority, EVE service boundaries, and
trace retention; a diagram explains the relationships; tests ensure the core
phrasing and exact-version dependency remain present. P00-M4 later supplied
narrow compatibility evidence for the separate EVE service.

## 5. How CrossSignal changed

- **User-visible:** no new product capability appeared.
- **System-level:** later work received explicit rules for reconstruction,
  credentials, hash binding, failure behavior, and the trace/ledger split.
- **Unchanged:** D1 remained the only implemented product state store. The
  canonical private Git workspace, D1 run mapping, operational action model,
  and product EVE integration still did not exist.

## 6. Evidence

- Repository decision: [`ADR-001_ICM_REPOSITORY.md`](../00_evidence/P00_M3/ADR-001_ICM_REPOSITORY.md)
- Authority and hash binding: [`ADR-002_STATE_AND_AUTHORITY.md`](../00_evidence/P00_M3/ADR-002_STATE_AND_AUTHORITY.md)
- Runtime boundary: [`ADR-003_EVE_SERVICE_BOUNDARY.md`](../00_evidence/P00_M3/ADR-003_EVE_SERVICE_BOUNDARY.md)
- Trace/ledger split: [`ADR-004_TRACE_AND_LEDGER_RETENTION.md`](../00_evidence/P00_M3/ADR-004_TRACE_AND_LEDGER_RETENTION.md)
- Visual map: [`STATE_OWNERSHIP_DIAGRAM.md`](../00_evidence/P00_M3/STATE_OWNERSHIP_DIAGRAM.md)
- PRD basis: [`PRD.md` sections 9, 14, and 16](../../PRD.md#9-icmmwp-decision-workspace)
- Gate proof: [`ACCEPTANCE_EVIDENCE.md`](../00_evidence/P00_M3/ACCEPTANCE_EVIDENCE.md)
- Git: `b580441` defined the boundaries; `b94b183` later confirmed only the
  separate-service topology assumption.

## 7. Truthfulness classification

The ADRs and current D1 ledger are **real records**. Most ADR content is an
**accepted technical design**, not implemented product behavior. The private
Git-per-workspace repository, ICM review artifacts, hash-bound operational
approvals, D1 run mapping, and retention enforcement were **planned**. The EVE
spike later made one isolated runtime assumption real, using fixture inputs.
No sandbox side effect or simulated-time behavior was part of this gate.

## 8. Limitations and risks

The gate did not build or test cross-store reconciliation. No chosen Git provider,
remote provisioning proof, concurrency/lease test, trace-expiry exercise, or
production retention enforcement exists. The PRD assumed Postgres while the
demo selected D1, leaving scale and production operations for later. Most
importantly, technical “accepted” status is not evidence of owner acceptance.

## 9. What the owner should understand

This gate made a consequential architecture choice: meaning, execution, and
authorization must remain separate even when the UI combines them. Reconsider
the Git-per-workspace strategy, D1 production role, retention policy, and
separate-service cost before implementing them beyond the demo.
