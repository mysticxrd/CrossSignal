import assert from 'node:assert/strict';
import test from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { canonical, CUTOFF, START, SEGMENTS, validateObservable } from '../db/benchmark/contracts.mjs';
import { prepareGemini } from '../db/benchmark/gemini-context.mjs';
import { evaluatePredicate } from '../factory/02_data/benchmark/predicates.mjs';
import { CASES, LABELS, RUBRIC, frozenFiles } from './evaluator/b11-b15/generate.mjs';

// Offline only: no model, no network. The second fresh holdout must stay frozen, sound and invisible to the model.
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const folder = dir => readdirSync(dir).filter(name => name.endsWith('.json')).sort().map(name => read(`${dir}/${name}`));
const fresh = folder(CASES), rubric = read(RUBRIC);
const older = [...folder('factory/02_data/benchmark/observable'), ...folder('db/benchmark/cases/b06-b10')];
const observable = label => fresh.find(o => o.caseRef === rubric.cases.find(c => c.label === label).caseRef);
const scopeOf = o => ({ workspaceId: o.events[0].workspaceId, caseId: o.caseRef, runId: o.events[0].runId,
  actorId: 'a_123456789abc', start: START, clock: CUTOFF });

test('the frozen B11-B15 files are exactly what the generator writes', () => {
  const files = frozenFiles();
  assert.deepEqual(readdirSync(CASES).sort(), [...files.keys()].filter(name => name.startsWith(`${CASES}/`))
    .map(name => name.slice(CASES.length + 1)).sort());
  for (const [name, value] of files) assert.equal(canonical(read(name)), canonical(value), name);
});

test('every B11-B15 case validates and shares no case reference or evidence id with B01-B10', () => {
  for (const o of fresh) assert.doesNotThrow(() => validateObservable(o, scopeOf(o)));
  const all = [...older, ...fresh], ids = all.flatMap(o => o.events.map(e => e.id));
  assert.equal(new Set(all.map(o => o.caseRef)).size, 15);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(rubric.cases.map(c => c.label), LABELS);
  assert.deepEqual(rubric.cases.map(c => c.caseRef).sort(), fresh.map(o => o.caseRef));
});

test('every rubric fact holds on its own rows, and every answer points at real evidence', () => {
  for (const c of rubric.cases) {
    const events = fresh.find(o => o.caseRef === c.caseRef).events, row = id => events.find(e => e.id === id);
    for (const g of c.groups) {
      assert(g.evidenceIds.every(row), `${c.label} ${g.name} cites a missing row`);
      assert(evaluatePredicate(g.predicate, g.evidenceIds.map(row), g.target).supported, `${c.label} ${g.name}`);
    }
    for (const id of c.relevantChangeIds) assert(['deployment', 'pricing_configuration'].includes(row(id)?.type), `${c.label} ${id}`);
    assert(c.affectedSegment === null || SEGMENTS.includes(c.affectedSegment), c.label);
    assert.equal(c.split, 'fresh_holdout_2');
  }
});

test('the set holds decoy deploys whose service shows no failures, real changes, and one abstention', () => {
  const windows = (o, segment) => o.events.filter(e => e.type === 'revenue_window' && e.payload.segment === segment);
  const validation = rows => rows.map(e => e.payload.validationErrors / e.payload.attempts);
  // A decoy checkout deploy: it went out, yet validation errors per attempt never move in any segment afterwards.
  for (const label of ['B11', 'B12', 'B14']) {
    const o = observable(label), c = rubric.cases.find(r => r.label === label);
    const decoy = o.events.find(e => e.type === 'deployment' && e.payload.service === 'checkout');
    assert(decoy && !c.relevantChangeIds.includes(decoy.id), label);
    for (const segment of SEGMENTS) assert.equal(new Set(validation(windows(o, segment))).size, 1, `${label} ${segment}`);
  }
  // The real changes are the ones whose service does show failures.
  assert.deepEqual(rubric.cases.filter(c => c.relevantChangeIds.length).map(c => c.label), ['B12', 'B14']);
  assert.deepEqual(rubric.cases.filter(c => c.action.kind === 'abstain').map(c => c.label), ['B13']);
  // B13's IN/debit windows after 09:30 arrived after the case clock, so they are not in the public file.
  assert.equal(windows(observable('B13'), 'IN/debit').length, 2);
  // B15 has no change at all, so the right answer is a cause, not an abstention.
  assert(!observable('B15').events.some(e => ['deployment', 'pricing_configuration'].includes(e.type)));
});

test('public B11-B15 files carry no label, rubric field or answer', () => {
  const answers = [...new Set(rubric.cases.flatMap(c => [c.hiddenCause, c.expectedDiagnosis]))];
  for (const name of readdirSync(CASES)) {
    const text = readFileSync(`${CASES}/${name}`, 'utf8');
    assert.doesNotMatch(text, /\bB\d\d\b/, name);
    assert.doesNotMatch(text, /EVALUATOR_ONLY|rubric|privateCanary|hiddenCause|expectedDiagnosis|aliases/i, name);
    for (const answer of answers) assert(!text.includes(answer), `${name} names ${answer}`);
  }
});

test('model requests for B11-B15 build without a label, canary or rubric field', () => {
  const query = { tool: 'revenue.inspect', arguments: { start: START, end: CUTOFF, segment: null, limit: 50, cursor: null } };
  for (const o of fresh) for (const options of [{}, { method: 'tool-using-model', queries: [query] }]) {
    const body = canonical(prepareGemini(o, scopeOf(o), options).body);
    assert.doesNotMatch(body, /\bB\d\d\b|EVALUATOR_ONLY|hiddenCause|expectedDiagnosis/);
  }
});
