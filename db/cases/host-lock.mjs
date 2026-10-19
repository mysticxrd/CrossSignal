import { DatabaseSync } from 'node:sqlite';
// A second local host must not recover the first host's in-flight model request. An open exclusive SQLite
// transaction is an operating-system file lock: another host is refused, and a host that dies releases it,
// so there is no stale lock to remove and no takeover to race.
export function lockHost(path) {
  const db = new DatabaseSync(path);
  try { db.exec('BEGIN EXCLUSIVE'); }
  catch (error) { db.close(); throw error.errcode === 5 ? new Error('case_host_already_running') : error; } // 5 is SQLITE_BUSY
  let released = false;
  return () => { if (!released) { released = true; db.close(); } };
}
