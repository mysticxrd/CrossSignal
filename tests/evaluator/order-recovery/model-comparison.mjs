import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { orderWorld, prepareOrderRequest, generationLimits, ORDER_MODELS } from '../../../order-recovery/model.mjs';
import { orderWireRequest, inspectOrderUsage } from '../../../order-recovery/provider.mjs';
import { rivals as rivals670 } from '../../../order-recovery/rivals.mjs';
import { rivals as rivals664 } from '../../../order-recovery/refund-ordering/rivals.mjs';
import { grade as grade670, loadTruth as truth670, processChecks } from './grade.mjs';
import { grade as grade664, loadTruth as truth664 } from './refund-ordering.mjs';

export const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const readJson = file => JSON.parse(readFileSync(file, 'utf8'));
const check = (ok, reason) => { if (!ok) throw new Error(reason); };
const providers = Object.keys(ORDER_MODELS), worlds = ['670', '664'];
function wireHash(request, actual = orderWireRequest(request)) {
  const wire = structuredClone(actual);
  if (request.provider === 'gemini') delete wire.body.generationConfig.maxOutputTokens; else delete wire.body.max_completion_tokens;
  return digest(wire);
}
export function studyPlan(batch) {
  check(typeof batch === 'string' && /^[a-z0-9-]{1,24}$/.test(batch), 'invalid_study_id');
  const jobs = [];
  for (let repeat = 1; repeat <= 3; repeat++) for (const worldId of worlds) for (const generationTokenLimit of generationLimits)
    for (const provider of repeat % 2 ? providers : [...providers].reverse()) {
      const request = prepareOrderRequest(provider, undefined, { worldId, generationTokenLimit });
      jobs.push({ runId: `${batch}-${worldId}-${generationTokenLimit}-r${repeat}-${provider}`, worldId, provider, generationTokenLimit,
        repeat, commonInputSha256: request.commonInputSha256, wireContractSha256: wireHash(request) });
    }
  return { version: 1, batch, models: ORDER_MODELS, repeats: 3, finalRepeats: 2, requestedReasoning: 'LOW',
    rule: '3/3 completions in every provider/world cell; zero observed accuracy regression against every other tested cap in each cell', jobs };
}
function score(worldId, decisions) {
  const world = orderWorld(worldId).loadWorld(), truth = worldId === '670' ? truth670() : truth664();
  const rows = (worldId === '670' ? grade670 : grade664)(world, decisions, truth);
  const correct = rows.filter(r => !r.unneeded && (r.reason === 'right' || (r.reason === 'ask'
    && (worldId === '670' ? r.tier === 'person' : truth.orders.find(t => t.orderId === r.orderId).needsPerson)))).length;
  return { correct, expectedDecisions: rows.length, penaltyCost: rows.reduce((s, r) => s + r.cost, 0), process: processChecks(rows) };
}
export function trial(root, job, source = 'live_provider') {
  const directory = join(root, job.runId), resultFile = join(directory, 'result.json');
  const attempts = existsSync(directory) ? readdirSync(directory).filter(n => /^generation-attempt-\d+\.json$/.test(n)).map(n => {
    const a = readJson(join(directory, n)), received = join(directory, `generation-received-${a.attempt}.json`);
    check(a.generationTokenLimit === job.generationTokenLimit, 'attempt_limit_mismatch');
    return { ...a, received: existsSync(received) ? readJson(received) : null };
  }) : [];
  const expectedDecisions = orderWorld(job.worldId).orders(orderWorld(job.worldId).loadWorld()).length;
  if (!existsSync(resultFile)) return { ...job, status: 'missing', correct: 0, expectedDecisions, penaltyCost: null, attempts };
  const result = readJson(resultFile), request = readJson(join(directory, 'request.json')), wire = readJson(join(directory, 'wire-request.json'));
  check(result.source === source && result.runId === job.runId && result.provider === job.provider && result.worldId === job.worldId
    && result.generationTokenLimit === job.generationTokenLimit && result.commonInputSha256 === job.commonInputSha256
    && request.provider === job.provider && request.worldId === job.worldId && request.generationTokenLimit === job.generationTokenLimit
    && digest(request.common) === job.commonInputSha256
    && (wire.body.max_completion_tokens ?? wire.body.generationConfig.maxOutputTokens) === job.generationTokenLimit
    && wireHash(request, wire) === job.wireContractSha256, 'study_recording_binding_mismatch');
  let usage = result.usage, reportedModel = result.modelVersion;
  const rawFile = join(directory, 'provider-response.json');
  if (!usage && existsSync(rawFile)) {
    const raw = readJson(rawFile);
    try { usage = inspectOrderUsage(job.provider, raw, job.generationTokenLimit);
      reportedModel = job.provider === 'gemini' ? raw.modelVersion : raw.model; } catch { /* Unknown usage remains unknown. */ }
  }
  check(result.status !== 'validated' || result.modelVersion === ORDER_MODELS[job.provider], 'study_model_version_changed');
  return { ...job, status: result.status, failureReason: result.failureReason, recordedAt: result.recordedAt,
    modelVersion: reportedModel, elapsedMs: result.elapsedMs, usage, attempts, exposedRecords: result.exposedEvidenceIds.length,
    citedRecords: result.citedEvidenceIds.length,
    estimatedCostUsd: usage ? (job.provider === 'gemini' ? 0 : Math.ceil(usage.inputTokens * 0.3 + usage.outputTokens * 1.2) / 1e6) : null,
    ...(result.status === 'validated' ? score(job.worldId, result.decisions) : { correct: 0, expectedDecisions, penaltyCost: null }) };
}
export function comparison(root, plan, jobs = plan.jobs, source = 'live_provider') {
  const runs = jobs.map(job => trial(root, job, source)), cells = [];
  for (const worldId of worlds) for (const provider of providers) for (const limit of [...new Set(jobs.map(j => j.generationTokenLimit))]) {
    const rows = runs.filter(r => r.worldId === worldId && r.provider === provider && r.generationTokenLimit === limit);
    if (!rows.length) continue;
    cells.push({ worldId, provider, generationTokenLimit: limit, runs: rows.length, completed: rows.filter(r => r.status === 'validated').length,
      attempted: rows.filter(r => r.status !== 'missing').length, missingRuns: rows.filter(r => r.status === 'missing').length,
      correct: rows.reduce((s, r) => s + r.correct, 0), expectedDecisions: rows.reduce((s, r) => s + r.expectedDecisions, 0),
      attemptedExpectedDecisions: rows.filter(r => r.status !== 'missing').reduce((s, r) => s + r.expectedDecisions, 0),
      penaltyCost: rows.every(r => r.status === 'validated') ? rows.reduce((s, r) => s + r.penaltyCost, 0) : null,
      completedPenaltyCost: rows.some(r => r.status === 'validated') ? rows.reduce((s, r) => s + (r.penaltyCost ?? 0), 0) : null,
      failedRuns: rows.filter(r => !['validated', 'missing'].includes(r.status)).length,
      unknownUsageRuns: rows.filter(r => r.status !== 'missing' && !r.usage).length, estimatedKnownCostUsd: rows.reduce((s, r) => s + (r.estimatedCostUsd ?? 0), 0),
      elapsedMs: rows.map(r => r.elapsedMs ?? null), usage: rows.map(r => r.usage ?? null) });
  }
  const completeStudy = jobs.length === plan.jobs.length && runs.every(r => r.status !== 'missing');
  const selected = completeStudy ? generationLimits.find(limit => cells.filter(c => c.generationTokenLimit === limit).length === 4
    && cells.filter(c => c.generationTokenLimit === limit).every(c => c.runs === plan.repeats && c.completed === plan.repeats
      && cells.filter(other => other.worldId === c.worldId && other.provider === c.provider).every(other => c.correct >= other.correct))) : undefined;
  const baselines = worlds.flatMap(worldId => Object.entries(worldId === '670' ? rivals670 : rivals664)
    .map(([method, run]) => ({ worldId, method, source: 'code_only', ...score(worldId, run(orderWorld(worldId).loadWorld())) })));
  return { source, protocol: plan, selection: { generationTokenLimit: selected ?? null, status: selected ? 'selected' : 'no_supported_selection' },
    limitations: 'The token-limit study has three public repeats per cell; a supported final comparison has two. Observed completion is not a population reliability guarantee. No optimum or superiority claim. Held-out orders remain sealed. Exposure/citations do not prove reading.',
    cells, runs, baselines };
}
export function finalJobs(plan, config, study, committed) {
  check(study.source === 'live_provider' && digest(committed) === digest(config) && config.studySha256 === digest(study) && digest(study.protocol) === digest(plan)
    && config.status === 'selected' && generationLimits.includes(config.generationTokenLimit)
    && config.generationTokenLimit === study.selection.generationTokenLimit, 'committed_selection_required');
  return Array.from({ length: plan.finalRepeats }, (_, n) => plan.jobs.filter(j => j.repeat === 1 && j.generationTokenLimit === config.generationTokenLimit)
    .map(j => ({ ...j, repeat: n + 1, runId: `${plan.batch}-final-${j.worldId}-r${n + 1}-${j.provider}` }))).flat();
}
export function markdown(report) {
  return ['# Public order-model comparison', '', report.limitations, '',
    `Report phase: ${report.phase ?? 'study'}. Selection comes only from the three-repeat token-limit study; final runs do not reselect it.`, '',
    `Budget limitation: ${JSON.stringify(report.budgetLimitation ?? null)}.`, '',
    `Selected generation limit: ${report.selection.generationTokenLimit ?? 'none supported'}. Rule: ${report.protocol.rule}.`, '',
    'Correctness includes required escalation; unnecessary asks and unneeded writes are not correct decisions. Failed responses contribute no correct decisions and have no assigned penalty cost. Monetary estimates ignore cache discounts; unknown charges are not zero.', '',
    'Provider outages and sampling variation can change completion or accuracy without the token limit causing the change. Selection describes these public repeats only.', '',
    ...report.cells.map(c => `- #${c.worldId} ${c.provider}, cap ${c.generationTokenLimit}: completed ${c.completed}/${c.attempted} attempted (${c.missingRuns} unrun); correct ${c.correct}/${c.attemptedExpectedDecisions}; full penalty ${c.penaltyCost ?? 'unassigned'}, mean penalty per run ${c.penaltyCost === null ? 'unassigned' : (c.penaltyCost / c.runs).toFixed(3)}, completed subtotal ${c.completedPenaltyCost ?? 'none'}, failed runs ${c.failedRuns}; known usage estimate $${c.estimatedKnownCostUsd.toFixed(6)}; unknown usage runs ${c.unknownUsageRuns}.`), '',
    ...report.runs.map(r => `- ${r.runId} (${r.recordedAt ?? 'not run'}, model ${r.modelVersion ?? 'unavailable'}): ${r.status}; cap ${r.generationTokenLimit}; ${r.elapsedMs ?? 'unknown'} ms; usage ${JSON.stringify(r.usage ?? null)}; evidence supplied ${r.exposedRecords ?? 'unknown'}, cited ${r.citedRecords ?? 'unknown'}; process ${JSON.stringify(r.process ?? null)}; attempts ${JSON.stringify(r.attempts)}.`), '',
    '## Code-only baselines', '', 'Deterministic results per one public-world run; compare penalty with the model mean per run, not the multi-run total.', '',
    ...report.baselines.map(b => `- #${b.worldId} ${b.method}: correct ${b.correct}/${b.expectedDecisions}, penalty ${b.penaltyCost}; process ${JSON.stringify(b.process)}.`), ''].join('\n');
}
