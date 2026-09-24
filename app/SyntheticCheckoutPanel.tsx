"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DecisionCase } from "../db/case-decision";
import { runSyntheticCheckoutAction } from "./synthetic-checkout-actions";

export default function SyntheticCheckoutPanel({ record }: { record: DecisionCase }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [scenario, setScenario] = useState<"capture" | "decline">("capture");
  const [pending, setPending] = useState<{ runId: string; scenario: "capture" | "decline" } | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  function run() {
    const request = pending ?? { runId: `sim_${crypto.randomUUID()}`, scenario };
    setPending(request);
    setError("");
    setMessage("");
    start(async () => {
      const result = await runSyntheticCheckoutAction(record.workspaceId, record.id,
        record.response.proposalHash, request.runId, request.scenario);
      if (result.ok) {
        setMessage(`${result.reused ? "Existing" : "New"} SIMULATED run saved: ${result.runId}`);
        setPending(null);
        router.refresh();
      } else setError(result.error);
    });
  }
  return <section className="case-section synthetic-checkout" aria-labelledby="synthetic-checkout-title">
    <div className="case-section-head"><div><span className="eyebrow">EXECUTABLE HARNESS · SIMULATED</span>
      <h2 id="synthetic-checkout-title">Run a synthetic TEST checkout</h2></div><span className="truth-badge truth-test">SIMULATED</span></div>
    <p>Test order: $50.00 in synthetic USD. Actual charge: $0.00. No payment provider is contacted.</p>
    <p>The selected scenario determines the simulated result. This does not verify Mobile Safari, diagnose the incident, or measure a business outcome.</p>
    <div className="synthetic-controls">
      <label>Simulation scenario <select value={scenario} disabled={busy || pending !== null} onChange={(e) => setScenario(e.target.value as typeof scenario)}>
        <option value="capture">Capture succeeds (simulated)</option><option value="decline">Capture declines (simulated)</option>
      </select></label>
      <button type="button" className="case-approve-button" disabled={busy || (!pending && record.simulatedCheckouts.length >= 20)} onClick={run}>
        {busy ? "Running simulation…" : pending ? "Retry same simulated run" : "Run simulated checkout"}
      </button>
    </div>
    <p className="synthetic-limit">{record.simulatedCheckouts.length} of 20 runs saved · each run has a unique ID and immutable trace</p>
    {pending && <p className="synthetic-run-id">Pending run <code>{pending.runId}</code></p>}
    <p role="status" aria-live="polite">{message}</p>
    {error && <p role="alert" className="case-approval-error">{error}</p>}
    <div className="synthetic-history">
      {record.simulatedCheckouts.map((run) => <details key={run.runId}>
        <summary>{run.captureStatus === "simulated_captured" ? "SIMULATED capture succeeded" : "SIMULATED capture declined"} · {new Date(run.executedAt).toLocaleString()}</summary>
        <p>Run ID <code>{run.runId}</code></p>
        <ol>{run.events.map((event) => <li key={event.id}><strong>{event.type.replaceAll("_", " ")}</strong><br /><code>{event.id}</code></li>)}</ol>
        <p>Artifact hash <code>{run.contentHash}</code></p>
        <p>Actual charge $0.00 · Device verification pending · Business outcome not measured</p>
      </details>)}
    </div>
    <p className="synthetic-device"><strong>Actual Mobile Safari verification: pending device access.</strong> The historical manual-check approval and excluded trial remain separate from these simulations.</p>
  </section>;
}
