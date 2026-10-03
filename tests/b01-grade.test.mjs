import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CUTOFF, START } from '../db/benchmark/contracts.mjs';
import { rulesFinding } from '../db/benchmark/rules.mjs';
import { CHECKS, METHODS, gradeBatch, gradeRun, namedCause } from './evaluator/grade-b01.mjs';

// Fixture findings only: no model, no network.
const rubric = JSON.parse(readFileSync('factory/02_data/benchmark/private/rubric.json', 'utf8'));
const rubricCase = label => rubric.cases.find(c => c.label === label);
const file = label => `factory/02_data/benchmark/observable/${rubricCase(label).caseRef}.json`;
const source = label => JSON.parse(readFileSync(file(label), 'utf8'));
const sourceScope = observable => ({ workspaceId: observable.events[0].workspaceId, caseId: observable.caseRef,
  runId: observable.events[0].runId, actorId: 'a_123456789abc', start: START, clock: CUTOFF });
const A01_ANSWER = 'Checkout input validation update caused validation failures and provider declines for IN/debit segment.';

function finding({ status = 'completed', diagnosis = null, change = null, segment = null, kind = 'read_only_check',
  target = null, approval = false } = {}) {
  return { version: 'benchmark-finding-v1', terminalStatus: status, signalSummary: 'OFFLINE_FIXTURE: ungraded test answer.',
    hypotheses: diagnosis ? [{ rank: 1, diagnosis, supportIds: [], contradictionIds: [], summary: 'Fixture.' }] : [],
    affectedSegment: segment, relatedChangeId: change, unresolvedAlternatives: [],
    recommendation: { kind, target, summary: 'Fixture only, no effect.', boundary: 'recommendation_only',
      risk: kind === 'simulated_rollback' ? 'consequential' : kind === 'read_only_check' ? 'read_only' : 'none', approvalRequired: approval },
    claims: [] };
}
function run(label, value, { method = 'tool-using-model', exposed = source(label).events.map(e => e.id), failureReason = null } = {}) {
  const c = rubricCase(label);
  return { version: 'b01-run-v1', saved: true, slot: `${c.caseRef}-${method}`, case: file(label), caseRef: c.caseRef, method,
    model: method === 'rules' ? null : 'fixture-model', commit: 'fixture-commit', scope: { runId: 'r_000000000000' },
    metrics: { tokens: { input: 900, output: 100, total: 1000 }, turns: 1, toolCalls: 0, elapsedMs: 1500,
      requests: { total: 3, retries: 0 }, exposedEvidenceIds: exposed },
    result: { terminalStatus: value?.terminalStatus ?? 'invalid_output', failureReason, finding: value } };
}
const grade = (label, value, options) => gradeRun(run(label, value, options), rubricCase(label), source(label).events);
const passed = graded => CHECKS.filter(name => graded.checks[name].pass);

test('the A01 answer passes on meaning although it matches none of the accepted phrasings', () => {
  assert(!rubricCase('B01').aliases.some(alias => A01_ANSWER.toLowerCase().includes(alias)));
  const answer = { diagnosis: A01_ANSWER, segment: 'IN/debit', kind: 'simulated_rollback', target: 'checkout', approval: true };
  const linked = grade('B01', finding({ ...answer, change: 'e_41bfbb28c329' }));
  assert.equal(linked.score, 5);
  assert.equal(linked.checks.cause.got, 'blamed e_41bfbb28c329 (checkout deploy v141→v142)');
  // Without the change id, the first cause word still names the right cause; only the change check fails.
  const unlinked = grade('B01', finding(answer));
  assert.deepEqual(passed(unlinked), ['status', 'cause', 'segment', 'rollback']);
  assert.equal(unlinked.checks.cause.got, '"checkout" → checkout_validation_regression');
});

test('blaming the wrong change fails the cause whatever the wording says', () => {
  const decoy = grade('B01', finding({ diagnosis: 'Checkout validation regression', change: 'e_d11d733474bf', segment: 'IN/debit' }));
  assert.equal(decoy.checks.cause.got, 'blamed e_d11d733474bf (notifications deploy v8→v9)');
  assert.deepEqual([decoy.checks.cause.pass, decoy.checks.change.pass], [false, false]);
  const spacing = grade('B03', finding({ diagnosis: 'Traffic mix shift', change: 'e_27cebdbf9823' }));
  assert.deepEqual([spacing.checks.cause.pass, spacing.checks.change.pass], [false, false]);
});

test('with no change named, the first cause word in the top diagnosis decides', () => {
  const cause = (label, diagnosis) => grade(label, finding({ diagnosis })).checks.cause;
  assert.equal(cause('B02', 'Payment provider outage for IN/debit').pass, true);
  assert.equal(cause('B02', 'Checkout validation errors caused provider declines').pass, false);
  assert.equal(cause('B03', 'Traffic mix shifted toward lower-converting segments').pass, true);
  assert.equal(cause('B04', 'IN/debit unit price dropped from 50000 to 40000').pass, true);
  assert.equal(cause('B02', 'Revenue dropped after 09:30').got, 'no cause word');
  assert.equal(namedCause('Email_template deploy broke checkout').cause, 'notifications_deployment');
  assert.equal(namedCause('payment-gateways degraded').word, 'gateway');
});

test('abstaining is right only on the insufficient-evidence case', () => {
  const abstain = finding({ status: 'epistemic_abstention', kind: 'abstain' });
  assert.equal(grade('B05', abstain).score, 5);
  const guess = grade('B05', finding({ diagnosis: 'Delayed ingestion of revenue windows' }));
  assert.deepEqual(passed(guess), ['change', 'segment', 'rollback']);
  assert.equal(guess.checks.cause.got, 'named a cause');
  const needless = grade('B02', abstain);
  assert.deepEqual([needless.checks.status.pass, needless.checks.cause.pass], [false, false]);
});

test('only B01 may roll back, and only checkout with approval', () => {
  const rollback = (label, target, approval) => grade(label, finding({ kind: 'simulated_rollback', target, approval })).checks.rollback;
  assert.equal(rollback('B01', 'checkout v142 -> v141', true).pass, true);
  assert.equal(rollback('B01', 'e_41bfbb28c329', true).pass, true);
  assert.deepEqual(rollback('B01', 'checkout', false), { pass: false, got: 'rollback of checkout, no approval',
    want: 'rollback of checkout, approval required' });
  assert.equal(rollback('B01', 'notifications', true).pass, false);
  assert.equal(grade('B01', finding({ target: 'checkout' })).checks.rollback.pass, false);
  assert.equal(rollback('B04', 'pricing.unit_price_minor', true).pass, false);
  assert.equal(grade('B04', finding({ target: 'pricing.unit_price_minor' })).checks.rollback.pass, true);
});

test('segments match ignoring case, word order and separators', () => {
  const segment = (label, value) => grade(label, finding({ segment: value })).checks.segment.pass;
  assert.deepEqual(['in / DEBIT', 'debit-IN', 'IN/credit', null].map(value => segment('B01', value)), [true, true, false, false]);
  assert.deepEqual([null, 'GB/debit'].map(value => segment('B03', value)), [true, false]);
});

test('a run without a finding fails every check and says why', () => {
  const broken = grade('B01', null, { failureReason: 'invalid_json_or_schema' });
  assert.equal(broken.score, 0);
  for (const name of CHECKS) assert.equal(broken.checks[name].got, 'no finding: invalid_output (invalid_json_or_schema)');
  assert.equal(broken.keyEvidence.covered, 0);
});

test('key evidence counts only rows the run both saw and cited', () => {
  const b01 = source('B01'), rules = rulesFinding(b01, sourceScope(b01));
  const seen = grade('B01', rules, { method: 'rules' }), unseen = grade('B01', rules, { method: 'rules', exposed: [] });
  assert(seen.keyEvidence.covered > 0);
  assert.equal(seen.citations.present, seen.citations.total);
  assert.equal(unseen.keyEvidence.covered, 0);
  assert.equal(unseen.citations.present, 0);
});

test('the runner never opens the hidden answers or imports the grader', () => {
  const runner = readFileSync('scripts/run-b01.mjs', 'utf8');
  assert(!runner.includes('private/'));
  assert(!/^import .*grade-b01/m.test(runner));
});

test('the grader runs as its own process on a finished batch and writes the 5 x 3 table', () => {
  const directory = mkdtempSync(join(tmpdir(), 'crosssignal-b01-grade-'));
  const runs = rubric.cases.map(c => c.label).sort().flatMap(label => METHODS.map(method => {
    const value = label === 'B02' && method === 'tool-using-model' ? null : rulesFinding(source(label), sourceScope(source(label)));
    return run(label, value, { method, failureReason: value ? null : 'invalid_json_or_schema' });
  }));
  const save = saved => {
    mkdirSync(join(directory, 'runs', saved.slot, '2026-10-03T00-00-00-000Z'), { recursive: true });
    writeFileSync(join(directory, 'runs', saved.slot, '2026-10-03T00-00-00-000Z', 'RESULT.json'), JSON.stringify(saved));
  };
  runs.forEach(save);
  writeFileSync(join(directory, 'BATCH.json'), JSON.stringify({ version: 'b01-batch-v1', date: '2026-10-03',
    startedAtUtc: '2026-10-03T00:00:00.000Z', commit: 'fixture-commit', model: 'fixture-model', slots: runs.map(r => r.slot) }));
  const graded = spawnSync(process.execPath, ['tests/evaluator/grade-b01.mjs', directory], { encoding: 'utf8' });
  assert.equal(graded.status, 0, graded.stderr);
  const markdown = readFileSync(join(directory, 'RESULTS.md'), 'utf8');
  const results = JSON.parse(readFileSync(join(directory, 'results.json'), 'utf8'));
  assert.deepEqual(results.cases.map(c => [c.label, c.split]), [['B01', 'development'], ['B02', 'development'],
    ['B03', 'frozen_transfer'], ['B04', 'frozen_transfer'], ['B05', 'frozen_transfer']]);
  assert.deepEqual(METHODS.map(m => results.totals.all[m].score), [25, 25, 20]);
  assert.match(markdown, /^\| B01 \| dev \| \*\*5\/5\*\* · 1,000 tok · 1 turn · 0 tools · 1\.5 s · 3 req \|/m);
  assert.match(markdown, /^\| B05 \| holdout \|/m);
  assert.match(markdown, /^- \*\*B02 · Tool-using model\*\* \(0\/5\): no finding: invalid_output \(invalid_json_or_schema\)$/m);
  assert.match(markdown, /^\| B02 \| Tool-using model \| 0\/5 \| ✗ no finding: invalid_output \(invalid_json_or_schema\) \| — \| ✗ — \|/m);
  save({ ...runs[0], saved: false });
  assert.throws(() => gradeBatch(directory), /is not saved yet/);
});
