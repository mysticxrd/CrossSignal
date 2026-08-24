import { access, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { runChecked } from "../_lib/verify-kit.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const defaultPersistence = resolve(projectRoot, ".wrangler/state/v3");

function insideProject(path) {
  const relation = relative(projectRoot, path);
  return relation === "" || (!relation.startsWith(`..${sep}`) && relation !== "..");
}

function persistencePath(argv) {
  const index = argv.indexOf("--persist-to");
  if (index < 0) return defaultPersistence;
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error("--persist-to requires a repository-local directory.");
  }
  const path = resolve(projectRoot, value);
  if (!insideProject(path) || path === projectRoot) {
    throw new Error("Preparation persistence must stay inside the repository.");
  }
  return path;
}

function queryRows(stdout) {
  const payload = JSON.parse(stdout);
  if (!Array.isArray(payload)) throw new Error("Wrangler returned an unexpected D1 result.");
  return payload.flatMap((entry) => entry?.results ?? []);
}

async function main() {
  if (process.versions.node.split(".").map(Number)[0] < 22) {
    throw new Error("The reviewer release requires Node.js 22 or newer.");
  }
  if (process.argv.includes("--remote") || process.argv.includes("--preview")) {
    throw new Error("Ship preparation is local-only and never targets a remote database.");
  }

  const persistTo = persistencePath(process.argv.slice(2));
  const wrangler = resolve(projectRoot, "node_modules/wrangler/bin/wrangler.js");
  await access(wrangler);

  const configPath = resolve(projectRoot, `.wrangler-ship-prepare-${process.pid}.jsonc`);
  const config = {
    name: "crosssignal-ship-local",
    main: "worker/index.ts",
    compatibility_date: "2026-08-23",
    compatibility_flags: ["nodejs_compat"],
    d1_databases: [
      {
        binding: "DB",
        database_name: "crosssignal-data-verifier",
        database_id: "00000000-0000-0000-0000-000000000000",
        migrations_dir: "drizzle",
      },
    ],
  };

  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  try {
    const common = [
      wrangler,
      "--config",
      configPath,
      "--cwd",
      projectRoot,
    ];
    const migration = runChecked(
      "node",
      [
        ...common,
        "d1",
        "migrations",
        "apply",
        "DB",
        "--local",
        "--persist-to",
        persistTo,
      ],
      { cwd: projectRoot, timeout: 180_000 },
    );
    const inspection = runChecked(
      "node",
      [
        ...common,
        "d1",
        "execute",
        "DB",
        "--local",
        "--persist-to",
        persistTo,
        "--json",
        "--command",
        "SELECT COUNT(*) AS applied_migrations FROM d1_migrations; SELECT COUNT(*) AS reasoning_columns FROM pragma_table_info('reasoning_nodes') WHERE name IN ('logical_node_id','graph_version','execution_mode','handler_version','predecessor_outputs_json','lease_token','lease_expires_at','completion_token_hash'); SELECT COUNT(*) AS l06_runtime_triggers FROM sqlite_schema WHERE type = 'trigger' AND name LIKE 'trg_l06_%';",
      ],
      { cwd: projectRoot, timeout: 120_000 },
    );
    const rows = queryRows(inspection.stdout);
    const applied = Number(rows.find((row) => "applied_migrations" in row)?.applied_migrations);
    const columns = Number(rows.find((row) => "reasoning_columns" in row)?.reasoning_columns);
    const triggers = Number(rows.find((row) => "l06_runtime_triggers" in row)?.l06_runtime_triggers);
    if (applied !== 8 || columns !== 8 || triggers < 6) {
      throw new Error(
        `Cold database is incomplete (migrations=${applied}, reasoning_columns=${columns}, l06_triggers=${triggers}).`,
      );
    }
    process.stdout.write(
      `${JSON.stringify({
        status: "prepared",
        target: "local-d1",
        migrationsApplied: applied,
        reasoningColumns: columns,
        l06RuntimeTriggers: triggers,
        idempotentNoop: /No migrations to apply/i.test(migration.stdout),
        truthMode: "FIXTURE",
        effectMode: "TEST",
      })}\n`,
    );
  } finally {
    await rm(configPath, { force: true });
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
