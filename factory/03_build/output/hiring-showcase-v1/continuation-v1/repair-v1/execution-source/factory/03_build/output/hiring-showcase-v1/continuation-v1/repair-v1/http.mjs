import { validateWireSchema } from './wire.mjs';
// Additive copy of original HTTP core; only import routing and output-format
// validation changed. Original endpoint, counting, caps, timers and retry code remain.
import { performance } from 'node:perf_hooks';
import { canonical, digest, exact, requireThat } from '../../../../../../db/benchmark/contracts.mjs';
import { prepareTokenCount } from '../../../../../../db/benchmark/gemini-context.mjs';
import { GEMINI } from '../../../../../../db/benchmark/gemini-config.mjs';

// Core HTTP routine is dependency-injected only for explicitly labelled offline tests.
// Online entrypoint supplies global fetch and a verified host-only key source.
export function createHttpTransport({ fetchImpl, keySource, mode, beforeRequest = null }) {
  requireThat(['OFFLINE_FIXTURE', 'FREE_TIER_BENCHMARK'].includes(mode), 'invalid_transport_mode');
  requireThat(mode !== 'FREE_TIER_BENCHMARK' || typeof beforeRequest === 'function', 'verified_host_gate_required');
  let busy = false, generationCalls = 0, generationAttempts = 0, countCalls = 0, metadataCalls = 0, stopped = false, lastFailure = null;
  function validatePrepared(prepared) {
    requireThat(prepared.provider === 'gemini' && prepared.endpoint === GEMINI.endpoint
      && prepared.requestSha256 === digest(prepared.body), 'request_binding_mismatch');
    exact(prepared.body,['systemInstruction','contents','generationConfig'],'generation body');
    const config=prepared.body.generationConfig;
    exact(config,['candidateCount','maxOutputTokens','temperature','responseModalities','thinkingConfig','responseMimeType','responseJsonSchema'],'generation config');
    requireThat(config.candidateCount===1 && config.temperature===1
      && Number.isSafeInteger(config.maxOutputTokens) && config.maxOutputTokens>0 && config.maxOutputTokens<=1024
      && JSON.stringify(config.responseModalities)==='["TEXT"]'
      && config.thinkingConfig?.thinkingLevel==='MINIMAL' && config.thinkingConfig.includeThoughts===false
      && config.responseMimeType==='application/json' && config.responseJsonSchema?.type==='object','fixed_generation_configuration_required');
    exact(config.thinkingConfig,['thinkingLevel','includeThoughts'],'thinking config');
    validateWireSchema(config.responseJsonSchema);
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
    let timer, key;
    try {
      const work = async () => {
        if (beforeRequest) await beforeRequest();
        key = keySource();
        requireThat(typeof key === 'string' && key.length >= 16 && key.length <= 512 && !/[\r\n]/.test(key), 'scoped_key_unavailable');
        if(endpoint.endsWith(':generateContent')) generationCalls++;
        else if(endpoint.endsWith(':countTokens')) countCalls++;
        else metadataCalls++;
        const response = await fetchImpl(endpoint, { method, redirect: 'error', signal: controller.signal,
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          ...(body === null ? {} : { body: JSON.stringify(body) }) });
        if (!response.ok) {
          lastFailure = { operation: endpoint.endsWith(':generateContent') ? 'generateContent'
            : endpoint.endsWith(':countTokens') ? 'countTokens' : 'modelMetadata', httpStatus: response.status };
          throw new Error('http_failure');
        }
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
      const result = await Promise.race([work(), new Promise((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error('request_timeout')); }, remaining);
      })]);
      requireThat(performance.now() < requestDeadline, 'request_timeout');
      return result;
    } catch (e) {
      stopped = true;
      const known = ['http_failure', 'response_size_limit', 'provider_secret_echo', 'request_timeout', 'scoped_key_unavailable'];
      throw new Error(known.includes(e.message) ? e.message : 'transport_failure');
    } finally { clearTimeout(timer); controller.abort(); key = null; busy = false; }
  }
  return {
    mode,
    async modelMetadata(deadline) {
      const { data } = await request(GEMINI.endpoint.replace(':generateContent', ''), null, deadline, 'GET');
      requireThat(data.name === `models/${GEMINI.model}` && data.supportedGenerationMethods?.includes('generateContent')
        && Number.isSafeInteger(data.inputTokenLimit) && data.inputTokenLimit >= GEMINI.contextTokens
        && Number.isSafeInteger(data.outputTokenLimit) && data.outputTokenLimit >= GEMINI.maxOutputTokens, 'model_metadata_incompatible');
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
    counters() { return { generationCalls, generationAttempts, countCalls, metadataCalls, automaticRetries: 0, mode, lastFailure }; },
  };
}
