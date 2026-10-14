import { openSync, writeFileSync, readFileSync, closeSync, unlinkSync } from 'node:fs';
import { requireThat as check } from '../benchmark/contracts.mjs';
// A second local host must not recover the first host's in-flight model request.
export function lockHost(path) {
  let fd;
  for (let attempt = 0; attempt < 2; attempt++) {
    try { fd = openSync(path, 'wx'); break; }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const pid = Number(readFileSync(path, 'utf8'));
      check(Number.isSafeInteger(pid) && pid > 0, 'host_lock_invalid');
      try { process.kill(pid, 0); throw new Error('case_host_already_running'); }
      catch (probe) { if (probe.code !== 'ESRCH') throw probe; }
      unlinkSync(path);
    }
  }
  check(fd !== undefined, 'host_lock_failed'); writeFileSync(fd, String(process.pid)); closeSync(fd);
  let released = false;
  return () => { if (!released) { released = true; unlinkSync(path); } };
}
