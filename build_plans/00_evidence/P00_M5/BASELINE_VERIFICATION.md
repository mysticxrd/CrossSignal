---
status: verified_after_deployment
verified_at: 2026-08-11
---

# Phase 00 baseline verification

## Environment

| Surface | Version / target |
|---|---|
| Application runtime used for validation | Node 22.15.0 |
| Application build | Vinext 1.0.0-beta.2 / Vite 8.0.13 |
| Persistence | Sites D1 binding `DB`; checked-in Drizzle migrations 0000–0003 |
| EVE topology fixture | Separate Node 24.14.0 service; exact `eve@0.32.0`; not deployed with the app |

## Executed checks

| Check | Result |
|---|---|
| Empty and release-upgrade migration parity | Pass, including an enforced-foreign-key D1-style transaction with seeded cases, evidence, events, and approvals preserved |
| SQLite foreign-key and integrity checks | Pass |
| Two-user/two-workspace rejection matrix | Pass |
| Active-workspace cookie rejection | Pass |
| Phase 00 claim/truthfulness contract | Pass |
| Owner approval record | Pass |
| State-owner and EVE boundary contracts | Pass |
| EVE process-restart verifier | Pass under Node 24.14.0 |
| Spike TypeScript check | Pass |
| Targeted application/database/test lint | Pass |
| Root production build and executable tests | Pass: 12 tests run, 12 passed, 0 failed, 0 skipped |
| Whitespace/diff check | Pass before deployment |

## Deployment-found migration correction

The first version-5 publish attempt on commit `e19331e` failed before release
with D1's `foreign key mismatch - "__new_approvals" referencing "cases"`
error. The earlier local migration test had accepted
`PRAGMA foreign_keys=OFF`, while D1 deliberately keeps foreign-key enforcement
enabled during migrations.

This correction follows Cloudflare's D1 migration contract: foreign keys stay
enabled, `defer_foreign_keys` may defer validation, and cascade actions still
execute. Source read on 2026-08-11:
https://developers.cloudflare.com/d1/sql-api/foreign-keys/

Migration `0003_faithful_guardsmen.sql` now uses unconstrained staging tables,
drops children before parents, and rebuilds parents before children. Its test
executes the upgrade inside an explicit transaction with foreign keys enabled,
asserts the seeded graph survives, and finishes with clean foreign-key and
integrity checks. The failed deployment did not replace the prior live version.

The executable denominator is **12 tests run, 12 passed, 0 failed, 0 skipped**
as reported by the current Node test runner. It is a
structural/database/contract suite, not the PRD evaluation suite. No UI copy may
convert that denominator into an EVE-eval pass claim.
