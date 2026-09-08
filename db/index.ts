import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import * as flightRecorderSchema from "./flight-recorder-schema";

type CrossSignalRuntimeEnv = {
  DB?: D1Database;
  CFR_DATABASE_PROVIDER?: string;
  SUPABASE_DATABASE_URL?: string;
};

const runtimeEnv = env as unknown as CrossSignalRuntimeEnv;

export type DatabaseProvider = "d1" | "supabase";

export function getDatabaseProvider(): DatabaseProvider {
  const configured = runtimeEnv.CFR_DATABASE_PROVIDER?.trim().toLowerCase();
  if (!configured || configured === "d1") return "d1";
  if (configured === "supabase") return "supabase";
  throw new Error("Unsupported database provider configuration.");
}

export function getSupabaseDatabaseUrl(): string {
  const connectionString = runtimeEnv.SUPABASE_DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("Supabase database configuration is unavailable.");
  }

  let parsed: URL;
  try {
    parsed = new URL(connectionString);
  } catch {
    throw new Error("Supabase database configuration is invalid.");
  }
  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol)
    || parsed.port !== "6543"
    || !parsed.hostname.endsWith(".pooler.supabase.com")
  ) {
    throw new Error("Supabase database configuration must use the transaction pooler.");
  }
  return connectionString;
}

export function getD1() {
  if (!runtimeEnv.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return runtimeEnv.DB;
}

export function getDb() {
  return drizzle(getD1(), { schema: { ...schema, ...flightRecorderSchema } });
}
