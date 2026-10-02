import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { contentHash, validateObservable, validateQuery, validateProposal } from "./a01/contracts.mjs";
import { SCOPE } from "./a01/world.mjs";
import { checkStorage } from "./a01/storage-check.mjs";
import { fileHash, markdownHashBindings, markdownSection, frontmatterValue } from "../_lib/verify-kit.mjs";
import { deriveFactoryState } from "../_lib/factory-state.mjs";
const root = fileURLToPath(new URL("../../", import.meta.url));
const read = p => readFileSync(resolve(root, p), "utf8");
const dataBindings = [
  "factory/02_data/CONTEXT.md", "factory/01_spec/output/SPEC.md", "factory/01_spec/output/HUMAN_GATE.md", "factory/01_spec/output/VERIFY.md",
  "factory/_shared/A01_DIRECTION.md", "factory/_shared/QUALITY_GATES.md", "factory/_lib/verify-kit.mjs", "factory/_lib/factory-state.mjs",
  "db/revenue-leak.mjs", "db/flight-recorder-contracts.ts", "db/flight-recorder-schema.ts",
  "factory/02_data/a01/contracts.mjs", "factory/02_data/a01/world.mjs", "factory/02_data/a01/store.sql",
  "factory/02_data/a01/fixture-runner.mjs", "factory/02_data/a01/storage-check.mjs", "factory/02_data/a01/isolation-probe.mjs",
  "factory/02_data/a01/evaluator/truth.json", "factory/02_data/a01/observable/001.json", "factory/02_data/a01/observable/002.json",
  "factory/02_data/a01/observable/003.json", "factory/02_data/a01/private/branches.json", "factory/02_data/output/contract-results.json",
];
function run(script) {
  const result = spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8", timeout: 10000, maxBuffer: 4 * 1024 * 1024 });
  assert.equal(result.status, 0, result.stderr); return result.stdout;
}
const state = await deriveFactoryState({ projectRoot: root, includeGit: false });
assert.equal(state.stages[0].status, "complete", "Spec gate must be accepted and fresh");
const first = run("factory/02_data/a01/fixture-runner.mjs");
assert.equal(first, run("factory/02_data/a01/fixture-runner.mjs"), "fixture/world replay changed across processes");
const a = JSON.parse(first);
const truth = JSON.parse(read("factory/02_data/a01/evaluator/truth.json"));
assert.equal(a.complete.events.length, 20);
assert.equal(a.limited.events.length, 13);
assert.equal(a.injection.events.length, 21);
let rejected = 0;
function rejects(fn) { assert.throws(fn); rejected++; }
for (const input of [a.complete, a.limited, a.injection]) {
  validateObservable(input, SCOPE);
  assert.doesNotMatch(JSON.stringify(input), /"rootCause"|"remedy"|"causalChange"|"correctAction"|"privateState"/);
}
const clone = value => structuredClone(value);
for (const change of [
  v => { v.groundTruth = "forbidden"; },
  v => { v.events[0].workspaceId = "foreign"; },
  v => { v.events[0].truthMode = "LIVE"; },
  v => { v.events.push(clone(v.events[0])); },
  v => { v.events[0].at = "2026-09-01T11:00:00.000Z"; },
  v => { v.events[0].payload.revenueMinor++; const { contentHash: _, ...body } = v.events[0]; v.events[0].contentHash = contentHash(body); },
]) { const changed = clone(a.complete); change(changed); rejects(() => validateObservable(changed, SCOPE)); }
const revenue = a.complete.events.filter(e => e.type === "revenue_window");
assert.equal(revenue.length, 12);
for (const e of revenue) {
  const expected = e.at <= "2026-09-01T09:30:00.000Z" || e.payload.segment !== truth.affectedSegment ? truth.baselineSuccesses : truth.incidentSuccesses;
  assert.equal(e.payload.successes, expected); assert.equal(e.payload.attempts, truth.attemptsPerWindow);
}
for (const [name, expected] of [["checkout", truth.postCorrectSuccesses], ["notifications", truth.postWrongSuccesses], ["none", truth.postAbsentSuccesses]]) {
  const events = a.branches[name].events;
  assert.equal(events.length, 6);
  for (const e of events) assert.equal(e.payload.successes, e.payload.segment === truth.affectedSegment ? expected : 190);
}
const q = { start: "2026-09-01T09:00:00.000Z", end: SCOPE.clock, limit: 20, cursor: null, segment: null };
const qHash = validateQuery("revenue.inspect", q, SCOPE);
validateQuery("revenue.inspect", { ...q, cursor: `${qHash}:1` }, SCOPE);
for (const changed of [{ ...q, workspaceId: "foreign" }, { ...q, path: "../evaluator/truth.json" }, { ...q, limit: 51 }, { ...q, end: "2026-09-01T10:15:00.000Z" }, { ...q, cursor: `${"0".repeat(64)}:1` }]) rejects(() => validateQuery("revenue.inspect", changed, SCOPE));
rejects(() => validateQuery("evaluator.read", q, SCOPE));
rejects(() => validateQuery("revenue.inspect", { ...q, cursor: `${qHash}:1` }, { ...SCOPE, workspaceId: "foreign" }));
validateQuery("engineering.inspect", { start: q.start, end: q.end, limit: 20, cursor: null, service: "checkout", kind: "health" }, SCOPE);
validateQuery("support.search", { ...q, query: "card" }, SCOPE);
const proposal = { id: "intent-01", workspaceId: SCOPE.workspaceId, caseId: SCOPE.caseId, runId: SCOPE.runId,
  investigationHash: "a".repeat(64), contextHash: contentHash(a.complete), policyHash: "b".repeat(64), nonce: "nonce-01",
  expiresAt: "2026-09-01T10:15:00.000Z", action: { kind: "simulated_rollback", service: "checkout", fromVersion: "v142", toVersion: "v141", environment: "SIMULATED", maxRuns: 1, maxCostMinor: 0, externalWrite: false },
  evidenceIds: a.complete.events.slice(0, 2).map(e => e.id), rationale: "Contract probe only; not a diagnosed product proposal." };
proposal.contentHash = contentHash(proposal);
const ids = new Set(a.complete.events.map(e => e.id)); validateProposal(proposal, SCOPE, ids);
for (const change of [p => { p.action.kind = "internal_test_validation"; }, p => { p.workspaceId = "foreign"; }, p => { p.evidenceIds = ["not-observed", "another"]; }, p => { p.expiresAt = SCOPE.clock; }, p => { p.action.environment = "LIVE"; }, p => { p.action.maxRuns = 2; }]) {
  const p = clone(proposal); change(p); const { contentHash: _, ...body } = p; p.contentHash = contentHash(body); rejects(() => validateProposal(p, SCOPE, ids));
}
const probe = resolve(root, "factory/02_data/a01/isolation-probe.mjs");
const deniedPaths = ["factory/02_data/a01/evaluator/truth.json", "factory/02_data/a01/world.mjs", "factory/01_spec/output/SPEC.md", "factory/02_data/a01/../a01/evaluator/truth.json"].map(p => resolve(root, p));
const isolated = spawnSync(process.execPath, ["--permission", `--allow-fs-read=${probe}`, probe, ...deniedPaths], { cwd: root, env: { SystemRoot: process.env.SystemRoot ?? "C:\\Windows" }, encoding: "utf8", timeout: 10000 });
assert.equal(isolated.status, 0, isolated.stderr);
const isolation = JSON.parse(isolated.stdout);
const storage = checkStorage();
const summary = { scope: "DATA_CONTRACT_ONLY", fixtures: { complete: 20, limited: 13, injection: 21 }, branches: { checkout: 190, notifications: 120, none: 120 }, artifactSha256: createHash("sha256").update(first).digest("hex"), rejectedContracts: rejected, isolation, storage, modelEvaluation: "NOT_RUN" };
if (!process.argv.includes("--check-data")) {
  for (const [file, value] of [["001.json", a.complete], ["002.json", a.limited], ["003.json", a.injection]])
    assert.deepEqual(JSON.parse(read(`factory/02_data/a01/observable/${file}`)), value, `saved observable differs: ${file}`);
  assert.deepEqual(JSON.parse(read("factory/02_data/a01/private/branches.json")), a.branches, "saved private branches differ");
  const dataPath = "factory/02_data/output/DATA_PACKAGE.md", verifyPath = "factory/02_data/output/VERIFY.md";
  const data = read(dataPath), verification = read(verifyPath), gate = read("factory/02_data/output/HUMAN_GATE.md");
  for (const [doc, expectedPaths] of [[data, dataBindings], [verification, ["factory/02_data/CONTEXT.md", "factory/02_data/verify.mjs", dataPath, "factory/02_data/output/contract-results.json"]]]) {
    const bindings = markdownHashBindings(markdownSection(doc, /^## Declared input hashes$/));
    assert.deepEqual(bindings.map(b => b.input).sort(), [...expectedPaths].sort(), "missing, duplicate, or unexpected bindings");
    for (const b of bindings) assert.equal(await fileHash(root, resolve(root, b.input)), b.expected, `binding drift: ${b.input}`);
  }
  assert.equal(frontmatterValue(verification, "status"), "passed");
  assert.equal(frontmatterValue(data, "unit"), "a01-synthetic-revenue-investigation");
  assert.equal(frontmatterValue(data, "status"), "ready-for-review");
  assert.equal(frontmatterValue(gate, "stage"), "02_data");
  assert.equal(frontmatterValue(gate, "data_package_sha256"), await fileHash(root, resolve(root, dataPath)));
  assert.equal(frontmatterValue(gate, "verification_sha256"), await fileHash(root, resolve(root, verifyPath)));
  const decision = frontmatterValue(gate, "decision");
  assert.ok(["pending", "accepted", "changes-requested", "rejected"].includes(decision));
  assert.equal(frontmatterValue(gate, "gate_status"), decision === "pending" ? "open" : "closed");
  if (decision !== "pending") {
    assert.ok(![null, "pending"].includes(frontmatterValue(gate, "reviewer")));
    assert.ok(Number.isFinite(Date.parse(frontmatterValue(gate, "reviewed_at"))));
  }
  const saved = JSON.parse(read("factory/02_data/output/contract-results.json")); assert.deepEqual(saved, summary);
}
console.log(JSON.stringify(summary, null, 2));
