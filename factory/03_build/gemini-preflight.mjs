import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { verifyData } from '../02_data/verify.mjs';
import { inventory } from '../02_data/benchmark/preservation.mjs';
import { deriveFactoryState } from '../_lib/factory-state.mjs';
import { fileHash, pathHash, sha256, markdownHashBindings, markdownSection } from '../_lib/verify-kit.mjs';
import { PROVIDER, executionBlockers } from '../../db/benchmark/provider-config.mjs';
import { prepareGemini, prepareTokenCount } from '../../db/benchmark/gemini-context.mjs';
import { START, CUTOFF } from '../../db/benchmark/contracts.mjs';

export const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const output = resolve(root, 'factory/03_build/output');
export const packet = resolve(output, 'gemini-resume');
const changedOldFiles = [
  'factory/03_build/CONTEXT.md', 'factory/03_build/verify.mjs',
  'factory/03_build/output/BUILD_EVIDENCE.md', 'factory/03_build/output/VERIFY.md', 'factory/03_build/output/HUMAN_GATE.md',
  'db/benchmark/provider-config.mjs', 'db/benchmark/subscription.mjs',
  'db/benchmark/subscription-budget.mjs', 'tests/benchmark-subscription.test.mjs',
];
const newOwned = name => [
  'db/benchmark/subscription-config.mjs', 'db/benchmark/gemini-context.mjs', 'db/benchmark/gemini-budget.mjs',
  'tests/benchmark-gemini-budget.test.mjs', 'factory/03_build/gemini-preflight.mjs',
].includes(name) || name.startsWith('factory/03_build/output/gemini-resume/');
export const inputPaths = Object.freeze([
  'factory/03_build/CONTEXT.md', 'factory/03_build/verify.mjs', 'factory/03_build/gemini-preflight.mjs',
  'factory/01_spec/output/SPEC.md', 'factory/01_spec/output/VERIFY.md', 'factory/01_spec/output/HUMAN_GATE.md',
  'factory/02_data/output/DATA_PACKAGE.md', 'factory/02_data/output/VERIFY.md', 'factory/02_data/output/HUMAN_GATE.md',
  'factory/02_data/output/CONTRACT_EVIDENCE.json', 'factory/02_data/benchmark', 'factory/02_data/verify.mjs',
  'factory/_shared/BENCHMARK_DIRECTION.md', 'factory/_shared/QUALITY_GATES.md',
  'factory/_lib/verify-kit.mjs', 'factory/_lib/factory-state.mjs', 'factory/status.mjs',
  'docs/api-execution-boundary.md', 'package.json', 'package-lock.json', 'eslint.config.mjs',
  'db/benchmark', 'tests/benchmark.test.mjs', 'tests/benchmark-subscription.test.mjs',
  'tests/benchmark-subscription-budget.test.mjs', 'tests/benchmark-gemini-budget.test.mjs',
  'factory/01_spec/amendments/b01-siwc-measured-v1', 'factory/02_data/amendments/b01-siwc-measured-v1',
  'factory/03_build/output/GEMINI_PROPOSAL.md',
  'factory/03_build/output/gemini-resume/PROPOSAL.md',
  'factory/03_build/output/gemini-resume/PRESERVATION_BEFORE.json',
  'factory/03_build/output/gemini-resume/AUTHORIZED_CHANGES.json',
  'factory/03_build/output/gemini-resume/prior-current',
  'factory/03_build/output/gemini-resume/ROUTE_DECISION.json',
  'factory/03_build/output/gemini-resume/REQUEST_AUTHORIZATION.json',
  'factory/03_build/output/gemini-resume/ACCOUNT_OBSERVATION.json',
  'factory/03_build/output/gemini-resume/DIAGNOSTIC_CHECK.json',
  'factory/03_build/output/gemini-resume/PREPARED_REQUESTS.json',
  'factory/03_build/output/gemini-resume/OFFLINE_CHECKS.json',
]);
export const unfinished = Object.freeze([
  ...executionBlockers(),
  'Frozen schedule, all 50 retained artifacts, method-blinded adjudication and one measured development change',
  'Separate exact human-approved SIMULATED intervention and observed outcome; currently prohibited',
  'Complete Build lint/build/A01 and affected regression checks before opening the human gate',
]);

export async function preparedRecords() {
  const records = [];
  for (const name of (await readdir(resolve(root, 'factory/02_data/benchmark/observable'))).sort()) {
    const input = JSON.parse(await readFile(resolve(root, 'factory/02_data/benchmark/observable', name), 'utf8'));
    const scope = { workspaceId: input.events[0].workspaceId, caseId: input.caseRef, runId: input.events[0].runId,
      actorId: 'a_123456789abc', start: START, clock: CUTOFF };
    const query = { tool: 'revenue.inspect', arguments: { start: START, end: CUTOFF, cursor: null, limit: 50, segment: null } };
    for (const [purpose, options] of [['eager-single-shot', {}], ['tool-initial', { method: 'tool-using-model' }],
      ['ten-query-context-stress-fixture', { method: 'tool-using-model', queries: Array.from({ length: 10 }, () => query) }]]) {
      const request = prepareGemini(input, scope, options);
      records.push({ caseRef: input.caseRef, purpose, ...request, tokenCountRequest: prepareTokenCount(request) });
    }
  }
  return records;
}

async function preservation() {
  const before = JSON.parse(await readFile(resolve(packet, 'PRESERVATION_BEFORE.json'), 'utf8'));
  assert.deepEqual(JSON.parse(await readFile(resolve(packet, 'AUTHORIZED_CHANGES.json'), 'utf8')), changedOldFiles);
  const results = [];
  for (const [kind, saved] of Object.entries(before.repositories)) {
    const current = await inventory(saved.root, false);
    const changed = Object.entries(saved.files).filter(([name, sha]) => current.files[name] !== sha).map(([name]) => name);
    assert(changed.every(name => kind === 'product' && changedOldFiles.includes(name)), `Original bytes changed: ${kind}/${changed.join(',')}`);
    if (kind === 'product') for (const name of changedOldFiles)
      assert.equal(sha256(await readFile(resolve(packet, 'prior-current', name))), saved.files[name], `Prior bytes missing: ${name}`);
    assert(saved.directories.every(name => current.directories.includes(name)), 'Original directory removed');
    assert.deepEqual(current.links, saved.links, 'Junction/link changed');
    assert.equal(current.head, saved.head); assert.equal(current.branch, saved.branch);
    assert.equal(current.indexSha256, saved.indexSha256, 'Git index changed');
    const related = line => kind === 'product' && (newOwned(line.slice(3)) || changedOldFiles.includes(line.slice(3)));
    assert(saved.status.every(line => related(line) || current.status.includes(line)), 'Unrelated uncommitted status lost');
    const added = Object.keys(current.files).filter(name => !(name in saved.files));
    assert(added.every(name => kind === 'product' && newOwned(name)), `Undeclared files: ${kind}/${added.join(',')}`);
    results.push({ repository: kind, unchangedFiles: Object.keys(saved.files).length - changed.length,
      changedOldFiles: changed, newFiles: added.length, preservedDirectories: saved.directories.length,
      head: current.head, branch: current.branch, indexUnchanged: true,
      a01FactoryFiles: Object.keys(saved.files).filter(n => n.startsWith('_archive/2026-09-30-a01-before-b01/factory/')).length,
      a01StoredFiles: Object.keys(saved.files).filter(n => n.startsWith('outputs/a01/')).length });
  }
  return results;
}

function command(args, cwd = root, executable = process.execPath) {
  const startedAt = new Date().toISOString(), result = spawnSync(executable, args, { cwd, encoding: 'utf8', timeout: 60_000,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, `${executable} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  return { command: [executable, ...args], cwd, startedAt, finishedAt: new Date().toISOString(),
    exitCode: result.status, stdout: result.stdout, stderr: result.stderr };
}

export async function verifyGeminiPreflight({ checkReports = true } = {}) {
  const data = await verifyData(); assert.equal(data.gate, 'accepted');
  const state = await deriveFactoryState({ projectRoot: root });
  for (const name of ['01_spec', '02_data']) {
    const stage = state.stages.find(s => s.name === name);
    assert.equal(stage.status, 'complete'); assert.equal(stage.dependencies, 'fresh');
  }
  assert.equal(PROVIDER.provider, 'gemini'); assert.equal(PROVIDER.model, 'gemini-3.5-flash-lite');
  assert.equal(PROVIDER.executionProfile, 'original-accepted-b01-token-limits');
  assert.equal(PROVIDER.freeTierRequestsConditionallyAuthorized, true);
  assert.equal(PROVIDER.modelCallsAuthorized, false); assert.equal(PROVIDER.paidSpendCapUsd, 0);
  assert.equal(PROVIDER.allowPaidFallback, false); assert.equal(PROVIDER.subscriptionPreparationSelected, false);
  const authorization = JSON.parse(await readFile(resolve(packet, 'REQUEST_AUTHORIZATION.json'), 'utf8'));
  assert.equal(authorization.answer, 'Authorize verified free-tier Gemini requests');
  assert.equal(authorization.conditional, true); assert.equal(authorization.paidSpendCapUsd, 0);
  assert.equal(authorization.runtimeIntervention, false);
  const prepared = JSON.parse(await readFile(resolve(packet, 'PREPARED_REQUESTS.json'), 'utf8'));
  assert.equal(prepared.version, 'gemini-current-offline-request-v1'); assert.equal(prepared.modelCalls, 0);
  assert.deepEqual(prepared.records, await preparedRecords());
  const commands = [
    command(['--test', 'tests/benchmark.test.mjs', 'tests/benchmark-subscription.test.mjs',
      'tests/benchmark-subscription-budget.test.mjs', 'tests/benchmark-gemini-budget.test.mjs']),
    command(['node_modules/eslint/bin/eslint.js', 'db/benchmark', 'tests/benchmark.test.mjs',
      'tests/benchmark-subscription.test.mjs', 'tests/benchmark-subscription-budget.test.mjs',
      'tests/benchmark-gemini-budget.test.mjs', 'factory/03_build/gemini-preflight.mjs', 'factory/03_build/verify.mjs']),
    command(['-c', `safe.directory=${root.replaceAll('\\', '/')}`, 'diff', '--check'], root, 'git'),
    command(['-c', `safe.directory=${resolve(root, '../..').replaceAll('\\', '/')}`, 'diff', '--check'], resolve(root, '../..'), 'git'),
  ];
  const kept = await preservation();
  let bindings = [];
  if (checkReports) {
    const evidence = await readFile(resolve(output, 'BUILD_EVIDENCE.md'), 'utf8');
    bindings = markdownHashBindings(markdownSection(evidence, /^## Declared input hashes$/));
    assert.deepEqual(bindings.map(b => b.input).sort(), [...inputPaths].sort());
    for (const binding of bindings) assert.equal(await pathHash(root, resolve(root, binding.input)), binding.expected, `Input drift: ${binding.input}`);
    assert.match(evidence, /^provider: gemini$/m); assert.match(evidence, /^complete_build: false$/m);
    const gate = await readFile(resolve(output, 'HUMAN_GATE.md'), 'utf8');
    assert.match(gate, /^gate_status: blocked$/m); assert.match(gate, /^decision: pending$/m);
    for (const [field, file] of [['build_evidence_sha256', 'BUILD_EVIDENCE.md'], ['verification_sha256', 'VERIFY.md']])
      assert(gate.includes(`${field}: ${await fileHash(root, resolve(output, file))}`), `Gate hash mismatch: ${file}`);
    assert.match(await readFile(resolve(output, 'VERIFY.md'), 'utf8'), /^status: blocked$/m);
    const checks = JSON.parse(await readFile(resolve(packet, 'OFFLINE_CHECKS.json'), 'utf8'));
    assert.equal(checks.status, 'passed'); assert.equal(checks.modelCalls, 0); assert.equal(checks.runtimeEffects, 0);
    assert(checks.commands.every(c => c.exitCode === 0));
  }
  return { stage: '03_build', scope: 'gemini-offline-preparation-only', status: 'passed', completeBuildStatus: 'blocked',
    provider: PROVIDER.provider, candidateModel: PROVIDER.model, executionProfile: PROVIDER.executionProfile,
    conditionalRequestAuthorization: 'recorded', upstreamData: data, commands, preservation: kept,
    inputBindings: bindings.length, environment: { node: process.version, platform: process.platform, architecture: process.arch },
    modelCalls: 0, runtimeEffects: 0, modelEvaluation: 'NOT_RUN', humanRuntimeApproval: 'NOT_RUN', unfinished };
}
