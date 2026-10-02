import { performance } from 'node:perf_hooks';
import { digest, requireThat } from './contracts.mjs';
import { PROVIDER } from './subscription-config.mjs';

// Pure host accounting. Admission is not OAuth, billing or model-call authority.
// Generation can overshoot; usage thresholds qualify a completed attempt only.
export function createSubscriptionBudget({ method, clock = () => performance.now() }) {
  requireThat(['single-shot-model', 'tool-using-model'].includes(method), 'unknown method');
  let last = clock(); requireThat(Number.isFinite(last), 'invalid monotonic clock');
  const deadline = last + PROVIDER.investigationTimeoutMs;
  let turns = 0, tools = 0, generated = 0, inFlight = null, terminal = null;
  const records = [];
  const stop = reason => { terminal = reason; throw new Error(`budget_closed:${reason}`); };
  function now() {
    const value = clock();
    if (!Number.isFinite(value) || value < last) stop('invalid_monotonic_clock');
    last = value; return value;
  }
  function open() {
    if (terminal) throw new Error(`budget_closed:${terminal}`);
    const value = now(); if (value >= deadline) stop('timeout'); return value;
  }
  return {
    begin(request) {
      const value = open();
      if (inFlight) stop('concurrency_violation');
      if (turns >= (method === 'single-shot-model' ? 1 : PROVIDER.modelTurns) || generated >= PROVIDER.generatedTokens) stop('budget_exhausted');
      requireThat(request?.body && request.requestSha256 === digest(request.body), 'request hash mismatch');
      const bytes = Buffer.byteLength(JSON.stringify(request.body));
      if (bytes > PROVIDER.requestBytes) stop('context_overflow');
      const lease = Object.freeze({ turn: ++turns, requestSha256: request.requestSha256,
        startedAtMonotonicMs: value, deadlineMonotonicMs: Math.min(value + PROVIDER.requestTimeoutMs, deadline), bytes });
      inFlight = lease;
      records.push({ type: 'attempt_started', ...lease }); // Must precede transport dispatch.
      return lease;
    },
    toolAttempt(request) {
      open();
      if (method === 'single-shot-model') stop('single_shot_tool_forbidden');
      if (inFlight) stop('concurrency_violation');
      if (tools >= PROVIDER.toolAttempts) stop('budget_exhausted');
      tools++;
      records.push({ type: 'read_only_tool_attempt', attempt: tools, requestSha256: digest(request) });
      return tools; // Invalid tool arguments still consume this attempt.
    },
    finish(lease, result) {
      requireThat(inFlight === lease, 'unknown or replayed attempt');
      const value = now(), usage = result?.usage;
      inFlight = null;
      const known = [usage?.inputTokens, usage?.outputTokens, usage?.reasoningTokens]
        .every(n => Number.isSafeInteger(n) && n >= 0) && usage.reasoningTokens <= usage.outputTokens;
      if (known) generated += usage.outputTokens; // Reasoning is already included.
      const reason = terminal ?? (value >= lease.deadlineMonotonicMs ? 'timeout'
        : !known ? 'usage_unknown' : usage.outputTokens > PROVIDER.outputTokensPerResponse || generated > PROVIDER.generatedTokens ? 'budget_exhausted'
        : !['parsed_fixture', 'parsed_response'].includes(result.status) ? 'provider_or_output_failure' : null);
      records.push({ type: 'attempt_closed', turn: lease.turn, outputTokens: known ? usage.outputTokens : null,
        reasoningTokens: known ? usage.reasoningTokens : null, cumulativeOutputTokens: generated,
        endedAtMonotonicMs: value, status: reason ?? 'qualified', generationCapEnforced: false });
      if (reason) terminal = reason;
      return { qualified: reason === null, terminalStatus: reason, generationCapEnforced: false,
        cumulativeOutputTokens: generated, providerUsageKnown: known };
    },
    abort(lease) {
      requireThat(inFlight === lease, 'unknown or replayed attempt');
      inFlight = null; terminal = 'indeterminate';
      records.push({ type: 'attempt_closed', turn: lease.turn, status: terminal, outputTokens: null, generationCapEnforced: false });
      return { terminalStatus: terminal, retriesPermitted: false, usageKnown: false };
    },
    snapshot() {
      return structuredClone({ profile: PROVIDER.executionProfile, turns, toolAttempts: tools, cumulativeOutputTokens: generated,
        inFlight: inFlight !== null, terminalStatus: terminal, budgetAdmissionOpen: terminal === null,
        automaticRetries: 0, generationCapEnforced: false, records });
    },
  };
}
