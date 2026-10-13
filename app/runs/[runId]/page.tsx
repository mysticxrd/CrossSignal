import Link from "next/link";
import { notFound } from "next/navigation";
import { loadReplay, SOURCE_URL } from "../../../db/replays/index.mjs";

// Public and read-only: a recorded investigation replayed from db/replays. No sign-in, no database, no model call,
// no server action. The run id is only a key into the committed recordings.
export const dynamic = "force-dynamic";

type Recommendation = { kind: string; target: string | null; summary: string; risk: string; approvalRequired: boolean };
type Finding = { signalSummary: string; affectedSegment: string | null; relatedChangeId: string | null; unresolvedAlternatives: string[];
  hypotheses: { rank: number; diagnosis: string; summary: string }[]; recommendation: Recommendation };
type Step = { sequence: number; kind: string; atUtc?: string; tool?: string | null; arguments?: Record<string, unknown> | null;
  denied?: "budget" | "invalid" | null; reason?: string; evidence?: number; truncated?: boolean; terminalStatus?: string;
  failureReason?: string | null; modelVersion?: string | null; finding?: Finding | null };
type Check = { name: string; pass: boolean; got: string; want: string };
type Sibling = { runId: string; batch: string; score: number; maxScore: number };
type Stamped = { state: "anchored" | "pending" | "missing" | "changed"; sha256: string; stamp: { sha256: string; submittedAtUtc: string;
  calendars: string[]; bitcoin: { height: number; blockHash: string; blockTimeUtc: string } | null } | null };

const TRUTH_MODES: Record<string, string> = { REAL_BASELINE_PARTLY_SYNTHETIC: "Real store baseline · synthetic incident", SIMULATED: "Simulated incident" };
const words = (value: string) => value.replaceAll("_", " ");
const utc = (iso: string) => `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
const DENIED = { budget: " · denied by budget", invalid: " · not a valid call" };

// The chain is checked inside the file; the timestamp is the check from outside it (db/replay.mjs checkStamp).
function stampBadge({ state, stamp }: Stamped) {
  if (state === "anchored") return `Timestamped · Bitcoin block ${stamp!.bitcoin!.height}`;
  if (state === "pending") return `Timestamped ${stamp!.submittedAtUtc.slice(0, 10)} · Bitcoin pending`;
  return state === "changed" ? "Changed since its timestamp" : "Not timestamped";
}

function stampText({ state, stamp }: Stamped) {
  if (state === "anchored") return `Bitcoin block ${stamp!.bitcoin!.height}, mined ${utc(stamp!.bitcoin!.blockTimeUtc)}`;
  if (state === "pending") return `Sent to ${stamp!.calendars.length} OpenTimestamps calendars ${utc(stamp!.submittedAtUtc)}; waiting for a Bitcoin block`;
  return state === "changed" ? `Stamped ${stamp!.submittedAtUtc.slice(0, 10)} for other bytes (${stamp!.sha256.slice(0, 12)}…)` : "None";
}

function describe(step: Step) {
  const { start, end, cursor, ...rest } = step.arguments ?? {};
  const range = typeof start === "string" && typeof end === "string" ? `${start.slice(0, 10)} → ${end.slice(0, 10)}` : null;
  const filters = Object.entries(rest).filter(([key]) => key !== "limit").map(([key, value]) => `${key} ${value ?? "all"}`);
  return [range, ...filters, cursor ? "asks for a next page" : null].filter(Boolean).join(" · ");
}

function stepText(step: Step) {
  if (step.kind === "started") return `Run started ${utc(step.atUtc!)}`;
  if (step.kind === "query") return <>Asked <code>{step.tool}</code> {describe(step)}{step.denied ? DENIED[step.denied] : ""}</>;
  if (step.kind === "returned") return `Got ${step.evidence} evidence ${step.evidence === 1 ? "row" : "rows"}${step.truncated ? " · more were available" : ""}`;
  if (step.kind === "refused") return `Tool refused: ${step.reason}`;
  if (step.kind === "finding") return `Finished: ${words(step.terminalStatus ?? "unknown")}${step.failureReason ? ` (${words(step.failureReason)})` : ""}`;
  return "This row could not be read";
}

export async function generateMetadata({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  return { title: `Replay ${runId} · CrossSignal` };
}

export default async function ReplayPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const replay = loadReplay(runId);
  if (!replay) notFound();
  const { bundle, check, verdict } = replay;
  const steps = replay.steps as Step[], siblings = replay.siblings as Sibling[], checks = replay.grade as Check[] | null;
  const stamped = replay.stamped as Stamped, file = `${SOURCE_URL}${bundle.run.scope.runId}.json`;
  // Everything labelled "in the chain" (run id, date, model, finding) comes only from rows the verdict lets the page
  // show, and every row shown verifies. The grade quotes the finding, so it is hidden with it.
  const shown = steps.filter((step) => step.sequence <= verdict.rows);
  const started = shown.find((step) => step.kind === "started");
  const end = shown.find((step) => step.kind === "finding");
  const finding = verdict.finding === "hidden" ? null : end?.finding ?? null;

  return <main className="case-page replay-page">
    <header className="case-heading">
      <div><span className="eyebrow">RECORDED INVESTIGATION · READ-ONLY REPLAY</span>
        <h1>{bundle.grade.label} · {words(bundle.grade.method)}</h1>
        <p>A recording of one run of the CrossSignal investigator, replayed exactly as saved. Nothing on this page calls a model or changes anything.</p></div>
      <div className="case-badges"><span className="truth-badge truth-test">{TRUTH_MODES[bundle.batch.truthMode] ?? bundle.batch.truthMode}</span>
        <span className={check.ok ? "case-status" : "case-status replay-broken"}>{check.ok ? `Chain intact · ${check.rows} rows` : `Does not verify at row ${check.brokenAt}`}</span>
        <span className={`case-status replay-stamp-${stamped.state}`}>{stampBadge(stamped)}</span></div>
    </header>
    {verdict.notice && <p role="alert" className="replay-notice">{verdict.notice}</p>}

    <div className="case-layout">
      <div className="case-main-column">
        <section className="case-section">
          <div className="case-section-head"><div><span className="eyebrow">WHAT IT DID</span><h2>Steps from the recording</h2></div>
            <span>{shown.filter((step) => step.kind === "query").length} tool calls</span></div>
          <p className="case-section-lead">Numbers are row numbers in the hash chain. Requests, responses and token counts are in the chain too; only the steps a person follows are listed.</p>
          <ol className="replay-steps">{shown.map((step) => <li key={step.sequence} className={step.kind}>
            <span>#{step.sequence}</span><p>{stepText(step)}</p><small>in chain</small></li>)}</ol>
        </section>

        {finding && <section className="case-section">
          <div className="case-section-head"><div><span className="eyebrow">FINDING · INSIDE THE CHAIN</span>
            <h2>{finding.hypotheses[0]?.diagnosis ?? "No cause named"}</h2></div><span>{words(end?.terminalStatus ?? "")}</span></div>
          <p className="case-section-lead">{finding.signalSummary}</p>
          {finding.hypotheses.map((h) => <article className="case-claim" key={h.rank}><div className="case-claim-top"><span>HYPOTHESIS {h.rank}</span></div><h3>{h.summary}</h3></article>)}
          <p className="case-footnote">Segment: {finding.affectedSegment ?? "none named"} · Change blamed: {finding.relatedChangeId ?? "none"}
            {finding.unresolvedAlternatives.length > 0 && <> · Still open: {finding.unresolvedAlternatives.join("; ")}</>}</p>
        </section>}

        {checks && <section className="case-section">
          <div className="case-section-head"><div><span className="eyebrow">GRADE · BESIDE THE CHAIN</span><h2>{bundle.grade.score}/{bundle.grade.maxScore} against the frozen answer key</h2></div>
            <span>graded {utc(bundle.grader.gradedAtUtc)}</span></div>
          <p className="case-section-lead">A separate grader compared the saved finding with the answer key in <code>{bundle.grader.rubrics[0].file}</code> after every run was saved.</p>
          <div className="case-event-scroll"><table><thead><tr><th>Check</th><th>Wanted</th><th>Got</th><th>Pass</th></tr></thead>
            <tbody>{checks.map((c) => <tr key={c.name}><td>{c.name}</td><td>{c.want}</td><td>{c.got}</td><td>{c.pass ? "yes" : "no"}</td></tr>)}</tbody></table></div>
        </section>}
      </div>

      <aside className="case-side">
        {finding && <section className="case-response"><span className="eyebrow">RECOMMENDED ACTION</span><h2>{words(finding.recommendation.kind)}{finding.recommendation.target ? ` · ${finding.recommendation.target}` : ""}</h2>
          <p>{finding.recommendation.summary}</p>
          <dl className="case-response-details"><div><dt>Risk</dt><dd>{finding.recommendation.risk}</dd></div>
            <div><dt>Approval</dt><dd>{finding.recommendation.approvalRequired ? "A person must approve" : "Not needed"}</dd></div></dl>
          {finding.recommendation.approvalRequired && <button type="button" className="case-approve-button" disabled>Approve (a replay cannot approve)</button>}
        </section>}
        <section className="case-provenance"><span className="eyebrow">RECORD</span><dl>
          <div><dt>Run id · {shown.length ? "in the chain" : "not verified"}</dt><dd><code>{bundle.run.scope.runId}</code></dd></div>
          <div><dt>Date · in the chain</dt><dd>{started?.atUtc ? utc(started.atUtc) : "unknown"}</dd></div>
          <div><dt>Model · in the chain</dt><dd>{end?.modelVersion ?? "unknown"}</dd></div>
          <div><dt>Last row hash</dt><dd><code>{check.head}</code></dd></div>
          <div><dt>File sha256 · computed by this page</dt><dd><code>{stamped.sha256}</code></dd></div>
          <div><dt>Timestamp · outside the chain</dt><dd>{stampText(stamped)}</dd></div>
          <div><dt>Commit · beside the chain</dt><dd><code>{bundle.batch.commit}</code></dd></div>
          <div><dt>Profile · batch · beside the chain</dt><dd>{bundle.batch.profile} · {bundle.batch.name}</dd></div>
          <div><dt>Case file</dt><dd><code>{bundle.batch.caseFile}</code></dd></div>
        </dl></section>
        <section><span className="eyebrow">CHECK IT WITHOUT THIS SITE</span><h2>The file, its proof and Bitcoin</h2>
          <ol className="replay-check"><li>Download <a href={file}>the recording</a> and <a href={`${file}.ots`}>its proof</a>.</li>
            <li>Drop both on <a href="https://opentimestamps.org">opentimestamps.org</a>, which checks the proof against Bitcoin.</li>
            <li>The file hash it reports must be the sha256 above.</li></ol>
          <p className="case-footnote">That proves the recording has not changed since it was stamped. It cannot prove what happened before then, or that the replies came from Gemini: Google does not sign them.</p>
        </section>
        <section><span className="eyebrow">EVERY RECORDED RUN OF THIS CASE</span><h2>{siblings.filter((s) => s.score === s.maxScore && (checks || s.runId !== runId)).length} of {siblings.length} scored full marks</h2>
          <ul className="replay-siblings">{siblings.map((s) => <li key={s.runId}>{s.runId === runId ? <strong>{s.runId}</strong> : <Link href={`/runs/${s.runId}`}>{s.runId}</Link>}
            {" "}· batch {s.batch} · {s.runId === runId && !checks ? "grade hidden" : `${s.score}/${s.maxScore}`}</li>)}</ul>
        </section>
      </aside>
    </div>
  </main>;
}
