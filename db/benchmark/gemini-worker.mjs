import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { prepareGemini } from './gemini-context.mjs';
import { inspectGeminiTurn } from './gemini-inspect.mjs';
import { queryObservable } from './tools.mjs';
import { exact } from './contracts.mjs';

// This trusted worker has no evaluator imports, credentials, writes or subprocess grant.
// Node 22 permissions are a file/process boundary, not a general OS/network sandbox.
// No model-supplied code is evaluated and no network operation is in this protocol.
globalThis.fetch = undefined;
globalThis.WebSocket = undefined;
for (const name of Object.keys(process.env))
  if (!['SYSTEMROOT', 'WINDIR'].includes(name.toUpperCase())) delete process.env[name];
let text = '';
for await (const chunk of process.stdin) {
  text += chunk;
  if (Buffer.byteLength(text) > 2_000_000) throw new Error('worker_input_limit');
}
let output;
try {
  const input = JSON.parse(text);
  if (input.operation === 'prepare') {
    exact(input, ['operation', 'observable', 'scope', 'options'], 'prepare command');
    output = prepareGemini(input.observable, input.scope, input.options);
  } else if (input.operation === 'inspect') {
    exact(input, ['operation', 'raw', 'options'], 'inspect command');
    output = inspectGeminiTurn(input.raw, input.options);
  } else if (input.operation === 'query') {
    exact(input, ['operation', 'observable', 'scope', 'query'], 'query command');
    output = queryObservable(input.observable, input.scope, input.query.tool, input.query.arguments);
  } else if (input.operation === 'probe') {
    exact(input, ['operation', 'paths'], 'probe command');
    const denied = [];
    for (const path of input.paths) {
      try { readFileSync(path); throw new Error('private_read_allowed'); }
      catch (e) { if (e.code !== 'ERR_ACCESS_DENIED') throw e; denied.push(path); }
    }
    let writesDenied = false, childrenDenied = false;
    try { writeFileSync(input.paths[0], 'FORBIDDEN'); }
    catch (e) { if (e.code !== 'ERR_ACCESS_DENIED') throw e; writesDenied = true; }
    try { spawnSync(process.execPath, ['-e', '']); }
    catch (e) { if (e.code !== 'ERR_ACCESS_DENIED') throw e; childrenDenied = true; }
    output = { readDenials: denied.length, writesDenied, childrenDenied,
      environmentEmpty: Object.keys(process.env).every(k => ['SYSTEMROOT', 'WINDIR'].includes(k.toUpperCase())),
      fetchUnavailable: globalThis.fetch === undefined };
  } else throw new Error('unknown_worker_operation');
  process.stdout.write(JSON.stringify({ ok: true, result: output }));
} catch {
  // No reflected arguments, provider errors, secrets or hidden text in failures.
  process.stdout.write(JSON.stringify({ ok: false, error: 'isolated_validation_failed' }));
}
