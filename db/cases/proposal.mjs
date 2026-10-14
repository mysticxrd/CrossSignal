import { digest, requireThat as check } from '../benchmark/contracts.mjs';
import { validateFinding } from '../benchmark/schemas.mjs';
import { measurementPlan, POLICY } from './measurement.mjs';
import { worldContext } from './world.mjs';
export const OWNER = 'local_owner';
export const policyHash = digest({ version: 'case-approval-v1', measurement: POLICY, service: 'billing', transition: ['billing-v2', 'billing-v1'] });
export function eligibility(snapshot, finding, world) {
  const reasons = [], need = (condition, reason) => { if (!condition) reasons.push(reason); };
  try { validateFinding(finding); } catch { return { eligible: false, reasons: ['Finding is malformed'], reviewedEvidence: [] }; }
  const evidence = new Map(snapshot.evidence.map(e => [e.id, e]));
  const citations = [...finding.hypotheses.flatMap(h => [...h.supportIds, ...h.contradictionIds]), ...finding.claims.flatMap(c => c.evidenceIds)];
  need(citations.every(id => evidence.has(id)), 'Finding cites evidence outside this snapshot');
  need(snapshot.signal.detected, 'A sufficiently observed conversion drop with stable controls is required');
  need(finding.terminalStatus === 'completed' && finding.affectedSegment === snapshot.signal.affected, 'Finding must identify the observed affected cohort');
  need(finding.recommendation.kind === 'simulated_rollback' && finding.recommendation.target === 'billing'
    && finding.recommendation.risk === 'consequential' && finding.recommendation.approvalRequired, 'Recommendation does not match the allowed simulated rollback');
  const deployment = evidence.get(finding.relatedChangeId), top = finding.hypotheses[0];
  const supported = (top?.supportIds ?? []).map(id => evidence.get(id)).filter(Boolean);
  need(deployment?.kind === 'deployment' && deployment.service === 'billing' && deployment.to === world.serviceVersion
    && deployment.from === 'billing-v1' && deployment.to === 'billing-v2', 'Deployment and current service version do not match the action catalogue');
  need(supported.some(e => e.id === deployment?.id), 'Leading explanation must cite the deployment');
  need(supported.some(e => e.kind === 'health' && e.service === 'billing' && e.cohort === snapshot.signal.affected
    && e.failures > 0 && deployment?.occurredAt < e.occurredAt), 'Post-deployment billing failures in the affected cohort are required');
  need(supported.some(e => e.kind === 'conversion' && e.cohort === snapshot.signal.affected && e.period === 'incident' && e.sufficient
    && deployment?.occurredAt < e.start), 'Leading explanation must cite the measured post-deployment drop');
  const reviewed = citations.map(id => evidence.get(id)).filter(Boolean);
  need(reviewed.some(e => e.kind === 'conversion' && e.cohort === POLICY.cohorts[1] && e.period === 'incident' && e.sufficient), 'Control cohort must be explicitly reviewed with citations');
  need(reviewed.some(e => e.kind === 'health' && e.service === 'payment-provider' && e.failures === 0), 'Available payment-provider evidence must be explicitly reviewed with citations');
  return { eligible: reasons.length === 0, reasons, reviewedEvidence: [...new Set(citations)] };
}
export function makeProposal({ caseId, attemptId, snapshot, finding, world, now, nonce }) {
  const gate = eligibility(snapshot, finding, world); if (!gate.eligible) return { gate, proposal: null };
  const plan = measurementPlan(snapshot), body = { version: 'case-proposal-v1', caseId, attemptId,
    snapshotHash: snapshot.hash, findingHash: digest(finding), contextHash: digest(worldContext(world)), policyHash,
    actorId: OWNER, truthMode: 'SIMULATED', action: { service: 'billing', from: 'billing-v2', to: 'billing-v1' },
    measurementPlan: plan, measurementPlanHash: digest(plan), maxRuns: 1, costCapUsd: 0, externalWrites: false,
    nonce, createdAt: now, expiresAt: new Date(Date.parse(now) + 30 * 60000).toISOString() };
  return { gate, proposal: { ...body, hash: digest(body) } };
}
export function authorize({ proposal, grant, state, now }) {
  const { hash, ...body } = proposal;
  check(digest(body) === hash && grant.proposalHash === hash && grant.actorId === OWNER && proposal.actorId === OWNER, 'approval_binding_mismatch');
  check(proposal.caseId === state.id && proposal.attemptId === state.currentAttemptId && proposal.snapshotHash === state.snapshot.hash
    && proposal.findingHash === digest(state.finding) && proposal.contextHash === digest(worldContext(state.world)), 'approval_context_stale');
  check(proposal.measurementPlanHash === digest(proposal.measurementPlan) && proposal.policyHash === policyHash, 'approval_policy_stale');
  check(proposal.truthMode === 'SIMULATED' && proposal.maxRuns === 1 && proposal.costCapUsd === 0 && proposal.externalWrites === false, 'approval_scope_invalid');
  check(!state.paused && state.status === 'open' && state.decision === 'approved', 'execution_not_available');
  check(now < proposal.expiresAt && grant.approvedAt < proposal.expiresAt, 'approval_expired');
  check(eligibility(state.snapshot, state.finding, state.world).eligible, 'proposal_no_longer_eligible');
}
