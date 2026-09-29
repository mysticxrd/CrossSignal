---
type: release-manifest
stage: 05_ship
unit: supabase-postgres-authenticated-trace-resolution-parity
status: proposed
release_verdict: passed-with-limitations
truth_mode: TEST
product_head: a6bd74eba5ab3a709ae959690932521c856e76e1
branch: codex/supabase-migration
target_project_ref: tonuxepirauyqcwbwenw
---

# Supabase trace-resolution TEST release manifest

## Release identity

This evaluator-facing candidate binds the Supabase trace-resolution product
implementation to Git commit `a6bd74eba5ab3a709ae959690932521c856e76e1` on
branch `codex/supabase-migration`. The release claim is the accepted,
authenticated, tenant-bound, read-only TEST parity slice documented by the
Stage 04 verification report.

## Included proof

- Explicit `d1` and `supabase` provider selection with no automatic fallback.
- A transaction-pooler-compatible PostgreSQL adapter using read-only
  transactions and transaction-local tenant context.
- Three repository migrations, deterministic fixture generation, hosted SQL
  tests, and a real short-lived adapter probe.
- Hosted counts of 2 workspaces, 2 workspace members, 2 traces, and 77 events.
- Tenant results of 28 and 49 events with zero cross-tenant visibility.
- A SELECT-only reader role, zero security advisories, and five `Unused Index`
  INFO notices on the small TEST dataset.
- A cold reviewer path in `factory/05_ship/output/DEMO_SCRIPT.md`.

## Truth and operating boundary

This package is TEST evidence. The Supabase adapter is not deployed, no
persistent runtime credential exists, and no LIVE external effect or production
data was used. D1 remains the rollback path and cannot be removed in this
four-table slice. The Supabase migration ledger is empty because SQL Editor
applied the migrations, so this release does not claim automated or
ledger-tracked migration delivery.

The candidate may be described as: “A hosted Supabase PostgreSQL TEST proof of
the authenticated trace-resolution read path, including RLS isolation and an
actual transaction-pooler adapter check.” It must not be described as a full D1
replacement, a production deployment, or proof of exactly-once behavior.

## Reviewer entry points

| Purpose | Path |
|---|---|
| Cold run | `factory/05_ship/output/DEMO_SCRIPT.md` |
| Release-grade evidence | `factory/04_verify/output/VERIFICATION_REPORT.md` |
| Stage 04 acceptance | `factory/04_verify/output/HUMAN_GATE.md` |
| Supabase operator notes | `supabase/README.md` |

## Declared input bindings

| Input | SHA-256 |
|---|---|
| `factory/05_ship/CONTEXT.md` | `2489ff3b131b3d401e8923d551e5331c06f3e6b3d8c4e1340c8275f87829287f` |
| `factory/04_verify/output/VERIFICATION_REPORT.md` | `ebe9841398a48f82aad95b2a15fee1c4adafd57afd5101636a9b670758cf8b6b` |
| `factory/04_verify/output/HUMAN_GATE.md` | `fbf8624d50ac73178470afed7060585f98d7a5406c601a59bdc3293f786d669f` |
| `factory/_shared/ARCHITECTURE_SNAPSHOT.md` | `e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
