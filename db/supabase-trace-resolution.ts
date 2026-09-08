import { and, asc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  projectFlightTraceEvents,
  stableStringify,
  type PersistedTraceEventRow,
} from "./flight-recorder-contracts";
import { getSupabaseDatabaseUrl } from ".";
import {
  postgresFlightTraceEvents,
  postgresFlightTraces,
  postgresWorkspaceMembers,
} from "./postgres-trace-schema";
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

type CachedReader = {
  connectionString: string;
  reader: SupabaseTraceReader;
};

let cachedReader: CachedReader | null = null;

function productionReader(connectionString: string): SupabaseTraceReader {
  const client = postgres(connectionString, {
    connect_timeout: 10,
    fetch_types: false,
    idle_timeout: 20,
    max: 1,
    prepare: false,
    ssl: "require",
  });
  const database = drizzle(client, {
    schema: {
      postgresFlightTraceEvents,
      postgresFlightTraces,
      postgresWorkspaceMembers,
    },
  });

  return {
    async readOnly(context, callback) {
      return database.transaction(async (transaction) => {
        await transaction.execute(sql`set transaction read only`);
        await transaction.execute(sql`
          select
            set_config('app.current_user_id', ${context.userId}, true),
            set_config('app.current_workspace_id', ${context.workspaceId}, true)
        `);

        const session: SupabaseTraceReadSession = {
          async hasOwnerMembership(input) {
            const [membership] = await transaction
              .select({ workspaceId: postgresWorkspaceMembers.workspaceId })
              .from(postgresWorkspaceMembers)
              .where(and(
                eq(postgresWorkspaceMembers.workspaceId, input.workspaceId),
                eq(postgresWorkspaceMembers.userId, input.userId),
                eq(postgresWorkspaceMembers.role, "owner"),
              ))
              .limit(1);
            return Boolean(membership);
          },
          async findTrace(input) {
            const [trace] = await transaction
              .select({
                id: postgresFlightTraces.id,
                workspaceId: postgresFlightTraces.workspaceId,
                traceKey: postgresFlightTraces.traceKey,
                currentState: postgresFlightTraces.currentState,
                truthMode: postgresFlightTraces.truthMode,
              })
              .from(postgresFlightTraces)
              .where(and(
                eq(postgresFlightTraces.workspaceId, input.workspaceId),
                eq(postgresFlightTraces.id, input.traceId),
              ))
              .limit(1);
            return trace ?? null;
          },
          async listEvents(input) {
            return transaction
              .select({
                id: postgresFlightTraceEvents.id,
                workspaceId: postgresFlightTraceEvents.workspaceId,
                traceId: postgresFlightTraceEvents.traceId,
                sequence: postgresFlightTraceEvents.sequence,
                eventType: postgresFlightTraceEvents.eventType,
                subjectType: postgresFlightTraceEvents.subjectType,
                subjectId: postgresFlightTraceEvents.subjectId,
                priorState: postgresFlightTraceEvents.priorState,
                currentState: postgresFlightTraceEvents.currentState,
                actorType: postgresFlightTraceEvents.actorType,
                actorId: postgresFlightTraceEvents.actorId,
                payloadJson: postgresFlightTraceEvents.payloadJson,
                payloadHash: postgresFlightTraceEvents.payloadHash,
                occurredAt: postgresFlightTraceEvents.occurredAt,
              })
              .from(postgresFlightTraceEvents)
              .where(and(
                eq(postgresFlightTraceEvents.workspaceId, input.workspaceId),
                eq(postgresFlightTraceEvents.traceId, input.traceId),
              ))
              .orderBy(asc(postgresFlightTraceEvents.sequence));
          },
        };
        return callback(session);
      });
    },
  };
}

function getSupabaseTraceReader(): SupabaseTraceReader {
  const connectionString = getSupabaseDatabaseUrl();
  if (!cachedReader || cachedReader.connectionString !== connectionString) {
    cachedReader = { connectionString, reader: productionReader(connectionString) };
  }
  return cachedReader.reader;
}

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

      const rawRows = await session.listEvents(input);
      if (rawRows.length === 0 || !isTruthMode(trace.truthMode)) return { kind: "incomplete" };

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
    },
  );
}

export function resolveFlightTraceFromSupabase(input: {
  userId: string;
  workspaceId: string;
  traceId: string;
}): Promise<TraceResolutionResult> {
  return resolveFlightTraceWithSupabaseReader(input, getSupabaseTraceReader());
}
