import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { fileURLToPath } from 'node:url';
import { tsImport } from 'tsx/esm/api';
const { CaseDetail } = await tsImport('../case-lab/CaseDetail.tsx', { parentURL: import.meta.url,
  tsconfig: fileURLToPath(new URL('../tsconfig.case.json', import.meta.url)) });
import { CaseStore } from '../db/cases/store.mjs';
import { Cases } from '../db/cases/service.mjs';
import { fixtureFinding } from './helpers/saas-fixture.mjs';

const session = { token: 'fixture-only', owner: 'local_owner', source: 'fixture_surrogate', model: 'fixture', profile: 'low',
  modelReady: true, unavailableReason: null, attemptsUsed: 0, attemptCap: 2 };
function ready(t) {
  const store = new CaseStore(':memory:'); t.after(() => store.close());
  const cases = new Cases(store, { recordings: '.', source: 'fixture_surrogate', now: () => '2026-10-01T10:00:00.000Z' });
  const id = cases.create('ui-fixture', 'incident');
  const attempt = cases.requestInvestigation(id, store.get(id).revision);
  cases.attachResult(attempt, { terminalStatus: 'completed', finding: fixtureFinding(store.get(id).snapshot) });
  return store.view(id);
}
function render(data, used = 0) {
  return renderToStaticMarkup(createElement(CaseDetail, { data, session: { ...session, attemptsUsed: used }, busy: false, onAction: async () => {} }));
}
function buttonDisabled(html, label) {
  const button = [...html.matchAll(/<button\b([^>]*)>([^<]*)<\/button>/g)].find(match => match[2] === label);
  assert.ok(button, 'Button exists: ' + label);
  return button[1].includes('disabled=');
}

test('observe without acting is offered exactly when the service accepts it', t => {
  const store = new CaseStore(':memory:'); t.after(() => store.close());
  const cases = new Cases(store, { recordings: '.', source: 'fixture_surrogate' });
  for (const scenario of ['incident', 'limited', 'ineffective', 'partial', 'incomplete', 'normal', 'spontaneous']) {
    const id = cases.create(`ui-${scenario}-case`, scenario), data = store.view(id), html = render(data);
    const offered = html.includes('>Observe without acting</button>');
    let accepted = true;
    try { cases.command(id, data.revision, 'observe_without_action'); } catch (error) { assert.equal(error.message, 'incident_not_detected'); accepted = false; }
    assert.equal(offered, accepted, scenario);
    assert.equal(offered, data.snapshot.signal.detected, scenario);
    if (!offered) assert.match(html, /no detected drop to measure recovery against/, scenario);
    assert.match(html, />Defer with reason<\/button>/, scenario);
  }
});

test('the journey marks a stage reached only when its own record exists', t => {
  const store = new CaseStore(':memory:'); t.after(() => store.close());
  const cases = new Cases(store, { recordings: '.', source: 'fixture_surrogate' });
  const reached = id => [...render(store.view(id)).matchAll(/<li class="reached"><span>\d+<\/span>(\w+)<\/li>/g)].map(match => match[1]);
  const closed = cases.create('ui-journey-closed', 'incident');
  assert.deepEqual(reached(closed), ['Signal']);
  cases.command(closed, store.view(closed).revision, 'close_unresolved', 'Closed before any investigation');
  assert.deepEqual(reached(closed), ['Signal', 'Closure']);
  const observed = cases.create('ui-journey-observed', 'incident');
  cases.command(observed, store.view(observed).revision, 'observe_without_action');
  assert.deepEqual(reached(observed), ['Signal', 'Decision', 'Simulation']);
  cases.command(observed, store.view(observed).revision, 'observe');
  assert.deepEqual(reached(observed), ['Signal', 'Decision', 'Simulation', 'Outcome']);
  const investigated = cases.create('ui-journey-investigated', 'incident');
  cases.requestInvestigation(investigated, store.view(investigated).revision);
  assert.deepEqual(reached(investigated), ['Signal', 'Investigation']);
});

test('expired saved proposal blocks approval while refresh remains available with no investigation budget', t => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-10-01T10:30:00.000Z') });
  const data = ready(t), before = JSON.stringify(data), html = render(data, 2);
  assert.match(html, /Proposal expired/);
  assert.match(html, /reuses the saved investigation and costs no model attempts/);
  assert.equal(buttonDisabled(html, 'Approve and run this simulation'), true);
  assert.equal(buttonDisabled(html, 'Refresh proposal for review'), false);
  assert.equal(buttonDisabled(html, 'Continue investigation'), true);
  assert.match(html, /Drop observed/); assert.doesNotMatch(html, /Needs investigation/);
  assert.equal(JSON.stringify(data), before);
});

test('fresh proposal remains approvable without budget but new investigations require budget', t => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-10-01T10:29:59.999Z') });
  const data = ready(t), html = render(data, 2);
  assert.match(html, /Eligible for your review/);
  assert.equal(buttonDisabled(html, 'Approve and run this simulation'), false);
  assert.equal(buttonDisabled(html, 'Run another investigation'), true);
  assert.equal(buttonDisabled(render(data, 1), 'Continue investigation'), false);
});
