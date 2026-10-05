// Runs a B01 batch: benchmark cases x rules, single-shot-model and tool-using-model, one fresh run each, one after
// another, with Gemini on the free tier. By default it runs the 15 SIMULATED cases, B01-B15; --sets picks others, such
// as the daily real-baseline cases, one case format per batch. Gemini requests start at least 4.5 s apart, under the free
// tier's 15 a minute. Resumable: saved runs are skipped, so after a daily-quota stop just run it again later. A batch
// belongs to one commit and one profile, so its table does too. Once every run is saved it starts the separate grader
// (tests/evaluator/grade-b01.mjs); this process never opens the hidden answers.
// Usage: node scripts/run-b01.mjs [--new] [--profile minimal|low] [--sets b01-b05,b06-b10,...]
//   --new starts a fresh batch instead of resuming the latest one. --profile picks the thinking level and token
//   limits for a new batch (db/benchmark/gemini-config.mjs); the default, minimal, is the accepted B01 baseline.
//   --sets picks the case sets of a new batch, in order; the default is DEFAULT_SETS.
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { digest, requireThat } from '../db/benchmark/contracts.mjs';
import { dailyRulesFinding } from '../db/benchmark/daily-rules.mjs';
import { formatOf } from '../db/benchmark/formats.mjs';
import { GEMINI, PROFILES, tokenProfile } from '../db/benchmark/gemini-config.mjs';
import { createHttpTransport } from '../db/benchmark/gemini-http.mjs';
import { runGeminiInvestigation } from '../db/benchmark/gemini-runner.mjs';
import { GeminiStore } from '../db/benchmark/gemini-store.mjs';
import { rulesFinding } from '../db/benchmark/rules.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
// Public case files in batch order. B01-B05 were frozen on 2026-10-01; B06-B10 on 2026-10-04, before any agent change;
// B11-B15 on 2026-10-05, before the step-5 change, once B01-B10 had all been seen.
export const CASE_SETS = Object.freeze({ 'b01-b05': 'factory/02_data/benchmark/observable', 'b06-b10': 'db/benchmark/cases/b06-b10',
  'b11-b15': 'db/benchmark/cases/b11-b15' });
// The SIMULATED cases. A batch holds one case format, so the daily cases run as a batch of their own.
export const DEFAULT_SETS = Object.freeze(['b01-b05', 'b06-b10', 'b11-b15']);
// The frozen rule baseline for each case format.
const RULES = Object.freeze({ 'incident-data-v2': rulesFinding, 'incident-data-v3': dailyRulesFinding });
export const METHODS = ['rules', 'single-shot-model', 'tool-using-model'];
// Request, network and quota failures say nothing about a method: the attempt is kept but never scored.
const UNSCORED = ['http_failure', 'transport_failure', 'request_timeout'];
const id = prefix => `${prefix}_${randomBytes(6).toString('hex')}`;
const json = value => `${JSON.stringify(value, null, 2)}\n`;
const localDate = (d = new Date()) => [d.getFullYear(), d.getMonth() + 1, d.getDate()].map(n => String(n).padStart(2, '0')).join('-');

export async function createBatch({ parent, commit, date = localDate(), sets = DEFAULT_SETS, profile = 'minimal' }) {
  requireThat(sets.length > 0 && sets.every(set => Object.hasOwn(CASE_SETS, set)), 'unknown_case_set');
  const tokenLimits = tokenProfile(profile);
  let name = date;
  for (let n = 2; existsSync(join(parent, name)); n++) name = `${date}-${n}`;
  const sources = sets.flatMap(set => readdirSync(resolve(root, CASE_SETS[set])).filter(file => file.endsWith('.json')).sort()
    .map(file => ({ file: `${CASE_SETS[set]}/${file}`, source: JSON.parse(readFileSync(resolve(root, CASE_SETS[set], file), 'utf8')) })));
  const truthModes = [...new Set(sources.map(({ source }) => formatOf(source).truthMode))];
  requireThat(truthModes.length === 1, 'one_case_format_per_batch');
  const cases = sources.map(({ file, source }) => ({ caseRef: source.caseRef, file, sha256: digest(source) }));
  const directory = join(parent, name);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'BATCH.json'), json({ version: 'b01-batch-v1', truthMode: truthModes[0], date,
    startedAtUtc: new Date().toISOString(), commit, model: GEMINI.model, configHash: digest(GEMINI), profile, tokenLimits,
    requestGapMs: GEMINI.requestGapMs, methods: METHODS, caseSets: sets, cases,
    slots: cases.flatMap(c => METHODS.map(method => `${c.caseRef}-${method}`)) }), { flag: 'wx' });
  return directory;
}

export function latestBatch(parent) {
  if (!existsSync(parent)) return null;
  const batches = readdirSync(parent).filter(name => /^\d{4}-\d{2}-\d{2}(-\d+)?$/.test(name) && existsSync(join(parent, name, 'BATCH.json')))
    .map(name => ({ directory: join(parent, name), started: JSON.parse(readFileSync(join(parent, name, 'BATCH.json'), 'utf8')).startedAtUtc }))
    .sort((a, b) => a.started.localeCompare(b.started));
  return batches.at(-1)?.directory ?? null;
}

function isSaved(directory, slot) {
  const folder = join(directory, 'runs', slot);
  return existsSync(folder) && readdirSync(folder).some(name => existsSync(join(folder, name, 'RESULT.json'))
    && JSON.parse(readFileSync(join(folder, name, 'RESULT.json'), 'utf8')).saved === true);
}

function metrics(method, result, history, observable) {
  const records = history.map(row => ({ kind: row.kind, payload: JSON.parse(row.payload) }));
  const counts = records.filter(r => r.kind === 'response').map(r => r.payload.parsed?.usage?.counts ?? {});
  const tokens = key => counts.reduce((n, c) => n + (c[key] ?? 0), 0);
  const calls = result.transport ?? { generationCalls: 0, countCalls: 0, metadataCalls: 0, automaticRetries: 0 };
  return {
    tokens: { input: tokens('promptTokenCount'), output: tokens('candidatesTokenCount') + tokens('thoughtsTokenCount'),
      total: tokens('totalTokenCount') },
    turns: result.budget?.turns ?? 0, toolCalls: result.budget?.toolAttempts ?? 0, elapsedMs: result.elapsedMs,
    // Part of elapsedMs spent waiting for a free-tier request slot.
    pacingWaitMs: calls.pacingWaitMs ?? 0,
    requests: { generate: calls.generationCalls, countTokens: calls.countCalls, metadata: calls.metadataCalls,
      retries: calls.automaticRetries, total: calls.generationCalls + calls.countCalls + calls.metadataCalls },
    // Rows the method saw: every row for rules, else the rows placed in its model requests (all of them for single-shot;
    // the tool-using model starts from a row-free summary and sees rows only through tool results sent back to it).
    exposedEvidenceIds: method === 'rules' ? observable.events.map(e => e.id)
      : [...new Set(records.filter(r => r.kind === 'request').flatMap(r => r.payload.prepared.exposedEvidenceIds))],
  };
}

async function runSlot({ directory, slot, entry, source, method, profile, commit, transportFactory }) {
  const format = formatOf(source), sourceScope = { workspaceId: source.events[0].workspaceId, caseId: source.caseRef,
    runId: source.events[0].runId, actorId: id('a'), ...format.times() };
  const scope = { ...sourceScope, workspaceId: id('w'), caseId: id('c'), runId: id('r'), actorId: id('a') };
  const observable = format.bindRun(source, sourceScope, scope);
  const folder = join(directory, 'runs', slot, new Date().toISOString().replace(/[:.]/g, '-'));
  await mkdir(folder, { recursive: true });
  const store = new GeminiStore(join(folder, 'case.sqlite'),
    { metadata: { scope, method, truthMode: format.truthMode, configHash: digest(GEMINI),
      ...(observable.frame === undefined ? {} : { frame: observable.frame }) }, observable });
  let result, history;
  try {
    if (method === 'rules') {
      store.claim();
      const started = performance.now(), finding = RULES[format.version](observable, scope);
      result = { truthMode: format.truthMode, method, terminalStatus: finding.terminalStatus, failureReason: null, finding,
        elapsedMs: performance.now() - started, completedAtUtc: new Date().toISOString(), runtimeEffects: 0 };
      store.append('terminal', result);
    } else result = await runGeminiInvestigation({ observable, scope, method, store, profile, transport: transportFactory(profile) });
    history = store.history();
  } finally { store.close(); }
  const run = { version: 'b01-run-v1', saved: !UNSCORED.includes(result.failureReason), slot, case: entry.file,
    caseRef: entry.caseRef, method, model: method === 'rules' ? null : GEMINI.model, profile: method === 'rules' ? null : profile,
    commit, scope,
    metrics: metrics(method, result, history, observable), result };
  await writeFile(join(folder, 'HISTORY.json'), json(history));
  await writeFile(join(folder, 'RESULT.json'), json(run));
  return { run, folder };
}

function describe({ slot, result, metrics: m }) {
  const status = result.failureReason && result.failureReason !== result.terminalStatus
    ? `${result.terminalStatus} (${result.failureReason})` : result.terminalStatus;
  const diagnosis = result.finding?.hypotheses[0]?.diagnosis;
  return `${slot}: ${status} · ${m.tokens.total} tok · ${m.turns} turns · ${m.toolCalls} tools · `
    + `${(m.elapsedMs / 1000).toFixed(1)} s · ${m.requests.total} req${diagnosis ? `\n  diagnosis: ${diagnosis}` : ''}`;
}

export async function runBatch({ directory, commit, transportFactory, log = line => console.log(line) }) {
  const batch = JSON.parse(await readFile(join(directory, 'BATCH.json'), 'utf8'));
  requireThat(batch.commit === commit, 'batch_commit_mismatch');
  const profile = batch.profile ?? 'minimal'; // Batches from before the profile switch all ran the baseline.
  for (const entry of batch.cases) {
    const source = JSON.parse(await readFile(resolve(root, entry.file), 'utf8'));
    requireThat(digest(source) === entry.sha256, 'case_file_changed');
    for (const method of METHODS) {
      const slot = `${entry.caseRef}-${method}`;
      if (isSaved(directory, slot)) { log(`${slot}: saved, skipped`); continue; }
      const { run, folder } = await runSlot({ directory, slot, entry, source, method, profile, commit, transportFactory });
      log(describe(run));
      if (!run.saved) return { complete: false, stopped: run, folder };
    }
  }
  return { complete: true };
}

// Google marks a used-up daily free-tier quota with a QuotaFailure such as GenerateRequestsPerDayPerProjectPerModel-FreeTier.
export function dailyQuota(run) {
  const failure = run.result.transport?.lastFailure, body = run.result.transport?.lastFailureDiagnostic?.body ?? '';
  if (failure?.httpStatus !== 429 || !body.includes('PerDay')) return null;
  return /"quotaId":\s*"([^"]*PerDay[^"]*)"/.exec(body)?.[1] ?? 'a daily quota';
}

function headCommit() {
  const git = (...args) => spawnSync('git', ['-c', 'safe.directory=*', ...args], { cwd: root, encoding: 'utf8' });
  const head = git('rev-parse', 'HEAD'), status = git('status', '--porcelain');
  requireThat(head.status === 0 && status.status === 0, 'git_unavailable');
  requireThat(status.stdout.trim() === '', 'commit_changes_before_running: a batch must come from one commit');
  return head.stdout.trim();
}

function requireFreeTierKey() {
  // $0 only: refuse to send anything unless the owner's attestation says billing is off with no paid fallback.
  const account = JSON.parse(readFileSync(resolve(root, 'factory/03_build/output/gemini-runner-v1/ACCOUNT_ATTESTATION.json'), 'utf8'));
  requireThat(account.model === GEMINI.model && account.freeTier === true && account.billingDisabled === true
    && account.paidSpendCapUsd === 0 && account.paidFallback === false, 'free_tier_attestation_required');
  if (!process.env.GEMINI_API_KEY && existsSync(resolve(root, '.env'))) process.loadEnvFile(resolve(root, '.env'));
  requireThat(typeof process.env.GEMINI_API_KEY === 'string' && process.env.GEMINI_API_KEY.trim().length > 0, 'GEMINI_API_KEY_unset');
}

async function main(args) {
  const parent = resolve(root, 'outputs/b01'), commit = headCommit();
  const flag = args.indexOf('--profile'), wanted = flag === -1 ? null : args[flag + 1] ?? '';
  requireThat(wanted === null || Object.hasOwn(PROFILES, wanted), `--profile must be one of: ${Object.keys(PROFILES).join(', ')}`);
  const setsFlag = args.indexOf('--sets'), sets = setsFlag === -1 ? null : (args[setsFlag + 1] ?? '').split(',');
  requireThat(sets === null || sets.every(set => Object.hasOwn(CASE_SETS, set)),
    `--sets must be a comma-separated list of: ${Object.keys(CASE_SETS).join(', ')}`);
  let directory = args.includes('--new') ? null : latestBatch(parent);
  if (directory) {
    const batch = JSON.parse(readFileSync(join(directory, 'BATCH.json'), 'utf8'));
    requireThat(batch.commit === commit, `${directory} was run at ${batch.commit} but HEAD is ${commit}; `
      + 'a table must come from one commit, so start a fresh batch with --new');
    requireThat(wanted === null || (batch.profile ?? 'minimal') === wanted, `${directory} uses the ${batch.profile ?? 'minimal'} `
      + `profile; a table must come from one profile, so start a fresh batch with --new --profile ${wanted}`);
    const has = (batch.caseSets ?? []).join(',');
    requireThat(sets === null || has === sets.join(','), `${directory} runs ${has}; start a fresh batch with --new --sets ${sets?.join(',')}`);
    console.log(`Resuming ${directory}`);
  } else {
    directory = await createBatch({ parent, commit, profile: wanted ?? 'minimal', sets: sets ?? DEFAULT_SETS });
    console.log(`New batch ${directory} at ${commit}: ${(sets ?? DEFAULT_SETS).join(', ')}`);
  }
  const batch = JSON.parse(readFileSync(join(directory, 'BATCH.json'), 'utf8')), limits = tokenProfile(batch.profile ?? 'minimal');
  console.log(`Profile ${batch.profile ?? 'minimal'}: thinking ${limits.thinkingLevel}, up to ${limits.maxOutputTokens} output tokens `
    + `a response and ${limits.generatedTokens} a run. Gemini requests start at least ${GEMINI.requestGapMs / 1000} s apart.`);
  if (batch.slots.some(slot => !slot.endsWith('-rules') && !isSaved(directory, slot))) requireFreeTierKey();
  // Free-tier transports share one request pacer, so the spacing also holds from one run to the next.
  const outcome = await runBatch({ directory, commit, transportFactory: profile => createHttpTransport({ mode: 'FREE_TIER_BENCHMARK',
    fetchImpl: globalThis.fetch, keySource: () => process.env.GEMINI_API_KEY, beforeRequest: async () => {}, profile }) });
  if (!outcome.complete) {
    const quota = dailyQuota(outcome.stopped);
    console.log(quota ? `Stopped: the Gemini free-tier daily quota is used up (${quota}). That attempt is kept unscored in `
      + `${outcome.folder}. Run node scripts/run-b01.mjs again after the quota resets; saved runs are skipped.`
      : `Stopped: ${outcome.stopped.slot} ended with ${outcome.stopped.result.failureReason} (Google's error is printed above). `
      + `That attempt is kept unscored in ${outcome.folder}. If it was a request bug, commit the fix and rerun with --new; `
      + 'otherwise run again later to resume.');
    process.exitCode = 2;
    return;
  }
  // Grading runs in its own process, the only one that reads the rubric.
  const graded = spawnSync(process.execPath, [resolve(root, 'tests/evaluator/grade-b01.mjs'), directory], { cwd: root, stdio: 'inherit' });
  process.exitCode = graded.status ?? 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => { console.error(error.stack ?? error.message); process.exitCode = 1; });
}
