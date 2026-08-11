---
id: phase-04
status: planned
depends_on: [phase-03]
unlocks: [phase-05]
prd_requirements: [FR-08, FR-09, FR-10, FR-10A, FR-13, FR-15, FR-18]
evals: [EV-07, EV-07A, EV-08, EV-09, EV-09A, EV-10, EV-12A]
---

# Phase 04 — Human gates and exactly-once sandbox action

## Outcome

Prove that EVE can propose a consequential action, park for a human decision,
and resume safely while an independent executor enforces authorization,
payload binding, idempotency, and reconciliation.

Evaluator-visible proof: changing one action character invalidates approval, and
retrying an ambiguous sandbox execution returns the same immutable receipt.

## Baseline

The current app hashes a transition payload and stores one approval per
case/cycle/gate. It generates a GitHub-like receipt string. There is no canonical
ActionSpec, expiry/revocation/consumption, action-intent lifecycle, executor
preflight, parked tool continuation, or reconciliation state.

## Entry criteria

- [ ] Phase 03 exit gate is complete.
- [ ] Human editing and latest-head continuation work reliably.
- [ ] EVE and ledger correlations are owner-authorized.
- [ ] ICM intervention, ActionSpec, review, receipt, and implementation schemas
      are stable.

## In scope

- Intervention artifact, preregistration, canonical ActionSpec, full approval
  lifecycle, EVE parked interaction, server executor, sandbox GitHub adapter,
  action intents, idempotency, ambiguous-timeout reconciliation, implementation
  record, cohort attestation, and complete approval/action UI.

## Out of scope

- Customer-repository GitHub writes, pull requests, or code deployment.
- Additional action types, complex approval chains, or collaborators.
- Automatic implementation/exposure detection.

## Architecture invariants

- EVE's human interaction parks work but does not grant authorization.
- Approval binds the complete canonical payload and current context; any material
  change requires a new approval.
- The executor reauthenticates/re-authorizes at execution time and never trusts
  model assertions or client UI state.
- The action ledger is authoritative for attempted/completed side effects.
- Ambiguous external state is reconciled before retry; never blindly repeated.
- Sandbox labeling appears everywhere the receipt appears.

## Milestones

### P04-M1 — Generate the versioned intervention and preregistration

**Deliverables**

- `intervention.md` with target, scope, reproduction/experiment criteria, metric
  version, cohort, baseline rule, expected range, minimum exposure, tolerance,
  measurement-window rule, risks, rollback, and exact requested permission.

**Work**

- [ ] Have EVE read the founder-approved evidence revision before drafting.
- [ ] Make every field editable before approval.
- [ ] Validate the artifact and input hashes before requesting the action gate.
- [ ] Create a new revision for request-revision instead of mutating history.

**Acceptance evidence**

- Intervention provenance resolves to the approved evidence artifact and metric
  version; an incompatible edit cannot advance.

### P04-M2 — Define canonical `ActionSpec` serialization and hashing

**Deliverables**

- Canonical serializer, schema, `action_spec_hash`, idempotency-key procedure,
  preview renderer, and cross-language/golden vectors if more than one runtime
  serializes the payload.

**Work**

- [ ] Include actor-independent target, complete body/payload, repository/sandbox
      target, case, evidence/intervention revision, policy version, expected side
      effect, cohort, and measurement plan.
- [ ] Normalize encoding, field order, numbers, nulls, and line endings once.
- [ ] Keep general artifact hashes distinct from action authorization hashes.
- [ ] Derive idempotency from stable action identity, not model input.

**Acceptance evidence**

- The same semantic payload produces the same hash; any material one-character
  change produces a different hash and preview.

### P04-M3 — Implement the complete approval lifecycle

**Deliverables**

- Review records and D1 state for proposed, approved, rejected, revision
  requested, revoked, expired, and consumed approvals; visible countdown and
  re-approval path.
- Canonical ICM human-review artifact whose hash is bound by the D1 operational
  approval record.

**Work**

- [ ] Bind actor, workspace, case, target, ActionSpec hash, ICM head, policy
      version, canonical review-artifact hash, issue time, expiry, and single-use
      state.
- [ ] Reauthorize every approve/reject/revise/revoke operation.
- [ ] Invalidate approval on any material artifact or target change.
- [ ] Preserve expired/revoked/rejected history.
- [ ] Treat the ICM review artifact as the decision record and the D1 approval as
      the execution authority; reject any hash/head mismatch.
- [ ] Park the EVE interaction without polling while awaiting the structured
      owner response.

**Acceptance evidence**

- Missing, foreign, expired, revoked, replayed, consumed, or stale-head approvals
  cannot reach the executor.

### P04-M4 — Build the isolated action-intent executor

**Deliverables**

- `action_intents` lifecycle, executor preflight, attempt log, immutable result,
  and ledger correlation.

**Work**

- [ ] Use lifecycle `prepared -> executing -> succeeded`, with explicit
      `failed_retryable`, `failed_terminal`, and `requires_reconciliation`.
- [ ] Atomically claim a unique intent/idempotency key before provider execution.
- [ ] Recheck identity, membership, repository allow-list, policy, current ICM
      head, exact ActionSpec hash, approval expiry/revocation/consumption, and
      existing result.
- [ ] Prevent EVE/model code from choosing or overriding the key.
- [ ] Store attempts and final result separately from the approval row.

**Failure and recovery**

- A crash after intent claim is retryable/reconcilable from durable state.
- A completed intent always returns its existing immutable result.

**Acceptance evidence**

- Concurrent submissions create one intent and one provider-side effect.

### P04-M5 — Implement the explicitly sandboxed GitHub adapter

**Deliverables**

- Provider-neutral action port, sandbox implementation, deterministic external
  reference, hidden correlation marker, lookup/reconciliation operation, and
  visible sandbox disclosure.

**Work**

- [ ] Render the exact issue title/body/target before approval.
- [ ] Simulate accepted, rejected, timeout-before-effect, and timeout-after-effect
      cases.
- [ ] Resolve ambiguous timeout by correlation lookup before retry.
- [ ] Return one immutable receipt for every retry of a completed action.
- [ ] Expose no generic GitHub token or arbitrary repository capability.

**Acceptance evidence**

- Timeout-after-effect followed by restart/retry reports one sandbox issue and
  the same receipt.

### P04-M6 — Resume EVE through the approved action

**Deliverables**

- Structured continuation flow, pre-execution context reload, tool result, and
  permanent proposal/approval/execution/reconciliation ledger events.

**Work**

- [ ] Reload authorization, ActionSpec, approval, policy, ledger, and current ICM
      head immediately before mutation.
- [ ] Refuse if any preflight input changed.
- [ ] Continue the parked tool call only after server authorization succeeds.
- [ ] Commit the immutable action receipt artifact and project it to D1/UI.
- [ ] Keep the business ledger understandable without the EVE trace.

**Acceptance evidence**

- Trace shows the approval wait and continuation; ledger independently proves the
  exact approved payload and one result.

### P04-M7 — Persist implementation and exposure confirmation

**Deliverables**

- `implementation.json` with `implemented_at`, owner/cohort attestation, optional
  commit/PR/deployment evidence, deviation reason, and measurement eligibility.

**Work**

- [ ] Reauthorize owner confirmation and store it server-side.
- [ ] Validate cohort against the preregistered ActionSpec.
- [ ] Resolve absolute measurement windows only after confirmation.
- [ ] Require a revised intervention/fresh approval or force inconclusive when a
      material deviation exists.
- [ ] Prevent issue receipt alone from entering measuring.

**Acceptance evidence**

- Refresh preserves the attestation; missing or mismatched implementation cannot
  start measurement.

### P04-M8 — Complete the gate/action/failure UI

**Deliverables**

- Exact preview, diff, impact summary, countdown, edit/approve/reject/revise/revoke
  controls, parked status, receipt, reconciliation/failure panel, retry guidance,
  and implementation form.

**Work**

- [ ] Display ActionSpec hash, target, scope, side effect, and expiry clearly.
- [ ] Disable stale client actions and render authoritative persisted state.
- [ ] Announce pending/success/failure/reconciliation status accessibly.
- [ ] Show "sandbox" on action card, receipt, ledger, Lab, and export.
- [ ] Provide safe retry only when intent state permits it.

**Acceptance evidence**

- Refresh at any gate/action state shows the same valid controls and receipt.

## Verification matrix

| Check | Required proof |
|---|---|
| Hash binding | Material edit invalidates approval and changes preview/hash |
| Authorization | Wrong user/workspace/target produces zero action |
| Lifecycle | Reject/revise/revoke/expire/consume states persist and are auditable |
| Idempotency | Concurrent, retry, and resumed calls produce one receipt |
| Reconciliation | Ambiguous timeout checks provider state before retry |
| EVE parking | No polling; continuation reloads latest authorization/context |
| Measurement gate | No measuring without implementation/cohort confirmation |
| Truthfulness | Sandbox label appears on every action representation |

## Demo checkpoint

Edit one character in the proposed issue to invalidate the old approval, approve
the new hash, simulate timeout-after-effect, refresh/retry, and show one sandbox
receipt in both EVE trace and permanent ledger.

## Exit gate

- [ ] All eight milestones pass their acceptance evidence.
- [ ] EV-07, EV-07A, EV-08, EV-09, EV-09A, EV-10, and EV-12A pass.
- [ ] The action can never execute from approval UI state alone.
- [ ] One immutable receipt survives concurrent/retry/interruption scenarios.
- [ ] Implementation and cohort confirmation are durable prerequisites.
- [ ] Phase 05 can consume the frozen intervention and implementation records.

## Rollback and recovery

Disable new action intents without invalidating historical approvals/receipts.
Never delete an ambiguous or completed intent. Reconcile pending ambiguity before
reenabling execution. Rollback may restore the sandbox provider only.

## Handoff

Phase 05 may rely on immutable intervention/ActionSpec revisions, implementation
attestation, resolved window rules, action receipt, and full provenance/ledger.
