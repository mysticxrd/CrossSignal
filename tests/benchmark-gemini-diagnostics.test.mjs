import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import test from 'node:test';
import { ERROR_BYTES, readDiagnostic, sanitizeDiagnostic } from '../db/benchmark/gemini-diagnostics.mjs';
import { createHttpTransport } from '../db/benchmark/gemini-http.mjs';
import { GEMINI } from '../db/benchmark/gemini-config.mjs';
import { CUTOFF, START, digest } from '../db/benchmark/contracts.mjs';
import { runGeminiInvestigation } from '../db/benchmark/gemini-runner.mjs';
import { GeminiStore } from '../db/benchmark/gemini-store.mjs';

const secret = 'OFFLINE_SECRET_KEY_CANARY_ONLY';
const prompt = 'SYNTHETIC_PROMPT_CANARY', truth = 'SYNTHETIC_TRUTH_CANARY';
const body = { systemInstruction: { parts: [{ text: prompt }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }],
  generationConfig: { candidateCount: 1, maxOutputTokens: 1024, temperature: 1, responseModalities: ['TEXT'],
    thinkingConfig: { thinkingLevel: 'MINIMAL', includeThoughts: false },
    responseFormat: { text: { mimeType: 'APPLICATION_JSON', schema: { type: 'object' } } } } };
const prepared = { provider: 'gemini', endpoint: GEMINI.endpoint, body, requestSha256: digest(body) };
const lease = () => ({ requestSha256: prepared.requestSha256, outputReservation: 1024, deadlineMonotonicMs: performance.now() + 1000 });
const errorBytes = (message, extra = {}) => Buffer.from(JSON.stringify({ error: { code: 400, status: 'INVALID_ARGUMENT', message, ...extra } }));
const options = { httpStatus: 400, requestBody: body, secret };
const noSensitiveText = value => {
  for (const canary of [secret, prompt, truth]) assert(!JSON.stringify(value).includes(canary));
};

test('diagnostics retain only fixed status, field names and unconfirmed categories', () => {
  const bytes = errorBytes(`Unknown field ${prompt} ${truth}`, { details: [{ '@type': 'type.googleapis.com/google.rpc.BadRequest',
    fieldViolations: [{ field: 'generation_config.response_format.text.schema.properties.SYNTHETIC_TRUTH_CANARY', description: truth },
      { field: 'contents[0].parts[0].text', description: prompt }, { field: truth, description: truth }] }],
    requestBody: body, credential: 'PRIVATE_OTHER_CREDENTIAL', evaluator: truth });
  const result = sanitizeDiagnostic(bytes, options);
  assert.equal(result.providerStatus, 'INVALID_ARGUMENT'); assert.equal(result.providerCode, 400);
  assert.deepEqual(result.fields, ['contents', 'generationConfig.responseFormat.text.schema']);
  assert.equal(result.messageClassification, 'unknown_parameter');
  assert.equal(result.classificationIsConfirmedCause, false);
  assert.equal(result.rawBodyRetained, false); assert.equal(result.providerProseRetained, false);
  noSensitiveText(result); assert(!JSON.stringify(result).includes('PRIVATE_OTHER_CREDENTIAL'));
});

test('malformed, oversized, secret-echo and arbitrary diagnostic values fail closed', () => {
  for (const [bytes, reason] of [[null, 'stream_unavailable'], [Buffer.from('not JSON'), 'invalid_error_json'],
    [new Uint8Array(ERROR_BYTES + 1), 'error_body_limit'], [errorBytes(secret), 'secret_echo_discarded'],
    [Buffer.from('{"error":[]}'), 'unrecognized_error_shape']]) {
    const result = sanitizeDiagnostic(bytes, options);
    assert.equal(result.bodyUnavailableReason, reason); noSensitiveText(result);
  }
  const result = sanitizeDiagnostic(errorBytes('x', { code: prompt, status: truth }), { ...options, httpStatus: secret });
  assert.equal(result.httpStatus, null); assert.equal(result.providerCode, null); assert.equal(result.providerStatus, null);
  noSensitiveText(result);
  assert.equal(sanitizeDiagnostic(errorBytes(`Unknown field ${'.'.repeat(2100)}`), options).messageClassification, 'unclassified');
});

test('all diagnostic classifications remain hypotheses and discard source prose', () => {
  for (const [message, category] of [['Schema is too complex for serving', 'schema_complexity'],
    ['Unsupported schema keyword', 'schema_keyword_rejected'], ['Thinking configuration not supported', 'thinking_configuration_rejected'],
    ['maxOutputTokens exceeds supported maximum', 'output_limit_rejected'], ['An unexplained rejection', 'unclassified']]) {
    const result = sanitizeDiagnostic(errorBytes(message), options);
    assert.equal(result.messageClassification, category); assert.equal(result.classificationIsConfirmedCause, false);
    assert(!JSON.stringify(result).includes(message));
  }
});

test('stream capture bounds bytes, cancels the reader and is abortable without network', async () => {
  let cancelled = false;
  const large = new Response(new ReadableStream({ start(controller) {
    controller.enqueue(new Uint8Array(ERROR_BYTES)); controller.enqueue(new Uint8Array(1));
  }, cancel() { cancelled = true; } }), { status: 400 });
  assert.equal((await readDiagnostic(large, { ...options, signal: new AbortController().signal })).bodyUnavailableReason, 'error_body_limit');
  assert.equal(cancelled, true);
  const failed = new Response(new ReadableStream({ start(controller) { controller.error(new Error(prompt)); } }), { status: 400 });
  const failure = await readDiagnostic(failed, { ...options, signal: new AbortController().signal });
  assert.equal(failure.bodyUnavailableReason, 'error_stream_failure'); noSensitiveText(failure);
  const abort = new AbortController(), stalled = new Response(new ReadableStream(), { status: 400 });
  const reading = readDiagnostic(stalled, { ...options, signal: abort.signal });
  abort.abort(); await assert.rejects(reading, /request_timeout/);
});

test('HTTP error handling records one bounded failure and stops every later operation with zero retries', async () => {
  let calls = 0;
  const transport = createHttpTransport({ mode: 'OFFLINE_FIXTURE', keySource: () => secret,
    fetchImpl: async () => { calls++; return new Response(errorBytes('Schema is too complex for serving'), { status: 400 }); } });
  await assert.rejects(transport.generate(prepared, lease()), /^Error: http_failure$/);
  const counters = transport.counters();
  assert.equal(counters.generationCalls, 1); assert.equal(counters.automaticRetries, 0);
  assert.equal(counters.lastFailureDiagnostic.messageClassification, 'schema_complexity'); noSensitiveText(counters);
  await assert.rejects(transport.generate(prepared, lease()), /transport_concurrency_or_terminal/);
  await assert.rejects(transport.modelMetadata(performance.now() + 1000), /transport_concurrency_or_terminal/);
  await assert.rejects(transport.count(prepared, performance.now() + 1000), /transport_concurrency_or_terminal/);
  assert.equal(calls, 1);
});

test('a stalled error stream uses the original deadline and cannot trigger a retry', async () => {
  let calls = 0;
  const transport = createHttpTransport({ mode: 'OFFLINE_FIXTURE', keySource: () => secret,
    fetchImpl: async () => { calls++; return new Response(new ReadableStream(), { status: 400 }); } });
  await assert.rejects(transport.generate(prepared, { ...lease(), deadlineMonotonicMs: performance.now() + 250 }), /request_timeout/);
  assert.equal(calls, 1); assert.equal(transport.counters().automaticRetries, 0); noSensitiveText(transport.counters());
  await assert.rejects(transport.generate(prepared, lease()), /transport_concurrency_or_terminal/);
  assert.equal(calls, 1);
});

test('synthetic HTTP 400 preserves indeterminate usage and a consumed temporary Case claim', async () => {
  const root = await mkdtemp(join(tmpdir(), 'b01-diagnostic-case-'));
  let store;
  try {
    const sources = new URL('../factory/02_data/benchmark/observable/', import.meta.url);
    const source = (await readdir(sources)).sort()[0], observable = JSON.parse(await readFile(new URL(source, sources), 'utf8'));
    const scope = { workspaceId: observable.events[0].workspaceId, caseId: observable.caseRef,
      runId: observable.events[0].runId, actorId: 'a_123456789abc', start: START, clock: CUTOFF };
    store = new GeminiStore(join(root, 'case.sqlite'), { metadata: { scope, method: 'single-shot-model', truthMode: 'SIMULATED' }, observable });
    let generations = 0;
    const transport = createHttpTransport({ mode: 'OFFLINE_FIXTURE', keySource: () => secret, fetchImpl: async url => {
      if (url.endsWith(':countTokens')) return new Response('{"totalTokens":100}');
      generations++; return new Response(errorBytes(`Unknown parameter ${prompt} ${truth}`), { status: 400 });
    } });
    const result = await runGeminiInvestigation({ observable, scope, method: 'single-shot-model', store, transport });
    assert.equal(result.terminalStatus, 'indeterminate_usage'); assert.equal(result.failureReason, 'http_failure');
    assert.equal(result.finding, null); assert.equal(result.modelVersion, null);
    assert.equal(result.budget.records.length, 1); assert.equal(result.budget.records[0].generatedTokens, null);
    assert.equal(result.budget.terminalStatus, 'indeterminate_usage'); assert.equal(generations, 1);
    assert.equal(result.transport.automaticRetries, 0); assert.equal(result.runtimeEffects, 0); noSensitiveText(result);
    await assert.rejects(runGeminiInvestigation({ observable, scope, method: 'single-shot-model', store, transport }), /already|claimed|claim/);
    assert.equal(generations, 1);
  } finally {
    store?.close();
    assert.equal(dirname(resolve(root)), resolve(tmpdir()));
    assert.ok(root.startsWith(join(tmpdir(), 'b01-diagnostic-case-')));
    await rm(root, { recursive: true });
  }
});
