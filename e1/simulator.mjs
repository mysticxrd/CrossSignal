// The E1 simulator (ticket 07, spec fix F1): the world in memory behind the backend interface. Each landed write
// is saved to the run's own journal, and fsynced, before the simulator replies; a restarted simulator rebuilds its
// world from the built world (version + seed) plus that journal, never from the run log. So an operation that
// landed before a crash is still there afterwards, as it would be at Razorpay, and a repeat meets the real
// backend's answer instead of a second write.
import { closeSync, openSync } from 'node:fs';
import { resolve } from 'node:path';
import { requireThat } from '../db/benchmark/contracts.mjs';
import { asBackend } from './backend.mjs';
import { canonicalJson } from './canonical.mjs';
import { cutTornTail, readAll, writeAll } from './durable.mjs';
import { worldHash } from './world.mjs';

const JOURNAL = /\.sim\.jsonl$/;
// The journal sits beside the run log under its own name, which is the only name openSimulator accepts.
export function journalPathFor(runLogPath) {
  requireThat(/\.jsonl$/.test(runLogPath) && !JOURNAL.test(runLogPath), `simulator: ${runLogPath} is not a run log's name`);
  return runLogPath.replace(/\.jsonl$/, '.sim.jsonl');
}
// One open simulator per journal in this process; the run log's lock already admits one process per run.
const openJournals = new Set();

const refusal = (description, field) =>
  ({ ok: false, http: 400, error: { code: 'BAD_REQUEST_ERROR', description, ...(field && { field }) } });

// Each write: `check` returns a refusal or null and changes nothing; `apply` changes the state and returns the
// record. Replay runs the same pair over the journal, so a restart cannot apply a write differently.
const WRITES = {
  // Razorpay capture: the amount must equal the authorized amount, and a second capture is refused.
  capture_payment: {
    check: (payments, { payment_id, amount_paise }) => {
      const payment = payments.get(payment_id);
      if (!payment) return refusal('The id provided does not exist', 'payment_id');
      if (payment.status === 'captured') return refusal('This payment is already either captured or voided');
      if (payment.status !== 'authorized') return refusal('Only an authorized payment can be captured');
      if (amount_paise !== payment.amount_paise) return refusal('Capture amount must be equal to the amount authorized', 'amount');
      return null;
    },
    apply: (payments, { payment_id, at }) => Object.assign(payments.get(payment_id), { status: 'captured', captured_at: at }),
  },
};

const mismatch = (journal, seq, reason) =>
  Object.assign(new Error(`journal_mismatch: ${journal} at seq ${seq}: ${reason}`), { code: 'journal_mismatch' });

// `world` is buildWorld's result, unchanged; `clock` gives the case clock in whole seconds; `onJournaled(op, args)`
// runs after a write is on disk and before the simulator replies (the crash test kills the process there).
export function openSimulator({ world, journal, clock, onJournaled } = {}) {
  requireThat(JOURNAL.test(journal ?? ''), `simulator: the journal must be a .sim.jsonl file, not ${journal}`);
  requireThat(typeof clock === 'function', 'simulator: a case clock is required');
  const hash = worldHash(world.version, world.seed, world.orders);
  requireThat(hash === world.hash, 'simulator: the world changed after it was built');
  requireThat(!openJournals.has(resolve(journal)), `simulator: ${journal} is already open`);
  const { version, seed } = structuredClone({ version: world.version, seed: world.seed });
  const orders = structuredClone(world.orders);
  const payments = new Map(orders.map(order => [order.payment.id, order.payment]));
  const header = { type: 'header', world_version: version.id, seed, world_hash: hash };

  closeSync(openSync(journal, 'a'));
  const fd = openSync(journal, 'r+');
  let torn;
  let seq = 0;
  try {
    const bytes = readAll(fd);
    const end = bytes.lastIndexOf(0x0a) + 1;
    for (const line of bytes.subarray(0, end).toString('utf8').split('\n').slice(0, -1)) {
      let entry;
      try { entry = JSON.parse(line); } catch { throw mismatch(journal, seq, 'not JSON'); }
      if (canonicalJson(entry) !== line || entry.seq !== seq) throw mismatch(journal, seq, 'not canonical or out of order');
      if (seq === 0) {
        if (canonicalJson({ ...header, seq: 0 }) !== line) throw mismatch(journal, 0, 'written for another world');
      } else if (entry.type === 'op') {
        if (!Object.hasOwn(WRITES, entry.op)) throw mismatch(journal, seq, `unknown write ${entry.op}`);
        if (!Number.isInteger(entry.args?.at)) throw mismatch(journal, seq, 'no whole-second case clock');
        const refused = WRITES[entry.op].check(payments, entry.args);
        if (refused) throw mismatch(journal, seq, `the world refuses it on replay (${refused.error.description})`);
        WRITES[entry.op].apply(payments, entry.args);
      } else if (entry.type !== 'torn') {
        throw mismatch(journal, seq, `unknown entry ${entry.type}`);
      }
      seq += 1;
    }
    torn = cutTornTail(journal, fd, bytes, end);
  } finally {
    closeSync(fd);
  }

  const out = openSync(journal, 'a');
  openJournals.add(resolve(journal));
  let broken = false;
  const append = entry => {
    // A write that fails partway leaves a torn tail; nothing may follow it until a reopen cuts it.
    try { writeAll(out, `${canonicalJson({ ...entry, seq })}\n`); } catch (error) { broken = true; throw error; }
    seq += 1;
  };
  if (seq === 0) append(header);
  if (torn) append({ type: 'torn', ...torn });

  function write(op, args) {
    requireThat(!broken, 'simulator: a journal write failed; reopen the simulator to recover');
    const refused = WRITES[op].check(payments, args);
    if (refused) return refused;
    const landed = { ...args, at: clock() };
    requireThat(Number.isInteger(landed.at), 'simulator: the case clock must give whole seconds');
    append({ type: 'op', op, args: landed });
    // Memory follows the journal at once, so nothing after this line can leave the two apart.
    const body = structuredClone(WRITES[op].apply(payments, landed));
    onJournaled?.(op, landed);
    return { ok: true, http: 200, body };
  }

  const backend = asBackend({
    fetchPayment: id => (payments.has(id)
      ? { ok: true, http: 200, body: structuredClone(payments.get(id)) } : refusal('The id provided does not exist', 'id')),
    capturePayment: ({ payment_id, amount_paise } = {}) => write('capture_payment', { payment_id, amount_paise }),
  });
  return {
    backend,
    // The cut tail this open found, or null; the executor copies it into the run log when it resumes.
    torn,
    // The world-state hash the run log records before and after each call (section 3 item 12).
    stateHash: () => worldHash(version, seed, orders),
    close: () => { closeSync(out); openJournals.delete(resolve(journal)); },
  };
}
