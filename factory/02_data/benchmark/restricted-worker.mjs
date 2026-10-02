import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createSession, queryObservable } from './tools.mjs';

let raw = '';
for await (const chunk of process.stdin) { raw += chunk; if (raw.length > 2_000_000) throw new Error('input limit'); }
const input = JSON.parse(raw);
let result;
if (input.operation === 'query') result = queryObservable(input.observable, input.scope, input.tool, input.args);
else if (input.operation === 'session') {
  const session = createSession(input.observable, input.scope);
  result = { results: input.requests.map(r => session.query(r.tool, r.args)), trace: session.trace() };
} else if (input.operation === 'probe') {
  let reads = 0;
  for (const path of input.paths) {
    try { readFileSync(path); throw new Error('private read allowed'); }
    catch (e) { if (e.code !== 'ERR_ACCESS_DENIED') throw e; reads++; }
  }
  let write = false, child = false;
  try { writeFileSync(input.paths[0], 'forbidden'); }
  catch (e) { if (e.code !== 'ERR_ACCESS_DENIED') throw e; write = true; }
  try { spawnSync(process.execPath, ['-e', '']); }
  catch (e) { if (e.code !== 'ERR_ACCESS_DENIED') throw e; child = true; }
  result = { reads, write, child, cleanEnvironment: !process.env.EVALUATOR_SECRET && !process.env.OPENAI_API_KEY };
} else throw new Error('unknown host operation');
process.stdout.write(JSON.stringify(result));
