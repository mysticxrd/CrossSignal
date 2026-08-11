import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

function applyMigration(database, migration) {
  for (const statement of migration.split("--> statement-breakpoint")) {
    if (statement.trim()) database.exec(statement);
  }
}

test("protects the product with authenticated owner and workspace checks", async () => {
  const [page, auth, actions, workspaceStore] = await Promise.all([
    readFile(new URL("app/page.tsx", projectRoot), "utf8"),
    readFile(new URL("app/crosssignal-auth.ts", projectRoot), "utf8"),
    readFile(new URL("app/workspace-actions.ts", projectRoot), "utf8"),
    readFile(new URL("db/workspaces.ts", projectRoot), "utf8"),
  ]);

  assert.match(page, /requireCrossSignalUser\("\/"\)/);
  assert.match(page, /listOwnerWorkspaces\(owner\)/);
  assert.match(auth, /NODE_ENV === "development"/);
  assert.match(actions, /getCrossSignalUser\(\)/);
  assert.match(actions, /ownerCanAccessWorkspace/);
  assert.match(actions, /httpOnly: true/);
  assert.match(workspaceStore, /WHERE workspace_id = \? AND user_id = \? AND role = 'owner'/);
  assert.doesNotMatch(`${page}\n${actions}\n${workspaceStore}`, /localStorage|sessionStorage/);
});

test("ships durable workspace, case-ledger, and evidence migrations", async () => {
  const [hosting, workspaceMigration, caseMigration, evidenceMigration, schema, caseStore] = await Promise.all([
    readFile(new URL(".openai/hosting.json", projectRoot), "utf8"),
    readFile(new URL("drizzle/0000_dry_chat.sql", projectRoot), "utf8"),
    readFile(new URL("drizzle/0001_gigantic_shriek.sql", projectRoot), "utf8"),
    readFile(new URL("drizzle/0002_funny_madripoor.sql", projectRoot), "utf8"),
    readFile(new URL("db/schema.ts", projectRoot), "utf8"),
    readFile(new URL("db/cases.ts", projectRoot), "utf8"),
  ]);

  assert.equal(JSON.parse(hosting).d1, "DB");
  assert.match(workspaceMigration, /CREATE TABLE `users`/);
  assert.match(workspaceMigration, /CREATE TABLE `workspaces`/);
  assert.match(workspaceMigration, /CREATE TABLE `workspace_members`/);
  assert.match(caseMigration, /CREATE TABLE `cases`/);
  assert.match(caseMigration, /CREATE TABLE `case_events`/);
  assert.match(caseMigration, /CREATE TABLE `approvals`/);
  assert.match(caseMigration, /idx_case_events_workspace_idempotency/);
  assert.match(caseMigration, /idx_approvals_case_cycle_gate/);
  assert.match(evidenceMigration, /CREATE TABLE `evidence_observations`/);
  assert.match(evidenceMigration, /CREATE TABLE `case_evidence`/);
  assert.match(evidenceMigration, /idx_evidence_observations_workspace_key/);
  assert.match(evidenceMigration, /trg_evidence_observations_immutable/);
  assert.match(evidenceMigration, /PRAGMA optimize/);
  assert.match(schema, /primaryKey\(\{ columns: \[table\.workspaceId, table\.userId\] \}\)/);
  assert.match(caseStore, /ownerCanAccessWorkspace\(userId, workspaceId\)/);
  assert.match(caseStore, /INSERT OR IGNORE INTO approvals/);
  assert.match(caseStore, /INSERT OR IGNORE INTO case_events/);
  assert.match(caseStore, /idempotencyKey/);
  assert.match(caseStore, /seedCaseEvidence/);
  assert.match(caseStore, /listCaseEvidence/);
  assert.match(caseStore, /listCaseEvents/);
  assert.doesNotMatch(caseStore, /localStorage|sessionStorage/);
});

test("enforces workspace evidence and ledger uniqueness in SQLite", async () => {
  const migrations = await Promise.all([
    readFile(new URL("drizzle/0000_dry_chat.sql", projectRoot), "utf8"),
    readFile(new URL("drizzle/0001_gigantic_shriek.sql", projectRoot), "utf8"),
    readFile(new URL("drizzle/0002_funny_madripoor.sql", projectRoot), "utf8"),
  ]);
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  for (const migration of migrations) applyMigration(database, migration);

  database.exec(`
    INSERT INTO users (id, email, display_name) VALUES ('user-1', 'owner@example.com', 'Owner');
    INSERT INTO workspaces (id, name, slug, owner_user_id) VALUES ('ws-1', 'Atlas', 'atlas', 'user-1');
    INSERT INTO cases (id, workspace_id, case_key, title, issue_title, created_by)
      VALUES ('case-1', 'ws-1', 'CS-014', 'Regression', 'Fix checkout', 'user-1');
    INSERT INTO evidence_observations (
      id, workspace_id, evidence_key, source, source_class, eyebrow, title,
      display_value, delta, detail, query_text, observed_window, ingested_at,
      content_hash, identity_level, created_by
    ) VALUES (
      'ev-1', 'ws-1', 'EV-01', 'PostHog', 'source-posthog', 'ANALYTICS',
      'Conversion', '4.8%', '-22.4%', 'Observed regression', 'bound query',
      '7 days', '2026-08-08 02:14:00', 'abc123', 'Aggregate', 'user-1'
    );
    INSERT INTO case_evidence (case_id, evidence_id, workspace_id, relation, position)
      VALUES ('case-1', 'ev-1', 'ws-1', 'supports', 1);
    INSERT INTO case_events (
      id, case_id, workspace_id, cycle, event_type, actor_user_id, idempotency_key
    ) VALUES ('event-1', 'case-1', 'ws-1', 1, 'evidence_registered', 'user-1', 'case-1:evidence:v1');
  `);

  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM case_evidence").get().count, 1);
  assert.throws(() => database.exec(`
    INSERT INTO case_events (
      id, case_id, workspace_id, cycle, event_type, actor_user_id, idempotency_key
    ) VALUES ('event-2', 'case-1', 'ws-1', 1, 'evidence_registered', 'user-1', 'case-1:evidence:v1');
  `), /UNIQUE constraint failed/);
  assert.throws(() => database.exec(`
    UPDATE evidence_observations SET detail = 'silently changed' WHERE id = 'ev-1';
  `), /evidence observations are immutable/);
  database.close();
});

test("packages the authenticated evidence-ledger release", async () => {
  const [page, cockpit, layout, packageJson, builtHosting] = await Promise.all([
    readFile(new URL("app/page.tsx", projectRoot), "utf8"),
    readFile(new URL("app/CrossSignalApp.tsx", projectRoot), "utf8"),
    readFile(new URL("app/layout.tsx", projectRoot), "utf8"),
    readFile(new URL("package.json", projectRoot), "utf8"),
    readFile(new URL("dist/.openai/hosting.json", projectRoot), "utf8"),
    access(new URL("dist/server/index.js", projectRoot)),
    access(new URL("dist/.openai/drizzle/0000_dry_chat.sql", projectRoot)),
    access(new URL("dist/.openai/drizzle/0001_gigantic_shriek.sql", projectRoot)),
    access(new URL("dist/.openai/drizzle/0002_funny_madripoor.sql", projectRoot)),
  ]);

  assert.match(page, /WorkspaceOnboarding/);
  assert.match(page, /CrossSignalApp/);
  assert.match(page, /listCaseEvidence/);
  assert.match(page, /listCaseEvents/);
  assert.match(cockpit, /Open complete ledger/);
  assert.match(cockpit, /caseEvents\.map/);
  assert.doesNotMatch(cockpit, /const evidenceItems: EvidenceItem\[\]/);
  assert.match(layout, /Revenue Flight Recorder/);
  assert.equal(JSON.parse(builtHosting).d1, "DB");
  assert.doesNotMatch(page, /_sites-preview|SkeletonPreview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("app/_sites-preview", projectRoot)));
});
