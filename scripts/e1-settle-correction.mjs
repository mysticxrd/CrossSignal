// Settles the two 15 Nov Nebius sends to what Nebius billed, once (section 9 decision 14).
//   node scripts/e1-settle-correction.mjs --billed-usd <the two sends together, from the Usage tab for 15 Nov>
//   node scripts/e1-settle-correction.mjs --all-time-usd <the console's all-time total>
// Without --write it checks and prints the plan and changes nothing. With --write it settles both sends in one
// ledger transaction and appends the record to e1/ledger-corrections.jsonl, which must then be committed.
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OrderBudget, spendCeilingMicros } from '../order-recovery/budget.mjs';
import { billedFromAllTime, planCorrection, settleCorrection } from '../e1/correction.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = process.argv.slice(2), value = name => args[args.indexOf(name) + 1];
const micros = usd => Math.round(Number(usd) * 1000000);
const billedArg = args.includes('--billed-usd') ? value('--billed-usd') : null;
const allTimeArg = args.includes('--all-time-usd') ? value('--all-time-usd') : null;
if ((billedArg === null) === (allTimeArg === null) || !/^\d+(\.\d{1,6})?$/.test(billedArg ?? allTimeArg)) {
  console.error('Give exactly one of --billed-usd or --all-time-usd, in dollars (up to 6 decimals).');
  process.exit(2);
}

const shared = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: root, encoding: 'utf8' }).trim();
const budget = new OrderBudget(resolve(shared, 'crosssignal-order-model-budget.sqlite'), spendCeilingMicros());
let settled = false;
try {
  const billedMicros = billedArg !== null ? micros(billedArg) : billedFromAllTime(budget, micros(allTimeArg));
  const record = { at: new Date().toISOString(), basis: billedArg !== null ? 'usage-tab-15-nov' : 'all-time-total',
    ...(allTimeArg !== null && { allTimeMicros: micros(allTimeArg) }), billedMicros, usedBeforeMicros: budget.usedMicros(),
    sends: planCorrection(budget, billedMicros) };
  if (!args.includes('--write')) {
    console.log(JSON.stringify(record, null, 2));
    console.log('Plan checked; nothing changed. Add --write to settle.');
  } else {
    const sends = settleCorrection(budget, billedMicros);
    settled = true;
    const line = JSON.stringify({ ...record, sends, usedAfterMicros: budget.usedMicros() });
    console.log(line);
    appendFileSync(resolve(root, 'e1/ledger-corrections.jsonl'), `${line}\n`);
    console.log('Settled. Commit e1/ledger-corrections.jsonl before this worktree goes: the ledger change is permanent.');
  }
} catch (error) {
  console.error(settled ? `Settled, but the log line was not written (${error.message}): save the line above to e1/ledger-corrections.jsonl.`
    : `Refused: ${error.message}. Nothing was settled.`);
  process.exitCode = 1;
} finally { budget.close(); }
