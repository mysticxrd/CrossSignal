import { performance } from 'node:perf_hooks';
import { setTimeout as sleep } from 'node:timers/promises';
import { check } from './world.mjs';
import { generationLimits } from './model.mjs';

const nebius = 'https://api.tokenfactory.nebius.com/v1';
const contextCap = 1048576;
// Worst case for one send in micro-dollars: a full context at $0.30/M in plus the output cap at $1.20/M out.
export function maximumReservation(limit) {
  check(generationLimits.includes(limit), 'unsupported_generation_limit');
  return Math.ceil(contextCap * 0.3 + limit * 1.2);
}
// Strict structured output rejects uniqueItems; finishOrderRun still refuses duplicate citations.
function providerSchema(value) {
  if (Array.isArray(value)) return value.map(providerSchema);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'uniqueItems')
    .map(([key, item]) => [key, providerSchema(item)]));
}
export function orderWireRequest(request) {
  const outputCap = request.generationTokenLimit ?? 8192;
  maximumReservation(outputCap);
  return { endpoint: `${nebius}/chat/completions`, body: {
    model: request.requestedModel, messages: [{ role: 'user', content: JSON.stringify(request.common) }],
    store: false, stream: false, n: 1, service_tier: 'default', reasoning_effort: 'low', max_completion_tokens: outputCap,
    response_format: { type: 'json_schema', json_schema: { name: 'order_decisions', strict: true,
      schema: providerSchema(request.common.responseSchema) } },
  } };
}
export const validKey = key => typeof key === 'string' && key.length >= 16 && key.length <= 8192 && !/[\r\n]/.test(key);
const count = n => Number.isSafeInteger(n) && n >= 0;
export function inspectOrderUsage(raw, outputCap = 8192) {
  const u = raw.usage, input = u?.prompt_tokens, output = u?.completion_tokens;
  const reasoning = u?.completion_tokens_details?.reasoning_tokens ?? null;
  check(count(input) && count(output) && input > 0 && output > 0 && input <= contextCap && output <= outputCap
    && u.total_tokens === input + output && (reasoning === null || (count(reasoning) && reasoning <= output)),
  'provider_usage_uncheckable');
  return { inputTokens: input, outputTokens: output, reasoningTokens: reasoning };
}
export function inspectOrderResponse(raw, requestedModel, outputCap = 8192) {
  check(raw.choices?.length === 1, 'provider_candidate_mismatch');
  const choice = raw.choices[0];
  check(choice.finish_reason === 'stop' && !choice.message?.tool_calls && !choice.message?.refusal, 'incomplete_provider_output');
  const text = choice.message?.content;
  check(typeof text === 'string', 'invalid_provider_text');
  const usage = inspectOrderUsage(raw, outputCap);
  check(raw.model === requestedModel, 'provider_model_mismatch');
  const requestId = typeof raw.id === 'string' && /^[a-zA-Z0-9._:/-]{1,160}$/.test(raw.id) ? raw.id : null;
  return { text, modelVersion: raw.model, requestId, usage, unavailableReason: null };
}
function redacted(text, key) {
  try {
    const normalized = JSON.stringify(JSON.parse(text));
    if (normalized.includes(key)) return normalized.replaceAll(key, '[REDACTED_API_KEY]');
  } catch { /* Keep non-JSON error bodies. */ }
  return text.replaceAll(key, '[REDACTED_API_KEY]');
}
export async function generateOrderResponse({ request, wire, key, budget, runId, write,
  fetchImpl = globalThis.fetch, log = console.error, timeoutMs = 180000, wait = sleep }) {
  check(validKey(key), 'provider_key_unavailable');
  const controller = new AbortController(), outputCap = wire.body.max_completion_tokens;
  const timer = setTimeout(() => controller.abort(), timeoutMs), signal = controller.signal;
  const aborted = new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('request_timeout')), { once: true }));
  let lastAttempt = null;
  const work = async () => {
    async function http(endpoint, body, meter = false) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        signal.throwIfAborted();
        const reservedMicros = maximumReservation(outputCap), attemptStarted = performance.now();
        if (meter) {
          budget.reserve(runId, attempt, reservedMicros); lastAttempt = attempt;
          write(`generation-attempt-${attempt}.json`, JSON.stringify({ attempt, generationTokenLimit: outputCap,
            reservedMicros, startedAt: new Date().toISOString() }));
        }
        const response = await fetchImpl(endpoint, { method: body ? 'POST' : 'GET', redirect: 'error', signal,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          ...(body ? { body: JSON.stringify(body) } : {}) });
        signal.throwIfAborted();
        const reader = response.body.getReader(), chunks = []; let size = 0;
        const cancel = () => { reader.cancel().catch(() => {}); }; signal.addEventListener('abort', cancel, { once: true });
        try {
          for (;;) {
            const { value, done } = await reader.read(); if (done) break;
            size += value.byteLength; check(size <= 1000000, 'provider_response_size_limit'); chunks.push(value); signal.throwIfAborted();
          }
        } finally { signal.removeEventListener('abort', cancel); cancel(); }
        const text = Buffer.concat(chunks).toString('utf8'); signal.throwIfAborted();
        if (meter) write(`generation-received-${attempt}.json`, JSON.stringify({ attempt, generationTokenLimit: outputCap,
          httpStatus: response.status, elapsedMs: performance.now() - attemptStarted }));
        if (response.ok) {
          check(!redacted(text, key).includes('[REDACTED_API_KEY]'), 'provider_secret_echo');
          try { return JSON.parse(text); }
          catch { write('malformed-provider.txt', redacted(text, key)); throw new Error('invalid_provider_json'); }
        }
        const diagnostic = redacted(text, key);
        write(`${meter ? 'generation' : 'catalog'}-error-${attempt}.txt`, `HTTP ${response.status}\n${diagnostic}`);
        log(`${request.provider} HTTP ${response.status}\n${diagnostic}`);
        // The loop ends here: any status outside 429/500/503/504, or the third attempt.
        if (![429, 500, 503, 504].includes(response.status) || attempt === 3) throw new Error('provider_http_failure');
        // Capped: a longer Retry-After would outlast the deadline and report request_timeout instead of the HTTP status.
        const delay = Math.min(Number(response.headers.get('retry-after')) * 1000 || 2000 * 2 ** (attempt - 1), 30000);
        check(Number.isFinite(delay) && delay >= 0, 'invalid_retry_delay'); await wait(delay, undefined, { signal });
      }
    }
    // The price check guards the reservation formula above: a changed price stops before any paid request.
    const catalog = await http(`${nebius}/models?verbose=true`, null);
    const model = catalog.data?.find(m => m.id === request.requestedModel), pricing = model?.pricing ?? {};
    const cacheRead = Number(pricing.input_cache_read ?? 0);
    check(model?.context_length === contextCap && pricing.prompt === '0.0000003' && pricing.completion === '0.0000012'
      && cacheRead >= 0 && cacheRead <= 0.0000003
      && Object.entries(pricing).every(([name, price]) => ['prompt', 'completion', 'input_cache_read'].includes(name)
        || Number(price) === 0), 'nebius_catalog_or_price_changed');
    write('catalog.json', JSON.stringify({ id: model.id, contextTokens: model.context_length, pricing }));
    const raw = await http(wire.endpoint, wire.body, true);
    write('provider-response.json', JSON.stringify(raw, (name, value) => name === 'reasoning_content' ? undefined : value));
    const result = inspectOrderResponse(raw, request.requestedModel, outputCap);
    return { ...result, attempt: lastAttempt,
      estimatedCostUsd: Math.ceil(result.usage.inputTokens * 0.3 + result.usage.outputTokens * 1.2) / 1000000 };
  };
  try { return await Promise.race([work(), aborted]); }
  finally { clearTimeout(timer); controller.abort(); }
}
