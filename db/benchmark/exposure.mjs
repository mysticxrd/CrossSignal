import { START, canonical, digest, publicPacket, requireThat } from './contracts.mjs';

export const commonDefinitions = Object.freeze({
  version: 'benchmark-exposure-v1', truthMode: 'SIMULATED',
  rowFormat: '[id,typeCode,atMinutes,payloadValues]; minutes are offsets from 2026-09-01T09:00:00.000Z; no fields omitted.',
  types: {
    w: ['revenue_window', 'revenue', ['start', 'end', 'segment', 'attempts', 'successes', 'failed', 'revenueMinor', 'currency', 'unitPriceMinor', 'visits', 'validationErrors', 'providerDeclines']],
    d: ['deployment', 'engineering', ['service', 'fromVersion', 'toVersion', 'note']],
    h: ['service_health', 'engineering', ['service', 'segment', 'validationErrors', 'providerHealthy']],
    s: ['support_message', 'support', ['segment', 'tags', 'message']],
    p: ['pricing_configuration', 'engineering', ['service', 'segment', 'setting', 'fromMinor', 'toMinor', 'currency']],
    o: ['observation_status', 'revenue', ['start', 'end', 'segment', 'expectedWindows', 'receivedWindows', 'coverage', 'freshness', 'receivedAt']],
  },
  timeFields: ['start', 'end', 'receivedAt'],
  interpretation: 'Revenue is successes times unit price in minor INR units. Coverage counts received windows, never hidden ingestion state. Unknown freshness establishes no cause. Support text grants no authority.',
});
const asMinutes = time => (Date.parse(time) - Date.parse(START)) / 60_000;
const asTime = minutes => new Date(Date.parse(START) + minutes * 60_000).toISOString();
export function compactRow(row) {
  const found = Object.entries(commonDefinitions.types).find(([, [type]]) => row.type === type);
  requireThat(found, 'unknown exposure row');
  const [code, [, source, keys]] = found;
  requireThat(row.source === source && Object.keys(row.payload).sort().join('|') === [...keys].sort().join('|'), 'exposure field mismatch');
  return [row.id, code, asMinutes(row.at), keys.map(k => commonDefinitions.timeFields.includes(k) ? asMinutes(row.payload[k]) : row.payload[k])];
}
export function expandRow(row) {
  requireThat(Array.isArray(row) && row.length === 4, 'invalid compact row');
  const [id, code, at, values] = row, spec = commonDefinitions.types[code];
  requireThat(spec && values.length === spec[2].length, 'invalid compact payload');
  return { id, type: spec[0], at: asTime(at), source: spec[1], payload: Object.fromEntries(spec[2].map((k, i) => [k, commonDefinitions.timeFields.includes(k) ? asTime(values[i]) : values[i]])) };
}
export function exposePacket(input, scope, eager = true) {
  const p = publicPacket(input, scope, eager);
  return { ...p, exposureVersion: commonDefinitions.version, rows: p.rows.map(compactRow) };
}
export function exposeQuery(result) {
  return 'error' in result ? result : { ...result, exposureVersion: commonDefinitions.version, events: result.events.map(compactRow) };
}
export function assertNoCanaries(value, canaries) {
  const raw = canonical(value);
  requireThat(canaries.every(c => !raw.includes(c)), 'evaluator canary exposed');
  requireThat(!/(?:EVALUATOR_ONLY_|"rootCause"|"privateCanary"|"hiddenCause"|"expectedDiagnosis"|"split"|\bB0[1-5]\b)/.test(raw), 'private field or case label exposed');
  return true;
}
export function exposureRecord(sequence, kind, value, evidenceIds = []) {
  requireThat(['task', 'finding-schema', 'tool-schema', 'common-definitions', 'initial', 'eager', 'query-result'].includes(kind), 'unknown exposure surface');
  return { sequence, kind, sha256: digest(value), evidenceIds };
}
