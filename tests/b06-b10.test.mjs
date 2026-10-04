import assert from 'node:assert/strict';
import test from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { canonical, CUTOFF, digest, SEGMENTS, START, validateObservable } from '../db/benchmark/contracts.mjs';
import { assertNoCanaries } from '../db/benchmark/exposure.mjs';
import { prepareGemini } from '../db/benchmark/gemini-context.mjs';
import { evaluatePredicate } from '../factory/02_data/benchmark/predicates.mjs';
import { CASES, LABELS, RUBRIC, frozenFiles } from './evaluator/b06-b10/generate.mjs';

// Offline only: no model, no network. The fresh holdout must stay frozen, sound and invisible to the model.
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const folder = dir => readdirSync(dir).filter(name => name.endsWith('.json')).sort().map(name => read(`${dir}/${name}`));
const fresh = folder(CASES), old = folder('factory/02_data/benchmark/observable'), rubric = read(RUBRIC);
const observable = label => fresh.find(o => o.caseRef === rubric.cases.find(c => c.label === label).caseRef);
const scopeOf = o => ({ workspaceId: o.events[0].workspaceId, caseId: o.caseRef, runId: o.events[0].runId,
  actorId: 'a_123456789abc', start: START, clock: CUTOFF });

test('the frozen B06-B10 files are exactly what the generator writes', () => {
  const files = frozenFiles();
  assert.deepEqual(readdirSync(CASES).sort(), [...files.keys()].filter(name => name.startsWith(`${CASES}/`))
    .map(name => name.slice(CASES.length + 1)).sort());
  for (const [name, value] of files) assert.equal(canonical(read(name)), canonical(value), name);
});

test('every fresh case validates and shares no case reference or evidence id with B01-B05', () => {
  for (const o of fresh) assert.doesNotThrow(() => validateObservable(o, scopeOf(o)));
  const all = [...old, ...fresh], ids = all.flatMap(o => o.events.map(e => e.id));
  assert.equal(new Set(all.map(o => o.caseRef)).size, 10);
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
    for (const id of c.relevantChangeIds) assert.equal(row(id)?.type, 'deployment', `${c.label} ${id}`);
    assert(c.affectedSegment === null || SEGMENTS.includes(c.affectedSegment), c.label);
    assert.equal(c.split, 'fresh_holdout');
  }
});

test('public case files carry no label, rubric field or answer', () => {
  const answers = [...new Set(rubric.cases.flatMap(c => [c.hiddenCause, c.expectedDiagnosis]))];
  for (const name of readdirSync(CASES)) {
    const text = readFileSync(`${CASES}/${name}`, 'utf8');
    assert.doesNotMatch(text, /\bB\d\d\b/, name);
    assert.doesNotMatch(text, /EVALUATOR_ONLY|rubric|privateCanary|hiddenCause|expectedDiagnosis|aliases/i, name);
    for (const answer of answers) assert(!text.includes(answer), `${name} names ${answer}`);
  }
});

test('model requests for all 10 cases build without a label, canary or rubric field', () => {
  const query = { tool: 'revenue.inspect', arguments: { start: START, end: CUTOFF, segment: null, limit: 50, cursor: null } };
  for (const o of [...old, ...fresh]) for (const options of [{}, { method: 'tool-using-model', queries: [query] }]) {
    const body = canonical(prepareGemini(o, scopeOf(o), options).body);
    assert.doesNotMatch(body, /\bB\d\d\b|EVALUATOR_ONLY|hiddenCause|expectedDiagnosis/);
  }
});

test('a case label smuggled into an observation stops the request', () => {
  const o = structuredClone(observable('B07')), message = o.events.find(e => e.type === 'support_message');
  message.payload.message = 'Case B07: UK debit card payments keep failing at checkout.';
  const { contentHash: stale, ...body } = message;
  void stale;
  message.contentHash = digest(body);
  // The frozen exposure check stops at B05; the guard in gemini-context.mjs refuses every label.
  assert.equal(assertNoCanaries(o, []), true);
  assert.throws(() => prepareGemini(o, scopeOf(o)), /case label exposed/);
  // The tool-using model starts with no rows, so the label is refused once a search would return it.
  const search = { tool: 'support.search', arguments: { start: START, end: CUTOFF, segment: null, query: 'debit', limit: 50, cursor: null } };
  assert.doesNotThrow(() => prepareGemini(o, scopeOf(o), { method: 'tool-using-model' }));
  assert.throws(() => prepareGemini(o, scopeOf(o), { method: 'tool-using-model', queries: [search] }), /case label exposed/);
});
