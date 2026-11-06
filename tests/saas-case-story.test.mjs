import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { fileURLToPath } from 'node:url';
import { tsImport } from 'tsx/esm/api';
const options = { parentURL: import.meta.url, tsconfig: fileURLToPath(new URL('../tsconfig.case.json', import.meta.url)) };
const { CaseDetail } = await tsImport('../case-lab/CaseDetail.tsx', options);
const { caseStory, SITUATIONS } = await tsImport('../case-lab/story.ts', options);
import { CaseStore } from '../db/cases/store.mjs';
import { Cases } from '../db/cases/service.mjs';
import { fixtureFinding } from './helpers/saas-fixture.mjs';

const REASON = 'Read every row on this Case before choosing.';
const NOW = '2026-10-01T10:00:00.000Z', LATER = Date.parse('2026-10-01T10:31:00.000Z');
function setup(t, scenario) {
  const store = new CaseStore(':memory:'); t.after(() => store.close());
  const cases = new Cases(store, { recordings: '.', source: 'fixture_surrogate', maxAttempts: 20, now: () => NOW });
  return { store, cases, id: cases.create(`story-${scenario}-case`, scenario) };
}
const session = s => ({ token: 'fixture-only', owner: 'local_owner', source: 'fixture_surrogate', model: 'fixture', profile: 'low', modelReady: true,
  unavailableReason: null, attemptsUsed: s.store.db.prepare('SELECT COUNT(*) AS n FROM attempts').get().n, attemptCap: 20 });
const command = (s, name, reason = '') => s.cases.command(s.id, s.store.get(s.id).revision, name, reason);
const signal = s => s.store.get(s.id).snapshot.signal;
const investigate = s => {
  const attempt = s.cases.requestInvestigation(s.id, s.store.get(s.id).revision);
  s.cases.attachResult(attempt, { terminalStatus: 'completed', finding: fixtureFinding(s.store.get(s.id).snapshot) });
};
const approve = s => { const { proposal } = s.store.get(s.id); s.cases.approve(s.id, proposal.hash, 'fixture_surrogate'); return proposal.hash; };
const runs = s => signal(s).detected && signal(s).sufficient;
const STAGES = [
  ['created', () => true, () => {}],
  ['waited', s => !signal(s).sufficient, s => command(s, 'wait_for_data')],
  ['investigated', () => true, s => investigate(s)],
  ['offer expired', runs, s => investigate(s), LATER],
  ['waited, investigated', s => !signal(s).sufficient, s => { command(s, 'wait_for_data'); investigate(s); }],
  ['retired', () => true, s => { investigate(s); command(s, 'continue'); }],
  ['deferred', () => true, s => command(s, 'defer', REASON)],
  ['investigated, deferred', () => true, s => { investigate(s); command(s, 'defer', REASON); }],
  ['paused', () => true, s => command(s, 'pause')],
  ['running', () => true, s => s.cases.requestInvestigation(s.id, s.store.get(s.id).revision)],
  ['watching', s => signal(s).detected, s => command(s, 'observe_without_action')],
  ['watched once', s => signal(s).detected, s => { command(s, 'observe_without_action'); command(s, 'observe'); }],
  ['watched to the end', s => signal(s).detected, s => { command(s, 'observe_without_action'); for (let i = 0; i < 3; i++) command(s, 'observe'); }],
  ['approved', runs, s => { investigate(s); if (s.store.get(s.id).proposal) approve(s); }],
  ['undo ran', runs, s => { investigate(s); if (s.store.get(s.id).proposal) s.cases.execute(approve(s)); }],
  ['undo ran, checked', runs, s => { investigate(s); if (s.store.get(s.id).proposal) { s.cases.execute(approve(s)); command(s, 'observe'); } }],
  ['closed', () => true, s => command(s, 'close_unresolved', REASON)],
];
// Runs the story's main action through the service, the way the page's button would send it.
function perform(s, action, reason) {
  if (action === 'investigate') return s.cases.requestInvestigation(s.id, s.store.get(s.id).revision);
  if (action === 'approve') return approve(s);
  command(s, action, reason);
}

test('every scenario and stage gets one plain next step that the service accepts', t => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse(NOW) });
  const offered = new Set();
  for (const scenario of Object.keys(SITUATIONS)) for (const [stage, applies, run, now = Date.parse(NOW)] of STAGES) {
    const reach = () => { const s = setup(t, scenario); if (!applies(s)) return null; run(s); return s; };
    const s = reach(); if (!s) continue;
    const name = `${scenario}, ${stage}`, data = s.store.view(s.id), story = caseStory(data, session(s), now);
    assert.ok(story.headline && story.explain, name);
    // The authored scenario is the hidden answer, so the page is named from the records and never receives it.
    assert.ok(!('scenario' in data) && s.store.list().every(row => !('scenario' in row)), name);
    assert.ok(story.step >= 1 && story.step <= 5, name);
    // Customer messages are untrusted, so none of their text may reach the words the page speaks in.
    for (const row of data.snapshot.evidence.filter(e => e.kind === 'support')) assert.ok(!`${story.headline} ${story.explain}`.includes(row.detail), name);
    const idle = data.status === 'open' && !['queued', 'running'].includes(data.investigation) && data.decision !== 'approved';
    assert.equal(!!story.primary, idle || (data.paused && data.status === 'open'), `${name}: an open, idle Case always has a next step`);
    const markup = renderToStaticMarkup(createElement(CaseDetail, { data, session: session(s), busy: false, onAction: async () => {} }));
    const mains = [...markup.matchAll(/<button class="primary" data-action="([a-z_]+)"/g)].map(match => match[1]);
    if (now === Date.parse(NOW)) assert.deepEqual(mains, story.primary ? [story.primary.action] : [], name);
    if (!story.primary) continue;
    const { action, needsReason } = story.primary; offered.add(action);
    if (now === Date.parse(NOW)) assert.equal(markup.split(`data-action="${action}"`).length - 1, 1, `${name}: the main action appears once`);
    assert.doesNotThrow(() => perform(s, action, needsReason ? REASON : ''), name);
    // A reason is asked for exactly when the service refuses to go on without one.
    if (needsReason) assert.throws(() => perform(reach(), action, ''), /reason|not_available/, name);
  }
  // Every main action the page can offer, reached at least once.
  assert.deepEqual([...offered].sort(), ['approve', 'close_no_incident', 'close_recovered', 'close_unresolved', 'investigate', 'observe',
    'observe_without_action', 'refresh_proposal', 'resume', 'wait_for_data']);
});

test('a miss after an earlier recovery reads as a relapse, not as never recovering', t => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse(NOW) });
  const s = setup(t, 'incident');
  investigate(s); s.cases.execute(approve(s));
  command(s, 'observe'); command(s, 'close_recovered'); command(s, 'observe'); command(s, 'observe');
  const data = s.store.view(s.id), story = caseStory(data, session(s));
  assert.deepEqual(data.outcomes.map(o => o.state), ['criterion_met', 'criterion_met', 'criterion_not_met']);
  assert.equal(story.headline, 'Sign-ups came back, then dropped again');
  assert.match(story.explain, /recovered at an earlier check/);
});
