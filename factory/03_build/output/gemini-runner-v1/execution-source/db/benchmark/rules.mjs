import { publicPacket, validateObservable } from './contracts.mjs';
import { validateFinding } from './schemas.mjs';

// Frozen deterministic baseline. Public observations only, no labels or rubric.
export function rulesFinding(input, scope) {
  validateObservable(input, scope);
  const packet = publicPacket(input, scope), windows = input.events.filter(e => e.type === 'revenue_window');
  const before = windows.filter(e => e.at <= '2026-09-01T09:30:00.000Z'), after = windows.filter(e => e.at > '2026-09-01T09:30:00.000Z');
  const sum = (rows, key) => rows.reduce((n, r) => n + r.payload[key], 0);
  const engineering = input.events.filter(e => ['deployment', 'pricing_configuration', 'service_health'].includes(e.type));
  const supports = [...windows, ...engineering].map(e => e.id);
  let diagnosis = null, change = null, segment = null;
  if (packet.signal.complete) {
    const price = engineering.find(e => e.type === 'pricing_configuration' && e.payload.toMinor < e.payload.fromMinor);
    const checkout = engineering.find(e => e.type === 'deployment' && e.payload.service === 'checkout');
    if (price) { diagnosis = 'pricing_configuration_change'; change = price.id; segment = price.payload.segment; }
    else if (sum(after, 'validationErrors') > sum(before, 'validationErrors') && checkout) {
      diagnosis = 'checkout_deployment_regression'; change = checkout.id;
      segment = after.find(e => e.payload.validationErrors > 0)?.payload.segment ?? null;
    } else if (sum(after, 'providerDeclines') > sum(before, 'providerDeclines')
      && engineering.some(e => e.type === 'service_health' && !e.payload.providerHealthy)) {
      diagnosis = 'payment_provider_incident'; segment = after.find(e => e.payload.providerDeclines > 0)?.payload.segment ?? null;
    } else if (packet.signal.post.revenueMinor < packet.signal.pre.revenueMinor) {
      const segments = [...new Set(windows.map(e => e.payload.segment))];
      const stable = segments.every(s => {
        const pre = before.filter(e => e.payload.segment === s), post = after.filter(e => e.payload.segment === s);
        return sum(pre,'successes') * sum(post,'attempts') === sum(post,'successes') * sum(pre,'attempts')
          && pre[0]?.payload.unitPriceMinor === post[0]?.payload.unitPriceMinor;
      });
      if (stable) diagnosis = 'traffic_mix_shift';
    }
  }
  return validateFinding({ version: 'benchmark-finding-v1', terminalStatus: diagnosis ? 'completed' : 'epistemic_abstention',
    signalSummary: 'SIMULATED received-window aggregate revenue decreased; this finding is a deterministic rule baseline.',
    hypotheses: diagnosis ? [{ rank: 1, diagnosis, supportIds: supports.slice(0,50), contradictionIds: [],
      summary: 'Typed observation rule fired; causal confidence and relevance require independent adjudication.' }] : [],
    affectedSegment: segment, relatedChangeId: change,
    unresolvedAlternatives: diagnosis ? [] : ['Incomplete coverage or no frozen public-observation rule established a cause.'],
    recommendation: { kind: diagnosis === 'checkout_deployment_regression' ? 'simulated_rollback' : diagnosis ? 'read_only_check' : 'abstain',
      target: diagnosis === 'checkout_deployment_regression' ? 'checkout' : null,
      summary: diagnosis ? 'Operator review of cited observations; recommendation alone authorizes no effect.' : 'Read-only check of missing coverage or discriminating observations.',
      boundary: 'recommendation_only', risk: diagnosis === 'checkout_deployment_regression' ? 'consequential' : diagnosis ? 'read_only' : 'none',
      approvalRequired: diagnosis === 'checkout_deployment_regression' }, claims: [] });
}
