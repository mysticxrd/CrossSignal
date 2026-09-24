// Portable, deterministic simulator. No provider, network, payment, or device API.
export const CHECKOUT_LIMIT = 20;
export const CHECKOUT_SCENARIOS = Object.freeze(["capture", "decline"]);
export const RUN_ID = /^sim_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function canonicalCheckout(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalCheckout).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalCheckout(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

export function buildSimulatedCheckout(input) {
  const keys = ["workspaceId", "caseId", "responseId", "proposalHash", "runId", "scenario", "recordedBy", "executedAt"];
  if (!input || typeof input !== "object" || Array.isArray(input)
    || Object.keys(input).sort().join("|") !== keys.sort().join("|")
    || ![input.workspaceId, input.caseId, input.responseId].every((s) => typeof s === "string" && /^[a-z0-9][a-z0-9_-]{0,127}$/.test(s))
    || typeof input.proposalHash !== "string" || !/^[0-9a-f]{64}$/.test(input.proposalHash)
    || typeof input.runId !== "string" || !RUN_ID.test(input.runId)
    || !CHECKOUT_SCENARIOS.includes(input.scenario)
    || typeof input.recordedBy !== "string" || !/^sha256:[0-9a-f]{64}$/.test(input.recordedBy)
    || typeof input.executedAt !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(input.executedAt)
    || !Number.isFinite(Date.parse(input.executedAt))
    || new Date(input.executedAt).toISOString() !== input.executedAt) {
    throw new TypeError("Synthetic checkout input is invalid");
  }
  const captureStatus = input.scenario === "capture" ? "simulated_captured" : "simulated_declined";
  return {
    ...input, methodVersion: "synthetic-checkout-v1", truthMode: "SIMULATED", environment: "TEST",
    product: "Synthetic test order", currency: "USD", orderCents: 5000,
    chargedCents: 0, captureStatus, deviceVerification: "pending", businessOutcome: "not_measured",
    events: [
      { id: `${input.runId}-started`, sequence: 1, type: "simulated_checkout_started", at: input.executedAt },
      { id: `${input.runId}-capture`, sequence: 2, type: captureStatus, at: input.executedAt },
      { id: `${input.runId}-completed`, sequence: 3, type: "simulated_checkout_completed", at: input.executedAt },
    ],
  };
}
