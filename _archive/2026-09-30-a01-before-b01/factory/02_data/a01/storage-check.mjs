import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdtempSync, unlinkSync, rmdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const scope = ["lab-workspace-01", "case-7f31", "run-0001"];
const digest = "a".repeat(64);
const effect = (db, id = "effect-01") => db.prepare("INSERT INTO effects VALUES (?,?,?,?,?,?,?,?)").run(...scope, id, "grant-01", "intent-01", digest, digest);
const checkpoint = db => {
  db.prepare("INSERT INTO world_versions VALUES (?,?,?,?,?,?,?)").run(...scope, 1, "2026-09-01T10:00:00.000Z", digest, '{"checkout":"v141"}');
  db.prepare("INSERT INTO timeline VALUES (?,?,?,?,?,?,?,?,?)").run(...scope, 1, "event-effect-01", "effect_confirmed", "2026-09-01T10:00:00.000Z", digest, '{"effectId":"effect-01"}');
};
if (process.argv[2] === "interrupt") {
  const db = new DatabaseSync(process.argv[3]);
  db.exec("PRAGMA foreign_keys = ON; BEGIN IMMEDIATE;"); effect(db); checkpoint(db);
  process.exit(17); // Intentional interruption before commit; no file deletion.
}
export function checkStorage() {
  const directory = mkdtempSync(join(tmpdir(), "crosssignal-a01-data-"));
  const path = join(directory, "contract.sqlite");
  let db;
  let rejections = 0;
  const rejects = (fn) => { assert.throws(fn); rejections++; };
  try {
    db = new DatabaseSync(path);
    db.exec(readFileSync(new URL("./store.sql", import.meta.url), "utf8"));
    const runs = db.prepare("INSERT INTO runs VALUES (?,?,?,?,?,?)");
    runs.run(...scope, "SIMULATED", "fixed-seed", digest);
    runs.run("foreign", scope[1], scope[2], "SIMULATED", "fixed-seed", digest);
    rejects(() => runs.run("live", scope[1], scope[2], "LIVE", "seed", digest));
    rejects(() => db.prepare("INSERT INTO evidence VALUES (?,?,?,?,?,?)").run(...scope, "bad", digest, "{}"));
    const intents = db.prepare("INSERT INTO intents VALUES (?,?,?,?,?,?)");
    rejects(() => intents.run(...scope, "manual", digest, JSON.stringify({ action: { kind: "internal_test_validation", environment: "TEST" } })));
    rejects(() => intents.run(...scope, "missing", digest, "{}"));
    intents.run(...scope, "intent-01", digest, JSON.stringify({ action: { kind: "simulated_rollback", environment: "SIMULATED" } }));
    const grants = db.prepare("INSERT INTO grants VALUES (?,?,?,?,?,?,?,?,?)");
    rejects(() => grants.run("foreign", scope[1], scope[2], "bad", "intent-01", digest, "local-owner", "2026-09-01T10:15:00.000Z", "fixture_surrogate"));
    rejects(() => grants.run(...scope, "bad", "intent-01", "b".repeat(64), "local-owner", "2026-09-01T10:15:00.000Z", "fixture_surrogate"));
    rejects(() => effect(db));
    grants.run(...scope, "grant-01", "intent-01", digest, "local-owner", "2026-09-01T10:15:00.000Z", "fixture_surrogate");
    db.prepare("INSERT INTO world_versions VALUES (?,?,?,?,?,?,?)").run(...scope, 0, "2026-09-01T10:00:00.000Z", digest, '{"checkout":"v142"}');
    db.close(); db = null;
    const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), "interrupt", path], { encoding: "utf8", timeout: 10000 });
    assert.equal(child.status, 17, child.stderr);
    db = new DatabaseSync(path); db.exec("PRAGMA foreign_keys = ON;");
    assert.equal(db.prepare("SELECT count(*) AS n FROM effects").get().n, 0, "uncommitted effect survived interruption");
    assert.equal(db.prepare("SELECT count(*) AS n FROM world_versions").get().n, 1, "uncommitted world survived interruption");
    assert.equal(db.prepare("SELECT count(*) AS n FROM timeline").get().n, 0, "uncommitted timeline survived interruption");
    db.exec("BEGIN IMMEDIATE;"); effect(db); checkpoint(db); db.exec("COMMIT;");
    rejects(() => effect(db, "effect-02"));
    rejects(() => db.exec("UPDATE effects SET reservation_hash = 'changed'"));
    rejects(() => db.exec("DELETE FROM grants"));
    rejects(() => db.exec("UPDATE runs SET seed = 'changed'"));
    db.close(); db = new DatabaseSync(path);
    assert.equal(db.prepare("SELECT count(*) AS n FROM effects").get().n, 1);
    assert.equal(db.prepare("SELECT count(*) AS n FROM world_versions").get().n, 2);
    assert.equal(db.prepare("SELECT count(*) AS n FROM timeline").get().n, 1);
    return { rejections, interruptedTransactionRolledBack: true, committedEffectsAfterReopen: 1, committedWorldRevisions: 2, committedTimelineEvents: 1 };
  } finally {
    db?.close();
    for (const file of [path, `${path}-journal`, `${path}-wal`, `${path}-shm`]) if (existsSync(file)) unlinkSync(file);
    rmdirSync(directory);
  }
}
