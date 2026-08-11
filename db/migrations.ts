import { getD1 } from ".";

const REQUIRED_SCHEMA_OBJECTS = [
  "users",
  "workspaces",
  "workspace_members",
  "cases",
  "case_events",
  "approvals",
  "evidence_observations",
  "case_evidence",
  "idx_cases_workspace_id",
  "idx_evidence_observations_workspace_id",
  "trg_evidence_observations_immutable",
] as const;

let compatibilityReady: Promise<void> | null = null;

async function verifyCheckedInMigrations(): Promise<void> {
  const d1 = getD1();

  await d1.prepare("PRAGMA foreign_keys = ON").run();
  const foreignKeys = await d1
    .prepare("PRAGMA foreign_keys")
    .first<{ foreign_keys: number }>();
  if (Number(foreignKeys?.foreign_keys) !== 1) {
    throw new Error("D1 foreign-key enforcement is unavailable.");
  }

  const placeholders = REQUIRED_SCHEMA_OBJECTS.map(() => "?").join(", ");
  const result = await d1
    .prepare(
      `SELECT name FROM sqlite_schema
        WHERE name IN (${placeholders})`,
    )
    .bind(...REQUIRED_SCHEMA_OBJECTS)
    .all<{ name: string }>();
  const present = new Set(result.results.map((row) => row.name));
  const missing = REQUIRED_SCHEMA_OBJECTS.filter((name) => !present.has(name));

  if (missing.length > 0) {
    throw new Error(
      `Database schema is not ready. Apply the checked-in Drizzle migrations; missing: ${missing.join(", ")}.`,
    );
  }
}

export function ensureDatabaseCompatibility(): Promise<void> {
  compatibilityReady ??= verifyCheckedInMigrations().catch((error) => {
    compatibilityReady = null;
    throw error;
  });
  return compatibilityReady;
}
