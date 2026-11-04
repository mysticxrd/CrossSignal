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
import { snapshotOf, measure, isStable } from '../db/cases/measurement.mjs';
import { createWorld, captureWorld, initialWindows, waitWorld, advanceWorld } from '../db/cases/world.mjs';
import { packetFromSnapshot, validateObservable } from '../db/benchmark/saas-packet.mjs';
import { fixtureFinding } from './helpers/saas-fixture.mjs';

const session = { token: 'fixture-only', owner: 'local_owner', source: 'fixture_surrogate', model: 'fixture', profile: 'low',
  modelReady: true, unavailableReason: null, attemptsUsed: 0, attemptCap: 2 };
function setup(t, scenario) {
  const store = new CaseStore(':memory:'); t.after(() => store.close());
  const cases = new Cases(store, { recordings: '.', source: 'fixture_surrogate', maxAttempts: 20, now: () => '2026-10-01T10:00:00.000Z' });
  return { store, cases, id: cases.create(`twin-${scenario}-case`, scenario) };
}
const command = (s, name, reason = '') => s.cases.command(s.id, s.store.get(s.id).revision, name, reason);
const investigate = s => {
  const attempt = s.cases.requestInvestigation(s.id, s.store.get(s.id).revision);
  s.cases.attachResult(attempt, { terminalStatus: 'completed', finding: fixtureFinding(s.store.get(s.id).snapshot) });
  return attempt;
};
const snapshotAt = world => snapshotOf('case-twin', captureWorld(world), initialWindows, world.observations);
const html = s => renderToStaticMarkup(createElement(CaseDetail, { data: s.store.view(s.id), session, busy: false, onAction: async () => {} }));
function disabled(markup, label) {
  const button = [...markup.matchAll(/<button\b([^>]*)>([^<]*)<\/button>/g)].find(match => match[2] === label);
  assert.ok(button, `Button exists: ${label}`);
  return button[1].includes('disabled=');
}

test('the twins give one identical snapshot at T1 and part only once the late rows land', () => {
  const delayed = createWorld('delayed'), masked = createWorld('masked');
  const [t1, twin] = [snapshotAt(delayed), snapshotAt(masked)];
  assert.equal(t1.hash, twin.hash);
  assert.equal(t1.signal.sufficient, false); assert.equal(t1.signal.detected, false); assert.equal(t1.signal.incident.conversionPercent, null);
  assert.equal(t1.signal.baseline.conversionPercent, 80);
  assert.ok(!t1.evidence.some(e => e.id.endsWith(':health-billing') || e.id.endsWith(':support-1')));
  assert.ok(t1.evidence.some(e => e.id.endsWith(':health-provider')));

  const [calm, outage] = [snapshotAt(waitWorld(delayed)), snapshotAt(waitWorld(masked))];
  assert.notEqual(calm.hash, outage.hash);
  assert.equal(calm.signal.sufficient, true); assert.equal(calm.signal.detected, false); assert.equal(calm.signal.incident.conversionPercent, 80);
  assert.equal(calm.evidence.find(e => e.id.endsWith(':health-billing')).failures, 0);
  assert.ok(!calm.evidence.some(e => e.id.endsWith(':support-1')));
  assert.equal(outage.signal.detected, true); assert.equal(outage.signal.incident.conversionPercent, 40); assert.equal(outage.signal.dropPoints, 40);
  assert.equal(outage.evidence.find(e => e.id.endsWith(':health-billing')).failures, 80);
  assert.ok(outage.evidence.some(e => e.id.endsWith(':support-1')));

  for (const snapshot of [t1, calm, outage]) {
    const scope = { workspaceId: 'w', caseId: 'case-twin', runId: 'r', actorId: 'a', start: snapshot.evidence[0].start, clock: snapshot.asOf };
    assert.equal(validateObservable(packetFromSnapshot(snapshot), scope).events.length, snapshot.evidence.length);
  }
});

test('delayed: waits once, then closes as no incident on the measurement with no model call', t => {
  const s = setup(t, 'delayed');
  assert.throws(() => command(s, 'close_no_incident'), /no_incident_needs_complete_stable_data/);
  assert.throws(() => command(s, 'observe_without_action'), /incident_not_detected/);
  command(s, 'wait_for_data');
  const state = s.store.get(s.id);
  assert.equal(state.world.clock, '2026-10-01T10:00:00.000Z'); assert.equal(state.world.waits, 1);
  assert.equal(state.snapshot.signal.sufficient, true);
  assert.throws(() => command(s, 'wait_for_data'), /wait_not_available/);
  command(s, 'close_no_incident');
  const closed = s.store.view(s.id);
  assert.equal(closed.status, 'closed'); assert.equal(closed.closure.kind, 'close_no_incident');
  assert.equal(closed.closure.causalClaim, false); assert.equal(closed.closure.outcomeId, null);
  assert.equal(closed.attempts.length, 0); assert.equal(closed.receipt, null);
  assert.deepEqual(closed.history.map(e => e.kind), ['case_created', 'wait_for_data', 'close_no_incident']);
  assert.throws(() => command(s, 'close_no_incident'), /no_incident_needs_complete_stable_data/);
  // A world that somehow continued would stay at the stable rate.
  const later = advanceWorld(state.world, state.world.clock, 1);
  const { conversionPercent } = measure(captureWorld(later), { start: state.world.clock, end: '2026-10-01T10:15:00.000Z', cohort: 'new-self-serve' });
  assert.equal(conversionPercent, 80);
});

test('masked: a T1 finding earns no proposal and is retired by the wait; T2 runs through approval to recovery', t => {
  const s = setup(t, 'masked');
  const first = investigate(s), early = s.store.get(s.id);
  assert.equal(early.proposal, null); assert.equal(early.gate.eligible, false); assert.equal(early.decision, 'review');
  command(s, 'wait_for_data');
  const waited = s.store.view(s.id);
  assert.equal(waited.finding, null); assert.equal(waited.gate, null); assert.equal(waited.investigation, 'idle');
  assert.equal(waited.attempts[0].id, first); assert.ok(waited.attempts[0].result.finding);
  assert.equal(waited.snapshot.signal.detected, true);
  assert.throws(() => command(s, 'close_no_incident'), /no_incident_needs_complete_stable_data/);
  investigate(s);
  const ready = s.store.get(s.id); assert.equal(ready.decision, 'proposed');
  s.cases.approve(s.id, ready.proposal.hash, 'fixture_surrogate'); s.cases.execute(ready.proposal.hash);
  assert.throws(() => command(s, 'wait_for_data'), /wait_not_available/);
  command(s, 'observe');
  assert.equal(s.store.get(s.id).outcome.state, 'criterion_met');
  command(s, 'close_recovered', 'Synthetic recovery observed; causality remains uncertain.');
  assert.equal(s.store.get(s.id).status, 'closed');
});

test('masked without a rollback stays down, because waiting alone repairs nothing', t => {
  const s = setup(t, 'masked');
  command(s, 'wait_for_data'); command(s, 'observe_without_action'); command(s, 'observe');
  assert.equal(s.store.get(s.id).outcome.state, 'criterion_not_met');
});

test('waiting has a limit, and only an insufficient signal can wait or a stable one close', t => {
  const never = setup(t, 'incomplete');
  command(never, 'wait_for_data'); command(never, 'wait_for_data');
  assert.throws(() => command(never, 'wait_for_data'), /wait_limit_reached/);
  assert.equal(never.store.get(never.id).world.waits, 2); assert.equal(never.store.get(never.id).snapshot.signal.sufficient, false);
  assert.throws(() => command(never, 'close_no_incident'), /no_incident_needs_complete_stable_data/);

  const incident = setup(t, 'incident');
  assert.throws(() => command(incident, 'wait_for_data'), /wait_not_available/);
  assert.throws(() => command(incident, 'close_no_incident'), /no_incident_needs_complete_stable_data/);

  const normal = setup(t, 'normal');
  assert.throws(() => command(normal, 'wait_for_data'), /wait_not_available/);
  command(normal, 'close_no_incident'); assert.equal(normal.store.get(normal.id).status, 'closed');

  const paused = setup(t, 'masked'); command(paused, 'pause');
  assert.throws(() => command(paused, 'wait_for_data'), /case_busy_or_paused/);
  const busy = setup(t, 'masked'); busy.cases.requestInvestigation(busy.id, busy.store.get(busy.id).revision);
  assert.throws(() => command(busy, 'wait_for_data'), /case_busy_or_paused/);
});

test('no alarm is not stable: a smaller drop or both cohorts falling cannot close as no incident', t => {
  // Removes activations from the incident windows, so the measurement itself produces each signal. Per window, of 100 intents.
  const incidentAt = (s, selfServe, assisted) => {
    const state = s.store.get(s.id), kept = [selfServe, assisted];
    state.world.events = state.world.events.filter(e => {
      if (e.kind !== 'subscription' || e.occurredAt < initialWindows[2].start) return true;
      const [cohort, n] = e.intentId.split(':').slice(-2).map(Number);
      return n < kept[cohort];
    });
    state.snapshot = s.cases.currentSnapshot(state); s.store.save(state);
    return state.snapshot.signal;
  };
  const refused = (name, selfServe, assisted, dropPoints) => {
    const s = setup(t, 'normal'), signal = incidentAt(s, selfServe, assisted);
    assert.equal(signal.sufficient, true, name); assert.equal(signal.detected, false, name); assert.equal(signal.dropPoints, dropPoints, name);
    assert.equal(s.store.view(s.id).stable, false, name);
    assert.throws(() => command(s, 'close_no_incident'), /no_incident_needs_complete_stable_data/, name);
    const markup = html(s);
    assert.equal(disabled(markup, 'Close: no incident'), true, name);
    assert.match(markup, /Conversion moved without meeting the incident rule/, name); assert.match(markup, /Unclear/, name);
    assert.doesNotMatch(markup, /complete and stable/, name);
    command(s, 'close_unresolved', 'Conversion moved and the rule did not fire.');
    assert.equal(s.store.get(s.id).status, 'closed', name);
  };
  refused('one point under the alarm', 61, 80, 19);
  refused('both cohorts falling together', 40, 40, 40);

  const wobble = setup(t, 'normal'); incidentAt(wobble, 75, 75);
  assert.equal(wobble.store.view(wobble.id).stable, true);
  assert.equal(disabled(html(wobble), 'Close: no incident'), false);
  command(wobble, 'close_no_incident'); assert.equal(wobble.store.get(wobble.id).status, 'closed');

  const control = setup(t, 'normal'), { controlBaseline, controlIncident } = control.store.get(control.id).snapshot.signal;
  assert.equal(isStable({ sufficient: true, dropPoints: -10, controlBaseline, controlIncident }), false, 'A jump is not stable either.');
});

test('the buttons offer exactly what the service accepts at each stage', t => {
  const s = setup(t, 'delayed'), t1 = html(s);
  assert.equal(disabled(t1, 'Wait for late data'), false); assert.equal(disabled(t1, 'Close: no incident'), true);
  assert.match(t1, /200 intents · activations not yet reliable/);
  command(s, 'wait_for_data');
  const t2 = html(s);
  assert.doesNotMatch(t2, /Wait for late data<\/button>/); assert.equal(disabled(t2, 'Close: no incident'), false);
  assert.match(t2, /160 \/ 200 intents/);
  command(s, 'close_no_incident');
  const closed = html(s);
  assert.equal(disabled(closed, 'Close: no incident'), true);
  assert.match(closed, /No cause was claimed/); assert.doesNotMatch(closed, /Recovery observed with uncertainty/);

  const outage = setup(t, 'masked'); command(outage, 'wait_for_data');
  assert.equal(disabled(html(outage), 'Close: no incident'), true);

  const never = setup(t, 'incomplete'); command(never, 'wait_for_data'); command(never, 'wait_for_data');
  assert.equal(disabled(html(never), 'Wait for late data'), true);
  assert.match(html(never), /Both waits are used/);
});
