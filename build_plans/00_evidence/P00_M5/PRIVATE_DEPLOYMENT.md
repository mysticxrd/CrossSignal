---
status: pending
access: owner-only-required
deployed_url: null
version: null
deployment_verified_at: null
---

# Phase 00 private deployment

The validated application source will be pushed to the configured Sites source
repository, packaged from the same commit, saved as one Sites version, and
deployed only through the verified owner-only private deployment path.

Required post-deployment proof:

- the deployment reports `succeeded`;
- owner-only access is confirmed by Sites before deployment starts;
- the authenticated application loads from the returned production URL;
- refresh retains the selected authorized workspace and its persisted case
  cycle; and
- switching workspaces never carries the prior workspace's case/ledger state
  into the selected workspace.

The owner subsequently allowed a non-owner-only deployment if technically
necessary. That broader fallback is not being exercised: Sites already verifies
the project as owner-only, so the narrower approved release profile remains the
selected path.

## Attempt history

| Attempt | Source | Result | Recovery |
|---|---|---|---|
| Sites version 5 | `e19331e` | Failed before release: D1 rejected the tenant-hardening migration because `PRAGMA foreign_keys=OFF` is not effective inside a D1 migration transaction | Kept the prior live version; replaced the migration choreography with D1-safe child-to-parent teardown and parent-to-child rebuild ordering, plus an enforced-foreign-key transaction regression test |

The failed attempt is acceptance evidence, not a passing deployment. This file
remains `pending` until a corrected saved version reaches `succeeded` and the
returned application is exercised.
