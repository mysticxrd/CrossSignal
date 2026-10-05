import { signal, validateObservable } from './daily.mjs';
import { validateFinding } from './schemas.mjs';

// The frozen rule baseline (rules.mjs) ported to the daily format, with its thresholds fixed before any daily case was
// written. Public observations only, no labels or rubric. Same order: checkout, payment provider, traffic mix, else
// abstain; daily cases have no pricing rows. Daily revenue rows carry no validation errors or provider declines, so
// checkout health rows and a fall in orders per started checkout stand in for them. Like the original it has no branch
// for "nothing happened": a calm case gets a cause or an abstention.
export function dailyRulesFinding(input, scope) {
  validateObservable(input, scope);
  const { frame } = input, totals = signal(input, scope), alert = e => e.at > frame.recentFrom;
  const windows = input.events.filter(e => e.type === 'revenue_window');
  const engineering = input.events.filter(e => ['deployment', 'service_health'].includes(e.type));
  const health = service => engineering.filter(e => e.type === 'service_health' && e.payload.service === service);
  const sum = (rows, key) => rows.reduce((n, r) => n + r.payload[key], 0);
  const rate = (rows, top, bottom) => sum(rows, bottom) === 0 ? null : sum(rows, top) / sum(rows, bottom);
  // Per segment: [earlier days, alert days].
  const periods = frame.segments.map(segment => {
    const rows = windows.filter(e => e.payload.segment === segment);
    return { segment, rows: [rows.filter(e => !alert(e)), rows.filter(alert)] };
  });
  const change = (rows, top, bottom) => {
    const [before, after] = rows.map(r => rate(r, top, bottom));
    return before === null || after === null || before === 0 ? null : after / before;
  };
  // Engineering rows first, so the cited rows stay within the 50-id limit.
  const supports = [...engineering, ...windows.filter(alert), ...windows.filter(e => !alert(e))].map(e => e.id).slice(0, 50);
  let diagnosis = null, changeId = null, segment = null;
  if (totals.complete) {
    const checkout = engineering.filter(e => e.type === 'deployment' && e.payload.service === 'checkout')
      .sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id))
      .find(d => health('checkout').some(e => e.payload.validationErrors > 0 && e.at > d.at));
    const completion = periods.map(p => ({ segment: p.segment, change: change(p.rows, 'orders', 'checkouts') }))
      .filter(p => p.change !== null && p.change < 0.75).sort((a, b) => a.change - b.change);
    const provider = health('payment-provider').find(e => alert(e) && !e.payload.providerHealthy);
    const all = [windows.filter(e => !alert(e)), windows.filter(alert)];
    if (checkout && completion.length) {
      diagnosis = 'checkout_deployment_regression'; changeId = checkout.id; segment = completion[0].segment;
    } else if (provider && (change(all, 'orders', 'checkouts') ?? 1) < 1) {
      diagnosis = 'payment_provider_incident'; segment = provider.payload.segment;
    } else if (totals.alert.revenuePerDayMinor < 0.9 * totals.earlier.revenuePerDayMinor) {
      const steady = value => value !== null && Math.abs(value - 1) <= 0.15;
      if (periods.every(p => steady(change(p.rows, 'orders', 'visits')) && steady(change(p.rows, 'revenueMinor', 'orders'))))
        diagnosis = 'traffic_mix_shift';
    }
  }
  return validateFinding({ version: 'benchmark-finding-v1', terminalStatus: diagnosis ? 'completed' : 'epistemic_abstention',
    signalSummary: 'Received daily revenue windows, alert days against earlier days; this finding is a deterministic rule baseline.',
    hypotheses: diagnosis ? [{ rank: 1, diagnosis, supportIds: supports, contradictionIds: [],
      summary: 'Typed observation rule fired; causal confidence and relevance require independent adjudication.' }] : [],
    affectedSegment: segment, relatedChangeId: changeId,
    unresolvedAlternatives: diagnosis ? [] : ['Incomplete coverage or no frozen public-observation rule established a cause.'],
    recommendation: { kind: diagnosis === 'checkout_deployment_regression' ? 'simulated_rollback' : diagnosis ? 'read_only_check' : 'abstain',
      target: diagnosis === 'checkout_deployment_regression' ? 'checkout' : null,
      summary: diagnosis ? 'Operator review of cited observations; recommendation alone authorizes no effect.' : 'Read-only check of missing coverage or discriminating observations.',
      boundary: 'recommendation_only', risk: diagnosis === 'checkout_deployment_regression' ? 'consequential' : diagnosis ? 'read_only' : 'none',
      approvalRequired: diagnosis === 'checkout_deployment_regression' }, claims: [] });
}
