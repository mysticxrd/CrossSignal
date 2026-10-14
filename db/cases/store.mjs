import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { digest, canonical, requireThat as check } from '../benchmark/contracts.mjs';
export const newId = prefix => `${prefix}_${randomUUID().replaceAll('-', '')}`;
export class CaseStore {
  constructor(path) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=2000;
      CREATE TABLE IF NOT EXISTS cases(id TEXT PRIMARY KEY, creation_key TEXT UNIQUE NOT NULL, scenario TEXT NOT NULL, state TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS case_events(case_id TEXT NOT NULL REFERENCES cases(id), sequence INTEGER NOT NULL,
        kind TEXT NOT NULL, payload TEXT NOT NULL, previous_hash TEXT NOT NULL, hash TEXT NOT NULL, PRIMARY KEY(case_id,sequence)) STRICT;
      CREATE TABLE IF NOT EXISTS snapshots(hash TEXT PRIMARY KEY, payload TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS attempts(id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES cases(id), snapshot_hash TEXT NOT NULL REFERENCES snapshots(hash),
        status TEXT NOT NULL, path TEXT NOT NULL UNIQUE, source TEXT NOT NULL, result TEXT) STRICT;
      CREATE UNIQUE INDEX IF NOT EXISTS one_model_job ON attempts((1)) WHERE status IN ('queued','running');
      CREATE TABLE IF NOT EXISTS grants(proposal_hash TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES cases(id), payload TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS effects(proposal_hash TEXT PRIMARY KEY REFERENCES grants(proposal_hash), case_id TEXT NOT NULL REFERENCES cases(id), payload TEXT NOT NULL) STRICT;
      CREATE TABLE IF NOT EXISTS execution_jobs(proposal_hash TEXT PRIMARY KEY REFERENCES grants(proposal_hash), status TEXT NOT NULL, reason TEXT) STRICT;
      CREATE TABLE IF NOT EXISTS outcomes(id TEXT PRIMARY KEY, case_id TEXT NOT NULL REFERENCES cases(id), payload TEXT NOT NULL) STRICT;`);
    for (const table of ['case_events', 'snapshots', 'grants', 'effects', 'outcomes']) for (const operation of ['UPDATE', 'DELETE'])
      this.db.exec(`CREATE TRIGGER IF NOT EXISTS ${table}_${operation} BEFORE ${operation} ON ${table} BEGIN SELECT RAISE(ABORT,'append_only'); END;`);
  }
  transaction(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); this.db.exec('COMMIT'); return result; } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  get(id) { const row = this.db.prepare('SELECT state FROM cases WHERE id=?').get(id); check(row, 'case_not_found'); return JSON.parse(row.state); }
  save(state) { state.revision++; this.db.prepare('UPDATE cases SET state=? WHERE id=?').run(canonical(state), state.id); }
  snapshot(value) { this.db.prepare('INSERT OR IGNORE INTO snapshots VALUES(?,?)').run(value.hash, canonical(value)); }
  getSnapshot(hash) {
    const row = this.db.prepare('SELECT payload FROM snapshots WHERE hash=?').get(hash); check(row, 'snapshot_not_found');
    const snapshot = JSON.parse(row.payload), { hash: saved, ...body } = snapshot;
    check(saved === hash && digest(body) === saved, 'snapshot_corrupt'); return snapshot;
  }
  event(id, kind, payload) {
    const previous = this.db.prepare('SELECT sequence,hash FROM case_events WHERE case_id=? ORDER BY sequence DESC LIMIT 1').get(id);
    const sequence = (previous?.sequence ?? 0) + 1, previousHash = previous?.hash ?? '0'.repeat(64);
    const body = { caseId: id, sequence, kind, payload, previousHash };
    this.db.prepare('INSERT INTO case_events VALUES(?,?,?,?,?,?)').run(id, sequence, kind, canonical(payload), previousHash, digest(body));
  }
  history(id) {
    let previousHash = '0'.repeat(64);
    return this.db.prepare('SELECT * FROM case_events WHERE case_id=? ORDER BY sequence').all(id).map((row, i) => {
      const payload = JSON.parse(row.payload);
      check(row.sequence === i + 1 && row.previous_hash === previousHash && row.hash === digest({ caseId: id, sequence: row.sequence,
        kind: row.kind, payload, previousHash }), 'case_history_corrupt'); previousHash = row.hash;
      return { sequence: row.sequence, kind: row.kind, payload, hash: row.hash };
    });
  }
  attempts(id) { return this.db.prepare('SELECT id,snapshot_hash,status,source,result FROM attempts WHERE case_id=? ORDER BY rowid').all(id)
    .map(row => ({ id: row.id, snapshotHash: row.snapshot_hash, status: row.status, source: row.source, result: row.result ? JSON.parse(row.result) : null })); }
  view(id) {
    const state = this.get(id), { world, ...visible } = state;
    return { ...visible, simulationClock: world.clock, serviceVersion: world.serviceVersion, observationStep: world.observationStep,
      attempts: this.attempts(id), history: this.history(id),
      outcomes: this.db.prepare('SELECT payload FROM outcomes WHERE case_id=? ORDER BY rowid').all(id).map(row => JSON.parse(row.payload)) };
  }
  list() { return this.db.prepare('SELECT state FROM cases ORDER BY rowid DESC').all().map(row => {
    const s = JSON.parse(row.state); return { id: s.id, title: s.title, status: s.status, investigation: s.investigation, decision: s.decision, createdAt: s.createdAt }; }); }
  close() { this.db.close(); }
}
