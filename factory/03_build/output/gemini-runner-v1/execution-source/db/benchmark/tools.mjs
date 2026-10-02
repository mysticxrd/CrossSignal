import { digest, LIMITS, publicRow, requireThat, validateObservable, validateQuery } from './contracts.mjs';

export function queryObservable(input, scope, tool, args) {
  validateObservable(input, scope);
  const queryHash = validateQuery(tool, args, scope);
  const rows = input.events.filter(e => e.at > args.start && e.at <= args.end).filter(e => {
    if (tool === 'revenue.inspect') return ['revenue_window', 'observation_status'].includes(e.type) && (args.segment === null || e.payload.segment === args.segment);
    if (tool === 'engineering.inspect') return (args.kind === 'changes' ? ['deployment', 'pricing_configuration'].includes(e.type) : e.type === 'service_health') && e.payload.service === args.service;
    return e.type === 'support_message' && (args.segment === null || e.payload.segment === args.segment) && e.payload.message.toLowerCase().includes(args.query.toLowerCase());
  }).sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
  const offset = args.cursor === null ? 0 : Number(args.cursor.split(':')[1]);
  requireThat(offset <= rows.length && (offset === 0 || offset % args.limit === 0), 'cursor offset mismatch');
  const events = rows.slice(offset, offset + args.limit).map(publicRow);
  const truncated = offset + events.length < rows.length;
  return { truthMode: 'SIMULATED', caseRef: input.caseRef, asOf: scope.clock, queryHash, events, truncated,
    nextCursor: truncated ? `${queryHash}:${offset + events.length}` : null };
}
// This read-only Data prototype is not a recorder or an API investigator.
export function createSession(input, scope) {
  validateObservable(input, scope);
  let attempts = 0;
  const exposures = [];
  return {
    query(tool, args) {
      requireThat(attempts < LIMITS.toolAttempts, 'tool attempt budget exhausted');
      attempts++;
      try {
        const result = queryObservable(input, scope, tool, args);
        exposures.push({ sequence: attempts, requestHash: digest({ tool, args }), resultHash: digest(result), evidenceIds: result.events.map(e => e.id), status: 'returned' });
        return result;
      } catch {
        const result = { error: 'invalid_read_only_request', attempt: attempts };
        exposures.push({ sequence: attempts, requestHash: digest({ tool, args }), resultHash: digest(result), evidenceIds: [], status: 'denied' });
        return result;
      }
    },
    trace() { return structuredClone(exposures); },
  };
}
