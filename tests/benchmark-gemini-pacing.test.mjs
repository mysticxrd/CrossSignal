import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import test from 'node:test';
import { CUTOFF, START } from '../db/benchmark/contracts.mjs';
import { GEMINI } from '../db/benchmark/gemini-config.mjs';
import { prepareGemini } from '../db/benchmark/gemini-context.mjs';
import { createHttpTransport, createRequestPacer } from '../db/benchmark/gemini-http.mjs';

// Offline only: every fetch below is a stub, so no request leaves this process.
const secret = 'OFFLINE_SECRET_KEY_CANARY_ONLY';
const folder = 'factory/02_data/benchmark/observable';
const input = JSON.parse(readFileSync(`${folder}/${readdirSync(folder).sort()[0]}`, 'utf8'));
const scope = { workspaceId: input.events[0].workspaceId, caseId: input.caseRef, runId: input.events[0].runId,
  actorId: 'a_123456789abc', start: START, clock: CUTOFF };
const metadata = JSON.stringify({ name: `models/${GEMINI.model}`, supportedGenerationMethods: ['generateContent'],
  inputTokenLimit: 1_048_576, outputTokenLimit: 65_536 });
const quota = JSON.stringify({ error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'Quota exceeded.',
  details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '0.001s' }] } });

test('each request takes the next start slot, at least 4.5 s after the one before, even when callers overlap', async () => {
  let clock = 0;
  const waits = [], pace = createRequestPacer({ now: () => clock, wait: async ms => { waits.push(ms); } });
  assert.equal(GEMINI.requestGapMs, 4500);
  assert.equal(await pace(), 0);
  clock = 1000; assert.equal(await pace(), 3500);
  clock = 20_000; assert.equal(await pace(), 0);
  assert.deepEqual(await Promise.all([pace(), pace()]), [4500, 9000]);
  assert.deepEqual(waits, [3500, 4500, 9000]);
});

test('back-to-back requests never start more than 14 times in any 60 s window', async () => {
  let clock = 0;
  const starts = [], pace = createRequestPacer({ now: () => clock, wait: async ms => { clock += ms; } });
  for (let i = 0; i < 40; i++) { await pace(); starts.push(clock); clock += 250; }
  const busiest = Math.max(...starts.map(start => starts.filter(t => t >= start && t < start + 60_000).length));
  assert.equal(busiest, 14);
});

test('an abort ends a pacing wait at once', async () => {
  const pace = createRequestPacer({ gapMs: 60_000 }), abort = new AbortController();
  await pace(abort.signal);
  const waiting = pace(abort.signal);
  abort.abort();
  await assert.rejects(waiting, { name: 'AbortError' });
});

test('a transport paces every request it sends, token counts and retries included', async () => {
  const order = [];
  const pace = async signal => { assert(signal instanceof AbortSignal && !signal.aborted); order.push('pace'); return 1000; };
  let generations = 0;
  const transport = createHttpTransport({ mode: 'OFFLINE_FIXTURE', keySource: () => secret, log: () => {}, pace,
    fetchImpl: async url => {
      order.push(url.slice(url.lastIndexOf(':') + 1));
      if (url.endsWith(':countTokens')) return new Response(JSON.stringify({ totalTokens: 1000 }));
      return ++generations === 1 ? new Response(quota, { status: 429 }) : new Response(JSON.stringify({ candidates: [] }));
    } });
  const prepared = prepareGemini(input, scope);
  await transport.count(prepared, performance.now() + 5000);
  await transport.generate(prepared, { requestSha256: prepared.requestSha256, outputReservation: 1024,
    deadlineMonotonicMs: performance.now() + 5000 });
  assert.deepEqual(order, ['pace', 'countTokens', 'pace', 'countTokens', 'pace', 'generateContent', 'pace', 'generateContent']);
  const counters = transport.counters();
  assert.equal(counters.automaticRetries, 1);
  assert.equal(counters.pacingWaitMs, 4000);
});

test('a pacing wait counts against the request deadline, and a request that would start late is never sent', async () => {
  let calls = 0;
  const transport = createHttpTransport({ mode: 'OFFLINE_FIXTURE', keySource: () => secret, log: () => {},
    pace: createRequestPacer({ gapMs: 60_000 }), fetchImpl: async () => { calls++; return new Response(metadata); } });
  await transport.modelMetadata(performance.now() + 1000);
  await assert.rejects(transport.modelMetadata(performance.now() + 50), /^Error: request_timeout$/);
  assert.equal(calls, 1);
});

test('a free-tier transport cannot run unpaced; offline fixtures wait for nothing', () => {
  const options = { mode: 'FREE_TIER_BENCHMARK', keySource: () => secret, beforeRequest: async () => {},
    fetchImpl: async () => { throw new Error('must not dispatch'); } };
  for (const pace of [null, 4500, 'slow']) assert.throws(() => createHttpTransport({ ...options, pace }), /free_tier_pacing_required/);
  assert.equal(createHttpTransport(options).counters().pacingWaitMs, 0);
  assert.equal(createHttpTransport({ ...options, mode: 'OFFLINE_FIXTURE' }).counters().pacingWaitMs, 0);
});

test('free-tier transports share one request clock, so the next run waits for the last run\'s slot', async () => {
  const starts = [];
  const transport = () => createHttpTransport({ mode: 'FREE_TIER_BENCHMARK', keySource: () => secret, log: () => {},
    beforeRequest: async () => {}, fetchImpl: async () => { starts.push(performance.now()); return new Response(metadata); } });
  const first = transport(), second = transport();
  await first.modelMetadata(performance.now() + 10_000);
  await second.modelMetadata(performance.now() + 10_000);
  assert.equal(first.counters().pacingWaitMs, 0);
  // Timers may fire a millisecond early; the slot itself is exactly 4.5 s after the first start.
  assert(starts[1] - starts[0] >= GEMINI.requestGapMs - 10, `second request started ${starts[1] - starts[0]} ms after the first`);
  assert(second.counters().pacingWaitMs >= GEMINI.requestGapMs - 100);
});
