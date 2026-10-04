// Runs the A01 case (an Indian debit-card checkout incident) once on the Gemini free tier.
// Usage: node scripts/run-a01-gemini.mjs [tool-using-model|single-shot-model] [--profile minimal|low]
// The key comes from GEMINI_API_KEY or a gitignored .env. Failures print Google's full error
// with only the key hidden; each run writes a fresh, claim-once store under outputs/a01-gemini/.
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { bindRun, CUTOFF, START, digest, requireThat } from '../db/benchmark/contracts.mjs';
import { GEMINI, PROFILES } from '../db/benchmark/gemini-config.mjs';
import { createHttpTransport } from '../db/benchmark/gemini-http.mjs';
import { runGeminiInvestigation } from '../db/benchmark/gemini-runner.mjs';
import { GeminiStore } from '../db/benchmark/gemini-store.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const A01_CASE = 'factory/02_data/benchmark/observable/c_82238562b57a.json';
const args = process.argv.slice(2), flag = args.indexOf('--profile');
const profile = flag === -1 ? 'minimal' : args[flag + 1] ?? '';
const method = (flag === -1 ? args : args.toSpliced(flag, 2))[0] ?? 'tool-using-model';
requireThat(Object.hasOwn(PROFILES, profile), `--profile must be one of: ${Object.keys(PROFILES).join(', ')}`);
const id = prefix => `${prefix}_${randomBytes(6).toString('hex')}`;

// $0 only: refuse to send anything unless the owner's attestation says billing is off with no paid fallback.
const account = JSON.parse(await readFile(resolve(root, 'factory/03_build/output/gemini-runner-v1/ACCOUNT_ATTESTATION.json'), 'utf8'));
requireThat(account.model === GEMINI.model && account.freeTier === true && account.billingDisabled === true
  && account.paidSpendCapUsd === 0 && account.paidFallback === false, 'free_tier_attestation_required');
if (!process.env.GEMINI_API_KEY && existsSync(resolve(root, '.env'))) process.loadEnvFile(resolve(root, '.env'));
requireThat(typeof process.env.GEMINI_API_KEY === 'string' && process.env.GEMINI_API_KEY.trim().length > 0, 'GEMINI_API_KEY_unset');

const source = JSON.parse(await readFile(resolve(root, A01_CASE), 'utf8'));
const sourceScope = { workspaceId: source.events[0].workspaceId, caseId: source.caseRef,
  runId: source.events[0].runId, actorId: id('a'), start: START, clock: CUTOFF };
const scope = { ...sourceScope, workspaceId: id('w'), caseId: id('c'), runId: id('r'), actorId: id('a') };
const observable = bindRun(source, sourceScope, scope);
const directory = resolve(root, 'outputs/a01-gemini', `${new Date().toISOString().replace(/[:.]/g, '-')}-${method}`);
await mkdir(directory, { recursive: true });
const store = new GeminiStore(resolve(directory, 'case.sqlite'),
  { metadata: { scope, method, truthMode: 'SIMULATED', configHash: digest(GEMINI) }, observable });
const transport = createHttpTransport({ mode: 'FREE_TIER_BENCHMARK', fetchImpl: globalThis.fetch,
  keySource: () => process.env.GEMINI_API_KEY, beforeRequest: async () => {}, profile });

console.log(`A01 ${A01_CASE} -> ${GEMINI.model} (${method}, ${profile} profile), run ${scope.runId}`);
let result;
try {
  result = await runGeminiInvestigation({ observable, scope, method, store, transport, profile });
  await writeFile(resolve(directory, 'RESULT.json'), `${JSON.stringify({ case: A01_CASE, model: GEMINI.model, profile, scope, result }, null, 2)}\n`);
  await writeFile(resolve(directory, 'HISTORY.json'), `${JSON.stringify(store.history(), null, 2)}\n`);
} finally { store.close(); }

const { finding, budget, transport: calls } = result;
console.log(`status: ${result.terminalStatus}${result.failureReason ? ` (${result.failureReason})` : ''}`);
console.log(`model: ${result.modelVersion ?? 'not reported'}; generate calls ${calls.generationCalls}, count calls ${calls.countCalls}, retries ${calls.automaticRetries}`);
console.log(`budget: ${JSON.stringify({ modelTurns: budget.turns, toolAttempts: budget.toolAttempts,
  generatedTokens: budget.cumulativeGeneratedTokens })}; ${Math.round(result.elapsedMs / 1000)} s`);
if (finding) console.log(`finding:\n${JSON.stringify(finding, null, 2)}`);
console.log(`saved: ${directory}`);
process.exitCode = finding ? 0 : 1;
