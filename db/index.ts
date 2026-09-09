import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import * as flightRecorderSchema from "./flight-recorder-schema";

type CrossSignalRuntimeEnv = {
  DB?: D1Database;
  CFR_DATABASE_PROVIDER?: string;
  SUPABASE_TRACE_FUNCTION_TOKEN?: string;
  SUPABASE_TRACE_FUNCTION_URL?: string;
};

const runtimeEnv = env as unknown as CrossSignalRuntimeEnv;

export type DatabaseProvider = "d1" | "supabase";

export function getDatabaseProvider(): DatabaseProvider {
  const configured = runtimeEnv.CFR_DATABASE_PROVIDER?.trim().toLowerCase();
  if (!configured || configured === "d1") return "d1";
  if (configured === "supabase") return "supabase";
  throw new Error("Unsupported database provider configuration.");
}

export function getSupabaseTraceFunctionConfig(): { token: string; url: string } {
  const rawUrl = runtimeEnv.SUPABASE_TRACE_FUNCTION_URL?.trim();
  const token = runtimeEnv.SUPABASE_TRACE_FUNCTION_TOKEN?.trim();
  if (!rawUrl || !token) throw new Error("Supabase trace function configuration is unavailable.");

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Supabase trace function configuration is invalid.");
  }
  if (
    url.protocol !== "https:"
    || !/^[a-z0-9]{20}\.supabase\.co$/.test(url.hostname)
    || url.pathname !== "/functions/v1/cfr-trace-reader"
    || url.search
    || url.hash
    || url.username
    || url.password
    || token.length < 64
  ) {
    throw new Error("Supabase trace function configuration is invalid.");
  }
  return { token, url: url.toString() };
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
