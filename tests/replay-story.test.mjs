import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { digest } from "../db/benchmark/contracts.mjs";
import { checkStamp, replayGrade, replaySteps, replayVerdict, verifyRun } from "../db/replay.mjs";
import { replayStory } from "../db/replay-story.mjs";
import { CASE_NOTES } from "../db/replays/case-notes.mjs";
import { loadReplay, RUNS, STAMPS } from "../db/replays/index.mjs";

register("./helpers/next-stubs/hooks.mjs", import.meta.url);
const { default: ReplayPage } = await import("../app/runs/[runId]/page.tsx");

const projectRoot = new URL("../", import.meta.url);
const DEMO = "r_c72728d0a839";
const text = (parts) => parts.map((part) => typeof part === "string" ? part : part.strong).join("");
const answers = (story) => Object.fromEntries(story.short.map((item) => [item.question, text(item.answer)]));
const everything = (story) => JSON.stringify(story);

// The same pieces loadReplay builds, for an edited copy of a committed recording.
function replayOf(bundle, stamp = STAMPS[bundle.run.scope.runId]) {
  const check = verifyRun(bundle), stamped = checkStamp(bundle, stamp), verdict = replayVerdict(check, stamped);
  return { bundle, check, stamped, verdict, grade: replayGrade(bundle, verdict), steps: replaySteps(bundle),
    siblings: loadReplay(bundle.run.scope.runId).siblings };
}

function broken(runId, sequence) {
  const bundle = structuredClone(RUNS.get(runId));
  bundle.history[sequence - 1].payload = bundle.history[sequence - 1].payload.slice(1);
  return bundle;
}

// Every way a recording can fail its check: a broken chain at the first, a middle and the last row, a copy whose
// bytes no longer match its stamp, and one with no stamp.
function failing() {
  const changed = structuredClone(RUNS.get(DEMO));
  changed.grade.score = 4;
  return [
    ...[1, 9, 20].map((sequence) => [`broken at ${sequence}`, replayOf(broken(DEMO, sequence))]),
    ["changed after its stamp", replayOf(changed)],
    ["never stamped", replayOf(RUNS.get(DEMO), null)],
  ];
}

test("a recording that fails its check shows no conclusion, score or case text", () => {
  const note = CASE_NOTES[RUNS.get(DEMO).grade.caseRef];
  for (const [name, replay] of failing()) {
    assert.equal(replay.verdict.finding, "hidden", name);
    const story = replayStory(replay), all = everything(story);
    assert.equal(story.hidden, true, name);
    assert.equal(story.test, null, name);
    for (const secret of [note.title, note.test, text(note.wentWrong), "Checkout service deployment", "of 5", "rollback", "thin evidence"]) {
      assert.ok(!all.includes(secret), `${name}: shows “${secret}”`);
    }
    assert.match(answers(story)["How far to trust it"], /^Don't trust this copy\./, name);
    assert.equal(story.seal.tone, "bad", name);
  }
});

test("run id, date and model are labelled, and say unknown when the row behind them doesn't verify", () => {
  const labels = (replay) => replayStory(replay).labels;
  assert.deepEqual(labels(loadReplay(DEMO)), { runId: DEMO, runVerified: true, recorded: "2026-10-06 07:23 UTC", model: "gemini-3.5-flash-lite" });
  assert.deepEqual(labels(replayOf(broken(DEMO, 1))), { runId: DEMO, runVerified: false, recorded: "unknown", model: "unknown" });
  assert.deepEqual(labels(replayOf(broken(DEMO, 20))), { runId: DEMO, runVerified: true, recorded: "2026-10-06 07:23 UTC", model: "unknown" });
  for (const runId of RUNS.keys()) assert.equal(labels(loadReplay(runId)).model, "gemini-3.5-flash-lite", runId);
});

test("the score never appears without its limits beside it", () => {
  for (const runId of RUNS.keys()) {
    const { score, maxScore, keyEvidence } = RUNS.get(runId).grade;
    const trust = answers(replayStory(loadReplay(runId)))["How far to trust it"];
    assert.ok(trust.includes(`It scored ${score} of ${maxScore}.`), runId);
    assert.ok(trust.includes("checks what was named, not why"), runId);
    assert.ok(trust.includes(`cited ${keyEvidence.covered} of the ${keyEvidence.total} pieces of key evidence`), runId);
    assert.ok(trust.includes("The three recorded runs of this case scored 5, 0 and 5."), runId);
  }
});

test("full marks on under half the key evidence say thin evidence, and only then", () => {
  const trustWith = (covered) => {
    const bundle = structuredClone(RUNS.get(DEMO));
    bundle.grade.keyEvidence.covered = covered;
    return answers(replayStory({ ...loadReplay(DEMO), bundle }))["How far to trust it"];
  };
  assert.match(answers(replayStory(loadReplay(DEMO)))["How far to trust it"], /^It named the right cause on thin evidence\./);
  assert.match(trustWith(2), /thin evidence/);
  assert.doesNotMatch(trustWith(3), /thin evidence/);
  assert.match(answers(replayStory(loadReplay("r_fcb7e11ebcfa")))["How far to trust it"], /^It declined to name a cause, though the answer key has one\./);
});

test("the conclusion quotes the recorded finding and says who approves", () => {
  const concluded = (runId) => answers(replayStory(loadReplay(runId)))["What the model concluded"];
  const finding = (runId) => JSON.parse(RUNS.get(runId).history.at(-1).payload).finding;
  assert.equal(concluded(DEMO), `“${finding(DEMO).hypotheses[0].diagnosis}” It recommended a simulated rollback of checkout, which a person must approve.`);
  assert.equal(concluded("r_fcb7e11ebcfa"), `It declined to name a cause: “${finding("r_fcb7e11ebcfa").recommendation.summary}” There is nothing for a person to approve.`);
});

test("a case without a plain description still shows the conclusion and the score", () => {
  const story = replayStory(loadReplay(DEMO), {});
  assert.equal(answers(story)["What went wrong"], "This test case has no plain description yet.");
  assert.equal(story.test, null);
  assert.match(story.title, /test case B17/);
  assert.match(answers(story)["How far to trust it"], /It scored 5 of 5\./);
});

// The note is hand-written, so every number in it is checked against the frozen case the model was given.
test("the B17 note's numbers match the case file and its generator", () => {
  const bundle = RUNS.get(DEMO);
  const source = readFileSync(new URL(bundle.batch.caseFile, projectRoot), "utf8"), caseFile = JSON.parse(source);
  assert.equal(digest(caseFile), bundle.batch.caseSha256, "the case file is the one the run was given");
  const days = (from, to) => caseFile.events.filter((e) => e.type === "revenue_window" && e.payload.day >= from && e.payload.day <= to);
  const perDay = (rows, segment) => rows.filter((e) => !segment || e.payload.segment === segment)
    .reduce((sum, e) => sum + e.payload.revenueMinor, 0) / 100 / new Set(rows.map((e) => e.payload.day)).size;
  const before = days("2020-11-19", "2020-12-02"), after = days("2020-12-03", "2020-12-09");
  const dollars = (value) => `$${Math.round(value).toLocaleString("en-US")}`;
  const note = text(CASE_NOTES[bundle.grade.caseRef].wentWrong);
  assert.ok(note.includes(`Revenue fell ${Math.round((1 - perDay(after) / perDay(before)) * 100)}% in a week`), note);
  assert.ok(note.includes(`from ${dollars(perDay(before))} a day to ${dollars(perDay(after))}`), note);
  assert.ok(note.includes(`${dollars(perDay(before, "mobile"))} a day became ${dollars(perDay(after, "mobile"))}`), note);
  assert.ok(perDay(after, "desktop") > perDay(before, "desktop"), "desktop rose");
  assert.ok(caseFile.events.some((e) => e.type === "deployment" && e.payload.service === "checkout" && e.at.startsWith("2020-12-02")));
  const generator = readFileSync(new URL("tests/evaluator/b16-b20/generate.mjs", projectRoot), "utf8");
  assert.match(generator, /label === 'B17' && segment === 'mobile'\) return scale\(0\.4, \['orders'\]\)/, "60% fewer orders finish");
});

const render = async (runId, search = {}) => renderToStaticMarkup(
  await ReplayPage({ params: Promise.resolve({ runId }), searchParams: Promise.resolve(search) }));
const record = (html) => html.slice(html.indexOf('<details class="replay-record" id="full-record"'), html.lastIndexOf("</details>"));
const plainLayer = (html) => html.slice(0, html.indexOf('<details class="replay-record"'));
const unescape = (html) => html.replace(/<[^>]+>/g, "").replaceAll("&amp;", "&").replaceAll("&#x27;", "'").replaceAll("&quot;", "\"")
  .replaceAll("&lt;", "<").replaceAll("&gt;", ">");

test("the page puts the story and its labels above the record, and the record keeps today's facts", async () => {
  for (const runId of RUNS.keys()) {
    const html = await render(runId), replay = loadReplay(runId), story = replayStory(replay), top = unescape(plainLayer(html));
    for (const label of [story.title, `Run ${runId}`, `Recorded ${story.labels.recorded}`, `Model ${story.labels.model}`, "see the record",
      ...story.short.map((item) => text(item.answer))]) assert.ok(top.includes(label), `${runId}: top lacks “${label}”`);
    const full = unescape(record(html));
    for (const kept of [replay.check.head, replay.stamped.sha256, replay.bundle.batch.commit, replay.bundle.batch.caseFile,
      `Chain intact · ${replay.check.rows} rows`, "Bitcoin block 971218", "Steps from the recording", "against the frozen answer key",
      "Google does not sign them", "EVERY RECORDED RUN OF THIS CASE", ...replay.steps.map((step) => `#${step.sequence}`),
      ...replay.grade.map((c) => c.want), ...replay.siblings.map((s) => s.runId)]) {
      assert.ok(full.includes(kept), `${runId}: the record lacks “${kept}”`);
    }
  }
});

test("the badge opens the record in one click, without client code", async () => {
  const closed = await render(DEMO), open = await render(DEMO, { record: "1" });
  assert.match(closed, /<a class="replay-seal replay-seal-ok" href="\?record=1#full-record">Recording unchanged since 2026-10-13 · see the record<\/a>/);
  assert.match(closed, /<details class="replay-record" id="full-record"><summary>/);
  assert.match(open, /<details class="replay-record" id="full-record" open=""><summary>/);
  assert.equal(open.indexOf("Full record"), open.lastIndexOf("Full record"), "one record, rendered once");
});
