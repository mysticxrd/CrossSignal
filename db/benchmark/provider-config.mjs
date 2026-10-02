import { GEMINI } from './gemini-config.mjs';

// Active preparation follows the owner's request to skip subscription complexity.
// Previous SIWC configuration is preserved in subscription-config.mjs.
export const PROVIDER = Object.freeze({
  ...GEMINI,
  credentialKind: 'gemini_api_key',
  selectionStatus: 'selected_conditional_free_tier_execution_pending',
  executionProfile: 'original-accepted-b01-token-limits',
  freeTierRequestsConditionallyAuthorized: true,
  paidSpendCapUsd: 0,
  allowPaidFallback: false,
  accountQuotaVerified: false,
  modelCallsAuthorized: false,
  subscriptionPreparationSelected: false,
});

export function executionBlockers() {
  return [
    'verified_free_tier_project_with_billing_disabled_required',
    'scoped_gemini_api_key_unavailable',
    'account_model_quota_and_actual_route_compatibility_unverified',
    'complete_provider_request_token_count_not_measured',
    'real_isolated_transport_and_durable_runner_unfinished',
  ];
}

// Conditional authorization is not a verified account or executable transport.
export async function callActiveProvider() {
  throw new Error('gemini_execution_blocked:' + executionBlockers().join(','));
}
