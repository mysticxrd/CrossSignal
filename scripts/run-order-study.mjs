import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { OrderBudget } from '../order-recovery/budget.mjs';
import { maximumReservation } from '../order-recovery/provider.mjs';
import { runLiveOrder } from '../order-recovery/live.mjs';
import { comparison, digest, finalJobs, markdown, readJson, studyPlan } from '../tests/evaluator/order-recovery/model-comparison.mjs';

const root = resolve(import.meta.dirname, '..'), configFile = 'order-recovery/generation-config.json';
export async function main(args) {
  const { values } = parseArgs({ args, options: { batch: { type: 'string' }, phase: { type: 'string', default: 'report' } } });
  const phase = values.phase; if (!['study', 'final', 'report'].includes(phase)) throw new Error('unknown_study_phase');
  const plan = studyPlan(values.batch), outputRoot = resolve(root, 'outputs/order-recovery-model', plan.batch);
  mkdirSync(outputRoot, { recursive: true });
  const manifest = resolve(outputRoot, 'plan.json');
  if (existsSync(manifest)) { if (digest(readJson(manifest)) !== digest(plan)) throw new Error('study_plan_changed'); }
  else { if (phase === 'report') throw new Error('study_manifest_required'); writeFileSync(manifest, JSON.stringify(plan, null, 2), { flag: 'wx' }); }
  const shared = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: root, encoding: 'utf8' }).trim();
  const budget = new OrderBudget(resolve(shared, 'crosssignal-order-model-budget.sqlite'));
  try {
    let jobs = plan.jobs, selection = null, budgetLimitation = null;
    if (phase === 'final') {
      const committed = JSON.parse(execFileSync('git', ['show', `HEAD:${configFile}`], { cwd: root, encoding: 'utf8' }));
      const config = readJson(resolve(root, configFile)), study = readJson(resolve(root, 'reports/order-recovery/token-limit-study.json'));
      selection = study.selection;
      jobs = finalJobs(plan, config, study, committed);
    }
    if (phase !== 'report') {
      const pending = jobs.filter(j => !existsSync(resolve(outputRoot, j.runId, 'result.json')));
      if (pending.some(j => existsSync(resolve(outputRoot, j.runId)))) throw new Error('interrupted_run_requires_inspection');
      const requiredMicros = pending.filter(j => j.provider === 'nebius').reduce((s, j) => s + 3 * maximumReservation(j.generationTokenLimit), 0)
        + (phase === 'study' ? 2 * plan.finalRepeats * 3 * maximumReservation(32768) : 0);
      const preflight = { remainingUsd: (25000000 - budget.usedMicros()) / 1e6, requiredWorstUsd: requiredMicros / 1e6,
        status: requiredMicros <= 25000000 - budget.usedMicros() ? 'fits' : 'insufficient_budget' };
      writeFileSync(resolve(outputRoot, `budget-${phase}.json`), JSON.stringify(preflight, null, 2));
      if (preflight.status !== 'fits') { budgetLimitation = preflight; process.exitCode = 1; }
      for (const job of (preflight.status === 'fits' ? pending : [])) {
        const { result } = await runLiveOrder({ ...job, root, outputRoot, budget,
          key: process.env[job.provider === 'nebius' ? 'NEBIUS_API_KEY' : 'GEMINI_API_KEY'] });
        console.log(JSON.stringify({ runId: job.runId, status: result.status, failureReason: result.failureReason,
          taskReservedOrAccountedUsd: budget.usedMicros() / 1e6 }));
        if (result.failureReason === 'nebius_task_budget_exhausted') { budgetLimitation = { status: 'exhausted_during_study', runId: job.runId }; process.exitCode = 1; break; }
      }
    }
    const report = { ...comparison(outputRoot, plan, jobs), phase: phase === 'final' ? 'final' : 'study', budgetLimitation };
    if (selection) report.selection = selection;
    const name = phase === 'final' ? 'model-comparison' : 'token-limit-study';
    const target = resolve(root, `reports/order-recovery/${name}`);
    writeFileSync(`${target}.json`, JSON.stringify(report, null, 2) + '\n'); writeFileSync(`${target}.md`, markdown(report));
    if (phase === 'study') writeFileSync(resolve(root, configFile), JSON.stringify({ ...report.selection, studySha256: digest(report),
      requestedReasoning: plan.requestedReasoning, heldOutAccessAuthorized: false }, null, 2) + '\n');
    console.log(JSON.stringify({ report: `${target}.md`, selection: report.selection, taskReservedOrAccountedUsd: budget.usedMicros() / 1e6 }));
  } finally { budget.close(); }
}
if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
  if (existsSync(resolve(root, '.env'))) process.loadEnvFile(resolve(root, '.env'));
  try { await main(process.argv.slice(2)); }
  catch (error) { console.error(/^[a-z_]+$/.test(error.message) ? error.message : 'order_study_failed'); process.exitCode = 1; }
}
