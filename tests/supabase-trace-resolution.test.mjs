import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return { url: "cfr-supabase-test:cloudflare-workers", shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === "cfr-supabase-test:cloudflare-workers") {
      return {
        format: "module",
        source: "export const env = (globalThis.__cfrCloudflareEnv ??= {});",
        shortCircuit: true,
      };
    }
    return nextLoad(url, context);
  },
});

const runtimeEnv = (globalThis.__cfrCloudflareEnv ??= {});
const {
  getDatabaseProvider,
  getSupabaseTraceFunctionConfig,
} = await import("../db/index.ts");
const {
  installSupabaseTraceResolverForTest,
  resolveFlightTrace,
} = await import("../db/trace-resolution.ts");
const {
  resolveFlightTraceWithSupabaseFunction,
  resolveFlightTraceWithSupabaseReader,
} = await import("../db/supabase-trace-resolution.ts");
const {
  handleTraceResolutionRequest,
} = await import("../app/trace-resolution.ts");
const {
  SUPABASE_TRACE_RESOLUTION_FIXTURE,
} = await import("../factory/02_data/fixtures/supabase-trace-resolution.fixture.mjs");
const {
  L14_TRACE_RESOLUTION_FIXTURE,
} = await import("../factory/02_data/fixtures/l14-trace-resolution.fixture.mjs");
const {
  generateSupabaseFixtureSql,
} = await import("../factory/03_build/generate-supabase-fixture-sql.mjs");

function resetRuntimeEnv() {
  delete runtimeEnv.CFR_DATABASE_PROVIDER;
  delete runtimeEnv.SUPABASE_TRACE_FUNCTION_TOKEN;
  delete runtimeEnv.SUPABASE_TRACE_FUNCTION_URL;
  delete runtimeEnv.DB;
  installSupabaseTraceResolverForTest(null);
}

function rowsFor(workspaceId, traceId) {
  return SUPABASE_TRACE_RESOLUTION_FIXTURE.tables.flight_trace_events
    .filter((row) => row.workspace_id === workspaceId && row.trace_id === traceId)
    .map((row) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      traceId: row.trace_id,
      sequence: row.sequence,
      eventType: row.event_type,
      subjectType: row.subject_type,
      subjectId: row.subject_id,
      priorState: row.prior_state,
      currentState: row.current_state,
      actorType: row.actor_type,
      actorId: row.actor_id,
      payloadJson: row.payload_json,
      payloadHash: row.payload_hash,
      occurredAt: new Date(row.occurred_at),
    }));
}

function fixtureReader({ membership = true, trace = true, rows } = {}) {
  const calls = [];
  return {
    calls,
    reader: {
      async readOnly(context, callback) {
        calls.push(["readOnly", context]);
        return callback({
          async hasOwnerMembership(input) {
            calls.push(["membership", input]);
            return membership;
          },
          async findTrace(input) {
            calls.push(["trace", input]);
            if (!trace) return null;
            const source = SUPABASE_TRACE_RESOLUTION_FIXTURE.tables.flight_traces
              .find((item) => item.workspace_id === input.workspaceId && item.id === input.traceId);
            return source ? {
              id: source.id,
              workspaceId: source.workspace_id,
              traceKey: source.trace_key,
              currentState: source.current_state,
              truthMode: source.truth_mode,
            } : null;
          },
          async listEvents(input) {
            calls.push(["events", input]);
            return rows ?? rowsFor(input.workspaceId, input.traceId);
          },
        });
      },
    },
  };
}

test("database provider configuration is explicit and validates the Supabase trace function", () => {
  resetRuntimeEnv();
  assert.equal(getDatabaseProvider(), "d1");

  runtimeEnv.CFR_DATABASE_PROVIDER = "SUPABASE";
  assert.equal(getDatabaseProvider(), "supabase");
  assert.throws(() => getSupabaseTraceFunctionConfig(), /configuration is unavailable/);

  runtimeEnv.SUPABASE_TRACE_FUNCTION_TOKEN = "a".repeat(64);
  runtimeEnv.SUPABASE_TRACE_FUNCTION_URL = "https://example.com/functions/v1/cfr-trace-reader";
  assert.throws(() => getSupabaseTraceFunctionConfig(), /configuration is invalid/);

  const functionUrl = "https://abcdefghijklmnopqrst.supabase.co/functions/v1/cfr-trace-reader";
  runtimeEnv.SUPABASE_TRACE_FUNCTION_URL = functionUrl;
  assert.deepEqual(getSupabaseTraceFunctionConfig(), {
    token: "a".repeat(64),
    url: functionUrl,
  });

  runtimeEnv.CFR_DATABASE_PROVIDER = "unknown";
  assert.throws(() => getDatabaseProvider(), /Unsupported database provider/);
  resetRuntimeEnv();
});

test("Supabase function transport sends one authenticated request and projects its response", async () => {
  resetRuntimeEnv();
  runtimeEnv.SUPABASE_TRACE_FUNCTION_TOKEN = "t".repeat(64);
  runtimeEnv.SUPABASE_TRACE_FUNCTION_URL =
    "https://abcdefghijklmnopqrst.supabase.co/functions/v1/cfr-trace-reader";
  const input = {
    userId: L14_TRACE_RESOLUTION_FIXTURE.identity.ownerA.userId,
    workspaceId: L14_TRACE_RESOLUTION_FIXTURE.identity.workspaceA,
    traceId: L14_TRACE_RESOLUTION_FIXTURE.identity.traceA,
  };
  let requests = 0;
  const result = await resolveFlightTraceWithSupabaseFunction(input, async (url, init) => {
    requests += 1;
    assert.equal(url, runtimeEnv.SUPABASE_TRACE_FUNCTION_URL);
    assert.equal(init.method, "POST");
    assert.equal(init.headers["x-cfr-preview-token"], runtimeEnv.SUPABASE_TRACE_FUNCTION_TOKEN);
    assert.deepEqual(JSON.parse(init.body), input);
    assert.ok(init.signal instanceof AbortSignal);
    const trace = SUPABASE_TRACE_RESOLUTION_FIXTURE.tables.flight_traces
      .find((item) => item.workspace_id === input.workspaceId && item.id === input.traceId);
    return Response.json({
      kind: "found",
      trace: {
        id: trace.id,
        workspaceId: trace.workspace_id,
        traceKey: trace.trace_key,
        currentState: trace.current_state,
        truthMode: trace.truth_mode,
      },
      events: rowsFor(input.workspaceId, input.traceId).map((row) => ({
        ...row,
        occurredAt: row.occurredAt.toISOString(),
      })),
    });
  });
  assert.equal(requests, 1);
  assert.equal(result.kind, "found");
  assert.equal(result.resolution.events.length, 28);
  resetRuntimeEnv();
});

test("Supabase function transport preserves a tenant-safe not-found result", async () => {
  resetRuntimeEnv();
  runtimeEnv.SUPABASE_TRACE_FUNCTION_TOKEN = "t".repeat(64);
  runtimeEnv.SUPABASE_TRACE_FUNCTION_URL =
    "https://abcdefghijklmnopqrst.supabase.co/functions/v1/cfr-trace-reader";
  const result = await resolveFlightTraceWithSupabaseFunction(
    { userId: "owner", workspaceId: "workspace", traceId: "foreign-trace" },
    async () => Response.json({ kind: "not_found" }, { status: 404 }),
  );
  assert.deepEqual(result, { kind: "not_found" });
  resetRuntimeEnv();
});

test("Supabase reader resolves the accepted pending trace with canonical payload and timestamp normalization", async () => {
  resetRuntimeEnv();
  const input = {
    userId: L14_TRACE_RESOLUTION_FIXTURE.identity.ownerA.userId,
    workspaceId: L14_TRACE_RESOLUTION_FIXTURE.identity.workspaceA,
    traceId: L14_TRACE_RESOLUTION_FIXTURE.identity.traceA,
  };
  const harness = fixtureReader();
  const result = await resolveFlightTraceWithSupabaseReader(input, harness.reader);
  assert.equal(result.kind, "found");
  assert.deepEqual(result.resolution, {
    workspaceRef: input.workspaceId,
    trace: L14_TRACE_RESOLUTION_FIXTURE.success.pendingA.trace,
    events: L14_TRACE_RESOLUTION_FIXTURE.success.pendingA.events,
  });
  assert.deepEqual(harness.calls.map(([kind]) => kind), ["readOnly", "membership", "trace", "events"]);
});

test("Supabase reader fails closed before later lookups and rejects incomplete projections", async () => {
  resetRuntimeEnv();
  const input = {
    userId: L14_TRACE_RESOLUTION_FIXTURE.identity.ownerB.userId,
    workspaceId: L14_TRACE_RESOLUTION_FIXTURE.identity.workspaceB,
    traceId: L14_TRACE_RESOLUTION_FIXTURE.identity.traceB,
  };

  const denied = fixtureReader({ membership: false });
  assert.deepEqual(await resolveFlightTraceWithSupabaseReader(input, denied.reader), { kind: "not_found" });
  assert.deepEqual(denied.calls.map(([kind]) => kind), ["readOnly", "membership"]);

  const absent = fixtureReader({ trace: false });
  assert.deepEqual(await resolveFlightTraceWithSupabaseReader(input, absent.reader), { kind: "not_found" });
  assert.deepEqual(absent.calls.map(([kind]) => kind), ["readOnly", "membership", "trace"]);

  const empty = fixtureReader({ rows: [] });
  assert.deepEqual(await resolveFlightTraceWithSupabaseReader(input, empty.reader), { kind: "incomplete" });

  const corruptRows = rowsFor(input.workspaceId, input.traceId);
  corruptRows[1] = { ...corruptRows[1], payloadHash: "0".repeat(64) };
  const corrupt = fixtureReader({ rows: corruptRows });
  assert.deepEqual(await resolveFlightTraceWithSupabaseReader(input, corrupt.reader), { kind: "incomplete" });
});

test("provider dispatch uses one backend and never falls back to D1 after a Supabase failure", async () => {
  resetRuntimeEnv();
  runtimeEnv.CFR_DATABASE_PROVIDER = "supabase";
  let d1Touched = false;
  runtimeEnv.DB = {
    prepare() {
      d1Touched = true;
      throw new Error("D1 fallback attempted");
    },
  };
  const input = { userId: "owner", workspaceId: "workspace", traceId: "trace" };

  installSupabaseTraceResolverForTest(async () => ({ kind: "not_found" }));
  assert.deepEqual(await resolveFlightTrace(input), { kind: "not_found" });
  assert.equal(d1Touched, false);

  installSupabaseTraceResolverForTest(async () => {
    throw new Error("fixture Supabase dependency failure");
  });
  await assert.rejects(() => resolveFlightTrace(input), /fixture Supabase dependency failure/);
  assert.equal(d1Touched, false);
  resetRuntimeEnv();
});

test("the HTTP boundary masks Supabase provider details", async () => {
  resetRuntimeEnv();
  runtimeEnv.CFR_DATABASE_PROVIDER = "supabase";
  installSupabaseTraceResolverForTest(async () => {
    throw new Error("fixture database password and internal provider detail");
  });
  const response = await handleTraceResolutionRequest(
    new Request("https://crosssignal.test/api/workspaces/workspace/traces/trace"),
    { params: Promise.resolve({ workspaceId: "workspace", traceId: "trace" }) },
    {
      authenticate: async () => ({
        userId: "owner",
        email: "owner@example.test",
        displayName: "Owner",
        fullName: null,
      }),
      resolve: resolveFlightTrace,
    },
  );
  assert.equal(response.status, 500);
  const text = await response.text();
  assert.equal(text, JSON.stringify({ error: { code: "trace_resolution_unavailable" } }));
  assert.equal(text.includes("password"), false);
  assert.equal(text.includes("provider"), false);
  resetRuntimeEnv();
});

test("hosted fixture SQL is deterministic, transactional, ordered, and secret-free", () => {
  const first = generateSupabaseFixtureSql();
  const second = generateSupabaseFixtureSql();
  assert.equal(first, second);
  assert.match(first, /^-- FIXTURE data for the dedicated Company Flight Recorder TEST target\./);
  assert.equal((first.match(/^begin;$/gm) ?? []).length, 1);
  assert.equal((first.match(/^commit;$/gm) ?? []).length, 1);
  assert.equal((first.match(/^insert into cfr_app\.workspaces /gm) ?? []).length, 2);
  assert.equal((first.match(/^insert into cfr_app\.workspace_members /gm) ?? []).length, 2);
  assert.equal((first.match(/^insert into cfr_app\.flight_traces /gm) ?? []).length, 2);
  assert.equal((first.match(/^insert into cfr_app\.flight_trace_events /gm) ?? []).length, 77);
  assert.ok(first.indexOf("cfr_app.workspaces") < first.indexOf("cfr_app.workspace_members"));
  assert.ok(first.indexOf("cfr_app.workspace_members") < first.indexOf("cfr_app.flight_traces"));
  assert.ok(first.indexOf("cfr_app.flight_traces") < first.indexOf("cfr_app.flight_trace_events"));
  for (const forbidden of ["Bearer ", "@example.test", "postgresql://", "sb_secret_"]) {
    assert.equal(first.includes(forbidden), false, forbidden);
  }
});
