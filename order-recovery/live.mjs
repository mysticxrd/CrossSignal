import { performance } from 'node:perf_hooks';
import { openOrderRun } from './model.mjs';
import { generateOrderResponse, orderWireRequest } from './provider.mjs';

const failures = new Set(['provider_key_unavailable', 'request_timeout', 'free_tier_attestation_required', 'provider_secret_echo',
  'provider_http_failure', 'provider_response_size_limit', 'invalid_provider_json', 'invalid_retry_delay', 'provider_candidate_mismatch',
  'incomplete_provider_output', 'invalid_provider_text', 'provider_usage_uncheckable', 'provider_model_mismatch',
  'nebius_catalog_or_price_changed', 'nebius_task_budget_exhausted']);
export async function runLiveOrder({ provider, runId, outputRoot, root, budget, key, ...transport }) {
  const run = openOrderRun({ provider, runId, outputRoot,
    source: transport.fetchImpl ? 'offline_transport_fixture' : 'live_provider' });
  budget.claim(runId, provider);
  const wire = orderWireRequest(run.request); run.write('wire-request.json', JSON.stringify(wire));
  const started = performance.now(); let response;
  try { response = await generateOrderResponse({ request: run.request, wire, root, key, budget, runId, write: run.write, ...transport }); }
  catch (error) {
    const reason = failures.has(error.message) && !error.message.includes(key) ? error.message : 'provider_transport_failure';
    response = { text: null, failureReason: reason };
  }
  const recorded = run.finish({ unavailableReason: 'provider_result_unavailable', chargeUnavailableReason: 'provider_charge_not_reported',
    ...response, elapsedMs: performance.now() - started });
  // Settle only after the response and terminal result are durable. Unknown sends retain their full reservation.
  if (response.usage) budget.settle(runId, response.attempt, Math.round(response.estimatedCostUsd * 1000000));
  return recorded;
}
