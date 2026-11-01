import assert from 'node:assert/strict';
import test from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { canonical, CUTOFF, START, validateObservable } from '../db/benchmark/contracts.mjs';
import { prepareGemini } from '../db/benchmark/gemini-context.mjs';
import { rulesFinding } from '../db/benchmark/rules.mjs';
import { evaluatePredicate } from '../factory/02_data/benchmark/predicates.mjs';
import { CASES, LABELS, RUBRIC, frozenFiles } from './evaluator/b21-b24/generate.mjs';
import { CASE_SETS, DEFAULT_SETS } from '../scripts/run-b01.mjs';
import { RUBRICS, gradeCause, gradeRun } from './evaluator/grade-b01.mjs';

// Offline only: no model, no network. The twins must stay frozen, truly matched, and invisible to the model.
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const folder = dir => readdirSync(dir).filter(name => name.endsWith('.json')).sort().map(name => read(`${dir}/${name}`));
const twins = folder(CASES), rubric = read(RUBRIC);
const older = ['factory/02_data/benchmark/observable', 'db/benchmark/cases/b06-b10', 'db/benchmark/cases/b11-b15'].flatMap(folder);
const rubricOf = label => rubric.cases.find(c => c.label === label);
const observable = label => twins.find(o => o.caseRef === rubricOf(label).caseRef);
const scopeOf = o => ({ workspaceId: o.events[0].workspaceId, caseId: o.caseRef, runId: o.events[0].runId,
  actorId: 'a_123456789abc', start: START, clock: CUTOFF });
// What a person or model can read in a row: everything except the ids and hashes that name the case.
const seen = o => o.events.map(({ type, at, source, payload }) => canonical({ type, at, source, payload })).sort();
const finding = (fields = {}) => ({ terminalStatus: 'epistemic_abstention', hypotheses: [], unresolvedAlternatives: [],
  relatedChangeId: null, affectedSegment: null, recommendation: { kind: 'read_only_check', target: null, approvalRequired: false }, ...fields });
const cause = (label, fields) => gradeCause(finding(fields), rubricOf(label), observable(label).events);
const hypothesis = diagnosis => ({ diagnosis });

test('the frozen B21-B24 files are exactly what the generator writes', () => {
  const files = frozenFiles();
  assert.deepEqual(readdirSync(CASES).sort(), [...files.keys()].filter(name => name.startsWith(`${CASES}/`))
    .map(name => name.slice(CASES.length + 1)).sort());
  for (const [name, value] of files) assert.equal(canonical(read(name)), canonical(value), name);
});

test('every B21-B24 case validates and shares no case reference or evidence id with an older case', () => {
  for (const o of twins) assert.doesNotThrow(() => validateObservable(o, scopeOf(o)));
  const all = [...older, ...twins], ids = all.flatMap(o => o.events.map(e => e.id));
  assert.equal(new Set(all.map(o => o.caseRef)).size, 19);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(rubric.cases.map(c => c.label), LABELS);
  assert.deepEqual(rubric.cases.map(c => c.caseRef).sort(), twins.map(o => o.caseRef));
});

test('every rubric fact holds on its own rows, and every answer points at real evidence', () => {
  for (const c of rubric.cases) {
    const events = observable(c.label).events, row = id => events.find(e => e.id === id);
    for (const g of c.groups) {
      assert(g.evidenceIds.every(row), `${c.label} ${g.name} cites a missing row`);
      assert(evaluatePredicate(g.predicate, g.evidenceIds.map(row), g.target).supported, `${c.label} ${g.name}`);
    }
    for (const id of c.relevantChangeIds) assert.equal(row(id)?.type, 'deployment', c.label);
    assert.equal(c.split, 'twin_holdout');
  }
});

test('at T1 the twins show the same evidence and hide opposite truths', () => {
  assert.deepEqual(seen(observable('B21')), seen(observable('B22')));
  assert.notEqual(rubricOf('B21').hiddenCause, rubricOf('B22').hiddenCause);
  assert.deepEqual(rubric.cases.filter(c => c.keepOpen).map(c => c.label), ['B21', 'B22']);
  // The same two IN/debit windows and the provider health row are what is missing, so nothing else can tell them apart.
  const debit = o => o.events.filter(e => e.type === 'revenue_window' && e.payload.segment === 'IN/debit');
  assert.equal(debit(observable('B21')).length, 2);
  assert(!observable('B21').events.some(e => e.type === 'service_health'));
});

test('each T2 pull only adds to its T1 pull, and the late rows split the worlds', () => {
  const rows = o => seen({ events: o.events.filter(e => e.type !== 'observation_status') });
  for (const [before, after] of [['B21', 'B23'], ['B22', 'B24']]) {
    const later = rows(observable(after));
    for (const row of rows(observable(before))) assert(later.includes(row), `${after} lost a row from ${before}`);
    assert.equal(later.length, rows(observable(before)).length + 3, after);
  }
  const late = o => o.events.filter(e => e.type === 'revenue_window' && e.payload.segment === 'IN/debit' && e.at > '2026-09-01T09:30:00.000Z');
  assert.deepEqual(late(observable('B23')).map(e => e.payload.providerDeclines), [18, 18]);
  assert.deepEqual(late(observable('B24')).map(e => e.payload.providerDeclines), [72, 72]);
  const health = o => o.events.find(e => e.type === 'service_health').payload.providerHealthy;
  assert.deepEqual([health(observable('B23')), health(observable('B24'))], [true, false]);
  assert.deepEqual(rubricOf('B23').action.kind, 'none');
  assert.deepEqual([rubricOf('B24').action.kind, rubricOf('B24').action.approvalRequired], ['simulated_rollback', true]);
});

test('on the twins, abstaining is not enough: the outage stays open and something is recommended', () => {
  const dismissive = { hypotheses: [hypothesis('Delayed ingestion of IN/debit rows')], recommendation: { kind: 'none' } };
  for (const label of ['B21', 'B22']) {
    assert.equal(cause(label, dismissive).pass, false, label);
    assert.equal(cause(label, dismissive).got, 'abstained, outage not kept open');
    // Naming the outage and asking for the rows passes, in the hypotheses or the alternatives, in both worlds.
    const open = { unresolvedAlternatives: ['Late ingestion', 'A real payment provider outage hidden by the missing rows'] };
    assert.equal(cause(label, open).pass, true, label);
    assert.equal(cause(label, { hypotheses: [hypothesis('Possible gateway disruption')] }).pass, true, label);
    // Naming it and then doing nothing fails.
    const idle = cause(label, { ...open, recommendation: { kind: 'none' } });
    assert.deepEqual([idle.pass, idle.got], [false, 'abstained, recommended nothing']);
    // Ruling the outage out, or never mentioning it, does not keep it open.
    for (const text of ['Probably late ingestion', 'No outage, the data is late', 'Not a provider failure, just late rows', 'No provider outage'])
      assert.equal(cause(label, { unresolvedAlternatives: [text] }).pass, false, text);
    // "Cannot rule it out" does.
    assert.equal(cause(label, { unresolvedAlternatives: ['Not enough rows to rule out a provider outage'] }).pass, true, label);
    // Naming a cause outright is still wrong here.
    assert.equal(cause(label, { terminalStatus: 'completed', hypotheses: [hypothesis('Payment provider outage')] }).got, 'named a cause');
  }
});

test('the frozen rules baseline abstains on the twins but keeps no outage open', () => {
  for (const label of ['B21', 'B22']) {
    const o = observable(label), rules = rulesFinding(o, scopeOf(o));
    assert.equal(rules.terminalStatus, 'epistemic_abstention', label);
    assert.deepEqual(gradeCause(rules, rubricOf(label), o.events).got, 'abstained, outage not kept open', label);
  }
});

test('older abstain cases keep their old rule, so past batches regrade the same', () => {
  const b13 = read('tests/evaluator/b11-b15/rubric.json').cases.find(c => c.label === 'B13');
  const dismissive = finding({ hypotheses: [hypothesis('Delayed ingestion')], recommendation: { kind: 'none' } });
  assert.deepEqual(gradeCause(dismissive, b13, []), { pass: true, got: 'abstained', want: 'abstain' });
});

test('a dismissive abstention scores 5/5 on B13 and 4/5 on both twins', () => {
  const dismissive = finding({ hypotheses: [{ ...hypothesis('Delayed ingestion'), supportIds: [], contradictionIds: [] }],
    claims: [], recommendation: { kind: 'none' } });
  const score = (rubricCase, o) => gradeRun({ caseRef: o.caseRef, method: 'single-shot-model', model: 'fixture', scope: { runId: 'r' },
    result: { finding: dismissive, terminalStatus: dismissive.terminalStatus },
    metrics: { exposedEvidenceIds: [], tokens: { total: 0, input: 0, output: 0 }, turns: 0, toolCalls: 0, elapsedMs: 0, requests: { total: 0 } } },
  rubricCase, o.events).score;
  const b13 = read('tests/evaluator/b11-b15/rubric.json').cases.find(c => c.label === 'B13');
  assert.equal(score(b13, folder('db/benchmark/cases/b11-b15').find(o => o.caseRef === b13.caseRef)), 5);
  for (const label of ['B21', 'B22']) assert.equal(score(rubricOf(label), observable(label)), 4, label);
});

test('the twins are a named set of their own, outside the default batch', () => {
  assert.equal(CASE_SETS['b21-b24'], CASES);
  assert(!DEFAULT_SETS.includes('b21-b24'));
  assert(RUBRICS.includes(RUBRIC));
});

test('public B21-B24 files carry no label, rubric field or answer', () => {
  const answers = [...new Set(rubric.cases.flatMap(c => [c.hiddenCause, c.expectedDiagnosis]))];
  for (const name of readdirSync(CASES)) {
    const text = readFileSync(`${CASES}/${name}`, 'utf8');
    assert.doesNotMatch(text, /\bB\d\d\b/, name);
    assert.doesNotMatch(text, /EVALUATOR_ONLY|rubric|privateCanary|hiddenCause|expectedDiagnosis|aliases|keepOpen|twin/i, name);
    for (const answer of answers) assert(!text.includes(answer), `${name} names ${answer}`);
  }
});

test('model requests for B21-B24 build without a label, canary or rubric field', () => {
  const query = { tool: 'revenue.inspect', arguments: { start: START, end: CUTOFF, segment: null, limit: 50, cursor: null } };
  for (const o of twins) for (const options of [{}, { method: 'tool-using-model', queries: [query] }]) {
    const body = canonical(prepareGemini(o, scopeOf(o), options).body);
    assert.doesNotMatch(body, /\bB\d\d\b|EVALUATOR_ONLY|hiddenCause|expectedDiagnosis|keepOpen/);
  }
});
