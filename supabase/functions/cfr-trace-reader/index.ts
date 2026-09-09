import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import postgres from "npm:postgres@3.4.9";

type TraceRequest = { userId: string; workspaceId: string; traceId: string };

const databaseUrl = Deno.env.get("SUPABASE_DB_URL");
if (!databaseUrl) throw new Error("SUPABASE_DB_URL is unavailable.");

const sql = postgres(databaseUrl, {
  connect_timeout: 10,
  fetch_types: false,
  idle_timeout: 10,
  max: 1,
  prepare: false,
});

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function validIdentifier(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function equalHash(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ error: { code: "method_not_allowed" } }, 405);

  const suppliedToken = request.headers.get("x-cfr-preview-token") ?? "";
  const [storedToken] = await sql<{ token_sha256: string }[]>`
    select token_sha256
    from cfr_app.runtime_tokens
    where name = 'sites-test-preview' and enabled = true
    limit 1
  `;
  if (!storedToken || !equalHash(await sha256(suppliedToken), storedToken.token_sha256)) {
    return json({ error: { code: "unauthorized" } }, 401);
  }

  let input: TraceRequest;
  try {
    const value = await request.json();
    if (
      !value
      || typeof value !== "object"
      || !validIdentifier((value as Record<string, unknown>).userId)
      || !validIdentifier((value as Record<string, unknown>).workspaceId)
      || !validIdentifier((value as Record<string, unknown>).traceId)
    ) return json({ error: { code: "invalid_request" } }, 400);
    input = value as TraceRequest;
  } catch {
    return json({ error: { code: "invalid_request" } }, 400);
  }

  try {
    const result = await sql.begin(async (transaction) => {
      await transaction`set transaction read only`;
      await transaction.unsafe("set local role cfr_trace_reader");
      await transaction`
        select
          set_config('app.current_user_id', ${input.userId}, true),
          set_config('app.current_workspace_id', ${input.workspaceId}, true)
      `;

      const [membership] = await transaction`
        select workspace_id
        from cfr_app.workspace_members
        where workspace_id = ${input.workspaceId}
          and user_id = ${input.userId}
          and role = 'owner'
        limit 1
      `;
      if (!membership) return { kind: "not_found" as const };

      const [trace] = await transaction`
        select
          id,
          workspace_id as "workspaceId",
          trace_key as "traceKey",
          current_state as "currentState",
          truth_mode as "truthMode"
        from cfr_app.flight_traces
        where workspace_id = ${input.workspaceId} and id = ${input.traceId}
        limit 1
      `;
      if (!trace) return { kind: "not_found" as const };

      const events = await transaction`
        select
          id,
          workspace_id as "workspaceId",
          trace_id as "traceId",
          sequence::int as sequence,
          event_type as "eventType",
          subject_type as "subjectType",
          subject_id as "subjectId",
          prior_state as "priorState",
          current_state as "currentState",
          actor_type as "actorType",
          actor_id as "actorId",
          payload_json as "payloadJson",
          payload_hash as "payloadHash",
          occurred_at as "occurredAt"
        from cfr_app.flight_trace_events
        where workspace_id = ${input.workspaceId} and trace_id = ${input.traceId}
        order by sequence asc
      `;
      if (events.length === 0) return { kind: "incomplete" as const };
      return { kind: "found" as const, trace, events };
    });
    return json(result, result.kind === "not_found" ? 404 : result.kind === "incomplete" ? 409 : 200);
  } catch {
    return json({ error: { code: "trace_resolution_unavailable" } }, 500);
  }
});
