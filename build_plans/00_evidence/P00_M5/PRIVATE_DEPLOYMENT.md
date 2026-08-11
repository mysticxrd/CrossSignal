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

No public or shared deployment is authorized by this milestone.
