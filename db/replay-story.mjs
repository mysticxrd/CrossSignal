import { CASE_NOTES } from './replays/case-notes.mjs';

// The plain layer on top of the public replay page: fixed sentences filled from recorded facts, so a test can check
// each one, and no model writes them. It reads only what the page may show: rows up to the verdict's limit, and the
// grade and case notes only when the finding is verified. The exact record stays underneath, unchanged.
// A part is a string or { strong } for words the page sets in bold.
const LEDE = 'CrossSignal reads a store\'s signals, names the change behind a revenue drop and recommends an action that a '
  + 'person must approve. It never takes the action itself.';
const utc = (iso) => `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
const words = (value) => value.replaceAll('_', ' ');
const list = (items) => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
const question = (q, ...answer) => ({ question: q, answer });
const count = (n) => ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'][n] ?? String(n);

function seal({ check, stamped }) {
  if (!check.ok) return { tone: 'bad', text: `Does not verify at row ${check.brokenAt}` };
  if (stamped.state === 'anchored') return { tone: 'ok', text: `Recording unchanged since ${stamped.stamp.bitcoin.blockTimeUtc.slice(0, 10)}` };
  if (stamped.state === 'pending') return { tone: 'pending', text: `Recording stamped ${stamped.stamp.submittedAtUtc.slice(0, 10)}, Bitcoin pending` };
  return { tone: 'bad', text: stamped.state === 'changed' ? 'Changed after its timestamp' : 'Not timestamped' };
}

// Why a recording that fails its check can't be relied on, said without its exact rows and hashes.
function distrust({ check, stamped }) {
  if (!check.ok) return `Row ${check.brokenAt} no longer follows from the rows before it, so anything from there on could have been edited.`;
  if (stamped.state === 'changed') return `Its bytes no longer match what was stamped into Bitcoin on ${stamped.stamp.submittedAtUtc.slice(0, 10)}.`;
  return 'It has no timestamp, so nothing outside the file vouches that it is the original.';
}

const abstained = (end) => end.terminalStatus === 'epistemic_abstention' || end.finding?.recommendation?.kind === 'abstain';

function concluded(end) {
  const finding = end.finding, rec = finding?.recommendation;
  if (!finding) return [`It finished without a finding (${words(end.terminalStatus ?? 'unknown')}).`];
  if (abstained(end)) return [`It declined to name a cause: “${rec.summary}”${rec.approvalRequired ? '' : ' There is nothing for a person to approve.'}`];
  const diagnosis = finding.hypotheses[0]?.diagnosis;
  const action = rec.kind === 'simulated_rollback'
    ? `It recommended a simulated rollback${rec.target ? ` of ${rec.target}` : ''}`
    : `It recommended: “${rec.summary}”`;
  const approval = rec.approvalRequired ? ', which a person must approve.' : '. It needs no approval.';
  return [`${diagnosis ? `“${diagnosis}” ` : 'It named no cause. '}${action}${approval}`];
}

// Option A of the design: the score never appears without its limits beside it.
function trust(bundle, end, siblings) {
  const { score, maxScore, keyEvidence: key, checks } = bundle.grade;
  const thin = key.covered * 2 < key.total;
  const right = end.finding?.hypotheses?.length && !abstained(end) ? 'named the right cause' : 'reached the right answer';
  const lead = abstained(end) && checks.status?.pass === false ? 'It declined to name a cause, though the answer key has one.'
    : score === maxScore ? `It ${right}${thin ? ' on thin evidence.' : ', citing most of the key evidence.'}`
      : `It got ${score} of ${maxScore} checks right.`;
  const runs = siblings.length > 1
    ? `The ${count(siblings.length)} recorded runs of this case scored ${list(siblings.map((s) => String(s.score)))}.`
    : 'It is the only recorded run of this case, so it can\'t show whether the result repeats.';
  return [{ strong: lead }, ` It scored ${score} of ${maxScore}. The grader checks what was named, not why, and this run `
    + `cited ${key.covered} of the ${key.total} pieces of key evidence the answer key lists. ${runs}`];
}

export function replayStory(replay, notes = CASE_NOTES) {
  const { bundle, verdict } = replay;
  const shown = replay.steps.filter((step) => step.sequence <= verdict.rows);
  const started = shown.find((step) => step.kind === 'started'), end = shown.find((step) => step.kind === 'finding');
  const labels = { runId: bundle.run.scope.runId, runVerified: shown.length > 0,
    recorded: started?.atUtc ? utc(started.atUtc) : 'unknown', model: end?.modelVersion ?? 'unknown' };
  const badge = seal(replay);

  if (verdict.finding === 'hidden' || !end) return {
    hidden: true, title: 'This copy of the recording failed its check', lede: `${LEDE} This page normally replays one recorded run.`,
    test: null, labels, seal: badge, short: [
      question('What went wrong', 'This page won\'t say, because the recording can\'t be relied on.'),
      question('What the model concluded', 'Hidden, along with its score.'),
      question('How far to trust it', { strong: 'Don\'t trust this copy.' }, ` ${distrust(replay)} The exact check is in the full record.`),
    ] };

  const note = notes[bundle.grade.caseRef];
  return {
    hidden: false, title: note?.title ?? `An AI investigator works through test case ${bundle.grade.label}`,
    lede: `${LEDE} This page replays one recorded run. Nothing here calls a model or changes anything.`,
    test: note ? `${note.test} The model ran on this data on ${labels.recorded.slice(0, 10)}.` : null, labels, seal: badge, short: [
      question('What went wrong', ...(note?.wentWrong ?? ['This test case has no plain description yet.'])),
      question('What the model concluded', ...concluded(end)),
      question('How far to trust it', ...trust(bundle, end, replay.siblings)),
    ] };
}
