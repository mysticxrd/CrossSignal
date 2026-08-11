---
reset_id: phase-00-fixture-cycle-reset-v1
classification: real-operation-over-fixture-data
case_key: CS-014
fixture_version: golden-mobile-safari-checkout-v1
---

# Phase 00 fixture-cycle reset contract

## Exact target

The command is scoped to the signed-in owner, the currently authorized
workspace, the single seeded case `CS-014`, and that case's current D1 cycle.
The server resolves the user from authentication and rechecks owner membership;
the browser cannot provide a user identity or select a foreign case.

## Guarded operation

Within one D1 batch, the reset:

1. appends one `case_reset` event for the next cycle, guarded by current case ID,
   workspace ID, and cycle;
2. advances that same guarded case to the next cycle;
3. restores stage 0 and the frozen fixture issue title;
4. clears only the current presentation's generated external-receipt label; and
5. resets browser-only reviewer/cohort/publication presentation values to their
   disclosed fixture defaults.

The action never issues `DELETE`, never rewrites an evidence observation, and
never updates another workspace or case. Foreign workspace identifiers fail at
the server membership check and the composite D1 constraints.

## Preserved recovery evidence

Prior-cycle events, approvals, payload hashes, receipt labels, timestamps,
accepted evidence, and other workspaces remain additive and inspectable. The
recovery path is therefore to inspect the prior cycle in the ledger or open a
new fixture cycle; Phase 00 does not claim destructive rollback.

## Repetition semantics

One in-flight browser reset is bounded by the disabled control and D1's guarded
batch. A later intentional reset opens another numbered cycle; it is not an
idempotent whole-workspace golden reset. Three-reset hash equivalence,
fixture-manifest receipts, and interrupted-reset recovery belong to Phase 07 and
must not be inferred from this narrower Phase 00 operation.

## Verification hooks

- `db/cases.ts::resetSeededCase` contains no delete and guards both statements by
  case, workspace, and current cycle.
- `app/case-actions.ts` derives the actor from server authentication.
- `app/CrossSignalApp.tsx` labels the operation as a real D1 cycle reset over
  fixture data and resets only presentation-local fields.
- `tests/rendered-html.test.mjs` enforces this source contract and the broader
  two-user/two-workspace rejection matrix.
