"use client";

import { useRouter } from "next/navigation";
import CaseDecisionView from "./CaseDecisionView";
import type { DecisionCaseResult } from "../db/case-decision";
import { FormEvent, useEffect, useRef, useState, useTransition } from "react";
import {
  authorizeAction,
  editProposedAction,
  resetFlightRecorderDemo,
  updateGlobalPause,
} from "./flight-recorder-actions";
import type {
  ExecutionScenario,
  FlightRecorderActionResult,
  FlightRecorderSnapshot,
} from "./flight-recorder-types";
import {
  createWorkspaceAction,
  selectWorkspaceAction,
} from "./workspace-actions";
import type { OwnerSummary, WorkspaceSummary } from "./workspace-types";

type View = "case" | "control" | "trace" | "outcome";

type CrossSignalAppProps = {
  owner: OwnerSummary;
  workspace: WorkspaceSummary;
  workspaces: WorkspaceSummary[];
  initialFlightRecorder: FlightRecorderSnapshot;
  decisionCase: DecisionCaseResult;
};

const navItems: Array<{ id: View; label: string; count?: string }> = [
  { id: "case", label: "Cases" },
  { id: "control", label: "Action control", count: "1" },
  { id: "trace", label: "Narrative trace" },
  { id: "outcome", label: "Outcome" },
];

function initials(value: string): string {
  return (
    value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "WS"
  );
}

function shortHash(value: string): string {
  return value ? `${value.slice(0, 10)}…${value.slice(-8)}` : "Unavailable";
}

function formatTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(date);
}

function resultState(snapshot: FlightRecorderSnapshot) {
  if (!snapshot.execution) return "pending";
  if (snapshot.execution.state === "confirmed") return "confirmed";
  if (snapshot.execution.state === "indeterminate") return "indeterminate";
  return "failed";
}

function TruthBadge({ mode }: { mode: "LIVE" | "TEST" | "FIXTURE" }) {
  return <span className={`truth-badge truth-${mode.toLowerCase()}`}>{mode}</span>;
}

function DetailDisclosure({
  label = "View details",
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="detail-disclosure">
      <summary>{label}<span aria-hidden="true">＋</span></summary>
      <div className="detail-content">{children}</div>
    </details>
  );
}

export default function CrossSignalApp({
  owner,
  workspace,
  workspaces,
  initialFlightRecorder,
  decisionCase,
}: CrossSignalAppProps) {
  const router = useRouter();
  const [view, setView] = useState<View>(decisionCase.kind === "found" ? "case" : "control");
  const [snapshot, setSnapshot] = useState(initialFlightRecorder);
  const [recipients, setRecipients] = useState(initialFlightRecorder.intent.recipients);
  const [subject, setSubject] = useState(initialFlightRecorder.intent.subject);
  const [body, setBody] = useState(initialFlightRecorder.intent.body);
  const [editing, setEditing] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [scenario, setScenario] = useState<ExecutionScenario>("confirmed");
  const [toast, setToast] = useState("");
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [workspaceCreateOpen, setWorkspaceCreateOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [workspaceError, setWorkspaceError] = useState("");
  const [actionPending, startActionTransition] = useTransition();
  const [workspacePending, startWorkspaceTransition] = useTransition();
  const toastTimerRef = useRef<number | null>(null);
  const ownerName = owner.fullName ?? owner.displayName;
  const pendingAuthorization = snapshot.traceState === "awaiting_approval";
  const executionState = resultState(snapshot);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const notify = (message: string) => {
    setToast(message);
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(""), 4200);
  };

  const receiveResult = (result: FlightRecorderActionResult) => {
    if (!result.ok) {
      notify(result.error);
      return false;
    }
    setSnapshot(result.snapshot);
    setRecipients(result.snapshot.intent.recipients);
    setSubject(result.snapshot.intent.subject);
    setBody(result.snapshot.intent.body);
    notify(result.message);
    router.refresh();
    return true;
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
      setWorkspaceCreateOpen(false);
      setNewWorkspaceName("");
      router.refresh();
    });
  };

  const saveEdit = () => {
    startActionTransition(async () => {
      const result = await editProposedAction(
        workspace.id,
        recipients,
        subject,
        body,
      );
      if (receiveResult(result)) setEditing(false);
    });
  };

  const authorize = () => {
    startActionTransition(async () => {
      const result = await authorizeAction(workspace.id, scenario);
      if (receiveResult(result)) {
        setView(scenario === "confirmed" ? "outcome" : "trace");
      }
    });
  };

  const togglePause = () => {
    startActionTransition(async () => {
      receiveResult(
        await updateGlobalPause(workspace.id, !snapshot.killSwitchEngaged),
      );
    });
  };

  const resetDemo = () => {
    startActionTransition(async () => {
      const result = await resetFlightRecorderDemo(workspace.id);
      if (receiveResult(result)) {
        setView("control");
        setEditing(false);
      }
    });
  };

  const renderControl = () => (
    <div className="control-page">
      <section className="page-intro control-intro">
        <div>
          <span className="eyebrow">CONSEQUENTIAL ACTION · HUMAN CONTROL REQUIRED</span>
          <h1>Nothing happens<br />until you say so.</h1>
          <p>
            CrossSignal prepared one bounded onboarding action. Review the exact
            message, recipients, and cost before the agent can act.
          </p>
        </div>
        <div className="intro-status">
          <TruthBadge mode="FIXTURE" />
          <TruthBadge mode="TEST" />
          <span className={`run-state run-${executionState}`}>
            <i />
            {pendingAuthorization
              ? "Waiting for you"
              : executionState === "confirmed"
                ? "Execution confirmed"
                : executionState === "indeterminate"
                  ? "Stopped · status unknown"
                  : "Execution failed"}
          </span>
        </div>
      </section>

      <section className={`kill-switch-card ${snapshot.killSwitchEngaged ? "is-engaged" : ""}`}>
        <div className="kill-icon" aria-hidden="true"><span /></div>
        <div>
          <span className="eyebrow">GLOBAL PAUSE</span>
          <h2>{snapshot.killSwitchEngaged ? "All agent actions are paused" : "You can stop every agent action immediately"}</h2>
          <p>
            {snapshot.killSwitchEngaged
              ? "CrossSignal will reject every new effect reservation until you resume."
              : "This workspace-wide control is checked again immediately before any action runs."}
          </p>
        </div>
        <button
          className={`kill-switch ${snapshot.killSwitchEngaged ? "is-on" : ""}`}
          onClick={togglePause}
          disabled={actionPending}
          role="switch"
          aria-checked={snapshot.killSwitchEngaged}
        >
          <span>{snapshot.killSwitchEngaged ? "Resume actions" : "Pause all actions"}</span>
          <i aria-hidden="true"><b /></i>
        </button>
      </section>

      <section className="authorization-layout">
        <article className="authorization-card">
          <header className="authorization-head">
            <div>
              <span className="eyebrow">ACTION AUTHORIZATION · INTENT V{snapshot.intent.version}</span>
              <h2>{pendingAuthorization ? "Review the exact proposed action" : "Authorized action record"}</h2>
            </div>
            <span className={`authority-state ${pendingAuthorization ? "needs-authority" : "authority-recorded"}`}>
              <i />{pendingAuthorization ? "NOT AUTHORIZED" : "AUTHORIZATION RECORDED"}
            </span>
          </header>

          <div className="plain-english-prompt">
            <span aria-hidden="true">“</span>
            <p>{snapshot.policy.plainEnglish}</p>
          </div>

          <div className="action-scope-grid">
            <div className="scope-block recipient-block">
              <span>RECIPIENTS · {recipients.length} OF 3 MAX</span>
              {editing ? (
                <div className="recipient-inputs">
                  {recipients.map((recipient, index) => (
                    <div key={`recipient-${index}`}>
                      <input
                        aria-label={`Recipient ${index + 1}`}
                        value={recipient}
                        onChange={(event) =>
                          setRecipients((current) =>
                            current.map((item, position) =>
                              position === index ? event.target.value : item,
                            ),
                          )
                        }
                        disabled={actionPending}
                      />
                      {recipients.length > 1 && (
                        <button
                          aria-label={`Remove recipient ${index + 1}`}
                          onClick={() =>
                            setRecipients((current) =>
                              current.filter((_, position) => position !== index),
                            )
                          }
                        >×</button>
                      )}
                    </div>
                  ))}
                  {recipients.length < 3 && (
                    <button
                      className="add-recipient"
                      onClick={() => setRecipients((current) => [...current, ""])}
                    >+ Add recipient</button>
                  )}
                </div>
              ) : (
                <div className="recipient-list">
                  {snapshot.intent.recipients.map((recipient) => (
                    <span key={recipient}><i>{recipient[0]?.toUpperCase()}</i>{recipient}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="scope-block cap-block">
              <span>SPENDING CAP</span>
              <strong>${snapshot.intent.spendingCapUsd.toFixed(2)}</strong>
              <small>Hard policy ceiling · TEST adapter</small>
            </div>
          </div>

          <div className="message-preview">
            <div className="message-toolbar">
              <div><span className="mail-dot red" /><span className="mail-dot amber" /><span className="mail-dot green" /></div>
              <span>Exact email preview</span>
              <TruthBadge mode="TEST" />
            </div>
            <div className="message-fields">
              <div><span>From</span><strong>Atlas onboarding · via TEST adapter</strong></div>
              <div><span>To</span><strong>{recipients.join(", ")}</strong></div>
              <div className="subject-row">
                <span>Subject</span>
                {editing ? (
                  <input value={subject} onChange={(event) => setSubject(event.target.value)} />
                ) : (
                  <strong>{snapshot.intent.subject}</strong>
                )}
              </div>
            </div>
            {editing ? (
              <textarea
                className="message-body-editor"
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />
            ) : (
              <p className="message-body">{snapshot.intent.body}</p>
            )}
          </div>

          {pendingAuthorization && (
            <div className="edit-row">
              {editing ? (
                <>
                  <p>Saving creates a new immutable intent. The current proposal is preserved but cannot be approved afterward.</p>
                  <div>
                    <button className="button button-quiet" onClick={() => {
                      setEditing(false);
                      setRecipients(snapshot.intent.recipients);
                      setSubject(snapshot.intent.subject);
                      setBody(snapshot.intent.body);
                    }}>Cancel</button>
                    <button className="button button-secondary" disabled={actionPending} onClick={saveEdit}>
                      {actionPending ? "Creating intent…" : "Save as new intent"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p>Need to change the message or audience? A change creates a new intent and requires a fresh decision.</p>
                  <button className="button button-secondary" onClick={() => setEditing(true)}>Edit proposed action</button>
                </>
              )}
            </div>
          )}

          <DetailDisclosure label="View technical proof">
            <dl className="proof-grid">
              <div><dt>Payload</dt><dd><code>sha256:{shortHash(snapshot.intent.canonicalPayloadHash)}</code></dd></div>
              <div><dt>Recipients</dt><dd><code>sha256:{shortHash(snapshot.intent.recipientSetHash)}</code></dd></div>
              <div><dt>Frozen context</dt><dd><code>sha256:{shortHash(snapshot.intent.contextManifestHash)}</code></dd></div>
              <div><dt>Policy</dt><dd>{snapshot.intent.policyVersion} · <code>{shortHash(snapshot.intent.policyHash)}</code></dd></div>
              <div><dt>Expiry</dt><dd>{formatTime(snapshot.intent.expiresAt)}</dd></div>
              <div><dt>Trace ID</dt><dd><code>{snapshot.traceId}</code></dd></div>
            </dl>
          </DetailDisclosure>

          {pendingAuthorization ? (
            <footer className="authorization-footer">
              <div className="scenario-control">
                <label htmlFor="scenario">DEMO EXECUTION RESULT</label>
                <select
                  id="scenario"
                  value={scenario}
                  onChange={(event) => setScenario(event.target.value as ExecutionScenario)}
                  disabled={actionPending}
                >
                  <option value="confirmed">Provider confirms</option>
                  <option value="failed">Provider rejects</option>
                  <option value="indeterminate">Provider times out after dispatch</option>
                </select>
                <small>Explicit FIXTURE control for replaying honest result states.</small>
              </div>
              <button
                className="authorize-button"
                disabled={
                  actionPending ||
                  snapshot.killSwitchEngaged ||
                  editing
                }
                onClick={authorize}
              >
                <span>{actionPending ? "Checking authority…" : "Authorize exact action"}</span>
                <i aria-hidden="true">→</i>
              </button>
              {snapshot.killSwitchEngaged && <p className="paused-warning">Resume global actions before authorizing.</p>}
            </footer>
          ) : (
            <footer className={`result-footer result-${executionState}`}>
              <div className="result-icon" aria-hidden="true">
                {executionState === "confirmed" ? "✓" : executionState === "indeterminate" ? "!" : "×"}
              </div>
              <div>
                <span>{executionState === "confirmed" ? "CONFIRMED TEST EFFECT" : executionState === "indeterminate" ? "INDETERMINATE · NO RETRY" : "FAILED · NO RETRY"}</span>
                <strong>{snapshot.execution?.explanation}</strong>
                {snapshot.execution?.errorCode && <code>{snapshot.execution.errorCode}</code>}
              </div>
              <button className="button button-quiet" onClick={() => setView("trace")}>Read what happened →</button>
            </footer>
          )}
        </article>

        <aside className="control-rail">
          <article className="playbook-card">
            <span className="eyebrow">REVIEWED OPERATIONAL PLAYBOOK</span>
            <h3>Onboarding rescue · v1</h3>
            <p>A defined, inspectable process with known safety boundaries runs before this action reaches you.</p>
            <ol>
              {snapshot.playbook.map((node, index) => (
                <li key={node.key} className={node.key === "skeptic" ? "skeptic-step" : ""}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div><strong>{node.label}</strong><small>{node.role}</small></div>
                  <i aria-label={node.state}>✓</i>
                </li>
              ))}
            </ol>
            <DetailDisclosure label="Inspect playbook proof">
              <p>{snapshot.playbook.length} durable nodes completed over one frozen {snapshot.context.sourceCount}-source snapshot. Node outputs are hashes of bounded artifacts, not hidden chain-of-thought.</p>
            </DetailDisclosure>
          </article>
          <article className="truth-card">
            <span className="eyebrow">TRUTH BOUNDARY</span>
            <h3>What this demo proves</h3>
            <dl>
              <div><dt><span className="truth-orb observed" />Observed</dt><dd>A recorded event or metric exists.</dd></div>
              <div><dt><span className="truth-orb correlated" />Correlated</dt><dd>It followed the action; causality is not established.</dd></div>
              <div><dt><span className="truth-orb proven" />Proven</dt><dd>Requires stronger causal evidence. Not claimed here.</dd></div>
            </dl>
            <p className="isolation-note">Written verification covers 14 tenant-isolation and security attacks. This single-user screen does not visually prove tenant isolation.</p>
          </article>
        </aside>
      </section>
    </div>
  );

  const timeline = [
    {
      key: "evidence",
      eyebrow: "EVIDENCE USED",
      title: "Activation fell and users described setup uncertainty.",
      body: `${snapshot.evidence.length} versioned FIXTURE sources were frozen before the playbook ran.`,
      state: "complete",
      badge: "FIXTURE",
      detail: (
        <div className="evidence-detail-list">
          {snapshot.evidence.map((item) => (
            <div key={item.key}><strong>{item.label}</strong><span>{item.summary}</span><code>{shortHash(item.contentHash)}</code></div>
          ))}
        </div>
      ),
    },
    {
      key: "skeptic",
      eyebrow: "CHALLENGE / SKEPTIC REVIEW",
      title: "Useful signal, but no causal conclusion.",
      body: "The skeptic challenged the small cohort, fixture timing, and alternative explanations before synthesis.",
      state: "complete",
      badge: "REVIEWED",
      detail: <p>The playbook requires a correlated-only outcome label unless stronger causal evidence is registered.</p>,
    },
    {
      key: "proposal",
      eyebrow: "PROPOSED ACTION",
      title: `Send one TEST email to ${snapshot.intent.recipients.length} recipients.`,
      body: `Intent v${snapshot.intent.version} binds the exact recipients, subject, body, context, policy, and $${snapshot.intent.spendingCapUsd.toFixed(2)} spending ceiling.`,
      state: "complete",
      badge: "TEST",
      detail: <p><strong>{snapshot.intent.subject}</strong><br />{snapshot.intent.body}</p>,
    },
    {
      key: "authorization",
      eyebrow: "HUMAN AUTHORIZATION",
      title: snapshot.approval ? "The owner authorized the exact proposed action." : "Waiting for the owner’s decision.",
      body: snapshot.approval
        ? `Grant ${snapshot.approval.grantId.slice(0, 8)}… was bound to the payload and expires with the intent.`
        : "No effect attempt exists. The agent cannot act without this authorization.",
      state: snapshot.approval ? "complete" : "active",
      badge: snapshot.approval ? "AUTHORIZED" : "BLOCKED",
      detail: snapshot.approval ? <p>Approved at {formatTime(snapshot.approval.approvedAt)} by the authenticated workspace owner.</p> : <p>The deterministic policy verdict is approval_required.</p>,
    },
    {
      key: "execution",
      eyebrow: "EXECUTION RESULT",
      title: snapshot.execution
        ? snapshot.execution.state === "confirmed"
          ? "The TEST provider confirmed the exact write."
          : snapshot.execution.state === "indeterminate"
            ? "Provider status is unknown. CrossSignal stopped."
            : "The TEST provider rejected the action."
        : "No execution has been attempted.",
      body: snapshot.execution?.explanation ?? "There is no provider receipt, error, or effect reservation yet.",
      state: snapshot.execution ? (snapshot.execution.state === "confirmed" ? "complete" : "alert") : "locked",
      badge: snapshot.execution ? snapshot.execution.state.toUpperCase() : "NOT RUN",
      detail: snapshot.execution ? <p>Attempt count: {snapshot.execution.attemptCount}. Blind retry count: 0. {snapshot.execution.providerReceiptId ? `Receipt: ${snapshot.execution.providerReceiptId}` : snapshot.execution.errorCode ? `Reason: ${snapshot.execution.errorCode}` : ""}</p> : <p>Authorization is the only route to the trusted TEST adapter.</p>,
    },
    {
      key: "outcome",
      eyebrow: "OBSERVED BUSINESS OUTCOME",
      title: snapshot.outcome ? "One of three FIXTURE accounts activated." : "No business outcome is claimed.",
      body: snapshot.outcome
        ? "The activation followed the action. CrossSignal labels this correlated, not proven."
        : snapshot.execution?.state === "failed"
          ? "Execution failed, so the demo does not imply an action-driven outcome."
          : "The outcome stage remains unavailable until a confirmed action and recorded observation exist.",
      state: snapshot.outcome ? "complete" : "locked",
      badge: snapshot.outcome ? "CORRELATED" : "NO CLAIM",
      detail: snapshot.outcome ? <p>{snapshot.outcome.rationale} Limitations: {snapshot.outcome.limitations.join("; ")}.</p> : <p>Honest absence is retained as part of the trace.</p>,
    },
  ];

  const renderTrace = () => (
    <div className="trace-page">
      <section className="page-intro trace-intro">
        <div>
          <span className="eyebrow">NARRATIVE TRACE · {snapshot.traceEventCount} DURABLE EVENTS</span>
          <h1>What happened,<br />in human order.</h1>
          <p>Evidence, challenge, authority, effect, and outcome are presented as a readable story. Provenance is available when you need it.</p>
        </div>
        <div className="trace-identity"><TruthBadge mode="FIXTURE" /><code>{snapshot.traceId}</code></div>
      </section>
      <section className="narrative-timeline">
        {timeline.map((item, index) => (
          <article className={`timeline-entry timeline-${item.state}`} key={item.key}>
            <div className="timeline-index"><span>{String(index + 1).padStart(2, "0")}</span><i /></div>
            <div className="timeline-card">
              <div className="timeline-topline"><span className="eyebrow">{item.eyebrow}</span><b>{item.badge}</b></div>
              <h2>{item.title}</h2>
              <p>{item.body}</p>
              <DetailDisclosure>{item.detail}</DetailDisclosure>
            </div>
          </article>
        ))}
      </section>
      <section className="trace-proof-banner">
        <div><span className="eyebrow">TECHNICAL PROVENANCE</span><h2>Available without swallowing the story.</h2></div>
        <button className="button button-secondary" onClick={() => setDetailsOpen((open) => !open)}>{detailsOpen ? "Hide trace proof" : "Inspect trace proof"}</button>
        {detailsOpen && (
          <>
            <dl className="proof-grid wide-proof">
              <div><dt>Trace</dt><dd><code>{snapshot.traceId}</code></dd></div>
              <div><dt>Context manifest</dt><dd><code>{snapshot.intent.contextManifestHash}</code></dd></div>
              <div><dt>Intent payload</dt><dd><code>{snapshot.intent.canonicalPayloadHash}</code></dd></div>
              <div><dt>Policy</dt><dd><code>{snapshot.intent.policyHash}</code></dd></div>
            </dl>
            <div className="evidence-detail-list">
              <h3>Append-only workspace authority history</h3>
              {snapshot.authorityControlHistory.map((event) => (
                <div key={event.id}>
                  <strong>#{event.sequence} · {event.currentState ? "Actions paused" : "Actions available"}</strong>
                  <span>{event.reasonCode} · {event.actorDisplay} · {formatTime(event.occurredAt)}</span>
                  <code>{shortHash(event.contentHash)}</code>
                </div>
              ))}
              <h3>Persisted FIXTURE trace · {snapshot.traceEvents.length} ordered events</h3>
              {snapshot.traceEvents.map((event) => (
                <div key={event.id}>
                  <strong>#{event.sequence} · {event.eventType}</strong>
                  <span>{event.subjectType} · {event.priorState ?? "∅"} → {event.currentState} · {event.actorDisplay} · {formatTime(event.occurredAt)}</span>
                  <code>{shortHash(event.payloadHash)}</code>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );

  const renderOutcome = () => (
    <div className="outcome-page">
      <section className="page-intro outcome-intro">
        <div>
          <span className="eyebrow">HONEST OUTCOME · NO CAUSAL OVERCLAIM</span>
          <h1>Observed is not<br />the same as proven.</h1>
          <p>CrossSignal preserves the business result and the strength of the claim as separate facts.</p>
        </div>
        <TruthBadge mode="FIXTURE" />
      </section>

      {snapshot.outcome ? (
        <>
          <section className="outcome-hero-card">
            <div className="outcome-metric">
              <span className="eyebrow">OBSERVED · ACTIVATION WITHIN 72 HOURS</span>
              <strong>{snapshot.outcome.activatedAccounts}<small> / {snapshot.outcome.eligibleAccounts}</small></strong>
              <p>FIXTURE accounts recorded the qualifying event after the confirmed TEST action.</p>
            </div>
            <div className="claim-strength">
              <span className="eyebrow">CLAIM STRENGTH</span>
              <strong>Correlated</strong>
              <p>Observed after the action. Not proven to have been caused by it.</p>
              <span className="not-proven">CORRELATED, NOT PROVEN</span>
            </div>
          </section>
          <section className="truth-ladder">
            <article className="is-current"><span>01</span><i className="truth-orb observed" /><h3>Observed</h3><p>A signed or labeled metric record exists.</p><b>YES</b></article>
            <article className="is-current"><span>02</span><i className="truth-orb correlated" /><h3>Correlated</h3><p>The event followed the action in the registered window.</p><b>YES</b></article>
            <article><span>03</span><i className="truth-orb proven" /><h3>Proven</h3><p>Stronger causal evidence would be required.</p><b>NO CLAIM</b></article>
          </section>
          <section className="outcome-detail-grid">
            <article><span className="eyebrow">PRE-REGISTERED MEASURE</span><h3>Activation within 72 hours</h3><dl><div><dt>Baseline</dt><dd>{Math.round(snapshot.outcome.baselineRate * 100)}%</dd></div><div><dt>Observed</dt><dd>{Math.round(snapshot.outcome.observedRate * 100)}%</dd></div><div><dt>Cohort</dt><dd>{snapshot.outcome.eligibleAccounts} TEST recipients</dd></div></dl></article>
            <article><span className="eyebrow">LIMITATIONS</span><h3>Why this is not proof</h3><ul>{snapshot.outcome.limitations.map((limit) => <li key={limit}>{limit}</li>)}</ul></article>
          </section>
        </>
      ) : (
        <section className={`empty-outcome outcome-${executionState}`}>
          <span>{executionState === "failed" ? "×" : executionState === "indeterminate" ? "!" : "—"}</span>
          <h2>{executionState === "failed" ? "The action failed. No success is implied." : executionState === "indeterminate" ? "The effect is uncertain. No outcome is attributed." : "There is no observed outcome yet."}</h2>
          <p>{snapshot.execution?.explanation ?? "Authorize the exact proposed action before an effect or outcome can exist."}</p>
          <button className="button button-secondary" onClick={() => setView("control")}>Return to action control</button>
        </section>
      )}
      <button className="reset-demo" onClick={resetDemo} disabled={actionPending}>Reset exact FIXTURE trace for replay</button>
    </div>
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setView("case")}>
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span><strong>CrossSignal</strong><small>Human control for agent actions</small></span>
        </button>
        <div className="workspace-control">
          <button className="workspace-switcher" onClick={() => setWorkspaceMenuOpen((open) => !open)} aria-expanded={workspaceMenuOpen}>
            <span className="workspace-avatar">{initials(workspace.name)}</span>
            <span><strong>{workspace.name}</strong><small>Owner workspace</small></span>
            <i aria-hidden="true">⌄</i>
          </button>
          {workspaceMenuOpen && (
            <div className="workspace-menu">
              <span>YOUR WORKSPACES</span>
              {workspaces.map((candidate) => (
                <button key={candidate.id} onClick={() => selectWorkspace(candidate.id)} disabled={workspacePending} className={candidate.id === workspace.id ? "active" : ""}>
                  <i>{initials(candidate.name)}</i><span><strong>{candidate.name}</strong><small>{candidate.role}</small></span><b>{candidate.id === workspace.id ? "✓" : ""}</b>
                </button>
              ))}
              <button className="create-workspace-trigger" onClick={() => { setWorkspaceMenuOpen(false); setWorkspaceCreateOpen(true); }}>+ Create workspace</button>
            </div>
          )}
        </div>
        <nav className="main-nav">
          <span>WORKSPACE</span>
          {navItems.map((item) => (
            <div className="nav-item-group" key={item.id}>
            {item.id === "control" && <span className="nav-group-label">ONBOARDING DEMO</span>}
            <button className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}>
              <i aria-hidden="true">{item.id === "case" ? "▤" : item.id === "control" ? "◎" : item.id === "trace" ? "≋" : "↗"}</i>
              <span>{item.label}</span>
              {item.id === "case" && decisionCase.kind === "found" && <b>1</b>}
              {item.count && pendingAuthorization && <b>{item.count}</b>}
            </button>
            </div>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className={`sidebar-pause ${snapshot.killSwitchEngaged ? "engaged" : ""}`}>
          <span><i />{view === "case" ? "NO CASE ACTION PROPOSED" : snapshot.killSwitchEngaged ? "ACTIONS PAUSED" : "ACTIONS AVAILABLE"}</span>
          <p>{view === "case" ? "This Case cannot be authorized yet." : snapshot.killSwitchEngaged ? "The global kill switch is engaged." : "Exact authorization remains required."}</p>
        </div>
        <div className="owner-row"><span>{initials(ownerName)}</span><div><strong>{ownerName}</strong><small>{owner.email}</small></div></div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div><span>{workspace.name}</span><i>/</i><strong>{navItems.find((item) => item.id === view)?.label}</strong></div>
          <div><TruthBadge mode="FIXTURE" /><span className="demo-chip">{view === "case" ? "REVENUE-LEAK CASE · INVESTIGATION" : "ONBOARDING RESCUE · REVIEWED PLAYBOOK"}</span></div>
        </header>
        <div className="content">
          {view === "case" && <CaseDecisionView result={decisionCase} />}
          {view === "control" && renderControl()}
          {view === "trace" && renderTrace()}
          {view === "outcome" && renderOutcome()}
        </div>
      </main>

      {workspaceCreateOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !workspacePending) setWorkspaceCreateOpen(false); }}>
          <div className="workspace-modal" role="dialog" aria-modal="true" aria-labelledby="workspace-create-title">
            <button className="modal-close" onClick={() => setWorkspaceCreateOpen(false)}>×</button>
            <span className="eyebrow">OWNER ACTION</span>
            <h2 id="workspace-create-title">Create another workspace</h2>
            <p>Every trace, intent, grant, and effect remains bound to its workspace.</p>
            <form onSubmit={createWorkspace}>
              <label htmlFor="workspace-name">Company or product name</label>
              <input id="workspace-name" value={newWorkspaceName} onChange={(event) => setNewWorkspaceName(event.target.value)} minLength={2} maxLength={64} required />
              {workspaceError && <p className="form-error">{workspaceError}</p>}
              <button className="button button-primary" disabled={workspacePending}>{workspacePending ? "Creating…" : "Create owner workspace"}</button>
            </form>
          </div>
        </div>
      )}

      <div className={`toast ${toast ? "visible" : ""}`} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}
