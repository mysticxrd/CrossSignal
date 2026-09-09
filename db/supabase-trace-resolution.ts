import {
  projectFlightTraceEvents,
  stableStringify,
  type PersistedTraceEventRow,
} from "./flight-recorder-contracts";
import { getSupabaseTraceFunctionConfig } from ".";
import type { TraceResolutionResult } from "./trace-resolution";

type SupabaseTraceRow = {
  id: string;
  workspaceId: string;
  traceKey: string;
  currentState: string;
  truthMode: string;
};

type SupabaseEventRow = Omit<PersistedTraceEventRow, "payloadJson" | "occurredAt"> & {
  payloadJson: unknown;
  occurredAt: Date | string;
};

export type SupabaseTraceReadSession = {
  hasOwnerMembership(input: { userId: string; workspaceId: string }): Promise<boolean>;
  findTrace(input: { workspaceId: string; traceId: string }): Promise<SupabaseTraceRow | null>;
  listEvents(input: { workspaceId: string; traceId: string }): Promise<SupabaseEventRow[]>;
};

export type SupabaseTraceReader = {
  readOnly<T>(
    context: { userId: string; workspaceId: string },
    callback: (session: SupabaseTraceReadSession) => Promise<T>,
  ): Promise<T>;
};

function normalizeEventRow(row: SupabaseEventRow): PersistedTraceEventRow {
  const occurredAt = row.occurredAt instanceof Date
    ? row.occurredAt.toISOString()
    : new Date(row.occurredAt).toISOString();
  const payload = typeof row.payloadJson === "string"
    ? JSON.parse(row.payloadJson)
    : row.payloadJson;
  return {
    ...row,
    occurredAt,
    payloadJson: stableStringify(payload),
  } as PersistedTraceEventRow;
}

type SupabaseTraceFunctionResponse =
  | { kind: "not_found" }
  | { kind: "incomplete" }
  | { kind: "found"; trace: SupabaseTraceRow; events: SupabaseEventRow[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseFunctionResponse(value: unknown): SupabaseTraceFunctionResponse {
  if (!isRecord(value) || typeof value.kind !== "string") {
    throw new Error("Supabase trace function returned an invalid response.");
  }
  if (value.kind === "not_found" || value.kind === "incomplete") return { kind: value.kind };
  if (value.kind !== "found" || !isRecord(value.trace) || !Array.isArray(value.events)) {
    throw new Error("Supabase trace function returned an invalid response.");
  }
  const trace = value.trace;
  for (const key of ["id", "workspaceId", "traceKey", "currentState", "truthMode"] as const) {
    if (typeof trace[key] !== "string") {
      throw new Error("Supabase trace function returned an invalid response.");
    }
  }
  return {
    kind: "found",
    trace: trace as SupabaseTraceRow,
    events: value.events as SupabaseEventRow[],
  };
}

async function projectSnapshot(
  input: { userId: string; workspaceId: string; traceId: string },
  trace: SupabaseTraceRow,
  rawRows: SupabaseEventRow[],
): Promise<TraceResolutionResult> {
  if (
    trace.id !== input.traceId
    || trace.workspaceId !== input.workspaceId
    || rawRows.length === 0
    || !isTruthMode(trace.truthMode)
  ) return { kind: "incomplete" };

  try {
    const rows = rawRows.map(normalizeEventRow);
    const events = await projectFlightTraceEvents({
      workspaceId: input.workspaceId,
      traceId: input.traceId,
      rows,
    });
    if (events.length !== rows.length) return { kind: "incomplete" };
    return {
      kind: "found",
      resolution: {
        workspaceRef: trace.workspaceId,
        trace: {
          id: trace.id,
          traceKey: trace.traceKey,
          state: trace.currentState,
          truthMode: trace.truthMode,
        },
        events,
      },
    };
  } catch {
    return { kind: "incomplete" };
  }
}

function isTruthMode(value: string): value is "LIVE" | "TEST" | "FIXTURE" {
  return value === "LIVE" || value === "TEST" || value === "FIXTURE";
}

export async function resolveFlightTraceWithSupabaseReader(
  input: { userId: string; workspaceId: string; traceId: string },
  reader: SupabaseTraceReader,
): Promise<TraceResolutionResult> {
  return reader.readOnly(
    { userId: input.userId, workspaceId: input.workspaceId },
    async (session) => {
      if (!await session.hasOwnerMembership(input)) return { kind: "not_found" };

      const trace = await session.findTrace(input);
      if (!trace) return { kind: "not_found" };

      return projectSnapshot(input, trace, await session.listEvents(input));
    },
  );
}

export async function resolveFlightTraceWithSupabaseFunction(
  input: { userId: string; workspaceId: string; traceId: string },
  fetcher: typeof fetch = fetch,
): Promise<TraceResolutionResult> {
  const config = getSupabaseTraceFunctionConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  let response: Response;
  try {
    response = await fetcher(config.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-cfr-preview-token": config.token,
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok && response.status !== 404 && response.status !== 409) {
    throw new Error("Supabase trace function request failed.");
  }
  const payload = parseFunctionResponse(await response.json());
  if (payload.kind !== "found") return payload;
  return projectSnapshot(input, payload.trace, payload.events);
}

export function resolveFlightTraceFromSupabase(input: {
  userId: string;
  workspaceId: string;
  traceId: string;
}): Promise<TraceResolutionResult> {
  return resolveFlightTraceWithSupabaseFunction(input);
}
