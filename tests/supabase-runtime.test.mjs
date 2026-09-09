import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return { url: "cfr-runtime-test:cloudflare-workers", shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === "cfr-runtime-test:cloudflare-workers") {
      return {
        format: "module",
        source: "export const env = (globalThis.__cfrRuntimeEnv ??= {});",
        shortCircuit: true,
      };
    }
    return nextLoad(url, context);
  },
});

const runtimeEnv = (globalThis.__cfrRuntimeEnv ??= {});
const { createSupabaseRuntimeGateway } = await import("../db/supabase-runtime.ts");
const {
  authorizeAndExecuteSupabase,
  getOrCreateSupabaseFlightRecorderSnapshot,
  installSupabaseRuntimeGatewayForTest,
  readSupabaseFlightRecorderSnapshot,
  replaceSupabasePendingIntent,
  resetSupabaseFlightRecorderFixture,
  setSupabaseWorkspaceKillSwitch,
} = await import("../db/supabase-flight-recorder.ts");

function reset() {
  delete runtimeEnv.SUPABASE_TRACE_FUNCTION_TOKEN;
  delete runtimeEnv.SUPABASE_TRACE_FUNCTION_URL;
  installSupabaseRuntimeGatewayForTest(null);
}

function memoryGateway(ownerId, workspaceId) {
  const states = new Map();
  const events = [];
  const assertOwner = (userId, candidateWorkspaceId) => {
    if (userId !== ownerId || candidateWorkspaceId !== workspaceId) {
      throw new Error("Workspace access was denied.");
    }
  };
  return {
    events,
    gateway: {
      async listWorkspaces(userId) {
        return userId === ownerId ? [{ id: workspaceId, name: "Owner workspace", slug: "owner-workspace", role: "owner" }] : [];
      },
      async createWorkspace() {
        throw new Error("unused");
      },
      async canAccessWorkspace(userId, candidateWorkspaceId) {
        return userId === ownerId && candidateWorkspaceId === workspaceId;
      },
      async readRuntime(userId, candidateWorkspaceId) {
        assertOwner(userId, candidateWorkspaceId);
        return states.has(candidateWorkspaceId) ? structuredClone(states.get(candidateWorkspaceId)) : null;
      },
      async writeRuntime(input) {
        assertOwner(input.userId, input.workspaceId);
        const current = states.get(input.workspaceId);
        const version = current?.version ?? 0;
        if (version !== input.expectedVersion) return { conflictVersion: version };
        const saved = { version: version + 1, snapshot: structuredClone(input.snapshot) };
        states.set(input.workspaceId, saved);
        events.push({ eventType: input.eventType, version: saved.version });
        return structuredClone(saved);
      },
    },
  };
}

test("runtime gateway uses the private function contract and preserves tenant-safe responses", async () => {
  reset();
  runtimeEnv.SUPABASE_TRACE_FUNCTION_TOKEN = "t".repeat(64);
  runtimeEnv.SUPABASE_TRACE_FUNCTION_URL =
    "https://abcdefghijklmnopqrst.supabase.co/functions/v1/cfr-trace-reader";
  const requests = [];
  const gateway = createSupabaseRuntimeGateway(async (url, init) => {
    const body = JSON.parse(init.body);
    requests.push({ url, init, body });
    if (body.operation === "workspace.list") {
      return Response.json({
        kind: "found",
        workspaces: [{ id: "workspace-a", name: "A", slug: "a", role: "owner" }],
      });
    }
    if (body.operation === "workspace.access") {
      return Response.json({ kind: "not_found" }, { status: 404 });
    }
    return Response.json({ kind: "conflict", version: 3 }, { status: 409 });
  });

  assert.equal((await gateway.listWorkspaces("owner-a")).length, 1);
  assert.equal(await gateway.canAccessWorkspace("owner-a", "workspace-b"), false);
  const conflict = await gateway.writeRuntime({
    userId: "owner-a",
    workspaceId: "workspace-a",
    expectedVersion: 2,
    eventType: "intent.replaced",
    snapshot: {
      workspaceId: "workspace-a",
      truthMode: "FIXTURE",
      traceId: "trace-a",
      intent: { version: 1 },
      traceEvents: [],
      authorityControlHistory: [],
    },
  });
  assert.deepEqual(conflict, { conflictVersion: 3 });
  assert.equal(requests.length, 3);
  assert.ok(requests.every(({ init }) => init.headers["x-cfr-preview-token"] === "t".repeat(64)));
  reset();
});

test("Supabase snapshot supports initialize, edit, reload, authority, execution, and reset", async () => {
  reset();
  const ownerId = "runtime-owner-a";
  const workspaceId = "runtime-workspace-a";
  const harness = memoryGateway(ownerId, workspaceId);
  installSupabaseRuntimeGatewayForTest(harness.gateway);

  const initial = await getOrCreateSupabaseFlightRecorderSnapshot(ownerId, workspaceId);
  assert.equal(initial.intent.version, 1);
  assert.equal(initial.traceState, "awaiting_approval");

  const edited = await replaceSupabasePendingIntent({
    userId: ownerId,
    workspaceId,
    recipients: ["owner@example.test"],
    subject: "Persist this TEST proposal",
    body: "This content must survive a complete page reload.",
  });
  assert.equal(edited.intent.version, 2);
  assert.equal(edited.intent.subject, "Persist this TEST proposal");
  const reloaded = await readSupabaseFlightRecorderSnapshot(ownerId, workspaceId);
  assert.equal(reloaded.intent.subject, "Persist this TEST proposal");
  assert.equal(reloaded.intent.body, "This content must survive a complete page reload.");

  const paused = await setSupabaseWorkspaceKillSwitch({ userId: ownerId, workspaceId, engaged: true });
  assert.equal(paused.killSwitchEngaged, true);
  assert.equal(paused.authorityControlHistory.length, 2);
  await assert.rejects(
    () => authorizeAndExecuteSupabase({ userId: ownerId, workspaceId, scenario: "confirmed" }),
    /kill switch is engaged/,
  );
  await setSupabaseWorkspaceKillSwitch({ userId: ownerId, workspaceId, engaged: false });

  const executed = await authorizeAndExecuteSupabase({ userId: ownerId, workspaceId, scenario: "confirmed" });
  assert.equal(executed.traceState, "assessed");
  assert.equal(executed.execution?.state, "confirmed");
  assert.equal(executed.outcome?.assessmentLabel, "correlated");

  const resetSnapshot = await resetSupabaseFlightRecorderFixture(ownerId, workspaceId);
  assert.equal(resetSnapshot.traceState, "awaiting_approval");
  assert.equal(resetSnapshot.execution, null);
  assert.equal(resetSnapshot.killSwitchEngaged, false);
  assert.deepEqual(
    harness.events.map((event) => event.eventType),
    ["runtime.initialized", "intent.replaced", "authority.paused", "authority.resumed", "action.confirmed", "fixture.reset"],
  );
  assert.equal(JSON.stringify(resetSnapshot).includes(ownerId), false);
  await assert.rejects(
    () => readSupabaseFlightRecorderSnapshot(ownerId, "runtime-workspace-b"),
    /access was denied/,
  );
  reset();
});
