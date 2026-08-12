---
id: phase-00-retrospective-gate-02
historical_gate: P00-M2
classification: retrospective-owner-visibility
---

# Gate 2 — Persistence boundary

## 1. Gate purpose

This gate had to answer: **Can CrossSignal trust its database history and prevent
one workspace from being joined to another workspace's cases, evidence, events,
or approvals?** It mattered because persistent data is only useful if upgrades
are repeatable and tenant boundaries still hold when a caller supplies crafted
identifiers.

## 2. Starting situation

The application had checked-in Drizzle migrations, but request-time code also
contained `CREATE TABLE IF NOT EXISTS` statements. That gave the schema two
owners and could hide a missing or drifting migration. Tables separately
referenced valid case, evidence, workspace, and user IDs, but the database did
not always prove that those IDs belonged to the same workspace. Tests covered
some structure, not a complete two-user/two-workspace attack matrix.

## 3. What was decided

Checked-in SQL under `drizzle/` became the sole ordered schema history.
`db/schema.ts` remains the typed source used to generate changes, while runtime
startup only checks that migrations were applied and fails closed if required
objects are missing. Composite foreign keys now bind a child row to the same
workspace as its case, evidence, creator, or approver. Invalid or foreign active
workspace cookies fall back to an authorized workspace.

The rejected approaches were runtime schema creation, trusting application
membership checks alone, or retaining independent foreign keys that allowed
cross-workspace combinations. Commit `a12b786`, authored by `mysticxrd`, records
the technical decision. There is no separate pre-implementation owner decision
or owner-acceptance record for this gate.

## 4. What was implemented

Runtime table/index/trigger creation was removed and replaced by a compatibility
verifier. Migration `0003_faithful_guardsmen.sql` rebuilt the tenant graph with
workspace-bound relationships, validation checks, the immutable-evidence
trigger, and `PRAGMA optimize`. Tests create two owners and two workspaces, try
foreign cases, evidence, links, events, approvers, and cookies, then verify that
the database remains healthy. Fresh and upgraded databases are compared by
their complete SQLite schema.

The first Sites version-5 deployment exposed a flaw that local SQLite had not:
D1 kept foreign keys active during the migration. The migration was then changed
to preserve rows in temporary staging tables, remove children before parents,
and rebuild parents before children. That correction became commit `a1e7dde`.

## 5. How CrossSignal changed

- **User-visible:** workspaces still looked the same, but switching and refreshing
  were less able to select or reveal another workspace's state.
- **System-level:** migration history became authoritative, runtime drift became
  a hard error, and the database itself began enforcing current tenant relationships.
- **Unchanged:** D1 remained the operational store; the product still used the
  seeded case and did not gain live sources, ICM artifacts, or EVE execution.

## 6. Evidence

- Policy and correction history: [`MIGRATION_POLICY.md`](../00_evidence/P00_M2/MIGRATION_POLICY.md)
  and [`SCHEMA_DRIFT_REPORT.md`](../00_evidence/P00_M2/SCHEMA_DRIFT_REPORT.md)
- Boundary matrix: [`TENANT_ISOLATION_MATRIX.md`](../00_evidence/P00_M2/TENANT_ISOLATION_MATRIX.md)
- Implementation: [`0003_faithful_guardsmen.sql`](../../drizzle/0003_faithful_guardsmen.sql),
  [`schema.ts`](../../db/schema.ts), [`migrations.ts`](../../db/migrations.ts),
  and [`workspace-selection.mjs`](../../app/workspace-selection.mjs)
- Executable proof: [`rendered-html.test.mjs`](../../tests/rendered-html.test.mjs)
  and [`ACCEPTANCE_EVIDENCE.md`](../00_evidence/P00_M2/ACCEPTANCE_EVIDENCE.md)
- Deployment-discovered failure: [`BASELINE_VERIFICATION.md`](../00_evidence/P00_M5/BASELINE_VERIFICATION.md)
- Git: `a12b786` introduced the boundary; `a1e7dde` made its migration D1-safe;
  `a341e0c` closed the evidence record.

## 7. Truthfulness classification

The migration files, runtime verifier, local SQLite attack tests, schema parity,
and recorded D1 version-6 upgrade are **real**. The test identities and their
case data are **fixtures**. No sandbox action or simulated time is involved.
Production-scale concurrency, Postgres equivalence, full PRD authorization
evals, and every future table/path are **planned**, not proven here.

## 8. Limitations and risks

The matrix covers the Phase 00 schema and current server paths, not future EVE
streams, cancellation, exports, connector credentials, action replay, or ICM
repository access. The initial local test missed D1 migration behavior, showing
that SQLite parity is insufficient without a platform-real upgrade. The final
deployment proof is a stored repository record; this retrospective did not
redeploy or re-query the service.

## 9. What the owner should understand

This was a real security and durability improvement, not presentation work.
It also revealed a release-process weakness before the successful deployment.
Revisit the persistence choice when live data, higher concurrency, Postgres, or
new operational entities enter scope, and require platform-real migration tests
before release.
