import { resolve } from 'node:path';
import { digest, canonical, requireThat as check } from '../benchmark/contracts.mjs';
import { snapshotOf, measurementPlan, assessOutcome, addMinutes } from './measurement.mjs';
import { createWorld, captureWorld, initialWindows, worldContext, applyRollback, advanceWorld } from './world.mjs';
import { newId } from './store.mjs';
import { OWNER, makeProposal, authorize } from './proposal.mjs';
export class Cases {
  constructor(store, { recordings, now = () => new Date().toISOString(), source = 'gemini', maxAttempts = 2 } = {}) {
    this.store = store; this.recordings = recordings; this.now = now; this.source = source; this.maxAttempts = maxAttempts;
  }
  create(key, scenario) {
    check(/^[a-zA-Z0-9_-]{8,100}$/.test(key), 'invalid_creation_key');
    return this.store.transaction(() => {
      const existing = this.store.db.prepare('SELECT id,scenario FROM cases WHERE creation_key=?').get(key);
      if (existing) { check(existing.scenario === scenario, 'creation_key_conflict'); return existing.id; }
      const id = newId('case'), world = createWorld(scenario), snapshot = snapshotOf(id, captureWorld(world), initialWindows, world.observations);
      const state = { id, title: 'New-subscription paid conversion', createdAt: this.now(), revision: 0, truthMode: 'SIMULATED',
        owner: OWNER, status: 'open', investigation: 'idle', decision: 'review', paused: false, world, snapshot,
        currentAttemptId: null, finding: null, gate: null, proposal: null, grant: null, receipt: null, plan: null,
        anchor: null, outcome: null, closure: null };
      this.store.db.prepare('INSERT INTO cases VALUES(?,?,?,?)').run(id, key, scenario, canonical(state));
      this.store.snapshot(snapshot); this.store.event(id, 'case_created', { at: state.createdAt, snapshotHash: snapshot.hash, truthMode: 'SIMULATED' });
      return id;
    });
  }
  mutate(id, revision, fn) {
    return this.store.transaction(() => {
      const state = this.store.get(id); check(state.revision === revision, 'case_changed_reload');
      const result = fn(state); this.store.save(state); return result;
    });
  }
  currentSnapshot(state) {
    const windows = state.outcome ? [...initialWindows.slice(0, 2), ...[0, 1].map(i => ({
      start: addMinutes(state.outcome.start, i * 15), end: addMinutes(state.outcome.start, (i + 1) * 15), period: 'incident' }))] : initialWindows;
    return snapshotOf(state.id, captureWorld(state.world), windows, state.world.observations);
  }
  requestInvestigation(id, revision) {
    return this.mutate(id, revision, state => {
      check(state.status === 'open' && !state.paused && state.decision !== 'approved', 'investigation_not_available');
      check(!this.store.db.prepare("SELECT id FROM attempts WHERE status IN ('queued','running')").get(), 'investigator_busy');
      check(this.store.db.prepare('SELECT COUNT(*) AS n FROM attempts WHERE source=?').get(this.source).n < this.maxAttempts, 'development_attempt_cap_reached');
      const attemptId = newId('attempt'), path = resolve(this.recordings, `${attemptId}.sqlite`);
      state.snapshot = this.currentSnapshot(state); this.store.snapshot(state.snapshot);
      this.store.db.prepare('INSERT INTO attempts VALUES(?,?,?,?,?,?,NULL)').run(attemptId, id, state.snapshot.hash, 'queued', path, this.source);
      state.currentAttemptId = attemptId; state.investigation = 'queued'; state.finding = null; state.gate = null; state.proposal = null;
      if (!state.anchor) state.decision = 'review';
      this.store.event(id, 'investigation_requested', { attemptId, snapshotHash: state.snapshot.hash, source: this.source, at: this.now() });
      return attemptId;
    });
  }
  attachResult(attemptId, result) {
    this.store.transaction(() => {
      const row = this.store.db.prepare('SELECT * FROM attempts WHERE id=?').get(attemptId); check(row, 'attempt_not_found');
      if (row.result !== null) { check(digest(JSON.parse(row.result)) === digest(result), 'terminal_result_conflict'); return; }
      const state = this.store.get(row.case_id); check(state.currentAttemptId === attemptId && state.snapshot.hash === row.snapshot_hash, 'attempt_context_stale');
      const finding = result.finding ?? null;
      this.store.db.prepare('UPDATE attempts SET status=?,result=? WHERE id=?').run('terminal', canonical(result), attemptId);
      state.finding = finding;
      state.investigation = result.terminalStatus === 'completed' ? 'completed' : result.terminalStatus === 'epistemic_abstention' ? 'insufficient' : 'interrupted';
      const built = makeProposal({ caseId: state.id, attemptId, snapshot: state.snapshot, finding, world: state.world,
        now: this.now(), nonce: newId('nonce') });
      state.gate = built.gate; state.proposal = state.anchor ? null : built.proposal;
      if (!state.anchor) state.decision = state.proposal ? 'proposed' : 'review';
      this.store.event(state.id, 'investigation_completed', { attemptId, terminalStatus: result.terminalStatus,
        findingHash: finding ? digest(finding) : null, proposalHash: state.proposal?.hash ?? null, at: this.now() });
      this.store.save(state);
    });
  }
  approve(id, proposalHash, provenance = 'local_human') {
    check(['local_human', 'fixture_surrogate'].includes(provenance), 'invalid_approval_provenance');
    return this.store.transaction(() => {
      const existing = this.store.db.prepare('SELECT payload,case_id FROM grants WHERE proposal_hash=?').get(proposalHash);
      if (existing) { check(existing.case_id === id, 'approval_case_mismatch'); return JSON.parse(existing.payload); }
      const state = this.store.get(id); check(state.proposal?.hash === proposalHash && state.decision === 'proposed' && !state.anchor, 'proposal_changed_or_unavailable');
      const grant = { id: newId('grant'), actorId: OWNER, caseId: id, proposalHash, approvedAt: this.now(), provenance };
      state.decision = 'approved'; authorize({ proposal: state.proposal, grant, state, now: this.now() });
      this.store.db.prepare('INSERT INTO grants VALUES(?,?,?)').run(proposalHash, id, canonical(grant));
      this.store.db.prepare('INSERT INTO execution_jobs VALUES(?,?,NULL)').run(proposalHash, 'pending');
      state.grant = grant; this.store.event(id, 'approval_recorded', grant); this.store.save(state); return grant;
    });
  }
  execute(proposalHash, probe = () => {}) {
    return this.store.transaction(() => {
      const done = this.store.db.prepare('SELECT payload FROM effects WHERE proposal_hash=?').get(proposalHash);
      if (done) return JSON.parse(done.payload);
      const job = this.store.db.prepare('SELECT * FROM execution_jobs WHERE proposal_hash=?').get(proposalHash);
      check(job?.status === 'pending', 'execution_not_pending');
      const row = this.store.db.prepare('SELECT * FROM grants WHERE proposal_hash=?').get(proposalHash), grant = JSON.parse(row.payload);
      const state = this.store.get(row.case_id), proposal = state.proposal;
      try { check(proposal?.hash === proposalHash, 'proposal_changed'); authorize({ proposal, grant, state, now: this.now() }); }
      catch (error) {
        this.store.db.prepare('UPDATE execution_jobs SET status=?,reason=? WHERE proposal_hash=?').run('rejected', error.message, proposalHash);
        state.decision = 'rejected'; this.store.event(state.id, 'execution_rejected', { proposalHash, reason: error.message, at: this.now() });
        this.store.save(state); return null;
      }
      const before = worldContext(state.world); state.world = applyRollback(state.world, proposal.action);
      const receipt = { id: newId('receipt'), caseId: state.id, proposalHash, grantId: grant.id, provenance: grant.provenance,
        truthMode: 'SIMULATED', action: proposal.action, before, after: worldContext(state.world), executedAt: this.now(),
        simulationAt: state.world.clock, maxRuns: 1, externalWrites: false, costUsd: 0 };
      this.store.db.prepare('INSERT INTO effects VALUES(?,?,?)').run(proposalHash, state.id, canonical(receipt));
      this.store.db.prepare('UPDATE execution_jobs SET status=? WHERE proposal_hash=?').run('executed', proposalHash);
      state.receipt = receipt; state.plan = proposal.measurementPlan; state.anchor = receipt.simulationAt; state.decision = 'executed';
      this.store.event(state.id, 'simulation_executed', receipt); this.store.save(state); probe(); return receipt;
    });
  }
  command(id, revision, command, reason = '') {
    return this.mutate(id, revision, state => {
      check(typeof reason === 'string' && reason.length <= 1000, 'invalid_reason');
      if (command === 'pause' || command === 'resume') {
        state.paused = command === 'pause'; this.store.event(id, command, { at: this.now(), actor: OWNER }); return;
      }
      check(!state.paused && !['queued', 'running'].includes(state.investigation), 'case_busy_or_paused');
      if (command === 'refresh_proposal') {
        check(state.status === 'open' && !state.anchor && state.decision !== 'approved' && state.finding, 'proposal_refresh_not_available');
        const built = makeProposal({ caseId: id, attemptId: state.currentAttemptId, snapshot: state.snapshot, finding: state.finding,
          world: state.world, now: this.now(), nonce: newId('nonce') });
        state.gate = built.gate; state.proposal = built.proposal; state.decision = state.proposal ? 'proposed' : 'review';
        this.store.event(id, 'proposal_refreshed', { proposalHash: state.proposal?.hash ?? null, findingHash: digest(state.finding), at: this.now() });
      } else if (command === 'defer') {
        check(state.status === 'open' && !state.anchor && state.decision !== 'approved' && reason.trim(), 'defer_not_available');
        state.decision = 'deferred'; state.proposal = null;
      } else if (command === 'observe_without_action') {
        check(state.status === 'open' && !state.anchor && state.decision !== 'approved', 'observation_not_available');
        state.plan = measurementPlan(state.snapshot); state.anchor = state.world.clock; state.decision = 'no_action'; state.proposal = null;
      } else if (command === 'observe') {
        check(state.anchor && state.plan && state.world.observationStep < 3, 'observation_not_available');
        const step = state.world.observationStep + 1; state.world = advanceWorld(state.world, state.anchor, step);
        const outcome = { id: newId('outcome'), ...assessOutcome(captureWorld(state.world), state.plan, state.anchor,
          step === 3 ? addMinutes(state.anchor, 30) : state.anchor), at: this.now(), step, decision: state.decision,
          receiptId: state.receipt?.id ?? null, sourceHash: digest(captureWorld(state.world)) };
        this.store.db.prepare('INSERT INTO outcomes VALUES(?,?,?)').run(outcome.id, id, canonical(outcome));
        const previous = state.outcome; state.outcome = outcome;
        if (previous?.state === 'criterion_met' && outcome.state !== 'criterion_met') {
          state.status = 'open'; this.store.event(id, 'case_reopened', { reason: 'Later observations no longer meet the criterion', priorClosure: state.closure, outcomeId: outcome.id });
        }
        this.store.event(id, 'outcome_assessed', outcome);
      } else if (command === 'close_recovered' || command === 'close_unresolved') {
        check(state.status === 'open' && state.decision !== 'approved', 'closure_not_available');
        check(command !== 'close_recovered' || state.outcome?.state === 'criterion_met', 'recovery_not_observed');
        check(command !== 'close_unresolved' || reason.trim().length > 0, 'closure_reason_required');
        state.status = 'closed'; state.proposal = null; state.closure = { kind: command, reason: reason.trim(), at: this.now(), actorId: OWNER,
          outcomeId: state.outcome?.id ?? null, causalClaim: false };
      } else if (command === 'continue') {
        check(state.decision !== 'approved', 'execution_pending'); state.status = 'open';
        state.snapshot = this.currentSnapshot(state);
        // A previous finding belongs to its old packet. It remains in the attempt history, never relabelled as current evidence.
        state.finding = null; state.gate = null; state.currentAttemptId = null; state.investigation = 'idle';
        if (!state.anchor) state.decision = 'review';
        this.store.snapshot(state.snapshot); state.proposal = null;
      } else throw new Error('unknown_command');
      this.store.event(id, command, { reason: reason.trim(), at: this.now(), actorId: OWNER, snapshotHash: state.snapshot.hash });
    });
  }
}
