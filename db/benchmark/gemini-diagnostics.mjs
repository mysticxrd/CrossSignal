// Reads a failed Gemini response so the operator sees Google's complete error.
// The API key is the only value hidden; the rest of the body is kept verbatim.
export const ERROR_BYTES = 1_000_000;
export const REDACTED_KEY = '[REDACTED_API_KEY]';

export function redactKey(text, secret) {
  return typeof secret === 'string' && secret.length > 0 ? String(text).replaceAll(secret, REDACTED_KEY) : String(text);
}

// replaceAll cannot see a key that truncation cut in half, so drop any key prefix left at the cut.
function trimKeyPrefix(text, secret) {
  if (typeof secret !== 'string') return text;
  for (let n = secret.length - 1; n > 0; n--) if (text.endsWith(secret.slice(0, n))) return text.slice(0, -n);
  return text;
}

export function describeError(bytes, { httpStatus, secret = null, truncated = false }) {
  const result = { httpStatus, providerStatus: null, message: null, body: null, truncated, bodyUnavailableReason: null };
  if (bytes === null) return { ...result, bodyUnavailableReason: 'stream_unavailable' };
  const text = redactKey(Buffer.from(bytes).toString('utf8'), secret);
  result.body = truncated ? trimKeyPrefix(text, secret) : text;
  try {
    const error = JSON.parse(result.body)?.error;
    if (typeof error?.status === 'string') result.providerStatus = error.status;
    if (typeof error?.message === 'string') result.message = error.message;
  } catch { /* Non-JSON bodies (HTML gateways, proxies) are kept verbatim. */ }
  return result;
}

// Google's RetryInfo detail carries the wait it wants, e.g. { retryDelay: "37s" }.
export function retryDelayMs(diagnostic) {
  try {
    const details = JSON.parse(diagnostic?.body ?? 'null')?.error?.details;
    const info = Array.isArray(details) ? details.find(d => d?.['@type'] === 'type.googleapis.com/google.rpc.RetryInfo') : null;
    const match = /^(\d+(?:\.\d+)?)s$/.exec(info?.retryDelay ?? '');
    return match ? Math.ceil(Number(match[1]) * 1000) : null;
  } catch { return null; }
}

export function formatDiagnostic(operation, diagnostic) {
  const status = [diagnostic.httpStatus, diagnostic.providerStatus].filter(Boolean).join(' ');
  const body = diagnostic.body ?? `(no response body: ${diagnostic.bodyUnavailableReason})`;
  return `Gemini ${operation} failed: HTTP ${status}${diagnostic.truncated ? ` (body truncated at ${ERROR_BYTES} bytes)` : ''}\n${body}`;
}

export async function readDiagnostic(response, { signal, secret }) {
  const options = { httpStatus: response.status, secret };
  const reader = response.body?.getReader();
  if (!reader) return describeError(null, options);
  const parts = []; let size = 0, truncated = false, onAbort;
  const aborted = new Promise((_, reject) => {
    onAbort = () => reject(new Error('request_timeout'));
    signal.addEventListener('abort', onAbort, { once: true });
  });
  aborted.catch(() => {});
  try {
    if (signal.aborted) throw new Error('request_timeout');
    for (;;) {
      const { value, done } = await Promise.race([reader.read(), aborted]);
      if (done) break;
      parts.push(Buffer.from(value)); size += value.byteLength;
      if (size > ERROR_BYTES) { truncated = true; break; }
    }
    return describeError(Buffer.concat(parts).subarray(0, ERROR_BYTES), { ...options, truncated });
  } catch (error) {
    if (signal.aborted || error.message === 'request_timeout') throw new Error('request_timeout');
    return { ...describeError(null, options), bodyUnavailableReason: `error_stream_failure: ${redactKey(error.message, secret)}` };
  } finally {
    signal.removeEventListener('abort', onAbort);
    reader.cancel().catch(() => {});
  }
}
