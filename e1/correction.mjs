import { check } from './price-card.mjs';

// Section 9 decision 14: two 15 Nov sends were reserved at the 1M-token worst case ($0.319488 each) and never
// settled, so the ledger still counts their full reservation.
export const unsettled15Nov = [
  { run: 'live-options-2026-11-15-nebius-01', attempt: 1 },
  { run: 'live-options-2026-11-15-nebius-02', attempt: 1 },
];

// The fallback when the Usage tab can't show 15 Nov alone: the console's all-time total minus the Nebius spend the
// ledger has settled. That subtraction is only sound when no other Nebius send is still unsettled. The settled
// rows are this project's own estimates, so the result is approximate; section 9's reconciliation catches drift.
export function billedFromAllTime(budget, allTimeMicros, sends = unsettled15Nov) {
  const rows = budget.db.prepare(`SELECT s.run, s.attempt, s.accounted FROM sends s JOIN runs r ON r.id = s.run
    WHERE r.provider = 'nebius'`).all();
  const listed = row => sends.some(send => send.run === row.run && send.attempt === row.attempt);
  check(rows.every(row => listed(row) || row.accounted !== null), 'other_nebius_sends_unsettled');
  return allTimeMicros - rows.reduce((sum, row) => sum + (listed(row) ? 0 : row.accounted), 0);
}

// Checks the plan without changing anything: the billed total is split evenly (odd micro-dollars on the first), and
// every send must exist, be unsettled, and have a reservation its share fits under.
export function planCorrection(budget, billedMicros, sends = unsettled15Nov) {
  check(Number.isSafeInteger(billedMicros) && billedMicros >= 0, 'invalid_billed_amount');
  const share = Math.floor(billedMicros / sends.length), odd = billedMicros - share * sends.length;
  return sends.map((send, index) => {
    const row = budget.db.prepare('SELECT reserved, accounted FROM sends WHERE run = ? AND attempt = ?').get(send.run, send.attempt);
    const settledMicros = share + (index === 0 ? odd : 0);
    check(row && row.accounted === null && settledMicros <= row.reserved, 'spend_accounting_mismatch');
    return { ...send, settledMicros };
  });
}

// Settles every planned send in one transaction, so either both are settled or neither is.
export function settleCorrection(budget, billedMicros, sends = unsettled15Nov) {
  const planned = planCorrection(budget, billedMicros, sends);
  budget.transaction(() => planned.forEach(send => budget.settle(send.run, send.attempt, send.settledMicros)));
  return planned;
}
