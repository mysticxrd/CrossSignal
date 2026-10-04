import { performance } from 'node:perf_hooks';
import { digest, requireThat } from './contracts.mjs';
import { GEMINI, tokenProfile } from './gemini-config.mjs';

// Pure host admission/accounting. This ledger never authorizes credentials/network.
// Real transport must cancel at the returned deadline and persist before dispatch.
export function createGeminiBudget({ method = 'tool-using-model', clock = () => performance.now(), profile = 'minimal' } = {}) {
  requireThat(['single-shot-model', 'tool-using-model'].includes(method), 'unknown method');
  const limits = tokenProfile(profile);
  let last = clock(), turns = 0, tools = 0, generated = 0, inFlight = null, terminal = null;
  requireThat(Number.isFinite(last), 'invalid monotonic clock');
  const deadline = last + GEMINI.investigationTimeoutMs, records = [];
  const stop = reason => { terminal ??= reason; throw new Error(reason); };
  function now() {
    const value = clock();
    if (!Number.isFinite(value) || value < last) stop('invalid_monotonic_clock');
    last = value;
    return value;
  }
  function open() {
    if (terminal) throw new Error(terminal);
    if (now() >= deadline) stop('investigation_timeout');
  }
  return {
    remainingMs() { open(); return deadline - now(); },
    nextOutputReservation() {
      open();
      if (generated >= limits.generatedTokens) stop('budget_exhausted');
      return Math.min(limits.maxOutputTokens, limits.generatedTokens - generated);
    },
    begin(request, tokenReceipt) {
      open();
      requireThat(!inFlight, 'concurrency_one');
      if (turns >= (method === 'single-shot-model' ? 1 : GEMINI.modelTurns)) stop('budget_exhausted');
      requireThat(request?.requestSha256 === digest(request.body), 'request_hash_mismatch');
      const limit = request.body?.generationConfig?.maxOutputTokens;
      requireThat(Number.isSafeInteger(limit) && limit > 0 && limit <= this.nextOutputReservation(), 'output_reservation_mismatch');
      requireThat(tokenReceipt?.requestSha256 === request.requestSha256, 'token_receipt_hash_mismatch');
      const input = tokenReceipt?.inputTokens;
      requireThat(Number.isSafeInteger(input) && input >= 0, 'complete_input_token_count_required');
      const complete = tokenReceipt.completeInputTokenBound ?? input;
      requireThat(Number.isSafeInteger(complete) && complete >= input, 'complete_token_bound_invalid');
      // Receipt must cover task, schemas, framing and the complete accumulated context.
      if (complete + limit > limits.contextTokens) stop('context_overflow');
      const start = now();
      inFlight = Object.freeze({ turn: ++turns, requestSha256: request.requestSha256, inputTokens: input,
        completeInputTokenBound: complete, conservativeCount: tokenReceipt.completeInputTokenBound !== undefined,
        outputReservation: limit, startedAtMonotonicMs: start,
        deadlineMonotonicMs: Math.min(start + GEMINI.requestTimeoutMs, deadline) });
      records.push({ ...inFlight, status: 'admitted_fixture' });
      return inFlight;
    },
    registerToolIntent(lease, request) {
      requireThat(lease === inFlight && inFlight !== null && method === 'tool-using-model', 'tool_intent_lease_mismatch');
      if (tools >= 10) return false;
      tools++;
      records.push({ toolAttempt: tools, requestSha256: digest(request), status: 'returned_tool_intent' });
      return true;
    },
    toolAttempt(request) {
      open();
      requireThat(method === 'tool-using-model', 'single_shot_has_no_tools');
      requireThat(!inFlight, 'model_request_in_flight');
      if (tools >= 10) stop('tool_budget_exhausted');
      // Invalid requests count; only a hash enters this budget ledger.
      tools++;
      records.push({ toolAttempt: tools, requestSha256: digest(request), status: 'tool_attempt_fixture' });
    },
    finish(lease, { usage, terminalStatus = 'completed' }) {
      requireThat(lease === inFlight && inFlight !== null, 'request_lease_mismatch_or_replay');
      const ended = now(), row = records.find(r => r.turn === lease.turn);
      const output = usage?.counts?.candidatesTokenCount, thoughts = usage?.counts?.thoughtsTokenCount;
      const input = usage?.counts?.promptTokenCount, total = usage?.counts?.totalTokenCount;
      const known = [output, thoughts, input, total].every(n => Number.isSafeInteger(n) && n >= 0);
      const count = known && Number.isSafeInteger(output + thoughts) ? output + thoughts : null;
      if (count !== null && Number.isSafeInteger(generated + count)) generated += count;
      const nativeTools = usage?.counts?.toolUsePromptTokenCount;
      const inconsistent = known && (count === null || !Number.isSafeInteger(input + count) || total < input + count
        || (lease.conservativeCount ? input > lease.completeInputTokenBound : input !== lease.inputTokens)
        || (nativeTools !== null && nativeTools !== undefined && nativeTools !== 0));
      const result = ended >= lease.deadlineMonotonicMs ? 'request_timeout'
        : !known || count === null ? 'usage_unknown' : inconsistent ? 'token_count_or_usage_mismatch'
          : count > lease.outputReservation || generated > limits.generatedTokens ? 'budget_exhausted'
            : terminalStatus;
      Object.assign(row, { endedAtMonotonicMs: ended, generatedTokens: count, status: result });
      inFlight = null;
      if (result !== 'completed' && result !== 'query') terminal = result;
      return structuredClone(row);
    },
    abort(lease) {
      requireThat(lease === inFlight && inFlight !== null, 'request_lease_mismatch_or_replay');
      terminal = 'indeterminate_usage';
      Object.assign(records.find(r => r.turn === lease.turn), { status: terminal, generatedTokens: null });
      inFlight = null;
    },
    snapshot() {
      return structuredClone({ profile: limits.name, turns, toolAttempts: tools,
        cumulativeGeneratedTokens: generated, terminalStatus: terminal,
        inFlight: inFlight !== null, records, networkAuthorized: false, automaticRetries: 0 });
    },
  };
}
