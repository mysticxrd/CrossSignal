import { useEffect, useState } from 'react';
import { EvidenceList, Citations } from './Evidence';
import { type CaseView, type Session, type Plan, label, percent, time } from './types';
function PlanView({ plan }: { plan: Plan }) {
  return <p className="plan-text">Observe {plan.windows} fixed {plan.windowMinutes}-minute windows after the decision.
    Each needs at least {plan.minimumIntentsPerWindow} intents per cohort, {plan.completionMinutes} minutes for completion and {plan.arrivalMinutes} minutes for data arrival.
    Success requires at least <strong>{percent(plan.targetPercent)}</strong> conversion in both windows, with the control within {plan.controlTolerancePoints} percentage points of baseline.</p>;
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
  // Each stage is reached by its own record, never implied by a later one. Deferring or observing without acting records a decision without a finding.
  const latest = data.attempts.at(-1), reached = [true, data.investigation !== 'idle', !!data.finding || data.decision !== 'review', !!(data.receipt || data.anchor), !!data.outcome, !open];
  return <div className="case-content">
    <div className="case-heading"><div><p className="eyebrow">CASE / {data.id.slice(-8).toUpperCase()}</p><h1>New-subscription<br className="mobile-break" /> paid conversion</h1>
      <p className="subtitle">Investigate the drop. Make a bounded decision. Check the outcome.</p></div>
      <div className="heading-status"><span className={`status ${open ? 'open' : 'closed'}`}>{open ? 'Open Case' : 'Closed Case'}</span>
        <button className="text-button" disabled={busy} onClick={() => onAction(data.paused ? 'resume' : 'pause')}>{data.paused ? 'Resume actions' : 'Pause actions'}</button></div></div>
    {data.paused && <p role="status" className="notice">Actions are paused. A model request already sent may still finish; it cannot execute an action.</p>}
    <ol className="journey">{['Signal', 'Investigation', 'Decision', 'Simulation', 'Outcome', 'Closure'].map((name, i) => <li className={reached[i] ? 'reached' : ''} key={name}>
      <span>{String(i + 1).padStart(2, '0')}</span>{name}</li>)}</ol>
    <section className="signal-card" aria-labelledby="signal-title"><div className="section-top"><h2 id="signal-title">{signal.detected ? 'A conversion drop needs a decision' : signal.sufficient ? 'No conversion incident detected' : 'The signal is not yet reliable'}</h2>
      <span className="pill">{signal.detected ? 'Drop observed' : signal.sufficient ? 'Stable' : 'Incomplete data'}</span></div>
      <p>New self-serve subscriptions · two comparable 15-minute windows per period</p><div className="metrics">
        <div><span>BASELINE</span><strong>{percent(signal.baseline.conversionPercent)}</strong><small>{signal.baseline.successes} / {signal.baseline.intents} intents</small></div>
        <div><span>INCIDENT PERIOD</span><strong className={signal.detected ? 'negative' : ''}>{percent(signal.incident.conversionPercent)}</strong><small>{signal.incident.successes} / {signal.incident.intents} intents</small></div>
        <div><span>CHANGE</span><strong>{signal.dropPoints === null ? 'Unknown' : `${(-signal.dropPoints).toFixed(1)} pp`}</strong><small>Percentage points</small></div>
        <div><span>ASSISTED CONTROL</span><strong>{percent(signal.controlIncident.conversionPercent)}</strong><small>Baseline {percent(signal.controlBaseline.conversionPercent)}</small></div></div>
      <p className="metric-note">One eligible purchase intent counts once. Conversion requires first payment and subscription activation. Missing sources are never counted as zero.</p>
    </section>
    <div className="investigation-grid"><section className="panel investigation"><div className="section-top"><div><p className="eyebrow">01 / INVESTIGATE</p><h2>Competing explanations</h2></div><span className="pill">{label(data.investigation)}</span></div>
      {!data.finding && <p className="muted">{inFlight ? 'The investigator is reading the frozen evidence packet. You can reload; this attempt is durably recorded.'
        : latest ? `The attempt ended: ${label(latest.result?.terminalStatus ?? latest.status)}. Its record is retained.` : 'Ask the investigator to explain the evidence, compare alternatives and name what remains unknown.'}</p>}
      {data.finding && <><p className="muted">Model interpretation · attribution remains unverified</p><p className="finding-summary">{data.finding.signalSummary}</p>{data.finding.hypotheses.map(hypothesis => <article className="hypothesis" key={hypothesis.rank}>
        <h3><span>{hypothesis.rank}</span>{hypothesis.diagnosis}</h3><p>{hypothesis.summary}</p><span className="small-label">SUPPORTING EVIDENCE</span>
        <Citations ids={hypothesis.supportIds} evidence={data.snapshot.evidence} />{hypothesis.contradictionIds.length > 0 && <><span className="small-label">CONTRADICTING EVIDENCE</span><Citations ids={hypothesis.contradictionIds} evidence={data.snapshot.evidence} /></>}
      </article>)}{data.finding.claims.map((claim, i) => <div className="claim" key={i}><p>{claim.text}</p><Citations ids={claim.evidenceIds} evidence={data.snapshot.evidence} /></div>)}
        <div className="uncertainty"><h3>Still uncertain</h3>{data.finding.unresolvedAlternatives.length ? <ul>{data.finding.unresolvedAlternatives.map(text => <li key={text}>{text}</li>)}</ul> : <p>No alternatives were supplied. This is not proof of causality.</p>}</div></>}
      <div className="investigate-footer"><button className="primary" disabled={disabled || !open || !session.modelReady || remaining <= 0 || data.decision === 'approved'} onClick={() => onAction('investigate')}>
        {inFlight ? 'Investigation in progress…' : data.attempts.length ? 'Run another investigation' : 'Investigate this Case'}</button>
        <p className="muted">{session.source === 'fixture_surrogate' ? 'OFFLINE FIXTURE SURROGATE' : `${session.model} · ${session.profile} · free tier`}<br />
          {remaining} of {session.attemptCap} development attempts remain. {session.unavailableReason && label(session.unavailableReason)}</p>
        {remaining <= 0 && <p className="muted">The investigation budget is exhausted. Existing findings, proposal refresh, observations and closure remain available without another model call.</p>}</div>
    </section>
    <section className="panel decision"><p className="eyebrow">02 / DECIDE</p><h2>Your decision</h2>
      {data.proposal && data.decision === 'proposed' ? <><span className={expired ? "status" : "status eligible"}>{expired ? "Proposal expired" : "Eligible for your review"}</span><h3>Roll back billing in simulation</h3>
        <p>{data.proposal.action.from} → {data.proposal.action.to}</p><p>One execution. $0 spend. No external writes. Eligibility checks support this test; they do not establish causality.</p>
        <PlanView plan={data.proposal.measurementPlan} /><p className="muted">Approval {expired ? "expired" : "expires"} {time(data.proposal.expiresAt)}.</p>
        {expired && <p role="status" className="notice">Refresh this proposal to review a new approval window. This reuses the saved investigation and costs no model attempts.</p>}
        <button className={expired ? 'primary refresh-proposal' : 'refresh-proposal'} disabled={disabled || !open} onClick={() => onAction('refresh_proposal')}>Refresh proposal for review</button>
        <button className="primary approve" disabled={disabled || !open || expired} onClick={() => onAction('approve')}>Approve and run this simulation</button>
        <details><summary>Exact approval binding</summary><code className="hash">{data.proposal.hash}</code><p>Bound to this finding, evidence snapshot, service version and measurement plan.</p></details></>
        : data.receipt ? <><span className="status eligible">Simulation executed once</span><p>{data.receipt.action.from} → {data.receipt.action.to}</p>
          <p>Receipt recorded {time(data.receipt.executedAt)}. This proves the action ran; follow-up observations determine what happened next.</p>
          <p className="muted">Approval: {label(data.grant?.provenance ?? 'unknown')} · {data.grant?.actorId}</p></>
          : <><p>{data.finding?.recommendation.summary ?? 'Review the investigation before choosing an intervention.'}</p>
            {data.gate && !data.gate.eligible && <div className="gate-reasons"><h3>No executable proposal</h3><ul>{data.gate.reasons.map(item => <li key={item}>{item}</li>)}</ul></div>}
            <span className="pill">{label(data.decision)}</span>{data.finding && !data.anchor && open && <button disabled={disabled} onClick={() => onAction('refresh_proposal')}>Recheck proposal eligibility</button>}</>}
      {!data.anchor && open && data.decision !== 'approved' && <div className="decision-alternatives">{signal.detected
        ? <button disabled={disabled} onClick={() => onAction('observe_without_action')}>Observe without acting</button>
        : <p className="muted">There is no detected drop to measure recovery against, so there is nothing to observe without acting. Defer, or close unresolved with a reason.</p>}
        <button disabled={disabled || !reason.trim()} onClick={() => onAction('defer', reason)}>Defer with reason</button></div>}
    </section></div>
    <section className="panel"><div className="section-top"><div><p className="eyebrow">SOURCE RECORDS</p><h2>Evidence you can inspect</h2></div><span className="muted">Available by {time(data.snapshot.asOf)}</span></div>
      <EvidenceList evidence={data.snapshot.evidence} /></section>
    <section className="panel outcome"><div className="section-top"><div><p className="eyebrow">03 / OBSERVE</p><h2>What happened after the decision?</h2></div>
      <span className="pill">{data.outcome ? label(data.outcome.state) : data.anchor ? 'Collecting' : 'Awaiting decision'}</span></div>
      {data.plan ? <PlanView plan={data.plan} /> : <p className="muted">A fixed measurement plan is attached to an approved action or an explicit decision to observe without acting.</p>}
      {data.outcome && <><div className="outcome-result"><strong>{percent(data.outcome.observedPercent)}</strong><div><b>{label(data.outcome.state)}</b><p>{label(data.outcome.direction)}{data.outcome.changePoints !== null && ` · ${data.outcome.changePoints > 0 ? '+' : ''}${data.outcome.changePoints.toFixed(1)} percentage points from the incident`}</p></div></div>
        <p>{data.outcome.caveat}</p>{!data.receipt && <p className="notice">No intervention was executed. Any recovery cannot be credited to an action.</p>}
        <details><summary>Measurement windows and retained assessments ({data.outcomes.length})</summary>{data.outcomes.map(outcome => <div key={outcome.id} className="assessment">
          <h3>{label(outcome.state)} · {percent(outcome.observedPercent)}</h3><p>{time(outcome.start)} – {time(outcome.end)} · observed by {time(outcome.asOf)}</p>
          {outcome.rows.map((row, i) => <p key={i}>{row.cohort}: {row.successes}/{row.intents} · {percent(row.conversionPercent)} {row.limitation}</p>)}</div>)}</details></>}
      <button disabled={disabled || !data.anchor || data.observationStep >= 3} onClick={() => onAction('observe')}>
        {data.observationStep === 0 ? 'Advance simulation and observe' : data.observationStep === 1 ? 'Check late data for the same period' : data.observationStep === 2 ? 'Observe the later regression period' : 'All fixture periods observed'}</button>
      <p className="muted">Simulation time advances only when you choose to observe. Reloading this page has no effect.</p>
    </section>
    <section className="panel closure"><p className="eyebrow">04 / CLOSE THE LOOP</p><h2>{open ? 'Record your conclusion' : 'Case closed by the owner'}</h2>
      {data.closure && <p>Previous closure: {label(data.closure.kind)} · {data.closure.reason || 'Recovery observed with uncertainty retained.'}</p>}
      <label htmlFor="decision-reason">Decision or closure reason</label><textarea id="decision-reason" value={reason} maxLength={1000} onChange={event => setReason(event.target.value)} placeholder="What does the evidence justify, and what is still unresolved?" />
      <div className="button-row"><button disabled={disabled || !open || data.outcome?.state !== 'criterion_met'} onClick={() => onAction('close_recovered', reason)}>Close: recovery observed</button>
        <button disabled={disabled || !open || !reason.trim() || data.decision === 'approved'} onClick={() => onAction('close_unresolved', reason)}>Close unresolved</button>
        <button disabled={disabled || remaining <= 0 || data.decision === 'approved'} onClick={() => onAction('continue', reason)}>Continue investigation</button></div></section>
    <details className="audit"><summary>Case history · {data.history.length} durable events · {data.attempts.length} attempts</summary>
      <p className="muted">Current synthetic service: {data.serviceVersion}. Simulation clock: {time(data.simulationClock)}.</p>
      {data.attempts.map(attempt => <details key={attempt.id}><summary>{attempt.id.slice(-8)} · {attempt.source} · {label(attempt.result?.terminalStatus ?? attempt.status)}</summary><pre>{JSON.stringify(attempt.result, null, 2)}</pre></details>)}
      <ol>{data.history.map(event => <li key={event.sequence}><strong>{label(event.kind)}</strong><details><summary>Inspect record</summary><pre>{JSON.stringify(event.payload, null, 2)}</pre></details></li>)}</ol>
    </details>
  </div>;
}
