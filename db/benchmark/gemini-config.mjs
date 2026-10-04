// Proposed configuration only. The provider was selected; this model is not yet reviewed.
export const GEMINI = Object.freeze({
  provider: 'gemini',
  model: 'gemini-3.5-flash-lite',
  apiVersion: 'v1beta',
  endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',
  selectionStatus: 'proposed_model_pending_review',
  modelCallsAuthorized: false,
  paidSpendCapUsd: 0,
  freeAccountVerified: false,
  tokenizerVerified: false,
  reasoningCapDocumented: true,
  apiCompatibilityVerified: false,
  temperature: 1,
  thinkingLevel: 'MINIMAL',
  maxOutputTokens: 1024,
  contextTokens: 8192,
  generatedTokens: 6144,
  modelTurns: 12,
  requestTimeoutMs: 180_000,
  investigationTimeoutMs: 900_000,
  concurrency: 1,
  // 429/500/503/504 only, inside one request's deadline; a 4xx request error is never retried.
  maxRetries: 4,
  // The free tier allows 15 requests a minute. Starting every request, retries included, at least 4.5 s
  // after the one before keeps any 60 s window to 14.
  requestGapMs: 4500,
  seed: null,
  seedUnavailableReason: 'model_specific_support_not_verified',
});

// Thinking and token limits, chosen per batch. `minimal` is the accepted B01 baseline above and the default.
// Thinking tokens are output tokens: they count against maxOutputTokens per response and generatedTokens per
// run, so `low` raises both, and the context to hold the larger reservation.
export const PROFILES = Object.freeze({
  minimal: Object.freeze({ name: 'original-accepted-b01-token-limits', thinkingLevel: GEMINI.thinkingLevel,
    maxOutputTokens: GEMINI.maxOutputTokens, contextTokens: GEMINI.contextTokens, generatedTokens: GEMINI.generatedTokens }),
  low: Object.freeze({ name: 'low-thinking-raised-token-limits', thinkingLevel: 'LOW',
    maxOutputTokens: 4096, contextTokens: 16384, generatedTokens: 24576 }),
});

export function tokenProfile(name = 'minimal') {
  if (!Object.hasOwn(PROFILES, name)) throw new Error('unknown_token_profile');
  return PROFILES[name];
}

// No key lookup, environment inspection or network dispatch exists in this preflight.
// A generic stage acceptance or a caller-supplied option cannot enable requests.
export async function callGemini() {
  throw new Error('model_calls_not_authorized');
}
