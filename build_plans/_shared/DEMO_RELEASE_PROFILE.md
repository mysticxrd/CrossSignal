# Result-team demo release profile

## Decision

The Phase 07 release is a **Result-team demo release**, not the complete PRD MVP
or a production launch. It exists to prove the differentiating ICM + EVE
architecture with truthful fixtures, sandbox effects, deterministic measurement,
and reproducible safety evidence.

This is a scoped amendment to the PRD delivery profile, not a silent claim that
deferred P0 requirements have shipped.

## Required for the demo release

- Real owner authentication and isolated durable workspaces.
- Actual ICM routing, stage contracts, editable artifacts, Git history, and
  approved Company Brain diffs.
- A real pinned EVE runtime with bounded tools, one skeptic, parking,
  continuation, cancellation, budgets, and linked runtime evidence.
- Provider-neutral fixture adapters and durable deterministic scan provenance.
- Payload-bound human approval and an explicitly sandboxed exactly-once action.
- Persisted implementation/cohort confirmation and deterministic outcome
  calculation over versioned fixtures.
- Persisted sanitized Lab preview, portable export, permanent ledger, truthful
  eval results, and the three-minute proof package.

## Demo-safe substitutions

| PRD production assumption | Demo profile |
|---|---|
| Live PostHog and Stripe test connections | Versioned PostHog-like and Stripe-test-like fixture adapters |
| Customer-repository GitHub issue | Explicit sandbox GitHub adapter with real approval/idempotency/reconciliation semantics |
| Nightly scan and scheduled measurement | Owner-triggered deterministic scan and clearly labeled manual time advance |
| Full OpenTelemetry stack | Owner-only EVE run correlation plus permanent application ledger |
| Public internet Lab | Persisted sanitized public preview unless unauthenticated hosting is deliberately enabled |

## Deferred to Phase 08

The canonical itemized register, demo treatment, owner, and re-entry trigger are
in `../00_evidence/P00_M1/DEFERRED_SCOPE_REGISTER.md`. The deferrals include live
providers and customer data, production schedules and principals, customer
repository mutations, production-scale persistence/telemetry, collaboration,
commercial operations, and full deletion/retention guarantees.

## Release naming and claims

- UI, documentation, video, and reports must call this the Result-team demo
  release or demo profile.
- Do not label it "PRD-complete MVP," "production-ready," or "all P0 complete."
- EV-16 remains **not applicable—schedules deferred**, never passed.
- EV-17 may report the export portion as passed; deletion, tombstone, and backup
  expiry remain **deferred**, so full EV-17 is not passed.
- Live integration and schedule requirements remain open in `TRACEABILITY.md`.

## Demo-release gate

The release may proceed only when every active gate in `00_PROGRAM.md` and
Phase 07 passes, exact PRD-derived eval thresholds in Phase 06 pass, and all
deferred scenarios are visible in the stored eval report.

## Human approval

Phase 00 closes only after the project owner accepts this release profile. Any
request to call the release PRD-complete automatically reopens the deferred
requirements and blocks Phase 07 until Phase 08 work is completed.

The single approval record is
`../00_evidence/P00_M1/OWNER_APPROVAL_GATE.md`. Its status is authoritative;
approval is never inferred from other checklist progress.
