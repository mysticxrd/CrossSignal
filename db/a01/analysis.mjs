// Observable-only calculations. No simulator or evaluator imports.
import { contentHash, SEGMENTS, requireThat } from './contracts.mjs';
export function signalFrom(events) {
    const rows = events.filter(e => e.type === 'revenue_window');
    const metrics = SEGMENTS.map(segment => {
        const r = rows.filter(e => e.payload.segment === segment).sort((a, b) => a.at.localeCompare(b.at));
        const base = r.filter(e => e.at <= '2026-09-01T09:30:00.000Z');
        const incident = r.filter(e => e.at > '2026-09-01T09:30:00.000Z' && e.at <= '2026-09-01T10:00:00.000Z');
        const baseline = base.length === 2 ? base.reduce((n, e) => n + e.payload.successes / e.payload.attempts, 0) / 2 : null;
        const rates = incident.map(e => e.payload.successes / e.payload.attempts);
        const enough = base.length === 2 && incident.length === 2 && [...base, ...incident].every(e => e.payload.attempts >= 200);
        return { segment, baseline, rates, enough, dropped: enough && baseline > 0 && rates.every(r => (baseline - r) / baseline >= .30), stable: enough && rates.every(r => Math.abs(r - baseline) <= .05), evidenceIds: [...base, ...incident].map(e => e.id) };
    });
    const affected = metrics.filter(m => m.dropped);
    const detected = affected.length === 1 && metrics.filter(m => !m.dropped).every(m => m.stable);
    return { detected, segment: detected ? affected[0].segment : null, metrics, evidenceIds: metrics.flatMap(m => m.evidenceIds) };
}
export function outcomeFrom(events, signal) {
    const rows = events.filter(e => e.type === 'revenue_window' && e.at > '2026-09-01T10:00:00.000Z');
    const groups = SEGMENTS.map(segment => ({ segment, rows: rows.filter(e => e.payload.segment === segment).sort((a, b) => a.at.localeCompare(b.at)).slice(-2) }));
    const sufficient = signal.detected && groups.every(g => g.rows.length === 2 && Date.parse(g.rows[1].at) - Date.parse(g.rows[0].at) === 900000 && g.rows.every(e => e.payload.attempts >= 200)) && new Set(groups.map(g => g.rows.map(e => e.at).join('|'))).size === 1;
    const recovered = sufficient && groups.every(g => g.rows.every(e => g.segment === signal.segment ? e.payload.successes / e.payload.attempts >= .94 : Math.abs(e.payload.successes / e.payload.attempts - signal.metrics.find(m => m.segment === g.segment).baseline) <= .05));
    return { truthMode: 'SIMULATED', status: recovered ? 'resolved' : 'uncertain', sufficient: Boolean(sufficient), recovered: Boolean(recovered), evidenceIds: groups.flatMap(g => g.rows.map(e => e.id)).sort() };
}
export function verifyDigest(value) {
    const { contentHash: digest, ...body } = value;
    requireThat(digest === contentHash(body), 'content hash mismatch');
    return value;
}
