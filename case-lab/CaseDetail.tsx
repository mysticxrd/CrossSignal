import { useEffect, useState } from 'react';
import { EvidenceList, Citations } from './Evidence';
import { type CaseView, type Session, type Plan, label, percent, time } from './types';
import { STEPS, caseName, caseStory, contrary, plain } from './story';
function PlanView({ plan }: { plan: Plan }) {
  return <p className="plan-text">Observe {plan.windows} fixed {plan.windowMinutes}-minute windows after the decision.
    Each needs at least {plan.minimumIntentsPerWindow} intents per cohort, {plan.completionMinutes} minutes for completion and {plan.arrivalMinutes} minutes for data arrival.
    Success requires at least <strong>{percent(plan.targetPercent)}</strong> conversion in both windows, with the control within {plan.controlTolerancePoints} percentage points of baseline.</p>;
}
function noIncidentNote({ refusedBy, acknowledge }: CaseView['noIncident']) {
  if (refusedBy.length) return `Conversion is complete and stable, but ${refusedBy.map(({ service, failures }) => typeof failures === 'number'
    ? `${service} health shows ${failures} ${failures === 1 ? 'failure' : 'failures'}` : `${service} health has no readable failure count`).join(' and ')}, so this can't close as no incident. Defer, or close unresolved with a reason.`;
  if (acknowledge.length) return `Conversion is complete and stable, but this Case also has ${contrary(acknowledge)}. ${acknowledge.length === 1 ? "It can't block this closure, so say why you're closing past it." : "They can't block this closure, so say why you're closing past them."}`;
  return 'The data is complete and stable, so you can close this as no incident.';
}
type Count = CaseView['snapshot']['signal']['baseline'];
// One bar per period, out of every 100 who started. A period still missing records reads as not known, never as zero.
function Bar({ when, count }: { when: string; count: Count }) {
  const known = count.sufficient && count.conversionPercent !== null;
  return <div className="bar-row"><span>{when}</span><div className="bar">{known && <i style={{ width: `${count.conversionPercent}%` }} />}</div>
    <b>{known ? `${Math.round(count.conversionPercent!)} of every 100` : 'Not known yet'}</b>
    <small>{known ? `${count.successes} of ${count.intents} finished` : `${count.intents} started; some records haven't arrived`}</small></div>;
}
export function CaseDetail({ data, session, busy, onAction }: { data: CaseView; session: Session; busy: boolean; onAction: (action: string, reason?: string) => Promise<void> }) {
  const [reason, setReason] = useState('');
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const expired = data.proposal !== null && !(clock < Date.parse(data.proposal.expiresAt));
  const signal = data.snapshot.signal, inFlight = ['queued', 'running'].includes(data.investigation), open = data.status === 'open';
  const disabled = busy || data.paused || inFlight, remaining = session.attemptCap - session.attemptsUsed;
  const noDecision = !open && ['review', 'proposed'].includes(data.decision);
  // The service decides; this only reads its answer, so the button and the command can't disagree.
  const gate = data.noIncident, note = gate.refusal === 'no_incident_needs_complete_stable_data' ? null : noIncidentNote(gate);
  const latest = data.attempts.at(-1), story = caseStory(data, session, clock), primary = story.primary;
  const canned = [...data.attempts].reverse().find(attempt => attempt.result?.finding)?.source === 'fixture_surrogate';
  // The main action appears once, in the next-step card; every other button stays where it was.
  const elsewhere = (action: string) => action !== primary?.action;
  const reasonBox = <><label htmlFor="decision-reason">{primary?.needsReason ? 'Your reason (required)' : 'Decision or closure reason'}</label><textarea id="decision-reason" value={reason} maxLength={1000} onChange={event => setReason(event.target.value)} placeholder="What does the evidence justify, and what is still unresolved?" /></>;
  return <div className="case-content">
    <div className="case-heading"><div><p className="eyebrow">SIMULATED CASE</p><h1>{caseName({ ...signal, stable: data.stable })}</h1>
      <p className="subtitle">{"CrossSignal looks into a problem in a company's numbers, suggests a fix, and waits for a person to approve it. This Case is a simulation: a made-up company with made-up data, so nothing real changes."}</p></div>
      <div className="heading-status"><span className={`status ${open ? 'open' : 'closed'}`}>{open ? 'Open Case' : 'Closed Case'}</span>
        {elsewhere(data.paused ? 'resume' : 'pause') && <button className="text-button" data-action={data.paused ? 'resume' : 'pause'} disabled={busy} onClick={() => onAction(data.paused ? 'resume' : 'pause')}>{data.paused ? 'Resume actions' : 'Pause actions'}</button>}</div></div>
    {data.paused && <p role="status" className="notice">Actions are paused. A model request already sent may still finish; it cannot execute an action.</p>}
    <ol className="rail" aria-label="Steps">{STEPS.map((name, i) => { const step = i + 1, skipped = story.skipped.includes(step);
      return <li key={name} className={step === story.step ? 'current' : skipped ? 'skipped' : step < story.step ? 'past' : ''} aria-current={step === story.step ? 'step' : undefined}>
        {step}. {name}{skipped && <small> (not needed here)</small>}</li>; })}</ol>
    <section className="next-step" aria-labelledby="next-title"><p className="eyebrow">Step {story.step} of {STEPS.length}: {STEPS[story.step - 1]}</p>
      <h2 id="next-title">{story.headline}</h2><p>{story.explain}</p>
      {primary?.needsReason && reasonBox}
      {primary && <button className="primary" data-action={primary.action} disabled={busy || (primary.needsReason && !reason.trim())} onClick={() => onAction(primary.action, reason)}>{primary.label}</button>}
      <p className="muted">CrossSignal suggests; you decide. Nothing on this page acts until you click.</p></section>
    <section className="signal-card" aria-labelledby="signal-title"><p className="eyebrow">1 · WHAT HAPPENED</p><div className="section-top"><h2 id="signal-title">{caseName({ ...signal, stable: data.stable })}</h2>
      <span className="pill">{signal.detected ? 'Drop observed' : data.stable ? 'Steady' : signal.sufficient ? 'Unclear' : 'Records missing'}</span></div>
      <p>New customers only. Of every 100 who started signing up, how many finished. Each period is two 15-minute stretches.</p>
      <div className="bars"><div><h3>Online, on their own</h3><Bar when="Before" count={signal.baseline} /><Bar when="Now" count={signal.incident} /></div>
        <div><h3>With staff help</h3><Bar when="Before" count={signal.controlBaseline} /><Bar when="Now" count={signal.controlIncident} /></div></div>
      <p className="metric-note">{signal.detected && 'Only the online numbers decide whether sign-ups dropped. The staff-help numbers are there to compare: if they held steady, the problem is likely somewhere only online sign-ups go. '}
        A sign-up counts as finished once the first payment goes through and the subscription is switched on. Records that haven&apos;t arrived are never counted as zero.</p>
    </section>
    <div className="investigation-grid"><section className="panel investigation"><div className="section-top"><div><p className="eyebrow">2 · WHY</p><h2>Possible causes</h2></div><span className="pill">{plain(data.investigation)}</span></div>
      {!data.finding && <p className="muted">{inFlight ? "CrossSignal is reading this Case's saved records. You can reload; it keeps its place."
        : latest && data.investigation === 'insufficient' ? "The last investigation found the records weren't enough to name a cause."
        : latest && data.investigation === 'interrupted' ? 'The last investigation stopped before it finished. What happened is kept in the Case history.'
        : latest ? 'Earlier investigations read older records, so their answers are kept in the Case history, not shown here.'
        : open ? "Ask CrossSignal to read the records, list possible causes and say what it can't tell yet." : 'No investigation ran on this Case.'}</p>}
      {data.finding && <><p className="muted">{canned ? 'A canned test answer: no AI model wrote it.' : "CrossSignal's reading. It hasn't been proven."} Its own words are in quotes.</p>
        <p className="finding-summary"><q className="model-words">{data.finding.signalSummary}</q></p>{data.finding.hypotheses.map(hypothesis => <article className="hypothesis" key={hypothesis.rank}>
        <h3><span>{hypothesis.rank}</span><q className="model-words">{hypothesis.diagnosis}</q></h3><p><q className="model-words">{hypothesis.summary}</q></p><span className="small-label">RECORDS THAT FIT</span>
        <Citations ids={hypothesis.supportIds} evidence={data.snapshot.evidence} />{hypothesis.contradictionIds.length > 0 && <><span className="small-label">RECORDS THAT DON&apos;T FIT</span><Citations ids={hypothesis.contradictionIds} evidence={data.snapshot.evidence} /></>}
      </article>)}{data.finding.claims.map((claim, i) => <div className="claim" key={i}><span className="small-label">IT ALSO CHECKED</span><p><q className="model-words">{claim.text}</q></p><Citations ids={claim.evidenceIds} evidence={data.snapshot.evidence} /></div>)}
        <div className="uncertainty"><h3>What it can&apos;t tell yet</h3>{data.finding.unresolvedAlternatives.length ? <ul>{data.finding.unresolvedAlternatives.map(text => <li key={text}><q className="model-words">{text}</q></li>)}</ul> : <p>It named nothing it couldn&apos;t tell. That still doesn&apos;t prove its reading.</p>}</div></>}
      <div className="investigate-footer">{elsewhere('investigate') && <button data-action="investigate" disabled={disabled || !open || !session.modelReady || remaining <= 0 || data.decision === 'approved'} onClick={() => onAction('investigate')}>
        {inFlight ? 'Investigation in progress…' : data.attempts.length ? 'Run another investigation' : 'Investigate this Case'}</button>}
        <p className="muted">{session.source === 'fixture_surrogate' ? 'Investigations here use canned test answers, not an AI model.' : `Investigations use the ${session.model} AI model, on its free tier.`}<br />
          This lab has {remaining} of {session.attemptCap} investigations left.{session.unavailableReason && ` The AI model can't run here (${label(session.unavailableReason)}).`}</p>
        {remaining <= 0 && <p className="muted">No investigations are left. You can still decide, check results and close the Case with what&apos;s already here.</p>}</div>
    </section>
    <section className="panel decision"><p className="eyebrow">3 · YOUR DECISION</p><h2>Your decision</h2>
      {data.proposal && data.decision === 'proposed' ? <><span className={expired ? "status" : "status eligible"}>{expired ? "Proposal expired" : "Eligible for your review"}</span><h3>Roll back billing in simulation</h3>
        <p>{data.proposal.action.from} → {data.proposal.action.to}</p><p>One execution. $0 spend. No external writes. Eligibility checks support this test; they do not establish causality.</p>
        <PlanView plan={data.proposal.measurementPlan} /><p className="muted">Approval {expired ? "expired" : "expires"} {time(data.proposal.expiresAt)}.</p>
        {expired && <p role="status" className="notice">Refresh this proposal to review a new approval window. This reuses the saved investigation and costs no model attempts.</p>}
        {elsewhere('refresh_proposal') && <button className="refresh-proposal" data-action="refresh_proposal" disabled={disabled || !open} onClick={() => onAction('refresh_proposal')}>Refresh proposal for review</button>}
        {elsewhere('approve') && <button className="approve" data-action="approve" disabled={disabled || !open || expired} onClick={() => onAction('approve')}>Approve and run this simulation</button>}
        <details><summary>Exact approval binding</summary><code className="hash">{data.proposal.hash}</code><p>Bound to this finding, evidence snapshot, service version and measurement plan.</p></details></>
        : data.receipt ? <><span className="status eligible">Simulation executed once</span><p>{data.receipt.action.from} → {data.receipt.action.to}</p>
          <p>Receipt recorded {time(data.receipt.executedAt)}. This proves the action ran; follow-up observations determine what happened next.</p>
          <p className="muted">Approval: {label(data.grant?.provenance ?? 'unknown')} · {data.grant?.actorId}</p></>
          : <><p>{data.finding?.recommendation.summary ?? (noDecision ? 'This Case closed without a decision to intervene.' : 'Review the investigation before choosing an intervention.')}</p>
            {data.gate && !data.gate.eligible && <div className="gate-reasons"><h3>No executable proposal</h3><ul>{data.gate.reasons.map(item => <li key={item}>{item}</li>)}</ul></div>}
            <span className="pill">{noDecision ? 'No decision' : plain(data.decision)}</span>{data.finding && !data.anchor && open && elsewhere('refresh_proposal') && <button data-action="refresh_proposal" disabled={disabled} onClick={() => onAction('refresh_proposal')}>Recheck proposal eligibility</button>}</>}
      {!data.anchor && open && data.decision !== 'approved' && <div className="decision-alternatives">{signal.detected
        ? elsewhere('observe_without_action') && <button data-action="observe_without_action" disabled={disabled} onClick={() => onAction('observe_without_action')}>Observe without acting</button>
        : <p className="muted">There is no detected drop to measure recovery against, so there is nothing to observe without acting. {note ?? (signal.sufficient ? 'The data is complete but conversion moved, so this cannot close as no incident. Defer, or close unresolved with a reason.' : 'Wait for late data, defer, or close unresolved with a reason.')}</p>}
        {!signal.sufficient && elsewhere('wait_for_data') && <button data-action="wait_for_data" disabled={disabled || data.waits >= 2} onClick={() => onAction('wait_for_data')}>Wait for late data</button>}
        {!signal.sufficient && data.waits >= 2 && <p className="muted">Both waits are used and the data is still incomplete. Waiting cannot settle this Case.</p>}
        <button data-action="defer" disabled={disabled || !reason.trim()} onClick={() => onAction('defer', reason)}>Defer with reason</button></div>}
    </section></div>
    <section className="panel"><div className="section-top"><div><p className="eyebrow">SOURCE RECORDS</p><h2>Evidence you can inspect</h2></div><span className="muted">Available by {time(data.snapshot.asOf)}</span></div>
      <EvidenceList evidence={data.snapshot.evidence} /></section>
    <section className="panel outcome"><div className="section-top"><div><p className="eyebrow">4 · DID IT WORK?</p><h2>What happened after the decision?</h2></div>
      <span className="pill">{data.outcome ? plain(data.outcome.state) : !open ? 'Not observed' : data.anchor ? 'Collecting' : 'Awaiting decision'}</span></div>
      {data.plan ? <PlanView plan={data.plan} /> : <p className="muted">{open ? 'A fixed measurement plan is attached to an approved action or an explicit decision to observe without acting.' : 'No measurement ran, because this Case closed before any action or decision to observe.'}</p>}
      {data.outcome && <><div className="outcome-result"><strong>{percent(data.outcome.observedPercent)}</strong><div><b>{plain(data.outcome.state)}</b><p>{label(data.outcome.direction)}{data.outcome.changePoints !== null && ` · ${data.outcome.changePoints > 0 ? '+' : ''}${data.outcome.changePoints.toFixed(1)} percentage points from the incident`}</p></div></div>
        <p>{data.outcome.caveat}</p>{!data.receipt && <p className="notice">No intervention was executed. Any recovery cannot be credited to an action.</p>}
        <details><summary>Measurement windows and retained assessments ({data.outcomes.length})</summary>{data.outcomes.map(outcome => <div key={outcome.id} className="assessment">
          <h3>{plain(outcome.state)} · {percent(outcome.observedPercent)}</h3><p>{time(outcome.start)} – {time(outcome.end)} · observed by {time(outcome.asOf)}</p>
          {outcome.rows.map((row, i) => <p key={i}>{row.cohort}: {row.successes}/{row.intents} · {percent(row.conversionPercent)} {row.limitation}</p>)}</div>)}</details></>}
      {elsewhere('observe') && <button data-action="observe" disabled={disabled || !data.anchor || data.observationStep >= 3} onClick={() => onAction('observe')}>
        {data.observationStep === 0 ? 'Advance simulation and observe' : data.observationStep === 1 ? 'Check late data for the same period' : data.observationStep === 2 ? 'Observe the later regression period' : 'All fixture periods observed'}</button>}
      <p className="muted">Simulation time advances only when you choose to observe. Reloading this page has no effect.</p>
    </section>
    <section className="panel closure"><p className="eyebrow">5 · CLOSE THE CASE</p><h2>{open ? 'Record your conclusion' : 'Case closed by the owner'}</h2>
      {data.closure && <p>Previous closure: {label(data.closure.kind)} · {data.closure.kind === 'close_no_incident'
        ? `Complete data showed stable conversion. No cause was claimed.${data.closure.acknowledged?.length ? ` Closed past ${contrary(data.closure.acknowledged)}.` : ''}${data.closure.reason ? ` Owner's reason: ${data.closure.reason}` : ''}`
        : data.closure.reason || 'Recovery observed with uncertainty retained.'}</p>}
      {note && <p className="muted">{note}</p>}
      {!primary?.needsReason && reasonBox}
      <div className="button-row">{elsewhere('close_recovered') && <button data-action="close_recovered" disabled={disabled || !open || data.outcome?.state !== 'criterion_met'} onClick={() => onAction('close_recovered', reason)}>Close: recovery observed</button>}
        {elsewhere('close_no_incident') && <button data-action="close_no_incident" disabled={disabled || !!gate.refusal || (gate.reasonRequired && !reason.trim())} onClick={() => onAction('close_no_incident', reason)}>Close: no incident</button>}
        {elsewhere('close_unresolved') && <button data-action="close_unresolved" disabled={disabled || !open || !reason.trim() || data.decision === 'approved'} onClick={() => onAction('close_unresolved', reason)}>Close unresolved</button>}
        <button data-action="continue" disabled={disabled || remaining <= 0 || data.decision === 'approved'} onClick={() => onAction('continue', reason)}>Continue investigation</button></div></section>
    <details className="audit"><summary>Case history · {data.history.length} durable events · {data.attempts.length} attempts</summary>
      <p className="muted">Current synthetic service: {data.serviceVersion}. Simulation clock: {time(data.simulationClock)}.</p>
      {data.attempts.map(attempt => <details key={attempt.id}><summary>{attempt.id.slice(-8)} · {attempt.source} · {label(attempt.result?.terminalStatus ?? attempt.status)}</summary><pre>{JSON.stringify(attempt.result, null, 2)}</pre></details>)}
      <ol>{data.history.map(event => <li key={event.sequence}><strong>{label(event.kind)}</strong><details><summary>Inspect record</summary><pre>{JSON.stringify(event.payload, null, 2)}</pre></details></li>)}</ol>
    </details>
  </div>;
}
