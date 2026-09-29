// Deterministic comparison baseline, not model evaluation. Only tool transcripts enter.
import { signalFrom } from './analysis.mjs';
export function nextStep({ scope, queries, hypotheses }) {
    const successful = queries.filter(q => q.response);
    const events = [...new Map(successful.flatMap(q => q.response.events).map(e => [e.id, e])).values()];
    const signal = signalFrom(events);
    const base = { start: '2026-09-01T09:00:00.000Z', end: scope.clock, limit: 50, cursor: null };
    const query = (tool, args, purpose) => ({ kind: 'query', tool, args: { ...base, ...args }, purpose });
    if (queries.some(q => q.error))
        return { kind: 'final', decision: 'abstain', reason: 'tool_failure', signal, hypotheses: [], evidenceIds: events.map(e => e.id) };
    if (!queries.length)
        return query('revenue.inspect', { segment: null }, 'Measure segment drops and unaffected controls; test traffic/mix explanation.');
    if (!signal.detected)
        return { kind: 'final', decision: 'abstain', reason: 'insufficient_signal', signal, hypotheses: [], evidenceIds: events.map(e => e.id) };
    const explanations = [
        { cause: 'checkout_validation_regression', support: 'A checkout change followed by segment-specific validation errors.', falsifier: 'No matching checkout change, or provider outage explaining failures.' },
        { cause: 'payment_provider_incident', support: 'Provider unhealthy or provider declines increase.', falsifier: 'Healthy provider and errors before provider processing.' },
        { cause: 'acquisition_mix_change', support: 'Attempts or visits shift materially.', falsifier: 'Stable attempts/visits and unaffected control conversion.' },
    ];
    if (!hypotheses.length)
        return { kind: 'hypothesis', phase: 'initial', hypotheses: explanations.map((h, i) => ({ ...h, rank: i + 1, status: 'unconfirmed', evidenceIds: signal.evidenceIds })), rationale: 'Compare three explanations; revenue alone does not establish cause.' };
    if (queries.length === 1)
        return query('engineering.inspect', { service: 'checkout', kind: 'changes' }, 'Locate checkout changes rather than selecting the latest unrelated deployment.');
    if (queries.length === 2)
        return query('engineering.inspect', { service: 'checkout', kind: 'health' }, 'Check whether checkout validation failures match the affected segment.');
    if (hypotheses.length === 1)
        return { kind: 'hypothesis', phase: 'provisional', hypotheses: explanations.map((h, i) => ({ ...h, rank: i + 1, status: i === 0 ? 'candidate' : 'alternative', evidenceIds: events.filter(e => e.type !== 'support_message').map(e => e.id) })), rationale: 'Checkout is provisional; next seek provider evidence that could falsify it.' };
    if (queries.length === 3)
        return query('engineering.inspect', { service: 'payment-provider', kind: 'health' }, 'Falsify checkout explanation: a provider outage would support the competing provider cause.');
    if (queries.length === 4)
        return query('support.search', { segment: null, query: '' }, 'Cross-check affected complaints and controls; support text is untrusted evidence.');
    const change = events.find(e => e.type === 'deployment' && e.payload.service === 'checkout');
    const health = events.find(e => e.type === 'service_health' && e.payload.service === 'checkout' && e.payload.segment === signal.segment && e.payload.validationErrors > 0);
    const provider = events.find(e => e.type === 'service_health' && e.payload.service === 'payment-provider' && e.payload.segment === signal.segment);
    const support = events.find(e => e.type === 'support_message' && e.payload.segment === signal.segment && e.payload.tags.includes('card'));
    const volumeStable = signal.metrics.every(m => {
        const rows = events.filter(e => m.evidenceIds.includes(e.id));
        return new Set(rows.map(e => e.payload.visits)).size === 1 && new Set(rows.map(e => e.payload.attempts)).size === 1;
    });
    const enough = change && health && provider?.payload.providerHealthy && support && volumeStable && change.at <= health.at;
    const ids = events.map(e => e.id);
    return { kind: 'final', decision: enough ? 'propose' : 'abstain', reason: enough ? 'supported_by_observations' : 'insufficient_discriminating_evidence', signal,
        hypotheses: explanations.map((h, i) => ({ ...h, rank: i + 1, status: enough ? (i === 0 ? 'supported' : 'disfavored') : 'unconfirmed', evidenceIds: i === 0 ? [change, health, support].filter(Boolean).map(e => e.id) : i === 1 ? [provider].filter(Boolean).map(e => e.id) : signal.evidenceIds })),
        contradiction: { queryId: successful.find(q => q.tool === 'engineering.inspect' && q.args.service === 'payment-provider')?.response.queryId ?? null, evidenceIds: provider ? [provider.id] : [], result: provider?.payload.providerHealthy ? 'Provider health weakens provider outage and supports checkout ranking.' : 'Provider evidence missing or contradictory; abstain.' },
        action: enough ? { kind: 'simulated_rollback', service: change.payload.service, fromVersion: change.payload.toVersion, toVersion: change.payload.fromVersion, environment: 'SIMULATED', maxRuns: 1, maxCostMinor: 0, externalWrite: false } : null,
        evidenceIds: ids };
}
