import type { ChatGPTUser } from "./chatgpt-auth";
import type { TraceResolutionResult } from "../db/trace-resolution";

export const TRACE_RESOLUTION_SCHEMA_VERSION = "l14.trace-resolution.v1";
export const TRACE_RESOLUTION_CACHE_CONTROL = "private, no-store";

const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const RESPONSE_HEADERS = {
  "Cache-Control": TRACE_RESOLUTION_CACHE_CONTROL,
} as const;

export type TraceResolutionDependencies = {
  authenticate: () => Promise<ChatGPTUser | null>;
  resolve: (input: {
    userId: string;
    workspaceId: string;
    traceId: string;
  }) => Promise<TraceResolutionResult>;
};

type TraceResolutionContext = {
  params: Promise<{ workspaceId: string; traceId: string }>;
};

function errorResponse(
  status: 400 | 401 | 404 | 409 | 500,
  code:
    | "invalid_trace_request"
    | "authentication_required"
    | "trace_not_found"
    | "trace_projection_incomplete"
    | "trace_resolution_unavailable",
): Response {
  return Response.json({ error: { code } }, { status, headers: RESPONSE_HEADERS });
}

export async function handleTraceResolutionRequest(
  request: Request,
  context: TraceResolutionContext,
  dependencies: TraceResolutionDependencies,
): Promise<Response> {
  try {
    const user = await dependencies.authenticate();
    if (!user) return errorResponse(401, "authentication_required");

    const url = new URL(request.url);
    if (url.searchParams.size > 0) {
      return errorResponse(400, "invalid_trace_request");
    }

    const { workspaceId, traceId } = await context.params;
    if (!IDENTIFIER_PATTERN.test(workspaceId) || !IDENTIFIER_PATTERN.test(traceId)) {
      return errorResponse(400, "invalid_trace_request");
    }

    const result = await dependencies.resolve({
      userId: user.userId,
      workspaceId,
      traceId,
    });
    if (result.kind === "not_found") return errorResponse(404, "trace_not_found");
    if (result.kind === "incomplete") {
      return errorResponse(409, "trace_projection_incomplete");
    }

    const { resolution } = result;
    return Response.json(
      {
        schemaVersion: TRACE_RESOLUTION_SCHEMA_VERSION,
        workspaceRef: resolution.workspaceRef,
        trace: resolution.trace,
        eventCount: resolution.events.length,
        events: resolution.events,
        complete: true,
      },
      { headers: RESPONSE_HEADERS },
    );
  } catch {
    return errorResponse(500, "trace_resolution_unavailable");
  }
}
