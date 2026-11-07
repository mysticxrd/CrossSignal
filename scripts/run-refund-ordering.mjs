import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorld } from '../order-recovery/refund-ordering/world.mjs';
import { rivals } from '../order-recovery/refund-ordering/rivals.mjs';
import { grade, loadTruth } from '../tests/evaluator/order-recovery/refund-ordering.mjs';
import { describeProcess } from '../tests/evaluator/order-recovery/grade.mjs';

export const reportPath = new URL('../reports/order-recovery/razorpay-664.md', import.meta.url);
export function renderReport(world = loadWorld(), truth = loadTruth(), methods = rivals) {
  const lines = ['# Order recovery: Razorpay #664', '',
    '**BUILT: offline refund-ordering world and code-only rivals. SIMULATED: all records, merchant answers and corrections. PLANNED: agent, exact approval, checked simulated execution and page.**', '',
    'Customer hypothesis: Razorpay support/integration teams. Practitioner demand and record access remain unconfirmed.', '',
    '## Public anchor and limits', '',
    '[Issue #664](https://github.com/razorpay/razorpay-woocommerce/issues/664) reports a v4.8.7 reproduction: a refund handled before a delayed authorization leaves WooCommerce processing after the payment was refunded. The opposite delivery order leaves it refunded. We have not run the plugin. The reporter later identifies the harness as test mode with synthetic fixtures. Source checked 2026-11-06.', '',
    'Only refund ordering is modeled here. Lost cron work and amount mismatch are separate issues. These four aftermaths are invented, not customer incidents or a measured workload. Current payment and fulfillment observations are from one simulated snapshot; webhook delivery order is history, not the current payment state. Only full refunds are supported.', '',
    'Merchant records require consent; the tags do not implement access control. Queued means stoppable in this simulator. Shipped remains shipped and requires merchant follow-up; changing WooCommerce status does not retrieve a parcel or establish business recovery. Unknown shipment status requires a merchant answer before repair.', '',
    '## Queue, including an already-correct control', '', '| Order | Story |', '|---|---|'];
  for (const t of truth.orders) lines.push(`| ${t.orderId} | ${t.story} |`);
  lines.push('', '## Decisions and scoring', '',
    'sync_refund updates WooCommerce to refunded, stops queued fulfillment, and flags shipped orders for merchant review. It never moves money. It refuses a payment that is not refunded or unknown fulfillment. leave changes nothing. ask receives an immediate, correct simulated merchant answer, then attempts the same checked repair. Answers are supplied only by the evaluator, never to a rival.', '',
    'Cost rule B is unchanged: right 0, ask 1, wrong state 3, wrong capture 10. Capture/refund API actions are not available in this world, so wrong capture cannot occur here. The grader checks payment, WooCommerce status, fulfillment and follow-up together. Asking always costs at least 1; a wrong result costs 3. A person-only case cannot pass by guessing.', '',
    'The fields script uses current payment and fulfillment records. It repairs a confirmed discrepancy, asks if fulfillment is unknown, and leaves the correct control alone. Do nothing and always ask remain comparators. This world has no messages, so the #670 words script and fields + ask on text would equal the fields script here.', '',
    'Process checks are printed beside cost and never added into it. An order\'s deciding records are its order, payment and fulfillment records: the repair depends on the order status disagreeing with the payment, given the shipment. Extra citations, such as webhook history, are shown, not judged. An unneeded write is a sync_refund the method proposed that was refused or already reconciled. A repair on the already-correct control costs 0 under cost B but would still spend a person\'s approval. An ask\'s repair comes from the evaluator\'s answer, so it is never counted.', '');
  for (const [name, method] of Object.entries(methods)) {
    lines.push(`## ${name}`, '');
    try {
      const rows = grade(world, method(world), truth);
      lines.push('| Order | Decision | Payment | Woo status | Fulfillment | Follow-up | Result | Cost | Evidence |', '|---|---|---|---|---|---|---|---:|---|');
      for (const r of rows) lines.push(`| ${r.orderId} | ${r.action} | ${r.payment} | ${r.orderStatus} | ${r.fulfillment} | ${r.followup} | ${r.result} | ${r.cost} | ${r.evidenceIds.join(', ') || 'none'} |`);
      lines.push('', `**Total cost: ${rows.reduce((sum, r) => sum + r.cost, 0)}.**`, '', describeProcess(rows), '');
    } catch (error) { lines.push(`**BATCH REFUSED:** ${error.message}. No score assigned.`, ''); }
  }
  lines.push('## What this establishes', '',
    'This case is deliberately solvable by structured reconciliation plus one merchant answer. It is a standard the later agent must meet, not evidence that AI is needed. There are no model calls, live changes or B01 results. The #670 world and its grading are unchanged.', '',
    'Run `node scripts/run-refund-ordering.mjs` to regenerate, or add `--check` to compare without writing. The run holds state in memory and writes this report only. Repeating it starts from the frozen world; it is not durable job execution. World and private truth have separately pinned hashes. Import separation is not an OS sandbox.', '',
    'Remaining question for a practitioner: when an order and refund disagree, which shipment records can support repair, and when must a person decide?', '');
  return lines.join('\n');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = renderReport();
  if (process.argv.includes('--check')) {
    if (readFileSync(reportPath, 'utf8') !== report) throw new Error('Committed refund-ordering report differs; regenerate it');
    console.log('Refund-ordering report matches.');
  } else { mkdirSync(new URL('.', reportPath), { recursive: true }); writeFileSync(reportPath, report); console.log(fileURLToPath(reportPath)); }
}
