import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { hostname, tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { ZERO, cardinality, closeCrashed, createRunLog, reopenRunLog, sha256, verifyChain } from '../e1/run-log.mjs';

const fresh = () => join(mkdtempSync(join(tmpdir(), 'e1-runlog-')), 'r_test.jsonl');
const HEADER = { run_id: 'r_test', batch: 'b0', case_id: 'c_000000000000', schema: 1, world: 'simulated' };

// A proposed run with one call, one operation and a verification: the shape every rule below is tested against.
function proposedRun(path) {
  const log = createRunLog(path, HEADER);
  const send = log.append('send_intent', { turn: 1 });
  log.append('send_attempt', { intent: send.seq, attempt: 1, http: 200 });
  log.append('send_outcome', { intent: send.seq, finish_reason: 'tool_calls' });
  const call = log.append('call_intent', { tool: 'list_payments' });
  log.append('call_outcome', { intent: call.seq, result: 'ok ₹1,499' });
  log.append('proposal', { kind: 'fix' });
  log.append('priced_proposal', { rupees_paise: 149900 });
  log.append('decision', { approved: true });
  const op = log.append('op_intent', { key: 'k1' });
  log.append('op_outcome', { intent: op.seq, result: 'landed' });
  log.append('verification', { landed: 'verified' });
  log.append('stamp', { landed: 'verified', fixed: 'resolved', realised: 149900 });
  log.close('proposed');
  return path;
}

const events = path => verifyChain(readFileSync(path, 'utf8')).events;

test('the chain verifies, and a changed line breaks it', () => {
  const path = proposedRun(fresh());
  const text = readFileSync(path, 'utf8');
  const chain = verifyChain(text);
  assert.ok(chain.ok);
  assert.equal(chain.events[0].prev, ZERO);
  assert.equal(chain.head, sha256(text.trimEnd().split('\n').at(-1)));
  assert.deepEqual(cardinality(chain.events), []);
  assert.ok(!existsSync(`${path}.lock`), 'closing releases the lock');

  // Same length, still canonical JSON: only the chain can catch it, at the line after the edit.
  const edited = text.replace('"rupees_paise":149900', '"rupees_paise":149901');
  assert.deepEqual(verifyChain(edited).error, { seq: 8, reason: 'prev does not match the line before' });
  // Extra whitespace is the same value in different bytes, and is refused as well.
  assert.equal(verifyChain(text.replace('{"approved":true,', '{"approved" :true,')).error.reason, 'not canonical');
  const lines = text.split('\n');
  [lines[2], lines[3]] = [lines[3], lines[2]];
  assert.equal(verifyChain(lines.join('\n')).error.seq, 2);
});

test('the writer refuses fields it owns and values JSON cannot carry back', () => {
  const log = createRunLog(fresh(), HEADER);
  assert.throws(() => log.append('notice', { seq: 9 }), /set by the log/);
  assert.throws(() => log.append('notice', { cost: undefined }), /plain JSON values/);
  assert.throws(() => log.append('notice', { cost: Number.NaN }), /plain JSON values/);
  assert.throws(() => log.append('mystery'), /unknown run-log event type/);
  log.close('harness_error');
});

test('a torn last line is cut, with its length and hash recorded', () => {
  const path = fresh();
  const log = createRunLog(path, HEADER);
  log.append('send_intent', { turn: 1 });
  // The writer dies mid-line: no newline, no `closed`, the lock still on disk.
  const torn = '{"intent":1,"type":"send_out';
  appendFileSync(path, torn);
  assert.throws(() => closeCrashed(path, { takeStale: false }), /run_locked/);
  writeFileSync(`${path}.lock`, JSON.stringify({ pid: spawnSync(process.execPath, ['-e', '']).pid, host: hostname() }));

  const closed = closeCrashed(path);
  const chain = verifyChain(readFileSync(path, 'utf8'));
  assert.ok(chain.ok);
  assert.equal(chain.head, closed.hash);
  const last = chain.events.at(-1);
  assert.deepEqual(last.torn, { bytes: Buffer.byteLength(torn), sha256: sha256(torn) });
  assert.deepEqual(last.dangling, [1]);
  assert.equal(last.status, 'crashed');
  assert.deepEqual(cardinality(chain.events), [], 'a dangling intent is allowed under crashed');
  assert.throws(() => reopenRunLog(path), /already closed/);
});

test('a second writer on the same run id is refused', () => {
  const path = fresh();
  const first = createRunLog(path, HEADER);
  assert.throws(() => createRunLog(path, HEADER), error => error.code === 'run_locked' && error.holder.pid === process.pid);
  assert.throws(() => reopenRunLog(path, { takeStale: true }), /run_locked/, 'a live writer is never stale');
  first.append('notice', { text: 'still mine' });
  first.close('harness_error');
  // Lock gone, file kept: the run id still can't be reused.
  assert.throws(() => createRunLog(path, HEADER), /EEXIST/);
  assert.ok(!existsSync(`${path}.lock`));
});

test('an executor crash resumes in the same file and reconciles the op it lost', () => {
  const path = fresh();
  const log = createRunLog(path, HEADER);
  for (const type of ['proposal', 'priced_proposal', 'decision']) log.append(type);
  log.append('op_intent', { key: 'k1' });
  writeFileSync(`${path}.lock`, JSON.stringify({ pid: spawnSync(process.execPath, ['-e', '']).pid, host: hostname() }));

  const { log: resumed, torn } = reopenRunLog(path, { takeStale: true });
  assert.equal(torn, null);
  resumed.append('resume');
  // k1 landed before the crash (the simulator journal says so): its intent gets a `reconciled` outcome, never a
  // second write. k2 never started, so it gets its first intent now.
  resumed.append('op_outcome', { intent: 4, result: 'reconciled' });
  const k2 = resumed.append('op_intent', { key: 'k2' });
  resumed.append('op_outcome', { intent: k2.seq, result: 'landed' });
  resumed.append('stamp', { landed: 'verified', fixed: 'uncertain', realised: 0 });
  resumed.close('proposed');
  assert.deepEqual(cardinality(events(path)), []);
});

test('cardinality names each broken rule', () => {
  const base = events(proposedRun(fresh()));
  const without = type => base.filter(e => e.type !== type).map((e, i) => ({ ...e, seq: i }));
  assert.ok(cardinality(without('decision')).includes('proposed: one priced proposal and one decision'));
  assert.ok(cardinality(without('stamp')).includes('exactly one stamp, just before closed'));
  assert.ok(cardinality(without('call_intent')).some(rule => rule.startsWith('call_outcome at seq')));
  assert.ok(cardinality(base.slice(1)).includes('exactly one header, first'));
  const twice = [...base];
  twice.splice(10, 0, base[9]);
  assert.equal(base[9].type, 'op_intent');
  assert.ok(cardinality(twice.map((e, i) => ({ ...e, seq: i }))).some(rule => rule.startsWith('op key k1')));

  // A failed run: no proposal, every tier not run.
  const path = fresh();
  const log = createRunLog(path, HEADER);
  log.append('proposal_retry'); log.append('proposal_retry');
  log.append('stamp', { landed: 'not_run(malformed_proposal)', fixed: 'not_run(malformed_proposal)', realised: 'not_run(malformed_proposal)' });
  log.close('malformed_proposal');
  assert.deepEqual(cardinality(events(path)), []);
  const failed = events(path).map(e => (e.type === 'closed' ? { ...e, status: 'no_action' } : e));
  assert.ok(cardinality(failed).includes('no_action: stamp landed is not_run(no_action)'));
});
