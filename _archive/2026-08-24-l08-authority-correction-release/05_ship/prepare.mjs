import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const wrangler = join(root, "node_modules/wrangler/bin/wrangler.js");
const sharedArgs = [
  "DB",
  "--local",
  "--persist-to",
  ".wrangler/state",
  "--config",
  "factory/02_data/wrangler.verify.jsonc",
];
const environment = {
  ...process.env,
  WRANGLER_WRITE_LOGS: "false",
  WRANGLER_LOG_PATH: join(root, ".wrangler/logs"),
  MINIFLARE_REGISTRY_PATH: join(root, ".wrangler/registry"),
};
const compatibilitySource = readFileSync(join(root, "db/migrations.ts"), "utf8");
const compatibilityList = compatibilitySource.slice(
  compatibilitySource.indexOf("const REQUIRED_SCHEMA_OBJECTS = ["),
  compatibilitySource.indexOf("] as const;"),
);
const requiredObjects = new Set([...compatibilityList.matchAll(/^\s*"([^"]+)",$/gm)].map((match) => match[1]));
const l08Objects = new Set([
  "idx_flight_traces_workspace_active_intent",
  "idx_action_intents_one_successor",
  "trg_flight_traces_active_intent_transition",
  "trg_policy_decisions_activate_intent",
  "trg_flight_traces_required_active_intent",
  "trg_approval_grants_bind_active_intent",
  "trg_effect_attempts_bind_active_intent",
  "trg_flight_trace_events_executing_projection",
]);
const baseObjects = new Set([...requiredObjects].filter((name) => !l08Objects.has(name)));
const requiredMarkers = new Set([
  ...requiredObjects,
  "flight_traces.active_intent_id",
  "action_intents.supersedes_intent_id",
]);
const priorMigrations = [
  "0000_dry_chat.sql",
  "0001_gigantic_shriek.sql",
  "0002_funny_madripoor.sql",
  "0003_faithful_guardsmen.sql",
  "0004_typical_omega_red.sql",
  "0005_flight_recorder_guards.sql",
];

function executeJson(sql) {
  const result = spawnSync(
    process.execPath,
    [wrangler, "d1", "execute", ...sharedArgs, "--json", "--command", sql],
    { cwd: root, env: environment, encoding: "utf8" },
  );
  if (result.status !== 0) return null;
  try {
    return JSON.parse(result.stdout)[0]?.results ?? [];
  } catch {
    return null;
  }
}

function hasObjects(expected) {
  const objectList = [...expected].map((name) => `'${name}'`).join(",");
  const rows = executeJson(`SELECT name FROM sqlite_master WHERE name IN (${objectList}) ORDER BY name`);
  const found = new Set(rows?.map(({ name }) => name) ?? []);
  return [...expected].every((name) => found.has(name));
}

function preflight() {
  if (!hasObjects(requiredObjects)) return false;
  const columns = executeJson([
    "SELECT 'flight_traces.active_intent_id' AS name FROM pragma_table_info('flight_traces') WHERE name = 'active_intent_id'",
    "UNION ALL SELECT 'action_intents.supersedes_intent_id' FROM pragma_table_info('action_intents') WHERE name = 'supersedes_intent_id'",
  ].join(" "));
  const found = new Set(columns?.map(({ name }) => name) ?? []);
  return [...requiredMarkers].every((name) => requiredObjects.has(name) || found.has(name));
}

if (preflight()) {
  console.log("Local D1 release schema is ready through migration 0006; all L08 columns, indexes, and guards exist.");
  process.exit(0);
}

const migrationLedger = executeJson("SELECT name FROM d1_migrations ORDER BY id");
if (migrationLedger?.length === 0) {
  if (!hasObjects(baseObjects)) {
    throw new Error("Local D1 has an empty migration ledger and does not match the complete 0005 baseline; refusing to guess or delete local data.");
  }
  const values = priorMigrations.map((name) => `('${name}')`).join(",");
  const baseline = executeJson(`INSERT INTO d1_migrations (name) VALUES ${values} RETURNING name`);
  if (baseline?.length !== priorMigrations.length) {
    throw new Error("Could not baseline the verified legacy local schema through migration 0005.");
  }
  console.log("Verified the complete legacy local schema and recorded its 0000-0005 migration baseline without deleting data.");
}

const migration = spawnSync(
  process.execPath,
  [wrangler, "d1", "migrations", "apply", ...sharedArgs],
  { cwd: root, env: environment, stdio: "inherit" },
);
if (migration.error) throw migration.error;
if (migration.status !== 0) process.exit(migration.status ?? 1);
if (!preflight()) throw new Error("Local D1 release schema remains incomplete after migrations; expected migration 0006 L08 authority guards.");
console.log("Local D1 release schema prepared and verified through migration 0006.");
