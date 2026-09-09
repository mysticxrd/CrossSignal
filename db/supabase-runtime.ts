import type { FlightRecorderSnapshot } from "../app/flight-recorder-types";
import type { WorkspaceSummary } from "../app/workspace-types";
import { getSupabaseTraceFunctionConfig } from ".";

export type SupabaseRuntimeEventType =
  | "runtime.initialized"
  | "intent.replaced"
  | "authority.paused"
  | "authority.resumed"
  | "action.confirmed"
  | "action.failed"
  | "action.indeterminate"
  | "fixture.reset";

export type SupabaseRuntimeState = {
  version: number;
  snapshot: FlightRecorderSnapshot;
};

type GatewayResponse = Record<string, unknown>;

function isRecord(value: unknown): value is GatewayResponse {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isWorkspace(value: unknown): value is WorkspaceSummary {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.name === "string"
    && typeof value.slug === "string"
    && value.role === "owner";
}

function isSnapshot(value: unknown, workspaceId: string): value is FlightRecorderSnapshot {
  return isRecord(value)
    && value.workspaceId === workspaceId
    && value.truthMode === "FIXTURE"
    && typeof value.traceId === "string"
    && isRecord(value.intent)
    && typeof value.intent.version === "number"
    && Array.isArray(value.traceEvents)
    && Array.isArray(value.authorityControlHistory);
}

async function callGateway(
  body: Record<string, unknown>,
  fetcher: typeof fetch,
): Promise<{ status: number; payload: GatewayResponse }> {
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
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok && response.status !== 404 && response.status !== 409) {
    throw new Error("Supabase runtime request failed.");
  }
  const payload = await response.json();
  if (!isRecord(payload)) throw new Error("Supabase runtime returned an invalid response.");
  return { status: response.status, payload };
}

export function createSupabaseRuntimeGateway(fetcher: typeof fetch = fetch) {
  return {
    async listWorkspaces(userId: string): Promise<WorkspaceSummary[]> {
      const { payload } = await callGateway({ operation: "workspace.list", userId }, fetcher);
      if (payload.kind !== "found" || !Array.isArray(payload.workspaces) || !payload.workspaces.every(isWorkspace)) {
        throw new Error("Supabase workspace list is incomplete.");
      }
      return payload.workspaces;
    },

    async createWorkspace(input: {
      userId: string;
      workspace: { id: string; name: string; slug: string };
    }): Promise<WorkspaceSummary> {
      const { payload } = await callGateway({ operation: "workspace.create", ...input }, fetcher);
      if (payload.kind === "conflict") throw new Error("Workspace identifier already exists.");
      if (payload.kind !== "created" || !isWorkspace(payload.workspace)) {
        throw new Error("Supabase workspace creation is incomplete.");
      }
      return payload.workspace;
    },

    async canAccessWorkspace(userId: string, workspaceId: string): Promise<boolean> {
      const { status, payload } = await callGateway(
        { operation: "workspace.access", userId, workspaceId },
        fetcher,
      );
      if (status === 404 && payload.kind === "not_found") return false;
      if (payload.kind !== "allowed") throw new Error("Supabase workspace access check is incomplete.");
      return true;
    },

    async readRuntime(userId: string, workspaceId: string): Promise<SupabaseRuntimeState | null> {
      const { status, payload } = await callGateway(
        { operation: "runtime.get", userId, workspaceId },
        fetcher,
      );
      if (status === 404 || payload.kind === "not_found") throw new Error("Workspace access was denied.");
      if (payload.kind === "empty") return null;
      if (
        payload.kind !== "found"
        || !Number.isSafeInteger(payload.version)
        || Number(payload.version) < 1
        || !isSnapshot(payload.snapshot, workspaceId)
      ) throw new Error("Supabase runtime state is incomplete.");
      return { version: Number(payload.version), snapshot: payload.snapshot };
    },

    async writeRuntime(input: {
      userId: string;
      workspaceId: string;
      expectedVersion: number;
      eventType: SupabaseRuntimeEventType;
      snapshot: FlightRecorderSnapshot;
    }): Promise<SupabaseRuntimeState | { conflictVersion: number }> {
      const { status, payload } = await callGateway(
        { operation: "runtime.put", ...input },
        fetcher,
      );
      if (status === 404 || payload.kind === "not_found") throw new Error("Workspace access was denied.");
      if (status === 409 && payload.kind === "conflict" && Number.isSafeInteger(payload.version)) {
        return { conflictVersion: Number(payload.version) };
      }
      if (
        payload.kind !== "saved"
        || !Number.isSafeInteger(payload.version)
        || !isSnapshot(payload.snapshot, input.workspaceId)
      ) throw new Error("Supabase runtime write is incomplete.");
      return { version: Number(payload.version), snapshot: payload.snapshot };
    },
  };
}

export const supabaseRuntime = createSupabaseRuntimeGateway();
