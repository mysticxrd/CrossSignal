import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  buildGoldenEvents, detectRevenueLeak, GOLDEN_SCENARIO,
  validateCaseRecord, validateEvidence, validateRecordedEvent, validateScenario, validateSignal,
} from "../db/revenue-leak.mjs";

const truth = JSON.parse(readFileSync(fileURLToPath(new URL("./evaluator/golden-revenue-leak.truth.json", import.meta.url)), "utf8"));
const clone = (value) => structuredClone(value);

test("golden incident is detected only from recorded fixture observations", () => {
  const events = buildGoldenEvents();
  const result = detectRevenueLeak(GOLDEN_SCENARIO, events);
  assert.equal(result.events.length, 56);
  assert.equal(result.signal.detected, truth.expectedDetection);
  assert.equal(result.signal.metrics.baseline.starts, truth.targetBaselineStarts);
  assert.equal(result.signal.metrics.baseline.completed, truth.targetBaselineCompleted);
  assert.equal(result.signal.metrics.observed.starts, truth.targetObservedStarts);
  assert.equal(result.signal.metrics.observed.completed, truth.targetObservedCompleted);
  assert.equal(result.signal.metrics.relativeDropBps, truth.targetRelativeDropBps);
  assert.equal(result.signal.metrics.controlRelativeDropBps, truth.controlRelativeDropBps);
  assert.equal(result.signal.metrics.projectedLeakCents, truth.projectedLeakCents);
  assert.equal(result.evidence.filter((item) => item.relation === "supports").length, truth.supportingEvidence);
  assert.equal(result.evidence.filter((item) => item.relation === "contradicts").length, truth.contradictingEvidence);
  assert.equal(result.caseRecord.truthMode, "FIXTURE");
  assert.equal(result.caseRecord.status, "detected");
  assert.equal(validateCaseRecord(result.caseRecord, result.signal, result.evidence, events), result.caseRecord);
});

test("detection is order independent and a below-threshold incident does not signal", () => {
  const events = buildGoldenEvents();
  const forward = detectRevenueLeak(GOLDEN_SCENARIO, events);
  const reverse = detectRevenueLeak(GOLDEN_SCENARIO, [...events].reverse());
  assert.deepEqual(forward.caseRecord, reverse.caseRecord);
  assert.deepEqual(forward.signal, reverse.signal);
  assert.deepEqual(forward.evidence, reverse.evidence);

  const threshold = { ...GOLDEN_SCENARIO, minimumRelativeDropBps: 6000 };
  const below = detectRevenueLeak(threshold, events);
  assert.equal(below.signal.detected, false);
  assert.equal(below.caseRecord.status, "no_signal");
  assert.equal(below.signal.metrics.relativeDropBps, 5714);
});

test("invalid scenario, event, signal, evidence, and Case contracts fail closed", () => {
  const events = buildGoldenEvents();
  const result = detectRevenueLeak(GOLDEN_SCENARIO, events);
  assert.throws(() => validateScenario({ ...GOLDEN_SCENARIO, groundTruth: truth }), /unknown or missing/);
  assert.throws(() => validateScenario({ ...GOLDEN_SCENARIO, observedDays: GOLDEN_SCENARIO.baselineDays }), /overlap/);
  assert.throws(() => validateRecordedEvent({ ...events[0], workspaceId: "foreign" }), /tenant/);
  assert.throws(() => validateRecordedEvent({ ...events[0], completed: 21 }), /counts/);
  assert.throws(() => detectRevenueLeak(GOLDEN_SCENARIO, events.slice(1)), /incomplete/);
  assert.throws(() => detectRevenueLeak(GOLDEN_SCENARIO, [...events.slice(1), events[0], events[0]]), /duplicated/);
  const mismatch = clone(events);
  mismatch.find((event) => event.source === "payment_ledger").captures = 1;
  assert.throws(() => detectRevenueLeak(GOLDEN_SCENARIO, mismatch), /counts differ/);
  assert.throws(() => validateSignal({ ...result.signal, detected: "yes" }), /signal/);
  assert.throws(() => validateEvidence({ ...result.evidence[0], eventIds: [events.find((event) => event.source === "payment_ledger").id] }, events), /source event/);
  assert.throws(() => validateCaseRecord({ ...result.caseRecord, workspaceId: "foreign" }, result.signal, result.evidence, events), /binding/);
  assert.throws(() => validateCaseRecord({ ...result.caseRecord, evaluatorAnswer: true }, result.signal, result.evidence, events), /unknown or missing/);
  assert.throws(() => detectRevenueLeak(GOLDEN_SCENARIO, events.map((event) => ({
    ...event, starts: event.source === "checkout_analytics" ? Number.MAX_SAFE_INTEGER : 0,
  }))), /safe integer range/);
});

test("evaluator truth is absent from deployed scenario and repeatable SQL", () => {
  const scenario = JSON.stringify(GOLDEN_SCENARIO);
  const generatedSql = readFileSync(fileURLToPath(new URL("../supabase/scenarios/golden_revenue_leak.sql", import.meta.url)), "utf8");
  assert.ok(!scenario.includes("groundTruth"));
  assert.ok(!generatedSql.includes("groundTruth"));
  assert.match(generatedSql, /on conflict do nothing/g);
  assert.doesNotMatch(generatedSql, /\b(delete|truncate|drop)\s+(from|table)\b/i);
  assert.match(generatedSql, /golden event set differs from source contract/);
});
