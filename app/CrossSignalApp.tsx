"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState, useTransition } from "react";
import {
  createWorkspaceAction,
  selectWorkspaceAction,
} from "./workspace-actions";
import { updateSeededCaseAction } from "./case-actions";
import type {
  CaseCommand,
  CaseEventSnapshot,
  CaseSnapshot,
  EvidenceItem,
} from "./case-types";
import type { OwnerSummary, WorkspaceSummary } from "./workspace-types";

type View = "dashboard" | "case" | "brain" | "connections" | "lab";

const navItems: Array<{ id: View; label: string; symbol: string }> = [
  { id: "dashboard", label: "Overview", symbol: "⌂" },
  { id: "case", label: "Case workspace", symbol: "◇" },
  { id: "brain", label: "Company brain", symbol: "✦" },
  { id: "connections", label: "Connections", symbol: "◎" },
  { id: "lab", label: "Lab preview", symbol: "↗" },
];

const stageLabels = [
  "Evidence review",
  "Approval required",
  "Awaiting implementation",
  "Measuring",
  "Learning review",
  "Closed",
];

const timelineSteps = ["Signal", "Investigate", "Intervene", "Measure", "Learn"];

const DEFAULT_REVIEWER_NOTE =
  "The browser segment and release timing are specific enough to proceed. Keep causal language provisional.";

const eventLabels: Record<string, string> = {
  case_materialized: "Fixture case materialized",
  evidence_registered: "Fixture evidence registered",
  case_reset: "Fixture cycle reset",
  evidence_approved: "Fixture evidence approved",
  intervention_approved: "Fixture intervention approved",
  implementation_confirmed: "Fixture implementation confirmed",
  measurement_completed: "Simulated-time outcome saved",
  learning_accepted: "Fixture learning event accepted",
};

type CrossSignalAppProps = {
  owner: OwnerSummary;
  workspace: WorkspaceSummary;
  workspaces: WorkspaceSummary[];
  initialCaseState: CaseSnapshot;
  evidenceItems: EvidenceItem[];
  caseEvents: CaseEventSnapshot[];
};

function initials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "WS";
}

export default function CrossSignalApp({
  owner,
  workspace,
  workspaces,
  initialCaseState,
  evidenceItems,
  caseEvents,
}: CrossSignalAppProps) {
  const router = useRouter();
  const [view, setView] = useState<View>("dashboard");
  const [caseState, setCaseState] = useState(initialCaseState);
  const caseStage = caseState.stage;
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanRunning, setScanRunning] = useState(false);
  const [toast, setToast] = useState("");
  const [issueTitle, setIssueTitle] = useState(initialCaseState.issueTitle);
  const [reviewerNote, setReviewerNote] = useState(DEFAULT_REVIEWER_NOTE);
  const [cohortConfirmed, setCohortConfirmed] = useState(false);
  const [published, setPublished] = useState(false);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false);
  const [workspaceCreateOpen, setWorkspaceCreateOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [workspaceError, setWorkspaceError] = useState("");
  const [workspacePending, startWorkspaceTransition] = useTransition();
  const [casePending, startCaseTransition] = useTransition();
  const toastTimerRef = useRef<number | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const workspaceNameInputRef = useRef<HTMLInputElement | null>(null);
  const ownerName = owner.fullName ?? owner.displayName;

  useEffect(() => {
    const closeOverlay = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setSelectedEvidence(null);
      setLedgerOpen(false);
      setScanOpen(false);
      setWorkspaceMenuOpen(false);
      setOwnerMenuOpen(false);
      setWorkspaceCreateOpen(false);
    };

    window.addEventListener("keydown", closeOverlay);
    return () => {
      window.removeEventListener("keydown", closeOverlay);
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
      if (scanTimerRef.current !== null) window.clearTimeout(scanTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (workspaceCreateOpen) workspaceNameInputRef.current?.focus();
  }, [workspaceCreateOpen]);

  const notify = (message: string) => {
    setToast(message);
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(""), 3200);
  };

  const selectWorkspace = (workspaceId: string) => {
    if (workspaceId === workspace.id) {
      setWorkspaceMenuOpen(false);
      return;
    }

    startWorkspaceTransition(async () => {
      const result = await selectWorkspaceAction(workspaceId);
      if (!result.ok) {
        notify(result.error);
        return;
      }
      setWorkspaceMenuOpen(false);
      router.refresh();
    });
  };

  const createWorkspace = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWorkspaceError("");
    startWorkspaceTransition(async () => {
      const result = await createWorkspaceAction(newWorkspaceName);
      if (!result.ok) {
        setWorkspaceError(result.error);
        return;
      }
      setNewWorkspaceName("");
      setWorkspaceCreateOpen(false);
      setWorkspaceMenuOpen(false);
      router.refresh();
    });
  };

  const runCaseCommand = (
    command: CaseCommand,
    payload: { issueTitle?: string; reviewerNote?: string },
    successMessage: string | ((reused: boolean) => string),
    onSuccess?: () => void,
  ) => {
    startCaseTransition(async () => {
      const result = await updateSeededCaseAction(
        workspace.id,
        command,
        payload,
      );
      if (!result.ok) {
        notify(result.error);
        return;
      }

      setCaseState(result.caseState);
      setIssueTitle(result.caseState.issueTitle);
      if (command === "reset_case") {
        setReviewerNote(DEFAULT_REVIEWER_NOTE);
        setCohortConfirmed(false);
        setPublished(false);
        setSelectedEvidence(null);
      }
      notify(
        typeof successMessage === "function"
          ? successMessage(result.reused)
          : successMessage,
      );
      onSuccess?.();
      router.refresh();
    });
  };

  const startScan = () => {
    setScanRunning(true);
    if (scanTimerRef.current !== null) window.clearTimeout(scanTimerRef.current);
    scanTimerRef.current = window.setTimeout(() => {
      setScanRunning(false);
      setScanOpen(false);
      runCaseCommand(
        "reset_case",
        {},
        "Fixture cycle reset · D1 case cycle saved",
        () => setView("dashboard"),
      );
    }, 1600);
  };

  const resetDemo = () => {
    runCaseCommand(
      "reset_case",
      {},
      "New case cycle saved · evidence review restored",
      () => setView("dashboard"),
    );
  };

  const timelineState = (index: number) => {
    if (index === 0) return "complete";
    if (index === 1) return caseStage === 0 ? "active" : "complete";
    if (index === 2) {
      if (caseStage < 1) return "locked";
      if (caseStage <= 2) return "active";
      return "complete";
    }
    if (index === 3) {
      if (caseStage < 3) return "locked";
      if (caseStage === 3) return "active";
      return "complete";
    }
    if (caseStage < 4) return "locked";
    if (caseStage === 4) return "active";
    return "complete";
  };

  const renderDecisionPanel = () => {
    if (caseStage === 0) {
      return (
        <div className="decision-card decision-card-active">
          <div className="decision-card-kicker">
            <span className="status-dot status-dot-warm" /> HUMAN GATE 1 OF 3
          </div>
          <h2>Is the evidence strong enough to act on?</h2>
          <p className="decision-summary">
            Four source records support a browser-specific checkout regression.
            One comparison weakens the traffic-quality alternative.
          </p>
          <div className="check-stack">
            <div><span>4</span> supporting observations</div>
            <div><span>1</span> useful contradiction</div>
            <div><span>1</span> identity gap · aggregate claims only</div>
          </div>
          <label className="field-label" htmlFor="review-note">Reviewer note</label>
          <textarea
            id="review-note"
            className="review-note"
            value={reviewerNote}
            onChange={(event) => setReviewerNote(event.target.value)}
            disabled={casePending}
          />
          <button
            className="button button-primary button-block"
            disabled={casePending || reviewerNote.trim().length === 0}
            onClick={() =>
              runCaseCommand(
                "approve_evidence",
                { reviewerNote },
                "Evidence accepted · intervention unlocked · ledger saved",
              )
            }
          >
            {casePending ? <><span className="spinner" /> Saving approval…</> : <>Continue to intervention <span aria-hidden="true">→</span></>}
          </button>
          <button
            className="button button-quiet button-block"
            onClick={() => notify("Dismissal with a stored reason is planned for a later phase")}
          >
            Dismiss case
          </button>
        </div>
      );
    }

    if (caseStage === 1) {
      return (
        <div className="decision-card decision-card-active">
          <div className="decision-card-kicker">
            <span className="status-dot status-dot-warm" /> HUMAN GATE 2 OF 3
          </div>
          <h2>Approve one scoped action</h2>
          <p className="decision-summary">
            This Phase 00 fixture records one proposed GitHub issue payload in
            D1. No provider or sandbox write occurs yet.
          </p>
          <label className="field-label" htmlFor="issue-title">Issue title</label>
          <textarea
            id="issue-title"
            className="payload-title"
            value={issueTitle}
            onChange={(event) => setIssueTitle(event.target.value)}
            disabled={casePending}
          />
          <div className="payload-preview">
            <div className="payload-row"><span>Repository</span><strong>atlas/checkout</strong></div>
            <div className="payload-row"><span>Permission</span><strong>issues:write</strong></div>
            <div className="payload-row"><span>Target cohort</span><strong>Mobile Safari · paid</strong></div>
            <div className="payload-row"><span>Follow-up</span><strong>14 days · min 50 exposures</strong></div>
          </div>
          <div className="approval-hash">
            <span>D1 approval hash</span>
            <code>Calculated on save</code>
          </div>
          <button
            className="button button-primary button-block"
            disabled={casePending || issueTitle.trim().length === 0}
            onClick={() =>
              runCaseCommand(
                "approve_intervention",
                { issueTitle },
                (reused) => reused
                  ? "Existing fixture approval restored · no duplicate event"
                  : "Fixture approval saved · generated receipt label stored in D1",
              )
            }
          >
            {casePending ? <><span className="spinner" /> Binding payload…</> : <>Save fixture approval</>}
          </button>
          <p className="demo-disclosure">Seeded demo · no external write is made.</p>
        </div>
      );
    }

    if (caseStage === 2) {
      return (
        <div className="decision-card">
          <div className="decision-card-kicker success-kicker">
            <span className="status-dot status-dot-green" /> FIXTURE ACTION RECORD
          </div>
          <h2>Generated issue label {caseState.externalReceiptLabel ?? "#184"}</h2>
          <p className="decision-summary">No external call occurred. D1 stores the approved fixture payload and generated label for this demo cycle.</p>
          <a className="issue-receipt" href="#case-action" onClick={(event) => event.preventDefault()}>
            <span className="issue-number">{caseState.externalReceiptLabel ?? "#184"}</span>
            <span>{issueTitle}</span>
            <span aria-hidden="true">↗</span>
          </a>
          <div className="payload-preview">
            <div className="payload-row"><span>Deployment</span><strong>demo-2026.08.08</strong></div>
            <div className="payload-row"><span>Implemented at</span><strong>8 Aug · 10:30 UTC</strong></div>
          </div>
          <label className="check-control">
            <input
              type="checkbox"
              checked={cohortConfirmed}
              onChange={(event) => setCohortConfirmed(event.target.checked)}
            />
            <span>I confirm the fix reached the preregistered Mobile Safari cohort.</span>
          </label>
          <button
            className="button button-primary button-block"
            disabled={!cohortConfirmed || casePending}
            onClick={() =>
              runCaseCommand(
                "mark_implemented",
                {},
                "Fixture implementation event saved · simulated-time control unlocked",
              )
            }
          >
            {casePending ? <><span className="spinner" /> Saving receipt…</> : <>Mark implemented</>}
          </button>
        </div>
      );
    }

    if (caseStage === 3) {
      return (
        <div className="decision-card">
          <div className="decision-card-kicker info-kicker">
            <span className="status-dot status-dot-blue" /> SIMULATED-TIME DEMO
          </div>
          <h2>Waiting for enough exposure</h2>
          <p className="decision-summary">
            No production scheduler or exposure collector is running. The
            fixture uses the same frozen metric, cohort, and comparison windows.
          </p>
          <div className="measure-meter">
            <div className="measure-meter-label"><span>Eligible sessions</span><strong>12 / 50</strong></div>
            <div className="measure-track"><span /></div>
          </div>
          <div className="payload-preview">
            <div className="payload-row"><span>Baseline</span><strong>25 Jul – 7 Aug</strong></div>
            <div className="payload-row"><span>Comparison</span><strong>9 Aug – 22 Aug</strong></div>
            <div className="payload-row"><span>Tolerance</span><strong>±5% relative</strong></div>
          </div>
          <button
            className="button button-primary button-block"
            disabled={casePending}
            onClick={() =>
              runCaseCommand(
                "simulate_measurement",
                {},
                "Simulated-time fixture outcome saved to the D1 ledger",
              )
            }
          >
            {casePending ? <><span className="spinner" /> Recording outcome…</> : <>Simulate 14-day time jump</>}
          </button>
          <p className="demo-disclosure">Explicit demo control · production time never jumps.</p>
        </div>
      );
    }

    if (caseStage === 4) {
      return (
        <div className="decision-card decision-card-active">
          <div className="decision-card-kicker">
            <span className="status-dot status-dot-warm" /> FIXTURE LEARNING REVIEW
          </div>
          <div className="outcome-lockup">
            <span className="outcome-icon">↑</span>
            <div><span>Fixture outcome</span><strong>Improved</strong></div>
            <b>+18.7%</b>
          </div>
          <h2>Accept this learning?</h2>
          <p className="decision-summary">
            The simulated-time fixture moves Mobile Safari paid conversion from
            4.8% to 5.7% across 73 eligible sessions.
          </p>
          <div className="diff-card">
            <div className="diff-path">company/brain/learnings.md</div>
            <p><span>+</span> Checkout interaction changes require Mobile Safari regression coverage before release.</p>
            <p><span>+</span> Provenance: CS-014 · confidence: medium</p>
          </div>
          <button
            className="button button-primary button-block"
            disabled={casePending}
            onClick={() =>
              runCaseCommand(
                "accept_learning",
                {},
                "Fixture learning event saved · case closed · ICM brain unchanged",
              )
            }
          >
            {casePending ? <><span className="spinner" /> Saving event…</> : <>Accept fixture record &amp; close</>}
          </button>
          <button className="button button-quiet button-block" onClick={() => notify("Learning kept provisional")}>Keep provisional</button>
          <p className="demo-disclosure">Preview only · a canonical ICM Company Brain is planned for Phase 01.</p>
        </div>
      );
    }

    return (
      <div className="decision-card closed-card">
        <div className="closed-mark">✓</div>
        <div className="decision-card-kicker success-kicker">DECISION LOOP COMPLETE</div>
        <h2>Case CS-014 is closed</h2>
        <p className="decision-summary">
          Fixture evidence, approvals, the generated action label, simulated
          outcome, and learning event are preserved in the D1 ledger.
        </p>
        <button className="button button-primary button-block" onClick={() => setView("brain")}>View accepted learning</button>
        <button className="button button-quiet button-block" disabled={casePending} onClick={resetDemo}>Start a new case cycle</button>
      </div>
    );
  };

  const renderDashboard = () => (
    <>
      <section className="page-heading page-heading-dashboard">
        <div>
          <div className="eyebrow">ATLAS FOUNDRY · VERSIONED FIXTURE WORKSPACE</div>
          <h1>Your business changed.<br /><span>Here is what needs a decision.</span></h1>
        </div>
        <button className="button button-dark" onClick={() => setScanOpen(true)}>
          <span className="button-pulse" aria-hidden="true" /> Run scan
        </button>
      </section>

      <section className="metric-grid" aria-label="North-star metric summary">
        <article className="metric-card">
          <div className="card-topline">
            <span className="eyebrow">NORTH-STAR · PAID CONVERSION</span>
            <span className="metric-version">v3</span>
          </div>
          <div className="metric-body">
            <div>
              <div className="metric-number">4.8<span>%</span></div>
              <div className="metric-change"><span>↓ 22.4%</span> vs previous 7 days</div>
            </div>
            <div className="bar-chart" aria-label="Conversion trend declined over eight periods">
              {[76, 80, 74, 69, 61, 49, 43, 40].map((height, index) => (
                <span
                  key={`bar-${index}`}
                  className={index > 4 ? "bar-alert" : ""}
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>
          <div className="metric-footer">
            <span>184 fixture sessions</span><span>25 Jul – 7 Aug 2026</span><span>Snapshot v1</span>
          </div>
        </article>

        <article className="signal-brief">
          <div className="signal-brief-top">
            <span className="signal-label">FIXTURE SIGNAL</span>
            <span className="confidence-chip">Medium · fixture rubric</span>
          </div>
          <h2>Checkout conversion dropped after a mobile release.</h2>
          <p>Four sources align on the same cohort and window. Desktop conversion is the useful counterfactual.</p>
          <div className="signal-sequence" aria-label="Evidence sequence">
            <span><i className="sequence-dot dot-blue" />Campaign</span>
            <b>→</b>
            <span><i className="sequence-dot dot-orange" />Release</span>
            <b>→</b>
            <span><i className="sequence-dot dot-red" />Regression</span>
          </div>
          <button className="text-link light-link" onClick={() => setView("case")}>Inspect the decision case <span aria-hidden="true">↗</span></button>
        </article>
      </section>

      <section className="work-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">DECISION QUEUE</span>
            <h2>One case, one clear gate</h2>
          </div>
          <div className="queue-legend"><span><i className="legend-dot needs" /> Needs you</span><span><i className="legend-dot moving" /> In progress</span><span><i className="legend-dot closed" /> Closed</span></div>
        </div>
        <div className="queue-grid">
          <div className="queue-lane">
            <div className="lane-heading"><span>{caseStage === 5 ? "CLOSED" : "NEEDS YOU"}</span><b>1</b></div>
            <button className="case-card" onClick={() => setView("case")}>
              <div className="case-card-top"><span>CS-014</span><span className={caseStage === 5 ? "case-state closed-state" : "case-state"}>{stageLabels[caseStage]}</span></div>
              <h3>Mobile Safari checkout regression after release</h3>
              <p>{caseStage === 5 ? "Simulated outcome and accepted D1 learning event" : "Versioned PostHog-like, Stripe-test-like, support, and GitHub-like fixtures are ready for review."}</p>
              <div className="source-stack" aria-label="Four fixture source classes loaded">
                <span className="source-posthog">P</span><span className="source-stripe">S</span><span className="source-support">C</span><span className="source-github">G</span>
              </div>
              <div className="case-card-footer"><span>{caseStage === 5 ? "Fixture outcome +18.7%" : "Fixture relevance 92 / 100"}</span><span>Open case →</span></div>
            </button>
          </div>
          <div className="queue-lane quiet-lane">
            <div className="lane-heading"><span>IN PROGRESS</span><b>0</b></div>
            <div className="lane-empty">No EVE runtime is connected in Phase 00.<br /><span>Durable agent parking is planned for Phase 03.</span></div>
          </div>
          <div className="queue-lane quiet-lane">
            <div className="lane-heading"><span>MEASURING</span><b>{caseStage === 3 ? 1 : 0}</b></div>
            <div className="lane-empty">{caseStage === 3 ? "CS-014 is ready for a simulated fixture window." : "No fixture outcome is waiting."}<br /><span>Production schedules · deferred</span></div>
          </div>
        </div>
      </section>

      <section className="coverage-strip">
        <div><span className="eyebrow">FIXTURE COVERAGE</span><strong>4 / 4 snapshots loaded</strong></div>
        <div className="coverage-sources">
          <span><i className="coverage-icon source-posthog">P</i>PostHog-like <b>v1</b></span>
          <span><i className="coverage-icon source-stripe">S</i>Stripe-test-like <b>v1</b></span>
          <span><i className="coverage-icon source-github">G</i>GitHub-like <b>v1</b></span>
          <span><i className="coverage-icon source-support">C</i>Support fixture <b>v1</b></span>
        </div>
        <button className="text-link" onClick={() => setView("connections")}>Manage sources</button>
      </section>
    </>
  );

  const renderCase = () => (
    <>
      <section className="case-header">
        <button className="back-link" onClick={() => setView("dashboard")}><span aria-hidden="true">←</span> Overview</button>
        <div className="case-title-row">
          <div>
            <div className="case-id-line"><span>CS-014</span><i /> <span>{stageLabels[caseStage]}</span></div>
            <h1>{caseState.title}</h1>
          </div>
          <div className="case-header-actions">
            <span className="confidence-chip dark-chip">Medium · fixture rubric</span>
            <button className="icon-button" aria-label="More case options">•••</button>
          </div>
        </div>
        <div className="case-facts">
          <span><small>TARGET METRIC</small>Paid conversion · v3</span>
          <span><small>WINDOW</small>24 Jul – 7 Aug</span>
          <span><small>OWNER</small>You</span>
          <span><small>EVE COST</small>Not running · Phase 03</span>
          <span><small>WORKSPACE LEDGER</small>{caseState.eventCount} events · append-only</span>
          <span><small>CASE CYCLE</small>{String(caseState.cycle).padStart(2, "0")} · saved</span>
        </div>
      </section>

      <ol className="decision-timeline" aria-label="Case decision timeline">
        {timelineSteps.map((step, index) => {
          const state = timelineState(index);
          return (
            <li key={step} className={`timeline-${state}`}>
              <span>{state === "complete" ? "✓" : index + 1}</span>
              <div><strong>{step}</strong><small>{state === "active" ? "Current gate" : state}</small></div>
            </li>
          );
        })}
      </ol>

      <section className="case-layout">
        <div className="case-main-column">
          <article className="evidence-section">
            <div className="section-heading compact-heading">
              <div><span className="eyebrow">EVIDENCE MAP</span><h2>What the records show</h2></div>
              <div className="evidence-legend"><span><i className="legend-dot support" /> Supports</span><span><i className="legend-dot challenge" /> Challenges</span></div>
            </div>
            <p className="section-intro">Observations stay separate from the explanation and are stored once per workspace. Select a stamp to inspect its immutable query, scope, and content hash.</p>
            <div className="evidence-map">
              <div className="evidence-row evidence-row-top">
                {evidenceItems.slice(0, 2).map((item) => (
                  <button key={item.id} className="evidence-node" onClick={() => setSelectedEvidence(item)}>
                    <span className={`node-source ${item.sourceClass}`}>{item.source.slice(0, 1)}</span>
                    <span className="node-copy"><small>{item.stamp} · {item.eyebrow}</small><strong>{item.title}</strong><em>{item.value} <b>{item.delta}</b></em></span>
                    <span className="node-open" aria-hidden="true">↗</span>
                  </button>
                ))}
              </div>
              <div className="hypothesis-node">
                <span className="eyebrow">LEADING HYPOTHESIS</span>
                <h3>The checkout release introduced a Mobile Safari interaction failure.</h3>
                <div><span>Confidence</span><strong>Medium · 68%</strong></div>
              </div>
              <div className="evidence-row evidence-row-bottom">
                {evidenceItems.slice(2, 4).map((item) => (
                  <button key={item.id} className="evidence-node" onClick={() => setSelectedEvidence(item)}>
                    <span className={`node-source ${item.sourceClass}`}>{item.source.slice(0, 1)}</span>
                    <span className="node-copy"><small>{item.stamp} · {item.eyebrow}</small><strong>{item.title}</strong><em>{item.value} <b>{item.delta}</b></em></span>
                    <span className="node-open" aria-hidden="true">↗</span>
                  </button>
                ))}
              </div>
            </div>
          </article>

          <article className="skeptic-card">
            <div className="skeptic-mark">S</div>
            <div className="skeptic-content">
              <div className="card-topline"><span className="eyebrow">SKEPTIC FIXTURE</span><span>NO EVE RUN YET</span></div>
              <h3>Traffic quality is possible, but the browser split argues against it.</h3>
              <p>The campaign increased landing engagement, so lower-intent traffic is a viable alternative. However, desktop conversion held flat for the same campaign and window.</p>
              <button className="contradiction-row" onClick={() => setSelectedEvidence(evidenceItems[4])}>
                <span className="relation-tag">{evidenceItems[4].stamp} · CHALLENGES ALTERNATIVE</span>
                <strong>Desktop paid conversion held at 6.4%</strong>
                <span>Open source ↗</span>
              </button>
            </div>
          </article>

          <article className="hypothesis-section">
            <div className="section-heading compact-heading"><div><span className="eyebrow">EXPLANATIONS, NOT CONCLUSIONS</span><h2>Hypotheses to test</h2></div></div>
            <div className="hypothesis-grid">
              <div className="hypothesis-card leading-card"><div className="hypothesis-card-top"><span>LEADING</span><b>68%</b></div><h3>Release regression on Mobile Safari</h3><p>The updated checkout interaction fails or stalls on WebKit, reducing successful submissions.</p><div><small>FALSIFICATION TEST</small><strong>Reproduce on iOS Safari and restore conversion after a scoped fix.</strong></div></div>
              <div className="hypothesis-card"><div className="hypothesis-card-top"><span>ALTERNATIVE</span><b>32%</b></div><h3>Lower-intent campaign traffic</h3><p>The new campaign brought more visitors who engage but were less likely to buy.</p><div><small>WHAT WEAKENS IT</small><strong>Desktop conversion for the same campaign remained stable.</strong></div></div>
            </div>
          </article>
        </div>
        <aside className="decision-rail" id="case-action">
          {renderDecisionPanel()}
          <div className="artifact-card">
            <div><span className="eyebrow">REAL D1 CASE LEDGER</span><span className="version-chip">{caseState.eventCount} events</span></div>
            <strong>ICM evidence brief · planned</strong>
            <p>Last D1 event · {eventLabels[caseState.lastEventType] ?? caseState.lastEventType} · saved to {workspace.name}</p>
            <button className="text-link" onClick={() => setLedgerOpen(true)}>Open complete ledger <span aria-hidden="true">→</span></button>
          </div>
        </aside>
      </section>
    </>
  );

  const renderBrain = () => (
    <>
      <section className="page-heading secondary-heading">
        <div><div className="eyebrow">PLANNED ICM COMPANY BRAIN</div><h1>Company brain preview</h1><p>This fixture shows the intended structure. No canonical Git-backed ICM brain exists in Phase 00.</p></div>
        <button className="button button-secondary" onClick={() => notify("Company Brain export is planned for a later phase")}>Export planned</button>
      </section>
      <section className="brain-grid">
        <article className="brain-profile"><span className="eyebrow">FIXTURE COMPANY IDENTITY</span><h2>{workspace.name}</h2><p>Workflow automation for independent design studios.</p><dl><div><dt>Primary customer</dt><dd>Studio owner · 2–10 people</dd></div><div><dt>Timezone</dt><dd>America/Los_Angeles</dd></div><div><dt>Product promise</dt><dd>Keep client delivery moving without project-manager overhead.</dd></div></dl></article>
        <article className="brain-metric"><span className="eyebrow">FIXTURE METRIC · V3</span><h2>Paid conversion</h2><div className="metric-definition"><span>checkout_success</span><b>÷</b><span>eligible_landing</span></div><p>Segment: paid acquisition · minimum exposure: 50 · tolerance: 5%</p></article>
      </section>
      <section className="learning-ledger">
        <div className="section-heading"><div><span className="eyebrow">D1 LEARNING EVENT PREVIEW</span><h2>{caseStage === 5 ? "One accepted fixture event" : "One provisional fixture"}</h2></div><span className={caseStage === 5 ? "brain-state accepted" : "brain-state"}>{caseStage === 5 ? "D1 EVENT SAVED" : "AWAITING FIXTURE OUTCOME"}</span></div>
        <div className="learning-row"><div className="learning-icon">{caseStage === 5 ? "✓" : "?"}</div><div><h3>Checkout interaction changes require Mobile Safari regression coverage.</h3><p>{caseStage === 5 ? "The D1 fixture learning event is saved; canonical ICM merge remains planned." : "Proposed by fixture CS-014. It is not canonical Company Brain knowledge."}</p><div><span>Fixture case · CS-014</span><span>Confidence · medium</span><span>{caseStage === 5 ? "Fixture date · 22 Aug 2026" : "Provisional"}</span></div></div><button className="text-link" onClick={() => setView("case")}>Open fixture provenance</button></div>
      </section>
    </>
  );

  const renderConnections = () => (
    <>
      <section className="page-heading secondary-heading">
        <div><div className="eyebrow">FIXTURE ADAPTER PREVIEW</div><h1>Sources &amp; planned policies</h1><p>No live provider is connected. Four versioned fixture snapshots support the demo case.</p></div>
        <button className="button button-secondary" onClick={() => notify("Fixture manifest v1 is loaded; live revalidation is planned")}>Review fixture manifest</button>
      </section>
      <section className="readiness-card"><div><span className="eyebrow">DEMO FIXTURE READINESS</span><h2>4 of 4 snapshots loaded</h2></div><div className="readiness-bar"><span /></div><strong>Ready to replay</strong></section>
      <section className="connection-grid">
        {[
          ["P", "source-posthog", "PostHog-like fixture", "Versioned events & funnels", "Snapshot v1", "25 Jul → 7 Aug 2026"],
          ["S", "source-stripe", "Stripe-test-like fixture", "Synthetic subscriptions & charges", "Snapshot v1", "Synthetic test records"],
          ["G", "source-github", "GitHub-like fixture", "Synthetic release metadata", "Snapshot v1", "Fixture repo: atlas/checkout"],
          ["C", "source-support", "Support fixture", "Synthetic imported messages", "Snapshot v1", "24 synthetic records"],
        ].map(([letter, className, name, scope, snapshot, range]) => (
          <article className="connection-card" key={name}>
            <div className="connection-card-head"><span className={`connection-logo ${className}`}>{letter}</span><span className="healthy-pill"><i /> Fixture loaded</span></div>
            <h2>{name}</h2><p>{scope}</p>
            <dl><div><dt>Capture</dt><dd>{snapshot}</dd></div><div><dt>Coverage</dt><dd>{range}</dd></div></dl>
            <button className="text-link" onClick={() => notify(`${name} fixture details opened`)}>Review fixture</button>
          </article>
        ))}
      </section>
      <section className="policy-row"><div><span className="eyebrow">PHASE 04 SANDBOX POLICY</span><h3>Planned: one sandbox issue per approved intervention</h3><p>Target allow-list, expiry, payload binding, consumption, and reconciliation are not enforced in Phase 00.</p></div><span className="policy-lock">PLANNED · FAIL CLOSED</span></section>
    </>
  );

  const renderLab = () => (
    <>
      <section className="page-heading secondary-heading">
        <div><div className="eyebrow">LOCAL LAB PREVIEW · NOT PUBLIC</div><h1>CrossSignal Lab preview</h1><p>This fixture previews a later sanitization and publication flow. No public artifact is created.</p></div>
        <span className="lab-release">EVAL SUITE · NOT RUN</span>
      </section>
      <section className="lab-preview">
        <div className="lab-preview-copy"><span className="eyebrow">FIXTURE CASE PREVIEW</span><h2>Checkout recovery after a browser-specific regression</h2><p>Four fixture source classes supported a proposed action. The simulated-time fixture outcome improved by 18.7%.</p><div className="public-flow"><span>Fixture evidence <b>4 classes</b></span><i>→</i><span>Action <b>D1 label</b></span><i>→</i><span>Outcome <b>Simulated</b></span></div></div>
        <div className="publish-panel">
          <span className={`publish-state ${published ? "is-published" : ""}`}><i />{published ? "Local preview on" : "Local preview off"}</span>
          <h3>{caseStage === 5 ? "Eligible for a later sanitization flow" : "Finish the fixture loop first"}</h3>
          <ul><li>Planned: remove direct identifiers</li><li>Planned: summarize source excerpts</li><li>Planned: exclude prompts and traces</li><li>Planned: approve metrics for sharing</li></ul>
          <button className="button button-primary button-block" disabled={caseStage !== 5} onClick={() => { setPublished(!published); notify(published ? "Local preview hidden; no hosted state changed" : "Local preview shown; no public release created"); }}>{published ? "Hide local preview" : "Show local preview"}</button>
          {caseStage !== 5 && <button className="text-link center-link" onClick={() => setView("case")}>Return to CS-014</button>}
        </div>
      </section>
    </>
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setView("dashboard")} aria-label="CrossSignal overview">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span><strong>CrossSignal</strong><small>Revenue flight recorder</small></span>
        </button>
        <div className="workspace-control">
          <button
            className="workspace-switcher"
            aria-expanded={workspaceMenuOpen}
            aria-haspopup="menu"
            onClick={() => {
              setWorkspaceMenuOpen((open) => !open);
              setOwnerMenuOpen(false);
            }}
          >
            <span className="workspace-avatar">{initials(workspace.name)}</span>
            <span><strong>{workspace.name}</strong><small>Owner workspace</small></span>
            <span aria-hidden="true">⌄</span>
          </button>
          {workspaceMenuOpen && (
            <div className="workspace-menu" role="menu" aria-label="Your workspaces">
              <div className="workspace-menu-label">YOUR WORKSPACES</div>
              {workspaces.map((candidate) => (
                <button
                  key={candidate.id}
                  role="menuitem"
                  className={candidate.id === workspace.id ? "active" : ""}
                  disabled={workspacePending}
                  onClick={() => selectWorkspace(candidate.id)}
                >
                  <span className="workspace-avatar">{initials(candidate.name)}</span>
                  <span><strong>{candidate.name}</strong><small>{candidate.role}</small></span>
                  <i aria-hidden="true">{candidate.id === workspace.id ? "✓" : ""}</i>
                </button>
              ))}
              <button
                className="workspace-create-trigger"
                role="menuitem"
                onClick={() => {
                  setWorkspaceError("");
                  setWorkspaceCreateOpen(true);
                  setWorkspaceMenuOpen(false);
                }}
              >
                <span aria-hidden="true">+</span> Create workspace
              </button>
            </div>
          )}
        </div>
        <nav className="main-nav" aria-label="Main navigation">
          <span className="nav-label">WORKSPACE</span>
          {navItems.map((item) => (
            <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}>
              <span className="nav-symbol" aria-hidden="true">{item.symbol}</span>
              <span>{item.label}</span>
              {item.id === "case" && caseStage < 5 && <b>1</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="system-card">
          <div><span className="system-orbit"><i /></span><span><strong>Demo shell ready</strong><small>Fixture cycle · {String(caseState.cycle).padStart(2, "0")}</small></span></div>
          <button onClick={() => setScanOpen(true)}>Reset fixture cycle</button>
        </div>
        <div className="owner-control">
          <button
            className="owner-row"
            aria-expanded={ownerMenuOpen}
            aria-haspopup="menu"
            onClick={() => {
              setOwnerMenuOpen((open) => !open);
              setWorkspaceMenuOpen(false);
            }}
          >
            <span className="owner-avatar">{initials(ownerName)}</span>
            <span><strong>{ownerName}</strong><small>Workspace owner</small></span>
            <i aria-hidden="true">•••</i>
          </button>
          {ownerMenuOpen && (
            <div className="owner-menu" role="menu">
              <span className="owner-menu-role"><i /> AUTHENTICATED OWNER</span>
              <strong>{ownerName}</strong>
              <small>{owner.email}</small>
              <dl><div><dt>Workspace</dt><dd>{workspace.name}</dd></div><div><dt>Access</dt><dd>Owner only</dd></div></dl>
              <a role="menuitem" href="/signout-with-chatgpt?return_to=%2F">Sign out</a>
            </div>
          )}
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="breadcrumb"><span>{workspace.name}</span><i>/</i><strong>{navItems.find((item) => item.id === view)?.label}</strong></div>
          <div className="mobile-workspace-control">
            <button
              className="mobile-workspace-trigger"
              aria-expanded={workspaceMenuOpen}
              aria-haspopup="menu"
              onClick={() => setWorkspaceMenuOpen((open) => !open)}
            >
              <span>{initials(workspace.name)}</span>
              <strong>{workspace.name}</strong>
              <i aria-hidden="true">⌄</i>
            </button>
            {workspaceMenuOpen && (
              <div className="workspace-menu mobile-workspace-menu" role="menu" aria-label="Your workspaces">
                <div className="workspace-menu-label">YOUR WORKSPACES</div>
                {workspaces.map((candidate) => (
                  <button
                    key={candidate.id}
                    role="menuitem"
                    className={candidate.id === workspace.id ? "active" : ""}
                    disabled={workspacePending}
                    onClick={() => selectWorkspace(candidate.id)}
                  >
                    <span className="workspace-avatar">{initials(candidate.name)}</span>
                    <span><strong>{candidate.name}</strong><small>{candidate.role}</small></span>
                    <i aria-hidden="true">{candidate.id === workspace.id ? "✓" : ""}</i>
                  </button>
                ))}
                <button
                  className="workspace-create-trigger"
                  role="menuitem"
                  onClick={() => {
                    setWorkspaceError("");
                    setWorkspaceCreateOpen(true);
                    setWorkspaceMenuOpen(false);
                  }}
                >
                  <span aria-hidden="true">+</span> Create workspace
                </button>
                <div className="mobile-owner-footer">
                  <span><strong>{ownerName}</strong><small>{owner.email}</small></span>
                  <a role="menuitem" href="/signout-with-chatgpt?return_to=%2F">Sign out</a>
                </div>
              </div>
            )}
          </div>
          <div className="topbar-actions"><span className="demo-chip"><i /> RESULT DEMO · FIXTURES</span><button className="topbar-icon" aria-label="Open activity">⌁</button><button className="topbar-icon" aria-label="Open help">?</button></div>
        </header>
        <div className={`content ${view === "case" ? "case-content" : ""}`}>
          {view === "dashboard" && renderDashboard()}
          {view === "case" && renderCase()}
          {view === "brain" && renderBrain()}
          {view === "connections" && renderConnections()}
          {view === "lab" && renderLab()}
        </div>
      </main>

      {workspaceCreateOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !workspacePending) setWorkspaceCreateOpen(false);
        }}>
          <div className="workspace-create-modal" role="dialog" aria-modal="true" aria-labelledby="workspace-create-title">
            <button className="modal-close" aria-label="Close workspace dialog" disabled={workspacePending} onClick={() => setWorkspaceCreateOpen(false)}>×</button>
            <div className="workspace-modal-mark" aria-hidden="true">+</div>
            <div className="eyebrow">OWNER ACTION</div>
            <h2 id="workspace-create-title">Create another workspace</h2>
            <p>Evidence, approvals, and future connector credentials will remain isolated to this workspace.</p>
            <form onSubmit={createWorkspace}>
              <label className="field-label" htmlFor="new-workspace-name">Company or product name</label>
              <input
                id="new-workspace-name"
                ref={workspaceNameInputRef}
                value={newWorkspaceName}
                onChange={(event) => setNewWorkspaceName(event.target.value)}
                minLength={2}
                maxLength={64}
                autoComplete="organization"
                disabled={workspacePending}
                required
              />
              {workspaceError && <p className="form-error" role="alert">{workspaceError}</p>}
              <button className="button button-primary button-block" disabled={workspacePending || newWorkspaceName.trim().length < 2}>
                {workspacePending ? <><span className="spinner" /> Creating workspace…</> : <>Create owner workspace <span aria-hidden="true">→</span></>}
              </button>
            </form>
            <p className="demo-disclosure">Membership is checked again on the server before every switch.</p>
          </div>
        </div>
      )}

      {scanOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !scanRunning) setScanOpen(false);
        }}>
          <div className="scan-modal" role="dialog" aria-modal="true" aria-labelledby="scan-title">
            <button className="modal-close" aria-label="Close scan dialog" disabled={scanRunning} onClick={() => setScanOpen(false)}>×</button>
            <span className={`scan-radar ${scanRunning ? "is-running" : ""}`} aria-hidden="true"><i /><i /></span>
            <div className="eyebrow">FIXTURE CYCLE RESET</div>
            <h2 id="scan-title">Replay the frozen 14-day fixture?</h2>
            <p>Phase 00 does not run a detector or EVE agent. This control advances the D1 case cycle and restores the versioned fixture presentation.</p>
            <div className="scan-details"><div><span>Fixture window</span><strong>25 Jul – 7 Aug 2026</strong></div><div><span>Snapshots</span><strong>4 loaded · v1</strong></div><div><span>EVE cost</span><strong>Not running</strong></div><div><span>Rule engine</span><strong>Planned · Phase 02</strong></div></div>
            <button className="button button-primary button-block" disabled={scanRunning} onClick={startScan}>{scanRunning ? <><span className="spinner" /> Resetting fixture state…</> : <>Reset fixture cycle <span aria-hidden="true">→</span></>}</button>
            <p className="demo-disclosure">Real D1 cycle reset · fixture data · no external systems are changed.</p>
          </div>
        </div>
      )}

      {selectedEvidence && (
        <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedEvidence(null);
        }}>
          <aside className="source-drawer" role="dialog" aria-modal="true" aria-labelledby="source-title">
            <div className="drawer-header"><div><span className={`connection-logo ${selectedEvidence.sourceClass}`}>{selectedEvidence.source.slice(0, 1)}</span><span><small>{selectedEvidence.stamp} · FIXTURE SNAPSHOT</small><strong>{selectedEvidence.source}</strong></span></div><button aria-label="Close source drawer" onClick={() => setSelectedEvidence(null)}>×</button></div>
            <div className={`relation-banner ${selectedEvidence.relation === "contradicts" ? "relation-challenge" : ""}`}>{selectedEvidence.relation === "supports" ? "SUPPORTS LEADING HYPOTHESIS" : "CHALLENGES ALTERNATIVE"}</div>
            <div className="drawer-body">
              <div className="eyebrow">{selectedEvidence.eyebrow}</div>
              <h2 id="source-title">{selectedEvidence.title}</h2>
              <div className="drawer-value">{selectedEvidence.value} <span>{selectedEvidence.delta}</span></div>
              <p>{selectedEvidence.detail}</p>
              <div className="source-query"><span>BOUND FIXTURE QUERY</span><code>{selectedEvidence.query}</code></div>
              <dl className="provenance-list"><div><dt>Observation window</dt><dd>{selectedEvidence.observed}</dd></div><div><dt>Fixture captured</dt><dd>{selectedEvidence.ingested}</dd></div><div><dt>Content hash</dt><dd><code>{selectedEvidence.hash}</code></dd></div><div><dt>Identity level</dt><dd>{selectedEvidence.identityLevel}</dd></div></dl>
              <div className="immutable-note"><span>◇</span><p><strong>This D1 fixture row is immutable.</strong><br />Attributed correction artifacts are planned for a later phase.</p></div>
            </div>
          </aside>
        </div>
      )}

      {ledgerOpen && (
        <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setLedgerOpen(false);
        }}>
          <aside className="source-drawer ledger-drawer" role="dialog" aria-modal="true" aria-labelledby="ledger-title">
            <div className="drawer-header ledger-drawer-header">
              <div><span className="ledger-header-mark" aria-hidden="true">◇</span><span><small>CS-014 · WORKSPACE LEDGER</small><strong>Decision history</strong></span></div>
              <button aria-label="Close case ledger" onClick={() => setLedgerOpen(false)}>×</button>
            </div>
            <div className="ledger-body">
              <div className="eyebrow">APPEND-ONLY ACTIVITY</div>
              <h2 id="ledger-title">Every decision, latest first.</h2>
              <p>D1 events are attributed to the signed-in owner and retained across case cycles. Fixture approval hashes bind the payload saved for this demo; operational authorization is planned separately.</p>
              <div className="ledger-summary">
                <span><small>WORKSPACE</small><strong>{workspace.name}</strong></span>
                <span><small>EVENTS</small><strong>{caseEvents.length} stored</strong></span>
                <span><small>CURRENT CYCLE</small><strong>{String(caseState.cycle).padStart(2, "0")}</strong></span>
              </div>
              <ol className="ledger-event-list">
                {caseEvents.map((caseEvent) => (
                  <li className={`ledger-event ledger-${caseEvent.kind}`} key={caseEvent.id}>
                    <span className="ledger-event-marker" aria-hidden="true"><i /></span>
                    <article>
                      <div className="ledger-event-heading"><strong>{caseEvent.label}</strong><time>{caseEvent.occurredAt}</time></div>
                      <p>{caseEvent.detail}</p>
                      <div className="ledger-event-meta"><span>Actor · {caseEvent.actorName}</span><span>Cycle · {String(caseEvent.cycle).padStart(2, "0")}</span></div>
                      {(caseEvent.approvalHash || caseEvent.receiptLabel) && (
                        <dl className="ledger-integrity">
                          {caseEvent.approvalHash && <div><dt>Bound payload</dt><dd><code>sha256:{caseEvent.approvalHash}</code></dd></div>}
                          {caseEvent.receiptLabel && <div><dt>Fixture action label</dt><dd>{caseEvent.receiptLabel} · no external write</dd></div>}
                        </dl>
                      )}
                    </article>
                  </li>
                ))}
              </ol>
              <div className="immutable-note ledger-note"><span>◇</span><p><strong>History is additive.</strong><br />New scans open a new cycle; prior approvals and receipts remain available for audit.</p></div>
            </div>
          </aside>
        </div>
      )}

      <div className={`toast ${toast ? "toast-visible" : ""}`} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}
