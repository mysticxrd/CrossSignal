import { spawnSync } from "node:child_process";
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
const requiredObjects = new Set([
  "workspaces",
  "flight_traces",
  "action_intents",
  "approval_grants",
  "effect_attempts",
  "outcome_assessments",
  "trg_action_intents_canonical_binding",
  "trg_effect_attempt_events_transition",
]);
const preflight = spawnSync(
  process.execPath,
  [
    wrangler,
    "d1",
    "execute",
    ...sharedArgs,
    "--json",
    "--command",
    "SELECT name FROM sqlite_master WHERE name IN (" +
      [...requiredObjects].map((name) => "'" + name + "'").join(",") +
      ") ORDER BY name",
  ],
  {
    cwd: root,
    env: environment,
    encoding: "utf8",
  },
);

if (preflight.status === 0) {
  const result = JSON.parse(preflight.stdout);
  const found = new Set(result[0]?.results?.map(({ name }) => name) ?? []);
  if ([...requiredObjects].every((name) => found.has(name))) {
    console.log(
      "Local D1 release schema is ready; all required tables and guards exist.",
    );
    process.exit(0);
  }
}

const result = spawnSync(
  process.execPath,
  [
    wrangler,
    "d1",
    "migrations",
    "apply",
    ...sharedArgs,
  ],
  {
    cwd: root,
    env: environment,
    stdio: "inherit",
  },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
