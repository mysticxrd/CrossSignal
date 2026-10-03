import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import test from 'node:test';
import { ERROR_BYTES, REDACTED_KEY, describeError, formatDiagnostic, readDiagnostic, retryDelayMs } from '../db/benchmark/gemini-diagnostics.mjs';
import { createHttpTransport } from '../db/benchmark/gemini-http.mjs';
import { GEMINI } from '../db/benchmark/gemini-config.mjs';
import { CUTOFF, START, digest } from '../db/benchmark/contracts.mjs';
import { runGeminiInvestigation } from '../db/benchmark/gemini-runner.mjs';
import { GeminiStore } from '../db/benchmark/gemini-store.mjs';

const secret = 'OFFLINE_SECRET_KEY_CANARY_ONLY';
const prompt = 'SYNTHETIC_PROMPT_CANARY';
const body = { systemInstruction: { parts: [{ text: prompt }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }],
  generationConfig: { candidateCount: 1, maxOutputTokens: 1024, temperature: 1, responseModalities: ['TEXT'],
    thinkingConfig: { thinkingLevel: 'MINIMAL', includeThoughts: false },
    responseFormat: { text: { mimeType: 'APPLICATION_JSON', schema: { type: 'object' } } } } };
const prepared = { provider: 'gemini', endpoint: GEMINI.endpoint, body, requestSha256: digest(body) };
const lease = () => ({ requestSha256: prepared.requestSha256, outputReservation: 1024, deadlineMonotonicMs: performance.now() + 1000 });
const errorBytes = (message, extra = {}, code = 400, status = 'INVALID_ARGUMENT') =>
  Buffer.from(JSON.stringify({ error: { code, status, message, ...extra } }));
const retryInfo = retryDelay => ({ details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay }] });
const noKey = value => assert(!JSON.stringify(value).includes(secret));
const capture = () => { const lines = []; return { lines, log: line => lines.push(line) }; };

test('diagnostics keep the complete provider error and hide only the API key', () => {
  const details = [{ '@type': 'type.googleapis.com/google.rpc.BadRequest',
    fieldViolations: [{ field: 'generation_config.response_format', description: `Unknown name ${prompt}` }] }];
  const bytes = errorBytes(`Invalid JSON payload received. key=${secret}`, { details });
  const result = describeError(bytes, { httpStatus: 400, secret });
  assert.equal(result.body, bytes.toString('utf8').replace(secret, REDACTED_KEY));
  assert.equal(result.providerStatus, 'INVALID_ARGUMENT');
  assert.equal(result.message, `Invalid JSON payload received. key=${REDACTED_KEY}`);
  assert.deepEqual(JSON.parse(result.body).error.details, details);
  assert.equal(result.truncated, false); noKey(result);
  const printed = formatDiagnostic('generateContent', result);
  assert.equal(printed, `Gemini generateContent failed: HTTP 400 INVALID_ARGUMENT\n${result.body}`);
  assert(printed.includes(prompt)); noKey(printed);
});

test('non-JSON bodies stay verbatim and a missing body says why', () => {
  const html = describeError(Buffer.from(`<html>502 Bad Gateway ${secret}</html>`), { httpStatus: 502, secret });
  assert.equal(html.body, `<html>502 Bad Gateway ${REDACTED_KEY}</html>`);
  assert.equal(html.providerStatus, null); assert.equal(html.message, null);
  const missing = describeError(null, { httpStatus: 400, secret });
  assert.equal(missing.body, null); assert.equal(missing.bodyUnavailableReason, 'stream_unavailable');
  assert.equal(formatDiagnostic('countTokens', missing), 'Gemini countTokens failed: HTTP 400\n(no response body: stream_unavailable)');
});

test('RetryInfo delays are read in milliseconds and absent delays are null', () => {
  const quota = (delay, status = 429) => describeError(errorBytes('Quota exceeded', retryInfo(delay), status, 'RESOURCE_EXHAUSTED'), { httpStatus: status });
  assert.equal(retryDelayMs(quota('37s')), 37_000);
  assert.equal(retryDelayMs(quota('1.5s')), 1500);
  assert.equal(retryDelayMs(quota('soon')), null);
  assert.equal(retryDelayMs(describeError(Buffer.from('not JSON'), { httpStatus: 503 })), null);
  assert.equal(retryDelayMs(describeError(null, { httpStatus: 503 })), null);
});

test('stream capture truncates huge bodies without a split key, cancels the reader and is abortable', async () => {
  let cancelled = false;
  const head = Buffer.alloc(ERROR_BYTES - 5, 'a');
  const large = new Response(new ReadableStream({ start(controller) {
    controller.enqueue(head); controller.enqueue(Buffer.from(secret)); controller.enqueue(new Uint8Array(1));
  }, cancel() { cancelled = true; } }), { status: 400 });
  const result = await readDiagnostic(large, { secret, signal: new AbortController().signal });
  assert.equal(result.truncated, true); assert.equal(result.body, head.toString('utf8')); noKey(result);
  assert.match(formatDiagnostic('generateContent', result), /body truncated at 1000000 bytes/);
  assert.equal(cancelled, true);
  const failed = new Response(new ReadableStream({ start(controller) { controller.error(new Error(`socket reset ${secret}`)); } }), { status: 400 });
  const failure = await readDiagnostic(failed, { secret, signal: new AbortController().signal });
  assert.equal(failure.body, null); assert.equal(failure.bodyUnavailableReason, `error_stream_failure: socket reset ${REDACTED_KEY}`);
  const abort = new AbortController(), stalled = new Response(new ReadableStream(), { status: 400 });
  const reading = readDiagnostic(stalled, { secret, signal: abort.signal });
  abort.abort(); await assert.rejects(reading, /request_timeout/);
});

test('an HTTP 400 is printed in full, never retried, and stops every later operation', async () => {
  let calls = 0;
  const { lines, log } = capture();
  const message = 'Invalid JSON payload received. Unknown name "responseFormat" at \'generation_config\': Cannot find field.';
  const transport = createHttpTransport({ mode: 'OFFLINE_FIXTURE', keySource: () => secret, log,
    fetchImpl: async () => { calls++; return new Response(errorBytes(`${message} ${secret}`), { status: 400 }); } });
  await assert.rejects(transport.generate(prepared, lease()), /^Error: http_failure$/);
  const counters = transport.counters();
  assert.equal(counters.generationCalls, 1); assert.equal(counters.automaticRetries, 0);
  assert.deepEqual(counters.lastFailure, { operation: 'generateContent', httpStatus: 400 });
  assert.equal(counters.lastFailureDiagnostic.message, `${message} ${REDACTED_KEY}`); noKey(counters);
  assert.deepEqual(lines, [`Gemini generateContent failed: HTTP 400 INVALID_ARGUMENT\n${counters.lastFailureDiagnostic.body}`]);
  assert.equal(JSON.parse(counters.lastFailureDiagnostic.body).error.message, `${message} ${REDACTED_KEY}`); noKey(lines);
  await assert.rejects(transport.generate(prepared, lease()), /transport_concurrency_or_terminal/);
  await assert.rejects(transport.modelMetadata(performance.now() + 1000), /transport_concurrency_or_terminal/);
  await assert.rejects(transport.count(prepared, performance.now() + 1000), /transport_concurrency_or_terminal/);
  assert.equal(calls, 1);
});

test('a 429 waits for the provider RetryInfo delay, retries once and succeeds', async () => {
  let calls = 0;
  const { lines, log } = capture();
  const quota = errorBytes('Resource has been exhausted (e.g. check quota).', retryInfo('0.05s'), 429, 'RESOURCE_EXHAUSTED');
  const transport = createHttpTransport({ mode: 'OFFLINE_FIXTURE', keySource: () => secret, log, fetchImpl: async () =>
    ++calls === 1 ? new Response(quota, { status: 429 }) : new Response(JSON.stringify({ candidates: [] })) });
  const started = performance.now();
  const { data } = await transport.generate(prepared, lease());
  assert.deepEqual(data, { candidates: [] }); assert(performance.now() - started >= 40);
  const counters = transport.counters();
  assert.equal(calls, 2); assert.equal(counters.generationCalls, 2); assert.equal(counters.generationAttempts, 1);
  assert.equal(counters.automaticRetries, 1); assert.equal(counters.lastFailure, null);
  assert.match(lines[0], /^Gemini generateContent failed: HTTP 429 RESOURCE_EXHAUSTED\n/);
  assert.equal(lines[1], `Retrying Gemini generateContent in 50 ms (retry 1 of ${GEMINI.maxRetries}).`);
});

test('retries stop at the request deadline and at the retry limit, keeping the last full error', async () => {
  let calls = 0;
  const { lines, log } = capture();
  const overloaded = createHttpTransport({ mode: 'OFFLINE_FIXTURE', keySource: () => secret, log, fetchImpl: async () => {
    calls++; return new Response(errorBytes('The model is overloaded.', {}, 503, 'UNAVAILABLE'), { status: 503 }); } });
  // The first 2 s backoff would outlive this 1 s lease, so the failure is final at once.
  await assert.rejects(overloaded.generate(prepared, lease()), /^Error: http_failure$/);
  assert.equal(calls, 1); assert.equal(overloaded.counters().automaticRetries, 0); assert.equal(lines.length, 1);
  assert.deepEqual(overloaded.counters().lastFailure, { operation: 'generateContent', httpStatus: 503 });
  let quotaCalls = 0;
  const limited = createHttpTransport({ mode: 'OFFLINE_FIXTURE', keySource: () => secret, log: () => {}, fetchImpl: async () => {
    quotaCalls++; return new Response(errorBytes('Quota exceeded', retryInfo('0.001s'), 429, 'RESOURCE_EXHAUSTED'), { status: 429 }); } });
  await assert.rejects(limited.generate(prepared, lease()), /^Error: http_failure$/);
  assert.equal(quotaCalls, GEMINI.maxRetries + 1); assert.equal(limited.counters().automaticRetries, GEMINI.maxRetries);
  assert.equal(limited.counters().lastFailureDiagnostic.providerStatus, 'RESOURCE_EXHAUSTED');
});

test('network failures are printed with their cause and the key redacted', async () => {
  const { lines, log } = capture();
  const transport = createHttpTransport({ mode: 'OFFLINE_FIXTURE', keySource: () => secret, log, fetchImpl: async () => {
    throw new TypeError('fetch failed', { cause: new Error(`getaddrinfo ENOTFOUND ${secret}`) }); } });
  await assert.rejects(transport.generate(prepared, lease()), /^Error: transport_failure$/);
  assert.deepEqual(lines, [`Gemini generateContent failed: TypeError: fetch failed (cause: getaddrinfo ENOTFOUND ${REDACTED_KEY})`]);
});

test('a stalled error stream uses the original deadline and cannot trigger a retry', async () => {
  let calls = 0;
  const transport = createHttpTransport({ mode: 'OFFLINE_FIXTURE', keySource: () => secret, log: () => {},
    fetchImpl: async () => { calls++; return new Response(new ReadableStream(), { status: 503 }); } });
  await assert.rejects(transport.generate(prepared, { ...lease(), deadlineMonotonicMs: performance.now() + 250 }), /request_timeout/);
  assert.equal(calls, 1); assert.equal(transport.counters().automaticRetries, 0); noKey(transport.counters());
  await assert.rejects(transport.generate(prepared, lease()), /transport_concurrency_or_terminal/);
  assert.equal(calls, 1);
});

test('synthetic HTTP 400 preserves indeterminate usage, the full error and a consumed temporary Case claim', async () => {
  const root = await mkdtemp(join(tmpdir(), 'b01-diagnostic-case-'));
  let store;
  try {
    const sources = new URL('../factory/02_data/benchmark/observable/', import.meta.url);
    const source = (await readdir(sources)).sort()[0], observable = JSON.parse(await readFile(new URL(source, sources), 'utf8'));
    const scope = { workspaceId: observable.events[0].workspaceId, caseId: observable.caseRef,
      runId: observable.events[0].runId, actorId: 'a_123456789abc', start: START, clock: CUTOFF };
    store = new GeminiStore(join(root, 'case.sqlite'), { metadata: { scope, method: 'single-shot-model', truthMode: 'SIMULATED' }, observable });
    let generations = 0;
    const transport = createHttpTransport({ mode: 'OFFLINE_FIXTURE', keySource: () => secret, log: () => {}, fetchImpl: async url => {
      if (url.endsWith(':countTokens')) return new Response('{"totalTokens":100}');
      generations++; return new Response(errorBytes(`Unknown parameter ${prompt} ${secret}`), { status: 400 });
    } });
    const result = await runGeminiInvestigation({ observable, scope, method: 'single-shot-model', store, transport });
    assert.equal(result.terminalStatus, 'indeterminate_usage'); assert.equal(result.failureReason, 'http_failure');
    assert.equal(result.finding, null); assert.equal(result.modelVersion, null);
    assert.equal(result.budget.records.length, 1); assert.equal(result.budget.records[0].generatedTokens, null);
    assert.equal(result.budget.terminalStatus, 'indeterminate_usage'); assert.equal(generations, 1);
    assert.equal(result.transport.lastFailureDiagnostic.message, `Unknown parameter ${prompt} ${REDACTED_KEY}`);
    assert.equal(result.transport.automaticRetries, 0); assert.equal(result.runtimeEffects, 0); noKey(result);
    await assert.rejects(runGeminiInvestigation({ observable, scope, method: 'single-shot-model', store, transport }), /already|claimed|claim/);
    assert.equal(generations, 1);
  } finally {
    store?.close();
    assert.equal(dirname(resolve(root)), resolve(tmpdir()));
    assert.ok(root.startsWith(join(tmpdir(), 'b01-diagnostic-case-')));
    await rm(root, { recursive: true });
  }
});
