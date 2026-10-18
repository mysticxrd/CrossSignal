import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CaseStore } from '../db/cases/store.mjs';
import { Cases } from '../db/cases/service.mjs';
import { ModelJobs, freeTierReady, freeTierTransport } from '../db/cases/model-jobs.mjs';
import { caseServer } from '../db/cases/http.mjs';
import { lockHost } from '../db/cases/host-lock.mjs';
const root = fileURLToPath(new URL('..', import.meta.url)), directory = resolve(root, 'outputs/case-lab');
mkdirSync(directory, { recursive: true });
const unlock = lockHost(resolve(directory, 'host-lock.sqlite'));
if (!process.env.GEMINI_API_KEY && existsSync(resolve(root, '.env'))) process.loadEnvFile(resolve(root, '.env'));
const store = new CaseStore(resolve(directory, 'cases.sqlite'));
const cases = new Cases(store, { recordings: resolve(directory, 'recordings') });
const jobs = new ModelJobs(cases, { transportFactory: () => freeTierTransport(root) });
const server = caseServer({ cases, jobs, staticDirectory: resolve(root, 'dist/case-lab'), modelReady: () => freeTierReady(root) });
try { jobs.recover(); } catch (error) { store.close(); unlock(); throw error; }
const port = Number(process.env.CROSSSIGNAL_CASE_PORT ?? 4317);
server.listen(port, '127.0.0.1', () => console.log(`CrossSignal Case lab: http://127.0.0.1:${server.address().port} (SIMULATED, local owner)`));
server.on('error', error => { console.error(error.code); store.close(); unlock(); process.exitCode = 1; });
let closing = false;
async function shutdown() {
  if (closing) return; closing = true;
  server.close(); if (jobs.active) await jobs.active; store.close(); unlock();
}
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
