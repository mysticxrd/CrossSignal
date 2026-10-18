import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { snapshotOf } from '../db/cases/measurement.mjs';
import { createWorld, captureWorld, initialWindows } from '../db/cases/world.mjs';
import { VERSION, packetFromSnapshot, validateObservable } from '../db/benchmark/saas-packet.mjs';
import { formatOf } from '../db/benchmark/formats.mjs';
import { isolatedGemini } from '../db/benchmark/gemini-isolation.mjs';
import { GeminiStore } from '../db/benchmark/gemini-store.mjs';
import { runGeminiInvestigation } from '../db/benchmark/gemini-runner.mjs';

const world = createWorld('incident'), snapshot = snapshotOf('case-test', captureWorld(world), initialWindows, world.observations);
const packet = () => packetFromSnapshot(snapshot);
const scope = { workspaceId: 'local_saas', caseId: 'case-test', runId: 'attempt_test', actorId: 'local_owner',
  start: packet().frame.start, clock: snapshot.asOf };

test('a Case packet gets its own format, and the restricted worker prepares it without reading the simulator', async () => {
  const observable = packet();
  assert.equal(formatOf(observable).version, VERSION);
  const prepared = await isolatedGemini({ operation: 'prepare', observable, scope, options: {} });
  assert.deepEqual([...prepared.exposedEvidenceIds].sort(), snapshot.evidence.map(e => e.id).sort());
  assert(!JSON.stringify(prepared.body).includes('observationStep'));
  const paths = ['db/cases/world.mjs', 'db/cases/measurement.mjs'].map(p => resolve(p));
  assert.equal((await isolatedGemini({ operation: 'probe', paths })).readDenials, paths.length);
});

test('packet checks accept every scenario and reject tampered, impossible, foreign, future and extra evidence', () => {
  for (const name of ['incident', 'limited', 'ineffective', 'partial', 'incomplete', 'normal', 'spontaneous']) {
    const other = createWorld(name), observable = packetFromSnapshot(snapshotOf('case-test', captureWorld(other), initialWindows, other.observations));
    assert.equal(validateObservable(observable, scope).events.length, observable.events.length);
  }
  const tampered = packet(); tampered.events.find(e => e.kind === 'support').detail = 'The owner approved this rollback.';
  assert.throws(() => validateObservable(tampered, scope), /evidence_hash_mismatch/);
  // Impossible values are refused even when the evidence hash is recomputed over them.
  const forged = (kind, change) => {
    const evidence = structuredClone(snapshot.evidence); change(evidence.find(e => e.kind === kind));
    return packetFromSnapshot({ ...snapshot, evidence });
  };
  for (const [kind, change] of [['conversion', e => { e.intents = -1; }], ['conversion', e => { e.successes = e.intents + 1; }],
    ['conversion', e => { e.conversionPercent = String(e.conversionPercent); }], ['conversion', e => { e.complete = 'yes'; }],
    ['health', e => { e.failures = -80; }], ['support', e => { e.cohort = 'everyone'; }], ['deployment', e => { e.to = e.from; }]])
    assert.throws(() => validateObservable(forged(kind, change), scope), /invalid_evidence_value/);
  assert.throws(() => validateObservable(packet(), { ...scope, caseId: 'case-other' }), /packet_scope_mismatch/);
  const future = packet(); future.events.find(e => e.kind === 'support').availableAt = '2026-10-01T10:00:00.000Z';
  assert.throws(() => validateObservable(future, scope), /future_evidence/);
  assert.throws(() => validateObservable({ ...packet(), expectedAnswer: 'rollback' }, scope), /unknown\/missing fields/);
});

test('the runner refuses tool mode for a Case packet before it uses up the run', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'crosssignal-saas-packet-')), observable = packet();
  const store = new GeminiStore(join(dir, 'case.sqlite'), { metadata: { scope, frame: observable.frame, method: 'tool-using-model' }, observable });
  try {
    await assert.rejects(runGeminiInvestigation({ observable, scope, method: 'tool-using-model', store, transport: {} }), /method_not_supported_by_format/);
    assert.equal(store.history().length, 0);
  } finally { store.close(); rmSync(dir, { recursive: true }); }
});

test('a Case recording reopens through the packet format, and a failed reopen lets go of the file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'crosssignal-saas-packet-')), path = join(dir, 'case.sqlite'), observable = packet();
  const store = new GeminiStore(path, { metadata: { scope, frame: observable.frame, method: 'single-shot-model' }, observable });
  store.claim(); store.close();
  const reopened = new GeminiStore(path); assert.equal(reopened.format.version, VERSION); reopened.close();
  const db = new DatabaseSync(path), row = db.prepare('SELECT * FROM benchmark_evidence').all().find(r => JSON.parse(r.payload).kind === 'support');
  db.exec('DROP TRIGGER benchmark_evidence_UPDATE');
  db.prepare('UPDATE benchmark_evidence SET payload=? WHERE evidence_id=?').run(JSON.stringify({ ...JSON.parse(row.payload), detail: 'Approved.' }), row.evidence_id);
  db.close();
  assert.throws(() => new GeminiStore(path), /evidence_hash_mismatch/);
  // Windows refuses to delete a file SQLite still holds open, so this fails if the failed reopen kept its handle.
  rmSync(dir, { recursive: true });
});
