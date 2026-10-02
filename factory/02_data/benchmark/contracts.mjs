import { createHash } from 'node:crypto';

export const VERSION = 'incident-data-v2';
export const SEGMENTS = Object.freeze(['IN/debit', 'IN/credit', 'GB/debit']);
export const SERVICES = Object.freeze(['checkout', 'notifications', 'payment-provider', 'pricing']);
export const START = '2026-09-01T09:00:00.000Z';
export const CUTOFF = '2026-09-01T10:00:00.000Z';
export const LIMITS = Object.freeze({ events: 200, rows: 50, queryCharacters: 160, toolAttempts: 10 });
export const TYPES = Object.freeze(['revenue_window', 'deployment', 'service_health', 'support_message', 'pricing_configuration', 'observation_status']);
export function requireThat(value, message) { if (!value) throw new TypeError(message); }
export function exact(value, keys, label) {
  requireThat(value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).sort().join('|') === [...keys].sort().join('|'), `${label}: unknown/missing fields`);
}
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
export function digest(value) { return createHash('sha256').update(typeof value === 'string' ? value : canonical(value)).digest('hex'); }
export const opaqueId = (value) => typeof value === 'string' && /^[cewra]_[a-f0-9]{12}$/.test(value);
const count = value => Number.isSafeInteger(value) && value >= 0 && value <= 100_000_000;
const text = (value, max) => typeof value === 'string' && value.length <= max;
export function time(value) {
  requireThat(typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.000Z$/.test(value)
    && new Date(value).toISOString() === value, 'invalid timestamp');
  return Date.parse(value);
}
export function validateScope(scope) {
  exact(scope, ['workspaceId', 'caseId', 'runId', 'actorId', 'start', 'clock'], 'trusted scope');
  requireThat([scope.workspaceId, scope.caseId, scope.runId, scope.actorId].every(opaqueId), 'invalid host identity');
  requireThat(scope.workspaceId.startsWith('w_') && scope.caseId.startsWith('c_') && scope.runId.startsWith('r_') && scope.actorId.startsWith('a_'), 'identity role mismatch');
  requireThat(scope.start === START && scope.clock === CUTOFF, 'unfrozen observation interval');
}
export function validateEvent(event, scope) {
  validateScope(scope);
  exact(event, ['id', 'workspaceId', 'caseId', 'runId', 'type', 'at', 'source', 'sourceVersion', 'truthMode', 'payload', 'contentHash'], 'event');
  requireThat(opaqueId(event.id) && event.id.startsWith('e_') && event.workspaceId === scope.workspaceId
    && event.caseId === scope.caseId && event.runId === scope.runId, 'event scope mismatch');
  requireThat(event.sourceVersion === VERSION && event.truthMode === 'SIMULATED', 'event version/truth mismatch');
  requireThat(time(event.at) > time(scope.start) && time(event.at) <= time(scope.clock), 'event time outside cutoff');
  const p = event.payload;
  if (event.type === 'revenue_window') {
    exact(p, ['start', 'end', 'segment', 'attempts', 'successes', 'failed', 'revenueMinor', 'currency', 'unitPriceMinor', 'visits', 'validationErrors', 'providerDeclines'], 'revenue');
    requireThat(event.source === 'revenue' && SEGMENTS.includes(p.segment) && p.end === event.at
      && time(p.end) - time(p.start) === 900_000 && time(p.start) >= time(scope.start), 'revenue window mismatch');
    requireThat([p.attempts, p.successes, p.failed, p.revenueMinor, p.unitPriceMinor, p.visits, p.validationErrors, p.providerDeclines].every(count)
      && p.attempts <= 100_000 && p.unitPriceMinor >= 1 && p.unitPriceMinor <= 100_000 && p.visits >= p.attempts
      && p.attempts === p.successes + p.failed && p.failed === p.validationErrors + p.providerDeclines
      && p.revenueMinor === p.successes * p.unitPriceMinor && Number.isSafeInteger(p.revenueMinor) && p.currency === 'INR', 'ledger mismatch');
  } else if (event.type === 'deployment') {
    exact(p, ['service', 'fromVersion', 'toVersion', 'note'], 'deployment');
    requireThat(event.source === 'engineering' && SERVICES.includes(p.service) && /^v\d+$/.test(p.fromVersion)
      && /^v\d+$/.test(p.toVersion) && text(p.note, 240), 'invalid deployment');
  } else if (event.type === 'service_health') {
    exact(p, ['service', 'segment', 'validationErrors', 'providerHealthy'], 'health');
    requireThat(event.source === 'engineering' && SERVICES.includes(p.service) && SEGMENTS.includes(p.segment)
      && count(p.validationErrors) && typeof p.providerHealthy === 'boolean', 'invalid health');
  } else if (event.type === 'support_message') {
    exact(p, ['segment', 'tags', 'message'], 'support');
    requireThat(event.source === 'support' && SEGMENTS.includes(p.segment) && Array.isArray(p.tags)
      && p.tags.length <= 4 && p.tags.every(t => ['checkout', 'card', 'unrelated', 'untrusted'].includes(t)) && text(p.message, 500), 'invalid support');
  } else if (event.type === 'pricing_configuration') {
    exact(p, ['service', 'segment', 'setting', 'fromMinor', 'toMinor', 'currency'], 'pricing configuration');
    requireThat(event.source === 'engineering' && p.service === 'pricing' && SEGMENTS.includes(p.segment)
      && p.setting === 'unit_price_minor' && [p.fromMinor, p.toMinor].every(n => count(n) && n >= 1 && n <= 100_000)
      && p.currency === 'INR', 'invalid pricing configuration');
  } else if (event.type === 'observation_status') {
    exact(p, ['start', 'end', 'segment', 'expectedWindows', 'receivedWindows', 'coverage', 'freshness', 'receivedAt'], 'observation status');
    requireThat(event.source === 'revenue' && SEGMENTS.includes(p.segment) && time(p.start) >= time(scope.start)
      && p.end === event.at && (time(p.end) - time(p.start)) % 900_000 === 0
      && p.expectedWindows === (time(p.end) - time(p.start)) / 900_000
      && count(p.receivedWindows) && p.receivedWindows <= p.expectedWindows
      && p.coverage === (p.receivedWindows === 0 ? 'missing' : p.receivedWindows === p.expectedWindows ? 'complete' : 'partial')
      && p.freshness === 'unknown' && p.receivedAt === scope.clock, 'invalid observed missingness');
  } else throw new TypeError('unknown event type');
  const { contentHash, ...body } = event;
  requireThat(/^[a-f0-9]{64}$/.test(contentHash) && contentHash === digest(body), 'event content hash mismatch');
  return event;
}
export function validateObservable(input, scope) {
  exact(input, ['version', 'caseRef', 'truthMode', 'asOf', 'events'], 'observable');
  requireThat(input.version === VERSION && input.caseRef === scope.caseId && input.truthMode === 'SIMULATED'
    && input.asOf === scope.clock && Array.isArray(input.events) && input.events.length <= LIMITS.events, 'invalid observable');
  const seen = new Set();
  for (const e of input.events) { validateEvent(e, scope); requireThat(!seen.has(e.id), 'duplicate evidence'); seen.add(e.id); }
  const statuses = input.events.filter(e => e.type === 'observation_status');
  requireThat(statuses.length === SEGMENTS.length && new Set(statuses.map(e => e.payload.segment)).size === SEGMENTS.length
    && statuses.every(e => e.payload.start === scope.start && e.payload.end === scope.clock), 'missing complete coverage metadata');
  for (const status of input.events.filter(e => e.type === 'observation_status')) {
    const p = status.payload;
    const rows = input.events.filter(e => e.type === 'revenue_window' && e.payload.segment === p.segment && e.at > p.start && e.at <= p.end);
    requireThat(rows.length === p.receivedWindows && new Set(rows.map(e => e.at)).size === rows.length, 'missingness/window mismatch');
  }
  return input;
}
// Host-only identity rebinding for fresh comparison runs. Frozen evidence IDs/facts stay stable.
export function bindRun(input, sourceScope, freshScope) {
  validateObservable(input, sourceScope); validateScope(freshScope);
  const events = input.events.map(e => {
    const { contentHash, ...body } = e; void contentHash;
    const fresh = { ...structuredClone(body), workspaceId: freshScope.workspaceId, caseId: freshScope.caseId, runId: freshScope.runId };
    return { ...fresh, contentHash: digest(fresh) };
  });
  return validateObservable({ ...input, caseRef: freshScope.caseId, events }, freshScope);
}
export function validateQuery(tool, args, scope) {
  validateScope(scope);
  const fields = { 'revenue.inspect': ['segment'], 'engineering.inspect': ['service', 'kind'], 'support.search': ['segment', 'query'] }[tool];
  requireThat(fields, 'unknown domain tool');
  exact(args, ['start', 'end', 'limit', 'cursor', ...fields], 'tool arguments');
  requireThat(time(args.start) >= time(scope.start) && time(args.start) < time(args.end) && time(args.end) <= time(scope.clock), 'query time scope mismatch');
  requireThat(Number.isSafeInteger(args.limit) && args.limit >= 1 && args.limit <= LIMITS.rows, 'invalid query limit');
  requireThat(args.cursor === null || (typeof args.cursor === 'string' && /^[a-f0-9]{64}:\d{1,3}$/.test(args.cursor)), 'invalid cursor');
  if ('segment' in args) requireThat(args.segment === null || SEGMENTS.includes(args.segment), 'invalid segment');
  if (tool === 'engineering.inspect') requireThat(SERVICES.includes(args.service) && ['changes', 'health'].includes(args.kind), 'invalid engineering query');
  if (tool === 'support.search') requireThat(text(args.query, LIMITS.queryCharacters), 'invalid support query');
  const { cursor, ...body } = args;
  const queryHash = digest({ tool, args: body, scope });
  if (cursor !== null) requireThat(cursor.startsWith(`${queryHash}:`) && Number(cursor.split(':')[1]) <= LIMITS.events, 'cursor scope mismatch');
  return queryHash;
}
export function publicRow(event) { return { id: event.id, type: event.type, at: event.at, source: event.source, payload: event.payload }; }
export function signal(input, scope) {
  validateObservable(input, scope);
  const midpoint = '2026-09-01T09:30:00.000Z';
  const aggregate = post => input.events.filter(e => e.type === 'revenue_window' && (e.at > midpoint) === post)
    .reduce((a, e) => ({ revenueMinor: a.revenueMinor + e.payload.revenueMinor, attempts: a.attempts + e.payload.attempts,
      successes: a.successes + e.payload.successes, visits: a.visits + e.payload.visits, receivedWindows: a.receivedWindows + 1 }),
    { revenueMinor: 0, attempts: 0, successes: 0, visits: 0, receivedWindows: 0 });
  return { kind: 'observed_aggregate_revenue_change', currency: 'INR', pre: aggregate(false), post: aggregate(true),
    complete: input.events.filter(e => e.type === 'observation_status').every(e => e.payload.coverage === 'complete'),
    interpretation: 'Received rows only; a decline with incomplete coverage does not establish a business decline.' };
}
export function publicPacket(input, scope, eager = true) {
  validateObservable(input, scope);
  return { version: VERSION, truthMode: 'SIMULATED', caseRef: input.caseRef, start: scope.start, asOf: scope.clock,
    signal: signal(input, scope), rows: eager ? input.events.map(publicRow) : [] };
}
