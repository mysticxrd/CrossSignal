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
  automaticRetries: 0,
  seed: null,
  seedUnavailableReason: 'model_specific_support_not_verified',
});

// No key lookup, environment inspection or network dispatch exists in this preflight.
// A generic stage acceptance or a caller-supplied option cannot enable requests.
export async function callGemini() {
  throw new Error('model_calls_not_authorized');
}
