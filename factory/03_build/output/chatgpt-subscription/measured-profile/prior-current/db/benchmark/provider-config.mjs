// Active provider proposal. Gemini files remain preserved historical preparation.
export const PROVIDER = Object.freeze({
  provider: 'openai-chatgpt-subscription',
  credentialKind: 'siwc_oauth',
  endpoint: 'https://api.openai.com/v1/responses',
  modelsEndpoint: 'https://api.openai.com/v1/models',
  candidateModel: 'gpt-6.1-sol',
  selectedModelStatus: 'pending_account_catalog_and_configuration_review',
  reasoningEffort: 'low',
  temperature: null,
  seed: null,
  seedUnavailableReason: 'subscription_route_support_not_verified_use_replicate_indices',
  paidSpendCapUsd: 0,
  allowCredits: false,
  allowApiKey: false,
  allowPaidFallback: false,
  subscriptionRequestsConditionallyAuthorized: true,
  oauthEligibilityVerified: false,
  accountCatalogVerified: false,
  allowanceOnlyVerified: false,
  hardOutputCapSupported: false,
  contractAmendmentAccepted: false,
  contextTokens: 8192,
  outputTokensPerResponse: 1024,
  generatedTokens: 6144,
  modelTurns: 12,
  toolAttempts: 10,
  requestTimeoutMs: 180_000,
  investigationTimeoutMs: 900_000,
  concurrency: 1,
  automaticRetries: 0,
});

export function executionBlockers() {
  return [
    'accepted_1024_generation_cap_unsupported',
    'accepted_6144_total_generation_and_8192_combined_context_bounds_unenforceable',
    'contract_amendment_pending_human_review',
    'crosssignal_oauth_grant_and_client_eligibility_unverified',
    'selected_account_model_catalog_unverified',
    'subscription_allowance_only_and_zero_credit_settings_unverified',
    'pinned_tokenizer_and_route_compatibility_unverified',
  ];
}
