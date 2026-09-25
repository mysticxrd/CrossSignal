import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

// Separate evaluator process. Product replay code receives neither this file
// nor the hidden expected answers loaded below.
const truth = JSON.parse(readFileSync(new URL("./golden-revenue-leak.truth.json", import.meta.url), "utf8"));
const artifactPath = process.argv[2];
if (!artifactPath) throw new Error("Usage: node tests/evaluator/grade-golden-case.mjs <replay-artifact.json|->");
const a = JSON.parse(readFileSync(artifactPath === "-" ? 0 : artifactPath, "utf8"));

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function hash(value) { return createHash("sha256").update(canonical(value)).digest("hex"); }
function strip(row, ...keys) {
  const copy = { ...row };
  for (const key of keys) delete copy[key];
  return copy;
}
function sameSet(actual, expected, label) {
  assert.equal(new Set(actual).size, actual.length, `${label} contains duplicates`);
  assert.deepEqual([...actual].sort(), [...expected].sort(), label);
}

assert.equal(a.replayVersion, "golden-case-replay-v1");
assert.equal(a.source, "local-fixture");
assert.equal(a.environment, "offline");
assert.equal(a.scenarioId, truth.scenarioId);
assert.equal(a.caseId, "case-golden-mobile-checkout");
assert.equal(a.workspaceId, "l14-workspace-a");
assert.equal(a.detection.eventCount, truth.eventCount);
assert.equal(a.detection.caseStatus, "detected");
assert.equal(a.detection.signal.detected, truth.expectedDetection);
const m = a.detection.signal.metrics;
assert.equal(m.baseline.starts, truth.targetBaselineStarts);
assert.equal(m.baseline.completed, truth.targetBaselineCompleted);
assert.equal(m.observed.starts, truth.targetObservedStarts);
assert.equal(m.observed.completed, truth.targetObservedCompleted);
assert.equal(m.relativeDropBps, truth.targetRelativeDropBps);
assert.equal(m.controlRelativeDropBps, truth.controlRelativeDropBps);
assert.equal(m.projectedLeakCents, truth.projectedLeakCents);
assert.deepEqual(a.decision.metrics, m && {
  baseline: m.baseline, observed: m.observed, controlBaseline: m.controlBaseline,
  controlObserved: m.controlObserved, relativeDropBps: m.relativeDropBps,
  controlRelativeDropBps: m.controlRelativeDropBps,
  expectedRevenueCents: m.expectedRevenueCents, projectedLeakCents: m.projectedLeakCents,
});
assert.equal(a.snapshot.caseRow.workspaceId, a.workspaceId);
assert.equal(a.snapshot.caseRow.truthMode, "FIXTURE");
assert.equal(a.snapshot.signalRow.contentHash, hash(a.detection.signal));
assert.equal(a.snapshot.signalRow.workspaceId, a.workspaceId);
assert.equal(a.snapshot.signalRow.detected, a.detection.signal.detected);
assert.deepEqual(a.snapshot.signalRow.metrics, m);
assert.doesNotMatch(JSON.stringify(a), /"groundTruth"|"evaluatorAnswer"|"expectedDetection"/);

const events = a.snapshot.eventRows;
assert.equal(events.length, truth.eventCount);
const eventById = new Map(events.map((event) => [event.id, event]));
assert.equal(eventById.size, events.length);
for (const event of events) {
  assert.equal(event.workspaceId, a.workspaceId);
  assert.equal(event.truthMode, "FIXTURE");
  assert.equal(event.contentHash, hash(strip(event, "truthMode", "contentHash")));
}
function total(window, segment, source, field) {
  return events.filter((event) => event.window === window && event.segment === segment
    && event.source === source).reduce((sum, event) => sum + event[field], 0);
}
for (const [window, segment, metric] of [
  ["baseline", "mobile_safari", m.baseline], ["observed", "mobile_safari", m.observed],
  ["baseline", "desktop", m.controlBaseline], ["observed", "desktop", m.controlObserved],
]) {
  assert.equal(total(window, segment, "checkout_analytics", "starts"), metric.starts);
  assert.equal(total(window, segment, "checkout_analytics", "completed"), metric.completed);
  assert.equal(total(window, segment, "payment_ledger", "captures"), metric.captures);
  assert.equal(total(window, segment, "payment_ledger", "revenueCents"), metric.revenueCents);
}
assert.equal(a.detection.evidence.filter((e) => e.relation === "supports").length, truth.supportingEvidence);
assert.equal(a.detection.evidence.filter((e) => e.relation === "contradicts").length, truth.contradictingEvidence);
const evidenceById = new Map(a.detection.evidence.map((e) => [e.id, e]));
assert.equal(evidenceById.size, truth.expectedEvidence.length);
assert.equal(a.snapshot.evidenceRows.length, evidenceById.size);
const expectedRefs = [];
for (const expected of truth.expectedEvidence) {
  const evidence = evidenceById.get(expected.id);
  assert.ok(evidence, `missing ${expected.id}`);
  assert.equal(evidence.source, expected.source);
  assert.equal(evidence.relation, expected.relation);
  assert.equal(evidence.workspaceId, a.workspaceId);
  const matching = events.filter((event) => event.source === expected.source
    && event.segment === expected.segment).map((event) => event.id);
  assert.equal(matching.length, expected.references);
  sameSet(evidence.eventIds, matching, `${expected.id} trace references`);
  const row = a.snapshot.evidenceRows.find((item) => item.id === expected.id);
  assert.ok(row);
  assert.equal(row.contentHash, hash(evidence));
  for (const eventId of matching) expectedRefs.push(`${expected.id}/${eventId}`);
}
const refs = a.snapshot.citationRows;
assert.equal(refs.length, truth.citationCount);
for (const ref of refs) assert.equal(ref.workspaceId, a.workspaceId);
sameSet(refs.map((ref) => `${ref.evidenceId}/${ref.eventId}`), expectedRefs, "saved evidence citations");
assert.equal(a.investigation.status, "ready_for_review");
assert.equal(a.investigation.assessment, "targeted_drop_supported_cause_unconfirmed");
assert.equal(a.investigation.truthMode, "FIXTURE");
assert.equal(a.investigation.claims.length, truth.expectedEvidence.length);
const claimRefs = [];
for (const claim of a.investigation.claims) {
  const evidence = evidenceById.get(claim.evidenceId);
  assert.ok(evidence, `unknown claim evidence ${claim.evidenceId}`);
  assert.equal(claim.relation, evidence.relation);
  sameSet(claim.eventIds, evidence.eventIds, `${claim.id} citations`);
  for (const eventId of claim.eventIds) claimRefs.push(`${claim.id}/${claim.evidenceId}/${eventId}`);
}
assert.equal(a.investigationCitations.length, truth.citationCount);
for (const ref of a.investigationCitations) {
  assert.equal(ref.workspaceId, a.workspaceId);
  assert.equal(ref.investigationId, a.investigation.id);
}
sameSet(a.investigationCitations.map((ref) => `${ref.claimId}/${ref.evidenceId}/${ref.eventId}`),
  claimRefs, "saved investigation citations");
assert.equal(a.decision.claims.length, a.investigation.claims.length);
for (const claim of a.decision.claims) {
  const investigated = a.investigation.claims.find((item) => item.id === claim.id);
  assert.ok(investigated);
  sameSet(claim.events.map((event) => event.id), investigated.eventIds, `${claim.id} displayed traces`);
}

assert.equal(a.decision.truthMode, "FIXTURE");
assert.equal(a.decision.status, "detected");
assert.equal(a.decision.response.approvalPresent, true);
assert.equal(a.decision.response.effectiveReceipt, null);
assert.match(a.decision.response.trialReceiptHash, /^[0-9a-f]{64}$/);
assert.match(a.decision.response.trialMarkerHash, /^[0-9a-f]{64}$/);
assert.equal(a.decision.outcome.status, "awaiting_check");
assert.equal(a.decision.outcome.label, null);
const runs = a.decision.simulatedCheckouts;
assert.equal(runs.length, 2);
sameSet(runs.map((run) => run.scenario), ["capture", "decline"], "simulated scenarios");
for (const run of runs) {
  assert.equal(run.workspaceId, a.workspaceId);
  assert.equal(run.caseId, a.caseId);
  assert.equal(run.truthMode, "SIMULATED");
  assert.equal(run.environment, "TEST");
  assert.equal(run.chargedCents, 0);
  assert.equal(run.deviceVerification, "pending");
  assert.equal(run.businessOutcome, "not_measured");
  assert.equal(run.captureStatus, run.scenario === "capture" ? "simulated_captured" : "simulated_declined");
  assert.equal(run.contentHash, hash(strip(run, "contentHash")));
  assert.deepEqual(run.events.map((event) => event.sequence), [1, 2, 3]);
  sameSet(run.events.map((event) => event.id),
    ["started", "capture", "completed"].map((part) => `${run.runId}-${part}`), `${run.runId} trace`);
}
const assessment = a.decision.simulationOutcome;
assert.equal(assessment.contentHash, hash(strip(assessment, "contentHash")));
assert.equal(assessment.truthMode, "SIMULATED");
assert.equal(assessment.status, "verified");
assert.deepEqual(assessment.counts, { capture: 1, decline: 1 });
assert.equal(assessment.runCount, 2);
assert.equal(assessment.actualChargedCents, 0);
assert.equal(assessment.caseResolution, "unresolved");
assert.equal(assessment.deviceVerification, "pending");
assert.equal(assessment.businessOutcome, "not_measured");
assert.deepEqual(assessment.transitions.map((transition) => [transition.from, transition.to]),
  [["awaiting_runs", "in_progress"], ["in_progress", "verified"]]);
for (const transition of assessment.transitions) {
  const run = runs.find((item) => item.runId === transition.runId);
  assert.ok(run);
  assert.equal(transition.runHash, run.contentHash);
  assert.equal(transition.scenario, run.scenario);
  assert.equal(transition.result, run.captureStatus);
  sameSet(transition.eventIds, run.events.map((event) => event.id), `${run.runId} assessment trace`);
}
assert.deepEqual(a.belowThreshold, { detected: false, caseStatus: "no_signal" });
assert.equal(a.coverageGuards.captureOnlyStatus, "in_progress");
assert.equal(a.coverageGuards.repeatedCaptureStatus, "in_progress");
assert.equal(a.coverageGuards.reorderedAssessmentHash, assessment.contentHash);
sameSet(a.failures.map((failure) => failure.id), truth.expectedFailureCases, "deliberate failure cases");
for (const failure of a.failures) {
  assert.equal(failure.outcome, "rejected", `${failure.id} must fail closed`);
  assert.ok(typeof failure.reason === "string" && failure.reason.length > 0);
}

const lines = [
  "# Local golden-Case replay — PASS",
  "",
  `Case: \`${a.caseId}\` in fixture workspace \`${a.workspaceId}\`. Source: offline local fixture.`,
  "",
  "| Check | Result |",
  "| --- | --- |",
  `| Detection | ${a.detection.eventCount} FIXTURE observations; ${m.baseline.completed}/${m.baseline.starts} to ${m.observed.completed}/${m.observed.starts} Mobile Safari conversions; ${m.relativeDropBps} bps relative drop; $${(m.projectedLeakCents / 100).toFixed(2)} projected fixture gap |`,
  `| Citation integrity | ${refs.length} evidence references and ${a.investigationCitations.length} Investigator references; every displayed claim resolves to recorded event IDs |`,
  `| Simulation coverage | ${assessment.status}: ${assessment.counts.capture} capture, ${assessment.counts.decline} decline; capture-only and repeated capture remain \`in_progress\`; assessment hash \`${assessment.contentHash}\` |`,
  `| Safe failures | ${a.failures.length} deliberate cases rejected; below-threshold case stayed \`no_signal\` |`,
  `| Boundaries | Trial receipt \`${a.decision.response.trialReceiptHash}\` excluded; effective receipt absent; real outcome \`${a.decision.outcome.status}\`; Case \`${assessment.caseResolution}\` |`,
  "",
  "## Trace references",
  "",
  ...truth.expectedEvidence.map((item) => {
    const evidence = evidenceById.get(item.id);
    return `- \`${item.id}\` (${item.relation}): ${evidence.eventIds.length} recorded IDs; first \`${evidence.eventIds[0]}\`, last \`${evidence.eventIds.at(-1)}\`.`;
  }),
  ...assessment.transitions.map((transition) =>
    `- \`${transition.runId}\` (${transition.scenario}, ${transition.from} → ${transition.to}): artifact \`${transition.runHash}\`; trace \`${transition.eventIds.join("\`, \`")}\`.`),
  "",
  "## Deliberate failures",
  "",
  ...a.failures.map((failure) => `- \`${failure.id}\`: rejected (${failure.reason}).`),
  "",
  "This is a deterministic local replay. SIMULATED checkout coverage is separate from actual Mobile Safari device verification and measured business outcomes. No payment, model, database, or LIVE operation ran.",
  "",
];
process.stdout.write(lines.join("\n"));
