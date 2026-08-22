---
id: crosssignal-d1-migration-policy-v1
status: accepted
canonical_history: drizzle
---

# D1 migration policy

## Authority

- Checked-in SQL under `drizzle/` is the sole ordered database history.
- `db/schema.ts` is the typed declaration used to generate and review the next
  migration; it does not apply schema at request time.
- `db/migrations.ts` may enable required SQLite compatibility settings and
  verify required objects. It must never create, alter, drop, or repair schema.
- A missing table, tenant index, or immutability trigger fails closed with an
  instruction to apply the checked-in migrations.

## Change procedure

1. Update `db/schema.ts`.
2. Run `npm.cmd run db:generate`.
3. Inspect the generated SQL, snapshot, and journal entry.
4. For D1 table rebuilds, never depend on `PRAGMA foreign_keys=OFF`: stage rows
   without constraints, drop children before parents, rebuild parents before
   children, and use `defer_foreign_keys` only as D1 documents.
5. Restore migration-owned objects that Drizzle cannot declare, including
   `trg_evidence_observations_immutable`, when a table rebuild drops them.
6. End every index-bearing migration with `PRAGMA optimize`.
7. Apply the entire history to an empty database and apply only the new tail to
   a database on the previous release. Compare `sqlite_schema`, run
   `PRAGMA foreign_key_check`, and run `PRAGMA integrity_check`.
8. Execute the upgrade test inside an explicit transaction with foreign keys
   enabled and populated rows in every rebuilt table.
9. Package every migration in the Sites build before deployment.

## Compatibility and rollback

Migration 0003 rebuilds existing tables to add composite tenant constraints; it
does not discard columns or valid rows. The pre-deployment check must reject
legacy rows whose actor or foreign IDs do not belong to their declared
workspace. Keep the prior private deployment until migration and persistence
verification pass. Do not roll application code back across an applied
constraint migration unless the older build has been verified compatible with
the stricter schema.
