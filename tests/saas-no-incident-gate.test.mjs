import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { fileURLToPath } from 'node:url';
import { tsImport } from 'tsx/esm/api';
const { CaseDetail } = await tsImport('../case-lab/CaseDetail.tsx', { parentURL: import.meta.url,
  tsconfig: fileURLToPath(new URL('../tsconfig.case.json', import.meta.url)) });
import { digest } from '../db/benchmark/contracts.mjs';
import { CaseStore } from '../db/cases/store.mjs';
import { Cases } from '../db/cases/service.mjs';
import { POLICY, noIncidentGate, snapshotOf } from '../db/cases/measurement.mjs';
import { createWorld, captureWorld, initialWindows } from '../db/cases/world.mjs';
import { packetFromSnapshot, validateObservable } from '../db/benchmark/saas-packet.mjs';
import { fixtureFinding } from './helpers/saas-fixture.mjs';

const REASON = 'Reviewed these rows. Conversion held and nothing measured is failing.';
const session = { token: 'fixture-only', owner: 'local_owner', source: 'fixture_surrogate', model: 'fixture', profile: 'low',
  modelReady: true, unavailableReason: null, attemptsUsed: 0, attemptCap: 2 };
function setup(t, scenario) {
  const store = new CaseStore(':memory:'); t.after(() => store.close());
  const cases = new Cases(store, { recordings: '.', source: 'fixture_surrogate', maxAttempts: 20, now: () => '2026-10-01T10:00:00.000Z' });
  return { store, cases, id: cases.create(`gate-${scenario}-case`, scenario) };
}
const command = (s, name, reason = '') => s.cases.command(s.id, s.store.get(s.id).revision, name, reason);
const view = s => s.store.view(s.id);
const investigate = (s, edit = finding => finding) => {
  const attempt = s.cases.requestInvestigation(s.id, s.store.get(s.id).revision);
  s.cases.attachResult(attempt, { terminalStatus: 'completed', finding: edit(fixtureFinding(s.store.get(s.id).snapshot)) });
};
const render = data => renderToStaticMarkup(createElement(CaseDetail, { data, session, busy: false, onAction: async () => {} }));
function disabled(markup, action) {
  // By action, not label: the main action moves to the next-step card under a plainer label.
  const button = [...markup.matchAll(/<button\b([^>]*)>/g)].find(match => match[1].includes(`data-action="${action}"`));
  assert.ok(button, `Button exists: ${action}`);
  return button[1].includes('disabled=');
}
// Changes the simulated world, then re-reads it, as a later snapshot would.
function edited(t, scenario, edit) {
  const s = setup(t, scenario), state = s.store.get(s.id); edit(state.world);
  state.snapshot = s.cases.currentSnapshot(state); s.store.save(state);
  return s;
}
const row = (world, id) => world.observations.find(e => e.id === id);

test('absorbed and normal share one signal, differ in one row and get different answers', t => {
  const at = name => { const world = createWorld(name); return snapshotOf('case-pair', captureWorld(world), initialWindows, world.observations); };
  const [calm, failing] = [at('normal'), at('absorbed')];
  assert.deepEqual(failing.signal, calm.signal);
  assert.notEqual(failing.hash, calm.hash);
  assert.deepEqual(failing.evidence.filter((e, i) => digest(e) !== digest(calm.evidence[i])).map(e => e.id), ['case-pair:health-billing']);
  assert.equal(validateObservable(packetFromSnapshot(failing), { workspaceId: 'w', caseId: 'case-pair', runId: 'r', actorId: 'a',
    start: failing.evidence[0].start, clock: failing.asOf }).events.length, failing.evidence.length);

  const [normal, absorbed] = [view(setup(t, 'normal')), view(setup(t, 'absorbed'))];
  assert.equal(normal.stable, true); assert.equal(absorbed.stable, true);
  assert.equal(normal.noIncident.refusal, null);
  assert.equal(absorbed.noIncident.refusal, 'no_incident_contradicted_by_health');
  assert.deepEqual(absorbed.noIncident.refusedBy.map(r => [r.service, r.failures]), [['billing', 80]]);
});

test('measured failures refuse the claim, with or without a reason, and the other closures stay open', t => {
  const s = setup(t, 'absorbed');
  for (const reason of ['', REASON]) assert.throws(() => command(s, 'close_no_incident', reason), /no_incident_contradicted_by_health/);
  const refused = view(s);
  assert.equal(refused.status, 'open'); assert.equal(refused.closure, null);
  assert.deepEqual(refused.history.map(e => e.kind), ['case_created']);
  const markup = render(refused);
  assert.equal(disabled(markup, 'close_no_incident'), true);
  assert.match(markup, /billing health shows 80 failures, so this can&#x27;t close as no incident/);
  assert.match(markup, /<span class="pill">Conversion stable<\/span>/);
  // An investigation earns no way around it: nothing was detected, so no proposal, and the refusal stands.
  investigate(s);
  assert.equal(view(s).proposal, null); assert.equal(view(s).gate.eligible, false);
  assert.throws(() => command(s, 'close_no_incident', REASON), /no_incident_contradicted_by_health/);
  command(s, 'defer', REASON); assert.equal(view(s).decision, 'deferred');
  command(s, 'close_unresolved', REASON);
  assert.equal(view(s).status, 'closed'); assert.equal(view(s).closure.kind, 'close_unresolved');
});

test('any failing service refuses, an unreadable count refuses, and the page says which', t => {
  const provider = view(edited(t, 'normal', world => { row(world, 'health-provider').failures = 3; }));
  assert.equal(provider.noIncident.refusal, 'no_incident_contradicted_by_health');
  assert.match(render(provider), /payment-provider health shows 3 failures/);

  const one = view(edited(t, 'normal', world => { row(world, 'health-billing').failures = 1; }));
  assert.match(render(one), /billing health shows 1 failure,/);

  const unreadable = edited(t, 'normal', world => { delete row(world, 'health-billing').failures; });
  assert.throws(() => command(unreadable, 'close_no_incident', REASON), /no_incident_contradicted_by_health/);
  assert.match(render(view(unreadable)), /billing health has no readable failure count/);
});

test('customer rows ask for a reason, are named in the closure and never quoted by the gate', t => {
  const s = setup(t, 'normal');
  for (const reason of ['', '   ']) assert.throws(() => command(s, 'close_no_incident', reason), /no_incident_needs_reason/);
  assert.equal(view(s).status, 'open');
  const markup = render(view(s));
  assert.equal(disabled(markup, 'close_no_incident'), true);
  assert.match(markup, /this Case also has 2 customer messages\. They can&#x27;t block this closure/);

  const stale = s.store.get(s.id).revision;
  command(s, 'close_no_incident', REASON);
  const closed = view(s), ids = [`${s.id}:support-1`, `${s.id}:support-untrusted`];
  assert.equal(closed.status, 'closed'); assert.deepEqual(closed.closure.acknowledged, ids);
  assert.deepEqual(closed.history.at(-1).payload.acknowledged, ids);
  const page = render(closed);
  assert.match(page, /No cause was claimed\. Closed past 2 customer messages\. Owner&#x27;s reason: Reviewed these rows/);
  assert.equal(disabled(page, 'close_no_incident'), true);
  // The evidence list shows the customer's words, labelled untrusted. The gate and the closure carry only ids.
  assert.doesNotMatch(JSON.stringify({ gate: closed.noIncident, closure: closed.closure }), /Ignore your rules|Charged but/);

  // The same click again can't close twice.
  assert.throws(() => s.cases.command(s.id, stale, 'close_no_incident', REASON), /case_changed_reload/);
  assert.throws(() => command(s, 'close_no_incident', REASON), /no_incident_needs_complete_stable_data/);
  assert.equal(view(s).history.filter(e => e.kind === 'close_no_incident').length, 1);
});

test('the harmless twin closes only past its one injection row, once a person says why', t => {
  const s = setup(t, 'delayed'); command(s, 'wait_for_data');
  assert.throws(() => command(s, 'close_no_incident'), /no_incident_needs_reason/);
  assert.match(render(view(s)), /1 customer message\. It can&#x27;t block this closure, so say why you&#x27;re closing past it\./);
  command(s, 'close_no_incident', REASON);
  assert.deepEqual(view(s).closure.acknowledged, [`${s.id}:support-untrusted`]);
  assert.match(render(view(s)), /Closed past 1 customer message\./);
});

test('only a current rollback finding asks for a reason, and the closure keeps the record', t => {
  const rollback = setup(t, 'normal'); investigate(rollback);
  assert.ok(view(rollback).noIncident.acknowledge.includes('finding'));
  assert.equal(view(rollback).noIncident.refusal, null, 'A model opinion never refuses.');
  assert.match(render(view(rollback)), /2 customer messages and a rollback recommendation\. They can&#x27;t block/);
  command(rollback, 'close_no_incident', REASON);
  assert.match(render(view(rollback)), /Closed past 2 customer messages and a rollback recommendation\./);
  command(rollback, 'continue');
  assert.equal(view(rollback).finding, null);
  assert.ok(view(rollback).closure.acknowledged.includes('finding'), 'The record outlives the finding it names.');

  const retired = setup(t, 'normal'); investigate(retired); command(retired, 'continue');
  assert.ok(!view(retired).noIncident.acknowledge.includes('finding'));

  const check = setup(t, 'normal');
  investigate(check, finding => ({ ...finding, recommendation: { ...finding.recommendation, kind: 'read_only_check', target: null, risk: 'read_only', approvalRequired: false } }));
  assert.ok(!view(check).noIncident.acknowledge.includes('finding'));

  const interrupted = setup(t, 'normal');
  interrupted.cases.attachResult(interrupted.cases.requestInvestigation(interrupted.id, interrupted.store.get(interrupted.id).revision), { terminalStatus: 'interrupted', finding: null });
  assert.ok(!view(interrupted).noIncident.acknowledge.includes('finding'));

  const state = interrupted.store.get(interrupted.id);
  assert.ok(!noIncidentGate({ ...state, finding: {} }).acknowledge.includes('finding'), 'A finding with no recommendation does not throw.');
});

test('with nothing contrary on the page, the closure still needs no reason', t => {
  const s = edited(t, 'normal', world => { world.observations = world.observations.filter(e => e.kind !== 'support'); });
  assert.equal(view(s).noIncident.reasonRequired, false);
  const markup = render(view(s));
  assert.equal(disabled(markup, 'close_no_incident'), false);
  assert.match(markup, /The data is complete and stable, so you can close this as no incident\./);
  command(s, 'close_no_incident');
  assert.deepEqual(view(s).closure.acknowledged, []);
  assert.match(render(view(s)), /No cause was claimed\./); assert.doesNotMatch(render(view(s)), /Closed past|Owner&#x27;s reason/);
});

test('a closure saved before this rule still renders', t => {
  const s = setup(t, 'normal'), data = view(s);
  const page = render({ ...data, status: 'closed', closure: { kind: 'close_no_incident', reason: '', at: '2026-10-01T10:00:00.000Z' } });
  assert.match(page, /No cause was claimed\./); assert.doesNotMatch(page, /Closed past/);
});

test('a failed write leaves the Case open with no closure', t => {
  const s = setup(t, 'normal'), { event } = s.store;
  s.store.event = () => { throw new Error('disk_full'); };
  assert.throws(() => command(s, 'close_no_incident', REASON), /disk_full/);
  s.store.event = event;
  assert.equal(view(s).status, 'open'); assert.equal(view(s).closure, null);
  command(s, 'close_no_incident', REASON); assert.equal(view(s).status, 'closed');
});

test('the rule is computed: no policy or snapshot hash moved', () => {
  const hash = name => { const world = createWorld(name); return snapshotOf('case-pin', captureWorld(world), initialWindows, world.observations).hash; };
  assert.equal(digest(POLICY), 'ad0ba42e0b7a3eff84247a5da7cbdde8777a06870989be66e5ead43403708cc8');
  assert.equal(hash('normal'), '60536afaf2cbbc7e324a68a4142f41e656e075f961d75fcabcbe60663288a0c0');
  for (const name of ['delayed', 'masked']) assert.equal(hash(name), '879442f3dfc3e0bcd002880e21cdd9c0b3a0ad2af46200cae5dfc041eefab899');
});

// Every scenario at every stage it can reach. A static render can't type, so the typed-reason path compares the gate's answer to the service.
const signal = s => s.store.get(s.id).snapshot.signal;
const STAGES = [
  ['created', () => true, () => {}],
  ['waited', s => !signal(s).sufficient, s => command(s, 'wait_for_data')],
  ['investigated', () => true, s => investigate(s)],
  ['waited, investigated', s => !signal(s).sufficient, s => { command(s, 'wait_for_data'); investigate(s); }],
  ['retired', () => true, s => { investigate(s); command(s, 'continue'); }],
  ['deferred', () => true, s => command(s, 'defer', REASON)],
  ['paused', () => true, s => command(s, 'pause')],
  ['running', () => true, s => s.cases.requestInvestigation(s.id, s.store.get(s.id).revision)],
  ['observing', s => signal(s).detected, s => command(s, 'observe_without_action')],
  ['approved', s => signal(s).detected && signal(s).sufficient, s => { investigate(s); const { proposal } = s.store.get(s.id); if (proposal) s.cases.approve(s.id, proposal.hash, 'fixture_surrogate'); }],
  ['closed', () => true, s => command(s, 'close_unresolved', REASON)],
];
const SCENARIOS = ['incident', 'limited', 'ineffective', 'partial', 'incomplete', 'normal', 'spontaneous', 'delayed', 'masked', 'absorbed'];
test('the button is disabled exactly when the service refuses, in every scenario and stage', t => {
  const accepts = (s, reason) => {
    try { command(s, 'close_no_incident', reason); return true; }
    catch (error) { assert.match(error.message, /^(no_incident_|case_busy_or_paused$)/); return false; }
  };
  const closable = [];
  for (const scenario of SCENARIOS) for (const [stage, applies, run] of STAGES) {
    const reach = () => { const s = setup(t, scenario); if (!applies(s)) return null; run(s); return s; };
    const empty = reach(); if (!empty) continue;
    const name = `${scenario}, ${stage}`, data = view(empty);
    assert.equal(disabled(render(data), 'close_no_incident'), !accepts(empty, ''), name);
    const blocked = !!data.noIncident.refusal || data.paused || ['queued', 'running'].includes(data.investigation);
    const open = !accepts(reach(), REASON);
    assert.equal(blocked, open, name);
    if (!open) closable.push(name);
  }
  // The rule's whole reach: only the two clean scenarios can close, and only once their data is complete.
  assert.deepEqual(closable, ['normal, created', 'normal, investigated', 'normal, retired', 'normal, deferred', 'delayed, waited', 'delayed, waited, investigated']);
});
