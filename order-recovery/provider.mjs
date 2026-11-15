import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { setTimeout as sleep } from 'node:timers/promises';
import { check } from './world.mjs';

const nebius = 'https://api.tokenfactory.nebius.com/v1';
const outputCap = 8192, contextCap = 1048576;
let nextGeminiStart = 0;
async function pace(signal) {
  const now = performance.now(), start = Math.max(now, nextGeminiStart); nextGeminiStart = start + 4500;
  if (start > now) await sleep(start - now, undefined, { signal });
}
function providerSchema(value, provider) {
  if (Array.isArray(value)) return value.map(item => providerSchema(item, provider));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).flatMap(([key, item]) => key === 'const' && provider === 'gemini' ? [['enum', [item]], ['type', 'string']]
    : key === 'uniqueItems' || (key === 'maxItems' && provider === 'gemini') ? [] : [[key, providerSchema(item, provider)]]));
}
export function orderWireRequest(request) {
  const text = JSON.stringify(request.common), schema = request.common.responseSchema;
  return request.provider === 'nebius' ? { endpoint: `${nebius}/chat/completions`, body: {
    model: request.requestedModel, messages: [{ role: 'user', content: text }], store: false, stream: false, n: 1,
    service_tier: 'default', reasoning_effort: 'low', max_completion_tokens: outputCap,
    response_format: { type: 'json_schema', json_schema: { name: 'order_decisions', strict: true, schema: providerSchema(schema, 'nebius') } },
  } } : { endpoint: `https://generativelanguage.googleapis.com/v1beta/models/${request.requestedModel}:generateContent`, body: {
    contents: [{ role: 'user', parts: [{ text }] }], generationConfig: { candidateCount: 1, temperature: 1,
      maxOutputTokens: outputCap, responseModalities: ['TEXT'], thinkingConfig: { thinkingLevel: 'LOW', includeThoughts: false },
      responseFormat: { text: { mimeType: 'APPLICATION_JSON', schema: providerSchema(schema, 'gemini') } } },
  } };
}
const count = n => Number.isSafeInteger(n) && n >= 0;
export function inspectOrderResponse(provider, raw, requestedModel) {
  const g = provider === 'gemini', choice = g ? raw.candidates?.[0] : raw.choices?.[0];
  check((g ? raw.candidates : raw.choices)?.length === 1, 'provider_candidate_mismatch');
  check((g ? choice.finishReason === 'STOP' : choice.finish_reason === 'stop') && !choice.message?.tool_calls
    && !choice.message?.refusal && !raw.promptFeedback?.blockReason, 'incomplete_provider_output');
  const parts = g ? choice.content?.parts : null;
  if (g) check(Array.isArray(parts) && parts.every(p => p && (p.thought === true || (typeof p.text === 'string'
    && Object.keys(p).every(k => ['text', 'thought', 'thoughtSignature'].includes(k))))), 'invalid_provider_text');
  const text = g ? parts.filter(p => p.thought !== true).map(p => p.text).join('') : choice.message?.content;
  check(typeof text === 'string', 'invalid_provider_text');
  const u = g ? raw.usageMetadata : raw.usage, input = g ? u?.promptTokenCount : u?.prompt_tokens;
  const reasoning = g ? (u?.thoughtsTokenCount ?? (u?.totalTokenCount === input + u?.candidatesTokenCount ? 0 : null))
    : (u?.completion_tokens_details?.reasoning_tokens ?? null);
  const output = g && count(u?.candidatesTokenCount) && count(reasoning) ? u.candidatesTokenCount + reasoning : g ? null : u?.completion_tokens;
  check(count(input) && count(output) && input > 0 && output > 0 && input <= contextCap && output <= outputCap
    && (g ? u.totalTokenCount : u.total_tokens) === input + output
    && (reasoning === null || (count(reasoning) && reasoning <= output)), 'provider_usage_uncheckable');
  const modelVersion = g ? raw.modelVersion : raw.model;
  check(typeof modelVersion === 'string' && modelVersion.length <= 160
    && (modelVersion === requestedModel || (g && modelVersion.startsWith(`${requestedModel}-`))), 'provider_model_mismatch');
  const id = g ? raw.responseId : raw.id;
  return { text, modelVersion, requestId: typeof id === 'string' && /^[a-zA-Z0-9._:/-]{1,160}$/.test(id) ? id : null,
    usage: { inputTokens: input, outputTokens: output, reasoningTokens: reasoning }, unavailableReason: null };
}
function redacted(text, key) {
  try { const normalized = JSON.stringify(JSON.parse(text)); if (normalized.includes(key)) return normalized.replaceAll(key, '[REDACTED_API_KEY]'); } catch { /* Keep non-JSON error bodies. */ }
  return text.replaceAll(key, '[REDACTED_API_KEY]');
}
export async function generateOrderResponse({ request, wire, root, key, budget, runId, write,
  fetchImpl = globalThis.fetch, log = console.error, timeoutMs = 180000, wait = sleep, pacing = pace }) {
  check(typeof key === 'string' && key.length >= 16 && key.length <= 8192 && !/[\r\n]/.test(key), 'provider_key_unavailable');
  const g = request.provider === 'gemini', controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs), signal = controller.signal;
  const aborted = new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('request_timeout')), { once: true }));
  let lastAttempt = null;
  const work = async () => {
    async function http(endpoint, body, meter = false) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        if (g) {
          await pacing(signal);
          const a = JSON.parse(readFileSync(resolve(root, 'factory/03_build/output/gemini-runner-v1/ACCOUNT_ATTESTATION.json'), 'utf8'));
          check(a.model === request.requestedModel && a.freeTier === true && a.billingDisabled === true && a.paidSpendCapUsd === 0 && a.paidFallback === false, 'free_tier_attestation_required');
        }
        signal.throwIfAborted();
        if (meter) { budget.reserve(runId, attempt, g ? 0 : Math.ceil(contextCap * 0.3 + outputCap * 1.2)); lastAttempt = attempt; }
        const response = await fetchImpl(endpoint, { method: body ? 'POST' : 'GET', redirect: 'error', signal,
          headers: g ? { 'Content-Type': 'application/json', 'x-goog-api-key': key } : { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          ...(body ? { body: JSON.stringify(body) } : {}) });
        signal.throwIfAborted();
        const reader = response.body.getReader(), chunks = []; let size = 0;
        const cancel = () => { reader.cancel().catch(() => {}); }; signal.addEventListener('abort', cancel, { once: true });
        try { for (;;) { const { value, done } = await reader.read(); if (done) break;
          size += value.byteLength; check(size <= 1000000, 'provider_response_size_limit'); chunks.push(value); signal.throwIfAborted();
        } } finally { signal.removeEventListener('abort', cancel); cancel(); }
        const text = Buffer.concat(chunks).toString('utf8'); signal.throwIfAborted();
        if (response.ok) {
          check(!redacted(text, key).includes('[REDACTED_API_KEY]'), 'provider_secret_echo');
          let parsed; try { parsed = JSON.parse(text); } catch { write('malformed-provider.txt', redacted(text, key)); throw new Error('invalid_provider_json'); }
          return parsed;
        }
        const diagnostic = redacted(text, key); write(`${meter ? 'generation' : 'catalog'}-error-${attempt}.txt`, `HTTP ${response.status}\n${diagnostic}`);
        log(`${request.provider} HTTP ${response.status}\n${diagnostic}`);
        if (![429, 500, 503, 504].includes(response.status) || attempt === 3) throw new Error('provider_http_failure');
        let retryInfo; try { retryInfo = JSON.parse(text)?.error?.details?.find(d => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo')?.retryDelay; } catch { /* No RetryInfo. */ }
        const delay = /^\d+(\.\d+)?s$/.test(retryInfo ?? '') ? Number(retryInfo.slice(0, -1)) * 1000
          : Number(response.headers.get('retry-after')) * 1000 || 2000 * 2 ** (attempt - 1);
        check(Number.isFinite(delay) && delay >= 0, 'invalid_retry_delay'); await wait(delay, undefined, { signal });
      }
    }
    if (!g) {
      const catalog = await http(`${nebius}/models?verbose=true`, null);
      const model = catalog.data?.find(m => m.id === request.requestedModel);
      check(model?.context_length === contextCap && model.pricing?.prompt === '0.0000003' && model.pricing?.completion === '0.0000012'
        && Number(model.pricing.input_cache_read ?? 0) >= 0 && Number(model.pricing.input_cache_read ?? 0) <= 0.0000003
        && Object.entries(model.pricing).every(([name, price]) => ['prompt', 'completion', 'input_cache_read'].includes(name)
          || Number(price) === 0), 'nebius_catalog_or_price_changed');
      write('catalog.json', JSON.stringify({ id: model.id, contextTokens: model.context_length, pricing: model.pricing }));
    }
    const raw = await http(wire.endpoint, wire.body, true);
    write('provider-response.json', JSON.stringify(raw, (key, value) => ['reasoning_content', 'thoughtSignature'].includes(key)
      || value?.thought === true ? undefined : value));
    const result = inspectOrderResponse(request.provider, raw, request.requestedModel);
    return { ...result, attempt: lastAttempt, estimatedCostUsd: g ? 0 : Math.ceil(result.usage.inputTokens * 0.3 + result.usage.outputTokens * 1.2) / 1000000 };
  };
  try { return await Promise.race([work(), aborted]); }
  finally { clearTimeout(timer); controller.abort(); }
}
