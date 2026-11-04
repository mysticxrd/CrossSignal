import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { digest } from '../db/benchmark/contracts.mjs';
import { RUBRIC, CASES } from './evaluator/b21-b24/generate.mjs';
import { compareBatches, renderComparison } from './evaluator/compare-b01.mjs';
import { METHODS, TRUTH_MODES, constantScores, gradeBatch, renderResults } from './evaluator/grade-b01.mjs';
import { firstDifference, stepsOf } from './evaluator/twin-report.mjs';

// Fixture findings only: no model and no network. Each answer class is written out, then graded against the frozen twins.
const rubric = JSON.parse(readFileSync(RUBRIC, 'utf8')).cases;
const fileOf = c => `${CASES}/${c.caseRef}.json`;
const sourceOf = label => JSON.parse(readFileSync(fileOf(rubric.find(c => c.label === label)), 'utf8'));
const parent = mkdtempSync(join(tmpdir(), 'crosssignal-twin-report-'));
const finding = ({ status = 'epistemic_abstention', diagnosis = null, alternatives = [], change = null, segment = null, kind = 'read_only_check',
  target = null, approval = false, support = [] } = {}) => ({ terminalStatus: status,
  hypotheses: diagnosis ? [{ rank: 1, diagnosis, supportIds: support, contradictionIds: [], summary: 'fixture' }] : [],
  affectedSegment: segment, relatedChangeId: change, unresolvedAlternatives: alternatives,
  recommendation: { kind, target, summary: 'fixture', approvalRequired: approval }, claims: [] });
const open = () => finding({ alternatives: ['Late ingestion', 'A real provider outage hidden by the missing rows'] });
const dismissive = () => finding({ diagnosis: 'Delayed ingestion', kind: 'none' });
const calm = () => finding({ status: 'completed', diagnosis: 'No incident', kind: 'none' });
const lateRows = label => sourceOf(label).events.filter(e => (e.type === 'revenue_window' && e.payload.segment === 'IN/debit' && e.at > '2026-09-01T09:30:00.000Z')
  || e.type === 'service_health');
// The right rollback, citing only the deploy: 5/5 from timing alone, with no late row cited.
const timing = label => { const change = sourceOf(label).events.find(e => e.type === 'deployment').id;
  return finding({ status: 'completed', diagnosis: 'Payment provider regression', change, segment: 'IN/debit', kind: 'simulated_rollback', target: 'payment-provider', approval: true, support: [change] }); };

// One finished batch. `answers` maps `label` or `label-method` to a finding, or to { ending } for a run with no finding.
function batch(name, { started = '2026-11-02T01:00:00.000Z', answers = {}, steps = {}, stopped = [], interrupted = [], sha = {} } = {}) {
  const directory = join(parent, name), slots = [];
  for (const c of rubric) for (const method of METHODS) {
    const slot = `${c.caseRef}-${method}`, source = sourceOf(c.label);
    const answer = answers[`${c.label}-${method}`] ?? answers[c.label] ?? calm();
    const run = { version: 'b01-run-v1', saved: true, slot, case: fileOf(c), caseRef: c.caseRef, method, commit: 'fixture-commit', model: 'fixture-model',
      scope: { runId: 'r_000000000000' }, metrics: { tokens: { input: 0, output: 0, total: 0 }, turns: 1, toolCalls: 0, elapsedMs: 1, requests: { total: 1, retries: 0 },
        exposedEvidenceIds: method === 'tool-using-model' ? (steps[c.label] ?? []).flatMap(s => s.rows.map(r => r.id)) : source.events.map(e => e.id) },
      result: { truthMode: 'SIMULATED', terminalStatus: answer.ending ?? answer.terminalStatus, failureReason: answer.ending ?? null, finding: answer.ending ? null : answer } };
    const folder = join(directory, 'runs', slot, 'attempt');
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, 'RESULT.json'), JSON.stringify(run));
    writeFileSync(join(folder, 'HISTORY.json'), JSON.stringify(method === 'tool-using-model' ? history(steps[c.label] ?? []) : []));
    if (stopped.includes(`${c.label}-${method}`)) {
      mkdirSync(join(directory, 'runs', slot, 'earlier'), { recursive: true });
      writeFileSync(join(directory, 'runs', slot, 'earlier', 'RESULT.json'), JSON.stringify({ ...run, saved: false, result: { ...run.result, failureReason: 'http_failure' } }));
    }
    if (interrupted.includes(`${c.label}-${method}`)) mkdirSync(join(directory, 'runs', slot, 'killed'), { recursive: true });
    slots.push(slot);
  }
  writeFileSync(join(directory, 'BATCH.json'), JSON.stringify({ version: 'b01-batch-v1', truthMode: 'SIMULATED', date: '2026-11-02', startedAtUtc: started,
    commit: 'fixture-commit', model: 'fixture-model', profile: 'minimal', tokenLimits: null, requestGapMs: 4500, slots,
    cases: rubric.map(c => ({ caseRef: c.caseRef, file: fileOf(c), sha256: sha[c.label] ?? digest(sourceOf(c.label)) })) }));
  return directory;
}
function history(steps) {
  return steps.flatMap((s, i) => [{ kind: 'tool_attempt', payload: JSON.stringify({ attempt: i + 1, query: s.query }) },
    { kind: 'tool_result', payload: JSON.stringify({ attempt: i + 1, result: { events: s.rows } }) }]);
}
const row = (t, label, method = 'tool-using-model') => t.runs.find(r => r.label === label && r.method === method);
const revenue = cursor => ({ tool: 'revenue.inspect', arguments: { cursor, end: '2026-09-01T10:00:00.000Z', limit: 50, segment: null, start: '2026-09-01T09:00:00.000Z' } });
const revenueRows = label => sourceOf(label).events.filter(e => ['revenue_window', 'observation_status'].includes(e.type));
const health = { tool: 'engineering.inspect', arguments: { cursor: null, kind: 'health', service: 'payment-provider' } };

test('every answer class leads somewhere different in each world', () => {
  const { twins } = gradeBatch(batch('classes', { answers: { B21: dismissive(), B22: dismissive(), B23: timing('B23'), B24: open(),
    'B21-rules': open(), 'B22-rules': open(), 'B23-rules': calm(), 'B24-rules': timing('B24'),
    'B21-single-shot-model': timing('B21'), 'B22-single-shot-model': timing('B22'), 'B23-single-shot-model': open(), 'B24-single-shot-model': calm() } }));
  const led = (label, method) => [row(twins, label, method).answer, row(twins, label, method).consequence];
  assert.deepEqual(led('B21'), ['closed', 'closed, right only by luck']);
  assert.deepEqual(led('B22'), ['closed', 'outage left running']);
  assert.deepEqual(led('B21', 'rules'), ['open', 'waits, then closes when the data lands']);
  assert.deepEqual(led('B22', 'rules'), ['open', 'waits, then catches it when the data lands']);
  assert.deepEqual(led('B21', 'single-shot-model'), ['rollback', 'needless rollback put to a person']);
  assert.deepEqual(led('B22', 'single-shot-model'), ['rollback', 'rollback put to a person on a guess']);
  assert.deepEqual(led('B23'), ['rollback', 'needless rollback put to a person']);
  assert.deepEqual(led('B23', 'rules'), ['closed', 'closed, rightly']);
  assert.deepEqual(led('B23', 'single-shot-model'), ['open', 'still waiting, though the data has landed']);
  assert.deepEqual(led('B24'), ['open', 'still waiting, though the data has landed']);
  assert.deepEqual(led('B24', 'rules'), ['rollback', 'rollback put to a person']);
  assert.deepEqual(led('B24', 'single-shot-model'), ['closed', 'outage left running']);
});

test('a rollback nobody is asked to approve says so', () => {
  const unasked = { ...timing('B24'), recommendation: { ...timing('B24').recommendation, approvalRequired: false } };
  const { twins } = gradeBatch(batch('unasked', { answers: { B24: unasked } }));
  assert.equal(row(twins, 'B24').consequence, 'rollback proposed without asking a person');
});

test('the report never changes the five-check score', () => {
  const results = gradeBatch(batch('score', { answers: { B21: open(), B22: dismissive(), B24: timing('B24') } }));
  for (const r of results.twins.runs) assert.equal(r.score, results.runs.find(g => g.label === r.label && g.method === r.method).score);
  assert.equal(row(results.twins, 'B21').score, 5);
  assert.equal(row(results.twins, 'B22').score, 4);
  assert.equal(row(results.twins, 'B24').score, 5);
});

test('support separates what was available, read and cited, so a 5/5 from timing alone shows', () => {
  const late = lateRows('B24'), steps = { B24: [{ query: revenue(null), rows: late.slice(0, 2) }] };
  const results = gradeBatch(batch('support', { answers: { B24: timing('B24'), 'B24-single-shot-model': finding({ status: 'completed', diagnosis: 'Payment provider regression',
    change: sourceOf('B24').events.find(e => e.type === 'deployment').id, segment: 'IN/debit', kind: 'simulated_rollback', target: 'payment-provider', approval: true, support: late.map(e => e.id) }) }, steps }));
  const { twins } = results, counts = (label, method) => ['available', 'read', 'cited'].map(key => row(twins, label, method)[key]);
  // The rows that differ between the worlds are the two late IN/debit windows and the health reading, found across cases by content.
  assert.equal(late.length, 3);
  assert.deepEqual(counts('B24'), [3, 2, 0]);
  assert.deepEqual(counts('B24', 'single-shot-model'), [3, 3, 3]);
  assert.deepEqual(counts('B23', 'rules'), [3, 3, 0]);
  // At T1 those rows have not landed, so no run can have read them.
  assert.deepEqual(counts('B21', 'rules'), [0, 0, 0]);
  const markdown = renderResults(results);
  assert.match(markdown, /may be timing rather than evidence: .*B24 Tool-using in batch 1 \(cited 0 of 3\)/);
  assert.doesNotMatch(markdown, /B24 Single-shot in batch 1/);
});

test('noise counts B21 and B22 only when they got different answers', () => {
  const { twins } = gradeBatch(batch('noise', { answers: { 'B21-tool-using-model': open(), 'B22-tool-using-model': dismissive(),
    'B21-single-shot-model': open(), 'B22-single-shot-model': open(), 'B21-rules': { ending: 'usage_unknown' }, 'B22-rules': calm() } }));
  const noise = method => twins.noise.find(n => n.method === method);
  assert.deepEqual([noise('tool-using-model').comparable, noise('tool-using-model').different], [true, true]);
  assert.deepEqual([noise('single-shot-model').comparable, noise('single-shot-model').different], [true, false]);
  // A run that ended outside the model cannot disagree with anything.
  assert.deepEqual([noise('rules').comparable, noise('rules').different], [false, false]);
  // The same class under a different status is still a different answer.
  const status = gradeBatch(batch('noise-status', { answers: { B21: open(), B22: { ...open(), terminalStatus: 'completed' } } })).twins.noise;
  assert.equal(status.find(n => n.method === 'tool-using-model').different, true);
});

test('first difference names the step, the query and the evidence ids, and ignores what only names the case', () => {
  const t1 = revenueRows('B21'), t2 = revenueRows('B23'), step = (query, rows) => ({ query: stepsOf(history([{ query, rows }]))[0].query, rows });
  // Same rows under other ids: nothing differs, and a cursor's case hash doesn't count.
  const paged = hash => [step(revenue(`${hash}:50`), t1)];
  assert.equal(firstDifference(paged('aaa'), paged('bbb')), 'no tool step differs (1 steps)');
  // Same query, later rows.
  const where = firstDifference([step(revenue(null), t1)], [step(revenue(null), t2)]);
  assert.match(where, /^step 1: both asked `revenue\.inspect /);
  const newest = t2.find(e => e.type === 'revenue_window' && e.payload.segment === 'IN/debit' && e.at > '2026-09-01T09:30:00.000Z');
  assert(where.includes(`\`${newest.id}\``), where);
  // A different query, and a run that stopped early.
  assert.match(firstDifference([step(revenue(null), t1)], [step(health, [])]), /^step 1: T1 asked `revenue\.inspect .*`, T2 asked `engineering\.inspect /);
  assert.match(firstDifference([step(revenue(null), t1)], [step(revenue(null), t1), step(health, [])]), /^step 2: T1 had stopped, T2 asked /);
  assert.match(firstDifference([step(revenue(null), t1), step(health, [])], [step(revenue(null), t1)]), /^step 2: T1 asked .*T2 had stopped$/);
  // Read from the stored history, one line per world.
  const { twins } = gradeBatch(batch('first', { steps: { B21: [{ query: revenue(null), rows: t1 }], B23: [{ query: revenue(null), rows: t2 }] } }));
  assert.deepEqual(twins.firstDifferences.map(d => [d.world, d.from, d.to]), [['harmless', 'B21', 'B23'], ['outage', 'B22', 'B24']]);
  assert.match(twins.firstDifferences[0].where, /^step 1: both asked /);
  assert.equal(twins.firstDifferences[1].where, 'no tool step differs (0 steps)');
});

test('invalid runs are reported apart and never count as model failures', () => {
  const results = gradeBatch(batch('validity', { answers: { 'B22-tool-using-model': { ending: 'usage_unknown' }, 'B21-single-shot-model': { ending: 'invalid_output' } },
    stopped: ['B21-tool-using-model'], interrupted: ['B23-tool-using-model'] }));
  const { twins } = results;
  assert.deepEqual(twins.validity.stopped, [{ label: 'B21', method: 'tool-using-model', reason: 'http_failure' }]);
  // A killed attempt leaves a folder and no result: it is listed, and the slot's saved run still counts.
  assert.deepEqual(twins.validity.interrupted, [{ label: 'B23', method: 'tool-using-model' }]);
  assert.equal(row(twins, 'B23').answer, 'closed');
  assert.deepEqual(twins.validity.outsideModel, [{ label: 'B22', method: 'tool-using-model', ending: 'usage_unknown' }]);
  assert.equal(row(twins, 'B22').answer, 'invalid');
  assert.equal(twins.firstDifferences[1].where, 'not comparable: a run was invalid');
  // Invalid output is the model's own failure, so it stays in the table as no answer.
  assert.equal(row(twins, 'B21', 'single-shot-model').answer, 'no answer');
  const markdown = renderResults(results);
  assert.match(markdown, /\| B22 \| outage, T1 \| Tool-using \| invalid \| 0\/0 \| 1× invalid run \|/);
  assert.match(markdown, /1 attempt stopped by the provider, kept unscored \(B21 Tool-using: http_failure\)/);
  assert.match(markdown, /1 attempt interrupted with no result and rerun \(B23 Tool-using\)/);
  assert.match(markdown, /1 run ended outside the model and left out above \(B22 Tool-using: usage_unknown\)/);
  // Different evidence from what the run saw makes the batch's pair say nothing.
  const changed = gradeBatch(batch('changed', { sha: { B22: 'not-the-frozen-hash' } })).twins;
  assert.deepEqual(changed.validity.changedFiles, [fileOf(rubric.find(c => c.label === 'B22'))]);
  assert.deepEqual(changed.validity.interrupted, []);
  assert(changed.noise.every(n => !n.comparable));
  assert.match(renderTwinsOf(changed), /\*\*case files changed since the run: /);
});
const renderTwinsOf = twins => renderResults({ ...gradeBatch(batch('wrapper')), twins });

test('the do-nothing policies are scored by the same grader, and only the T2 cases tell a fixed sentence from reading', () => {
  const { constants } = gradeBatch(batch('constants'));
  assert.deepEqual(constants.map(c => [c.name, c.score, c.cause, c.byCase]), [
    ['Always "no incident"', 12, 1, { B21: 3, B22: 3, B23: 5, B24: 1 }],
    ['Always abstain', 11, 0, { B21: 4, B22: 4, B23: 3, B24: 0 }],
    ['Always abstain, keeping an outage open', 13, 2, { B21: 5, B22: 5, B23: 3, B24: 0 }],
    ['Always blame the newest change and roll back', 8, 1, { B21: 1, B22: 1, B23: 2, B24: 4 }]]);
  assert.deepEqual(constants.map(c => [c.maxScore, c.runs]), Array(4).fill([20, 4]));
});

test('the policies reproduce what the same sentences scored on B16-B20', () => {
  const { cases } = JSON.parse(readFileSync('tests/evaluator/b16-b20/rubric.json', 'utf8'));
  const sources = cases.map(c => JSON.parse(readFileSync(`db/benchmark/cases/b16-b20/${c.caseRef}.json`, 'utf8')));
  assert.deepEqual(constantScores(sources, cases, TRUTH_MODES.SIMULATED).map(c => c.score), [16, 13, 13, 10]);
});

test('a comparison lists each batch of a twin pair in start order', () => {
  const answers = { B21: open(), B22: dismissive(), B24: timing('B24') };
  const late = batch('compare-late', { started: '2026-11-02T03:00:00.000Z', answers: { ...answers, B22: open() } });
  const early = batch('compare-early', { started: '2026-11-02T02:00:00.000Z', answers });
  const comparison = compareBatches([late, early]), markdown = renderComparison(comparison);
  assert.deepEqual(comparison.twins.map(t => t.batch), ['2026-11-02T02:00:00.000Z', '2026-11-02T03:00:00.000Z']);
  assert.match(markdown, /\| B22 \| outage, T1 \| Tool-using \| 4, 5 \| 1\/2 \| 1× outage left running; 1× waits, then catches it when the data lands \| none available \| none available \|/);
  assert.match(markdown, /2 batches can show a pattern, not prove improvement; passing makes a change eligible for human review/);
  assert.match(markdown, /Commit `fixture-comm` pins the grader version/);
  assert.match(markdown, /\| Tool-using \| abstained, open \/ abstained, closed \| abstained, open \/ abstained, open \| 1 of 2 \|/);
  assert.match(markdown, /^- Batch 2, outage \(B22 → B24\): no tool step differs \(0 steps\)\. Answers: open → rollback\.$/m);
  assert.match(markdown, /^## Do-nothing policies$/m);
  assert.match(markdown, /^\| Rules \| \d+, \d+ \| \d+, \d+ \| \|$/m);
});
