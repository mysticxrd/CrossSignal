import type { DecisionCase } from "../db/case-decision";

const labels: Record<string, string> = {
  awaiting_runs: "Awaiting simulated runs", in_progress: "Simulation in progress",
  verified: "Both simulated scenarios verified",
};

export default function SimulationOutcomePanel({ outcome }: { outcome: DecisionCase["simulationOutcome"] }) {
  return <section className="case-section synthetic-checkout" aria-labelledby="simulation-outcome-title">
    <span className="eyebrow">SIMULATED OUTCOME · HARNESS CHECK</span>
    <h2 id="simulation-outcome-title">{labels[outcome.status]}</h2>
    <p>Pass condition: save one simulated success and one simulated decline with valid traces.</p>
    <ul>
      <li>Capture scenario: {outcome.counts.capture > 0 ? "verified" : "pending"} · {outcome.counts.capture} saved run(s)</li>
      <li>Decline scenario: {outcome.counts.decline > 0 ? "verified" : "pending"} · {outcome.counts.decline} saved run(s)</li>
    </ul>
    <p><strong>Revenue-leak Case: unresolved.</strong> These chosen scenarios test the harness; they do not demonstrate a repair or recovered revenue.</p>
    <p>Actual charge $0.00 · Mobile Safari verification pending device access · Business outcome not measured</p>
    <details><summary>Inspect assessment and simulation history</summary>
      <p>Recomputed from {outcome.runCount} saved run(s) on every reload. Method: {outcome.methodVersion}.</p>
      <p className="case-response-hash">Assessment hash <code>{outcome.contentHash}</code></p>
      <ol>{outcome.transitions.map(step => <li key={step.runId}>
        <strong>{labels[step.from]} → {labels[step.to]}</strong>
        <p className="case-response-hash"><code>{step.runId}</code><br />Run hash <code>{step.runHash}</code></p>
        <p>{step.executedAt} · SIMULATED {step.scenario}</p>
        <p className="case-response-hash">Trace: {step.eventIds.join(", ")}</p>
      </li>)}</ol>
    </details>
  </section>;
}
