import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { ORDER_MODELS, prepareOrderRequest, recordOfflineOrderRun, responseByteLimit } from '../order-recovery/model.mjs';
import { loadWorld } from '../order-recovery/world.mjs';
import { wordsScript } from '../order-recovery/rivals.mjs';
import { grade, loadTruth, processChecks } from './evaluator/order-recovery/grade.mjs';

const world = loadWorld(), decisions = wordsScript(world), responseText = JSON.stringify({ decisions });
function directory(t) {
  const path = mkdtempSync(join(tmpdir(), 'order-model-'));
  t.after(() => rmSync(path, { recursive: true, force: true })); return path;
}
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));

test('provider selection changes the requested model, never the common public evidence or contract', () => {
  const gemini = prepareOrderRequest('gemini'), nebius = prepareOrderRequest('nebius');
  assert.equal(gemini.requestedModel, 'gemini-3.5-flash-lite');
  assert.equal(nebius.requestedModel, 'deepseek-ai/DeepSeek-V4.1-Flash-1017');
  assert.deepEqual(gemini.common, nebius.common);
  assert.equal(gemini.commonInputSha256, nebius.commonInputSha256);
  assert.equal(gemini.worldSha256, nebius.worldSha256);
  assert.deepEqual(gemini.common.world, world);
  assert.equal(gemini.common.orderIds.length, 6);
  assert.doesNotMatch(JSON.stringify(gemini), /EVALUATOR_ONLY_|privateCanary|expectedDiagnosis/);
  for (const provider of ['openrouter', 'toString', '__proto__', '', undefined]) {
    assert.throws(() => prepareOrderRequest(provider), /unknown_order_model_provider/);
  }
  const input = structuredClone(world), request = prepareOrderRequest('gemini', input);
  input.records[0].status = 'cancelled';
  assert.equal(request.common.world.records[0].status, world.records[0].status);
  assert.throws(() => { request.common.instructions = 'capture everything'; }, TypeError);
  assert.throws(() => { request.common.responseSchema.properties.decisions.items.anyOf[0].properties.action.const = 'leave'; }, TypeError);
});

test('offline recordings preserve decisions, citations and baseline scores without claiming a model ran', t => {
  const outputRoot = directory(t), truth = loadTruth();
  for (const provider of Object.keys(ORDER_MODELS)) {
    const recorded = recordOfflineOrderRun({ provider, runId: provider, outputRoot, responseText });
    const request = readJson(join(recorded.directory, 'request.json')), result = readJson(join(recorded.directory, 'result.json'));
    assert.deepEqual(result, recorded.result);
    assert.equal(readFileSync(join(recorded.directory, 'response.txt'), 'utf8'), responseText);
    assert.deepEqual(result.decisions, decisions);
    assert.equal(result.status, 'validated'); assert.equal(result.failureReason, null);
    assert.equal(result.source, 'offline_fixture'); assert.equal(result.truthMode, 'SIMULATED');
    assert.equal(result.provider, provider); assert.equal(result.requestedModel, ORDER_MODELS[provider]);
    for (const field of ['modelVersion', 'usage', 'chargeUsd']) assert.equal(result[field], null);
    assert.equal(result.unavailableReason, 'offline_fixture_no_model_call');
    assert.equal(result.commonInputSha256, request.commonInputSha256);
    assert.deepEqual(result.exposedEvidenceIds, world.records.map(r => r.id));
    assert.deepEqual(result.citedEvidenceIds, [...new Set(decisions.flatMap(d => d.evidenceIds))]);
    const rows = grade(world, result.decisions, truth);
    assert.deepEqual(rows, grade(world, decisions, truth));
    assert.equal(rows.reduce((sum, row) => sum + row.cost, 0), 1);
    assert.deepEqual(processChecks(rows), { orders: 6, deciding: 6, missing: [], extra: 0, unneeded: [] });
    assert.deepEqual(readdirSync(recorded.directory).sort(), ['request.json', 'response.txt', 'result.json']);
  }
});

test('malformed model-shaped text is recorded as invalid, never repaired into a guessed decision', t => {
  const outputRoot = directory(t), broken = [
    'not json', 'null', '[]', JSON.stringify({ decisions, explanation: 'extra' }),
    JSON.stringify({ decisions: decisions.slice(1) }),
    JSON.stringify({ decisions: decisions.map((d, i) => i ? d : { ...d, orderId: decisions[1].orderId }) }),
    JSON.stringify({ decisions: decisions.map(d => ({ ...d, action: 'refund' })) }),
    JSON.stringify({ decisions: decisions.map(d => ({ ...d, evidenceIds: ['absent'] })) }),
    JSON.stringify({ decisions: decisions.map(d => ({ ...d, evidenceIds: [...d.evidenceIds, ...d.evidenceIds] })) }),
    JSON.stringify({ decisions: decisions.map(d => ({ ...d, fulfillment: 'unknown' })) }),
    JSON.stringify({ decisions: decisions.map(d => ({ ...d, approvalRequired: false })) }),
    JSON.stringify({ decisions: decisions.map(d => ({ ...d, evidenceIds: [] })) }),
  ];
  broken.forEach((text, i) => {
    const { directory: run, result } = recordOfflineOrderRun({ provider: 'nebius', runId: `invalid-${i}`, outputRoot, responseText: text });
    assert.equal(result.status, 'invalid_response'); assert.equal(result.decisions, null);
    assert.deepEqual(result.citedEvidenceIds, []);
    assert.equal(result.failureReason, 'response_does_not_match_order_contract');
    assert.equal(readFileSync(join(run, 'response.txt'), 'utf8'), text);
    assert.deepEqual(readJson(join(run, 'result.json')), result);
  });
});

test('completed, rejected and interrupted run claims block overwrites, including a provider change', t => {
  const outputRoot = directory(t);
  for (const [runId, text] of [['completed', responseText], ['rejected', '{}']]) {
    const run = recordOfflineOrderRun({ provider: 'gemini', runId, outputRoot, responseText: text });
    const before = readFileSync(join(run.directory, 'result.json'), 'utf8');
    assert.throws(() => recordOfflineOrderRun({ provider: 'nebius', runId, outputRoot, responseText }), /already_claimed/);
    assert.equal(readFileSync(join(run.directory, 'result.json'), 'utf8'), before);
    assert.equal(readFileSync(join(run.directory, 'response.txt'), 'utf8'), text);
  }
  const interrupted = join(outputRoot, 'interrupted'); mkdirSync(interrupted);
  writeFileSync(join(interrupted, 'request.json'), 'incomplete request');
  assert.throws(() => recordOfflineOrderRun({ provider: 'gemini', runId: 'interrupted', outputRoot, responseText }), /already_claimed/);
  assert.deepEqual(readdirSync(interrupted), ['request.json']);
  assert.equal(readFileSync(join(interrupted, 'request.json'), 'utf8'), 'incomplete request');
});

test('unsafe IDs and oversized responses fail before creating a claim', t => {
  const outputRoot = directory(t);
  for (const runId of ['../escape', '.', 'a/b', 'a\\b', '', 'a'.repeat(65), undefined]) {
    assert.throws(() => recordOfflineOrderRun({ provider: 'gemini', runId, outputRoot, responseText }), /invalid_order_model_run_id/);
  }
  for (const text of ['x'.repeat(responseByteLimit + 1), '\u20ac'.repeat(responseByteLimit / 2), null]) {
    assert.throws(() => recordOfflineOrderRun({ provider: 'gemini', runId: 'big', outputRoot, responseText: text }), /invalid_order_model_response_size/);
  }
  assert.deepEqual(readdirSync(outputRoot), []);
});

test('offline command prepares either provider and requires a supplied response; it cannot start a live call', t => {
  const path = directory(t), scripts = join(path, 'scripts'), product = join(path, 'order-recovery');
  mkdirSync(scripts); mkdirSync(product); mkdirSync(join(product, 'worlds'));
  const files = ['scripts/run-order-model.mjs', 'order-recovery/model.mjs', 'order-recovery/world.mjs', 'order-recovery/worlds/razorpay-670.json'];
  for (const file of files) writeFileSync(join(path, file), readFileSync(new URL(`../${file}`, import.meta.url)));
  const cli = args => spawnSync(process.execPath, [join(scripts, 'run-order-model.mjs'), ...args], { cwd: path, encoding: 'utf8',
    env: { ...process.env, GEMINI_API_KEY: 'fixture-secret-gemini', NEBIUS_API_KEY: 'fixture-secret-nebius' } });
  for (const provider of ['gemini', 'nebius']) {
    const result = cli(['--provider', provider, '--prepare']);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), prepareOrderRequest(provider));
  }
  const missing = cli(['--provider', 'nebius']);
  assert.equal(missing.status, 1); assert.match(missing.stderr, /run_id_and_response_file_required/);
  const mixed = cli(['--provider', 'nebius', '--prepare', '--run-id', 'mixed']);
  assert.equal(mixed.status, 1); assert.match(mixed.stderr, /prepare_does_not_record_a_run/);
  const file = join(path, 'fixture.json'); writeFileSync(file, responseText);
  const args = ['--provider', 'nebius', '--run-id', 'cli-fixture', '--response-file', file];
  const run = cli(args); assert.equal(run.status, 0, run.stderr);
  const summary = JSON.parse(run.stdout);
  assert.equal(summary.source, 'offline_fixture'); assert.equal(summary.status, 'validated');
  assert.deepEqual(readJson(join(summary.directory, 'result.json')).decisions, decisions);
  assert.doesNotMatch(readFileSync(join(summary.directory, 'request.json'), 'utf8'), /fixture-secret/);
  const duplicate = cli(args); assert.equal(duplicate.status, 1); assert.match(duplicate.stderr, /already_claimed/);
  writeFileSync(file, '{}');
  const bad = cli(['--provider', 'gemini', '--run-id', 'bad-fixture', '--response-file', file]);
  assert.equal(bad.status, 1); assert.equal(JSON.parse(bad.stdout).status, 'invalid_response');
});
