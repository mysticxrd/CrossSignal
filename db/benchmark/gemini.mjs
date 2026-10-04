import { readFileSync } from 'node:fs';
import { canonical, digest, requireThat } from './contracts.mjs';
import { assertNoCanaries, commonDefinitions, exposePacket } from './exposure.mjs';
import { findingSchema, validateFinding } from './schemas.mjs';
import { GEMINI, tokenProfile } from './gemini-config.mjs';

const task = readFileSync(new URL('./task.md', import.meta.url), 'utf8').trim();

// Project the frozen schema onto the documented Gemini JSON-schema subset.
// Host validation retains every original constant, string-length and array-length constraint.
export function wireSchema(schema, path = '$', changes = []) {
  const result = {}, limits = [];
  for (const [key, value] of Object.entries(schema)) {
    if (key === 'const') {
      result.enum = [value];
      result.type = typeof value;
      changes.push({ path, keyword: 'const', disposition: 'wire_enum_host_constant' });
    } else if (key === 'maxLength' || key === 'maxItems') {
      // gemini-3.5-flash-lite answers any maxItems with a bare 400 INVALID_ARGUMENT (bisected 2026-10-03),
      // so both limits travel as description text the model can follow; the host still enforces them.
      limits.push(`At most ${value} ${key === 'maxLength' ? 'characters' : 'items'}.`);
      changes.push({ path, keyword: key, disposition: 'host_only' });
    } else if (key === 'properties') {
      result.properties = Object.fromEntries(Object.entries(value).map(([name, child]) =>
        [name, wireSchema(child, `${path}.${name}`, changes)]));
    } else if (key === 'items') result.items = wireSchema(value, `${path}[]`, changes);
    else if (key === 'anyOf') result.anyOf = value.map((child, i) => wireSchema(child, `${path}.anyOf[${i}]`, changes));
    else result[key] = structuredClone(value);
  }
  if (limits.length > 0) result.description = [schema.description, ...limits].filter(Boolean).join(' ');
  return result;
}

// Pure preparation: input must be a validated, scoped synthetic observable.
// Identity, task, schema, model, endpoint and provider-native capabilities are host-owned.
export function prepareSingleShot(input, scope, profile = 'minimal') {
  const limits = tokenProfile(profile), packet = exposePacket(input, scope, true), schemaProjection = [];
  const schema = wireSchema(findingSchema, '$', schemaProjection);
  const body = {
    systemInstruction: { parts: [{ text: canonical({ task, commonDefinitions }) }] },
    contents: [{ role: 'user', parts: [{ text: canonical(packet) }] }],
    generationConfig: {
      candidateCount: 1, maxOutputTokens: limits.maxOutputTokens, temperature: GEMINI.temperature,
      responseModalities: ['TEXT'],
      thinkingConfig: { thinkingLevel: limits.thinkingLevel, includeThoughts: false },
      responseFormat: { text: { mimeType: 'APPLICATION_JSON', schema } },
    },
  };
  assertNoCanaries(body, []);
  const requestBytes = Buffer.byteLength(JSON.stringify(body));
  return {
    provider: GEMINI.provider, endpoint: GEMINI.endpoint, body, requestSha256: digest(body),
    schemaProjection, exposedEvidenceIds: input.events.map(e => e.id),
    context: {
      requestBytes, outputReservation: limits.maxOutputTokens, framingReservation: 256,
      byteFallbackBoundFits: requestBytes + limits.maxOutputTokens + 256 <= limits.contextTokens,
      actualProviderTokens: null, unavailableReason: 'no_tokenizer_or_api_call_authorized',
      dispatchPermitted: false,
    },
  };
}

const usageFields = ['promptTokenCount', 'cachedContentTokenCount', 'candidatesTokenCount',
  'toolUsePromptTokenCount', 'thoughtsTokenCount', 'totalTokenCount'];
export function sanitizeUsage(raw = {}) {
  const counts = {}, unavailable = {}, inferred = {};
  for (const field of usageFields) {
    if (Number.isSafeInteger(raw?.[field]) && raw[field] >= 0) counts[field] = raw[field];
    else { counts[field] = null; unavailable[field] = raw?.[field] === undefined ? 'not_reported' : 'invalid_count'; }
  }
  // Gemini omits a zero thoughtsTokenCount (proto3 drops default values). Read the omission as 0
  // only when the reported total proves no thinking tokens were spent; otherwise usage stays unknown.
  if (raw?.thoughtsTokenCount === undefined && counts.promptTokenCount !== null && counts.candidatesTokenCount !== null
    && counts.totalTokenCount === counts.promptTokenCount + counts.candidatesTokenCount + (counts.toolUsePromptTokenCount ?? 0)) {
    counts.thoughtsTokenCount = 0; delete unavailable.thoughtsTokenCount;
    inferred.thoughtsTokenCount = 'omitted_zero_proven_by_total';
  }
  const known = ['promptTokenCount', 'candidatesTokenCount', 'thoughtsTokenCount', 'totalTokenCount']
    .every(field => counts[field] !== null);
  const generatedTokens = counts.candidatesTokenCount !== null && counts.thoughtsTokenCount !== null
    ? counts.candidatesTokenCount + counts.thoughtsTokenCount : null;
  return { counts, unavailable, inferred, generatedTokens, budgetCheckable: known,
    chargeUsd: null, chargeUnavailableReason: 'account_billing_not_verified' };
}

// Inspect mocked/future response data without retaining provider errors, hidden thoughts,
// signatures, auth headers, native function calls or arbitrary provider metadata.
export function inspectResponse(raw, httpStatus = 200) {
  const usage = sanitizeUsage(raw?.usageMetadata), result = {
    status: 'failed', terminalStatus: 'transport_failure', reason: null, visibleText: null,
    finding: null, usage, modelVersion: typeof raw?.modelVersion === 'string'
      && /^[a-zA-Z0-9._-]{1,160}$/.test(raw.modelVersion) ? raw.modelVersion : null,
    modelVersionUnavailableReason: null,
  };
  result.modelVersionUnavailableReason = result.modelVersion === null ? 'not_reported_or_invalid' : null;
  const fail = (reason, status = 'transport_failure') => ({ ...result, reason, terminalStatus: status });
  if (!Number.isSafeInteger(httpStatus) || httpStatus < 200 || httpStatus >= 300) return fail('http_failure');
  if (raw?.promptFeedback?.blockReason) return fail('provider_blocked');
  if (!Array.isArray(raw?.candidates) || raw.candidates.length !== 1) return fail('candidate_count_mismatch');
  const candidate = raw.candidates[0], parts = candidate?.content?.parts;
  if (!Array.isArray(parts) || parts.length === 0) return fail('missing_visible_output', 'invalid_output');
  let text = '', invalidPart = false;
  for (const part of parts) {
    if (!part || typeof part !== 'object' || Array.isArray(part)) { invalidPart = true; continue; }
    if (part.thought === true) continue;
    // Signatures accompany visible content on some Gemini versions; never save them.
    if (Object.keys(part).some(k => !['text', 'thought', 'thoughtSignature'].includes(k))
      || typeof part.text !== 'string' || ('thought' in part && typeof part.thought !== 'boolean')) {
      invalidPart = true; continue;
    }
    text += part.text;
  }
  if (Buffer.byteLength(text) > 32_768) return fail('visible_output_too_large', 'invalid_output');
  result.visibleText = text;
  if (invalidPart) return fail('unsupported_response_part', 'invalid_output');
  if (candidate.finishReason !== 'STOP') return fail('incomplete_provider_output', 'invalid_output');
  try { result.finding = validateFinding(JSON.parse(text)); }
  catch { return fail('invalid_finding_json_or_schema', 'invalid_output'); }
  if (!usage.budgetCheckable) return fail('usage_unavailable');
  if (usage.generatedTokens > GEMINI.maxOutputTokens) return fail('response_token_cap_exceeded', 'budget_exhausted');
  if (usage.counts.totalTokenCount < usage.counts.promptTokenCount + usage.generatedTokens)
    return fail('inconsistent_usage');
  if (usage.counts.promptTokenCount + GEMINI.maxOutputTokens > GEMINI.contextTokens)
    return fail('context_cap_exceeded', 'context_overflow');
  if (usage.counts.toolUsePromptTokenCount !== null && usage.counts.toolUsePromptTokenCount > 0)
    return fail('unexpected_provider_native_tool_usage');
  requireThat(result.finding, 'missing validated finding');
  // Semantic wrong answers/unknown citations remain intact for independent grading.
  // This successful parse is not an execution permission, grade or effect proposal.
  return { ...result, status: 'parsed', terminalStatus: result.finding.terminalStatus, reason: null };
}
