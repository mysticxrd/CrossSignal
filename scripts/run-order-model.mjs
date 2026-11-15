// --prepare prints the request; --response-file records fixture JSON; --live explicitly dispatches a provider request.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { orderWorld, prepareOrderRequest, recordOfflineOrderRun, responseByteLimit } from '../order-recovery/model.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export async function main(args) {
  const { values } = parseArgs({ args, options: { provider: { type: 'string' }, 'run-id': { type: 'string' },
    'response-file': { type: 'string' }, prepare: { type: 'boolean' }, live: { type: 'boolean' },
    world: { type: 'string' }, 'generation-tokens': { type: 'string' } } });
  const config = resolve(root, 'order-recovery/generation-config.json');
  const selectedLimit = existsSync(config) ? JSON.parse(readFileSync(config, 'utf8')).generationTokenLimit : null;
  const options = { worldId: values.world ?? '670', generationTokenLimit: Number(values['generation-tokens'] ?? selectedLimit ?? 8192) };
  const request = prepareOrderRequest(values.provider, orderWorld(options.worldId).loadWorld(), options);
  if (values.prepare) {
    if (values['run-id'] || values['response-file'] || values.live) throw new Error('prepare_does_not_record_a_run');
    console.log(JSON.stringify(request, null, 2)); return;
  }
  if (values.live) {
    if (!values['run-id'] || values['response-file']) throw new Error('live_requires_run_id_without_fixture');
    if (existsSync(resolve(root, '.env'))) process.loadEnvFile(resolve(root, '.env'));
    const { OrderBudget } = await import('../order-recovery/budget.mjs');
    const { runLiveOrder } = await import('../order-recovery/live.mjs');
    const shared = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: root, encoding: 'utf8' }).trim();
    const budget = new OrderBudget(resolve(shared, 'crosssignal-order-model-budget.sqlite'));
    try {
      const { directory, result } = await runLiveOrder({ ...options, provider: values.provider, runId: values['run-id'], root, budget,
        outputRoot: resolve(root, 'outputs/order-recovery-model'), key: process.env[values.provider === 'nebius' ? 'NEBIUS_API_KEY' : 'GEMINI_API_KEY'] });
      console.log(JSON.stringify({ source: result.source, status: result.status, directory, taskReservedOrAccountedUsd: budget.usedMicros() / 1000000 }));
      if (result.status !== 'validated') process.exitCode = 1;
    } finally { budget.close(); }
    return;
  }
  if (!values['run-id'] || !values['response-file']) throw new Error('run_id_and_response_file_required');
  const file = resolve(values['response-file']), stat = statSync(file);
  if (!stat.isFile() || stat.size > responseByteLimit) throw new Error('invalid_order_model_response_size');
  const { directory, result } = recordOfflineOrderRun({ ...options, provider: values.provider, runId: values['run-id'],
    outputRoot: resolve(root, 'outputs/order-recovery-model'), responseText: readFileSync(file, 'utf8') });
  console.log(JSON.stringify({ source: result.source, status: result.status, directory }));
  if (result.status !== 'validated') process.exitCode = 1;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await main(process.argv.slice(2)); }
  catch (error) { console.error(/^[a-z_]+$/.test(error.message) ? error.message : 'order_model_command_failed'); process.exitCode = 1; }
}
