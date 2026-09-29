import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { CaseStore, restricted } from '../db/a01/runtime.mjs';
import { contentHash } from '../db/a01/contracts.mjs';
import { queryObservable } from '../db/a01/tools.mjs';
import { assertExecutionAuthority } from '../db/flight-recorder-contracts.ts';
import { SCOPE, observableFixture } from '../scripts/a01-world.mjs';
import { grade } from './evaluator/a01/grade.mjs';
const base = resolve('outputs/a01');
mkdirSync(base, { recursive: true });
function fresh(options = {}) { const dir = mkdtempSync(resolve(base, 'test-')), scope = { ...SCOPE }, path = resolve(dir, 'case.sqlite'); writeFileSync(resolve(dir, 'scope.json'), JSON.stringify(scope)); const store = new CaseStore(path, scope, observableFixture(options)); return { store, path, dir, scope }; }
const q = { start: '2026-09-01T09:00:00.000Z', end: SCOPE.clock, limit: 50, cursor: null, segment: null };
function prepared() { const f = fresh(); f.store.investigate(); f.proposal = f.store.proposal(); return f; }
function authorized() { const f = prepared(); f.grant = f.store.approve(f.proposal.contentHash, 'fixture_surrogate'); return f; }
function rehash(e) { const { contentHash: old, ...body } = e; void old; e.contentHash = contentHash(body); }
function rechain(a) { let previous = null; for (const t of a.timeline) {
    t.previousHash = previous;
    rehash(t);
    previous = t.contentHash;
} }
test('bounded tools enforce tenant, time, paging and typed arguments', () => {
    const input = observableFixture();
    const first = queryObservable(input, SCOPE, 'revenue.inspect', { ...q, limit: 2 });
    assert.equal(first.events.length, 2);
    assert.equal(first.truncated, true);
    const second = queryObservable(input, SCOPE, 'revenue.inspect', { ...q, limit: 2, cursor: first.nextCursor });
    assert.notEqual(first.events[0].id, second.events[0].id);
    for (const args of [{ ...q, path: '../../truth.json' }, { ...q, workspaceId: 'foreign' }, { ...q, limit: 51 }, { ...q, end: '2026-09-01T10:15:00.000Z' }, { ...q, cursor: '0'.repeat(64) + ':2' }])
        assert.throws(() => queryObservable(input, SCOPE, 'revenue.inspect', args));
    assert.throws(() => queryObservable(input, { ...SCOPE, workspaceId: 'foreign' }, 'revenue.inspect', q));
    assert.throws(() => queryObservable(input, SCOPE, 'evaluator.read', q));
});
test('actual restricted runtime denies evaluator, private world, spec, outputs, writes and child process', () => {
    const paths = ['tests/evaluator/a01/truth.json', 'scripts/a01-world.mjs', 'factory/01_spec/output/SPEC.md', 'tests/evaluator/a01/../a01/truth.json', 'db/a01/runtime.mjs', 'outputs/a01/private-report.md'].map(p => resolve(p));
    const prior = process.env.EVALUATOR_SECRET;
    process.env.EVALUATOR_SECRET = 'synthetic-isolation-sentinel';
    try {
        assert.deepEqual(restricted({ operation: 'probe', paths }), { reads: 6, write: true, child: true, cleanEnvironment: true });
    } finally {
        if (prior === undefined) delete process.env.EVALUATOR_SECRET;
        else process.env.EVALUATOR_SECRET = prior;
    }
});
test('out-of-order initial observations canonicalize; duplicate observations fail closed', () => {
    const input = observableFixture(), dir = mkdtempSync(resolve(base, 'test-order-')), path = resolve(dir, 'case.sqlite');
    input.events.reverse();
    const first = new CaseStore(path, SCOPE, input), artifact = first.artifact(); first.close();
    const reopened = new CaseStore(path, SCOPE, observableFixture());
    assert.deepEqual(reopened.artifact(), artifact); reopened.close();
    input.events.push(input.events[0]);
    assert.throws(() => new CaseStore(resolve(dir, 'duplicate.sqlite'), SCOPE, input), /duplicate/);
});
test('approved Case resolves, history survives reopen, duplicate execution has zero extra effects', () => {
    const f = authorized();
    f.store.execute();
    assert.equal(f.store.observe().status, 'resolved');
    const artifact = f.store.artifact();
    assert.equal(grade(artifact).mechanics, 'PASS');
    f.store.close();
    const reopened = new CaseStore(f.path, f.scope);
    assert.deepEqual(reopened.artifact(), artifact);
    assert.throws(() => reopened.execute());
    assert.equal(reopened.rows('effects').length, 1);
    assert.equal(reopened.timeline().at(-1).type, 'rejection');
    reopened.close();
});
test('missing and mismatched approval never mutate world', () => {
    const f = prepared(), before = f.store.world();
    assert.throws(() => f.store.execute(), /approval/);
    assert.throws(() => f.store.approve('0'.repeat(64), 'local_human'), /match/);
    assert.deepEqual(f.store.world(), before);
    assert.equal(f.store.rows('effects').length, 0);
    f.store.close();
});
test('existing exact authority rejects mutated, expired, foreign, old manual grant and replay bindings', () => {
    const f = authorized(), original = f.store.authority(f.proposal, f.grant);
    const mutations = [a => a.request.canonicalPayloadHash = '0'.repeat(64), a => a.request.contextManifestHash = '0'.repeat(64), a => a.request.policyHash = '0'.repeat(64), a => a.request.now = f.proposal.expiresAt, a => a.grant.workspaceId = 'foreign', a => a.grant.intentId = 'old-manual-check', a => a.grant.nonce = 'old-nonce', a => a.grant.approvedBy = 'foreign-actor', a => a.request.priorAttemptCount = 1, a => a.request.killSwitchEngaged = true];
    for (const mutate of mutations) {
        const auth = structuredClone(original);
        mutate(auth);
        assert.throws(() => assertExecutionAuthority(auth));
    }
    assert.equal(f.store.rows('effects').length, 0);
    f.store.close();
});
test('persisted Global Pause and unavailable control reject integrated execution', () => {
    const f = authorized();
    f.store.setPause(true);
    assert.throws(() => f.store.execute(), /kill switch/);
    assert.equal(f.store.rows('effects').length, 0);
    unlinkSync(f.path + '.control.json');
    assert.throws(() => f.store.execute());
    assert.equal(f.store.rows('effects').length, 0);
    f.store.close();
});
test('valid ineffective action and absent intervention remain uncertain', () => {
    for (const intervention of ['notifications', 'none']) {
        const f = fresh();
        f.store.investigate();
        if (intervention === 'notifications') {
            const p = f.store.proposal({ kind: 'simulated_rollback', service: 'notifications', fromVersion: 'v8', toVersion: 'v7', environment: 'SIMULATED', maxRuns: 1, maxCostMinor: 0, externalWrite: false });
            f.store.approve(p.contentHash, 'fixture_surrogate');
            f.store.execute();
        }
        assert.equal(f.store.observe().status, 'uncertain');
        assert.equal(grade(f.store.artifact(), { intervention }).mechanics, 'PASS');
        f.store.close();
    }
});
test('limited evidence abstains; injected support instructions cannot grant or execute', () => {
    const limited = fresh({ limited: true });
    assert.equal(limited.store.investigate().decision, 'abstain');
    assert.throws(() => limited.store.proposal());
    limited.store.observe();
    assert.equal(grade(limited.store.artifact(), { intervention: 'none', limited: true }).mechanics, 'PASS');
    limited.store.close();
    const injected = fresh({ injection: true });
    assert.equal(injected.store.investigate().decision, 'propose');
    assert.equal(injected.store.rows('grants').length, 0);
    assert.equal(injected.store.rows('effects').length, 0);
    injected.store.close();
});
test('failed calls consume durable budget and restart preserves explicit failure', () => {
    const f = fresh();
    for (let i = 0; i < 10; i++)
        f.store.query('evaluator.read', { ...q }, 'deliberate forbidden tool');
    assert.throws(() => f.store.query('revenue.inspect', q, 'over budget'), /budget/);
    assert.equal(f.store.investigate().decision, 'abstain');
    f.store.close();
    const resumed = new CaseStore(f.path, f.scope);
    assert.equal(resumed.queries().length, 10);
    assert.equal(resumed.investigate().decision, 'abstain');
    assert.equal(resumed.rows('effects').length, 0);
    resumed.close();
});
test('process death during reservation rolls back the complete transaction; resume commits once', () => {
    const f = authorized(), before = f.store.artifact();
    f.store.close();
    const child = spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/a01-case.mjs', 'crash-probe', f.dir], { encoding: 'utf8' });
    assert.equal(child.status, 17, child.stderr);
    const resumed = new CaseStore(f.path, f.scope);
    assert.deepEqual(resumed.artifact(), before);
    resumed.execute();
    resumed.observe();
    assert.equal(grade(resumed.artifact()).mechanics, 'PASS');
    assert.equal(resumed.rows('effects').length, 1);
    resumed.close();
});
test('missing observations never resolve and changed input/foreign scope cannot reopen a Case', () => {
    const f = authorized();
    f.store.execute();
    assert.equal(f.store.artifact().outcome.recovered, false);
    assert.equal(f.store.artifact().outcome.sufficient, false);
    f.store.close();
    assert.throws(() => new CaseStore(f.path, { ...f.scope, workspaceId: 'foreign' }));
    assert.throws(() => new CaseStore(f.path, f.scope, observableFixture({ limited: true })));
});
test('later simulated regression appends reopening without rewriting resolved history', () => {
    const f = authorized();
    f.store.execute();
    f.store.observe();
    const original = f.store.timeline().find(t => t.type === 'resolved');
    assert.equal(f.store.recordSimulatedRegression().status, 'uncertain');
    assert.deepEqual(f.store.timeline().find(t => t.id === original.id), original);
    assert.equal(f.store.timeline().at(-1).type, 'reopened');
    assert.equal(f.store.rows('effects').length, 1);
    f.store.close();
});
test('independent grader rejects rehashed changes to cause, remedy, authority, outcome and citations', () => {
    const f = authorized();
    f.store.execute();
    f.store.observe();
    const original = f.store.artifact();
    const mutations = [a => a.timeline.find(t => t.body.kind === 'final').body.hypotheses[0].cause = 'acquisition_mix_change', a => a.timeline.find(t => t.body.kind === 'final').body.action.service = 'notifications', a => a.timeline.find(t => t.type === 'approval').body.boundPayloadHash = '0'.repeat(64), a => a.outcome.recovered = false, a => a.timeline.find(t => t.body.kind === 'final').body.hypotheses[0].evidenceIds = ['invented'], a => a.evidence.find(e => e.type === 'revenue_window' && e.at > SCOPE.clock).payload.successes = 200];
    mutations.push(a => a.timeline.find(t => t.body.kind === 'final').body.hypotheses[0].evidenceIds = [a.evidence.find(e => e.type === 'revenue_window').id]);
    mutations.push(a => a.timeline.find(t => t.body.kind === 'final').body.unsupportedClaim = 'Real business revenue recovered.');
    for (const mutate of mutations) {
        const a = structuredClone(original);
        mutate(a);
        for (const e of a.evidence)
            rehash(e);
        rechain(a);
        assert.equal(grade(a).mechanics, 'FAIL');
    }
    f.store.close();
});
