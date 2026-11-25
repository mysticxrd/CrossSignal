import { setTimeout as sleep } from 'node:timers/promises';
import { catalogMatchesCard, check, reserveMicros, settleMicros } from './price-card.mjs';

// E1's own Nebius transport (section 4 decision 2): native tool calls are allowed here, while order-recovery's
// provider keeps refusing them.
const nebius = 'https://api.tokenfactory.nebius.com/v1';
const retryable = [429, 500, 503, 504];
export const validKey = key => typeof key === 'string' && key.length >= 16 && key.length <= 8192 && !/[\r\n]/.test(key);
const hidden = (text, key) => text.replaceAll(key, '[REDACTED_API_KEY]');

// The shared ledger keys spend by (run, attempt). E1 makes many sends per run, so its attempt column holds
// send × 10 + attempt (attempts 1-3).
export const ledgerAttempt = (send, attempt) => send * 10 + attempt;

// Checked before a run's first paid send: a model or price the card doesn't match stops here, unpaid.
export async function checkCatalog({ card, key, fetchImpl = globalThis.fetch, timeoutMs = 30000 }) {
  check(validKey(key), 'provider_key_unavailable');
  const response = await fetchImpl(`${nebius}/models?verbose=true`, { method: 'GET', redirect: 'error',
    signal: AbortSignal.timeout(timeoutMs), headers: { Authorization: `Bearer ${key}` } });
  const text = await response.text();
  if (!response.ok) throw Object.assign(new Error('catalog_http_failure'), { detail: hidden(text, key) });
  const model = JSON.parse(text).data?.find(entry => entry.id === card.model);
  check(catalogMatchesCard(card, model), 'nebius_catalog_or_price_changed');
  return { id: model.id, contextTokens: model.context_length, pricing: model.pricing };
}

export function inspectE1Response(raw, card, outputCap) {
  check(raw?.choices?.length === 1, 'provider_candidate_mismatch');
  const { message, finish_reason: finishReason } = raw.choices[0];
  // `length` passes through: the loop records it as the model's failure, not the transport's.
  check(message && !message.refusal && ['stop', 'tool_calls', 'length'].includes(finishReason), 'incomplete_provider_output');
  check(raw.model === card.model, 'provider_model_mismatch');
  const u = raw.usage ?? {}, count = n => Number.isSafeInteger(n) && n >= 0;
  // Caching is best effort with no SLA, so a missing cached count is 0 and settles at the full input price.
  const usage = { inputTokens: u.prompt_tokens, cachedTokens: u.prompt_tokens_details?.cached_tokens ?? 0,
    outputTokens: u.completion_tokens, reasoningTokens: u.completion_tokens_details?.reasoning_tokens ?? 0 };
  check(Object.values(usage).every(count) && usage.inputTokens > 0 && usage.cachedTokens <= usage.inputTokens
    && usage.outputTokens <= outputCap && usage.reasoningTokens <= usage.outputTokens
    && u.total_tokens === usage.inputTokens + usage.outputTokens, 'provider_usage_uncheckable');
  const requestId = typeof raw.id === 'string' && /^[\w.:/-]{1,160}$/.test(raw.id) ? raw.id : null;
  return { message, finishReason, modelVersion: raw.model, requestId, usage };
}

// One send. Each attempt reserves the uncached worst case first. The answered attempt is handed to `persist`
// (the run log) and only then settled, so a crash in between over-counts spend instead of leaving the log short.
// An attempt with no checkable answer keeps its full reservation until a logged correction settles it.
export async function sendE1({ body, card, key, budget, runId, send, persist = async () => {},
  fetchImpl = globalThis.fetch, wait = sleep, timeoutMs = 180000 }) {
  check(validKey(key), 'provider_key_unavailable');
  check(body.model === card.model, 'price_card_model_mismatch');
  const payload = JSON.stringify(body), outputCap = body.max_completion_tokens;
  const signal = AbortSignal.timeout(timeoutMs), attempts = [];
  try {
    for (let attempt = 1; ; attempt++) {
      const ledgerKey = ledgerAttempt(send, attempt);
      const record = { attempt, reservedMicros: reserveMicros(card, Buffer.byteLength(payload), outputCap),
        startedAt: new Date().toISOString() };
      budget.reserve(runId, ledgerKey, record.reservedMicros);
      attempts.push(record);
      const response = await fetchImpl(`${nebius}/chat/completions`, { method: 'POST', redirect: 'error', signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: payload });
      const text = await response.text();
      record.httpStatus = response.status;
      if (response.ok) {
        check(!text.includes(key), 'provider_secret_echo');
        let raw;
        try { raw = JSON.parse(text); } catch { throw new Error('invalid_provider_json'); }
        const result = { ...inspectE1Response(raw, card, outputCap), raw, attempts };
        record.settledMicros = settleMicros(card, result.usage);
        await persist(result);
        budget.settle(runId, ledgerKey, record.settledMicros);
        return result;
      }
      record.error = hidden(text, key);
      record.retryAfter = response.headers.get('retry-after');
      // The retry loop ends here: any status outside 429/500/503/504, or the third attempt.
      if (!retryable.includes(response.status) || attempt === 3) throw new Error('provider_http_failure');
      // Backoff is recorded per attempt so the agent's time cap can leave it out (spec Fix F6).
      record.backoffMs = Math.min(Number(record.retryAfter) * 1000 || 1000 * 2 ** (attempt - 1), 30000);
      await wait(record.backoffMs, undefined, { signal });
    }
  } catch (error) {
    const failure = signal.aborted ? new Error('request_timeout') : error;
    throw Object.assign(failure, { attempts });
  }
}
