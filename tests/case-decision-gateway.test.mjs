import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "cloudflare:workers") {
      return { url: "cfr-decision-test:env", shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === "cfr-decision-test:env") {
      return { format: "module", shortCircuit: true, source: `export const env = {
        CFR_DATABASE_PROVIDER: "supabase",
        SUPABASE_TRACE_FUNCTION_URL: "https://abcdefghijklmnopqrst.supabase.co/functions/v1/cfr-trace-reader",
        SUPABASE_TRACE_FUNCTION_TOKEN: "fixture-only-token-".repeat(4)
      };` };
    }
    return nextLoad(url, context);
  },
});

const { approveSavedCaseResponse, recordSavedCaseCheck, executeSavedCaseCheckout,
  markSavedCaseCheckTrial } = await import("../db/case-decision.ts");
const scope = ["fixture-owner", "l14-workspace-a", "fixture-case", "fixture-response", "a".repeat(64)];
const operations = [
  { kind: "approved", call: fetcher => approveSavedCaseResponse(...scope, fetcher) },
  { kind: "recorded", call: fetcher => recordSavedCaseCheck(...scope, "fixture-run", "indeterminate", fetcher) },
  { kind: "simulated", call: fetcher => executeSavedCaseCheckout(...scope, "fixture-run", "capture", fetcher) },
  { kind: "marked", call: fetcher => markSavedCaseCheckTrial(...scope, "b".repeat(64), fetcher) },
];

for (const operation of operations) {
  test(operation.kind + " gateway validates untrusted JSON before accepting success", async () => {
    const fetcher = body => async () => Response.json(body);
    for (const reused of [false, true]) {
      const result = await operation.call(fetcher({ kind: operation.kind, reused, runId: "fixture-run" }));
      assert.deepEqual(result, { ok: true, reused, ...(operation.kind === "simulated" ? { runId: "fixture-run" } : {}) });
    }
    for (const payload of [null, [], "approved", 1, false, {},
      { kind: "unexpected", reused: false }, { kind: operation.kind, reused: "false" },
      { kind: operation.kind }]) {
      const result = await operation.call(fetcher(payload));
      assert.equal(result.ok, false, JSON.stringify(payload));
      assert.match(result.error, /invalid/i);
    }
    if (operation.kind === "simulated") {
      assert.equal((await operation.call(fetcher({ kind: operation.kind, reused: false, runId: "different-run" }))).ok, false);
    }
  });
}
