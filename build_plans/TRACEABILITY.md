# PRD and eval traceability

This matrix gives every requirement an owner. "Demo profile" means the user
outcome is proven with truthful fixtures or a sandbox provider. "Production"
means the live-provider or lifecycle breadth remains assigned to Phase 08.
The binding release-scope amendment is `_shared/DEMO_RELEASE_PROFILE.md`; Phase
07 must never be reported as the complete PRD MVP while deferred rows remain.

## Functional requirements

| Requirement | Current baseline | Demo completion | Production remainder |
|---|---|---|---|
| FR-01 Workspace configuration | Owner workspaces and names exist | Phase 02: timezone, segment, events, and versioned metric definition | Live-provider reconciliation in Phase 08 |
| FR-02 Connections | Illustrative cards and seeded source evidence | Phase 02: provider-neutral fixture adapters, actual fixture health, scope, and revoke/reset semantics | Live GitHub/PostHog/Stripe OAuth in Phase 08 |
| FR-03 Feedback import | Seeded support rows | Phase 02: schema-valid redacted CSV/JSON with row errors | Larger ingestion/retention in Phase 08 |
| FR-04 Bounded signals | Client timer resets the seeded case | Phase 02: durable rule-by-rule manual scan plus validated founder-created manual signal and dedupe | Scheduled scans in Phase 08 |
| FR-05 Durable cases | D1 case and cycle persist | Phase 01 + 03: stamped ICM case, run mapping, ICM head, interruption survival | Multi-run scale hardening in Phase 08 |
| FR-06 Provenance evidence | Immutable seeded observations with hashes | Phase 02 + 03: adapter observations and EVE-produced cited brief | Live-source freshness in Phase 08 |
| FR-06A Identity safety | Demo is aggregate-only | Phase 02: explicit aggregate fallback and refusal without accepted link | Full correction/linking UI in Phase 08 |
| FR-07 Hypotheses | Static interface copy | Phase 03: EVE leading/alternative hypotheses and falsification test | Model comparison in Phase 08 |
| FR-08 Evidence triage | Continue gate and reviewer note | Phase 01 + 03 + 04: artifact edit, annotation, dismiss, versioned review | — |
| FR-09 Action approval | Approval hash and uniqueness exist | Phase 04: canonical ActionSpec, edit/reject/revise, expiry, revoke, consume, parked run | More action types in Phase 08 |
| FR-10 Scoped action | Generated simulated receipt | Phase 04: sandbox GitHub adapter, executor preflight, idempotency, reconciliation | Customer-repository write in Phase 08 |
| FR-10A Implementation | Client checkbox and stage transition | Phase 04: persisted implementation time, evidence, and cohort attestation | Automatic exposure detection in Phase 08 |
| FR-11 Measurement | Predetermined outcome | Phase 05: deterministic metric windows and all outcome classes | Scheduled dispatch in Phase 08 |
| FR-12 Company learning | Static brain presentation | Phase 01 + 05: versioned diff, explicit review, conditional merge | Stale-artifact automation in Phase 08 |
| FR-13 Case UI | Strong partial cockpit | Phases 01–07 incrementally complete artifacts, gates, failures, outcome, and trace links | — |
| FR-14 Developer observability | Absent | Phase 03 + 06: case/run correlation, tools, skeptic, errors, cost, redaction | Full OTel operations in Phase 08 |
| FR-15 Business ledger | Strong append-only event base | Phases 01–06 add artifact, run, action, and learning events | Retention-scale work in Phase 08 |
| FR-16 Sanitized Lab | Client-only toggle and static eval claim | Phase 05 + 07: sanitizer, report, persisted preview, publish/unpublish | Public scale/policy in Phase 08 |
| FR-17 Export/delete | Absent | Phase 07: portable case/workspace export with manifest and hashes | Deletion/tombstone/backup expiry in Phase 08 |
| FR-18 Reconnect/cancel | Absent | Phase 03 + 06: stored cursor, reconnect, real server cancel | Multi-region hardening in Phase 08 |
| FR-19 Failure recovery | Absent | Phase 03 + 06: preserved artifact, safe retry/resume/close UI | Operational automation in Phase 08 |
| FR-20 Schedules | Absent | Demo uses disclosed manual scan and time advance | Full requirement in Phase 08 |

## Evaluation scenarios

| Eval | Build owner | Proof gate |
|---|---|---|
| EV-01 Provenance completeness | Phase 02–03, aggregate in 06 | Essential demo gate |
| EV-02 Contradictory evidence | Phase 03, aggregate in 06 | Essential demo gate |
| EV-03 Causal overclaim | Phase 03 + 05, aggregate in 06 | Essential demo gate |
| EV-04 Support prompt injection | Phase 03, aggregate in 06 | Essential demo gate |
| EV-04A Path/artifact poisoning | Phase 01, aggregate in 06 | Signature ICM safety proof |
| EV-04B Persistent brain injection | Phase 05, aggregate in 06 | Signature combined proof |
| EV-05 Missing source | Phase 02–03, aggregate in 06 | Essential demo gate |
| EV-06 Stale/mismatched window | Phase 02 + 05, aggregate in 06 | Essential demo gate |
| EV-07 Approval bypass | Phase 04, aggregate in 06 | Essential demo gate |
| EV-07A Mutated/expired/replayed approval | Phase 04, aggregate in 06 | Essential demo gate |
| EV-08 Wrong user/workspace | Phase 04, aggregate in 06 | Essential demo gate |
| EV-09 Interrupted action | Phase 04, aggregate in 06 | Essential demo gate |
| EV-09A Ambiguous timeout | Phase 04, aggregate in 06 | Essential demo gate |
| EV-10 Interrupted human gate | Phase 03–04, aggregate in 06 | Signature ICM + EVE proof |
| EV-11 Skeptic failure | Phase 03, aggregate in 06 | Essential demo gate |
| EV-12 Insufficient outcome | Phase 05, aggregate in 06 | Essential demo gate |
| EV-12A Not implemented | Phase 04–05, aggregate in 06 | Essential demo gate |
| EV-13 Rejected learning | Phase 05, aggregate in 06 | Essential demo gate |
| EV-14 Budget exceeded | Phase 03, aggregate in 06 | Essential demo gate |
| EV-15 Leakage/Lab sanitization | Phase 05–07 | Essential demo gate |
| EV-16 Scheduled principal | Phase 08 | Not applicable until schedules exist; never report as passing earlier |
| EV-17 Export/deletion | Export: Phase 07; deletion: Phase 08 | Report partial scope explicitly |

## P1 ownership

Production Stripe, repository patching, preview deployment, pull requests,
Slack, collaborators, configurable rules, automatic exposure detection, model
comparison, and stale-artifact detection all remain in Phase 08. None are
prerequisites for the Result-team demonstration.

## Phase 00 contract evidence

| Milestone | Status | Proof |
|---|---|---|
| P00-M1 Freeze the evaluation contract | Pending project-owner approval | `00_evidence/P00_M1/CONTEXT.md`, `00_evidence/P00_M1/ACCEPTANCE_EVIDENCE.md`, and `00_evidence/P00_M1/OWNER_APPROVAL_GATE.md` |

All live-provider, production-schedule, production-action, public-hosting, and
full lifecycle requirements remain open. Their canonical non-blocking demo
treatment and Phase 08 re-entry triggers are recorded in
`00_evidence/P00_M1/DEFERRED_SCOPE_REGISTER.md`.
