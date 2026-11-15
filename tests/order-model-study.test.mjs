import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { openOrderRun, orderWorld, prepareOrderRequest, generationLimits, ORDER_MODELS } from '../order-recovery/model.mjs';
import { inspectOrderUsage, maximumReservation, orderWireRequest } from '../order-recovery/provider.mjs';
import { OrderBudget } from '../order-recovery/budget.mjs';
import { runLiveOrder } from '../order-recovery/live.mjs';
import { wordsScript } from '../order-recovery/rivals.mjs';
import { reconcile } from '../order-recovery/refund-ordering/rivals.mjs';
import { comparison, digest, finalJobs, markdown, studyPlan, trial } from './evaluator/order-recovery/model-comparison.mjs';

function directory(t) {
  const path = mkdtempSync(join(tmpdir(), 'order-study-')); t.after(() => rmSync(path, { recursive: true, force: true })); return path;
}
const decisions = id => (id === '670' ? wordsScript : reconcile)(orderWorld(id).loadWorld());
function fixture(root, job, change = d => d) {
  const run = openOrderRun({ ...job, outputRoot: root, source: 'offline_fixture' });
  run.write('wire-request.json', JSON.stringify(orderWireRequest(run.request)));
  return run.finish({ text: JSON.stringify({ decisions: change(structuredClone(decisions(job.worldId))) }),
    modelVersion: ORDER_MODELS[job.provider], usage: { inputTokens: 1000, outputTokens: 800, reasoningTokens: 100 }, elapsedMs: 10 });
}
const report = (root, plan) => comparison(root, plan, plan.jobs, 'offline_fixture');
function unnecessaryAsk(d) { d[0] = { orderId: d[0].orderId, action: 'ask', evidenceIds: d[0].evidenceIds }; return d; }

test('the matrix fixes inputs and schemas across all three limits and separates the two world contracts', () => {
  assert.throws(() => studyPlan(undefined), /invalid_study_id/);
  const plan = studyPlan('fixture'); assert.equal(plan.jobs.length, 36);
  for (const worldId of ['670', '664']) for (const provider of ['gemini', 'nebius']) {
    const jobs = plan.jobs.filter(j => j.worldId === worldId && j.provider === provider);
    assert.equal(new Set(jobs.map(j => j.commonInputSha256)).size, 1);
    assert.equal(new Set(jobs.map(j => j.wireContractSha256)).size, 1);
    assert.equal(jobs.length, 9);
    const hashes = generationLimits.map(generationTokenLimit => {
      const r = prepareOrderRequest(provider, undefined, { worldId, generationTokenLimit }), wire = orderWireRequest(r);
      assert.equal(wire.body.max_completion_tokens ?? wire.body.generationConfig.maxOutputTokens, generationTokenLimit);
      assert.doesNotMatch(JSON.stringify(r), /EVALUATOR_ONLY_|privateCanary|merchantAnswer/);
      return r.commonInputSha256;
    });
    assert.equal(new Set(hashes).size, 1);
  }
  for (const limit of [0, 4096, 65536, NaN]) assert.throws(() => prepareOrderRequest('nebius', undefined, { generationTokenLimit: limit }), /unsupported_generation_limit/);
  assert.throws(() => prepareOrderRequest('nebius', undefined, { worldId: 'heldout' }), /unknown_order_world/);
});

test('#664 accepts its own decisions and refuses capture actions, extra fulfillment and cross-order citations', t => {
  const root = directory(t), jobs = studyPlan('refund').jobs.filter(j => j.worldId === '664');
  assert.equal(fixture(root, jobs[0]).result.status, 'validated');
  const changes = [d => { d[0].action = 'capture'; return d; }, d => { d[0].fulfillment = 'shipped'; return d; },
    d => { d[0].evidenceIds = [d[1].orderId]; return d; }];
  changes.forEach((change, i) => assert.equal(fixture(root, jobs[i + 1], change).result.status, 'invalid_response'));
});

test('higher-cap reservations cover every allowed retry and parsing uses the recorded cap', () => {
  assert.deepEqual(generationLimits.map(maximumReservation), [324404, 334234, 353895]);
  const studyWorst = generationLimits.reduce((s, cap) => s + 6 * 3 * maximumReservation(cap), 0);
  assert.equal(studyWorst, 18225594);
  const raw = { usage: { prompt_tokens: 1000, completion_tokens: 12000, total_tokens: 13000,
    completion_tokens_details: { reasoning_tokens: 11000 } } };
  assert.throws(() => inspectOrderUsage('nebius', raw, 8192), /usage_uncheckable/);
  assert.equal(inspectOrderUsage('nebius', raw, 16384).outputTokens, 12000);
});

test('a #664 live transport records and reserves the higher cap on every retry', async t => {
  const root = directory(t), budget = new OrderBudget(join(root, 'budget.sqlite')); let posts = 0;
  try {
    const run = await runLiveOrder({ root, budget, outputRoot: join(root, 'runs'), runId: 'higher-cap', worldId: '664', provider: 'nebius',
      generationTokenLimit: 32768, key: 'fixture-nebius-secret-key', log: () => {}, wait: async () => {}, fetchImpl: async (_, init) => {
        if (init.method === 'GET') return new Response(JSON.stringify({ data: [{ id: ORDER_MODELS.nebius, context_length: 1048576,
          pricing: { prompt: '0.0000003', completion: '0.0000012', request: '0' } }] }));
        posts++; assert.equal(budget.usedMicros(), 353895 * posts);
        assert.equal(JSON.parse(init.body).max_completion_tokens, 32768);
        return posts === 1 ? new Response('busy', { status: 503 }) : new Response(JSON.stringify({ model: ORDER_MODELS.nebius,
          choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ decisions: decisions('664') }) } }],
          usage: { prompt_tokens: 1000, completion_tokens: 12000, total_tokens: 13000, completion_tokens_details: { reasoning_tokens: 11000 } } }));
      } });
    assert.equal(run.result.status, 'validated'); assert.equal(run.result.generationTokenLimit, 32768);
    assert.equal(budget.usedMicros(), 368595); assert.equal(run.result.usage.outputTokens, 12000);
    for (const attempt of [1, 2]) assert.equal(JSON.parse(readFileSync(join(run.directory, `generation-attempt-${attempt}.json`))).generationTokenLimit, 32768);
  } finally { budget.close(); }
});

test('selection waits for every planned trial and chooses the smallest reliable cap without accuracy loss', t => {
  const root = directory(t), plan = studyPlan('smallest');
  plan.jobs.filter(j => j.generationTokenLimit === 8192).forEach(j => fixture(root, j));
  assert.equal(report(root, plan).selection.status, 'no_supported_selection');
  plan.jobs.filter(j => j.generationTokenLimit !== 8192).forEach(j => fixture(root, j));
  const full = report(root, plan); assert.equal(full.selection.generationTokenLimit, 8192);
  assert.ok(full.cells.every(c => c.completed === 3 && c.correct === c.expectedDecisions));
  assert.match(markdown(full), /unnecessary asks/);
  assert.equal(full.baselines.length, 8);
});

test('truncated or empty output is a failure with no invented penalty, while reported reasoning usage stays visible', t => {
  const root = directory(t), plan = studyPlan('truncated'); plan.jobs.forEach(j => fixture(root, j));
  const job = plan.jobs.find(j => j.generationTokenLimit === 8192 && j.provider === 'nebius');
  const file = join(root, job.runId, 'result.json'), result = JSON.parse(readFileSync(file, 'utf8'));
  Object.assign(result, { status: 'provider_failure', failureReason: 'incomplete_provider_output', decisions: null, usage: null, citedEvidenceIds: [] });
  writeFileSync(file, JSON.stringify(result));
  writeFileSync(join(root, job.runId, 'provider-response.json'), JSON.stringify({ model: ORDER_MODELS.nebius,
    choices: [{ finish_reason: 'length', message: { content: null } }], usage: { prompt_tokens: 1000, completion_tokens: 8192,
      total_tokens: 9192, completion_tokens_details: { reasoning_tokens: 8192 } } }));
  const full = report(root, plan), cell = full.cells.find(c => c.worldId === job.worldId && c.provider === job.provider && c.generationTokenLimit === 8192);
  assert.equal(cell.completed, 2); assert.equal(cell.runs, 3); assert.equal(cell.correct, cell.expectedDecisions * 2 / 3);
  const failed = full.runs.find(r => r.runId === job.runId);
  assert.equal(failed.penaltyCost, null); assert.equal(cell.penaltyCost, null); assert.equal(failed.usage.reasoningTokens, 8192);
  assert.equal(full.selection.generationTokenLimit, 16384);
});

test('a conflict between providers accuracy bars yields no supported common selection', t => {
  const root = directory(t), plan = studyPlan('accuracy');
  plan.jobs.forEach(j => fixture(root, j, j.worldId === '670' && j.generationTokenLimit !== (j.provider === 'gemini' ? 8192 : 16384) ? unnecessaryAsk : d => d));
  const full = report(root, plan);
  assert.ok(full.cells.every(c => c.completed === 3)); assert.equal(full.selection.status, 'no_supported_selection');
});

test('changed reasoning, cap or source cannot be mixed into a matched study', t => {
  const root = directory(t), plan = studyPlan('binding'), job = plan.jobs[0]; fixture(root, job);
  assert.throws(() => trial(root, job), /binding_mismatch/);
  const file = join(root, job.runId, 'wire-request.json'), wire = JSON.parse(readFileSync(file, 'utf8'));
  wire.body.generationConfig.maxOutputTokens = 32768; writeFileSync(file, JSON.stringify(wire));
  assert.throws(() => trial(root, job, 'offline_fixture'), /binding_mismatch/);
  wire.body.generationConfig.maxOutputTokens = job.generationTokenLimit; wire.body.generationConfig.thinkingConfig.thinkingLevel = 'HIGH';
  writeFileSync(file, JSON.stringify(wire)); assert.throws(() => trial(root, job, 'offline_fixture'), /binding_mismatch/);
});

test('final calls require the selected configuration to match the committed study evidence', t => {
  const root = directory(t), plan = studyPlan('final'); plan.jobs.forEach(j => fixture(root, j));
  const fixtureStudy = report(root, plan), fixtureConfig = { ...fixtureStudy.selection, studySha256: digest(fixtureStudy) };
  assert.throws(() => finalJobs(plan, fixtureConfig, fixtureStudy, fixtureConfig), /committed_selection_required/);
  const study = { ...fixtureStudy, source: 'live_provider' }, config = { ...study.selection, studySha256: digest(study) };
  assert.equal(finalJobs(plan, config, study, config).length, 8);
  assert.throws(() => finalJobs(plan, { ...config, generationTokenLimit: 32768 }, study, config), /committed_selection_required/);
  assert.throws(() => finalJobs(plan, config, { ...study, limitations: 'changed' }, config), /committed_selection_required/);
  const none = { ...config, status: 'no_supported_selection', generationTokenLimit: null };
  assert.throws(() => finalJobs(plan, none, study, none), /committed_selection_required/);
});
