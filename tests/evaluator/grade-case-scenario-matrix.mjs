import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

// Evaluator process only. The product runner never imports this module or its
// hidden answer file.
const truth = JSON.parse(readFileSync(new URL("./case-scenario-matrix.truth.json", import.meta.url), "utf8"));
const artifactPath = process.argv[2];
if (!artifactPath) throw new Error("Usage: node tests/evaluator/grade-case-scenario-matrix.mjs <artifact.json|->");
const artifact = JSON.parse(readFileSync(artifactPath === "-" ? 0 : artifactPath, "utf8"));

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function hash(value) { return createHash("sha256").update(canonical(value)).digest("hex"); }
function roundDiv(n, d) { return Number((BigInt(n) + BigInt(d) / 2n) / BigInt(d)); }
function sameSet(actual, expected, label) {
  assert.equal(new Set(actual).size, actual.length, `${label} is duplicated`);
  assert.deepEqual([...actual].sort(), [...expected].sort(), label);
}
function measure(events, window, segment) {
  const rows = events.filter((event) => event.window === window && event.segment === segment);
  const checkout = rows.filter((event) => event.source === "checkout_analytics");
  const payment = rows.filter((event) => event.source === "payment_ledger");
  assert.equal(checkout.length, 7);
  assert.equal(payment.length, 7);
  for (const row of checkout) {
    const counterpart = payment.find((event) => event.observedDay === row.observedDay);
    assert.ok(counterpart);
    assert.equal(row.completed, counterpart.captures);
  }
  const starts = checkout.reduce((sum, row) => sum + row.starts, 0);
  const completed = checkout.reduce((sum, row) => sum + row.completed, 0);
  const captures = payment.reduce((sum, row) => sum + row.captures, 0);
  const revenueCents = payment.reduce((sum, row) => sum + row.revenueCents, 0);
  return { starts, completed, captures, revenueCents,
    conversionBps: roundDiv(completed * 10000, starts) };
}
function relativeDrop(baseline, observed) {
  const numerator = baseline.completed * observed.starts - observed.completed * baseline.starts;
  return numerator <= 0 ? 0 : roundDiv(numerator * 10000, baseline.completed * observed.starts);
}

assert.equal(artifact.suiteVersion, "case-scenario-matrix-v1");
assert.equal(artifact.source, "local-fixture");
assert.equal(artifact.environment, "offline");
const allExpected = [...truth.expectedCases.map((item) => item.id), ...truth.expectedRejected];
sameSet(artifact.cases.map((item) => item.id), allExpected, "matrix case IDs");
const byId = new Map(artifact.cases.map((item) => [item.id, item]));
let truePositive = 0;
let trueNegative = 0;
for (const expected of truth.expectedCases) {
  const row = byId.get(expected.id);
  assert.equal(row.inputHash, hash({ scenario: row.scenario, events: row.events }));
  assert.equal(row.scenario.truthMode, "FIXTURE");
  assert.equal(Object.hasOwn(row.scenario, "groundTruth"), false);
  assert.equal(row.scenario.workspaceId, "l14-workspace-a");
  assert.equal(row.observation.kind, "derived", `${row.id} should be valid`);
  assert.equal(row.events.length, 56);
  assert.equal(new Set(row.events.map((event) => event.id)).size, 56);
  for (const event of row.events) {
    assert.equal(event.workspaceId, row.scenario.workspaceId);
    assert.equal(event.scenarioId, row.scenario.id);
  }
  const baseline = measure(row.events, "baseline", "mobile_safari");
  const observed = measure(row.events, "observed", "mobile_safari");
  const controlBaseline = measure(row.events, "baseline", "desktop");
  const controlObserved = measure(row.events, "observed", "desktop");
  const relativeDropBps = relativeDrop(baseline, observed);
  const controlRelativeDropBps = relativeDrop(controlBaseline, controlObserved);
  const expectedRevenueCents = roundDiv(observed.starts * baseline.revenueCents, baseline.starts);
  const projectedLeakCents = Math.max(0, expectedRevenueCents - observed.revenueCents);
  const metrics = { baseline, observed, controlBaseline, controlObserved,
    relativeDropBps, controlRelativeDropBps, expectedRevenueCents, projectedLeakCents };
  assert.deepEqual(row.observation.metrics, metrics, `${row.id} metrics differ from raw observations`);
  const independentlyDetected = baseline.starts >= row.scenario.minimumStarts
    && observed.starts >= row.scenario.minimumStarts
    && relativeDropBps >= row.scenario.minimumRelativeDropBps
    && controlRelativeDropBps <= row.scenario.maximumControlDropBps
    && projectedLeakCents > 0;
  assert.equal(independentlyDetected, expected.detected, `${row.id} hidden truth differs from fixture`);
  assert.equal(row.observation.detected, expected.detected, `${row.id} detection`);
  assert.equal(row.observation.caseStatus, expected.detected ? "detected" : "no_signal");
  assert.equal(row.observation.truthMode, "FIXTURE");
  for (const [key, value] of Object.entries(expected)) {
    if (key === "relativeDropBps" || key === "controlRelativeDropBps" || key === "projectedLeakCents") {
      assert.equal(metrics[key], value, `${row.id} ${key}`);
    } else if (key === "baselineStarts") assert.equal(baseline.starts, value, `${row.id} starts`);
  }
  const evidence = row.observation.evidence;
  assert.equal(evidence.length, 3);
  for (const item of evidence) {
    const segment = item.id === "evidence-desktop-control" ? "desktop" : "mobile_safari";
    const matching = row.events.filter((event) => event.source === item.source
      && event.segment === segment).map((event) => event.id);
    assert.equal(matching.length, 14);
    sameSet(item.eventIds, matching, `${row.id}/${item.id} trace references`);
    assert.equal(item.relation, segment === "desktop" ? "contradicts" : "supports");
  }
  if (expected.detected) truePositive += 1;
  else trueNegative += 1;
}
for (const id of truth.expectedRejected) {
  const row = byId.get(id);
  assert.equal(row.inputHash, hash({ scenario: row.scenario, events: row.events }));
  assert.equal(row.observation.kind, "rejected", `${id} must fail closed`);
  assert.ok(typeof row.observation.reason === "string" && row.observation.reason.length > 0);
}

const lines = [
  "# Local Case scenario matrix — PASS",
  "",
  `Designed variants: ${truth.expectedCases.length} valid counterfactuals, ${truth.expectedRejected.length} invalid inputs. The valid set has ${truePositive} detected and ${trueNegative} no-signal results.`,
  "",
  "| Variant | Signal | Mobile drop (bps) | Control drop (bps) | Mobile starts | Projected fixture gap |",
  "| --- | --- | ---: | ---: | ---: | ---: |",
  ...truth.expectedCases.map((expected) => {
    const row = byId.get(expected.id);
    const metrics = row.observation.metrics;
    return `| \`${row.id}\` | ${row.observation.caseStatus} | ${metrics.relativeDropBps} | ${metrics.controlRelativeDropBps} | ${metrics.baseline.starts} | $${(metrics.projectedLeakCents / 100).toFixed(2)} |`;
  }),
  "",
  "## Trace references",
  "",
  ...truth.expectedCases.filter((item) => item.detected).flatMap((expected) => {
    const row = byId.get(expected.id);
    return [`- \`${row.id}\` input hash: \`${row.inputHash}\`.`, ...row.observation.evidence.map((item) =>
      `- \`${row.id}/${item.id}\`: ${item.eventIds.length} source-bound event IDs; first \`${item.eventIds[0]}\`, last \`${item.eventIds.at(-1)}\`.`)];
  }),
  "",
  "## Rejected inputs",
  "",
  ...truth.expectedRejected.map((id) => `- \`${id}\`: ${byId.get(id).observation.reason}.`),
  "",
  "These are deliberately designed FIXTURE counterfactuals, not an estimate of field accuracy. No model, payment provider, database, device, TEST deployment, or LIVE operation ran. No Case was closed or business outcome measured.",
  "",
];
process.stdout.write(lines.join("\n"));
