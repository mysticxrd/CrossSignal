---
id: result-demo-deferred-scope-v1
profile: result-team-demo
status: active
blocking_demo: false
production_owner: phase-08
---

# Deferred-scope register

These items remain open PRD or production concerns. They do not block the
Result-team demo because the demo uses the explicit substitutions in
`../../_shared/DEMO_RELEASE_PROFILE.md`. They become blocking if the release is
called PRD-complete, production-ready, or live-integrated.

| ID | Deferred capability | Demo treatment | Owner | Re-entry trigger |
|---|---|---|---|---|
| DS-01 | Live PostHog OAuth, project access, freshness, and customer events | Versioned PostHog-like fixture adapter | Phase 08 | Approved live-data beta |
| DS-02 | Live Stripe credentials and customer revenue | Stripe-test-like synthetic fixture adapter | Phase 08 | Approved live-data beta |
| DS-03 | Live GitHub reads and customer-repository issue creation | GitHub-like fixtures plus an explicit sandbox action adapter | Phase 08 | Customer repository authorization |
| DS-04 | Production schedules and scheduled-principal authority | Owner-triggered scan and disclosed manual time advance | Phase 08 | Schedule requirement activated |
| DS-05 | Postgres migration and high-concurrency serving | Sites D1 for the bounded private demo | Phase 08 | Load/tenant evidence exceeds D1 profile |
| DS-06 | Object storage for raw imports and large evidence | Versioned synthetic fixtures; no live raw payload collection | Phase 08 | Live or uploaded restricted evidence |
| DS-07 | Full OpenTelemetry operations and long-term trace pipeline | Linked minimal EVE run evidence plus permanent D1 ledger | Phase 08 | Operational beta/SLO commitment |
| DS-08 | Public internet Lab hosting | Persisted, owner-reviewed private preview | Phase 08 | Deliberate public-release decision |
| DS-09 | Production export/deletion, tombstones, and backup-expiry guarantees | Portable demo export only in Phase 07 | Phase 08 | Real user data or lifecycle commitment |
| DS-10 | Slack/notification channels | No substitution; omitted from critical path | Phase 08 | User demand |
| DS-11 | Collaboration, role hierarchies, and approval chains | One authenticated owner per isolated workspace | Phase 08 | Multi-user demand |
| DS-12 | Billing, payments, KYC, and commercial account setup | No substitution; not a demo claim | Phase 08 | Commercial launch |
| DS-13 | Repository patches, pull requests, and preview deployments | One bounded sandbox issue action only | Phase 08 | Issue action proves insufficient |
| DS-14 | Automatic exposure detection and production measurement dispatch | Explicit owner confirmation plus fixture windows | Phase 08 | Live experiment workflow |
| DS-15 | Configurable rules, model comparison, and stale-artifact automation | Frozen golden rules/model profile | Phase 08 | Validated product need |

## Eval reporting consequences

- EV-16 is `not applicable — schedules deferred`; it is never displayed as a
  pass in the demo profile.
- EV-17 may report the Phase 07 export sub-scope only. Active deletion,
  tombstones, and backup expiry remain deferred, so full EV-17 is not passed.
- Live-connector and schedule requirements stay open in `../../TRACEABILITY.md`.
