import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

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
