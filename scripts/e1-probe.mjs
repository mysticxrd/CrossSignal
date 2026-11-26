// Ticket 02's probe of DeepSeek V4.1 Flash on Nebius (section 9 decision 2).
//   node scripts/e1-probe.mjs --prepare               writes tests/fixtures/e1-probe-requests.json, sends nothing
//   node scripts/e1-probe.mjs --live --run-id <id>    sends up to $0.05, saved under outputs/e1-probe/<id>/
// --live is paid: only on the owner's word, with Nebius zero data retention on. Each send reserves in the shared
// ledger first and settles from the price card; the probe stops itself at $0.05 counted.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { loadPriceCard } from '../e1/price-card.mjs';
import { probeFindings, probeSnapshot, runProbe } from '../e1/probe.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const snapshotFile = resolve(root, 'tests/fixtures/e1-probe-requests.json');
const usd = micros => `$${(micros / 1e6).toFixed(6)}`;

async function main(args) {
  const { values } = parseArgs({ args, options: { prepare: { type: 'boolean' }, live: { type: 'boolean' }, 'run-id': { type: 'string' } } });
  const card = loadPriceCard('deepseek-v4.1-flash-1017');
  if (values.prepare === values.live) throw new Error('give_prepare_or_live');
  if (values.prepare) {
    const snapshot = probeSnapshot(card);
    writeFileSync(snapshotFile, `${JSON.stringify(snapshot, null, 2)}\n`);
    for (const s of snapshot.sends) console.log(`${s.label.padEnd(24)} ${String(s.requestBytes).padStart(6)} bytes  reserves ${usd(s.reservedMicros)}`);
    console.log(`worst case ${usd(snapshot.worstCaseMicros)} (first attempts; turn 2 grows by send 2's reply), probe cap ${usd(snapshot.capMicros)}`);
    return;
  }
  check(/^e1-probe-[\w-]{1,60}$/.test(values['run-id'] ?? ''), 'run_id_must_start_e1_probe');
  const directory = resolve(root, 'outputs/e1-probe', values['run-id']);
  check(!existsSync(directory), 'probe_run_already_saved');
  if (!process.env.NEBIUS_API_KEY && existsSync(resolve(root, '.env'))) process.loadEnvFile(resolve(root, '.env'));
  const { OrderBudget, spendCeilingMicros } = await import('../order-recovery/budget.mjs');
  const shared = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: root, encoding: 'utf8' }).trim();
  const budget = new OrderBudget(resolve(shared, 'crosssignal-order-model-budget.sqlite'), spendCeilingMicros());
  mkdirSync(directory, { recursive: true });
  const save = (name, value) => writeFileSync(resolve(directory, name), `${JSON.stringify(value, null, 2)}\n`);
  try {
    const run = await runProbe({ card, key: process.env.NEBIUS_API_KEY, budget, runId: values['run-id'], save });
    const findings = probeFindings(run, card);
    save('outcomes.json', run.outcomes);
    save('findings.json', { runId: values['run-id'], at: new Date().toISOString(), findings });
    // Provider errors arrive with the key already hidden (e1/provider.mjs).
    for (const o of run.outcomes.filter(o => o.status === 'refused')) {
      console.log(`send ${o.send} ${o.label} refused: ${o.error}`);
      for (const a of o.attempts) if (a.error) console.log(`  HTTP ${a.httpStatus}: ${a.error}`);
    }
    console.log(findings.join('\n'));
    console.log(`saved ${directory}; ledger used ${usd(budget.usedMicros())} of ${usd(budget.ceilingMicros)}`);
  } finally { budget.close(); }
}

function check(ok, message) { if (!ok) throw new Error(message); }
try { await main(process.argv.slice(2)); } catch (error) {
  console.error(error.message);
  for (const a of error.attempts ?? []) if (a.error) console.error(`  HTTP ${a.httpStatus}: ${a.error}`);
  if (error.detail) console.error(error.detail);
  process.exitCode = 1;
}
