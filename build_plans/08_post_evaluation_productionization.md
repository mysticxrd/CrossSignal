---
id: phase-08
status: deferred
depends_on: [phase-07]
entry_trigger: validated-demand-and-explicit-approval
unlocks: []
prd_requirements: [FR-02, FR-06A, FR-10, FR-17, FR-20]
prd_remainders: [FR-01, FR-02, FR-03, FR-04, FR-05, FR-06, FR-06A, FR-07, FR-09, FR-10, FR-10A, FR-11, FR-12, FR-14, FR-15, FR-16, FR-17, FR-18, FR-19, FR-20]
p1_scope: true
evals: [EV-16, EV-17]
---

# Phase 08 — Post-evaluation productionization

## Outcome

Convert the validated demo architecture into a production pilot only after user
demand or an explicit Result-team requirement justifies live-provider,
operational, retention, and scale complexity.

This phase is deliberately deferred. Its plan preserves completeness without
allowing speculative infrastructure to block the ICM/EVE proof.

## Baseline

Phase 07 leaves a frozen, fixture-first release with real ICM artifacts, real
EVE execution, a sandbox action, deterministic measurement, accepted learning,
and a truthful proof package. Live provider credentials, scheduled principals,
production side effects, scale storage, automated retention/deletion, and
operational alerting are intentionally absent until this phase's demand gate is
met.

## Entry criteria

All conditions are mandatory:

- [ ] Phase 07 is complete and its release is frozen.
- [ ] At least one named pilot/user need cannot be satisfied by the demo profile.
- [ ] Live integration order and expected business result are documented.
- [ ] Payment/KYC, credential, data-residency, and operating-cost constraints are
      understood before selecting providers.
- [ ] Each production capability has an owner, threat model, rollback, and SLO.
- [ ] The user or Result team explicitly approves starting this phase.

## In scope

Conditional live GitHub/PostHog/Stripe connectors, credentials/revocation,
scheduled dispatch, scheduled-principal policy, Postgres/R2 only if justified,
production GitHub actions, export/deletion/retention, observability/on-call,
sandboxed code work, Slack/collaboration, configurable rules, automatic exposure,
model comparisons, stale-artifact detection, and production release gates.

## Out of scope

- Any infrastructure without a current user or operational requirement.
- Autonomous money movement, refunds, unrestricted repository modification, or
  permission inferred from model/conversation text.
- Replacing ICM semantic state or the permanent application ledger.

## Architecture invariants

- Live providers implement the Phase 02 ports; detector and EVE tool contracts do
  not fork by provider.
- Least-privilege credentials are provider-managed/encrypted and never enter
  model context, artifacts, traces, or exports.
- Schedulers use a distinct application principal that cannot approve, merge
  Company Brain learning, or perform consequential third-party writes.
- Postgres/R2 adoption requires measured limits in D1/Git, not prestige.
- Every real side effect retains Phase 04 authorization, hash binding,
  idempotency, and reconciliation semantics.
- Production traces remain diagnostic; ICM and the ledger remain canonical.

## Milestones

### P08-M1 — Validate and sequence production demand

**Deliverables**

- Pilot problem statements, provider priority, expected result, success metrics,
  data-flow inventory, risk register, cost/KYC review, and go/no-go decisions.

**Work**

- [ ] Interview or observe pilot users completing the frozen loop.
- [ ] Rank live connectors by proof/value, setup friction, and security cost.
- [ ] Prefer one read-only connector before adding any real write provider.
- [ ] Define pilot volume, latency, retention, availability, and support needs.
- [ ] Reject features whose value can still be proven with fixtures.

**Acceptance evidence**

- Every selected capability has a named user outcome and measurable pilot target.

### P08-M2 — Add least-privilege live read connectors

**Deliverables**

- Provider authentication, selection, scope display, connection health/freshness,
  revocation, cursor/backfill, rate-limit/retry behavior, and contract tests for
  approved GitHub/PostHog/Stripe sources.

**Work**

- [ ] Reuse Phase 02 ports and normalized observation contracts.
- [ ] Request minimum available scopes and keep references indirect.
- [ ] Validate repository/project/account selection per workspace.
- [ ] Redact credentials/direct identifiers before model/ICM/telemetry.
- [ ] Handle revoke, expiry, partial sync, rate limit, stale cursor, and resync.
- [ ] Keep Stripe production access read-only unless a separately approved product
      requirement changes the policy.

**Acceptance evidence**

- Fixture and live adapters pass the same contract suite; revoked connections
  prevent future reads and are visible without leaking secrets.

### P08-M3 — Decide and implement production storage evolution

**Deliverables**

- Measured capacity/consistency decision for retaining D1 versus migrating
  operational records to Postgres, plus R2/object-store decision for restricted
  raw snapshots; migration/backfill/rollback plan if adopted.

**Work**

- [ ] Benchmark actual pilot query, concurrency, lock, and retention needs.
- [ ] Keep canonical ICM artifacts in Git and semantic ownership unchanged.
- [ ] If migrating, preserve workspace constraints, idempotency, ledger ordering,
      and zero-downtime compatibility.
- [ ] Store large/raw restricted payloads in object storage only when necessary;
      keep searchable metadata relational.
- [ ] Add tamper evidence, encryption, retention class, and deletion tombstones.

**Acceptance evidence**

- Migration rehearsal from production-like data preserves counts, hashes,
  ownership, receipts, and reconstructable cases; rollback is tested.

### P08-M4 — Add scheduled scans and due-outcome dispatch

**Deliverables**

- One nightly deterministic scan handler, one due-outcomes dispatcher, workspace
  timezone controls, enable/pause/resume/retry UI, leases/idempotency, failure
  state, and scheduled-principal policy.

**Work**

- [ ] Keep anomaly detection deterministic and model-free.
- [ ] Use one dispatcher rather than one schedule per case.
- [ ] Give the scheduled principal read-only external access and narrow internal
      case/run/ledger creation rights.
- [ ] Prohibit approval, brain merge, and third-party mutation.
- [ ] Reload current case/artifact/policy/source state for every new run.
- [ ] Bound retries and prevent overlapping duplicate dispatch.

**Acceptance evidence**

- EV-16 passes: every scheduled-principal attempt outside documented authority
  fails closed while legitimate dispatch remains idempotent.

### P08-M5 — Promote sandbox actions selectively

**Deliverables**

- Real repository allow-listed GitHub issue creation and, only if separately
  justified, sandboxed reproduction/patch/test/preview/PR flows.

**Work**

- [ ] Reuse canonical ActionSpec, approval, intent, executor, and reconciliation.
- [ ] Start with issue creation; require a new policy/action schema for PR/code.
- [ ] Keep Git credentials out of EVE sandboxes and use path-scoped application
      commit/publish tools.
- [ ] Constrain sandbox materialization, commands, egress, time, and outputs.
- [ ] Preview every target/payload/diff and require fresh approval for changes.

**Acceptance evidence**

- Forced timeout/interruption produces one real external effect; unauthorized
  repo/path/command/PR attempts fail with no side effect.

### P08-M6 — Implement production observability and operations

**Deliverables**

- Redacted logs/metrics/traces, SLOs, alerts, dashboards, incident playbooks,
  deployment/version routing, cost controls, and provider/runtime degradation
  behavior.

**Work**

- [ ] Add OpenTelemetry/drains only for named operational questions.
- [ ] Correlate release, workspace pseudonym, case, run, tool, and provider attempt
      without emitting private content.
- [ ] Define availability/latency/error/cost indicators and alert thresholds.
- [ ] Route new runs only to versions whose eval gates passed; allow active runs
      to finish on their pinned version.
- [ ] Exercise provider outage, queue backlog, storage latency, and trace loss.

**Acceptance evidence**

- On-call can diagnose a failed case without exposing secrets or relying on a
  platform trace as permanent truth.

### P08-M7 — Complete export, deletion, retention, and privacy lifecycle

**Deliverables**

- Full workspace export, connection revoke, deletion request/status, active-store
  erasure, cache/index invalidation, Git/trace/object tombstones, backup-expiry
  verification, retention jobs, and published policy.

**Work**

- [ ] Inventory every active/recoverable copy and data controller.
- [ ] Delete active operational, object, cache/index, ICM, and application-trace
      content within the documented target.
- [ ] Propagate tombstones and verify recoverable backup expiry.
- [ ] Retain only allowed content-free/security/legal metadata.
- [ ] Test partial failure, retry, audit evidence, and user-visible status.

**Acceptance evidence**

- EV-17 passes end to end with verified export accounting, active deletion,
  tombstone propagation, and backup-expiry evidence.

### P08-M8 — Add validated collaboration and configurable expansion

**Deliverables**

- Only approved items among Slack notifications/approvals, collaborators/roles,
  configurable rules, automatic exposure, model comparison, and stale-artifact
  detection, each with a separate authority and eval contract.

**Work**

- [ ] Add one capability at a time behind explicit policy and feature flags.
- [ ] Preserve owner authorization semantics and prevent channel identity from
      silently becoming workspace authorization.
- [ ] Require the same exact payload preview/hash for external approval channels.
- [ ] Evaluate model/rule changes against frozen fixtures before rollout.
- [ ] Keep real-time multi-agent collaboration out unless infrastructure and user
      need clearly require it.

**Acceptance evidence**

- Each enabled capability has independent authorization, failure, rollback, and
  eval proof; disabled items create no hidden dependency.

### P08-M9 — Run the production pilot and release gates

**Deliverables**

- Pilot cohort, runbook, support/incident ownership, production eval report,
  cost/performance report, security review, deletion drill, and go/no-go decision.

**Work**

- [ ] Run staged least-privilege pilots with reversible provider scopes.
- [ ] Exercise authorization, injection, idempotency, leakage, schedule, export,
      deletion, budget, and interruption gates.
- [ ] Verify live outcomes against named pilot success metrics.
- [ ] Compare operational complexity with the frozen demo baseline.
- [ ] Roll back capabilities that do not justify their cost/risk.

**Acceptance evidence**

- All production-blocking PRD gates pass and the pilot demonstrates measurable
  user value beyond the fixture demo.

## Verification matrix

| Check | Required proof |
|---|---|
| Demand | Every capability maps to a named pilot result |
| Providers | Least privilege, revoke, refresh, rate limit, and contract parity |
| Storage | Migration/retention preserve integrity, ownership, and rollback |
| Schedules | EV-16 scheduled authority and idempotency pass |
| Real actions | Approval/reconciliation yield one external effect |
| Privacy | EV-17 export/deletion/backup lifecycle passes |
| Operations | SLO/alerts/playbooks diagnose failures with redacted data |
| Pilot | Production gates pass and measurable value exceeds added complexity |

## Demo checkpoint

Productionization is not part of the original Result-team demo. Its checkpoint
is a pilot review showing which validated user need each new capability serves
and how the original ICM/EVE proof remains intact.

## Exit gate

- [ ] Explicit entry approval and demand evidence remain valid.
- [ ] All selected milestones pass their acceptance evidence.
- [ ] EV-16 and full EV-17 pass if schedules/deletion are enabled.
- [ ] Live connectors and actions meet least-privilege/idempotency gates.
- [ ] Operational SLO, privacy, rollback, and incident ownership are active.
- [ ] Pilot value justifies ongoing infrastructure and support cost.

## Rollback and recovery

Every production capability ships behind a reversible boundary. Revoke provider
access, pause schedules, disable new runs/actions, route to the last gated
version, preserve canonical ICM/ledger history, and execute documented data
reconciliation or deletion as required.

## Handoff

On completion, the production pilot inherits the frozen demo's architecture and
safety invariants plus validated live-provider, operational, privacy, and scale
contracts. Further roadmap work requires new evidence and a new phased program.
