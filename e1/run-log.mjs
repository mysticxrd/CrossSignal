// The E1 run log (ticket 14; section 7 decisions 1, 2 and 16; ADR 0007): one append-only JSONL file per run. Each
// line is the canonical JSON of one event and is fsynced before append() returns, so the caller writes an intent
// line and only then makes the send, call or operation it announces. Every line carries `seq` and `prev`, the
// sha256 of the previous line's bytes (the header's `prev` is zeros), so a changed byte anywhere breaks the chain.
// A lock file beside the log admits one writer per run id.
import { createHash } from 'node:crypto';
import { closeSync, fsyncSync, ftruncateSync, openSync, readFileSync, readSync, unlinkSync, writeSync, fstatSync } from 'node:fs';
import { hostname } from 'node:os';
import { canonicalJson } from './canonical.mjs';

export const ZERO = '0'.repeat(64);
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export const INTENT_OF = { send_attempt: 'send_intent', send_outcome: 'send_intent', call_outcome: 'call_intent', op_outcome: 'op_intent' };
const ONE_OUTCOME = new Set(['send_outcome', 'call_outcome', 'op_outcome']);
export const EVENT_TYPES = new Set([
  'header', 'send_intent', 'send_attempt', 'send_outcome', 'call_intent', 'call_outcome', 'nudge', 'proposal_retry',
  'proposal', 'priced_proposal', 'notice', 'decision', 'op_intent', 'op_outcome', 'guard_catch', 'stop', 'resume',
  'verification', 'watch_window', 'stamp', 'closed',
]);
export const VOID_STATUSES = new Set(['provider_unavailable', 'spend_ceiling_reached', 'model_version_changed', 'reservation_bound_broken']);
const FAIL_STATUSES = ['malformed_proposal', 'no_action', 'run_timeout', 'context_overflow', 'harness_error', 'verification_mismatch'];
export const STATUSES = new Set(['proposed', ...FAIL_STATUSES, ...VOID_STATUSES, 'crashed']);
const TIERS = ['landed', 'fixed', 'realised'];

const plain = value => value === null || typeof value === 'string' || typeof value === 'boolean' || Number.isFinite(value)
  || (Array.isArray(value) ? value.every(plain)
    : typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype && Object.values(value).every(plain));
const lockPath = path => `${path}.lock`;
const alive = pid => { try { process.kill(pid, 0); return true; } catch (error) { return error.code === 'EPERM'; } };

// O_CREAT|O_EXCL ('wx') is one atomic create on NTFS and POSIX alike, so of two writers exactly one gets the lock.
// A lock left by a dead process on this host is stale; only the crash closer may take it over (takeStale), and the
// batch lock (F5, ticket 20) keeps two closers from racing for it.
function acquireLock(path, { takeStale = false } = {}) {
  const lock = lockPath(path);
  const body = `${JSON.stringify({ pid: process.pid, host: hostname() })}\n`;
  try {
    const fd = openSync(lock, 'wx');
    writeSync(fd, body); fsyncSync(fd); closeSync(fd);
    return;
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
  let holder = null;
  try { holder = JSON.parse(readFileSync(lock, 'utf8')); } catch { /* half-written lock: treat as held */ }
  const stale = holder && holder.host === hostname() && holder.pid !== process.pid && !alive(holder.pid);
  if (!(takeStale && stale)) {
    throw Object.assign(new Error(`run_locked: ${lock} is held by ${holder ? `pid ${holder.pid} on ${holder.host}` : 'an unknown writer'}`), { code: 'run_locked', holder });
  }
  unlinkSync(lock);
  acquireLock(path);
}

function writeAll(fd, text) {
  const bytes = Buffer.from(text, 'utf8');
  for (let at = 0; at < bytes.length;) at += writeSync(fd, bytes, at, bytes.length - at);
  fsyncSync(fd);
}

export class RunLog {
  constructor(path, fd, seq, head) { Object.assign(this, { path, fd, seq, head, closed: false }); }

  // Writes one event and returns once it is on disk. `seq`, `prev` and `type` belong to the log, not the caller.
  append(type, fields = {}) {
    if (this.closed) throw new Error(`run log ${this.path} is closed`);
    if (!EVENT_TYPES.has(type)) throw new Error(`unknown run-log event type: ${type}`);
    for (const key of ['seq', 'prev', 'type']) if (key in fields) throw new Error(`run-log field ${key} is set by the log`);
    // Refuse anything JSON can't carry back as itself (undefined, NaN becoming null, Dates, class instances): the
    // reader must rebuild these exact bytes and these exact values.
    if (!plain(fields)) throw new Error(`run-log ${type} fields must be plain JSON values`);
    const line = canonicalJson({ ...fields, type, seq: this.seq, prev: this.head });
    writeAll(this.fd, `${line}\n`);
    const event = { seq: this.seq, hash: sha256(line) };
    this.seq += 1; this.head = event.hash;
    return event;
  }

  // `closed` is the last line; the lock goes only after it is on disk.
  close(status, fields = {}) {
    if (!STATUSES.has(status)) throw new Error(`unknown run status: ${status}`);
    const event = this.append('closed', { ...fields, status });
    closeSync(this.fd); this.closed = true;
    unlinkSync(lockPath(this.path));
    return event;
  }
}

// Opens a new run log: takes the lock, creates the file (refusing one that exists) and writes the header.
export function createRunLog(path, header) {
  acquireLock(path);
  let fd;
  try { fd = openSync(path, 'wx'); } catch (error) { unlinkSync(lockPath(path)); throw error; }
  const log = new RunLog(path, fd, 0, ZERO);
  log.append('header', header);
  return log;
}

// Checks a whole file: every line canonical, `seq` contiguous from 0, every `prev` the hash of the line before.
export function verifyChain(text) {
  const lines = text.split('\n');
  if (lines.at(-1) !== '') return { ok: false, error: { seq: lines.length - 1, reason: 'torn last line' } };
  const events = [];
  let head = ZERO;
  for (const [index, line] of lines.slice(0, -1).entries()) {
    let event;
    try { event = JSON.parse(line); } catch { return { ok: false, error: { seq: index, reason: 'not JSON' } }; }
    if (canonicalJson(event) !== line) return { ok: false, error: { seq: index, reason: 'not canonical' } };
    if (event.seq !== index) return { ok: false, error: { seq: index, reason: `seq ${event.seq}, expected ${index}` } };
    if (event.prev !== head) return { ok: false, error: { seq: index, reason: 'prev does not match the line before' } };
    events.push(event);
    head = sha256(line);
  }
  return { ok: true, events, head };
}

// Reopens an unclosed log after a crash: takes the lock (a dead writer's lock with takeStale), cuts a torn last
// line, keeping its length and hash, and refuses a broken chain or a closed log. The caller writes the line that
// says why it reopened: `resume` (executor) or the crash closer's `stamp` and `closed`.
export function reopenRunLog(path, { takeStale = false } = {}) {
  acquireLock(path, { takeStale });
  try {
    const fd = openSync(path, 'r+');
    const bytes = Buffer.alloc(fstatSync(fd).size);
    readSync(fd, bytes, 0, bytes.length, 0);
    const end = bytes.lastIndexOf(0x0a) + 1;
    let torn = null;
    if (end < bytes.length) {
      const cut = bytes.subarray(end);
      torn = { bytes: cut.length, sha256: sha256(cut) };
      ftruncateSync(fd, end); fsyncSync(fd);
    }
    const chain = verifyChain(bytes.subarray(0, end).toString('utf8'));
    if (!chain.ok) { closeSync(fd); throw new Error(`run log ${path} breaks at seq ${chain.error.seq}: ${chain.error.reason}`); }
    if (chain.events.at(-1)?.type === 'closed') { closeSync(fd); throw new Error(`run log ${path} is already closed`); }
    const log = new RunLog(path, openSync(path, 'a'), chain.events.length, chain.head);
    closeSync(fd);
    return { log, events: chain.events, torn };
  } catch (error) {
    unlinkSync(lockPath(path));
    throw error;
  }
}

const danglingIntents = events => {
  const answered = new Set(events.filter(e => ONE_OUTCOME.has(e.type)).map(e => e.intent));
  return events.filter(e => e.type.endsWith('_intent') && !answered.has(e.seq)).map(e => e.seq);
};

// Closes a log whose writer died (section 7 decision 2): cuts a torn line, then a stamp with every tier not run
// and `closed` naming the dangling intents and the torn bytes. The restart opens a new run with `restart_of`.
export function closeCrashed(path, { status = 'crashed', takeStale = true } = {}) {
  if (status !== 'crashed' && !VOID_STATUSES.has(status)) throw new Error(`a crash closer writes crashed or a void status, not ${status}`);
  const { log, events, torn } = reopenRunLog(path, { takeStale });
  log.append('stamp', Object.fromEntries(TIERS.map(tier => [tier, `not_run(${status})`])));
  return log.close(status, { dangling: danglingIntents(events), torn });
}

const count = (events, type) => events.filter(e => e.type === type).length;

// Section 7 decision 16. Returns every broken rule; an empty list means the log may reach the grader, and a
// non-empty one makes the run harness_error.
export function cardinality(events) {
  const broken = [];
  const rule = (ok, text) => { if (!ok) broken.push(text); };
  rule(events[0]?.type === 'header' && count(events, 'header') === 1, 'exactly one header, first');
  const closed = events.at(-1);
  rule(closed?.type === 'closed' && count(events, 'closed') === 1, 'exactly one closed, last');
  rule(events.at(-2)?.type === 'stamp' && count(events, 'stamp') === 1, 'exactly one stamp, just before closed');
  rule(events.every((e, i) => e.seq === i), 'contiguous seq from 0');
  for (const e of events) rule(EVENT_TYPES.has(e.type), `known event type (${e.type} at seq ${e.seq})`);
  const status = closed?.status;
  rule(STATUSES.has(status), `known status (${status})`);

  const bySeq = new Map(events.map(e => [e.seq, e]));
  const outcomes = new Map();
  for (const e of events.filter(x => x.type in INTENT_OF)) {
    const intent = bySeq.get(e.intent);
    rule(intent?.type === INTENT_OF[e.type] && intent.seq < e.seq, `${e.type} at seq ${e.seq} names an earlier ${INTENT_OF[e.type]}`);
    if (ONE_OUTCOME.has(e.type)) {
      rule(!outcomes.has(e.intent), `one outcome for the intent at seq ${e.intent}`);
      outcomes.set(e.intent, e.seq);
    }
  }
  const dangling = danglingIntents(events);
  rule(dangling.length === 0 || status === 'crashed' || VOID_STATUSES.has(status), `dangling intents (${dangling.join(', ')}) only under crashed or void`);

  const stamp = events.find(e => e.type === 'stamp');
  if (status === 'proposed') {
    rule(count(events, 'proposal') === 1 && count(events, 'proposal_retry') <= 1, 'proposed: one proposal, at most two attempts');
    rule(count(events, 'priced_proposal') === 1 && count(events, 'decision') === 1, 'proposed: one priced proposal and one decision');
    rule(count(events, 'verification') <= 1, 'proposed: at most one verification');
    // Op keys are unique within each execution attempt; a `resume` starts the next attempt, where `reconciled`
    // outcomes may name the same keys again.
    let keys = new Set();
    for (const e of events) {
      if (e.type === 'resume') keys = new Set();
      if (e.type !== 'op_intent') continue;
      rule(!keys.has(e.key), `op key ${e.key} once per execution attempt`);
      keys.add(e.key);
    }
  } else {
    if (status === 'malformed_proposal') rule(count(events, 'proposal_retry') === 2, 'malformed_proposal: two proposal attempts');
    for (const type of ['proposal', 'priced_proposal', 'decision', 'op_intent', 'op_outcome', 'verification']) {
      rule(count(events, type) === 0, `${status}: no ${type}`);
    }
    for (const tier of TIERS) rule(stamp?.[tier] === `not_run(${status})`, `${status}: stamp ${tier} is not_run(${status})`);
  }
  return broken;
}
