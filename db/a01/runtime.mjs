// Trusted local host. Never imported into the restricted investigator/tool process.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { contentHash, validateObservable, validateProposal, validateEvent, validateScope, requireThat, LIMITS } from './contracts.mjs';
import { signalFrom, outcomeFrom, verifyDigest } from './analysis.mjs';
import { assertExecutionAuthority, validateReasoningArtifact } from '../flight-recorder-contracts.ts';
import { initialWorld, referenceTransition, advanceWorld, regressionObservations, SEED } from '../../scripts/a01-world.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
export const POLICY = Object.freeze({ version: 'a01-rollback-v1', truthMode: 'SIMULATED', actorRole: 'local-owner', maxRuns: 1, maxCostMinor: 0, externalWrite: false, services: ['checkout', 'notifications'] });
export function restricted(input) {
    const files = ['db/a01/isolated.mjs', 'db/a01/tools.mjs', 'db/a01/investigator.mjs', 'db/a01/analysis.mjs', 'db/a01/contracts.mjs', 'db/revenue-leak.mjs'];
    const args = ['--permission', ...files.map(p => `--allow-fs-read=${resolve(root, p)}`), resolve(root, files[0])];
    const child = spawnSync(process.execPath, args, { cwd: root, env: { SystemRoot: process.env.SystemRoot ?? 'C:\\Windows' }, input: JSON.stringify(input), encoding: 'utf8', timeout: 10000, maxBuffer: 2000000 });
    requireThat(child.status === 0, 'restricted tool failure: ' + (child.error?.code ?? child.stderr));
    return JSON.parse(child.stdout);
}
export class CaseStore {
    constructor(path, scope, observable = null) {
        validateScope(scope);
        if (observable) {
            validateObservable(observable, scope);
            observable = { ...observable, events: [...observable.events].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id)) };
        }
        this.scope = { ...scope };
        this.controlPath = path + '.control.json';
        this.db = new DatabaseSync(path);
        this.db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
        if (!this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='runs'").get())
            this.db.exec(readFileSync(new URL('./store.sql', import.meta.url), 'utf8'));
        const run = this.db.prepare('SELECT * FROM runs WHERE workspace_id=? AND case_id=? AND run_id=?').get(...this.key);
        if (!run) {
            requireThat(observable, 'unknown Case scope');
            validateObservable(observable, scope);
            if (!existsSync(this.controlPath))
                writeFileSync(this.controlPath, JSON.stringify({ truthMode: 'SIMULATED', paused: false }), { flag: 'wx' });
            this.tx(() => {
                this.db.prepare('INSERT INTO runs VALUES(?,?,?,?,?,?)').run(...this.key, 'SIMULATED', SEED, contentHash({ observable, world: initialWorld() }));
                observable.events.forEach(e => this.addEvidence(e));
                this.saveWorld(initialWorld(), scope.clock);
                this.append('signal', signalFrom(observable.events));
            });
        }
        else {
            const initial = { version: 'incident-data-v1', caseRef: scope.caseId, asOf: scope.clock, events: this.evidence().filter(e => e.at <= scope.clock).sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id)) };
            requireThat(run.truth_mode === 'SIMULATED' && run.initial_hash === contentHash({ observable: initial, world: initialWorld() }), 'initial snapshot mismatch');
            if (observable)
                requireThat(contentHash(observable) === contentHash(initial), 'changed input requires a new run');
            this.timeline();
        }
    }
    get key() { return [this.scope.workspaceId, this.scope.caseId, this.scope.runId]; }
    tx(fn) { this.db.exec('BEGIN IMMEDIATE'); try {
        const result = fn();
        this.db.exec('COMMIT');
        return result;
    }
    catch (e) {
        this.db.exec('ROLLBACK');
        throw e;
    } }
    rows(table) { requireThat(['evidence', 'intents', 'grants', 'effects', 'world_versions', 'timeline'].includes(table), 'unknown table'); return this.db.prepare(`SELECT * FROM ${table} WHERE workspace_id=? AND case_id=? AND run_id=?`).all(...this.key); }
    world() { const row = this.rows('world_versions').sort((a, b) => b.revision - a.revision)[0]; requireThat(row && row.snapshot_hash === contentHash(JSON.parse(row.snapshot_json)), 'world hash mismatch'); return { state: JSON.parse(row.snapshot_json), clock: row.logical_time, revision: row.revision }; }
    saveWorld(state, clock) { const revision = this.rows('world_versions').length; this.db.prepare('INSERT INTO world_versions VALUES(?,?,?,?,?,?,?)').run(...this.key, revision, clock, contentHash(state), JSON.stringify(state)); }
    evidence() { return this.rows('evidence').map(r => { const e = JSON.parse(r.payload_json); validateEvent(e, { ...this.scope, clock: this.world().clock }); requireThat(r.content_hash === e.contentHash, 'stored evidence hash mismatch'); return e; }).sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id)); }
    addEvidence(event) { const versions = this.rows('world_versions'); const clock = versions.length ? this.world().clock : this.scope.clock; validateEvent(event, { ...this.scope, clock }); this.db.prepare('INSERT INTO evidence VALUES(?,?,?,?,?,?)').run(...this.key, event.id, event.contentHash, JSON.stringify(event)); }
    timeline() {
        let previousHash = null;
        return this.rows('timeline').sort((a, b) => a.sequence - b.sequence).map((r, i) => {
            const e = { id: r.event_id, sequence: r.sequence, type: r.type, at: r.logical_time, workspaceId: r.workspace_id, caseId: r.case_id, runId: r.run_id, ...JSON.parse(r.payload_json), contentHash: r.content_hash };
            verifyDigest(e);
            requireThat(e.sequence === i + 1 && e.previousHash === previousHash && e.truthMode === 'SIMULATED', 'timeline chain mismatch');
            previousHash = e.contentHash;
            return e;
        });
    }
    append(type, body) {
        const timeline = this.timeline(), sequence = timeline.length + 1;
        const event = { id: `trace-${this.scope.runId}-${sequence}`, sequence, type, at: this.world().clock, ...Object.fromEntries(['workspaceId', 'caseId', 'runId'].map(k => [k, this.scope[k]])), truthMode: 'SIMULATED', previousHash: timeline.at(-1)?.contentHash ?? null, body };
        const content_hash = contentHash(event);
        this.db.prepare('INSERT INTO timeline VALUES(?,?,?,?,?,?,?,?,?)').run(...this.key, sequence, event.id, type, event.at, content_hash, JSON.stringify({ truthMode: event.truthMode, previousHash: event.previousHash, body }));
        return { ...event, contentHash: content_hash };
    }
    queries() { const map = new Map(); for (const e of this.timeline().filter(e => e.type === 'evidence_query'))
        map.set(e.body.index, e.body); return [...map.values()]; }
    query(tool, args, purpose) {
        const request = this.tx(() => { const calls = this.queries(); requireThat(calls.length < LIMITS.toolCalls, 'tool budget exhausted'); const body = { index: calls.length, tool, args, purpose, response: null, error: 'interrupted_before_result' }; this.append('evidence_query', body); return body; });
        try {
            const response = restricted({ operation: 'query', scope: this.scope, observable: { version: 'incident-data-v1', caseRef: this.scope.caseId, asOf: this.scope.clock, events: this.evidence().filter(e => e.at <= this.scope.clock) }, tool, args });
            verifyDigest(response);
            request.response = response;
            request.error = null;
        }
        catch (e) {
            request.error = String(e.message).slice(0, 500);
        }
        this.tx(() => this.append('evidence_query', request));
        return request;
    }
    investigate() {
        const existing = this.timeline().find(e => ['hypothesis', 'uncertain'].includes(e.type) && e.body.kind === 'final');
        if (existing)
            return existing.body;
        if (this.queries().length >= LIMITS.toolCalls)
            return this.finishAbstention('tool_budget_exhausted');
        if (this.queries().some(q => q.error))
            return this.finishAbstention('tool_failure');
        for (let turns = 0; turns < 16; turns++) {
            const hypotheses = this.timeline().filter(e => e.type === 'hypothesis');
            const next = restricted({ operation: 'next', scope: this.scope, queries: this.queries(), hypotheses: hypotheses.map(e => e.body) });
            if (next.kind === 'query') {
                if (this.queries().length >= LIMITS.toolCalls)
                    return this.finishAbstention('tool_budget_exhausted');
                this.query(next.tool, next.args, next.purpose);
                continue;
            }
            requireThat(hypotheses.length < LIMITS.hypothesisRevisions, 'hypothesis budget exhausted');
            const ids = next.evidenceIds ?? next.hypotheses.flatMap(h => h.evidenceIds);
            const available = [...new Set(this.queries().flatMap(q => q.response?.events.map(e => e.id) ?? []))];
            if (ids.length || next.decision !== 'abstain')
                requireThat(validateReasoningArtifact({ content: next, evidenceCitations: ids, declaredEvidenceIds: available }).length === 0, 'unsupported investigation citation');
            this.tx(() => this.append('hypothesis', next));
            if (next.kind === 'final')
                return next;
        }
        return this.finishAbstention('bounded_termination');
    }
    finishAbstention(reason) { const final = { kind: 'final', decision: 'abstain', reason, hypotheses: [], evidenceIds: [], signal: signalFrom(this.evidence()) }; this.tx(() => this.append('uncertain', final)); return final; }
    proposal(action = null) {
        const old = this.rows('intents')[0];
        if (old) {
            const p = JSON.parse(old.payload_json);
            if (action)
                requireThat(contentHash(action) === contentHash(p.action), 'immutable intent action');
            return p;
        }
        const final = this.investigate();
        requireThat(final.decision === 'propose', 'investigator abstained');
        const body = { id: `intent-${this.scope.runId}`, workspaceId: this.scope.workspaceId, caseId: this.scope.caseId, runId: this.scope.runId, investigationHash: contentHash(final), contextHash: contentHash(this.queries()), policyHash: contentHash(POLICY), nonce: `nonce-${this.scope.runId}`, expiresAt: '2026-09-01T10:15:00.000Z', action: action ?? final.action, evidenceIds: final.evidenceIds, rationale: action ? 'Explicit alternative intervention for the simulated comparison; not the investigator recommendation.' : 'Evidence supports reverting the checkout validation change; observe two new windows. Synthetic effect only.' };
        const proposal = { ...body, contentHash: contentHash(body) };
        validateProposal(proposal, this.scope, new Set(this.queries().flatMap(q => q.response?.events.map(e => e.id) ?? [])));
        this.tx(() => { this.db.prepare('INSERT INTO intents VALUES(?,?,?,?,?,?)').run(...this.key, proposal.id, proposal.contentHash, JSON.stringify(proposal)); this.append('proposal', proposal); });
        return proposal;
    }
    approve(exactHash, provenance) {
        requireThat(['local_human', 'fixture_surrogate'].includes(provenance), 'invalid approval provenance');
        const p = JSON.parse(this.rows('intents')[0]?.payload_json ?? 'null');
        requireThat(p && p.contentHash === exactHash, 'approval must match displayed proposal hash');
        validateProposal(p, { ...this.scope, clock: this.world().clock }, new Set(this.evidence().map(e => e.id)));
        requireThat(this.rows('grants').length === 0, 'grant already exists');
        const grant = { id: `grant-${this.scope.runId}`, workspaceId: this.scope.workspaceId, intentId: p.id, decision: 'approved', boundPayloadHash: p.contentHash, boundContextHash: p.contextHash, boundPolicyHash: p.policyHash, boundRecipientSetHash: contentHash([]), nonce: p.nonce, expiresAt: p.expiresAt, approvedBy: this.scope.actorId, provenance };
        this.tx(() => { this.db.prepare('INSERT INTO grants VALUES(?,?,?,?,?,?,?,?,?)').run(...this.key, grant.id, p.id, p.contentHash, grant.approvedBy, grant.expiresAt, provenance); this.append('approval', grant); });
        return grant;
    }
    authority(p, grant, overrides = {}) {
        const intent = { id: p.id, workspaceId: p.workspaceId, traceId: this.scope.runId, canonicalPayloadHash: p.contentHash, contextManifestHash: p.contextHash, policyHash: p.policyHash, recipientSetHash: contentHash([]), nonce: p.nonce, expiresAt: p.expiresAt };
        const policy = { workspaceId: this.scope.workspaceId, intentId: p.id, verdict: 'approval_required', policyHash: contentHash(POLICY), evaluatedPayloadHash: p.contentHash, evaluatedContextHash: contentHash(this.queries()) };
        const request = { workspaceId: this.scope.workspaceId, traceId: this.scope.runId, intentId: p.id, actorUserId: this.scope.actorId, actorWorkspaceId: this.scope.workspaceId, killSwitchEngaged: false, canonicalPayloadHash: p.contentHash, contextManifestHash: contentHash(this.queries()), policyHash: contentHash(POLICY), recipientSetHash: contentHash([]), nonce: p.nonce, now: this.world().clock, priorAttemptCount: this.rows('effects').length, ...overrides };
        return { intent, policy, grant, request };
    }
    setPause(paused) { requireThat(typeof paused === 'boolean', 'invalid pause'); writeFileSync(this.controlPath, JSON.stringify({ truthMode: 'SIMULATED', paused })); }
    execute({ crash = false } = {}) {
        try {
            return this.tx(() => {
                const p = JSON.parse(this.rows('intents')[0]?.payload_json ?? 'null');
                requireThat(p, 'missing proposal');
                validateProposal(p, { ...this.scope, clock: this.world().clock }, new Set(this.evidence().map(e => e.id)));
                const grant = this.timeline().find(e => e.type === 'approval')?.body;
                const row = this.rows('grants')[0];
                requireThat(grant && row && row.grant_id === grant.id && row.proposal_hash === grant.boundPayloadHash && row.actor_id === grant.approvedBy && row.provenance === grant.provenance, 'missing or mismatched approval');
                const final = this.timeline().find(e => e.type === 'hypothesis' && e.body.kind === 'final')?.body;
                requireThat(contentHash(final) === p.investigationHash, 'investigation changed');
                // Read the trusted local control immediately before reservation; missing/malformed fails closed.
                const control = JSON.parse(readFileSync(this.controlPath, 'utf8'));
                requireThat(control.truthMode === 'SIMULATED' && typeof control.paused === 'boolean', 'Global Pause unavailable');
                const authority = this.authority(p, grant, { killSwitchEngaged: control.paused });
                assertExecutionAuthority(authority);
                const world = this.world();
                const next = referenceTransition(world.state, p.action);
                const effectId = `effect-${this.scope.runId}`;
                this.db.prepare('INSERT INTO effects VALUES(?,?,?,?,?,?,?,?)').run(...this.key, effectId, grant.id, p.id, p.contentHash, contentHash(authority));
                this.append('effect_reserved', { effectId, proposalHash: p.contentHash, authority });
                this.saveWorld(next, world.clock);
                this.append('effect_confirmed', { effectId, proposalHash: p.contentHash, worldHash: contentHash(next), truthMode: 'SIMULATED' });
                if (crash)
                    process.exit(17);
                return { effectId, truthMode: 'SIMULATED' };
            });
        }
        catch (e) {
            this.tx(() => this.append('rejection', { operation: 'execute', reason: e.message, truthMode: 'SIMULATED' }));
            throw e;
        }
    }
    observe() {
        while (this.world().state.step < 6)
            this.tx(() => { const w = advanceWorld(this.world().state, this.scope); this.saveWorld(w.next, w.clock); w.events.forEach(e => this.addEvidence(e)); this.append('observation', { evidenceIds: w.events.map(e => e.id), truthMode: 'SIMULATED' }); });
        const result = outcomeFrom(this.evidence(), signalFrom(this.evidence()));
        const last = this.timeline().filter(e => ['resolved', 'uncertain', 'reopened'].includes(e.type)).at(-1);
        if (!last || contentHash(last.body) !== contentHash(result))
            this.tx(() => this.append(last?.type === 'resolved' && !result.recovered ? 'reopened' : result.status, result));
        return result;
    }
    recordSimulatedRegression() {
        this.tx(() => { const w = regressionObservations(this.world().state, this.scope); this.saveWorld(w.next, w.clock); w.events.forEach(e => this.addEvidence(e)); this.append('observation', { evidenceIds: w.events.map(e => e.id), truthMode: 'SIMULATED', reason: 'new simulated regression' }); });
        return this.observe();
    }
    artifact() { const evidence = this.evidence(); return { version: 'a01-replay-v1', truthMode: 'SIMULATED', investigator: 'deterministic_baseline', modelEvaluation: 'NOT_RUN', scope: this.scope, evidence, timeline: this.timeline(), effects: this.rows('effects'), world: this.world(), outcome: outcomeFrom(evidence, signalFrom(evidence)) }; }
    close() { this.db.close(); }
}
