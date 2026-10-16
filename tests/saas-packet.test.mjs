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

test('packet checks reject tampered, foreign, future and extra evidence', () => {
  assert.equal(validateObservable(packet(), scope).events.length, snapshot.evidence.length);
  const tampered = packet(); tampered.events.find(e => e.kind === 'conversion').successes++;
  assert.throws(() => validateObservable(tampered, scope), /evidence_hash_mismatch/);
  assert.throws(() => validateObservable(packet(), { ...scope, caseId: 'case-other' }), /packet_scope_mismatch/);
  const future = packet(); future.events.find(e => e.kind === 'support').availableAt = '2026-10-01T10:00:00.000Z';
  assert.throws(() => validateObservable(future, scope), /future_evidence/);
  assert.throws(() => validateObservable({ ...packet(), expectedAnswer: 'rollback' }, scope), /unknown\/missing fields/);
});

test('a Case recording reopens through the packet format, and a failed reopen lets go of the file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'crosssignal-saas-packet-')), path = join(dir, 'case.sqlite'), observable = packet();
  const store = new GeminiStore(path, { metadata: { scope, frame: observable.frame, method: 'single-shot-model' }, observable });
  store.claim(); store.close();
  const reopened = new GeminiStore(path); assert.equal(reopened.format.version, VERSION); reopened.close();
  const db = new DatabaseSync(path), row = db.prepare('SELECT * FROM benchmark_evidence').all().find(r => JSON.parse(r.payload).kind === 'conversion');
  db.exec('DROP TRIGGER benchmark_evidence_UPDATE');
  db.prepare('UPDATE benchmark_evidence SET payload=? WHERE evidence_id=?').run(JSON.stringify({ ...JSON.parse(row.payload), successes: 0 }), row.evidence_id);
  db.close();
  assert.throws(() => new GeminiStore(path), /evidence_hash_mismatch/);
  // Windows refuses to delete a file SQLite still holds open, so this fails if the failed reopen kept its handle.
  rmSync(dir, { recursive: true });
});
