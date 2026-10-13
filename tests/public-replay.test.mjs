import assert from "node:assert/strict";
import test from "node:test";
import { RUNS } from "../db/replays/index.mjs";
import { DEMO_RUN_ID, publicReplayGate } from "../worker/public-replay.mjs";

const SITE = "https://crosssignal.example.workers.dev";
const gate = (path, init) => publicReplayGate(new Request(`${SITE}${path}`, init));

test("the home page sends visitors to a committed demo run", () => {
  assert.ok(RUNS.has(DEMO_RUN_ID));
  const response = gate("/");
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), `${SITE}/runs/${DEMO_RUN_ID}`);
});

test("reads of replay pages reach the app, including client navigation", () => {
  for (const path of [`/runs/${DEMO_RUN_ID}`, "/runs/r_fcb7e11ebcfa?_rsc", "/runs/r_000000000000"]) {
    assert.equal(gate(path), null, path);
  }
  assert.equal(gate(`/runs/${DEMO_RUN_ID}`, { method: "HEAD" }), null);
});

test("nothing that writes gets through, server actions included", () => {
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    const response = gate(`/runs/${DEMO_RUN_ID}`, { method, headers: { "next-action": "any" } });
    assert.equal(response.status, 405, method);
  }
  assert.equal(gate("/", { method: "POST" }).status, 405);
});

test("the signed-in app, its API and the image optimiser are not served", () => {
  for (const path of ["/api/workspaces/w/traces/t", "/_vinext/image?url=/og.png", "/signin-with-chatgpt", "/runs",
    "/runs/../api/workspaces/w/traces/t", "/RUNS/" + DEMO_RUN_ID]) {
    assert.equal(gate(path)?.status, 404, path);
  }
});

test("the public build has no database and turns the gate on", async () => {
  const { publicReplayConfig } = await import("../vite.config.ts");
  assert.deepEqual(publicReplayConfig.vars, { CROSSSIGNAL_PUBLIC_REPLAY: "1" });
  assert.equal(publicReplayConfig.d1_databases, undefined);
  assert.equal(publicReplayConfig.r2_buckets, undefined);
  assert.equal(publicReplayConfig.main, "./worker/index.ts");
});
