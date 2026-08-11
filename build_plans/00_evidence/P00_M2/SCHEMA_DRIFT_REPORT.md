---
id: p00-m2-schema-drift-report
audit_date: 2026-08-11
status: resolved
---

# Schema drift report

## Before P00-M2

| Object area | Checked-in history | Runtime DDL | Risk |
|---|---|---|---|
| Users/workspaces/membership | Migration 0000 | Recreated in `db/workspaces.ts` | Two schema owners could diverge |
| Cases/events/approvals | Migration 0001 | Recreated in `db/cases.ts` | Runtime could silently mask a missing migration |
| Evidence/link/immutability trigger | Migration 0002 | Recreated in `db/cases.ts` | Trigger and indexes could drift independently |
| Tenant relationship | Separate foreign keys to case/evidence/workspace | Same separate keys | A child could name a valid foreign object from another workspace |
| Runtime readiness | Successful `CREATE IF NOT EXISTS` | No migration-version proof | Partial schemas could appear healthy |

## After P00-M2

- Runtime `CREATE TABLE`, `CREATE INDEX`, and `CREATE TRIGGER` statements are
  removed from `db/workspaces.ts` and `db/cases.ts`.
- `db/migrations.ts` verifies all eight tables, both composite tenant parent
  indexes, the evidence immutability trigger, and foreign-key enforcement.
- Migration 0003 adds composite workspace/case, workspace/evidence, and
  workspace/actor membership constraints plus enum/range checks.
- The reviewed migration uses D1-safe staging tables, drops children before
  parents, rebuilds parents before children, recreates the migration-owned
  trigger, and runs `PRAGMA optimize` without relying on unsupported
  `foreign_keys=OFF` behavior.
- Automated schema signatures are identical for empty and 0002-upgrade paths;
  both pass `foreign_key_check` and `integrity_check`.

## Drizzle review correction

The first generated 0003 candidate re-enabled foreign keys after rebuilding
only `approvals` and omitted the trigger that a later table rebuild would drop.
The first Sites version-5 deployment then exposed a second flaw: local SQLite
accepted `foreign_keys=OFF`, but D1 keeps enforcement active during migration
transactions. The checked-in SQL now uses dependency-ordered staging and its
upgrade test runs as an enforced-foreign-key transaction with populated cases,
evidence, events, and approvals. This is why generated SQL is evidence to
inspect, not an automatically trusted artifact.
