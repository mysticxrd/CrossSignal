import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { appendFileSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { BACKEND_METHODS } from '../e1/backend.mjs';
import { canonicalJson } from '../e1/canonical.mjs';
import { sha256 } from '../e1/durable.mjs';
import { journalPathFor, openSimulator } from '../e1/simulator.mjs';
import { authorizedWorld } from './helpers/e1-sim-world.mjs';

const fresh = () => join(mkdtempSync(join(tmpdir(), 'e1-sim-')), 'r_test.sim.jsonl');
const AT = 1795000000; // a case-clock second
const open = (journal, extra = {}) => openSimulator({ world: authorizedWorld().world, journal, clock: () => AT, ...extra });
const entries = journal => readFileSync(journal, 'utf8').trimEnd().split('\n').map(line => JSON.parse(line));
const { payment } = authorizedWorld();
const capture = { payment_id: payment.id, amount_paise: payment.amount_paise };

test('a landed write is journalled before the reply, and a restarted world holds it', async () => {
  const journal = fresh();
  const sim = open(journal);
  assert.deepEqual(Object.keys(sim.backend).sort(), [...BACKEND_METHODS].sort(), 'only the interface is reachable');
  const before = sim.stateHash();
  const reply = await sim.backend.capturePayment(capture);
  assert.equal(reply.http, 200);
  assert.deepEqual(reply.body, { ...payment, status: 'captured', captured_at: AT });
  const after = sim.stateHash();
  assert.notEqual(after, before);
  sim.close();

  const restarted = open(journal);
  assert.equal(restarted.stateHash(), after);
  assert.equal(restarted.torn, null);
  // Razorpay's answer to a repeat capture, and no second journal line.
  const repeat = await restarted.backend.capturePayment(capture);
  assert.equal(repeat.http, 400);
  assert.match(repeat.error.description, /already either captured or voided/);
  assert.deepEqual(entries(journal).map(e => e.type), ['header', 'op']);
  restarted.close();
});

test('killed after the journal write and before the reply, the restarted world holds the write', async () => {
  const journal = fresh();
  const child = spawn(process.execPath, ['tests/helpers/e1-sim-crash.mjs', journal, String(AT)], { windowsHide: true });
  let out = '';
  const exited = new Promise(resolve => child.on('exit', (code, signal) => resolve({ code, signal })));
  child.stdout.on('data', chunk => { out += chunk; if (out.includes('journaled')) child.kill('SIGKILL'); });
  const { code, signal } = await exited;
  assert.equal(signal, 'SIGKILL', `the child was killed, not finished (code ${code}, output ${out})`);
  assert.ok(!out.includes('replied'), 'the child never replied');

  const sim = open(journal);
  assert.equal(sim.torn, null);
  assert.deepEqual((await sim.backend.fetchPayment(payment.id)).body, { ...payment, status: 'captured', captured_at: AT });
  assert.equal((await sim.backend.capturePayment(capture)).http, 400, 'a resume that retries meets Razorpay, not a second capture');
  sim.close();
});

test('a torn last journal line is cut and recorded, and that write did not land', async () => {
  const journal = fresh();
  open(journal).close();
  const torn = '{"args":{"amount_paise":';
  appendFileSync(journal, torn);

  const sim = open(journal);
  const recorded = { bytes: Buffer.byteLength(torn), sha256: sha256(torn) };
  assert.deepEqual(sim.torn, recorded);
  assert.deepEqual(entries(journal).at(-1), { type: 'torn', seq: 1, ...recorded });
  assert.equal(readFileSync(`${journal}.torn-${readFileSync(journal).indexOf(0x0a) + 1}`, 'utf8'), torn, 'the cut bytes are kept');
  assert.equal((await sim.backend.fetchPayment(payment.id)).body.status, 'authorized');
  assert.equal((await sim.backend.capturePayment(capture)).http, 200);
  sim.close();

  const again = open(journal);
  assert.equal(again.torn, null, 'a recorded cut is not recorded twice');
  assert.deepEqual(entries(journal).map(e => e.type), ['header', 'torn', 'op']);
  again.close();
});

test('a tear in the record of a tear keeps both cuts, and a cut the opener never truncated is not saved twice', () => {
  const journal = fresh();
  open(journal).close();
  const end = readFileSync(journal).length;
  const first = '{"args":{"amount_paise":', second = '{"bytes":24,"sha';
  // The opener saved the first cut and truncated, then died partway through its `torn` line.
  writeFileSync(`${journal}.torn-${end}`, first);
  appendFileSync(journal, second);
  const sim = open(journal);
  assert.deepEqual(sim.torn, { bytes: Buffer.byteLength(first + second), sha256: sha256(first + second) });
  sim.close();

  // The opener saved the cut and died before the truncate: the same tail is still in the journal.
  const other = fresh();
  open(other).close();
  writeFileSync(`${other}.torn-${end}`, first);
  appendFileSync(other, first);
  const reopened = open(other);
  assert.deepEqual(reopened.torn, { bytes: Buffer.byteLength(first), sha256: sha256(first) });
  reopened.close();
});

test('a journal written for another world, or one the world refuses, is refused', async () => {
  const journal = fresh();
  open(journal).close();
  const { world: other } = authorizedWorld('another-seed');
  assert.throws(() => openSimulator({ world: other, journal, clock: () => AT }), /written for another world/);

  const changed = authorizedWorld().world;
  changed.orders[1].total_paise += 1;
  assert.throws(() => openSimulator({ world: changed, journal: fresh(), clock: () => AT }), /changed after it was built/);
  const busier = authorizedWorld().world;
  busier.days[0].funnel.sessions += 1;
  assert.throws(() => openSimulator({ world: busier, journal: fresh(), clock: () => AT }), /changed after it was built/, 'GA4 counts are covered');

  // The same capture twice: the second cannot have landed, so the journal is not this world's history.
  const op = { type: 'op', op: 'capture_payment', args: { ...capture, at: AT } };
  writeFileSync(journal, `${readFileSync(journal, 'utf8')}${canonicalJson({ ...op, seq: 1 })}\n${canonicalJson({ ...op, seq: 2 })}\n`);
  assert.throws(() => open(journal), error => error.code === 'journal_mismatch' && /seq 2/.test(error.message));
});

test('one simulator per journal at a time, and an unknown id is a 400 as at Razorpay', async () => {
  const journal = fresh();
  const sim = open(journal);
  assert.throws(() => open(journal), /already open/);
  assert.deepEqual(await sim.backend.fetchPayment('pay_00000000000000'),
    { ok: false, http: 400, error: { code: 'BAD_REQUEST_ERROR', description: 'The id provided does not exist', field: 'id' } });
  sim.close();
  open(journal).close();
});

test('the world is never rebuilt from the run log', () => {
  // A run log's own name is refused; the journal's is derived from it.
  assert.equal(journalPathFor('outputs/e1-runlogs/b0/r_1.jsonl'), 'outputs/e1-runlogs/b0/r_1.sim.jsonl');
  assert.throws(() => journalPathFor('outputs/e1-runlogs/b0/r_1.sim.jsonl'), /not a run log's name/);
  assert.throws(() => journalPathFor('outputs/e1-runlogs/b0/r_1'), /not a run log's name/);
  const runLog = fresh().replace(/\.sim\.jsonl$/, '.jsonl');
  assert.throws(() => open(runLog), /must be a \.sim\.jsonl file/);
  assert.ok(!existsSync(runLog));
  // Lint: the simulator and the interface import only these, so neither can reach the run log or its folder, and
  // neither reads the wall clock or Math.random (section 7 decision 4).
  for (const [file, allowed] of [
    ['e1/simulator.mjs', ['node:fs', 'node:path', '../db/benchmark/contracts.mjs', './analytics.mjs', './backend.mjs', './canonical.mjs', './durable.mjs', './store.mjs', './world.mjs']],
    ['e1/store.mjs', ['node:crypto', './world.mjs']],
    ['e1/analytics.mjs', []],
    ['e1/backend.mjs', ['../db/benchmark/contracts.mjs']],
  ]) {
    const source = readFileSync(file, 'utf8');
    assert.deepEqual([...source.matchAll(/^(?:import|export)\s[^;]*?\sfrom\s*'([^']+)'/gm)].map(m => m[1]), allowed, file);
    assert.doesNotMatch(source, /run-log|e1-runlogs|Date\.now|new Date|Math\.random|import\(|require\(/, file);
  }
});

test('a capture is judged as of the case clock, as reads are', async () => {
  const { world } = authorizedWorld();
  // The first payment whose capture is more than a second after it, whatever the world version's draws.
  const [early, late] = [world.orders.find(o => o.payment.captured_at > o.payment.created_at + 1).payment, world.orders.at(-1).payment];
  const at = early.created_at + 1; // authorized, its capture still ahead in the hidden days
  const sim = open(fresh(), { clock: () => at });
  assert.equal((await sim.backend.now()), at);
  assert.equal((await sim.backend.fetchPayment(early.id)).body.status, 'authorized');
  const landed = await sim.backend.capturePayment({ payment_id: early.id, amount_paise: early.amount_paise });
  assert.equal(landed.http, 200, 'the world\'s later capture has not happened yet');
  assert.equal(landed.body.captured_at, at);
  const future = await sim.backend.capturePayment({ payment_id: late.id, amount_paise: late.amount_paise });
  assert.equal(future.error.description, 'The id provided does not exist', 'a payment after now cannot be captured');
  sim.close();
});
