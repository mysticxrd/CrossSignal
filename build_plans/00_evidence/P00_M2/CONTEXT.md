---
id: p00-m2-evidence
phase: phase-00
milestone: P00-M2
status: complete
---

# P00-M2 — Persistence and tenant foundation

## Inputs

- `../../00_foundation_and_demo_contract.md`
- `../../_shared/QUALITY_GATES.md`
- `../../../db/schema.ts`
- `../../../db/workspaces.ts`
- `../../../db/cases.ts`
- `../../../drizzle/0000_dry_chat.sql` through
  `../../../drizzle/0003_faithful_guardsmen.sql`
- `../../../tests/rendered-html.test.mjs`

## Process

1. Inventory checked-in migration history versus runtime schema creation.
2. Make migration files the only schema history and leave runtime verification
   fail-closed and non-creative.
3. Encode tenant identity into cross-table foreign keys and actor membership.
4. Compare empty and prior-release migration paths byte-for-byte at the
   `sqlite_schema` level and run SQLite integrity checks.
5. Exercise foreign workspace IDs and actors across every current durable graph.

## Outputs

- `MIGRATION_POLICY.md`
- `SCHEMA_DRIFT_REPORT.md`
- `TENANT_ISOLATION_MATRIX.md`
- `ACCEPTANCE_EVIDENCE.md`
- Migration `../../../drizzle/0003_faithful_guardsmen.sql`
- Runtime compatibility verifier `../../../db/migrations.ts`

## Human check

Inspect the migration, then run the named verification commands. A fresh
database and a database upgraded from migration 0002 must expose the same
tables, indexes, triggers, constraints, and no foreign-key violations. Every
crafted tenant mismatch must fail before mutation.
