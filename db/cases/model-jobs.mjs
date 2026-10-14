import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { digest, requireThat as check } from '../benchmark/contracts.mjs';
import { GEMINI } from '../benchmark/gemini-config.mjs';
import { GeminiStore } from '../benchmark/gemini-store.mjs';
import { runGeminiInvestigation } from '../benchmark/gemini-runner.mjs';
import { createHttpTransport } from '../benchmark/gemini-http.mjs';
import { packetFromSnapshot } from '../benchmark/saas-packet.mjs';
import { OWNER } from './proposal.mjs';
export function freeTierReady(root) {
  const account = JSON.parse(readFileSync(resolve(root, 'factory/03_build/output/gemini-runner-v1/ACCOUNT_ATTESTATION.json'), 'utf8'));
  check(account.model === GEMINI.model && account.freeTier === true && account.billingDisabled === true
    && account.paidSpendCapUsd === 0 && account.paidFallback === false, 'free_tier_attestation_required');
  check(typeof process.env.GEMINI_API_KEY === 'string' && process.env.GEMINI_API_KEY.trim().length >= 16, 'gemini_key_unavailable');
}
export const freeTierTransport = root => {
  freeTierReady(root);
  return createHttpTransport({ mode: 'FREE_TIER_BENCHMARK', fetchImpl: globalThis.fetch,
    keySource: () => process.env.GEMINI_API_KEY, beforeRequest: async () => freeTierReady(root), profile: 'low' });
};
export class ModelJobs {
  constructor(cases, { transportFactory, onError = error => process.stderr.write(`Case job: ${error.message}\n`) }) {
    this.cases = cases; this.store = cases.store; this.transportFactory = transportFactory; this.onError = onError; this.active = null;
    mkdirSync(cases.recordings, { recursive: true });
  }
  scope(attempt, snapshot) { return { workspaceId: 'local_saas', caseId: attempt.case_id, runId: attempt.id,
    actorId: OWNER, start: snapshot.evidence.find(e => e.kind === 'conversion').start, clock: snapshot.asOf }; }
  recording(attempt) {
    const store = new GeminiStore(attempt.path), snapshot = this.store.getSnapshot(attempt.snapshot_hash);
    try {
      check(store.metadata.scope.runId === attempt.id && store.metadata.scope.caseId === attempt.case_id
        && store.metadata.frame.snapshotHash === snapshot.hash, 'recording_attachment_mismatch');
      return store;
    } catch (error) { store.close(); throw error; }
  }
  terminal(attempt) {
    let recording;
    try { recording = this.recording(attempt); recording.recover(); return JSON.parse(recording.history().find(e => e.kind === 'terminal').payload); }
    catch { return { terminalStatus: 'interrupted', failureReason: 'recording_unreadable_preserved', finding: null, modelRequestsBlocked: true }; }
    finally { recording?.close(); }
  }
  recover() {
    // Startup only, after the host has acquired the exclusive process lock. No generation on recovery.
    for (const attempt of this.store.db.prepare("SELECT * FROM attempts WHERE status IN ('queued','running')").all()) {
      const result = existsSync(attempt.path) ? this.terminal(attempt)
        : { terminalStatus: 'interrupted', failureReason: 'interrupted_before_recording', finding: null, modelRequestsBlocked: true };
      this.cases.attachResult(attempt.id, result);
    }
    for (const job of this.store.db.prepare("SELECT proposal_hash FROM execution_jobs WHERE status='pending'").all()) this.cases.execute(job.proposal_hash);
  }
  kick() {
    if (this.active) return this.active;
    this.active = this.runNext().catch(this.onError).finally(() => { this.active = null; });
    return this.active;
  }
  async runNext() {
    const attempt = this.store.transaction(() => {
      const row = this.store.db.prepare("SELECT * FROM attempts WHERE status='queued'").get(); if (!row) return null;
      this.store.db.prepare('UPDATE attempts SET status=? WHERE id=?').run('running', row.id);
      const state = this.store.get(row.case_id); state.investigation = 'running'; this.store.save(state);
      this.store.event(row.case_id, 'investigation_started', { attemptId: row.id, at: this.cases.now() }); return row;
    });
    if (!attempt) return;
    let recording, result;
    try {
      const snapshot = this.store.getSnapshot(attempt.snapshot_hash), observable = packetFromSnapshot(snapshot), scope = this.scope(attempt, snapshot);
      recording = new GeminiStore(attempt.path, { metadata: { scope, method: 'single-shot-model', frame: observable.frame,
        truthMode: 'SIMULATED', configHash: digest(GEMINI), source: this.cases.source }, observable });
      result = await runGeminiInvestigation({ observable, scope, method: 'single-shot-model', store: recording,
        transport: this.transportFactory(), profile: 'low' });
    } catch (error) {
      this.onError(new Error(/^[a-z_]+$/.test(error.message) ? error.message : 'recording_or_runner_failure'));
    } finally { recording?.close(); }
    // If terminal recording succeeded but Case attachment failed, restart attaches it without another request.
    if (!result) result = existsSync(attempt.path) ? this.terminal(attempt)
      : { terminalStatus: 'interrupted', failureReason: 'recording_unavailable', finding: null, modelRequestsBlocked: true };
    this.cases.attachResult(attempt.id, result);
  }
}
