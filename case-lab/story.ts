import { type CaseView, type Session, type Shape, label, time } from './types';

// Words only: this picks which action the service already accepts to put first. It grants nothing, so the
// service's refusal stays the last word and the page can never offer more than the rules allow.
export const STEPS = ['What happened', 'Why', 'Your decision', 'Did it work?', 'Close the Case'];
// The situations you can start. Only the picker uses these words: a Case is named by what its records show.
export const SITUATIONS: Record<string, string> = {
  incident: 'Online sign-ups dropped', limited: 'Online sign-ups dropped, and a health check is missing',
  normal: 'Nothing measurable changed, but two messages came in', partial: 'Online sign-ups dropped, and a fix only partly helps',
  ineffective: "Online sign-ups dropped, and a fix doesn't help", incomplete: 'Online sign-ups dropped, and some records stop arriving',
  spontaneous: 'Online sign-ups dropped, then recover on their own', delayed: 'Some sign-up records are late, and nothing is broken',
  masked: 'Some sign-up records are late, and they hide a failure', absorbed: 'Sign-ups look normal, but billing is failing' };
export const caseName = ({ detected, sufficient, stable }: Shape) => detected ? 'Online sign-ups dropped'
  : !sufficient ? 'Sign-up records still arriving' : stable ? 'Sign-ups look steady' : 'Sign-ups moved a little';
const WORDS: Record<string, string> = { open: 'Open', closed: 'Closed', idle: 'Not investigated', queued: 'Waiting to start',
  running: 'Investigating', completed: 'Investigated', review: 'Waiting for you', proposed: 'Fix offered', approved: 'Approved',
  executed: 'Undo has run', rejected: "Undo didn't run", deferred: 'Put off', no_action: 'Watching only',
  criterion_met: 'Sign-ups came back', criterion_not_met: "Sign-ups haven't come back", inconclusive: 'Not enough records yet' };
export const plain = (value: string) => WORDS[value] ?? label(value);
const ERRORS: Record<string, string> = { case_changed_reload: 'This Case changed. Reload to see it.',
  case_busy_or_paused: 'This Case is paused or busy investigating, so nothing else can run yet.',
  investigator_busy: 'Another Case is being investigated. Try again when it finishes.',
  development_attempt_cap_reached: 'This lab has no investigations left. You can still decide without one.' };
export const plainError = (code: string) => ERRORS[code] ?? `Something went wrong (${label(code)}).`;

// Counts and service names only: a support row's text never appears in what the page says about it.
export function contrary(ids: string[]) {
  const messages = ids.filter(id => id !== 'finding').length;
  return [messages > 0 && `${messages} customer ${messages === 1 ? 'message' : 'messages'}`, ids.includes('finding') && 'a rollback recommendation'].filter(Boolean).join(' and ');
}
export type Next = { action: string; label: string; needsReason: boolean };
export type Story = { step: number; headline: string; explain: string; primary: Next | null; skipped: number[] };
const next = (action: string, text: string, needsReason = false): Next => ({ action, label: text, needsReason });
const per100 = (value: number | null) => value === null ? 'an unknown number' : String(Math.round(value));

export function caseStory(data: CaseView, session: Session, now = Date.now()): Story {
  const s = data.snapshot.signal, gate = data.noIncident, outcome = data.outcome, acted = !!data.receipt;
  // Closing as no incident skips the fix and its check, and the "why" too when nothing was investigated.
  const noFix = [...(data.attempts.length ? [] : [2]), 3, 4];
  const story = (step: number, headline: string, explain: string, primary: Next | null, skipped: number[] = []) => ({ step, headline, explain, primary, skipped });
  if (data.status !== 'open') {
    const c = data.closure, kind = c?.kind;
    return story(5, 'Case closed', kind === 'close_recovered' ? `You closed this after sign-ups came back. ${acted ? "That fits the explanation but doesn't prove it." : "Nothing was changed, so the recovery can't be credited to an action."}`
      : kind === 'close_no_incident' ? `You closed this as no incident${c?.acknowledged?.length ? `, past ${contrary(c.acknowledged)}` : ''}. That doesn't prove nothing is wrong.`
      : kind === 'close_unresolved' ? 'You closed this without a fix. Your reason is saved with the Case.' : 'This Case is closed.', null, kind === 'close_no_incident' ? noFix : []);
  }
  if (data.paused) return { ...caseStory({ ...data, paused: false }, session, now), headline: 'Actions are paused',
    explain: "Nothing on this Case can change until you resume. A request already sent may still finish, but it can't run an action.", primary: next('resume', 'Resume actions') };
  if (['queued', 'running'].includes(data.investigation)) return story(2, 'CrossSignal is investigating',
    "It's reading the records and listing possible causes. It can't change anything. You can reload this page; the investigation keeps its place.", null);
  if (data.decision === 'approved') return story(3, 'Your approval is being carried out', 'The undo runs once, in the simulation. This page updates when it has.', null);
  if (data.anchor) {
    const start = acted ? 'The undo has run in the simulation.' : 'You chose to watch without changing anything.';
    const clock = 'Time in the simulation moves only when you check, so reloading changes nothing.';
    if (!outcome) return story(4, acted ? 'The undo has run. Did it help?' : "You're watching without changing anything", `${start} ${clock}`, next('observe', 'Move time forward and check'));
    if (outcome.state === 'criterion_met') return story(5, 'Sign-ups came back', `${per100(outcome.observedPercent)} of every 100 online sign-ups finish again. ${acted
      ? "This fits the explanation but doesn't prove it." : "Nothing was changed, so the recovery can't be credited to an action."} Close the Case with what you concluded.`, next('close_recovered', 'Close: sign-ups came back'));
    // A miss after an earlier recovery is a relapse, not a failure to recover: the summary keeps both results.
    const relapsed = outcome.state === 'criterion_not_met' && data.outcomes.some(o => o.state === 'criterion_met');
    const missed = relapsed ? 'Sign-ups came back, then dropped again' : "Sign-ups haven't come back yet";
    const relapse = relapsed ? `Sign-ups recovered at an earlier check, but now ${per100(outcome.observedPercent)} of every 100 finish, so the recovery didn't last.` : '';
    if (data.observationStep < 3) return story(4, outcome.state === 'inconclusive' ? 'Not enough records yet to tell' : missed,
      `${relapse || `${per100(outcome.observedPercent)} of every 100 online sign-ups finish now.`} ${clock}`, next('observe', data.observationStep === 1 ? 'Check the late records' : 'Check the next period'));
    return story(5, relapsed ? missed : "Sign-ups didn't come back", `${relapse ? `${relapse} ` : ''}Every planned check has run. Close the Case and say what you concluded.`, next('close_unresolved', 'Close without a fix', true));
  }
  // Before a decision. Each choice below is one the service accepts at this point.
  const canInvestigate = session.modelReady && session.attemptCap - session.attemptsUsed > 0;
  const investigate = next('investigate', data.attempts.length ? 'Investigate again' : 'Investigate why');
  const closeClean = !gate.refusal && next('close_no_incident', 'Close: no incident found', gate.reasonRequired);
  const otherwise = !s.sufficient && data.waits < 2 ? next('wait_for_data', 'Wait for the late records') : closeClean
    || (s.detected ? next('observe_without_action', 'Watch without changing anything') : next('close_unresolved', 'Close without a fix', true));
  const skips = (primary: Next) => primary.action === 'close_no_incident' ? noFix : [];
  if (data.proposal && data.decision === 'proposed') {
    const { service, from, to } = data.proposal.action, expired = !(now < Date.parse(data.proposal.expiresAt));
    return story(3, `CrossSignal suggests undoing the ${service} update`, `It would switch ${service} from ${from} back to ${to}, once, in the simulation, so nothing real changes. Nothing runs unless you approve. ${expired
      ? 'This offer has run out. Refreshing it reuses the saved investigation and costs no new one.' : `You can approve until ${time(data.proposal.expiresAt)}.`}`, expired ? next('refresh_proposal', 'Refresh the offer') : next('approve', 'Approve the undo'));
  }
  if (data.finding) {
    const primary = data.decision === 'deferred' && data.gate?.eligible ? next('refresh_proposal', 'Look at the fix again') : otherwise;
    return story(3, data.decision === 'deferred' ? 'You put this decision off' : 'There is no fix to approve', data.decision === 'deferred'
      ? 'Your reason is saved with the Case. You can pick this up again at any time.' : data.gate?.reasons.length
      ? `CrossSignal's checks found ${data.gate.reasons.length} ${data.gate.reasons.length === 1 ? 'reason' : 'reasons'} not to offer one, listed under Your decision.` : "CrossSignal didn't recommend a change.", primary, skips(primary));
  }
  const prefix = data.decision === 'deferred' ? 'You put this off. ' : '';
  const before = per100(s.baseline.conversionPercent), nowPer = per100(s.incident.conversionPercent);
  if (!s.sufficient) return story(1, "Some sign-up records haven't arrived yet", `${prefix}So far CrossSignal can't tell whether sign-ups dropped. Missing records are never counted as zero.`, otherwise, skips(otherwise));
  if (data.stable && gate.refusal) {
    const failing = gate.refusedBy.map(r => r.service).join(' and '), counted = gate.refusedBy.every(r => typeof r.failures === 'number');
    const primary = canInvestigate ? investigate : otherwise;
    return story(1, counted ? `Sign-ups look normal, but ${failing} ${gate.refusedBy.length === 1 ? 'is' : 'are'} failing` : `Sign-ups look normal, but a ${failing} health check can't be read`, `${prefix}${nowPer} of every 100 online sign-ups still finish, as before, but ${gate.refusedBy.map(r => typeof r.failures === 'number'
      ? `the ${r.service} health check shows ${r.failures} ${r.failures === 1 ? 'failure' : 'failures'}` : `the ${r.service} health check has no readable failure count`).join(' and ')}. A measured failure can't be closed as no incident.`, primary);
  }
  if (data.stable && closeClean) return story(1, gate.acknowledge.length ? `Nothing measurable changed, but this Case has ${contrary(gate.acknowledge)}` : 'Nothing measurable changed',
    `${prefix}${nowPer} of every 100 online sign-ups finish, as before, and no health check shows failures.${gate.reasonRequired ? ` You can close this as no incident, but say why you're closing past ${gate.acknowledge.length === 1 ? 'it' : 'them'}.` : ''}`, closeClean, noFix);
  const primary = canInvestigate ? investigate : otherwise;
  if (s.detected) return story(1, 'Fewer online sign-ups are finishing', `${prefix}Out of every 100 people who tried to subscribe online, ${before} finished before and ${nowPer} finish now. With staff help: ${per100(s.controlBaseline.conversionPercent)} before, ${per100(s.controlIncident.conversionPercent)} now.`, primary, skips(primary));
  return story(1, "Sign-ups moved, but not enough to call it a drop", `${prefix}Out of every 100 people who tried to subscribe online, ${before} finished before and ${nowPer} finish now.`, primary, skips(primary));
}
