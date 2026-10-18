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

const session = { token: 'fixture-only', owner: 'local_owner', source: 'fixture_surrogate', model: 'fixture', profile: 'low',
  modelReady: true, unavailableReason: null, attemptsUsed: 0, attemptCap: 2 };
function render(data) {
  return renderToStaticMarkup(createElement(CaseDetail, { data, session, busy: false, onAction: async () => {} }));
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
