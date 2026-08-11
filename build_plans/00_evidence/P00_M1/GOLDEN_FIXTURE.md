---
id: golden-mobile-safari-checkout-v1
fixture_version: 1
status: frozen
data_class: synthetic
workspace_template: atlas-foundry-result-demo-v1
case_key: CS-014
timezone: America/Los_Angeles
as_of_utc: 2026-08-08T02:30:00Z
---

# Golden fixture case

## Decision question

Did a checkout interaction release plausibly contribute to a paid-conversion
regression for the Mobile Safari paid-acquisition cohort, and what is the
smallest bounded intervention that can test the hypothesis?

## Fixed case facts

| Field | Frozen value |
|---|---|
| Workspace | Atlas Foundry — versioned synthetic demo workspace |
| Case | `CS-014` — Mobile Safari checkout regression after release |
| Metric | `paid_conversion_v3` |
| Segment | `mobile_safari_paid` |
| Source observation envelope | 2026-07-24 through 2026-08-07 |
| Deterministic scan window | 2026-07-25 through 2026-08-07 |
| Baseline comparison | 2026-07-25 through 2026-07-31 |
| Current comparison | 2026-08-01 through 2026-08-07 |
| Fixture clock at reset | 2026-08-08T02:30:00Z |
| Implementation time | 2026-08-08T10:30:00Z |
| Post-intervention window | 2026-08-09 through 2026-08-22 |
| Simulated clock after advance | 2026-08-23T02:30:00Z |
| Minimum exposure | 50 eligible sessions |
| Effect tolerance | ±5% relative |
| Confidence language | Medium; hypothesis, never causal conclusion |

All storage timestamps remain UTC. Dates shown to a user are rendered in the
workspace timezone. A fixture date is never derived from the current wall clock.

## Versioned source set

| ID | Adapter identity | Required observation | Nature |
|---|---|---|---|
| EV-01 | PostHog-like fixture | Mobile Safari paid conversion falls from 6.2% to 4.8%; 184 eligible sessions | Fixture |
| EV-02 | Stripe-test-like fixture | Net-new synthetic test revenue falls 17.1% for the aligned cohort/window | Fixture |
| EV-03 | Support fixture | Three independent synthetic messages mention iPhone/Safari checkout failure | Fixture |
| EV-04 | GitHub-like fixture | Synthetic checkout release `PR #181` precedes the regression by 19 hours | Fixture |
| EV-05 | PostHog-like fixture | Desktop paid conversion holds at 6.4%, weakening the traffic-quality alternative | Fixture |

No record represents a live provider fetch. The existing D1 rows and their
content hashes are real persisted demo evidence, but the business observations
inside them are synthetic fixtures.

## Expected decision path

1. The deterministic fixture rule emits one signal and one durable case for the
   fixture version and observation window.
2. The evidence brief keeps the leading explanation provisional and includes
   lower-intent campaign traffic as a viable alternative.
3. The human edit must survive interruption and be read by resumed EVE work.
4. The intervention is one sandbox issue proposal for checkout reproduction and
   Mobile Safari regression coverage.
5. The fixture outcome moves paid conversion from 4.8% to 5.7% across 73
   eligible sessions, a relative improvement of 18.7%.
6. The proposed learning remains provisional until the exact ICM diff is
   accepted by the owner.

## Reset contract

Reset is an additive, workspace-scoped demo operation:

- Target only the authenticated owner's workspace whose template identity is
  `atlas-foundry-result-demo-v1` and case key is `CS-014`.
- Advance the case cycle, restore the frozen fixture clock and initial semantic
  stage, clear only the current cycle's derived action display, and seed missing
  versioned fixture rows idempotently.
- Retain prior cycles, approvals, receipts, ledger events, accepted evidence,
  and all unrelated workspaces.
- Never delete a workspace, truncate a ledger, rewrite historical source rows,
  or use a browser-only reset as the authoritative operation.

The current implementation already advances one D1 case cycle without deleting
prior events. Phase 00 must verify the complete tenant and reset boundary before
the reset is accepted as release proof.
