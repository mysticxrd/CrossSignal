import { readFileSync } from 'node:fs';

export function check(ok, message) { if (!ok) throw new Error(message); }
const count = n => Number.isSafeInteger(n) && n >= 0;

// A price card is the committed price list every send is reserved and settled against (section 9). A price change
// is a new card, never an edit, so an old run log still names the prices it was charged at.
export function loadPriceCard(id) {
  check(/^[a-z0-9.-]+$/.test(id), 'invalid_price_card_id');
  const card = JSON.parse(readFileSync(new URL(`./price-cards/${id}.json`, import.meta.url), 'utf8'));
  const p = card.usdPerMillion ?? {}, rate = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;
  check(card.id === id && card.provider === 'nebius' && typeof card.model === 'string'
    && rate(p.input) && rate(p.cachedInput) && rate(p.output) && p.cachedInput <= p.input, 'invalid_price_card');
  return card;
}

// Prices become integer micro-dollars per million tokens, so token counts multiply without float drift.
const microsPerMillion = card => Object.fromEntries(Object.entries(card.usdPerMillion)
  .map(([line, usd]) => [line, Math.round(usd * 1000000)]));
const toMicros = total => Math.ceil(total / 1000000);

// The worst case for one send: no token cached, and no more prompt tokens than the request has bytes.
export function reserveMicros(card, requestBytes, outputCap) {
  check(count(requestBytes) && requestBytes > 0 && count(outputCap) && outputCap > 0, 'invalid_reservation_size');
  const p = microsPerMillion(card);
  return toMicros(requestBytes * p.input + outputCap * p.output);
}

// What a send cost: cached input at the cached rate, the rest of the input and all output at full rate.
export function settleMicros(card, { inputTokens, cachedTokens, outputTokens }) {
  check(count(inputTokens) && count(cachedTokens) && count(outputTokens) && cachedTokens <= inputTokens, 'invalid_usage');
  const p = microsPerMillion(card);
  return toMicros((inputTokens - cachedTokens) * p.input + cachedTokens * p.cachedInput + outputTokens * p.output);
}

// Nebius's catalog prices per token, as strings. A missing cache price means no cache discount, and any other
// non-zero price line is a charge the card doesn't cover.
export function catalogMatchesCard(card, model) {
  const pricing = model?.pricing ?? {}, p = card.usdPerMillion;
  const same = (perToken, perMillion) => Math.abs(Number(perToken) * 1000000 - perMillion) < 1e-9;
  return model?.id === card.model && (card.contextTokens === null || model.context_length === card.contextTokens)
    && same(pricing.prompt, p.input) && same(pricing.completion, p.output)
    && same(pricing.input_cache_read ?? pricing.prompt, p.cachedInput)
    && Object.entries(pricing).every(([line, price]) => ['prompt', 'completion', 'input_cache_read'].includes(line)
      || Number(price) === 0);
}
