---
id: phase-06
status: planned
depends_on: [phase-05]
unlocks: [phase-07]
prd_requirements: [FR-14, FR-15, FR-18, FR-19]
evals: [EV-01, EV-02, EV-03, EV-04, EV-04A, EV-04B, EV-05, EV-06, EV-07, EV-07A, EV-08, EV-09, EV-09A, EV-10, EV-11, EV-12, EV-12A, EV-13, EV-14, EV-15]
---

# Phase 06 — Safety, recovery, observability, and truthful evals

## Outcome

Turn the complete golden path into reproducible engineering evidence. Every
critical product claim receives deterministic tests, adversarial fixtures,
interruption proof, correlated runtime evidence, and a stored truthful result.

Evaluator-visible proof: from one case, inspect the ICM revisions, parent and
skeptic EVE runs, bounded tools, budgets, approval wait, interruption recovery,
permanent ledger, and actual eval execution.

## Baseline

Phases 01–05 provide the complete ICM/EVE loop and feature-level tests. The
original repository's four tests are insufficient as a behavioral release gate.
Schedules and production deletion remain deliberately absent, so EV-16 and the
deletion portion of EV-17 must remain not applicable/deferred rather than passed.

## Entry criteria

- [ ] Phase 05 exit gate is complete.
- [ ] Golden loop and all phase-specific fixtures are versioned and resettable.
- [ ] Agent/workflow/model/policy/fixture versions are persisted on runs.
- [ ] Application ledger remains complete without Agent Runs availability.

## In scope

- Eval manifests/results, deterministic policy tests, seeded EVE behavioral
  evals, adversarial security suite, forced interruption matrix, recovery UI,
  Agent Runs correlation, redaction verification, budgets, performance,
  accessibility, compatibility, and release reporting.

## Out of scope

- Production scheduled-principal and deletion lifecycle tests.
- Full OpenTelemetry drain/alerting infrastructure.
- Live provider reliability, scale, or multi-user collaboration.

## Architecture invariants

- Evals use the same tools, policies, schemas, and agent path as the product.
- Deterministic authorization/policy tests are never delegated to model judging.
- Behavioral eval results record seeds, versions, inputs, outputs, rubric, and
  evidence; aggregate percentages are reproducible.
- Content is redacted before telemetry emission, not merely hidden in the UI.
- A platform trace is diagnostic; permanent business reconstruction uses ICM,
  D1 operational records, immutable source references, and the ledger.
- Unsupported scenarios are reported as not applicable/deferred, never passing.

## Milestones

### P06-M1 — Create the versioned eval and release-result model

**Deliverables**

- Eval manifest/schema, fixture/seed matrix, execution/result records, release
  gate definition, evidence links, and real status API/read model.

**Work**

- [ ] Record eval ID/version, fixture version, agent/model/workflow/policy/tool
      versions, seed, start/end, status, score, failure evidence, and release ID.
- [ ] Separate deterministic assertions from rubric-scored behavioral results.
- [ ] Define pass thresholds and blocking conditions from the active demo scope.
- [ ] Mark EV-16 and deletion/backup portions of EV-17 deferred/not applicable.
- [ ] Prevent incomplete/cancelled runs from inflating the denominator.

**Acceptance evidence**

- Recomputing a release summary from stored individual results yields the same
  displayed denominator and status.

### P06-M2 — Complete deterministic policy and tenant tests

**Deliverables**

- Automated suites for migrations, workspace isolation, path confinement,
  artifact validation, canonical hashing, approval lifecycle, idempotency,
  reconciliation, measurement classification, brain merge, and sanitization.

**Work**

- [ ] Run two-user/two-workspace attempts against every read/mutation/run path.
- [ ] Test foreign IDs, copied approval payloads, stale cookies/heads, and
      cross-tenant relationship injection.
- [ ] Test concurrent scans, edits, approvals, and action executions.
- [ ] Test every outcome classification and boundary tolerance.
- [ ] Test publish/unpublish and sanitizer field allow-lists.
- [ ] Apply migrations from empty and prior release schemas.

**Acceptance evidence**

- Authorization, approval, path, idempotency, and sanitizer policy tests pass
  100%; one deliberate mutation makes the relevant test fail.

### P06-M3 — Build the seeded EVE behavioral suite

**Deliverables**

- Product-path evals for provenance, contradiction, causal discipline, missing
  source, stale windows, skeptic behavior, human edit/resume, budget exhaustion,
  outcome explanation, and learning proposal.

**Work**

- [ ] Run each stochastic scenario with at least three seeds.
- [ ] Score material-claim provenance deterministically from source links.
- [ ] Check required alternative/falsification sections structurally before any
      rubric scoring.
- [ ] Preserve artifacts/traces for failed seeds.
- [ ] Compare only compatible versions and report per-scenario variance.
- [ ] Require at least 95% behavioral-quality pass rate across three consecutive
      complete release-candidate runs.

**Acceptance evidence**

- Behavioral quality is at least 95% across three consecutive complete
  release-candidate runs; provenance remains 100% for material claims.

### P06-M4 — Execute the adversarial trust-boundary suite

**Deliverables**

- Prompt-injection, traversal/symlink/fake-control, embedded HTML, persistent
  brain injection, secret/PII, approval mutation/replay, wrong-tenant, and
  unauthorized-tool fixtures with stored results.

**Work**

- [ ] Assert injected instructions are quoted/preserved as data and never obeyed.
- [ ] Assert no control file, protected path, tool inventory, permission, target,
      or argument changes.
- [ ] Scan ICM, D1 projections, application logs, run inputs/events, exports, and
      Lab snapshots for seeded sensitive values.
- [ ] Test missing/expired/revoked/replayed/mutated approvals and concurrent
      submission with zero sandbox actions.
- [ ] Test persistent approved business text in a later case.
- [ ] Run at least 25 distinct injection/artifact-poisoning fixtures across at
      least three seeds before any live-data use.
- [ ] Seed at least 25 unique PII values and 10 synthetic secrets and scan every
      prohibited output surface for exact/encoded appearances.

**Acceptance evidence**

- Zero unauthorized tool calls, control-plane mutations, protected-data leaks,
  or unintended sandbox effects across at least 25 adversarial fixtures/three
  seeds and the 25-PII/10-secret leakage set.

### P06-M5 — Run the forced interruption and recovery matrix

**Deliverables**

- Scripted interruption points, expected recovery state, captured receipts,
  cursor/retry assertions, and recovery UI for investigation, human gate,
  execution, and measurement.

**Work**

- [ ] Interrupt before artifact commit, after commit, while parked, after action
      intent claim, after simulated remote acceptance, and during measurement.
- [ ] Restart EVE/application processes and refresh/reconnect the browser.
- [ ] Assert the latest valid artifact/head and ledger reconstruct the case.
- [ ] Assert no duplicate stream event, artifact revision, approval, action, or
      learning merge.
- [ ] Show failed stage, preserved artifacts, retry safety, and retry/resume/close
      controls.

**Acceptance evidence**

- Every major boundary recovers to its documented state; ambiguous action creates
  one receipt and measurement never fabricates completion.

### P06-M6 — Complete Agent Runs and permanent-ledger observability

**Deliverables**

- Owner-only run panel, root/child graph, lifecycle/tool events, usage/cost,
  approval wait, retries/errors, ICM head, release version, and ledger links.

**Work**

- [ ] Obtain run data through the version-current supported surface.
- [ ] Redact before emission and again validate before rendering.
- [ ] Correlate run events to canonical artifact revisions and business events.
- [ ] Handle expired/unavailable traces with a clear message and intact ledger.
- [ ] Distinguish model reasoning from safe structured summaries; never expose
      hidden reasoning in Lab/export.

**Acceptance evidence**

- A maintainer traces case -> root run -> skeptic -> tool -> artifact -> approval
  -> receipt -> measurement while the permanent ledger remains standalone.

### P06-M7 — Enforce operational budgets and bounded failure

**Deliverables**

- Server-owned limits for estimated model cost, active time, turns, tool calls,
  retries, concurrent subagents, depth, query windows, and payload sizes.

**Work**

- [ ] Reject agent attempts to raise or bypass limits.
- [ ] Stop gracefully and persist reason/partial artifacts at each limit.
- [ ] Bound tool timeouts/retries and source pagination.
- [ ] Surface actual usage and configured ceiling in owner UI.
- [ ] Add unavailable-source and failed-skeptic policies.

**Acceptance evidence**

- Budget-abuse tests terminate safely 100% of the time with no fabricated result.

### P06-M8 — Validate product quality and release reporting

**Deliverables**

- Performance, timezone, accessibility, browser-compatibility checks; generated
  eval report and threat-model update; truthful Lab/release status component.

**Work**

- [ ] Verify UTC storage and workspace-timezone display/window semantics.
- [ ] Check dashboard/case usability and event rendering against PRD targets.
- [ ] Test keyboard flow, focus containment/return, labels, contrast, and live
      status announcements for artifacts, gates, errors, and outcome.
- [ ] Check current stable Chrome, Safari, Firefox, and Edge for the core owner
      flow; verify Lab responsiveness.
- [ ] Render release status exclusively from stored completed eval executions.
- [ ] Publish scope, thresholds, failures, and deferred scenarios in the report.

**Acceptance evidence**

- The UI's count, last-run time, release version, and failures match the stored
  result set exactly; no hardcoded "18 / 18" remains.

## Verification matrix

| Check | Required proof |
|---|---|
| Deterministic gates | Critical policy suites pass 100% |
| Behavioral quality | Declared threshold holds across required seeds/runs |
| Adversarial safety | Zero unauthorized mutation/tool/leak/action |
| Interruption | All four major stages recover without duplicate state/effect |
| Observability | Case links to runs/tools/artifacts and standalone ledger |
| Budgets | Every limit stops safely with reason and partial state |
| Product quality | Timezone, performance, accessibility, compatibility verified |
| Truthfulness | Stored results exactly match all displayed release claims |

## Demo checkpoint

Open one closed case and traverse its ICM history, EVE parent/child runs, tool
calls, approval wait, exactly-once receipt, measurement, ledger, and stored eval
results. Trigger one interruption and one budget failure to show safe recovery.

## Exit gate

- [ ] All eight milestones pass their acceptance evidence.
- [ ] Active critical authorization, approval, injection, idempotency, and
      leakage gates pass 100%.
- [ ] Behavioral quality is at least 95% across three consecutive complete runs,
      with at least three seeds per stochastic scenario.
- [ ] At least 25 distinct injection/artifact-poisoning fixtures pass across at
      least three seeds.
- [ ] At least 25 seeded PII values and 10 synthetic secrets have zero prohibited
      appearances.
- [ ] Forced interruptions lose no valid business state or create duplicate effects.
- [ ] Displayed eval status is generated from stored results.
- [ ] EV-16 and deferred EV-17 portions are clearly not reported as passing.
- [ ] The exact release candidate is ready for Phase 07 packaging.

## Rollback and recovery

An eval or safety regression blocks new releases but does not erase existing
business history. Roll back application/agent versions, keep failed-run evidence,
and route new work only to the last version whose gates passed.

## Handoff

Phase 07 may rely on a frozen release candidate, complete golden fixture,
repeatable reset, stored eval report, architecture/threat evidence, and reliable
deep links across ICM, EVE, and the ledger.
