// Test-only surrogate. Never imported by the product, packet or model worker.
import { createHttpTransport } from '../../db/benchmark/gemini-http.mjs';
import { GEMINI } from '../../db/benchmark/gemini-config.mjs';
export function fixtureFinding(snapshot) {
  const find = predicate => snapshot.evidence.find(predicate)?.id;
  return { version: 'benchmark-finding-v1', terminalStatus: 'completed', signalSummary: 'FIXTURE SURROGATE: activation conversion fell after the billing deployment.',
    hypotheses: [{ rank: 1, diagnosis: 'Billing activation regression', summary: 'Synthetic test answer; no model quality claim.',
      supportIds: [find(e => e.kind === 'deployment' && e.service === 'billing'), find(e => e.kind === 'health' && e.service === 'billing'),
        find(e => e.kind === 'conversion' && e.period === 'incident' && e.cohort === 'new-self-serve')].filter(Boolean),
      contradictionIds: [] }], affectedSegment: 'new-self-serve', relatedChangeId: find(e => e.kind === 'deployment' && e.service === 'billing'),
    unresolvedAlternatives: ['Coincidence or unobserved causes remain possible'],
    recommendation: { kind: 'simulated_rollback', target: 'billing', summary: 'Test the permitted rollback in simulation only.',
      boundary: 'recommendation_only', risk: 'consequential', approvalRequired: true },
    claims: [{ text: 'The assisted control and payment provider are stable.', predicate: 'reviewed_control', target: 'billing',
      evidenceIds: [find(e => e.kind === 'conversion' && e.period === 'incident' && e.cohort === 'new-assisted'),
        find(e => e.kind === 'health' && e.service === 'payment-provider')].filter(Boolean) }] };
}
export function fixtureTransport(finding, { onGenerate = () => {}, malformed = false } = {}) {
  return createHttpTransport({ mode: 'OFFLINE_FIXTURE', profile: 'low', keySource: () => 'OFFLINE_CASE_FIXTURE_SECRET', log: () => {},
    fetchImpl: async url => {
      if (url.endsWith(':countTokens')) return new Response(JSON.stringify({ totalTokens: 1000 }));
      onGenerate(); return new Response(JSON.stringify({ modelVersion: GEMINI.model,
        candidates: [{ finishReason: 'STOP', content: { parts: [{ text: malformed ? '{broken' : JSON.stringify(finding) }] } }],
        usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 300, thoughtsTokenCount: 0, totalTokenCount: 1300 } }));
    } });
}
