import type { DecisionCaseResult } from "../db/case-decision";

function percent(bps: number) { return `${(bps / 100).toFixed(2)}%`; }
function money(cents: number) { return `$${(cents / 100).toFixed(2)}`; }

export default function CaseDecisionView({ result }: { result: DecisionCaseResult }) {
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
        <section className="case-response"><span className="eyebrow">RESPONSE</span><h2>No response proposed</h2>
          <p>The cause is unconfirmed. A specific action, recipients, scope, and cost must be prepared before approval can be offered for this Case.</p>
          <span className="case-response-state">Approval unavailable</span>
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
