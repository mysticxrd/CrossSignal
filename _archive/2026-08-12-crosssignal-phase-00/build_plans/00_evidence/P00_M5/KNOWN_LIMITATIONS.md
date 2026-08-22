# Phase 00 known limitations

## What is real now

- Sites owner authentication, D1-backed owner workspaces, server membership
  checks, workspace cookie validation, durable seeded case/evidence/ledger
  records, additive cycle reset, and the owner-only version-6 Sites deployment
  recorded in `PRIVATE_DEPLOYMENT.md`.
- A separately executable EVE 0.32.0 fixture proves durable session recovery
  after process replacement.

## What remains fixture, simulated, or planned

- Connections and source observations are versioned fixtures; no live PostHog,
  Stripe, GitHub, or support provider is connected.
- The scan animation triggers a D1 fixture-cycle reset; there is no detector or
  scheduled scan.
- No canonical ICM repository or product artifact exists yet. The EVE spike's
  `icm_head` is a signed fixture claim only.
- EVE is not connected to the application, deployed as a product service, or
  authorized through a D1 run mapping. It has no product tools.
- Approvals and external receipt labels demonstrate D1 persistence but are not
  payload-bound operational authorization or real external side effects.
- Measurement values and the 14-day advance are deterministic fixture
  presentation, not live calculation or wall-clock scheduling.
- Company Brain and Lab surfaces are planned presentation; no approved Git diff,
  sanitizer, persisted publication, or public site exists.
- The executable application tests are not PRD eval scenarios EV-01–EV-17.
- Phase 00 cycle reset is additive and scoped, but the fully deterministic,
  idempotent golden reset remains Phase 07 work.

## Deployment boundary

The private Sites deployment contains the truthful application shell and D1
migrations only. It does not contain the `eve-spike/` service, local Workflow
state, credentials, temporary archives, or proof runtime files.
