import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { verifyData } from '../02_data/verify.mjs';
import { inventory } from '../02_data/benchmark/preservation.mjs';
import { deriveFactoryState } from '../_lib/factory-state.mjs';
import { fileHash, pathHash, markdownHashBindings, markdownSection } from '../_lib/verify-kit.mjs';
import { GEMINI } from '../../db/benchmark/gemini-config.mjs';
import { prepareSingleShot } from '../../db/benchmark/gemini.mjs';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const output = resolve(root, 'factory/03_build/output');
const onlyChangedOldFile = 'factory/03_build/CONTEXT.md';
const ownedNew = name => name.startsWith('db/benchmark/') || name === 'tests/benchmark.test.mjs'
  || name === 'factory/03_build/verify.mjs' || name.startsWith('factory/03_build/output/');
export const inputPaths = Object.freeze([
  'factory/03_build/CONTEXT.md', 'factory/03_build/verify.mjs',
  'factory/01_spec/output/SPEC.md', 'factory/02_data/output/DATA_PACKAGE.md',
  'factory/02_data/output/HUMAN_GATE.md', 'factory/02_data/output/VERIFY.md',
  'factory/02_data/output/CONTRACT_EVIDENCE.json', 'factory/02_data/benchmark',
  'factory/_shared/BENCHMARK_DIRECTION.md', 'factory/_shared/QUALITY_GATES.md',
  'factory/02_data/verify.mjs', 'factory/_lib/verify-kit.mjs', 'factory/_lib/factory-state.mjs', 'factory/status.mjs',
  'docs/api-execution-boundary.md', 'eslint.config.mjs', 'package.json', 'package-lock.json',
  'db/benchmark', 'tests/benchmark.test.mjs', 'factory/03_build/output/PREFLIGHT_PRESERVATION.json',
  'factory/03_build/output/GEMINI_PROPOSAL.md', 'factory/03_build/output/PREPARED_REQUESTS.json',
  'factory/03_build/output/OFFLINE_CHECKS.json',
]);
export const unfinished = Object.freeze([
  'Specific model/configuration review and explicit authorization for any API/model request',
  'Account-scoped verified free allocation with no paid fallback at the unchanged USD 0 cap',
  'Actual provider tokenizer/framing and request/response compatibility checks',
  'Durable read-only benchmark store, bounded multi-turn investigator and interruption recovery',
  'Frozen rules/prompts/configuration/schedule, three baselines and independent blinded adjudication',
  'Development-only failure analysis, one pre-registered change and preserved second-round results',
  'Separate exact human-approved SIMULATED intervention and observed outcome',
  'Required complete Build lint/build/A01 and affected regression checks before opening its gate',
]);

async function preservation() {
  const before = JSON.parse(await readFile(resolve(output, 'PREFLIGHT_PRESERVATION.json'), 'utf8'));
  const results = [];
  for (const [kind, saved] of Object.entries(before.repositories)) {
    // false includes the entire accepted Data package in the product inventory.
    const current = await inventory(saved.root, false);
    const changed = Object.entries(saved.files).filter(([name, sha]) => current.files[name] !== sha).map(([name]) => name);
    const permitted = kind === 'product' ? [onlyChangedOldFile] : [];
    assert(changed.every(name => permitted.includes(name)), `Old file bytes changed: ${kind}/${changed.join(',')}`);
    assert(saved.directories.every(name => current.directories.includes(name)), 'Original directory removed');
    assert.deepEqual(current.links, saved.links, 'Junction or link changed');
    assert.equal(current.head, saved.head); assert.equal(current.branch, saved.branch);
    assert.equal(current.indexSha256, saved.indexSha256, 'Git index changed');
    const relatedStatus = line => kind === 'product' && (ownedNew(line.slice(3)) || line.slice(3) === onlyChangedOldFile);
    assert(saved.status.every(line => relatedStatus(line) || current.status.includes(line)), 'Unrelated uncommitted status was lost');
    const added = Object.keys(current.files).filter(name => !(name in saved.files));
    assert(added.every(name => kind === 'product' && ownedNew(name)), `Undeclared new files: ${kind}/${added.join(',')}`);
    results.push({ repository: kind, unchangedFiles: Object.keys(saved.files).length - changed.length,
      authorizedChangedOldFiles: changed, preservedDirectories: saved.directories.length,
      newFiles: added.length, head: current.head, branch: current.branch,
      preservedA01FactoryFiles: Object.keys(saved.files).filter(name => name.startsWith('_archive/2026-09-30-a01-before-b01/factory/')).length,
      preservedA01StoredFiles: Object.keys(saved.files).filter(name => name.startsWith('outputs/a01/')).length,
      preservedDataFiles: Object.keys(saved.files).filter(name => name.startsWith('factory/02_data/')).length });
  }
  return results;
}
function command(args, cwd = root, executable = process.execPath, expect = 0) {
  const startedAt = new Date().toISOString(), result = spawnSync(executable, args, { cwd, encoding: 'utf8', timeout: 60_000 });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, expect, `${executable} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  return { command: [executable, ...args], cwd, startedAt, finishedAt: new Date().toISOString(),
    exitCode: result.status, stdout: result.stdout, stderr: result.stderr };
}
export async function verifyPreflight() {
  const data = await verifyData(); assert.equal(data.gate, 'accepted');
  const state = await deriveFactoryState({ projectRoot: root, includeGit: false });
  for (const stage of state.stages.slice(0, 2)) {
    assert.equal(stage.status, 'complete'); assert.equal(stage.dependencies, 'fresh');
  }
  assert.equal(GEMINI.modelCallsAuthorized, false); assert.equal(GEMINI.paidSpendCapUsd, 0);
  const requests = JSON.parse(await readFile(resolve(output, 'PREPARED_REQUESTS.json'), 'utf8'));
  assert.equal(requests.version, 'gemini-offline-request-proposal-v1'); assert.equal(requests.modelCalls, 0);
  const expected = [];
  for (const name of (await readdir(resolve(root, 'factory/02_data/benchmark/observable'))).sort()) {
    const input = JSON.parse(await readFile(resolve(root, 'factory/02_data/benchmark/observable', name), 'utf8'));
    const scope = { workspaceId: input.events[0].workspaceId, caseId: input.caseRef, runId: input.events[0].runId,
      actorId: 'a_123456789abc', start: '2026-09-01T09:00:00.000Z', clock: input.asOf };
    expected.push({ caseRef: input.caseRef, ...prepareSingleShot(input, scope) });
  }
  assert.deepEqual(requests.records, expected, 'Prepared request drift');
  const commands = [
    command(['--test', 'tests/benchmark.test.mjs']),
    command(['node_modules/eslint/bin/eslint.js', 'db/benchmark', 'tests/benchmark.test.mjs', 'factory/03_build/verify.mjs']),
    command(['-c', `safe.directory=${root.replaceAll('\\', '/')}`, 'diff', '--check'], root, 'git'),
    command(['-c', `safe.directory=${resolve(root, '../..').replaceAll('\\', '/')}`, 'diff', '--check'], resolve(root, '../..'), 'git'),
  ];
  const kept = await preservation();
  let bindingCount = 0;
  let evidence = null;
  try {
    evidence = await readFile(resolve(output, 'BUILD_EVIDENCE.md'), 'utf8');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (evidence !== null) {
    const bindings = markdownHashBindings(markdownSection(evidence, /^## Declared input hashes$/));
    assert.deepEqual(bindings.map(b => b.input).sort(), [...inputPaths].sort(), 'Incomplete input bindings');
    for (const binding of bindings) assert.equal(await pathHash(root, resolve(root, binding.input)), binding.expected, `Input drift: ${binding.input}`);
    bindingCount = bindings.length;
    const gate = await readFile(resolve(output, 'HUMAN_GATE.md'), 'utf8');
    assert.match(gate, /^gate_status: blocked$/m); assert.match(gate, /^decision: pending$/m);
    for (const [field, file] of [['build_evidence_sha256', 'BUILD_EVIDENCE.md'], ['verification_sha256', 'VERIFY.md']])
      assert(gate.includes(`${field}: ${await fileHash(root, resolve(output, file))}`), `Gate hash mismatch: ${file}`);
    assert.match(await readFile(resolve(output, 'VERIFY.md'), 'utf8'), /^status: blocked$/m);
  }
  return { stage: '03_build', scope: 'offline-preflight-only', status: 'passed',
    completeBuildStatus: 'blocked', upstreamData: data, commands, preservation: kept,
    inputBindings: bindingCount, environment: { node: process.version, platform: process.platform, architecture: process.arch },
    modelCalls: 0, runtimeEffects: 0, modelEvaluation: 'NOT_RUN', humanRuntimeApproval: 'NOT_RUN', unfinished };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  verifyPreflight().then(result => {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (!process.argv.includes('--preflight')) process.exitCode = 2; // Required full Build proof is absent.
  }).catch(error => { process.stderr.write(`${error.stack}\n`); process.exitCode = 1; });
}
