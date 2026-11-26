import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { check } from './world.mjs';

// The owner's lifetime ceiling on order-recovery spend, one number in USD; raise it there to let sends through again.
export const spendFile = fileURLToPath(new URL('./spend.json', import.meta.url));
export function spendCeilingMicros(file = spendFile) {
  let usd;
  try { usd = JSON.parse(readFileSync(file, 'utf8'))?.lifetimeCeilingUsd; } catch { usd = undefined; }
  check(typeof usd === 'number' && usd >= 0 && Number.isSafeInteger(Math.round(usd * 1000000)), 'invalid_spend_ceiling');
  return Math.round(usd * 1000000);
}

// One ledger in the git common folder counts every worktree's sends. Spend is lifetime: a reservation counts in full
// until it is settled to the provider's reported cost, so a send with an unknown outcome keeps its worst case.
export class OrderBudget {
  constructor(path, ceilingMicros) {
    check(Number.isSafeInteger(ceilingMicros) && ceilingMicros >= 0, 'invalid_spend_ceiling');
    this.ceilingMicros = ceilingMicros;
    this.db = new DatabaseSync(path);
    // Ledgers made before spend.json kept a fixed $25 cap in a `policy` table. Used spend lives only in `sends`,
    // so dropping that table keeps the used total and leaves spend.json the one ceiling.
    this.db.exec(`PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON; PRAGMA synchronous=FULL;
      DROP TABLE IF EXISTS policy;
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
  // `admit` runs inside the same write transaction, so a caller's own cap (the E1 probe's) is checked atomically with
  // the insert: no other process can reserve between its read and this one's write.
  reserve(runId, attempt, micros, admit = () => {}) {
    check(Number.isSafeInteger(micros) && micros >= 0, 'invalid_spend_reservation');
    this.transaction(() => {
      check(micros <= this.ceilingMicros - this.usedMicros(), 'spend_ceiling_reached');
      admit(micros);
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
