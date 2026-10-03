// Hardened adaptation of the preserved continuation diagnostics and v2 candidate.
// Only fixed enums, numbers and trusted protocol field names leave this module.
export const ERROR_BYTES = 8192;
const statuses = new Set(['INVALID_ARGUMENT', 'RESOURCE_EXHAUSTED', 'UNAUTHENTICATED', 'PERMISSION_DENIED',
  'NOT_FOUND', 'UNAVAILABLE', 'DEADLINE_EXCEEDED', 'INTERNAL', 'FAILED_PRECONDITION', 'ABORTED', 'UNKNOWN']);
const fields = Object.freeze(['contents', 'systemInstruction', 'generationConfig',
  'generationConfig.candidateCount', 'generationConfig.maxOutputTokens', 'generationConfig.temperature',
  'generationConfig.responseModalities', 'generationConfig.thinkingConfig',
  'generationConfig.thinkingConfig.thinkingLevel', 'generationConfig.thinkingConfig.includeThoughts',
  'generationConfig.responseFormat', 'generationConfig.responseFormat.text',
  'generationConfig.responseFormat.text.mimeType', 'generationConfig.responseFormat.text.schema',
  'generationConfig.responseMimeType', 'generationConfig.responseJsonSchema', 'generationConfig.responseSchema']);
const snake = value => value.replace(/[A-Z]/g, char => `_${char.toLowerCase()}`);
const classifications = [
  ['schema_complexity', /(?:schema.{0,80}too (?:large|complex|deep)|too many states.{0,80}schema|maximum nesting depth)/i],
  ['unknown_parameter', /unknown (?:name|field|parameter)/i],
  ['schema_keyword_rejected', /(?:unsupported.{0,80}(?:schema|keyword)|(?:schema|keyword).{0,80}not supported)/i],
  ['thinking_configuration_rejected', /thinking.{0,80}(?:invalid|unsupported|not supported)/i],
  ['output_limit_rejected', /max[_ ]?output[_ ]?tokens.{0,80}(?:invalid|unsupported|exceed)/i],
];

export function sanitizeDiagnostic(bytes, { httpStatus, requestBody, secret = null }) {
  const result = { version: 'bounded-provider-diagnostic-v3-offline-proposal',
    httpStatus: Number.isSafeInteger(httpStatus) && httpStatus >= 100 && httpStatus <= 599 ? httpStatus : null,
    providerCode: null, providerStatus: null, fields: [], bodyUnavailableReason: null,
    messageClassification: 'unclassified', classificationIsConfirmedCause: false,
    providerProseRetained: false, rawBodyRetained: false };
  const discard = reason => ({ ...result, bodyUnavailableReason: reason });
  if (bytes === null) return discard('stream_unavailable');
  if (bytes.byteLength > ERROR_BYTES) return discard('error_body_limit');
  const text = Buffer.from(bytes).toString('utf8');
  if (typeof secret === 'string' && secret.length > 0 && text.includes(secret)) return discard('secret_echo_discarded');
  let raw;
  try { raw = JSON.parse(text); } catch { return discard('invalid_error_json'); }
  const error = raw?.error;
  if (!error || typeof error !== 'object' || Array.isArray(error)) return discard('unrecognized_error_shape');
  if (Number.isSafeInteger(error.code) && error.code === httpStatus) result.providerCode = error.code;
  if (statuses.has(error.status)) result.providerStatus = error.status;
  const allowed = fields.filter(path => {
    let value = requestBody;
    for (const key of path.split('.')) {
      if (!value || typeof value !== 'object' || !Object.hasOwn(value, key)) return false;
      value = value[key];
    }
    return true;
  });
  const found = new Set();
  for (const detail of Array.isArray(error.details) ? error.details.slice(0, 8) : []) {
    if (detail?.['@type'] !== 'type.googleapis.com/google.rpc.BadRequest') continue;
    for (const violation of Array.isArray(detail.fieldViolations) ? detail.fieldViolations.slice(0, 16) : []) {
      if (typeof violation?.field !== 'string' || violation.field.length > 256) continue;
      // Schema descendants and prompt positions collapse to a fixed protocol field.
      const match = [...allowed].reverse().find(path => [path, snake(path)].some(alias =>
        violation.field === alias || violation.field.startsWith(`${alias}.`) || violation.field.startsWith(`${alias}[`)));
      if (match) found.add(match);
    }
  }
  result.fields = [...found].sort().slice(0, 16);
  if (typeof error.message === 'string' && error.message.length <= 2048)
    result.messageClassification = classifications.find(([, pattern]) => pattern.test(error.message))?.[0] ?? 'unclassified';
  return result;
}

export async function readDiagnostic(response, { signal, requestBody, secret }) {
  const options = { httpStatus: response.status, requestBody, secret };
  const reader = response.body?.getReader();
  if (!reader) return sanitizeDiagnostic(null, options);
  const parts = []; let size = 0, onAbort;
  const aborted = new Promise((_, reject) => {
    onAbort = () => reject(new Error('request_timeout'));
    signal.addEventListener('abort', onAbort, { once: true });
  });
  try {
    if (signal.aborted) throw new Error('request_timeout');
    for (;;) {
      const { value, done } = await Promise.race([reader.read(), aborted]);
      if (done) break;
      size += value.byteLength;
      if (size > ERROR_BYTES) return sanitizeDiagnostic(new Uint8Array(ERROR_BYTES + 1), options);
      parts.push(Buffer.from(value));
    }
    return sanitizeDiagnostic(Buffer.concat(parts), options);
  } catch (error) {
    if (signal.aborted || error.message === 'request_timeout') throw new Error('request_timeout');
    return { ...sanitizeDiagnostic(null, options), bodyUnavailableReason: 'error_stream_failure' };
  } finally {
    signal.removeEventListener('abort', onAbort);
    reader.cancel().catch(() => {});
    for (const part of parts) part.fill(0);
  }
}
