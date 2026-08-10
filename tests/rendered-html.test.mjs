import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

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

test("ships durable workspace and case-ledger migrations", async () => {
  const [hosting, workspaceMigration, caseMigration, schema, caseStore] = await Promise.all([
    readFile(new URL(".openai/hosting.json", projectRoot), "utf8"),
    readFile(new URL("drizzle/0000_dry_chat.sql", projectRoot), "utf8"),
    readFile(new URL("drizzle/0001_gigantic_shriek.sql", projectRoot), "utf8"),
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
  assert.match(caseMigration, /PRAGMA optimize/);
  assert.match(schema, /primaryKey\(\{ columns: \[table\.workspaceId, table\.userId\] \}\)/);
  assert.match(caseStore, /ownerCanAccessWorkspace\(userId, workspaceId\)/);
  assert.match(caseStore, /INSERT OR IGNORE INTO approvals/);
  assert.match(caseStore, /INSERT OR IGNORE INTO case_events/);
  assert.match(caseStore, /idempotencyKey/);
  assert.doesNotMatch(caseStore, /localStorage|sessionStorage/);
});

test("packages the authenticated release and removes starter infrastructure", async () => {
  const [page, layout, packageJson, builtHosting] = await Promise.all([
    readFile(new URL("app/page.tsx", projectRoot), "utf8"),
    readFile(new URL("app/layout.tsx", projectRoot), "utf8"),
    readFile(new URL("package.json", projectRoot), "utf8"),
    readFile(new URL("dist/.openai/hosting.json", projectRoot), "utf8"),
    access(new URL("dist/server/index.js", projectRoot)),
    access(new URL("dist/.openai/drizzle/0000_dry_chat.sql", projectRoot)),
    access(new URL("dist/.openai/drizzle/0001_gigantic_shriek.sql", projectRoot)),
  ]);

  assert.match(page, /WorkspaceOnboarding/);
  assert.match(page, /CrossSignalApp/);
  assert.match(layout, /Revenue Flight Recorder/);
  assert.equal(JSON.parse(builtHosting).d1, "DB");
  assert.doesNotMatch(page, /_sites-preview|SkeletonPreview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("app/_sites-preview", projectRoot)));
});
