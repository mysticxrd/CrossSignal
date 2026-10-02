import { pathToFileURL } from "node:url";
import {
  SUPABASE_TRACE_RESOLUTION_FIXTURE,
  validateSupabaseTraceResolutionFixture,
} from "../02_data/fixtures/supabase-trace-resolution.fixture.mjs";

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function literal(value, cast = "") {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number") return String(value);
  const text = typeof value === "object" ? stableStringify(value) : String(value);
  return `'${text.replaceAll("'", "''")}'${cast}`;
}

const TABLES = [
  {
    name: "workspaces",
    columns: ["id", "name", "slug", "owner_user_id", "created_at", "updated_at"],
  },
  {
    name: "workspace_members",
    columns: ["workspace_id", "user_id", "role", "joined_at"],
  },
  {
    name: "flight_traces",
    columns: [
      "id", "workspace_id", "trace_key", "fixture_key", "truth_mode",
      "current_state", "active_intent_id", "retention_class", "retention_until",
      "created_by", "created_at", "updated_at",
    ],
  },
  {
    name: "flight_trace_events",
    columns: [
      "id", "workspace_id", "trace_id", "sequence", "event_type", "subject_type",
      "subject_id", "prior_state", "current_state", "actor_type", "actor_id",
      "payload_json", "payload_hash", "idempotency_key", "occurred_at",
    ],
  },
];

export function generateSupabaseFixtureSql(fixture = SUPABASE_TRACE_RESOLUTION_FIXTURE) {
  const errors = validateSupabaseTraceResolutionFixture(fixture);
  if (errors.length > 0) throw new Error(`Supabase fixture is invalid: ${errors.join("; ")}`);

  const statements = [
    "-- FIXTURE data for the dedicated Company Flight Recorder TEST target.",
    `-- source_digest=${fixture.sourceDigest}`,
    `-- package_digest=${fixture.packageDigest}`,
    "begin;",
    "set constraints all deferred;",
  ];

  for (const table of TABLES) {
    for (const row of fixture.tables[table.name]) {
      const values = table.columns.map((column) =>
        literal(row[column], column === "payload_json" ? "::jsonb" : ""),
      );
      statements.push(
        `insert into cfr_app.${table.name} (${table.columns.join(", ")}) values (${values.join(", ")});`,
      );
    }
  }

  statements.push(
    "commit;",
    "select jsonb_build_object(",
    "  'workspaces', (select count(*) from cfr_app.workspaces),",
    "  'workspace_members', (select count(*) from cfr_app.workspace_members),",
    "  'flight_traces', (select count(*) from cfr_app.flight_traces),",
    "  'flight_trace_events', (select count(*) from cfr_app.flight_trace_events)",
    ") as fixture_counts;",
  );
  return `${statements.join("\n")}\n`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.stdout.write(generateSupabaseFixtureSql());
}
