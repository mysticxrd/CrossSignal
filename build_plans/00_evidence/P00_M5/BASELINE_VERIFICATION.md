---
status: validated_before_deployment
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
| Empty and release-upgrade migration parity | Pass |
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

The executable denominator is **12 tests run, 12 passed, 0 failed, 0 skipped**
as reported by the current Node test runner. It is a
structural/database/contract suite, not the PRD evaluation suite. No UI copy may
convert that denominator into an EVE-eval pass claim.
