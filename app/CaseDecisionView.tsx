"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveCaseResponseAction, recordCaseCheckAction } from "./case-response-actions";
import type { DecisionCaseResult } from "../db/case-decision";

function percent(bps: number) { return `${(bps / 100).toFixed(2)}%`; }
function money(cents: number) { return `$${(cents / 100).toFixed(2)}`; }

export default function CaseDecisionView({ result }: { result: DecisionCaseResult }) {
  const router = useRouter();
  const [approvalBusy, startApproval] = useTransition();
  const [approvalError, setApprovalError] = useState("");
  const [checkBusy, startCheck] = useTransition();
  const [checkError, setCheckError] = useState("");
  const [runReference, setRunReference] = useState("");
  const [captureStatus, setCaptureStatus] = useState<"captured" | "not_captured" | "indeterminate">("indeterminate");
  if (result.kind !== "found") {
    return <div className="case-page">
      <header className="case-heading"><span className="eyebrow">CASES</span><h1>Revenue signals</h1></header>
      <section className="case-empty">
        <h2>{result.kind === "unavailable" ? "Case evidence is temporarily unavailable" : "No Case in this workspace"}</h2>
        <p>{result.kind === "unavailable"
          ? "The saved Case could not be verified. No decision is available until its evidence can be checked."
          : "This workspace has no detected revenue-leak Case."}</p>
      </section>
    </div>;
  }

  const record = result.case;
  const metrics = record.metrics;
  const response = record.response;
  const proposal = response.proposal;
  function approve() {
    setApprovalError("");
    startApproval(async () => {
      const saved = await approveCaseResponseAction(record.workspaceId, record.id, response.proposalHash);
      if (saved.ok) router.refresh();
      else setApprovalError(saved.error);
    });
  }
  function recordCheck() {
    setCheckError("");
    startCheck(async () => {
      const saved = await recordCaseCheckAction(record.workspaceId, record.id,
        response.proposalHash, runReference.trim(), captureStatus);
      if (saved.ok) router.refresh();
      else setCheckError(saved.error);
    });
  }
  return <div className="case-page">
    <header className="case-heading">
      <div><span className="eyebrow">CASE / DETECTED SIGNAL</span><h1>{record.title}</h1>
        <p>{record.summary}</p></div>
      <div className="case-badges"><span className="truth-badge truth-fixture">FIXTURE</span><span className="truth-badge truth-test">TEST</span><span className="case-status">Ready for review</span></div>
    </header>

    <section className="case-metrics" aria-label="Recorded anomaly">
      <article><span>Mobile Safari conversion</span><strong>{percent(metrics.baseline.conversionBps)} <i>→</i> {percent(metrics.observed.conversionBps)}</strong><small>Baseline vs observed · {percent(metrics.relativeDropBps)} relative drop</small></article>
      <article><span>Captured revenue</span><strong>{money(metrics.baseline.revenueCents)} <i>→</i> {money(metrics.observed.revenueCents)}</strong><small>Recorded payment captures in each window</small></article>
      <article className="case-leak"><span>Baseline-rate revenue gap</span><strong>{money(metrics.projectedLeakCents)}</strong><small>Projection for the observed cohort; synthetic incident</small></article>
    </section>

    <div className="case-layout">
      <div className="case-main">
        <section className="case-section">
          <div className="case-section-head"><div><span className="eyebrow">INVESTIGATION</span><h2>Evidence for the signal</h2></div><span>3 claims · 42 event references</span></div>
          <p className="case-section-lead">Every finding below is tied to saved observations. Open a claim to inspect its dates, segment, counts, and event IDs.</p>
          {record.claims.map((claim) => <article className={`case-claim ${claim.relation}`} key={claim.id}>
            <div className="case-claim-top"><span>{claim.relation === "contradicts" ? "CONTRADICTORY EVIDENCE" : "SUPPORTING EVIDENCE"}</span><strong>{claim.source.replaceAll("_", " ")}</strong></div>
            <h3>{claim.finding}</h3>
            <details><summary>Inspect {claim.events.length} recorded events <span aria-hidden="true">＋</span></summary>
              <div className="case-event-scroll"><table><thead><tr><th>Date</th><th>Window</th><th>Segment</th><th>Observation</th><th>Event ID</th></tr></thead>
                <tbody>{claim.events.map((event) => <tr key={event.id}><td>{event.observedDay}</td><td>{event.window}</td><td>{event.segment.replaceAll("_", " ")}</td>
                  <td>{event.source === "checkout_analytics" ? `${event.completed} / ${event.starts} checkouts` : `${event.captures} captures · ${money(event.revenueCents)}`}</td><td><code>{event.id}</code></td></tr>)}</tbody>
              </table></div>
            </details>
            <footer>Evidence {claim.evidenceId} · Claim {claim.id}</footer>
          </article>)}
        </section>
      </div>

      <aside className="case-side">
        <section className="case-counter"><span className="eyebrow">COUNTERCHECK</span><h2>Desktop remained stable</h2>
          <strong>{percent(metrics.controlBaseline.conversionBps)} <i>→</i> {percent(metrics.controlObserved.conversionBps)}</strong>
          <p>This contradicts a campaign-wide checkout decline. It does not identify the cause of the Mobile Safari drop.</p>
        </section>
        <section className="case-response"><span className="eyebrow">CASE RESPONSE · TEST ONLY</span><h2>Validate checkout in TEST</h2>
          <p>{proposal.intent.instruction}</p>
          <dl className="case-response-details">
            <div><dt>Target</dt><dd>{proposal.intent.target}</dd></div>
            <div><dt>Scope</dt><dd>{proposal.intent.maxRuns} manual check · {proposal.intent.environment}</dd></div>
            <div><dt>Recipients</dt><dd>{proposal.intent.recipients.length === 0 ? "None" : proposal.intent.recipients.join(", ")}</dd></div>
            <div><dt>Cost cap</dt><dd>{money(proposal.intent.maxCostCents)}</dd></div>
            <div><dt>Authority</dt><dd>Workspace owner · exact proposal hash</dd></div>
            <div><dt>External write</dt><dd>None</dd></div>
          </dl>
          <p>{proposal.uncertainty}</p>
          {response.approval ? <span className="case-response-state">Approved by workspace owner · {new Date(response.approval.approvedAt).toLocaleString()}</span>
            : <button type="button" className="case-approve-button" disabled={approvalBusy} onClick={approve}>
              {approvalBusy ? "Saving approval…" : "Approve exact TEST response"}
            </button>}
          {approvalError && <p role="alert" className="case-approval-error">{approvalError}</p>}
          {response.receipt ? <div className="case-check-receipt">
            <strong>Owner-attested TEST check recorded</strong>
            <p>Run {response.receipt.runReference} · Payment capture {response.receipt.captureStatus.replaceAll("_", " ")} · {new Date(response.receipt.checkedAt).toLocaleString()}</p>
            <p>Receipt hash <code>{response.receipt.contentHash}</code></p>
          </div> : response.approval ? <div className="case-check-form">
            <p>After you perform the single manual TEST check, record its non-sensitive run reference and payment capture result. This records your attestation; it does not run checkout.</p>
            <label>TEST run reference <input value={runReference} maxLength={64} pattern="[A-Za-z0-9_-]{8,64}" placeholder="test-run-1234" onChange={(event) => setRunReference(event.target.value)} /></label>
            <label>Payment capture <select value={captureStatus} onChange={(event) => setCaptureStatus(event.target.value as typeof captureStatus)}>
              <option value="captured">Captured</option><option value="not_captured">Not captured</option><option value="indeterminate">Indeterminate</option>
            </select></label>
            <button type="button" className="case-approve-button" disabled={checkBusy || !/^[A-Za-z0-9_-]{8,64}$/.test(runReference)} onClick={recordCheck}>
              {checkBusy ? "Saving TEST check…" : "Record completed TEST check"}
            </button>
            {checkError && <p role="alert" className="case-approval-error">{checkError}</p>}
          </div> : null}
          <p className="case-response-hash">Proposal hash <code>{response.proposalHash}</code></p>
        </section>
        <section className="case-response-outcome"><span className="eyebrow">OUTCOME PLAN</span><h2>{record.outcome.status === "assessed" ? "Observed TEST follow-up" : "Awaiting observation"}</h2>
          <p><strong>{proposal.measurement.metric}</strong></p>
          <p>Baseline: {proposal.measurement.baseline}. Follow-up: {proposal.measurement.followUp}.</p>
          {record.outcome.status === "assessed" ? <>
            <p><strong>Correlation only · FIXTURE</strong> · Mobile Safari conversion {percent(record.outcome.incidentConversionBps!)} → {percent(record.outcome.conversionBps!)} across {record.outcome.starts} follow-up starts.</p>
            <p>{record.outcome.captures} TEST captures · {money(record.outcome.revenueCents!)} recorded. {record.outcome.limitation}</p>
            <details><summary>Inspect {record.outcome.eventIds.length} follow-up event IDs</summary><p className="case-response-hash">{record.outcome.eventIds.join(", ")}</p></details>
          </> : <p>{record.outcome.status === "awaiting_check" ? "A completed owner-attested TEST check is required before follow-up observations."
            : record.outcome.status === "collecting" ? `${record.outcome.daysRecorded} follow-up day(s) recorded; seven paired days are required.`
              : record.outcome.status === "insufficient_starts" ? `${record.outcome.starts} eligible starts recorded; at least ${record.outcome.minimumStarts} are required.`
                : "No separate follow-up observations have been recorded yet."} Any future assessment is correlation only; no recovered revenue is claimed.</p>}
        </section>
        <section className="case-provenance"><span className="eyebrow">RECORD</span><dl>
          <div><dt>Case</dt><dd><code>{record.id}</code></dd></div>
          <div><dt>Signal</dt><dd><code>{record.signalId}</code></dd></div>
          <div><dt>Investigation</dt><dd><code>{record.investigationId}</code></dd></div>
          <div><dt>Artifact hash</dt><dd><code>{record.investigationHash}</code></dd></div>
        </dl></section>
      </aside>
    </div>
    <p className="case-footnote">{record.limitations.join(" ")}</p>
  </div>;
}
