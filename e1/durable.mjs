// Write-ahead file helpers shared by the run log (ticket 14) and the simulator journal (ticket 07): a line is on
// disk before the caller acts on it, and a torn last line is cut and saved, never silently kept or dropped.
import { createHash } from 'node:crypto';
import { closeSync, existsSync, fstatSync, fsyncSync, ftruncateSync, openSync, readFileSync, readSync, writeSync } from 'node:fs';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export function writeAll(fd, text) {
  const bytes = Buffer.from(text);
  for (let at = 0; at < bytes.length;) at += writeSync(fd, bytes, at, bytes.length - at);
  fsyncSync(fd);
}

export function readAll(fd) {
  const bytes = Buffer.alloc(fstatSync(fd).size);
  readSync(fd, bytes, 0, bytes.length, 0);
  return bytes;
}

// Cuts everything after `end` (the byte after the last newline) from a file open for writing. The cut bytes are
// first saved to `<path>.torn-<end>`, so a caller that dies after the cut still finds them on the next open: any
// line written after a cut moves the end, so a saved cut at this offset has not been recorded yet. Returns the
// cut's length and hash, or null when there is nothing to record.
export function cutTornTail(path, fd, bytes, end) {
  const saved = `${path}.torn-${end}`;
  let cut = existsSync(saved) ? readFileSync(saved) : null;
  if (end < bytes.length) {
    cut = bytes.subarray(end);
    const side = openSync(saved, 'w');
    writeAll(side, cut); closeSync(side);
    ftruncateSync(fd, end); fsyncSync(fd);
  }
  return cut && { bytes: cut.length, sha256: sha256(cut) };
}
