import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { CaseStore } from '../db/cases/store.mjs';
import { Cases } from '../db/cases/service.mjs';
import { ModelJobs } from '../db/cases/model-jobs.mjs';
import { eligibility } from '../db/cases/proposal.mjs';
import { packetFromSnapshot } from '../db/benchmark/saas-packet.mjs';
import { isolatedGemini } from '../db/benchmark/gemini-isolation.mjs';
import { GeminiStore } from '../db/benchmark/gemini-store.mjs';
import { fixtureFinding, fixtureTransport } from './helpers/saas-fixture.mjs';
function setup(t, scenario = 'incident', options = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'crosssignal-case-')), path = join(directory, 'case.sqlite');
  const store = new CaseStore(path), cases = new Cases(store, { recordings: directory, source: 'fixture_surrogate', maxAttempts: 20, ...options });
  const id = cases.create('fixture-creation', scenario);
  t.after(() => { store.close(); rmSync(directory, { recursive: true, force: true }); });
  return { directory, path, store, cases, id };
}
function complete({ store, cases, id }) {
  const attemptId = cases.requestInvestigation(id, store.get(id).revision);
  cases.attachResult(attemptId, { terminalStatus: 'completed', finding: fixtureFinding(store.get(id).snapshot), source: 'fixture_surrogate' });
  return store.get(id);
}
const command = (s, name, reason = '') => s.cases.command(s.id, s.store.get(s.id).revision, name, reason);

test('Case creation, exact approval, crash rollback, restart, observation and explicit closure', t => {
  const s = setup(t); assert.equal(s.cases.create('fixture-creation', 'incident'), s.id);
  assert.throws(() => s.cases.create('fixture-creation', 'normal'), /creation_key_conflict/);
  const ready = complete(s); assert.equal(ready.decision, 'proposed');
  assert.throws(() => s.cases.approve(s.id, 'wrong-hash', 'fixture_surrogate'), /proposal_changed/);
  const grant = s.cases.approve(s.id, ready.proposal.hash, 'fixture_surrogate');
  assert.deepEqual(s.cases.approve(s.id, ready.proposal.hash, 'fixture_surrogate'), grant);
  assert.throws(() => s.cases.execute(ready.proposal.hash, () => { throw new Error('simulated_crash'); }), /simulated_crash/);
  assert.equal(s.store.get(s.id).world.serviceVersion, 'billing-v2');
  assert.equal(s.store.db.prepare('SELECT COUNT(*) AS n FROM effects').get().n, 0);
  const receipt = s.cases.execute(ready.proposal.hash);
  assert.deepEqual(s.cases.execute(ready.proposal.hash), receipt);
  assert.equal(receipt.provenance, 'fixture_surrogate');
  const reopened = new CaseStore(s.path); assert.equal(reopened.view(s.id).receipt.id, receipt.id); reopened.close();
  command(s, 'observe'); assert.equal(s.store.get(s.id).outcome.state, 'criterion_met'); assert.equal(s.store.get(s.id).status, 'open');
  command(s, 'close_recovered', 'Synthetic recovery observed; causality remains uncertain.');
  assert.equal(s.store.get(s.id).status, 'closed');
  command(s, 'observe'); command(s, 'observe');
  assert.equal(s.store.get(s.id).status, 'open'); assert.equal(s.store.get(s.id).outcome.state, 'criterion_not_met');
  assert.equal(s.store.db.prepare('SELECT COUNT(*) AS n FROM effects').get().n, 1);
  assert.equal(s.store.view(s.id).outcomes.length, 3);
  assert.throws(() => s.store.db.exec('DELETE FROM grants'), /append_only/);
});

test('eligibility refuses temporal-only, decoy, foreign-citation, unsafe and unsupported findings without rewriting them', t => {
  const s = setup(t), { snapshot, world } = s.store.get(s.id);
  for (const corrupt of [f => { f.hypotheses[0].supportIds = [f.relatedChangeId]; },
    f => { f.relatedChangeId = snapshot.evidence.find(e => e.service === 'notifications' && e.kind === 'deployment').id; },
    f => { f.claims[0].evidenceIds.push('foreign-case:evidence'); }, f => { f.recommendation.approvalRequired = false; },
    f => { f.claims = []; }, f => { f.affectedSegment = 'new-assisted'; }]) {
    const finding = fixtureFinding(snapshot); corrupt(finding); const original = JSON.stringify(finding);
    assert.equal(eligibility(snapshot, finding, world).eligible, false); assert.equal(JSON.stringify(finding), original);
  }
});

test('limited and normal observations cannot grant authority; no action can recover without a receipt', t => {
  for (const scenario of ['limited', 'normal']) {
    const s = setup(t, scenario); const state = complete(s); assert.equal(state.proposal, null);
    command(s, 'close_unresolved', 'Missing attribution or no detected incident.'); assert.equal(s.store.get(s.id).status, 'closed');
  }
  const s = setup(t, 'spontaneous'); command(s, 'defer', 'Wait for mature follow-up observations.');
  command(s, 'observe_without_action'); command(s, 'observe');
  assert.equal(s.store.get(s.id).outcome.state, 'criterion_met'); assert.equal(s.store.get(s.id).receipt, null);
  assert.equal(s.store.get(s.id).outcome.decision, 'no_action');
});

test('stale snapshot, current version, expiry and pause all stop pending execution', t => {
  for (const change of [s => { s.world.revision++; }, s => { s.world.serviceVersion = 'billing-v9'; },
    s => { s.paused = true; }, s => { s.snapshot.hash = '0'.repeat(64); }]) {
    const s = setup(t), ready = complete(s); s.cases.approve(s.id, ready.proposal.hash, 'fixture_surrogate');
    s.cases.mutate(s.id, s.store.get(s.id).revision, change);
    assert.equal(s.cases.execute(ready.proposal.hash), null); assert.equal(s.store.get(s.id).decision, 'rejected');
    assert.equal(s.store.db.prepare('SELECT COUNT(*) AS n FROM effects').get().n, 0);
  }
  let now = '2026-10-01T00:00:00.000Z'; const s = setup(t, 'incident', { now: () => now }), ready = complete(s);
  s.cases.approve(s.id, ready.proposal.hash, 'fixture_surrogate'); now = '2026-10-01T01:00:00.000Z';
  assert.equal(s.cases.execute(ready.proposal.hash), null);
});

test('restricted packet worker can read public observations but cannot read simulator, Case database, answers or credentials', async t => {
  const s = setup(t), snapshot = s.store.get(s.id).snapshot, observable = packetFromSnapshot(snapshot);
  const scope = { workspaceId: 'local_saas', caseId: s.id, runId: 'attempt_test', actorId: 'local_owner', start: observable.frame.start, clock: snapshot.asOf };
  const prepared = await isolatedGemini({ operation: 'prepare', observable, scope, options: { profile: 'low', method: 'single-shot-model' } });
  assert.equal(prepared.exposedEvidenceIds.length, snapshot.evidence.length);
  assert(!JSON.stringify(prepared.body).includes('observationStep'));
  const paths = ['db/cases/world.mjs', 'db/cases/service.mjs', 'tests/helpers/saas-fixture.mjs', '.env', s.path].map(p => resolve(p));
  const proof = await isolatedGemini({ operation: 'probe', paths }); assert.equal(proof.readDenials, paths.length);
  await assert.rejects(isolatedGemini({ operation: 'prepare', observable: { ...observable, expectedAnswer: 'forbidden' }, scope, options: {} }), /validation_failed/);
});

test('a terminal model recording survives an interrupted Case attachment and is ingested exactly once', async t => {
  const s = setup(t); let generations = 0;
  const jobs = new ModelJobs(s.cases, { transportFactory: () => fixtureTransport(fixtureFinding(s.store.get(s.id).snapshot), { onGenerate: () => generations++ }), onError: () => {} });
  const attempt = s.cases.requestInvestigation(s.id, 0), attach = s.cases.attachResult.bind(s.cases);
  s.cases.attachResult = () => { throw new Error('attachment_crash'); }; await jobs.kick();
  assert.equal(generations, 1); assert.equal(s.store.get(s.id).investigation, 'running');
  s.cases.attachResult = attach; jobs.recover();
  const proposal = s.store.get(s.id).proposal; assert(proposal); jobs.recover();
  assert.equal(s.store.get(s.id).proposal.hash, proposal.hash); assert.equal(generations, 1);
  assert.equal(s.store.attempts(s.id)[0].id, attempt);
});

test('ambiguous requests recover as indeterminate; queue capacity, malformed output and attempt cap stay truthful', async t => {
  const s = setup(t, 'incident', { maxAttempts: 2 }), jobs = new ModelJobs(s.cases, { transportFactory: () => fixtureTransport(null, { malformed: true }), onError: () => {} });
  const attemptId = s.cases.requestInvestigation(s.id, 0);
  assert.throws(() => s.cases.requestInvestigation(s.id, s.store.get(s.id).revision), /investigator_busy/);
  const row = s.store.db.prepare('SELECT * FROM attempts WHERE id=?').get(attemptId), snapshot = s.store.get(s.id).snapshot, observable = packetFromSnapshot(snapshot);
  const recording = new GeminiStore(row.path, { metadata: { scope: jobs.scope(row, snapshot), frame: observable.frame, method: 'single-shot-model' }, observable });
  recording.claim(); recording.append('request', { dispatched: true }); recording.close(); jobs.recover();
  assert.equal(s.store.attempts(s.id)[0].result.terminalStatus, 'indeterminate_usage');
  s.cases.requestInvestigation(s.id, s.store.get(s.id).revision); await jobs.kick();
  assert.equal(s.store.attempts(s.id)[1].result.terminalStatus, 'invalid_output'); assert.equal(s.store.get(s.id).proposal, null);
  assert.throws(() => s.cases.requestInvestigation(s.id, s.store.get(s.id).revision), /development_attempt_cap_reached/);
});


test('process death after SQLite writes rolls back both receipt and world; startup resumes once', t => {
  const s = setup(t), ready = complete(s); s.cases.approve(s.id, ready.proposal.hash, 'fixture_surrogate');
  const killed = spawnSync(process.execPath, ['tests/helpers/saas-crash.mjs', s.path, ready.proposal.hash], { windowsHide: true });
  assert.equal(killed.status, 17);
  assert.equal(s.store.get(s.id).world.serviceVersion, 'billing-v2');
  assert.equal(s.store.db.prepare('SELECT COUNT(*) AS n FROM effects').get().n, 0);
  const jobs = new ModelJobs(s.cases, { transportFactory: () => { throw new Error('no_model_on_restart'); } });
  jobs.recover(); jobs.recover();
  assert.equal(s.store.get(s.id).world.serviceVersion, 'billing-v1');
  assert.equal(s.store.db.prepare('SELECT COUNT(*) AS n FROM effects').get().n, 1);
});

test('refreshing a proposal consumes no model attempt and invalidates the previous exact approval target', t => {
  const s = setup(t), ready = complete(s); command(s, 'refresh_proposal');
  const refreshed = s.store.get(s.id); assert.notEqual(refreshed.proposal.hash, ready.proposal.hash);
  assert.equal(s.store.attempts(s.id).length, 1);
  assert.throws(() => s.cases.approve(s.id, ready.proposal.hash, 'fixture_surrogate'), /proposal_changed/);
  s.cases.approve(s.id, refreshed.proposal.hash, 'fixture_surrogate');
  assert.throws(() => command(s, 'refresh_proposal'), /proposal_refresh_not_available/);
});

test('continuing after observations creates a new snapshot and keeps the old finding in its original attempt', t => {
  const s = setup(t), ready = complete(s), oldHash = ready.snapshot.hash;
  s.cases.approve(s.id, ready.proposal.hash, 'fixture_surrogate'); s.cases.execute(ready.proposal.hash); command(s, 'observe');
  command(s, 'continue'); const next = s.store.get(s.id);
  assert.notEqual(next.snapshot.hash, oldHash); assert.equal(next.snapshot.signal.incident.conversionPercent, 80);
  assert.equal(next.finding, null); assert.equal(s.store.attempts(s.id)[0].result.finding.signalSummary, ready.finding.signalSummary);
  assert(s.store.getSnapshot(oldHash));
});


test('unreadable recording remains preserved and visible as interrupted, without dispatching again', t => {
  const s = setup(t), attemptId = s.cases.requestInvestigation(s.id, 0);
  const path = s.store.db.prepare('SELECT path FROM attempts WHERE id=?').get(attemptId).path;
  writeFileSync(path, 'partial-recording-before-crash');
  const jobs = new ModelJobs(s.cases, { transportFactory: () => { throw new Error('must_not_dispatch'); } });
  jobs.recover();
  assert.equal(s.store.attempts(s.id)[0].result.failureReason, 'recording_unreadable_preserved');
  assert.equal(readFileSync(path, 'utf8'), 'partial-recording-before-crash');
  assert.equal(s.store.get(s.id).investigation, 'interrupted');
});
