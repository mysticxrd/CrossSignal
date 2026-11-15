import { performance } from 'node:perf_hooks';
import { openOrderRun } from './model.mjs';
import { generateOrderResponse, orderWireRequest, validKey } from './provider.mjs';
import { check } from './world.mjs';

const failures = new Set(['provider_key_unavailable', 'request_timeout', 'provider_secret_echo',
  'provider_http_failure', 'provider_response_size_limit', 'invalid_provider_json', 'invalid_retry_delay', 'provider_candidate_mismatch',
  'incomplete_provider_output', 'invalid_provider_text', 'provider_usage_uncheckable', 'provider_model_mismatch',
  'nebius_catalog_or_price_changed', 'nebius_task_budget_exhausted']);
export async function runLiveOrder({ provider, runId, outputRoot, budget, key, worldId, generationTokenLimit, ...transport }) {
  // A missing key stops before the run id is claimed, so the same id still works once the key is set.
  check(validKey(key), 'provider_key_unavailable');
  const run = openOrderRun({ provider, runId, outputRoot, worldId, generationTokenLimit,
    source: transport.fetchImpl ? 'offline_transport_fixture' : 'live_provider' });
  budget.claim(runId, provider);
  const wire = orderWireRequest(run.request); run.write('wire-request.json', JSON.stringify(wire));
  const started = performance.now(); let response;
  try { response = await generateOrderResponse({ request: run.request, wire, key, budget, runId, write: run.write, ...transport }); }
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
