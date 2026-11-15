import { DatabaseSync } from 'node:sqlite';
import { check } from './world.mjs';

export class OrderBudget {
  constructor(path) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON; PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS policy (id INTEGER PRIMARY KEY CHECK(id=1), cap INTEGER NOT NULL CHECK(cap=25000000));
      INSERT OR IGNORE INTO policy VALUES (1,25000000);
      CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, provider TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sends (run TEXT REFERENCES runs(id), attempt INTEGER, reserved INTEGER NOT NULL CHECK(reserved>=0),
        accounted INTEGER CHECK(accounted>=0 AND accounted<=reserved), PRIMARY KEY(run,attempt));`);
  }
  transaction(work) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = work(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  claim(runId, provider) {
    this.transaction(() => {
      check(!this.db.prepare('SELECT 1 FROM runs WHERE id=?').get(runId), 'budget_run_already_claimed');
      this.db.prepare('INSERT INTO runs VALUES (?,?)').run(runId, provider);
    });
  }
  usedMicros() { return this.db.prepare('SELECT COALESCE(SUM(COALESCE(accounted,reserved)),0) AS used FROM sends').get().used; }
  reserve(runId, attempt, micros) {
    check(Number.isSafeInteger(micros) && micros >= 0, 'invalid_spend_reservation');
    this.transaction(() => {
      check(micros <= this.db.prepare('SELECT cap FROM policy WHERE id=1').get().cap - this.usedMicros(), 'nebius_task_budget_exhausted');
      this.db.prepare('INSERT INTO sends VALUES (?,?,?,NULL)').run(runId, attempt, micros);
    });
  }
  settle(runId, attempt, micros) {
    check(Number.isSafeInteger(micros) && micros >= 0, 'invalid_spend_accounting');
    check(this.db.prepare('UPDATE sends SET accounted=? WHERE run=? AND attempt=? AND accounted IS NULL AND reserved>=?')
      .run(micros, runId, attempt, micros).changes === 1, 'spend_accounting_mismatch');
  }
  close() { this.db.close(); }
}
