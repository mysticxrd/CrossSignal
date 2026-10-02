// Evaluator-only typed facts. Causal prose/relevance still require blinded human adjudication.
import { SEGMENTS } from './contracts.mjs';

export const PREDICATES = Object.freeze(['conversion_drop', 'conversion_stable', 'validation_increased', 'validation_stable',
  'provider_healthy', 'provider_unhealthy', 'deployment_observed', 'traffic_stable', 'traffic_mix_changed',
  'aggregate_revenue_drop', 'price_stable', 'price_drop', 'pricing_change_observed', 'successes_stable', 'support_report', 'missing_windows']);
function pairs(rows, target) {
  const selected = rows.filter(e => e.type === 'revenue_window' && (target === null || e.payload.segment === target));
  return [...new Set(selected.map(e => e.payload.segment))].map(segment => {
    const pre = selected.filter(e => e.payload.segment === segment && e.at <= '2026-09-01T09:30:00.000Z');
    const post = selected.filter(e => e.payload.segment === segment && e.at > '2026-09-01T09:30:00.000Z');
    const sum = list => list.reduce((a, e) => ({ attempts: a.attempts + e.payload.attempts, successes: a.successes + e.payload.successes,
      revenueMinor: a.revenueMinor + e.payload.revenueMinor, visits: a.visits + e.payload.visits, validationErrors: a.validationErrors + e.payload.validationErrors,
      providerDeclines: a.providerDeclines + e.payload.providerDeclines }), { attempts: 0, successes: 0, revenueMinor: 0, visits: 0, validationErrors: 0, providerDeclines: 0 });
    return { segment, pre, post, a: sum(pre), b: sum(post) };
  });
}
export function evaluatePredicate(predicate, citedRows, target = null) {
  if (!PREDICATES.includes(predicate)) return { supported: false, reason: 'unknown_predicate' };
  const ps = pairs(citedRows, target), comparable = ps.length > 0 && ps.every(p => p.pre.length && p.post.length && p.a.attempts && p.b.attempts);
  const health = citedRows.filter(e => e.type === 'service_health' && (target === null || e.payload.service === target));
  let supported = false;
  if (predicate === 'conversion_drop') supported = comparable && ps.some(p => p.b.successes * p.a.attempts < p.a.successes * p.b.attempts);
  if (predicate === 'conversion_stable') supported = comparable && ps.every(p => p.b.successes * p.a.attempts === p.a.successes * p.b.attempts);
  if (predicate === 'validation_increased') supported = comparable && ps.some(p => p.b.validationErrors * p.a.attempts > p.a.validationErrors * p.b.attempts);
  if (predicate === 'validation_stable') supported = comparable && ps.every(p => p.b.validationErrors * p.a.attempts === p.a.validationErrors * p.b.attempts);
  if (predicate === 'provider_healthy') supported = health.length > 0 && health.every(e => e.payload.providerHealthy);
  if (predicate === 'provider_unhealthy') {
    const all = pairs(citedRows, null);
    supported = health.some(e => e.payload.providerHealthy === false) && all.some(p => p.pre.length && p.post.length && p.b.providerDeclines * p.a.attempts > p.a.providerDeclines * p.b.attempts);
  }
  if (predicate === 'deployment_observed') supported = citedRows.some(e => e.type === 'deployment' && (target === null || e.payload.service === target));
  if (predicate === 'traffic_stable') supported = comparable && ps.every(p => p.pre.length === p.post.length && p.a.attempts === p.b.attempts && p.a.visits === p.b.visits);
  if (predicate === 'traffic_mix_changed') {
    const a = ps.reduce((n, p) => n + p.a.attempts, 0), b = ps.reduce((n, p) => n + p.b.attempts, 0);
    supported = comparable && ps.length === SEGMENTS.length && ps.some(p => p.a.attempts * b !== p.b.attempts * a);
  }
  if (predicate === 'aggregate_revenue_drop') supported = comparable && ps.reduce((n, p) => n + p.b.revenueMinor, 0) < ps.reduce((n, p) => n + p.a.revenueMinor, 0);
  if (predicate === 'price_stable') supported = comparable && ps.every(p => new Set([...p.pre, ...p.post].map(e => e.payload.unitPriceMinor)).size === 1);
  if (predicate === 'price_drop') supported = comparable && ps.some(p => Math.max(...p.post.map(e => e.payload.unitPriceMinor)) < Math.min(...p.pre.map(e => e.payload.unitPriceMinor)));
  if (predicate === 'pricing_change_observed') supported = comparable && citedRows.filter(e => e.type === 'pricing_configuration').some(e => {
    const p = ps.find(pair => pair.segment === e.payload.segment);
    return p && p.pre.every(r => r.payload.unitPriceMinor === e.payload.fromMinor) && p.post.every(r => r.payload.unitPriceMinor === e.payload.toMinor) && e.payload.fromMinor !== e.payload.toMinor;
  });
  if (predicate === 'successes_stable') supported = comparable && ps.every(p => p.pre.length === p.post.length && p.a.successes === p.b.successes && p.a.successes * p.b.attempts === p.b.successes * p.a.attempts);
  if (predicate === 'support_report') supported = citedRows.some(e => e.type === 'support_message' && e.payload.message.length > 0);
  if (predicate === 'missing_windows') supported = citedRows.some(e => e.type === 'observation_status' && e.payload.receivedWindows < e.payload.expectedWindows && e.payload.freshness === 'unknown');
  return { supported: Boolean(supported), reason: supported ? 'cited_typed_facts_match' : 'cited_facts_do_not_establish_predicate' };
}
export function findingCitations(finding) {
  return [...finding.claims.flatMap(c => c.evidenceIds), ...finding.hypotheses.flatMap(h => [...h.supportIds, ...h.contradictionIds]),
    ...(finding.relatedChangeId === null ? [] : [finding.relatedChangeId])];
}
export function citationExistence(finding, exposedIds) {
  const ids = findingCitations(finding);
  return { present: ids.filter(id => exposedIds.has(id)).length, total: ids.length,
    precision: ids.length ? ids.filter(id => exposedIds.has(id)).length / ids.length : null, reason: ids.length ? null : 'no_citations' };
}
export function criticalCoverage(finding, exposedRows, rubric) {
  const cited = new Set(findingCitations(finding));
  const byId = new Map(exposedRows.map(e => [e.id, e]));
  const groups = rubric.groups.map(g => ({ name: g.name, covered: g.evidenceIds.every(id => cited.has(id) && byId.has(id))
    && evaluatePredicate(g.predicate, g.evidenceIds.map(id => byId.get(id)), g.target).supported }));
  return { covered: groups.filter(g => g.covered).length, total: groups.length, groups };
}
