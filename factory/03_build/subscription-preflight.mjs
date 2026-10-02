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
import { prepareSubscription } from '../../db/benchmark/subscription.mjs';
import { START, CUTOFF } from '../../db/benchmark/contracts.mjs';

export const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const output = resolve(root, 'factory/03_build/output');
export const packet = resolve(output, 'chatgpt-subscription/measured-profile');
const changedOldFiles = Object.freeze([
  'factory/03_build/CONTEXT.md', 'factory/03_build/subscription-preflight.mjs',
  'factory/03_build/output/BUILD_EVIDENCE.md', 'factory/03_build/output/VERIFY.md', 'factory/03_build/output/HUMAN_GATE.md',
  'factory/03_build/output/chatgpt-subscription/CONTRACT_REVIEW.md',
  'db/benchmark/provider-config.mjs', 'db/benchmark/subscription.mjs', 'tests/benchmark-subscription.test.mjs',
]);
const newOwned = name => [
  'db/benchmark/subscription-budget.mjs', 'tests/benchmark-subscription-budget.test.mjs',
].includes(name) || name.startsWith('factory/03_build/output/chatgpt-subscription/measured-profile/')
  || name.startsWith('factory/01_spec/amendments/b01-siwc-measured-v1/')
  || name.startsWith('factory/02_data/amendments/b01-siwc-measured-v1/');
export const inputPaths = Object.freeze([
  'factory/03_build/CONTEXT.md', 'factory/03_build/verify.mjs', 'factory/03_build/subscription-preflight.mjs',
  'factory/01_spec/output/SPEC.md', 'factory/02_data/output/DATA_PACKAGE.md',
  'factory/02_data/output/HUMAN_GATE.md', 'factory/02_data/output/VERIFY.md',
  'factory/02_data/output/CONTRACT_EVIDENCE.json', 'factory/02_data/benchmark',
  'factory/_shared/BENCHMARK_DIRECTION.md', 'factory/_shared/QUALITY_GATES.md',
  'factory/02_data/verify.mjs', 'factory/_lib/verify-kit.mjs', 'factory/_lib/factory-state.mjs', 'factory/status.mjs',
  'docs/api-execution-boundary.md', 'eslint.config.mjs', 'package.json', 'package-lock.json',
  'db/benchmark', 'tests/benchmark.test.mjs', 'tests/benchmark-subscription.test.mjs',
  'tests/benchmark-subscription-budget.test.mjs',
  'factory/01_spec/amendments/b01-siwc-measured-v1',
  'factory/02_data/amendments/b01-siwc-measured-v1',
  'factory/03_build/output/chatgpt-subscription/CONTRACT_CHANGE_PROPOSAL.md',
  'factory/03_build/output/chatgpt-subscription/CONTRACT_REVIEW.md',
  'factory/03_build/output/chatgpt-subscription/ELIGIBILITY_OBSERVATION.json',
  'factory/03_build/output/chatgpt-subscription/measured-profile/PRESERVATION_BEFORE.json',
  'factory/03_build/output/chatgpt-subscription/measured-profile/AUTHORIZED_CHANGES.json',
  'factory/03_build/output/chatgpt-subscription/measured-profile/prior-current',
  'factory/03_build/output/chatgpt-subscription/measured-profile/ACCEPTANCE.json',
  'factory/03_build/output/chatgpt-subscription/measured-profile/PREPARED_REQUESTS.json',
  'factory/03_build/output/chatgpt-subscription/measured-profile/QUERY_CONTEXT_CHECK.json',
  'factory/03_build/output/chatgpt-subscription/measured-profile/OFFLINE_CHECKS.json',
]);
export const unfinished = Object.freeze([
  ...executionBlockers(),
  'Real OAuth listener/trusted discovery/protected credential storage and refresh lifecycle',
  'Automated transport/cancellation, durable bounded investigator/ledger and isolation probes',
  'Frozen experiment/schedule, three baselines, all 50 retained artifacts and blinded adjudication',
  'One pre-registered development change with preserved initial and second-round results',
  'Separate exact human-approved SIMULATED intervention and observed outcome',
  'Required complete Build lint/build/A01 and affected regression checks before opening its gate',
]);

export async function preparedRecords() {
  const records = [];
  for (const name of (await readdir(resolve(root, 'factory/02_data/benchmark/observable'))).sort()) {
    const input = JSON.parse(await readFile(resolve(root, 'factory/02_data/benchmark/observable', name), 'utf8'));
    const scope = { workspaceId: input.events[0].workspaceId, caseId: input.caseRef, runId: input.events[0].runId,
      actorId: 'a_123456789abc', start: START, clock: CUTOFF };
    const q = { tool: 'revenue.inspect', arguments: { start: START, end: CUTOFF, cursor: null, limit: 50, segment: null } };
    for (const [purpose, options] of [
      ['eager-single-shot', {}], ['tool-initial', { method: 'tool-using-model' }],
      ['ten-query-context-stress-fixture', { method: 'tool-using-model', queries: Array.from({ length: 10 }, () => q) }],
    ]) records.push({ caseRef: input.caseRef, purpose, ...prepareSubscription(input, scope, options) });
  }
  return records;
}

async function preservation() {
  const before = JSON.parse(await readFile(resolve(packet, 'PRESERVATION_BEFORE.json'), 'utf8'));
  const results = [];
  for (const [kind, saved] of Object.entries(before.repositories)) {
    const current = await inventory(saved.root, false);
    const changed = Object.entries(saved.files).filter(([name, sha]) => current.files[name] !== sha).map(([name]) => name);
    assert(changed.every(name => kind === 'product' && changedOldFiles.includes(name)), `Original bytes changed: ${kind}/${changed.join(',')}`);
    if (kind === 'product') for (const name of changedOldFiles) {
      assert.equal(sha256(await readFile(resolve(packet, 'prior-current', name))), saved.files[name], `Prior bytes not retained: ${name}`);
    }
    assert(saved.directories.every(name => current.directories.includes(name)), 'Original directory removed');
    assert.deepEqual(current.links, saved.links, 'Junction or link changed');
    assert.equal(current.head, saved.head); assert.equal(current.branch, saved.branch);
    assert.equal(current.indexSha256, saved.indexSha256, 'Git index changed');
    const related = line => kind === 'product' && (newOwned(line.slice(3)) || changedOldFiles.includes(line.slice(3)));
    assert(saved.status.every(line => related(line) || current.status.includes(line)), 'Unrelated uncommitted status lost');
    const added = Object.keys(current.files).filter(name => !(name in saved.files));
    assert(added.every(name => kind === 'product' && newOwned(name)), `Undeclared new files: ${kind}/${added.join(',')}`);
    results.push({ repository: kind, unchangedFiles: Object.keys(saved.files).length - changed.length,
      authorizedChangedOldFiles: changed, preservedDirectories: saved.directories.length,
      newFiles: added.length, head: current.head, branch: current.branch, indexUnchanged: true,
      preservedA01FactoryFiles: Object.keys(saved.files).filter(name => name.startsWith('_archive/2026-09-30-a01-before-b01/factory/')).length,
      preservedA01StoredFiles: Object.keys(saved.files).filter(name => name.startsWith('outputs/a01/')).length,
      preservedDataFiles: Object.keys(saved.files).filter(name => name.startsWith('factory/02_data/')).length });
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
export async function verifySubscriptionPreflight({ checkReports = true } = {}) {
  const data = await verifyData(); assert.equal(data.gate, 'accepted');
  const state = await deriveFactoryState({ projectRoot: root, includeGit: false });
  for (const stage of state.stages.slice(0, 2)) {
    assert.equal(stage.status, 'complete'); assert.equal(stage.dependencies, 'fresh');
  }
  assert.equal(PROVIDER.provider, 'openai-chatgpt-subscription'); assert.equal(PROVIDER.paidSpendCapUsd, 0);
  for (const key of ['allowApiKey', 'allowCredits', 'allowPaidFallback', 'oauthEligibilityVerified',
    'accountCatalogVerified', 'allowanceOnlyVerified', 'hardOutputCapSupported', 'dataCompatibilityAccepted']) assert.equal(PROVIDER[key], false);
  assert.equal(PROVIDER.contractAmendmentAccepted, true);
  assert.equal(PROVIDER.executionProfile, 'b01-siwc-measured-v1');
  const requests = JSON.parse(await readFile(resolve(packet, 'PREPARED_REQUESTS.json'), 'utf8'));
  assert.equal(requests.version, 'siwc-measured-offline-request-v1'); assert.equal(requests.modelCalls, 0);
  assert.deepEqual(requests.records, await preparedRecords(), 'Prepared request drift');
  const commands = [
    command(['--test', 'tests/benchmark.test.mjs', 'tests/benchmark-subscription.test.mjs', 'tests/benchmark-subscription-budget.test.mjs']),
    command(['node_modules/eslint/bin/eslint.js', 'db/benchmark', 'tests/benchmark.test.mjs',
      'tests/benchmark-subscription.test.mjs', 'tests/benchmark-subscription-budget.test.mjs', 'factory/03_build/verify.mjs', 'factory/03_build/subscription-preflight.mjs']),
    command(['-c', `safe.directory=${root.replaceAll('\\', '/')}`, 'diff', '--check'], root, 'git'),
    command(['-c', `safe.directory=${resolve(root, '../..').replaceAll('\\', '/')}`, 'diff', '--check'], resolve(root, '../..'), 'git'),
  ];
  const kept = await preservation();
  const originalPacket = resolve(packet, '..');
  const review = await readFile(resolve(originalPacket, 'CONTRACT_REVIEW.md'), 'utf8');
  assert.match(review, /^decision: accepted$/m); assert.match(review, /^gate_status: closed$/m);
  assert(review.includes(`proposal_sha256: ${await fileHash(root, resolve(originalPacket, 'CONTRACT_CHANGE_PROPOSAL.md'))}`));
  assert(review.includes(`accepted_spec_sha256: ${await fileHash(root, resolve(root, 'factory/01_spec/output/SPEC.md'))}`));
  const amendmentDir = resolve(root, 'factory/01_spec/amendments/b01-siwc-measured-v1');
  const amendmentGate = await readFile(resolve(amendmentDir, 'HUMAN_GATE.md'), 'utf8');
  assert.match(amendmentGate, /^decision: accepted$/m);
  assert(amendmentGate.includes(`contract_sha256: ${await fileHash(root, resolve(amendmentDir, 'CONTRACT.md'))}`));
  let bindingCount = 0;
  if (checkReports) {
    const compatibilityDir = resolve(root, 'factory/02_data/amendments/b01-siwc-measured-v1');
    const compatibilityGate = await readFile(resolve(compatibilityDir, 'HUMAN_GATE.md'), 'utf8');
    assert.match(compatibilityGate, /^gate_status: open$/m); assert.match(compatibilityGate, /^decision: pending$/m);
    const compatibilityReport = await readFile(resolve(compatibilityDir, 'DATA_COMPATIBILITY.md'), 'utf8');
    const compatibilityBindings = markdownHashBindings(markdownSection(compatibilityReport, /^## Declared input hashes$/));
    assert.equal(compatibilityBindings.length, 13, 'Incomplete compatibility input bindings');
    for (const b of compatibilityBindings)
      assert.equal(await pathHash(root, resolve(root, b.input)), b.expected, `Compatibility input drift: ${b.input}`);
    assert.match(await readFile(resolve(compatibilityDir, 'VERIFY.md'), 'utf8'), /^status: passed$/m);
    for (const [field, file] of [['data_compatibility_sha256', 'DATA_COMPATIBILITY.md'], ['verification_sha256', 'VERIFY.md']])
      assert(compatibilityGate.includes(`${field}: ${await fileHash(root, resolve(compatibilityDir, file))}`), `Compatibility gate mismatch: ${file}`);
    const evidence = await readFile(resolve(output, 'BUILD_EVIDENCE.md'), 'utf8');
    const bindings = markdownHashBindings(markdownSection(evidence, /^## Declared input hashes$/));
    assert.deepEqual(bindings.map(b => b.input).sort(), [...inputPaths].sort(), 'Incomplete input bindings');
    for (const b of bindings) assert.equal(await pathHash(root, resolve(root, b.input)), b.expected, `Input drift: ${b.input}`);
    bindingCount = bindings.length;
    assert.match(evidence, /^provider: openai-chatgpt-subscription$/m); assert.match(evidence, /^complete_build: false$/m);
    const gate = await readFile(resolve(output, 'HUMAN_GATE.md'), 'utf8');
    assert.match(gate, /^gate_status: blocked$/m); assert.match(gate, /^decision: pending$/m);
    for (const [field, file] of [['build_evidence_sha256', 'BUILD_EVIDENCE.md'], ['verification_sha256', 'VERIFY.md']])
      assert(gate.includes(`${field}: ${await fileHash(root, resolve(output, file))}`), `Gate hash mismatch: ${file}`);
    assert.match(await readFile(resolve(output, 'VERIFY.md'), 'utf8'), /^status: blocked$/m);
    const checks = JSON.parse(await readFile(resolve(packet, 'OFFLINE_CHECKS.json'), 'utf8'));
    assert.equal(checks.status, 'passed'); assert.equal(checks.modelCalls, 0); assert.equal(checks.runtimeEffects, 0);
    assert(checks.commands.every(c => c.exitCode === 0));
  }
  return { stage: '03_build', scope: 'subscription-offline-preflight-only', status: 'passed',
    completeBuildStatus: 'blocked', upstreamData: data, commands, preservation: kept,
    inputBindings: bindingCount, environment: { node: process.version, platform: process.platform, architecture: process.arch },
    provider: PROVIDER.provider, candidateModel: PROVIDER.candidateModel, modelCalls: 0, runtimeEffects: 0,
    modelEvaluation: 'NOT_RUN', humanRuntimeApproval: 'NOT_RUN', unfinished };
}
