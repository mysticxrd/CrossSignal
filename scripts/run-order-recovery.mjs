import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorld } from '../order-recovery/world.mjs';
import { rivals } from '../order-recovery/rivals.mjs';
import { describeProcess, grade, loadTruth } from '../tests/evaluator/order-recovery/grade.mjs';

export const reportPath = new URL('../reports/order-recovery/razorpay-670.md', import.meta.url);
export function renderReport(world = loadWorld(), truth = loadTruth(), methods = rivals) {
  const lines = ['# Order recovery: Razorpay #670', '',
    '**BUILT: offline simulator and code-only rivals. SIMULATED: every order, message and merchant answer. PLANNED: agent, approval, execution and page.**', '',
    'Customer hypothesis: Razorpay support/integration teams. No practitioner has confirmed the need. This is not production-ready.', '',
    '## Public anchor and limits', '',
    '[Issue #670](https://github.com/razorpay/razorpay-woocommerce/issues/670) reports an authorized payment shown as Failed after the webhook job in Authorize mode. The reporter reproduced it; we have not run the plugin. The fixture anchors to the reported version 4.8.8, not a claim about the latest release.', '',
    '[Capture settings](https://razorpay.com/docs/payments/payments/capture-settings) describe automatic refunds for uncaptured holds after the timeout. Here capture means taking held money; close cancels the order and lets the hold lapse. No refund API is simulated. The clock advances to eventual auto-refund, not immediate bank credit (the docs say 5–7 working days). Sources checked 2026-11-06.', '',
    'All aftermaths below are invented. A second payment after a false failure is a hypothesis, not an observed customer incident. Product/cart matching data on payments is a simulated merchant integration assumption. Merchant records need consent; tags describe access, they do not implement OAuth.', '',
    '## Made-up queue', '', '| Order | Aftermath | Settled by | Relevant record holder |', '|---|---|---|---|'];
  for (const t of truth.orders) lines.push(`| ${t.orderId} | ${t.story} | ${t.tier} | ${t.holder} |`);
  lines.push('', '## Cost rule B: lower is better', '',
    'Right = 0; asking = 1; wrong final state = 3; wrong capture = 10. These are invented costs, not money estimates. Asking uses an immediate, correct simulated merchant answer; it never earns a zero. On person-only orders, guessing is wrong even when it matches the hidden answer.', '',
    'The grader compares payment, fulfillment and order status. A refund does not repair a Failed order: when cancellation is required, leaving it Failed is wrong. This corrects the earlier grader, which grouped Failed and Cancelled. Already-shipped notes do not silently update that status.', '',
    'Do nothing leaves every order. Always ask asks on every order. The fields script matches a later captured payment on email, amount, currency and cart within 24 hours, closes duplicates, and otherwise captures live holds for shipment. It never reads messages. Matching is a baseline heuristic, not safe live authorization.', '',
    'Fields + ask on text uses the fields script on orders without messages and asks on every order with one: the planned model routing, with a person in the model\'s place. The words script reads messages with fixed keyword rules (refund, cancel, return my money or don\'t want: close; shipped, courier or dispatched: capture as shipped; try again, pay again or retry: ask). Text changes only a live hold; conflicting signals, or a non-close signal on a duplicate, ask. Its rules were written after reading these three messages, so its score here says nothing about unseen text.', '',
    'Process checks are printed beside cost and never added into it. Deciding records are the evidence the evaluator\'s answer cites for each order; an order passes when its decision cites all of them. Extra citations are cited records outside that set; they are shown, not judged. An unneeded write is a capture the method proposed that the simulator refused or found already done. Cost B scores a refused capture on the declined control as right; in an approve-first product it would still spend a person\'s approval.', '');
  for (const [name, method] of Object.entries(methods)) {
    lines.push(`## ${name}`, '');
    try {
      const rows = grade(world, method(world), truth);
      lines.push('| Order | Decision | Eventual money | Fulfillment | Woo status | Cost reason | Cost | Cited records |', '|---|---|---|---|---|---|---:|---|');
      for (const r of rows) lines.push(`| ${r.orderId} | ${r.action} | ${r.payment} | ${r.fulfillment.replaceAll('_', ' ')} | ${r.orderStatus} | ${r.reason} | ${r.cost} | ${r.evidenceIds.join(', ') || 'none'} |`);
      lines.push('', `Fields: ${rows.filter(r => r.tier === 'fields').reduce((s, r) => s + r.cost, 0)}; words: ${rows.filter(r => r.tier === 'words').reduce((s, r) => s + r.cost, 0)}; person: ${rows.filter(r => r.tier === 'person').reduce((s, r) => s + r.cost, 0)}. **Total cost: ${rows.reduce((s, r) => s + r.cost, 0)}.**`, '', describeProcess(rows), '');
    } catch (error) { lines.push(`**BATCH REFUSED:** ${error.message}. No score assigned.`, ''); }
  }
  lines.push('## What this establishes', '',
    'One order per aftermath, not a real mix. Totals are fixture results, not evidence that one method wins for real shops. No model or B01 score is used. A truth-driven test policy reaches cost 1, showing the grader can reach its floor; it is not a deployable rival.', '',
    'The words script also reaches cost 1, so these six orders cannot show a model beating a script, and a right answer with thin citations can tie it. A held-out set of unseen #670 aftermaths, frozen before any model run, is PLANNED.', '',
    'Run `node scripts/run-order-recovery.mjs` to regenerate; add `--check` to verify the committed report byte for byte. The observable world and evaluator truth have separately pinned SHA-256 hashes. Hidden truth is outside product imports; this is a code boundary, not an OS sandbox against an agent with repository access.', '',
    'Practitioner question: how often do these aftermaths occur, who has the records, and what does handling each one cost?', '');
  return lines.join('\n');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = renderReport();
  if (process.argv.includes('--check')) {
    if (readFileSync(reportPath, 'utf8') !== report) throw new Error('Committed order-recovery report differs; regenerate it');
    console.log('Order-recovery report matches.');
  } else { mkdirSync(new URL('.', reportPath), { recursive: true }); writeFileSync(reportPath, report); console.log(fileURLToPath(reportPath)); }
}
