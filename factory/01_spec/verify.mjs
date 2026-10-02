// Read-only Spec/preservation verification; no model, runtime, database or gate mutation.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import {
  fileHash, frontmatterValue, markdownHashBindings, markdownSection,
  runChecked, walkFiles,
} from '../_lib/verify-kit.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const stage = resolve(root, 'factory/01_spec');
const output = resolve(stage, 'output');
const baselineCommit = '43d42d255bd22cb227e3410dda31ffb8437f6624';
const archiveParent = resolve(root, '_archive/2026-09-30-a01-before-b01');
const preservedManifestHash = '196b0dfa75bbdd7f9514532f57a6bbd14a912dc3dfa64784b02b4d213d1be562';
const rawHash = bytes => createHash('sha256').update(bytes).digest('hex');

export const inputPaths = [
  'factory/01_spec/CONTEXT.md', 'factory/01_spec/verify.mjs',
  'factory/_shared/BENCHMARK_DIRECTION.md', 'factory/_shared/QUALITY_GATES.md',
  'factory/TRANSITION.md', 'factory/A01_PRESERVATION_MANIFEST.json',
  'factory/_lib/verify-kit.mjs', 'factory/_lib/factory-state.mjs',
  'docs/api-benchmark-charter.md', 'docs/api-execution-boundary.md',
  'docs/benchmark-planning-reconciliation.md',
  'tests/evaluator/benchmark/expected-judgments.md',
  'db/a01/contracts.mjs', 'db/a01/tools.mjs', 'db/a01/isolated.mjs',
  'db/a01/investigator.mjs', 'db/a01/runtime.mjs', 'db/a01/analysis.mjs',
  'db/a01/store.sql', 'scripts/run-a01.mjs', 'scripts/a01-case.mjs',
  'tests/a01.test.mjs', 'tests/a01-release.test.mjs', 'package.json',
  'tests/icm-workspace.test.mjs', 'tests/flight-recorder-data.test.mjs',
  'tests/flight-recorder-build.test.mjs', 'tests/flight-recorder-release.test.mjs',
  'tests/flight-recorder-ship.test.mjs', 'tests/supabase-trace-resolution.test.mjs',
];
const freshPaths = new Set(['factory/01_spec/CONTEXT.md',
  'factory/_shared/BENCHMARK_DIRECTION.md', 'factory/_shared/QUALITY_GATES.md']);

export function validateSpec(spec) {
  const errors = [];
  const require = (condition, error) => { if (!condition) errors.push(error); };
  for (const heading of [
    'Outcome and rationale', 'Source and confirmed transition', 'Scope and non-goals',
    'Five causal cases and expected judgments', 'Comparable methods and evidence access',
    'API execution and termination bounds', 'Architecture and minimal data changes',
    'Isolation and trust boundaries', 'Judgments, traces and measurements',
    'Evaluation and one-change experiment', 'One exact human-approved simulated intervention',
    'Compatibility work and stage ownership', 'Acceptance criteria',
    'Stage 01 gate and open execution selections', 'Declared input hashes',
  ]) require(spec.includes(`## ${heading}\n`), `missing heading: ${heading}`);
  require(frontmatterValue(spec, 'unit') === 'b01-api-behavioral-benchmark', 'wrong run unit');
  require(frontmatterValue(spec, 'baseline_commit') === baselineCommit, 'wrong sealed baseline');
  require(frontmatterValue(spec, 'model_evaluation') === 'NOT_RUN', 'Spec cannot claim model evaluation');
  require(frontmatterValue(spec, 'human_runtime_approval') === 'NOT_RUN', 'Spec cannot claim runtime-human approval');
  require(frontmatterValue(spec, 'paid_api_authorization') === 'not-granted', 'undocumented paid API authority');
  const cases = [...spec.matchAll(/^\| (B\d{2}) \|/gm)].map(match => match[1]);
  require(cases.join(',') === 'B01,B02,B03,B04,B05', 'must specify exactly five different cases');
  require(/^\| B05 \|[^\n]+\| Insufficient evidence:/m.test(spec), 'B05 requires evidence-based abstention');
  require(/observational-equivalence/.test(spec), 'missing B05 underidentification check');
  const methods = [...spec.matchAll(/^\| (deterministic-rules|single-shot-model|tool-using-model) \|/gm)].map(match => match[1]);
  require(methods.join(',') === 'deterministic-rules,single-shot-model,tool-using-model', 'missing baseline comparison');
  const comparison = markdownSection(spec, /^## Comparable methods and evidence access$/);
  require(/same observable evidence universe/.test(comparison), 'unequal allowed evidence');
  require(/same provider, pinned model\/version/.test(comparison), 'model/configuration fairness missing');
  require(/No silent truncation/.test(comparison), 'silent evidence truncation is forbidden');
  const bounds = markdownSection(spec, /^## API execution and termination bounds$/);
  for (const [key, value] of Object.entries({
    'working-context-tokens': 8192, 'output-tokens-per-response': 1024,
    'model-turns-per-investigation': 12, 'generated-tokens-per-investigation': 6144,
    'tool-call-attempts': 10, 'rows-per-response': 50, 'query-characters': 160,
    'request-timeout-seconds': 180, 'investigation-timeout-seconds': 900, concurrency: 1,
  })) require(new RegExp(`^\\| ${key} \\| ${value}(?: |;| \\|)`, 'm').test(bounds), `missing/changed bound: ${key}`);
  require(/Not authorized; retain no-paid-call/.test(bounds), 'no-paid-call constraint removed');
  require(/Unknown billing/.test(bounds) && /reasoning tokens/.test(bounds), 'unbounded API billing/usage');
  const isolation = markdownSection(spec, /^## Isolation and trust boundaries$/);
  for (const phrase of ['private evaluator truth', 'old grader reports', 'private simulator world',
    'file-read allowlist', 'canary scans', 'separate evaluator process']) {
    require(isolation.includes(phrase), `missing isolation rule: ${phrase}`);
  }
  const experiment = markdownSection(spec, /^## Evaluation and one-change experiment$/);
  require(/35 artifacts/.test(experiment) && /15/.test(experiment) && /50 planned artifacts/.test(experiment), 'incorrect experiment counts');
  require(/development results only/.test(experiment) && /Pre-register one hypothesis/.test(experiment), 'missing development-only measured change');
  require(/Negative\/no improvement is a valid result/.test(experiment), 'agent superiority must not be required');
  const demo = markdownSection(spec, /^## One exact human-approved simulated intervention$/);
  for (const phrase of ['payload/context/policy hashes', 'nonce', 'expiry', 'exact proposal/hash',
    'stage acceptance', 'fixture-surrogate', 'Global Pause']) require(demo.includes(phrase), `missing exact runtime boundary: ${phrase}`);
  const ids = [...spec.matchAll(/^\| (AC\d{2}) \|/gm)].map(match => match[1]);
  require(ids.join(',') === Array.from({ length: 16 }, (_, i) => `AC${String(i + 1).padStart(2, '0')}`).join(','), 'missing or duplicated acceptance criteria');
  const metrics = markdownSection(spec, /^## Judgments, traces and measurements$/);
  for (const phrase of ['unsupported', 'contradiction', 'abstention', 'latency', 'token', 'cost', 'trace', 'null with a reason']) {
    require(metrics.includes(phrase), `missing measurement: ${phrase}`);
  }
  return errors;
}

export function verifyNegativeScopes(spec) {
  const mutations = [
    ['unequal evidence', text => text.replace('same observable evidence universe', 'restricted evidence only for one method')],
    ['hidden answer over abstention', text => text.replace('| Insufficient evidence:', '| Diagnose delayed ingestion with certainty:')],
    ['unbounded tools', text => text.replace('| tool-call-attempts | 10 maximum;', '| tool-call-attempts | 100 maximum;')],
    ['claimed model proof', text => text.replace('model_evaluation: NOT_RUN', 'model_evaluation: PASSED')],
    ['unapproved paid calls', text => text.replace('paid_api_authorization: not-granted', 'paid_api_authorization: granted')],
    ['missing isolation', text => text.replace(markdownSection(text, /^## Isolation and trust boundaries$/), '')],
  ];
  for (const [name, mutate] of mutations) assert(validateSpec(mutate(spec)).length > 0, `did not reject ${name}`);
  return mutations.map(([name]) => name);
}

export async function verifySpec({ beforeGate = false } = {}) {
  const specPath = resolve(output, 'SPEC.md');
  const spec = await readFile(specPath, 'utf8');
  assert.deepEqual(validateSpec(spec), []);
  const negativeScopes = verifyNegativeScopes(spec);
  const gatePath = resolve(output, 'HUMAN_GATE.md');
  const gate = existsSync(gatePath) ? await readFile(gatePath, 'utf8') : '';
  const accepted = frontmatterValue(gate, 'decision') === 'accepted';
  const bindings = markdownHashBindings(markdownSection(spec, /^## Declared input hashes$/));
  assert.deepEqual(bindings.map(binding => binding.input).sort(), [...inputPaths].sort(), 'undeclared/missing context bindings');
  const historicalDrift = [];
  for (const binding of bindings) {
    const actual = await fileHash(root, resolve(root, binding.input));
    if (actual !== binding.expected) {
      if (accepted && !freshPaths.has(binding.input)) historicalDrift.push(binding.input);
      else assert.equal(actual, binding.expected, 'input drift: ' + binding.input);
    }
  }
  const transition = await readFile(resolve(root, 'factory/TRANSITION.md'), 'utf8');
  assert.equal(frontmatterValue(transition, 'transition_confirmation'), 'user-confirmed-2026-10-01');
  assert.equal(frontmatterValue(transition, 'spec_entry_confirmation'), 'user-confirmed-2026-10-01');
  assert.equal(frontmatterValue(transition, 'paid_api_authorization'), 'not-granted');
  const manifestBytes = readFileSync(resolve(root, 'factory/A01_PRESERVATION_MANIFEST.json'));
  assert.equal(rawHash(manifestBytes), preservedManifestHash, 'preservation manifest changed');
  assert.equal(rawHash(readFileSync(resolve(archiveParent, 'PRESERVATION_MANIFEST.json'))), preservedManifestHash);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  assert.equal(manifest.baselineCommit, baselineCommit);
  assert.equal(manifest.files.length, 118);
  const archivedPaths = (await walkFiles(resolve(archiveParent, 'factory'))).map(path => relative(archiveParent, path).replaceAll('\\', '/')).sort();
  assert.deepEqual(archivedPaths, manifest.files.map(item => item.path).sort(), 'archive file inventory changed');
  for (const item of manifest.files) assert.equal(rawHash(readFileSync(resolve(archiveParent, item.path))), item.sha256, 'archived bytes changed: ' + item.path);
  for (const item of manifest.files.filter(item => /factory\/(?:_lib\/|_templates\/|_shared\/(?:QUALITY_GATES|A01_DIRECTION|ARCHITECTURE_SNAPSHOT)\.md|02_data\/(?:fixtures|postgres)\/|03_build\/generate-supabase-fixture-sql\.mjs|status\.mjs|seal\.mjs)/.test(item.path))) {
    assert.equal(rawHash(readFileSync(resolve(root, item.path))), item.sha256, 'preserved shared/tool/legacy dependency changed: ' + item.path);
  }
  // Observed product surfaces must match the sealed baseline while Spec is pending.
  if (!accepted) {
    for (const path of inputPaths.filter(path => /^(db\/|scripts\/|tests\/a01|tests\/(?:icm-workspace|flight-recorder-|supabase-trace)|package\.json)/.test(path))) {
      const committed = runChecked('git', ['show', `${baselineCommit}:${path}`], { cwd: root }).stdout.replace(/\r\n?/g, '\n');
      assert.equal((await readFile(resolve(root, path), 'utf8')).replace(/\r\n?/g, '\n'), committed, 'Spec changed product/test code: ' + path);
    }
    for (const name of ['02_data', '03_build', '04_verify', '05_ship']) assert(!existsSync(resolve(root, 'factory', name, 'output')), 'later stage started before Spec gate');
  }
  const outer = resolve(root, '../..');
  for (const [path, expected] of Object.entries({
    'CONTEXT.md': '26016ff186b3548883cf246131a26afa0dfcb828b4336aeefc98a8e99d13db7c',
    'Software Factory - Keeping AI Agents Aligned.md': 'dd35c46d6528a55a1964751ec3167641549dd0d4085f8e0b930c24f9912e67f2',
  })) assert.equal(rawHash(readFileSync(resolve(outer, path))), expected, 'unrelated outer work changed');
  if (!beforeGate) {
    const verifyPath = resolve(output, 'VERIFY.md');
    const verification = await readFile(verifyPath, 'utf8');
    assert.equal(frontmatterValue(verification, 'status'), 'passed');
    assert.equal(frontmatterValue(gate, 'spec_sha256'), await fileHash(root, specPath), 'Spec gate hash drift');
    assert.equal(frontmatterValue(gate, 'verification_sha256'), await fileHash(root, verifyPath), 'VERIFY gate hash drift');
    assert(['pending', 'accepted', 'changes-requested', 'rejected'].includes(frontmatterValue(gate, 'decision')), 'invalid human decision');
    if (accepted) assert.equal(frontmatterValue(gate, 'gate_status'), 'closed');
  }
  return { stage: '01_spec', unit: 'b01-api-behavioral-benchmark', status: 'passed',
    inputBindings: bindings.length, causalCases: 5, acceptanceCriteria: 16,
    negativeScopeChecks: negativeScopes, archivedFactoryFiles: manifest.files.length,
    historicalDrift, gate: beforeGate ? 'not-checked-before-gate' : frontmatterValue(gate, 'decision'),
    modelEvaluation: 'NOT_RUN', humanRuntimeApproval: 'NOT_RUN', productImplementationChanged: false };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  verifySpec({ beforeGate: process.argv.includes('--before-gate') })
    .then(result => process.stdout.write(JSON.stringify(result, null, 2) + '\n'))
    .catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 1; });
}
