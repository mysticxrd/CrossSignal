import { buildGoldenEvents, contentHash, detectRevenueLeak, GOLDEN_SCENARIO } from "../db/revenue-leak.mjs";

// Offline counterfactuals. This runner records product behavior; expected
// answers live only in tests/evaluator/case-scenario-matrix.truth.json.
const scenario = { ...GOLDEN_SCENARIO, workspaceId: "l14-workspace-a" };
const clone = (value) => structuredClone(value);
const sourceEvents = buildGoldenEvents(scenario);

function setCompletions(events, segment, window, completed) {
  for (const event of events) {
    if (event.segment !== segment || event.window !== window) continue;
    if (event.source === "checkout_analytics") event.completed = completed;
    else { event.captures = completed; event.revenueCents = completed * 5000; }
  }
}

const variants = [
  ["golden", () => {}],
  ["moderate_mobile_drop", (_, events) => setCompletions(events, "mobile_safari", "observed", 3)],
  ["broad_checkout_drop", (_, events) => setCompletions(events, "desktop", "observed", 1)],
  ["low_mobile_volume", (_, events) => {
    for (const event of events) if (event.segment === "mobile_safari" && event.source === "checkout_analytics") {
      event.starts = 10;
    }
  }],
  ["revenue_offset", (_, events) => {
    for (const event of events) if (event.segment === "mobile_safari" && event.window === "observed"
      && event.source === "payment_ledger") event.revenueCents = 20000;
  }],
  ["severe_mobile_drop", (_, events) => setCompletions(events, "mobile_safari", "observed", 1)],
  ["no_mobile_drop", (_, events) => setCompletions(events, "mobile_safari", "observed", 4)],
  ["missing_observation", (_, events) => { events.pop(); }],
  ["duplicate_observation", (_, events) => { events.push(clone(events[0])); }],
  ["foreign_workspace", (_, events) => { events[0].workspaceId = "foreign"; }],
  ["ledger_mismatch", (_, events) => {
    const payment = events.find((event) => event.source === "payment_ledger");
    payment.captures -= 1;
  }],
  ["live_scenario", (input) => { input.truthMode = "LIVE"; }],
  ["evaluator_injection", (input) => { input.groundTruth = "injected"; }],
];

const cases = variants.map(([id, change]) => {
  const input = clone(scenario);
  const events = clone(sourceEvents);
  change(input, events);
  try {
    const result = detectRevenueLeak(input, events);
    return { id, scenario: input, events, inputHash: contentHash({ scenario: input, events }),
      observation: { kind: "derived", caseStatus: result.caseRecord.status,
        detected: result.signal.detected, truthMode: result.caseRecord.truthMode,
        metrics: result.signal.metrics,
        evidence: result.evidence.map((item) => ({ id: item.id, source: item.source,
          relation: item.relation, eventIds: item.eventIds })) } };
  } catch (error) {
    return { id, scenario: input, events, inputHash: contentHash({ scenario: input, events }),
      observation: { kind: "rejected", reason: error.message } };
  }
});

process.stdout.write(`${JSON.stringify({ suiteVersion: "case-scenario-matrix-v1",
  source: "local-fixture", environment: "offline", cases }, null, 2)}\n`);
