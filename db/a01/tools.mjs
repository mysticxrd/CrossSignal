import { contentHash, validateObservable, validateQuery, VERSION } from './contracts.mjs';
export function queryObservable(input, scope, tool, args) {
    validateObservable(input, scope);
    const queryHash = validateQuery(tool, args, scope);
    const rows = input.events.filter(e => e.at > args.start && e.at <= args.end).filter(e => {
        if (tool === 'revenue.inspect')
            return e.type === 'revenue_window' && (args.segment === null || e.payload.segment === args.segment);
        if (tool === 'engineering.inspect')
            return e.type === (args.kind === 'changes' ? 'deployment' : 'service_health') && e.payload.service === args.service;
        return e.type === 'support_message' && (args.segment === null || e.payload.segment === args.segment) && e.payload.message.toLowerCase().includes(args.query.toLowerCase());
    }).sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
    const offset = args.cursor === null ? 0 : Number(args.cursor.split(':')[1]);
    const events = rows.slice(offset, offset + args.limit), truncated = offset + events.length < rows.length;
    const body = { caseRef: scope.caseId, queryId: `query-${contentHash({ queryHash, cursor: args.cursor }).slice(0, 24)}`, asOf: scope.clock, sourceVersion: VERSION, events, nextCursor: truncated ? `${queryHash}:${offset + events.length}` : null, truncated };
    return { ...body, contentHash: contentHash(body) };
}
