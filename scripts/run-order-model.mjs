// Offline only: --prepare prints the request; --response-file records supplied {"decisions":[...]} JSON.
import { readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { prepareOrderRequest, recordOfflineOrderRun, responseByteLimit } from '../order-recovery/model.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export function main(args) {
  const { values } = parseArgs({ args, options: { provider: { type: 'string' }, 'run-id': { type: 'string' },
    'response-file': { type: 'string' }, prepare: { type: 'boolean' } } });
  const request = prepareOrderRequest(values.provider);
  if (values.prepare) {
    if (values['run-id'] || values['response-file']) throw new Error('prepare_does_not_record_a_run');
    console.log(JSON.stringify(request, null, 2)); return;
  }
  if (!values['run-id'] || !values['response-file']) throw new Error('run_id_and_response_file_required');
  const file = resolve(values['response-file']), stat = statSync(file);
  if (!stat.isFile() || stat.size > responseByteLimit) throw new Error('invalid_order_model_response_size');
  const { directory, result } = recordOfflineOrderRun({ provider: values.provider, runId: values['run-id'],
    outputRoot: resolve(root, 'outputs/order-recovery-model'), responseText: readFileSync(file, 'utf8') });
  console.log(JSON.stringify({ source: result.source, status: result.status, directory }));
  if (result.status !== 'validated') process.exitCode = 1;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(/^[a-z_]+$/.test(error.message) ? error.message : 'order_model_command_failed'); process.exitCode = 1; }
}
