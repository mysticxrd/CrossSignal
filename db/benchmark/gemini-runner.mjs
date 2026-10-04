import { performance } from 'node:perf_hooks';
import { digest, requireThat } from './contracts.mjs';
import { GEMINI } from './gemini-config.mjs';
import { createGeminiBudget } from './gemini-budget.mjs';
import { isolatedGemini } from './gemini-isolation.mjs';

const knownErrors = ['context_overflow', 'budget_exhausted', 'tool_budget_exhausted', 'investigation_timeout',
  'request_timeout', 'http_failure', 'transport_failure', 'response_size_limit', 'usage_unknown',
  'token_count_or_usage_mismatch', 'isolated_validation_failed', 'isolated_worker_timeout', 'provider_secret_echo'];

export async function runGeminiInvestigation({ observable, scope, method, store, transport, profile = 'minimal' }) {
  requireThat(['single-shot-model', 'tool-using-model'].includes(method), 'invalid_method');
  requireThat(store.metadata.scope.runId === scope.runId && store.metadata.method === method, 'run_store_binding_mismatch');
  // The transport refuses any other profile's requests, so a mismatch stops here, before the run is used up.
  requireThat((transport.profile ?? 'minimal') === profile, 'transport_profile_mismatch');
  store.claim(); // Atomic and durable: repeated execution of this run is prohibited.
  const started = performance.now(), deadline = started + GEMINI.investigationTimeoutMs;
  const ledger = createGeminiBudget({ method, profile }), queries = [];
  let lease = null, finding = null, terminalStatus = null, failureReason = null;
  let modelVersion = null;
  try {
    for (;;) {
      const outputReservation = ledger.nextOutputReservation();
      const prepared = await isolatedGemini({ operation: 'prepare', observable, scope,
        options: { method, queries, outputReservation, profile } }, { deadline });
      const tokenReceipt = await transport.count(prepared, deadline);
      store.append('token_count', { tokenReceipt, atUtc: new Date().toISOString() });
      lease = ledger.begin(prepared, tokenReceipt);
      // A committed write-ahead lease precedes every possible model request.
      store.append('request', { atUtc: new Date().toISOString(), prepared, lease });
      const response = await transport.generate(prepared, lease);
      const parsed = await isolatedGemini({ operation: 'inspect', raw: response.data,
        options: { method, outputReservation } }, { deadline });
      // Raw provider objects and hidden thought/signature channels are discarded.
      if (parsed.queryIntent) {
        const admitted = ledger.registerToolIntent(lease, { visibleTextHash: digest(parsed.visibleText) });
        store.append('tool_attempt', { attempt: ledger.snapshot().toolAttempts,
          query: parsed.query, invalid: parsed.query === null, budgetDenied: !admitted, visibleTextHash: digest(parsed.visibleText) });
        if (!admitted) { parsed.status = 'failed'; parsed.reason = 'tool_budget_exhausted'; parsed.terminalStatus = 'budget_exhausted'; }
      }
      const accounting = ledger.finish(lease, { usage: parsed.usage,
        terminalStatus: parsed.status === 'parsed' ? (parsed.query ? 'query' : 'completed') : parsed.terminalStatus });
      lease = null;
      store.append('response', { atUtc: new Date().toISOString(), parsed, accounting,
        requestId: response.requestId, requestIdUnavailableReason: response.requestIdUnavailableReason });
      if (parsed.modelVersion !== null) {
        if (!parsed.modelVersion.startsWith(GEMINI.model) || (modelVersion !== null && modelVersion !== parsed.modelVersion)) {
          terminalStatus = 'model_version_changed'; failureReason = 'model_version_changed'; transport.stop(); break;
        }
        modelVersion = parsed.modelVersion;
      }
      if (!['completed', 'query'].includes(accounting.status)) {
        terminalStatus = accounting.status; failureReason = parsed.reason ?? accounting.status; break;
      }
      if (parsed.finding) { finding = parsed.finding; terminalStatus = finding.terminalStatus; break; }
      requireThat(parsed.query, 'invalid_output');
      // An unservable request comes back as { error, reason }; it used a tool call and the loop goes on.
      const result = await isolatedGemini({ operation: 'query', observable, scope, query: parsed.query }, { deadline });
      store.append('tool_result', { attempt: ledger.snapshot().toolAttempts, queryHash: digest(parsed.query),
        result, resultHash: digest(result), exposedEvidenceIds: 'error' in result ? [] : result.events.map(e => e.id) });
      queries.push(parsed.query);
    }
  } catch (e) {
    failureReason = knownErrors.includes(e.message) ? e.message : 'host_validation_failure';
    terminalStatus = failureReason;
    if (lease) { ledger.abort(lease); terminalStatus = 'indeterminate_usage'; transport.stop(); }
    else if (!['context_overflow', 'budget_exhausted', 'tool_budget_exhausted', 'investigation_timeout'].includes(failureReason)) transport.stop();
  }
  const result = { truthMode: 'SIMULATED', method, terminalStatus, failureReason, finding,
    modelVersion, modelVersionUnavailableReason: modelVersion === null ? 'not_reported_or_invalid' : null,
    budget: ledger.snapshot(), elapsedMs: performance.now() - started,
    completedAtUtc: new Date().toISOString(), transport: transport.counters(), runtimeEffects: 0 };
  store.append('terminal', result);
  return result;
}
