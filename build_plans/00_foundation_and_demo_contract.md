---
id: phase-00
status: complete
depends_on: []
unlocks: [phase-01, phase-02]
prd_requirements: [FR-01, FR-05, FR-13, FR-15]
evals: [EV-08]
---

# Phase 00 — Foundation and demo contract

## Outcome

Preserve the reliable application shell, remove unsupported claims, assign one
authoritative owner to every kind of state, and prove that the selected hosting
topology can run a pinned EVE session before deeper implementation begins.

Evaluator-visible proof: authentication, workspace isolation, durable evidence,
and the ledger survive refresh while every fixture and simulation is disclosed.

## Baseline

Already present:

- Sites-authenticated owner identity with a development-only fallback.
- Multiple owner workspaces, server-side membership checks, and active-workspace
  selection.
- D1/Drizzle users, workspaces, cases, approvals, case events, immutable
  observations, evidence links, hashes, and migrations.
- A persisted seeded case loop and a polished cockpit.
- Four structural/database tests.

Known gaps to address in this phase:

- Runtime schema creation duplicates migration responsibilities and can drift.
- Isolation is not yet exercised as a complete two-user/two-workspace matrix.
- The scan, connection freshness, receipt, outcome, Lab publication, and eval
  count are more illustrative than their labels imply.
- The deployment boundary between the Sites application, EVE, and the canonical
  ICM Git repository is undecided and therefore a critical early risk.

## Entry criteria

- [x] Existing application builds and has a deployed private baseline.
- [x] Owner authentication and D1 are available.
- [x] PRD and current implementation have been audited.
- [ ] No unrelated working-tree changes conflict with foundation work.

## In scope

- Current capability inventory and truthfulness register.
- Canonical schema/migration ownership and tenant-integrity tests.
- Architecture decisions for ICM, EVE, D1, Git, and Sites boundaries.
- A minimal pinned EVE topology spike using version-matched bundled docs.
- Golden demo contract, explicit deferrals, reset semantics, and baseline report.

## Out of scope

- Product EVE tools or investigation behavior.
- ICM case artifacts beyond a disposable topology fixture.
- Live business-data providers or customer-repository writes.
- Production schedules, Postgres, object storage, or telemetry infrastructure.

## Architecture invariants

- Platform identity is authentication; every resource path still authorizes the
  owner and workspace.
- Checked-in migrations are the canonical database history.
- EVE may be a separate service if the Sites runtime is incompatible; product
  code accesses it only through an authenticated server-side adapter.
- Continuation credentials and Git credentials never cross into the browser or
  model-visible context.
- No feature is called ICM- or EVE-powered until a real artifact/run proves it.

## Milestones

### P00-M1 — Freeze the evaluation contract

**Deliverables**

- A one-page demo claim, golden case definition, and deferred-scope register.
- A claim audit covering every current connection, scan, receipt, measurement,
  Lab, and eval label.
- An owner-approved Result-team demo release profile distinct from PRD MVP.

**Work**

- [x] Define the target three-minute evaluator story and optional deep-dive.
- [x] Classify each visible claim as real, fixture, sandbox, simulated time, or
      planned.
- [x] Replace or schedule removal of unsupported live-health and pass-count copy.
- [x] Freeze the default fixture case, reset boundary, workspace, and date model.
- [x] Record Phase 08 items as explicitly non-blocking.
- [x] Review and approve `_shared/DEMO_RELEASE_PROFILE.md`; retain every deferred
      PRD requirement as open in traceability.

**Acceptance evidence:** `00_evidence/P00_M1/ACCEPTANCE_EVIDENCE.md` records the
verified contract artifacts and the project owner's explicit 2026-08-11
acceptance in `00_evidence/P00_M1/OWNER_APPROVAL_GATE.md`.

**Acceptance evidence**

- A reviewer can identify the nature of every data source and side effect without
  reading implementation notes.
- The demo contract makes no claim that depends on Phase 08.

### P00-M2 — Harden the existing persistence and tenant foundation

**Deliverables**

- Canonical migration policy, schema-drift check, and isolation test matrix.

**Work**

- [x] Inventory differences between Drizzle migrations and runtime DDL.
- [x] Make migrations authoritative and reduce runtime initialization to safe,
      idempotent compatibility behavior.
- [x] Test migrations from an empty database and from the latest release schema.
- [x] Add two-user/two-workspace tests across cases, evidence, events, approvals,
      workspace switching, and supplied foreign identifiers.
- [x] Reject invalid workspace cookies and mismatched cross-table workspace IDs.
- [x] Run `PRAGMA optimize` after index-bearing migrations.

**Acceptance evidence:** `00_evidence/P00_M2/ACCEPTANCE_EVIDENCE.md` records the
reviewed migration, identical fresh/upgrade schemas, SQLite integrity results,
the two-user/two-workspace rejection matrix, the production build, and 9/9
passing tests.

**Acceptance evidence**

- A crafted foreign case, evidence ID, approval value, or workspace cookie yields
  no cross-tenant data or mutation.
- Fresh and upgraded databases expose the same schema and constraints.

### P00-M3 — Decide state ownership and service boundaries

**Deliverables**

- Architecture decisions for canonical ICM storage, D1 projections, EVE service
  topology, fixture adapters, and trace-versus-ledger retention.
- A one-page state ownership diagram.

**Work**

- [x] Select the app-managed private Git repository strategy behind
      `IcmRepository`.
- [x] Define which semantic state is derived from artifacts and which operational
      state remains in D1.
- [x] Define canonical ICM human-review artifacts separately from D1 operational
      approval/authorization records, including hash binding and mismatch behavior.
- [x] Define signed server-to-server workspace/case context for EVE.
- [x] Define the EVE run/session/cursor mapping stored in D1.
- [x] Define how Agent Runs can expire without weakening the permanent ledger.
- [x] Document rejected alternatives and rollback boundaries.

**Acceptance evidence:** `00_evidence/P00_M3/ACCEPTANCE_EVIDENCE.md` links four
ADRs and the one-page ownership diagram. The separate EVE service decision is
accepted for the spike and must be confirmed or explicitly revised by P00-M4's
exact-version compatibility evidence.

**Acceptance evidence**

- Every artifact, approval, run, receipt, metric, and learning has exactly one
  canonical owner.
- Semantic and operational lifecycle reconstruction rules are explicit and fail
  closed when expected ICM/D1 hashes disagree.
- No boundary requires a model to receive a credential or choose a tenant.

### P00-M4 — Prove the EVE hosting topology

**Deliverables**

- Exact EVE version pin for the spike, reviewed bundled-doc index, minimal agent,
  persistent session/run identifier, and compatibility ADR.

**Work**

- [x] Install an exact candidate EVE version in the selected service surface.
- [x] Read `node_modules/eve/docs/README.md` and every guide required by the
      chosen channel, session, human interaction, subagent, and deployment path.
- [x] Start one minimal agent with no product capabilities.
- [x] Call it through the intended server-side CrossSignal adapter.
- [x] Persist and retrieve its session/run identifier after process restart.
- [x] Verify secrets and continuation tokens never reach browser props or logs.
- [x] Record whether EVE is colocated or separately deployed and why.

**Acceptance evidence:** `00_evidence/P00_M4/ACCEPTANCE_EVIDENCE.md` records the
exact EVE `0.32.0` pin, bundled-doc review, zero-capability compiled surface,
ES256 server adapter, and one session retrieved and continued under Node 24.14.0
after replacing the EVE process.

**Failure and recovery**

- If the selected topology is incompatible, keep the application unchanged,
  discard the disposable spike, and test the documented separate-service path.
- Do not begin Phase 03 with an unverified runtime assumption.

**Acceptance evidence**

- The selected topology returns a real persistent identifier after a restart.
- The lockfile and ADR name one exact framework version and its docs source.

### P00-M5 — Establish the baseline verification and reset contract

**Deliverables**

- Baseline build/test report, demo-reset contract, and known-limitations page.

**Work**

- [x] Run build, targeted lint, migrations, database tests, and diff checks.
- [x] Define reset as a scoped, recoverable demo-workspace operation that never
      deletes unrelated workspaces or audit evidence.
- [x] Record the real test denominator and remove static eval assertions.
- [x] Deploy the truthful foundation increment privately.
- [x] Verify refresh and workspace switching against persisted data.

**Acceptance evidence**

- Reset targets only the declared demo workspace/cycle.
- The deployed UI reports exactly what the baseline can prove.

## Verification matrix

| Check | Required proof |
|---|---|
| Database | Empty and upgrade migration paths produce identical expected schema |
| Tenant isolation | Two users cannot read or mutate each other's workspace graph |
| Runtime topology | Minimal EVE session survives the chosen restart boundary |
| Truthfulness | Claim audit has no unsupported live or pass-count wording |
| Persistence | Refresh and workspace switch preserve correct isolated state |
| Release | Build, lint, tests, migration inspection, and private deployment pass |

## Demo checkpoint

Sign in, switch between two workspaces, refresh, and open the evidence/ledger.
Then show the architecture diagram and clearly label the current scan and action
as fixtures/sandbox behavior pending later phases.

## Exit gate

- [x] Every Phase 00 milestone has captured acceptance evidence.
- [x] The project owner has accepted `_shared/DEMO_RELEASE_PROFILE.md`.
- [x] EVE topology and canonical ICM repository decisions are approved.
- [x] Database schema ownership and tenant tests are reliable.
- [x] All current simulations are labeled honestly.
- [x] The private foundation deployment passes the golden baseline checks.
- [x] Phases 01 and 02 can begin without unresolved shared-contract questions.

## Rollback and recovery

Keep the last known-good private deployment. Schema changes must be additive or
carry an explicit compatibility path. A failed EVE spike is removed without
changing the durable application or its data.

## Handoff

Phase 00 closes on Sites version 6 from commit `a1e7dde`. The deployed Vinext
application and D1 migrations are the truthful foundation baseline; the
isolated `eve-spike/` remains local topology evidence and is not a connected
product runtime. Phases 01 and 02 are unblocked but have not started.

Phases 01 and 02 may rely on the state-ownership ADRs, tenant boundary, golden
demo fixture contract, migration policy, and selected EVE service topology.
