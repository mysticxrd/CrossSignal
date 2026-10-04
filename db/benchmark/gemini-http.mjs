import { performance } from 'node:perf_hooks';
import { setTimeout as sleep } from 'node:timers/promises';
import { canonical, digest, exact, requireThat } from './contracts.mjs';
import { prepareTokenCount } from './gemini-context.mjs';
import { GEMINI, tokenProfile } from './gemini-config.mjs';
import { formatDiagnostic, readDiagnostic, redactKey, retryDelayMs } from './gemini-diagnostics.mjs';

// Google asks clients to back off and retry these statuses; every other failure is final.
const RETRYABLE_STATUS = new Set([429, 500, 503, 504]);
const describeCause = e => `${e?.name ?? 'Error'}: ${e?.message ?? e}${e?.cause ? ` (cause: ${e.cause.message ?? e.cause})` : ''}`;

// Each call takes the next start slot, at least `gapMs` after the slot before, and waits for it, so even
// overlapping callers start that far apart. Resolves to the milliseconds waited.
export function createRequestPacer({ gapMs = GEMINI.requestGapMs, now = () => performance.now(),
  wait = (ms, signal) => sleep(ms, undefined, { signal }) } = {}) {
  let next = -Infinity;
  return async signal => {
    const asked = now(), start = Math.max(asked, next);
    next = start + gapMs;
    if (start > asked) await wait(start - asked, signal);
    return start - asked;
  };
}
// One pacer per process: every free-tier transport, so every run in a batch, shares one request clock.
const freeTierPacer = createRequestPacer();

// Core HTTP routine is dependency-injected only for explicitly labelled offline tests.
// Online entrypoint supplies global fetch and a verified host-only key source.
// Every failure is printed through `log` with the API key redacted and nothing else hidden.
export function createHttpTransport({ fetchImpl, keySource, mode, beforeRequest = null, profile = 'minimal',
  pace = mode === 'FREE_TIER_BENCHMARK' ? freeTierPacer : null, log = line => process.stderr.write(`${line}\n`) }) {
  requireThat(['OFFLINE_FIXTURE', 'FREE_TIER_BENCHMARK'].includes(mode), 'invalid_transport_mode');
  requireThat(mode !== 'FREE_TIER_BENCHMARK' || typeof beforeRequest === 'function', 'verified_host_gate_required');
  requireThat(pace === null ? mode !== 'FREE_TIER_BENCHMARK' : typeof pace === 'function', 'free_tier_pacing_required');
  // A transport admits only its own profile's thinking level and caps.
  const limits = tokenProfile(profile);
  let busy = false, generationCalls = 0, generationAttempts = 0, countCalls = 0, metadataCalls = 0, stopped = false, lastFailure = null;
  let lastFailureDiagnostic = null, automaticRetries = 0, pacingWaitMs = 0;
  function validatePrepared(prepared) {
    requireThat(prepared.provider === 'gemini' && prepared.endpoint === GEMINI.endpoint
      && prepared.requestSha256 === digest(prepared.body), 'request_binding_mismatch');
    exact(prepared.body,['systemInstruction','contents','generationConfig'],'generation body');
    const config=prepared.body.generationConfig;
    exact(config,['candidateCount','maxOutputTokens','temperature','responseModalities','thinkingConfig','responseFormat'],'generation config');
    requireThat(config.candidateCount===1 && config.temperature===1
      && Number.isSafeInteger(config.maxOutputTokens) && config.maxOutputTokens>0 && config.maxOutputTokens<=limits.maxOutputTokens
      && JSON.stringify(config.responseModalities)==='["TEXT"]'
      && config.thinkingConfig?.thinkingLevel===limits.thinkingLevel && config.thinkingConfig.includeThoughts===false
      && config.responseFormat?.text?.mimeType==='APPLICATION_JSON','fixed_generation_configuration_required');
    exact(config.thinkingConfig,['thinkingLevel','includeThoughts'],'thinking config');
    exact(config.responseFormat,['text'],'response format');
    exact(config.responseFormat.text,['mimeType','schema'],'text format');
    requireThat(Array.isArray(prepared.body.contents) && prepared.body.contents.length===1
      && prepared.body.contents[0].role==='user' && prepared.body.contents[0].parts.length===1
      && typeof prepared.body.contents[0].parts[0].text==='string','text_only_request_required');
    exact(prepared.body.contents[0],['role','parts'],'content');
    exact(prepared.body.contents[0].parts[0],['text'],'text part');
    exact(prepared.body.systemInstruction,['parts'],'system instruction');
    requireThat(prepared.body.systemInstruction.parts.length===1,'single_system_instruction_required');
    exact(prepared.body.systemInstruction.parts[0],['text'],'system text part');
  }
  async function request(endpoint, body, deadline, method = 'POST') {
    requireThat(!busy && !stopped, 'transport_concurrency_or_terminal');
    requireThat([GEMINI.endpoint, GEMINI.endpoint.replace(':generateContent', ':countTokens'),
      GEMINI.endpoint.replace(':generateContent', '')].includes(endpoint), 'fixed_endpoint_required');
    const remaining = Math.min(GEMINI.requestTimeoutMs, deadline - performance.now());
    const requestDeadline = performance.now() + remaining;
    requireThat(remaining > 0, 'investigation_timeout');
    busy = true;
    const controller = new AbortController();
    const operation = endpoint.endsWith(':generateContent') ? 'generateContent'
      : endpoint.endsWith(':countTokens') ? 'countTokens' : 'modelMetadata';
    let timer, key;
    try {
      const read = async response => {
        const reader = response.body?.getReader();
        requireThat(reader, 'response_stream_required');
        const parts = []; let size = 0;
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 1_000_000) { controller.abort(); throw new Error('response_size_limit'); }
          parts.push(Buffer.from(value));
        }
        const text = Buffer.concat(parts).toString('utf8');
        // Never persist even a malicious provider response that echoes credentials.
        requireThat(!text.includes(key), 'provider_secret_echo');
        const data = JSON.parse(text);
        const id = response.headers.get('x-request-id');
        const requestId = /^[a-zA-Z0-9._:-]{1,160}$/.test(id ?? '') && !id.includes(key) ? id : null;
        return { data, requestId, requestIdUnavailableReason: requestId === null ? 'not_reported_or_invalid' : null };
      };
      const work = async () => {
        for (let retry = 0; ; retry++) {
          // Retries wait their turn too; an abort ends the wait.
          if (pace) pacingWaitMs += await pace(controller.signal);
          if (beforeRequest) await beforeRequest();
          key = keySource();
          requireThat(typeof key === 'string' && key.length >= 16 && key.length <= 512 && !/[\r\n]/.test(key), 'scoped_key_unavailable');
          if (operation === 'generateContent') generationCalls++;
          else if (operation === 'countTokens') countCalls++;
          else metadataCalls++;
          const response = await fetchImpl(endpoint, { method, redirect: 'error', signal: controller.signal,
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
            ...(body === null ? {} : { body: JSON.stringify(body) }) });
          if (response.ok) return read(response);
          const diagnostic = await readDiagnostic(response, { signal: controller.signal, secret: key });
          log(formatDiagnostic(operation, diagnostic));
          // Honour Google's RetryInfo when present, else back off 2s, 4s, 8s, 16s inside this request's deadline.
          const wait = retryDelayMs(diagnostic) ?? 2000 * 2 ** retry;
          if (RETRYABLE_STATUS.has(response.status) && retry < GEMINI.maxRetries && performance.now() + wait < requestDeadline) {
            log(`Retrying Gemini ${operation} in ${wait} ms (retry ${retry + 1} of ${GEMINI.maxRetries}).`);
            automaticRetries++;
            await sleep(wait, undefined, { signal: controller.signal });
            continue;
          }
          lastFailure = { operation, httpStatus: response.status };
          lastFailureDiagnostic = diagnostic;
          throw new Error('http_failure');
        }
      };
      const result = await Promise.race([work(), new Promise((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error('request_timeout')); }, remaining);
      })]);
      requireThat(performance.now() < requestDeadline, 'request_timeout');
      return result;
    } catch (e) {
      stopped = true;
      const known = ['http_failure', 'response_size_limit', 'provider_secret_echo', 'request_timeout', 'scoped_key_unavailable'];
      // HTTP failures were already printed with their full body; print every other cause here.
      if (e.message !== 'http_failure') log(`Gemini ${operation} failed: ${redactKey(known.includes(e.message) ? e.message : describeCause(e), key)}`);
      throw new Error(known.includes(e.message) ? e.message : 'transport_failure');
    } finally { clearTimeout(timer); controller.abort(); key = null; busy = false; }
  }
  return {
    mode,
    profile,
    async modelMetadata(deadline) {
      const { data } = await request(GEMINI.endpoint.replace(':generateContent', ''), null, deadline, 'GET');
      requireThat(data.name === `models/${GEMINI.model}` && data.supportedGenerationMethods?.includes('generateContent')
        && Number.isSafeInteger(data.inputTokenLimit) && data.inputTokenLimit >= limits.contextTokens
        && Number.isSafeInteger(data.outputTokenLimit) && data.outputTokenLimit >= limits.maxOutputTokens, 'model_metadata_incompatible');
      return { name: data.name, inputTokenLimit: data.inputTokenLimit, outputTokenLimit: data.outputTokenLimit };
    },
    async count(requestBody, deadline) {
      validatePrepared(requestBody);
      const countRequest = prepareTokenCount(requestBody);
      const measured = await request(countRequest.endpoint, countRequest.body, deadline);
      // Independently tokenize the entire serialized request, so schema/steering
      // fields cannot disappear from the accepted working-context accounting.
      const serializedBody = { contents: [{ role: 'user', parts: [{ text: canonical(requestBody.body) }] }] };
      const serialized = await request(countRequest.endpoint, serializedBody, deadline);
      const inputTokens = measured.data.totalTokens, serializedTokens = serialized.data.totalTokens;
      requireThat([inputTokens, serializedTokens].every(n => Number.isSafeInteger(n) && n >= 0 && n < 1_000_000), 'token_count_unavailable');
      return { version: 'complete-request-count-v1', requestSha256: requestBody.requestSha256, inputTokens,
        serializedTokens, framingReservation: 256, completeInputTokenBound: Math.max(inputTokens, serializedTokens) + 256,
        completeRequestHash: digest(countRequest.body), serializedRequestHash: digest(serializedBody),
        tokenizer: GEMINI.model, mode, requestId: measured.requestId };
    },
    async generate(prepared, lease) {
      validatePrepared(prepared);
      requireThat(prepared.endpoint === GEMINI.endpoint && prepared.requestSha256 === digest(prepared.body)
        && lease.requestSha256 === prepared.requestSha256 && lease.outputReservation === prepared.body.generationConfig.maxOutputTokens,
      'generation_lease_binding_required');
      generationAttempts++;
      return request(GEMINI.endpoint, prepared.body, lease.deadlineMonotonicMs);
    },
    stop() { stopped = true; },
    counters() { return { generationCalls, generationAttempts, countCalls, metadataCalls, automaticRetries,
      pacingWaitMs: Math.round(pacingWaitMs), mode, profile, lastFailure,
      ...(lastFailureDiagnostic === null ? {} : { lastFailureDiagnostic }) }; },
  };
}
