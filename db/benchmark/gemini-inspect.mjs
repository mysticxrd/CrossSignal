import { sanitizeUsage } from './gemini.mjs';
import { validateFinding } from './schemas.mjs';
import { validateGeminiTurn } from './gemini-context.mjs';

// Only visible, bounded text and numeric usage leave the restricted parser.
export function inspectGeminiTurn(raw, { method, outputReservation }) {
  const usage = sanitizeUsage(raw?.usageMetadata);
  const result = { status: 'failed', terminalStatus: 'invalid_output', reason: null,
    visibleText: null, finding: null, query: null, queryIntent: false, usage,
    modelVersion: /^[a-zA-Z0-9._-]{1,160}$/.test(raw?.modelVersion ?? '') ? raw.modelVersion : null };
  const fail = (reason, terminalStatus = 'invalid_output') => ({ ...result, reason, terminalStatus });
  result.modelVersionUnavailableReason = result.modelVersion === null ? 'not_reported_or_invalid' : null;
  result.fingerprint = null; result.fingerprintUnavailableReason = 'not_exposed_by_gemini';
  if (raw?.promptFeedback?.blockReason) return fail('provider_blocked');
  if (!Array.isArray(raw?.candidates) || raw.candidates.length !== 1) return fail('candidate_count_mismatch');
  const candidate = raw.candidates[0], parts = candidate?.content?.parts;
  if (!Array.isArray(parts) || !parts.length) return fail('missing_visible_output');
  let text = '';
  for (const part of parts) {
    if (!part || typeof part !== 'object' || Array.isArray(part)) return fail('unsupported_response_part');
    if (part.thought === true) continue;
    if (Object.keys(part).some(k => !['text', 'thought', 'thoughtSignature'].includes(k))
      || typeof part.text !== 'string' || ('thought' in part && typeof part.thought !== 'boolean'))
      return fail('unsupported_response_part');
    text += part.text;
    if (Buffer.byteLength(text) > 32768) return fail('visible_output_too_large');
  }
  result.visibleText = text;
  try { result.queryIntent = method === 'tool-using-model' && JSON.parse(text)?.kind === 'query'; } catch { /* retained malformed output */ }
  if (!usage.budgetCheckable) return fail('usage_unavailable', 'transport_failure');
  if (!Number.isSafeInteger(usage.generatedTokens) || usage.generatedTokens > outputReservation)
    return fail('response_token_cap_exceeded', 'budget_exhausted');
  if (candidate.finishReason !== 'STOP') return fail('incomplete_provider_output');
  try {
    const value = JSON.parse(text);
    if (method === 'single-shot-model') result.finding = validateFinding(value);
    else {
      const parsed = validateGeminiTurn(value);
      if (value.kind === 'query') result.query = parsed;
      else result.finding = parsed;
    }
  } catch { return fail('invalid_json_or_schema'); }
  return { ...result, status: 'parsed', reason: null,
    terminalStatus: result.query ? 'query' : result.finding.terminalStatus };
}
