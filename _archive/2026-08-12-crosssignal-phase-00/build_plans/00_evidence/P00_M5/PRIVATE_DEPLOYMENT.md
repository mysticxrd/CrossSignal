---
status: complete
access: owner-only
deployed_url: https://crosssignal-revenue-flight-recorder.hishamxrd.chatgpt.site
version: 6
commit_sha: a1e7dde1670bdbca5a8aebd46f0b33d74cc32293
archive_sha256: DAA45954F588D6428FF6B6B25B0C530B6676D983A704EE05ACF88DF62F7951D4
deployment_verified_at: 2026-08-11T13:15:00.800921Z
---

# Phase 00 private deployment

The validated application source was pushed to the configured Sites source
repository, packaged from the same commit, saved as Sites version 6, and
deployed through the verified owner-only private deployment path.

## Verified result

- [x] Sites reported `succeeded` for version 6 at the returned production URL.
- [x] Before deployment, Sites reported `custom` access with exactly the current
  owner, zero groups, and zero external visitors.
- [x] The authenticated application loaded as Hisham Ahmad.
- [x] Atlas Foundry remained on fixture cycle 02 and `Approval required` after
  refresh.
- [x] A scoped `Phase 00 Isolation Check` owner workspace was created because
  only one workspace existed. It loaded an independent fixture cycle 01 and
  `Evidence review`, retained both after refresh, and did not display Atlas's
  approval state.
- [x] Switching back restored Atlas Foundry's fixture cycle 02 and `Approval
  required` state. The browser reported no console errors.

The isolation-check workspace is intentionally retained as durable acceptance
evidence; Phase 00 has no destructive workspace-delete operation.

The owner subsequently allowed a non-owner-only deployment if technically
necessary. That broader fallback is not being exercised: Sites already verifies
the project as owner-only, so the narrower approved release profile remains the
selected path.

## Attempt history

| Attempt | Source | Result | Recovery |
|---|---|---|---|
| Sites version 5 | `e19331e` | Failed before release: D1 rejected the tenant-hardening migration because `PRAGMA foreign_keys=OFF` is not effective inside a D1 migration transaction | Kept the prior live version; replaced the migration choreography with D1-safe child-to-parent teardown and parent-to-child rebuild ordering, plus an enforced-foreign-key transaction regression test |
| Sites version 6 | `a1e7dde` | Succeeded; owner-only production URL loaded and persisted two isolated workspace states through refresh and switching | Accepted as the Phase 00 private baseline |

The failed attempt remains part of the evidence trail; only version 6 satisfies
the deployment gate.
