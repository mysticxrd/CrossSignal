import { check } from './price-card.mjs';

// Section 9 decision 14: two 15 Nov sends were reserved at the 1M-token worst case ($0.319488 each) and never
// settled, so the ledger still counts their full reservation.
export const unsettled15Nov = [
  { run: 'live-options-2026-11-15-nebius-01', attempt: 1 },
  { run: 'live-options-2026-11-15-nebius-02', attempt: 1 },
];

// Nebius spend already settled in the ledger: subtracting it from the console's all-time total leaves what the
// unsettled sends cost, when the Usage tab can't show 15 Nov on its own.
export function settledNebiusMicros(budget) {
  return budget.db.prepare(`SELECT COALESCE(SUM(s.accounted), 0) AS micros FROM sends s JOIN runs r ON r.id = s.run
    WHERE r.provider = 'nebius' AND s.accounted IS NOT NULL`).get().micros;
}

// Settles every listed send in one transaction: the billed total is split evenly, the odd micro-dollars on the
// first. The ledger's own check refuses a send already settled or an amount above its reservation, and then
// nothing is settled.
export function settleCorrection(budget, billedMicros, sends = unsettled15Nov) {
  check(Number.isSafeInteger(billedMicros) && billedMicros >= 0, 'invalid_billed_amount');
  const share = Math.floor(billedMicros / sends.length), odd = billedMicros - share * sends.length;
  const settled = sends.map((send, index) => ({ ...send, settledMicros: share + (index === 0 ? odd : 0) }));
  budget.transaction(() => settled.forEach(send => budget.settle(send.run, send.attempt, send.settledMicros)));
  return settled;
}
