// What each answer on the matched twins would cost in each hidden world, and how far to trust it. All of this is shown beside the
// five-check score and none of it changes the score: grading on the hidden world would mark the same answer differently on
// identical evidence. Runs in the grader's process, after every run is saved; nothing here reaches a model.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonical, digest } from '../../db/benchmark/contracts.mjs';
import { findingCitations } from '../../factory/02_data/benchmark/predicates.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const NAMES = { rules: 'Rules', 'single-shot-model': 'Single-shot', 'tool-using-model': 'Tool-using' };
const WORLDS = ['harmless', 'outage'];
const STILL_WAITING = 'still waiting, though the data has landed';
// Where an answer leads, by hidden world and pull.
const CONSEQUENCES = Object.freeze({
  harmless: {
    T1: { rollback: 'needless rollback put to a person', open: 'waits, then closes when the data lands', closed: 'closed, right only by luck' },
    T2: { rollback: 'needless rollback put to a person', open: STILL_WAITING, closed: 'closed, rightly' } },
  outage: {
    T1: { rollback: 'rollback put to a person on a guess', open: 'waits, then catches it when the data lands', closed: 'outage left running' },
    T2: { rollback: 'rollback put to a person', open: STILL_WAITING, closed: 'outage left running' } },
});
// The model caused these endings. Any other run without a finding says nothing about the model, so it is invalid, not a failure.
const MODEL_ENDINGS = ['invalid_output', 'budget_exhausted', 'tool_budget_exhausted', 'context_overflow', 'response_size_limit'];

function answerOf(run, cause, answerClass) {
  if (run.result.finding) return answerClass(run.result.finding, cause);
  return MODEL_ENDINGS.includes(run.result.terminalStatus) ? 'no answer' : 'invalid';
}
function consequenceOf(answer, twin, finding) {
  if (answer === 'no answer' || answer === 'invalid') return answer === 'invalid' ? 'invalid run' : 'no answer given';
  if (answer === 'rollback' && !finding.recommendation.approvalRequired) return 'rollback proposed without asking a person';
  return CONSEQUENCES[twin.world][twin.pull][answer];
}

// Ids are hashed with their case, so rows are matched across cases by what they say.
const rowText = ({ type, at, source, payload }) => canonical({ type, at, source, payload });
const rowKey = ({ type, at, payload }) => [type, at, payload.segment, payload.service].join('|');
const sameRows = (a, b) => canonical(a.map(rowText).sort()) === canonical(b.map(rowText).sort());
// The rows of a T2 case that say something different in the other world: the only evidence that can tell the worlds apart.
function separatingIds(events, other) {
  return events.filter(e => {
    const twin = other.find(o => rowKey(o) === rowKey(e));
    return !twin || rowText(twin) !== rowText(e);
  }).map(e => e.id);
}

function folders(directory, slot) {
  const folder = join(directory, 'runs', slot);
  return existsSync(folder) ? readdirSync(folder).sort().map(name => join(folder, name)) : [];
}
function attempts(directory, slot) {
  return folders(directory, slot).filter(path => existsSync(join(path, 'RESULT.json')))
    .map(path => ({ path, run: JSON.parse(readFileSync(join(path, 'RESULT.json'), 'utf8')) }));
}

// A query as the model asked it. A cursor hashes its case, so only its offset can be compared.
function asked(query) {
  if (query === null) return 'an invalid query';
  const shown = Object.entries(query.arguments).filter(([, value]) => value !== null)
    .map(([key, value]) => [key, key === 'cursor' ? value.split(':').at(-1) : value]);
  return `${query.tool} ${canonical(Object.fromEntries(shown))}`;
}
// The tool steps of a saved run, read from its history: what it asked and which rows came back.
export function stepsOf(history) {
  const rows = history.map(row => ({ kind: row.kind, ...JSON.parse(row.payload) }));
  return rows.filter(row => row.kind === 'tool_attempt').map(attempt => ({ query: asked(attempt.query),
    rows: rows.find(row => row.kind === 'tool_result' && row.attempt === attempt.attempt)?.result.events ?? [] }));
}
const ids = rows => rows.length ? rows.map(row => `\`${row.id}\``).join(', ') : 'nothing';
export function firstDifference(before, after) {
  for (let i = 0; i < Math.max(before.length, after.length); i++) {
    const a = before[i], b = after[i], at = `step ${i + 1}`;
    if (!a) return `${at}: T1 had stopped, T2 asked \`${b.query}\``;
    if (!b) return `${at}: T1 asked \`${a.query}\`, T2 had stopped`;
    if (a.query !== b.query) return `${at}: T1 asked \`${a.query}\`, T2 asked \`${b.query}\``;
    const only = (x, y) => x.rows.filter(row => !y.rows.some(other => rowText(other) === rowText(row)));
    if (only(a, b).length || only(b, a).length) return `${at}: both asked \`${a.query}\`; only T1 saw ${ids(only(a, b))}, only T2 saw ${ids(only(b, a))}`;
  }
  return `no tool step differs (${before.length} steps)`;
}

export function twinReport({ directory, batch, runs, graded, sources, rubricCases, answerClass }) {
  const cases = rubricCases.filter(c => c.twin && sources.has(c.caseRef));
  if (!cases.length) return null;
  const caseAt = (world, pull) => cases.find(c => c.twin.world === world && c.twin.pull === pull);
  const events = c => sources.get(c.caseRef).events, cause = cases.find(c => c.keepOpen).keepOpen;
  const rows = graded.filter(r => cases.some(c => c.label === r.label)).map(r => {
    const c = cases.find(x => x.label === r.label), run = runs.find(x => x.caseRef === r.caseRef && x.method === r.method);
    const finding = run.result.finding, answer = answerOf(run, cause, answerClass), other = WORLDS.find(w => w !== c.twin.world);
    const separating = c.twin.pull === 'T2' ? separatingIds(events(c), events(caseAt(other, 'T2'))) : [];
    const read = new Set(run.metrics.exposedEvidenceIds), cited = new Set(finding ? findingCitations(finding) : []);
    return { label: r.label, world: c.twin.world, pull: c.twin.pull, method: r.method, score: r.score, maxScore: r.maxScore, cause: r.checks.cause.pass,
      status: r.terminalStatus, answer, consequence: consequenceOf(answer, c.twin, finding), available: separating.length,
      read: separating.filter(id => read.has(id)).length, cited: separating.filter(id => cited.has(id)).length };
  });
  const pick = (method, world, pull) => rows.find(r => r.method === method && r.world === world && r.pull === pull);
  const methods = [...new Set(rows.map(r => r.method))];
  const t1Match = sameRows(events(caseAt('harmless', 'T1')), events(caseAt('outage', 'T1')));
  const changedFiles = batch.cases.filter(entry => cases.some(c => c.caseRef === entry.caseRef)
    && digest(JSON.parse(readFileSync(resolve(root, entry.file), 'utf8'))) !== entry.sha256).map(entry => entry.file);
  const steps = c => {
    const saved = attempts(directory, `${c.caseRef}-tool-using-model`).find(a => a.run.saved === true);
    return stepsOf(JSON.parse(readFileSync(join(saved.path, 'HISTORY.json'), 'utf8')));
  };
  return {
    batch: batch.startedAtUtc, commit: batch.commit, runs: rows,
    noise: methods.map(method => {
      const [a, b] = WORLDS.map(world => pick(method, world, 'T1'));
      const comparable = t1Match && !changedFiles.length && a.answer !== 'invalid' && b.answer !== 'invalid';
      return { method, answers: [a, b].map(r => ({ label: r.label, status: r.status, answer: r.answer })), comparable,
        different: comparable && (a.answer !== b.answer || a.status !== b.status) };
    }),
    firstDifferences: WORLDS.map(world => {
      const [before, after] = ['T1', 'T2'].map(pull => pick('tool-using-model', world, pull));
      return { world, from: before.label, to: after.label, answers: [before.answer, after.answer],
        where: before.answer === 'invalid' || after.answer === 'invalid' ? 'not comparable: a run was invalid'
          : firstDifference(steps(caseAt(world, 'T1')), steps(caseAt(world, 'T2'))) };
    }),
    validity: { changedFiles, t1Match, outsideModel: rows.filter(r => r.answer === 'invalid').map(r => ({ label: r.label, method: r.method, ending: r.status })),
      stopped: cases.flatMap(c => methods.flatMap(method => attempts(directory, `${c.caseRef}-${method}`).filter(a => a.run.saved !== true)
        .map(a => ({ label: c.label, method, reason: a.run.result.failureReason })))),
      // A process killed mid-run leaves a folder and no result. Nobody saw an answer, but the slot did run twice, so it is listed.
      interrupted: cases.flatMap(c => methods.flatMap(method => folders(directory, `${c.caseRef}-${method}`)
        .filter(path => !existsSync(join(path, 'RESULT.json'))).map(() => ({ label: c.label, method })))) },
  };
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const said = ({ status, answer }) => `${status === 'epistemic_abstention' ? 'abstained' : status}, ${answer}`;
const leads = rows => [...new Set(rows.map(r => r.consequence))].map(text => `${rows.filter(r => r.consequence === text).length}× ${text}`).join('; ');
function validityLine(t, i) {
  const { changedFiles, t1Match, stopped, interrupted, outsideModel } = t.validity;
  const parts = [changedFiles.length ? `**case files changed since the run: ${changedFiles.join(', ')}**` : 'case files match the batch manifest',
    t1Match ? 'the T1 twins show the same rows' : '**the T1 twins show different rows, so the pair says nothing**',
    stopped.length ? `${plural(stopped.length, 'attempt')} stopped by the provider, kept unscored (${stopped.map(s => `${s.label} ${NAMES[s.method]}: ${s.reason}`).join(', ')})`
      : 'no attempt stopped by the provider',
    interrupted.length ? `${plural(interrupted.length, 'attempt')} interrupted with no result and rerun (${interrupted.map(s => `${s.label} ${NAMES[s.method]}`).join(', ')})`
      : 'no attempt interrupted',
    outsideModel.length ? `${plural(outsideModel.length, 'run')} ended outside the model and left out above (${outsideModel.map(r => `${r.label} ${NAMES[r.method]}: ${r.ending}`).join(', ')})`
      : 'no run ended outside the model'];
  return `- Batch ${i + 1}: ${parts.join('; ')}.`;
}

// `reports` holds one twin report a batch, in start order.
export function renderTwins(reports) {
  const [first] = reports, labels = [...new Set(first.runs.map(r => r.label))].sort(), methods = [...new Set(first.runs.map(r => r.method))];
  const across = (label, method) => reports.map(t => t.runs.find(r => r.label === label && r.method === method));
  const counted = (rows, key) => rows[0].available ? `${rows.map(r => r[key]).join(', ')} of ${rows[0].available}` : 'none available';
  const easy = reports.flatMap((t, i) => t.runs.filter(r => r.available && r.score === r.maxScore && r.cited < r.available)
    .map(r => `${r.label} ${NAMES[r.method]} in batch ${i + 1} (cited ${r.cited} of ${r.available})`));
  return ['## Twin pairs', '',
    '**Shown beside the score, not part of it.** B21 and B22 show the same evidence at T1 and hide opposite truths; B23 and B24 are the '
      + 'same hour after the late rows land. An answer is `rollback` if it recommends one, `open` if it keeps the outage in play (the '
      + 'cause check\'s test) and recommends something else, and `closed` otherwise. '
      + `${reports.length === 1 ? 'One batch' : `${reports.length} batches`} can show a pattern, not prove improvement; passing makes a change eligible for human review, nothing more. `
      + `Commit ${[...new Set(reports.map(t => `\`${t.commit.slice(0, 12)}\``))].join(', ')} pins the grader version.`, '',
    'Each list holds one number a batch. Read and Cited count the T2 rows that differ between the worlds: what the run saw, and what it used.', '',
    '| Case | World, pull | Method | Score of 5 | Cause check | Where the answer leads | Read | Cited |', '|---|---|---|---|---|---|---|---|',
    ...labels.flatMap(label => methods.map(method => {
      const rows = across(label, method), valid = rows.filter(r => r.answer !== 'invalid');
      return `| ${label} | ${rows[0].world}, ${rows[0].pull} | ${NAMES[method]} | ${rows.map(r => (r.answer === 'invalid' ? 'invalid' : r.score)).join(', ')} | `
        + `${valid.filter(r => r.cause).length}/${valid.length} | ${leads(rows)} | ${counted(rows, 'read')} | ${counted(rows, 'cited')} |`;
    })), '',
    `5/5 without citing every row that separates the worlds, which may be timing rather than evidence: ${easy.length ? easy.join('; ') : 'none'}.`, '',
    '### Noise: B21 against B22', '',
    'The same evidence, so a different answer is model randomness or run order. A later fix has to move the scores by more than this.', '',
    `| Method | ${reports.map((_, i) => `Batch ${i + 1}`).join(' | ')} | Different |`, `|---|${reports.map(() => '---').join('|')}|---|`,
    ...methods.map(method => {
      const rows = reports.map(t => t.noise.find(n => n.method === method)), comparable = rows.filter(n => n.comparable);
      return `| ${NAMES[method]} | ${rows.map(n => (n.comparable ? n.answers.map(said).join(' / ') : 'not comparable')).join(' | ')} | `
        + `${comparable.filter(n => n.different).length} of ${comparable.length} |`;
    }), '',
    '### First difference: T1 against T2', '',
    'Where each tool-using run first parted from its own world\'s other pull. Single-shot runs read every row up front, so theirs differ from the first request.', '',
    ...reports.flatMap((t, i) => t.firstDifferences.map(d =>
      `- Batch ${i + 1}, ${d.world} (${d.from} → ${d.to}): ${d.where}. Answers: ${d.answers.join(' → ')}.`)), '',
    '### Validity', '', ...reports.map(validityLine), ''];
}
