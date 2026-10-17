import { DatabaseSync } from 'node:sqlite';
import { openSync, closeSync } from 'node:fs';
import { canonical, digest, requireThat } from './contracts.mjs';
import { formatOf, storedObservable } from './formats.mjs';

// New benchmark-only SQLite databases. No A01 imports, migrations or effect endpoint.
// A daily case keeps its frame in the run metadata, so a reopened run can check its evidence against it.
export class GeminiStore {
  constructor(path, { metadata, observable } = {}) {
    if (metadata) {
      const format = formatOf(observable);
      format.validateScope(metadata.scope); format.validateObservable(observable, metadata.scope);
      requireThat(canonical(metadata.frame ?? null) === canonical(observable.frame ?? null), 'run_frame_mismatch');
      const fd = openSync(path, 'wx'); closeSync(fd); // Existing files can never be replaced.
    }
    this.db = new DatabaseSync(path);
    try {
      this.db.exec('PRAGMA foreign_keys=ON; PRAGMA synchronous=FULL; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=1000;');
      if (metadata) {
        this.db.exec(`
          CREATE TABLE benchmark_runs(workspace TEXT, case_id TEXT, run_id TEXT, metadata TEXT NOT NULL, hash TEXT NOT NULL,
            PRIMARY KEY(workspace,case_id,run_id)) STRICT;
          CREATE TABLE benchmark_evidence(workspace TEXT, case_id TEXT, run_id TEXT, evidence_id TEXT, payload TEXT NOT NULL,
            PRIMARY KEY(workspace,case_id,run_id,evidence_id),
            FOREIGN KEY(workspace,case_id,run_id) REFERENCES benchmark_runs(workspace,case_id,run_id)) STRICT;
          CREATE TABLE benchmark_timeline(workspace TEXT,case_id TEXT,run_id TEXT,sequence INTEGER,kind TEXT NOT NULL,
            payload TEXT NOT NULL,previous_hash TEXT NOT NULL,hash TEXT NOT NULL,
            PRIMARY KEY(workspace,case_id,run_id,sequence),
            FOREIGN KEY(workspace,case_id,run_id) REFERENCES benchmark_runs(workspace,case_id,run_id)) STRICT;
          CREATE VIEW benchmark_transcripts AS SELECT * FROM benchmark_timeline WHERE kind IN ('request','response','tool_attempt','tool_result');
          CREATE VIEW benchmark_findings AS SELECT * FROM benchmark_timeline WHERE kind='terminal';
        `);
        for (const table of ['benchmark_runs', 'benchmark_evidence', 'benchmark_timeline'])
          for (const op of ['UPDATE', 'DELETE']) this.db.exec(`CREATE TRIGGER ${table}_${op} BEFORE ${op} ON ${table} BEGIN SELECT RAISE(ABORT,'append_only'); END;`);
        const scope = metadata.scope;
        this.db.exec('BEGIN IMMEDIATE');
        try {
          this.db.prepare('INSERT INTO benchmark_runs VALUES(?,?,?,?,?)').run(scope.workspaceId, scope.caseId, scope.runId, canonical(metadata), digest(metadata));
          const insert = this.db.prepare('INSERT INTO benchmark_evidence VALUES(?,?,?,?,?)');
          for (const event of observable.events) insert.run(scope.workspaceId, scope.caseId, scope.runId, event.id, canonical(event));
          this.db.exec('COMMIT');
        } catch (e) { this.db.exec('ROLLBACK'); throw e; }
      }
      const rows = this.db.prepare('SELECT * FROM benchmark_runs').all();
      requireThat(rows.length === 1 && digest(JSON.parse(rows[0].metadata)) === rows[0].hash, 'run_metadata_corrupt');
      this.metadata = JSON.parse(rows[0].metadata);
      this.format = formatOf(storedObservable(this.metadata, [])); this.format.validateScope(this.metadata.scope);
      this.validate();
    } catch (error) { this.db.close(); throw error; }
  }
  validate() {
    const { scope } = this.metadata;
    const evidence = this.db.prepare('SELECT * FROM benchmark_evidence ORDER BY evidence_id').all();
    for (const row of evidence) requireThat(row.workspace === scope.workspaceId && row.case_id === scope.caseId && row.run_id === scope.runId, 'stored_evidence_scope_mismatch');
    // The exact frozen observable shape is retained in run metadata for reopen checks.
    this.format.validateObservable(storedObservable(this.metadata, evidence.map(e => JSON.parse(e.payload))), scope);
    let previous = '0'.repeat(64), sequence = 0;
    for (const row of this.history()) {
      requireThat(row.workspace === scope.workspaceId && row.case_id === scope.caseId && row.run_id === scope.runId
        && row.sequence === ++sequence && row.previous_hash === previous, 'timeline_scope_or_sequence_corrupt');
      const body = { scope, sequence: row.sequence, kind: row.kind, payload: JSON.parse(row.payload), previousHash: previous };
      requireThat(digest(body) === row.hash, 'timeline_hash_corrupt'); previous = row.hash;
    }
    return { sequence, previous };
  }
  history() { return this.db.prepare('SELECT * FROM benchmark_timeline ORDER BY sequence').all(); }
  append(kind, payload) {
    requireThat(/^[a-z_]{1,40}$/.test(kind), 'invalid_record_kind');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const rows = this.history();
      requireThat(!rows.some(r => r.kind === 'terminal'), 'run_already_terminal');
      requireThat(kind !== 'started' || rows.length === 0, 'run_already_started_no_automatic_replay');
      const scope = this.metadata.scope, sequence = rows.length + 1, previousHash = rows.at(-1)?.hash ?? '0'.repeat(64);
      const body = { scope, sequence, kind, payload: structuredClone(payload), previousHash };
      this.db.prepare('INSERT INTO benchmark_timeline VALUES(?,?,?,?,?,?,?,?)').run(scope.workspaceId, scope.caseId, scope.runId,
        sequence, kind, canonical(payload), previousHash, digest(body));
      this.db.exec('COMMIT'); return { sequence, hash: digest(body) };
    } catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }
  claim() {
    requireThat(this.history().length === 0, 'run_already_started_no_automatic_replay');
    return this.append('started', { atUtc: new Date().toISOString(), truthMode: this.format.truthMode });
  }
  recover() {
    this.validate();
    const rows = this.history(), terminal = rows.find(r => r.kind === 'terminal');
    if (terminal) return JSON.parse(terminal.payload);
    // Interrupted requests are never regenerated or resumed with forgotten budgets.
    const lastRequest=rows.filter(r=>r.kind==='request').at(-1)?.sequence??0;
    const lastResponse=rows.filter(r=>r.kind==='response').at(-1)?.sequence??0;
    return this.append('terminal', { terminalStatus: lastRequest>lastResponse?'indeterminate_usage':'interrupted',
      usage: null, usageUnavailableReason: 'interrupted_run_no_replay', modelRequestsBlocked: true });
  }
  close() { this.db.close(); }
}
