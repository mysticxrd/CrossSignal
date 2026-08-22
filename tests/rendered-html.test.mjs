import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { selectAuthorizedWorkspace } from "../app/workspace-selection.mjs";

const projectRoot = new URL("../", import.meta.url);
const migrationNames = [
  "0000_dry_chat.sql",
  "0001_gigantic_shriek.sql",
  "0002_funny_madripoor.sql",
  "0003_faithful_guardsmen.sql",
];

async function readMigrations() {
  return Promise.all(
    migrationNames.map((name) =>
      readFile(new URL(`drizzle/${name}`, projectRoot), "utf8"),
    ),
  );
}

function applyMigration(database, migration) {
  for (const statement of migration.split("--> statement-breakpoint")) {
    if (statement.trim()) database.exec(statement);
  }
}

function applyMigrationAsD1(database, migration) {
  database.exec("BEGIN");
  try {
    applyMigration(database, migration);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
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
  assert.match(page, /selectAuthorizedWorkspace/);
  assert.doesNotMatch(`${page}\n${actions}\n${workspaceStore}`, /localStorage|sessionStorage/);
});

test("ignores stale, malformed, and foreign active-workspace cookies", () => {
  const workspaces = [
    { id: "ws-1", name: "One", slug: "one", role: "owner" },
    { id: "ws-2", name: "Two", slug: "two", role: "owner" },
  ];

  assert.equal(selectAuthorizedWorkspace(workspaces, "ws-2").id, "ws-2");
  assert.equal(selectAuthorizedWorkspace(workspaces, "foreign-ws").id, "ws-1");
  assert.equal(selectAuthorizedWorkspace(workspaces, "x".repeat(129)).id, "ws-1");
  assert.equal(selectAuthorizedWorkspace(workspaces, undefined).id, "ws-1");
  assert.throws(() => selectAuthorizedWorkspace([], "ws-1"), /No authorized workspace/);
});

test("ships migration-owned durable workspace, tenant, ledger, and evidence schema", async () => {
  const [hosting, workspaceMigration, caseMigration, evidenceMigration, tenantMigration, schema, caseStore, workspaceStore, migrationRuntime] = await Promise.all([
    readFile(new URL(".openai/hosting.json", projectRoot), "utf8"),
    readFile(new URL("drizzle/0000_dry_chat.sql", projectRoot), "utf8"),
    readFile(new URL("drizzle/0001_gigantic_shriek.sql", projectRoot), "utf8"),
    readFile(new URL("drizzle/0002_funny_madripoor.sql", projectRoot), "utf8"),
    readFile(new URL("drizzle/0003_faithful_guardsmen.sql", projectRoot), "utf8"),
    readFile(new URL("db/schema.ts", projectRoot), "utf8"),
    readFile(new URL("db/cases.ts", projectRoot), "utf8"),
    readFile(new URL("db/workspaces.ts", projectRoot), "utf8"),
    readFile(new URL("db/migrations.ts", projectRoot), "utf8"),
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
  assert.match(
    tenantMigration,
    /FOREIGN KEY \(`workspace_id`,`case_id`\) REFERENCES `cases`\(`workspace_id`,`id`\)/,
  );
  assert.match(
    tenantMigration,
    /FOREIGN KEY \(`workspace_id`,`approved_by`\) REFERENCES `workspace_members`\(`workspace_id`,`user_id`\)/,
  );
  assert.match(
    tenantMigration,
    /FOREIGN KEY \(`workspace_id`,`evidence_id`\) REFERENCES `evidence_observations`\(`workspace_id`,`id`\)/,
  );
  assert.match(tenantMigration, /trg_evidence_observations_immutable/);
  assert.match(tenantMigration, /PRAGMA optimize/);
  assert.doesNotMatch(tenantMigration, /PRAGMA foreign_keys=OFF/);
  assert.equal(tenantMigration.match(/PRAGMA defer_foreign_keys=ON/g)?.length, 1);
  assert.equal(tenantMigration.match(/PRAGMA defer_foreign_keys=OFF/g)?.length, 1);
  assert.ok(
    tenantMigration.indexOf("DROP TABLE `approvals`") <
      tenantMigration.indexOf("DROP TABLE `cases`"),
  );
  assert.match(tenantMigration, /DROP TABLE IF EXISTS `__new_approvals`/);
  assert.ok(
    tenantMigration.indexOf("idx_cases_workspace_id") <
      tenantMigration.indexOf("CREATE TABLE `approvals`"),
  );
  assert.ok(
    tenantMigration.lastIndexOf("PRAGMA defer_foreign_keys=OFF") >
      tenantMigration.lastIndexOf("DROP TABLE `__p00_backup"),
  );
  assert.match(schema, /primaryKey\(\{ columns: \[table\.workspaceId, table\.userId\] \}\)/);
  assert.match(caseStore, /ownerCanAccessWorkspace\(userId, workspaceId\)/);
  assert.match(caseStore, /INSERT OR IGNORE INTO approvals/);
  assert.match(caseStore, /INSERT OR IGNORE INTO case_events/);
  assert.match(caseStore, /idempotencyKey/);
  assert.match(caseStore, /seedCaseEvidence/);
  assert.match(caseStore, /listCaseEvidence/);
  assert.match(caseStore, /listCaseEvents/);
  assert.doesNotMatch(`${caseStore}\n${workspaceStore}`, /CREATE TABLE|CREATE INDEX|CREATE TRIGGER/);
  assert.match(migrationRuntime, /Apply the checked-in Drizzle migrations/);
  assert.match(migrationRuntime, /PRAGMA foreign_keys = ON/);
  assert.doesNotMatch(caseStore, /localStorage|sessionStorage/);
});

test("enforces workspace evidence and ledger uniqueness in SQLite", async () => {
  const migrations = await readMigrations();
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  for (const migration of migrations) applyMigration(database, migration);

  database.exec(`
    INSERT INTO users (id, email, display_name) VALUES ('user-1', 'owner@example.com', 'Owner');
    INSERT INTO workspaces (id, name, slug, owner_user_id) VALUES ('ws-1', 'Atlas', 'atlas', 'user-1');
    INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ('ws-1', 'user-1', 'owner');
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

test("packages the authenticated human-control release", async () => {
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
    access(new URL("dist/.openai/drizzle/0003_faithful_guardsmen.sql", projectRoot)),
    access(new URL("dist/.openai/drizzle/0004_typical_omega_red.sql", projectRoot)),
    access(new URL("dist/.openai/drizzle/0005_flight_recorder_guards.sql", projectRoot)),
  ]);

  assert.match(page, /WorkspaceOnboarding/);
  assert.match(page, /CrossSignalApp/);
  assert.match(page, /getOrCreateFlightRecorderSnapshot/);
  assert.match(cockpit, /Nothing happens/);
  assert.match(cockpit, /Authorize exact action/);
  assert.match(cockpit, /Pause all actions/);
  assert.match(cockpit, /Narrative trace/);
  assert.match(layout, /Revenue Flight Recorder/);
  assert.equal(JSON.parse(builtHosting).d1, "DB");
  assert.doesNotMatch(page, /_sites-preview|SkeletonPreview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("app/_sites-preview", projectRoot)));
});

function schemaSignature(database) {
  return database
    .prepare(`SELECT type, name, tbl_name, sql
      FROM sqlite_schema
      WHERE name NOT LIKE 'sqlite_%'
      ORDER BY type, name`)
    .all();
}

function assertDatabaseHealthy(database) {
  assert.deepEqual(database.prepare("PRAGMA foreign_key_check").all(), []);
  assert.equal(database.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
}

test("produces identical healthy schema from empty and latest-release databases", async () => {
  const migrations = await readMigrations();
  const fresh = new DatabaseSync(":memory:");
  fresh.exec("PRAGMA foreign_keys = ON");
  for (const migration of migrations) applyMigration(fresh, migration);

  const upgraded = new DatabaseSync(":memory:");
  upgraded.exec("PRAGMA foreign_keys = ON");
  for (const migration of migrations.slice(0, 3)) applyMigration(upgraded, migration);
  upgraded.exec(`
    INSERT INTO users (id, email, display_name) VALUES ('user-1', 'owner@example.com', 'Owner');
    INSERT INTO workspaces (id, name, slug, owner_user_id) VALUES ('ws-1', 'Atlas', 'atlas', 'user-1');
    INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ('ws-1', 'user-1', 'owner');
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
    INSERT INTO approvals (
      id, case_id, workspace_id, cycle, gate, payload_hash, approved_by
    ) VALUES ('approval-1', 'case-1', 'ws-1', 1, 'evidence', 'payload-v1', 'user-1');
    CREATE TABLE __new_approvals (id text);
  `);
  applyMigrationAsD1(upgraded, migrations[3]);

  assert.deepEqual(schemaSignature(upgraded), schemaSignature(fresh));
  assert.equal(upgraded.prepare("SELECT COUNT(*) AS count FROM cases").get().count, 1);
  assert.equal(upgraded.prepare("SELECT COUNT(*) AS count FROM case_evidence").get().count, 1);
  assert.equal(upgraded.prepare("SELECT COUNT(*) AS count FROM case_events").get().count, 1);
  assert.equal(upgraded.prepare("SELECT COUNT(*) AS count FROM approvals").get().count, 1);
  assert.equal(
    upgraded.prepare("SELECT COUNT(*) AS count FROM sqlite_schema WHERE name = '__new_approvals'").get().count,
    0,
  );
  assertDatabaseHealthy(fresh);
  assertDatabaseHealthy(upgraded);
  fresh.close();
  upgraded.close();
});

test("rejects cross-workspace cases, evidence, events, approvals, and actors", async () => {
  const database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  for (const migration of await readMigrations()) applyMigration(database, migration);
  database.exec(`
    INSERT INTO users (id, email, display_name) VALUES
      ('user-1', 'one@example.com', 'Owner One'),
      ('user-2', 'two@example.com', 'Owner Two');
    INSERT INTO workspaces (id, name, slug, owner_user_id) VALUES
      ('ws-1', 'One', 'one', 'user-1'),
      ('ws-2', 'Two', 'two', 'user-2');
    INSERT INTO workspace_members (workspace_id, user_id, role) VALUES
      ('ws-1', 'user-1', 'owner'),
      ('ws-2', 'user-2', 'owner');
    INSERT INTO cases (id, workspace_id, case_key, title, issue_title, created_by) VALUES
      ('case-1', 'ws-1', 'CS-014', 'One case', 'One issue', 'user-1'),
      ('case-2', 'ws-2', 'CS-014', 'Two case', 'Two issue', 'user-2');
    INSERT INTO evidence_observations (
      id, workspace_id, evidence_key, source, source_class, eyebrow, title,
      display_value, delta, detail, query_text, observed_window, ingested_at,
      content_hash, identity_level, created_by
    ) VALUES
      ('ev-1', 'ws-1', 'EV-01', 'PostHog', 'source-posthog', 'A', 'One', '1', '0', 'One', 'q', 'w', '2026-08-08', 'h1', 'Aggregate', 'user-1'),
      ('ev-2', 'ws-2', 'EV-01', 'PostHog', 'source-posthog', 'A', 'Two', '2', '0', 'Two', 'q', 'w', '2026-08-08', 'h2', 'Aggregate', 'user-2');
  `);

  const foreignKeyFailure = /FOREIGN KEY constraint failed/;
  assert.throws(() => database.exec(`
    INSERT INTO cases (id, workspace_id, case_key, title, issue_title, created_by)
      VALUES ('case-foreign-owner', 'ws-1', 'CS-X', 'Foreign', 'Foreign', 'user-2');
  `), foreignKeyFailure);
  assert.throws(() => database.exec(`
    INSERT INTO evidence_observations (
      id, workspace_id, evidence_key, source, source_class, eyebrow, title,
      display_value, delta, detail, query_text, observed_window, ingested_at,
      content_hash, identity_level, created_by
    ) VALUES ('ev-foreign-owner', 'ws-1', 'EV-X', 'PostHog', 'source-posthog', 'A', 'X', '1', '0', 'X', 'q', 'w', '2026-08-08', 'hx', 'Aggregate', 'user-2');
  `), foreignKeyFailure);
  assert.throws(() => database.exec(`
    INSERT INTO case_evidence (case_id, evidence_id, workspace_id, relation, position)
      VALUES ('case-1', 'ev-2', 'ws-1', 'supports', 1);
  `), foreignKeyFailure);
  assert.throws(() => database.exec(`
    INSERT INTO case_events (
      id, case_id, workspace_id, cycle, event_type, actor_user_id, idempotency_key
    ) VALUES ('event-x', 'case-1', 'ws-2', 1, 'foreign', 'user-2', 'foreign-event');
  `), foreignKeyFailure);
  assert.throws(() => database.exec(`
    INSERT INTO case_events (
      id, case_id, workspace_id, cycle, event_type, actor_user_id, idempotency_key
    ) VALUES ('event-actor-x', 'case-1', 'ws-1', 1, 'foreign', 'user-2', 'foreign-actor');
  `), foreignKeyFailure);
  assert.throws(() => database.exec(`
    INSERT INTO approvals (
      id, case_id, workspace_id, cycle, gate, payload_hash, approved_by
    ) VALUES ('approval-x', 'case-1', 'ws-2', 1, 'evidence', 'hash', 'user-2');
  `), foreignKeyFailure);
  assert.throws(() => database.exec(`
    INSERT INTO approvals (
      id, case_id, workspace_id, cycle, gate, payload_hash, approved_by
    ) VALUES ('approval-actor-x', 'case-1', 'ws-1', 1, 'evidence', 'hash', 'user-2');
  `), foreignKeyFailure);

  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM cases").get().count, 2);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM approvals").get().count, 0);
  assertDatabaseHealthy(database);
  database.close();
});

test("labels the Stage 03 control surfaces truthfully", async () => {
  const cockpit = await readFile(
    new URL("app/CrossSignalApp.tsx", projectRoot),
    "utf8",
  );

  assert.match(cockpit, /TruthBadge mode="FIXTURE"/);
  assert.match(cockpit, /TruthBadge mode="TEST"/);
  assert.match(cockpit, /correlated, not proven/i);
  assert.match(cockpit, /single-user screen does not visually prove tenant isolation/);
  assert.match(cockpit, /Blind retry count: 0/);
  assert.doesNotMatch(
    cockpit,
    /System healthy|Fresh 6m ago|Run #AR-2281|18 \/ 18 PASSING|LOCKED BY SERVER POLICY|ACTION RECEIPT/,
  );
});

test("keeps the Stage 03 fixture reset exact and authority-preserving", async () => {
  const [store, action, cockpit] = await Promise.all([
    readFile(new URL("db/flight-recorder.ts", projectRoot), "utf8"),
    readFile(new URL("app/flight-recorder-actions.ts", projectRoot), "utf8"),
    readFile(new URL("app/CrossSignalApp.tsx", projectRoot), "utf8"),
  ]);
  const start = store.indexOf("export async function resetFlightRecorderFixture");
  assert.ok(start >= 0);
  const resetImplementation = store.slice(start);
  assert.match(resetImplementation, /DELETE FROM flight_traces/);
  assert.match(resetImplementation, /fixture_key = \?/);
  assert.match(resetImplementation, /truth_mode = 'FIXTURE'/);
  assert.doesNotMatch(resetImplementation, /DELETE FROM workspace/);
  assert.match(action, /const user = await getCrossSignalUser\(\)/);
  assert.match(cockpit, /Reset exact FIXTURE trace for replay/);
});
