import { getStrictCrossSignalUser } from "../../../../../crosssignal-auth";
import { handleTraceResolutionRequest } from "../../../../../trace-resolution";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ workspaceId: string; traceId: string }> },
): Promise<Response> {
  return handleTraceResolutionRequest(request, context, {
    authenticate: getStrictCrossSignalUser,
    resolve: async (input) => {
      const { resolveFlightTrace } = await import(
        "../../../../../../db/trace-resolution"
      );
      return resolveFlightTrace(input);
    },
  });
}
