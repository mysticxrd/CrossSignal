import {
  projectFlightTraceEvents,
  type PersistedTraceEventRow,
  type RedactedTraceEvent,
} from "./flight-recorder-contracts";
import { getD1, getDatabaseProvider } from ".";

export type TraceResolution = {
  workspaceRef: string;
  trace: {
    id: string;
    traceKey: string;
    state: string;
    truthMode: "LIVE" | "TEST" | "FIXTURE";
  };
  events: RedactedTraceEvent[];
};

export type TraceResolutionResult =
  | { kind: "found"; resolution: TraceResolution }
  | { kind: "not_found" }
  | { kind: "incomplete" };

type TraceResolutionRow = {
  id: string;
  workspace_id: string;
  trace_key: string;
  current_state: string;
  truth_mode: "LIVE" | "TEST" | "FIXTURE";
};

export type TraceResolutionInput = {
  userId: string;
  workspaceId: string;
  traceId: string;
};

type TraceResolver = (input: TraceResolutionInput) => Promise<TraceResolutionResult>;

let supabaseResolverForTest: TraceResolver | null = null;

export function installSupabaseTraceResolverForTest(resolver: TraceResolver | null): void {
  supabaseResolverForTest = resolver;
}

export async function resolveFlightTraceFromD1(
  input: TraceResolutionInput,
): Promise<TraceResolutionResult> {
  const d1 = getD1();
  const membership = await d1
    .prepare(`SELECT workspace_id FROM workspace_members
      WHERE workspace_id = ? AND user_id = ? AND role = 'owner'
      LIMIT 1`)
    .bind(input.workspaceId, input.userId)
    .first<{ workspace_id: string }>();
  if (!membership) {
    return { kind: "not_found" };
  }

  const trace = await d1
    .prepare(`SELECT id, workspace_id, trace_key, current_state, truth_mode
      FROM flight_traces
      WHERE workspace_id = ? AND id = ?
      LIMIT 1`)
    .bind(input.workspaceId, input.traceId)
    .first<TraceResolutionRow>();
  if (!trace) return { kind: "not_found" };

  const rows = await d1
    .prepare(`SELECT id, workspace_id AS workspaceId, trace_id AS traceId,
      sequence, event_type AS eventType, subject_type AS subjectType,
      subject_id AS subjectId, prior_state AS priorState,
      current_state AS currentState, actor_type AS actorType,
      actor_id AS actorId, payload_json AS payloadJson,
      payload_hash AS payloadHash, occurred_at AS occurredAt
      FROM flight_trace_events
      WHERE workspace_id = ? AND trace_id = ?
      ORDER BY sequence ASC`)
    .bind(input.workspaceId, input.traceId)
    .all<PersistedTraceEventRow>();

  if (rows.results.length === 0) return { kind: "incomplete" };
  try {
    const events = await projectFlightTraceEvents({
      workspaceId: input.workspaceId,
      traceId: input.traceId,
      rows: rows.results,
    });
    if (events.length !== rows.results.length) return { kind: "incomplete" };
    return {
      kind: "found",
      resolution: {
        workspaceRef: trace.workspace_id,
        trace: {
          id: trace.id,
          traceKey: trace.trace_key,
          state: trace.current_state,
          truthMode: trace.truth_mode,
        },
        events,
      },
    };
  } catch {
    return { kind: "incomplete" };
  }
}

export async function resolveFlightTrace(
  input: TraceResolutionInput,
): Promise<TraceResolutionResult> {
  const provider = getDatabaseProvider();
  if (provider === "d1") return resolveFlightTraceFromD1(input);

  if (supabaseResolverForTest) return supabaseResolverForTest(input);
  const { resolveFlightTraceFromSupabase } = await import("./supabase-trace-resolution");
  return resolveFlightTraceFromSupabase(input);
}
