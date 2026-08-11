---
id: p00-m2-acceptance-evidence
status: complete
verified_at: 2026-08-11
---

# P00-M2 acceptance evidence

## Deliverables

| Contract item | Proof |
|---|---|
| Canonical migration policy | `MIGRATION_POLICY.md` |
| Runtime/schema drift inventory and resolution | `SCHEMA_DRIFT_REPORT.md`, `../../../db/migrations.ts` |
| Generated and reviewed tenant migration | `../../../drizzle/0003_faithful_guardsmen.sql` and matching Drizzle metadata |
| Empty versus upgrade equivalence | Executable schema-signature and integrity test |
| Two-user/two-workspace matrix | `TENANT_ISOLATION_MATRIX.md` and executable rejection test |
| Invalid workspace-cookie handling | Executable authorized-workspace selector test |

## Verification proof

| Check | Result |
|---|---|
| `npm.cmd run db:generate` | Generated migration 0003 and version-matched snapshot; SQL manually reviewed |
| `node_modules\.bin\eslint.cmd app db tests` | Pass, exit 0 |
| `npm.cmd test` | Pass; Vinext production build completed and migration 0003 packaged |
| Executable denominator | 9 tests, 9 passed, 0 failed, 0 skipped |
| Fresh database | Full 0000–0003 history passes schema, FK, and integrity checks |
| Upgrade database | Valid 0002 data survives 0003; schema matches fresh database |
| Tenant attacks | Foreign cases, evidence, events, approvals, and actors rejected |

## Acceptance

- [x] Crafted foreign case, evidence, approval, actor, and workspace-cookie
      values yield no cross-tenant data or mutation.
- [x] Fresh and upgraded databases expose the same schema and constraints.
- [x] Checked-in migrations are authoritative; runtime initialization cannot
      create or drift schema.
- [x] Index-bearing migration 0003 ends with `PRAGMA optimize`.
