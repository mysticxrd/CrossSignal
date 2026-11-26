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
import { openStore } from './store.mjs';
import { razorpayId, worldHash } from './world.mjs';

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
  // Razorpay capture, judged as of the write's clock `at`, as reads are: the amount must equal the authorized
  // amount, and a second capture is refused.
  capture_payment: {
    check: (payments, { payment_id, amount_paise, at }) => {
      const stored = payments.get(payment_id);
      if (!(stored?.created_at <= at)) return refusal('The id provided does not exist', 'payment_id');
      const payment = asOf(stored, at);
      if (payment.status === 'captured') return refusal('This payment is already either captured or voided');
      if (payment.status !== 'authorized') return refusal('Only an authorized payment can be captured');
      if (amount_paise !== payment.amount_paise) return refusal('Capture amount must be equal to the amount authorized', 'amount');
      return null;
    },
    apply: (payments, { payment_id, at }) => Object.assign(payments.get(payment_id), { status: 'captured', captured_at: at }),
  },
};

// Reads answer as of the case clock, because the world holds 7 hidden future days: a record created after "now"
// does not exist yet, and a capture or refund after "now" has not happened.
function asOf(payment, now) {
  const { captured_at, refunds, ...seen } = structuredClone(payment);
  if (captured_at !== undefined && captured_at <= now) seen.captured_at = captured_at;
  else if (seen.status === 'captured') seen.status = 'authorized';
  if (refunds) seen.refunds = refunds.filter(refund => refund.created_at <= now);
  return seen;
}
// Razorpay's list order is newest first; section 3 item 10 fixes time order, then id, so a page never shifts when
// "now" moves on between pages: new records sort after every old one.
const byTime = (a, b) => a.created_at - b.created_at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const unixSeconds = value => value === undefined || (Number.isInteger(value) && value >= 946684800 && value <= 4765046400);
// Razorpay's collection paging: `count` 1-100 rows from `skip`, no total.
function collection(records, { from, to, count = 10, skip = 0 } = {}) {
  if (!unixSeconds(from)) return refusal('from must be a unix timestamp in seconds', 'from');
  if (!unixSeconds(to)) return refusal('to must be a unix timestamp in seconds', 'to');
  if (!(Number.isInteger(count) && count >= 1 && count <= 100)) return refusal('count must be between 1 and 100', 'count');
  if (!(Number.isInteger(skip) && skip >= 0)) return refusal('skip must be at least 0', 'skip');
  const items = records.filter(r => (from === undefined || r.created_at >= from) && (to === undefined || r.created_at <= to))
    .sort(byTime).slice(skip, skip + count);
  return { ok: true, http: 200, body: { entity: 'collection', count: items.length, items } };
}

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
  const razorpayOrders = new Map(orders.map(order => [order.payment.order_id, order]));
  const store = openStore({ version, seed, orders });
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
    const landed = { ...args, at: clock() };
    requireThat(Number.isInteger(landed.at), 'simulator: the case clock must give whole seconds');
    const refused = WRITES[op].check(payments, landed);
    if (refused) return refused;
    append({ type: 'op', op, args: landed });
    // Memory follows the journal at once, so nothing after this line can leave the two apart.
    const body = structuredClone(WRITES[op].apply(payments, landed));
    onJournaled?.(op, landed);
    return { ok: true, http: 200, body };
  }

  // Payments that exist as of now and were created by `last`; the window cuts first, so a page copies a day, not
  // the whole world. A refund or a delivery follows its payment, so only the window's end can cut those.
  const visiblePayments = (now, last = now) => [...payments.values()]
    .filter(p => p.created_at <= Math.min(now, last ?? now)).map(p => asOf(p, now));
  // The webhook log: one delivery per subscribed event, answered 200 on the first attempt in the baseline world.
  // payment.authorized carries the payment, order.paid the Razorpay order.
  const deliveries = (now, last) => orders.filter(order => order.payment.created_at <= Math.min(now, last ?? now)).flatMap(order => {
    const payment = asOf(order.payment, now);
    const events = [['payment.authorized', payment.created_at, payment.id], ['order.paid', payment.captured_at, payment.order_id]];
    return events.filter(([event, at]) => at !== undefined && version.webhook.events.includes(event)).map(([event, at, entity_id]) => ({
      id: razorpayId(version.id, seed, `${order.index}|${event}`, 'evt'), event, entity_id, created_at: at,
      attempts: [{ at, response_code: 200 }],
    }));
  });
  const ok = body => ({ ok: true, http: 200, body: structuredClone(body) });

  const backend = asBackend({
    now: () => clock(),
    fetchPayment: id => {
      const now = clock();
      return payments.get(id)?.created_at <= now ? ok(asOf(payments.get(id), now)) : refusal('The id provided does not exist', 'id');
    },
    fetchAllPayments: query => collection(visiblePayments(clock(), query?.to), query),
    // Razorpay's GET /orders/:id/payments takes no paging; an order placed before its payment answers an empty list.
    fetchOrderPayments: id => {
      const now = clock();
      const order = razorpayOrders.get(id);
      if (!(order?.created_at <= now)) return refusal('The id provided does not exist', 'id');
      return collection(order.payment.created_at <= now ? [asOf(order.payment, now)] : [], { count: 100 });
    },
    fetchAllRefunds: query => collection(visiblePayments(clock(), query?.to)
      .flatMap(p => (p.refunds ?? []).map(refund => ({ ...refund, payment_id: p.id }))), query),
    fetchWebhook: () => ok(version.webhook),
    fetchWebhookDeliveries: query => collection(deliveries(clock(), query?.to), query),
    fetchCaptureSettings: () => ok(version.capture),
    wcListOrders: query => store.listOrders(query, clock()),
    wcGetOrder: id => store.getOrder(id, clock()),
    wcOrderNotes: id => store.orderNotes(id, clock()),
    wcSystemStatus: () => store.systemStatus(clock()),
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
