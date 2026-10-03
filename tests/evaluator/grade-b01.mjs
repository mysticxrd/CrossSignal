// Grades one finished run-b01 batch: 5 SIMULATED cases x rules, single-shot and tool-using.
// Separate evaluator process: scripts/run-b01.mjs never imports this file and starts it only after
// all 15 runs are saved, so nothing from rubric.json can reach a model request.
// Usage: node tests/evaluator/grade-b01.mjs <batch-dir>   (writes results.json and RESULTS.md there)
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { citationExistence, criticalCoverage } from '../../factory/02_data/benchmark/predicates.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const RUBRIC = 'factory/02_data/benchmark/private/rubric.json';
export const METHODS = ['rules', 'single-shot-model', 'tool-using-model'];
export const CHECKS = ['status', 'cause', 'change', 'segment', 'rollback'];
const NAMES = { rules: 'Rules', 'single-shot-model': 'Single-shot model', 'tool-using-model': 'Tool-using model' };
const SPLITS = { development: 'dev', frozen_transfer: 'holdout' };
const CHANGE_TYPES = ['deployment', 'pricing_configuration'];
const fail = message => { throw new Error(message); };
const words = text => String(text ?? '').toLowerCase().replace(/[_-]+/g, ' ');
const segmentKey = value => String(value ?? '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).sort().join(' ');

// A run that blames no deploy or pricing change is graded on the first of these words in its top-ranked
// diagnosis: the cause that word belongs to is the cause the run named. Plurals count.
export const CAUSE_WORDS = Object.freeze({
  checkout_validation_regression: ['checkout', 'validation'],
  payment_provider_incident: ['provider', 'gateway', 'processor'],
  pricing_configuration_error: ['price', 'pricing'],
  acquisition_composition_shift: ['acquisition', 'composition', 'mix', 'traffic', 'channel', 'share', 'distribution'],
  notifications_deployment: ['notification', 'email'],
});

export const HOW_GRADED = Object.freeze({
  status: 'The finding must end `completed`, or `epistemic_abstention` on the case where the rubric says to abstain.',
  cause: 'Graded on meaning, not wording. If `relatedChangeId` names a deploy or pricing change, it must be the rubric\'s change. '
    + 'Otherwise the first cause word in the top-ranked diagnosis decides: checkout/validation, provider/gateway/processor, '
    + 'price/pricing, acquisition/composition/mix/traffic/channel/share/distribution, or notification/email (never right here). '
    + 'On the abstain case the run must abstain.',
  change: '`relatedChangeId` must be the rubric\'s change, or empty when the rubric has none.',
  segment: '`affectedSegment` must name the rubric\'s segment (case, word order and separators ignored), or be empty when the rubric has none.',
  rollback: 'Where the rubric wants a rollback, the run must recommend rolling back that service (by name or change id) with '
    + '`approvalRequired: true`. Everywhere else it must not recommend a rollback.',
  keyEvidence: 'Shown, not scored: rubric evidence groups whose rows the run both saw and cited, with the group\'s typed fact holding on them.',
  citations: 'Shown, not scored: cited ids the run had actually seen, out of all ids it cited.',
});

export function namedCause(diagnosis) {
  const text = words(diagnosis);
  let first = null;
  for (const [cause, list] of Object.entries(CAUSE_WORDS)) for (const word of list) {
    const at = text.search(new RegExp(`\\b${word}s?\\b`));
    if (at >= 0 && (first === null || at < first.at)) first = { cause, word, at };
  }
  return first;
}

function describeEvent(id, events) {
  const event = events.find(e => e.id === id);
  if (!event) return `${id} (not in this case)`;
  const p = event.payload;
  if (event.type === 'deployment') return `${id} (${p.service} deploy ${p.fromVersion}→${p.toVersion})`;
  if (event.type === 'pricing_configuration') return `${id} (${p.segment} ${p.setting} ${p.fromMinor}→${p.toMinor})`;
  return `${id} (${event.type.replaceAll('_', ' ')} row)`;
}

export function gradeCause(finding, rubricCase, events) {
  const want = rubricCase.expectedDiagnosis, abstained = finding.terminalStatus === 'epistemic_abstention';
  if (rubricCase.action.kind === 'abstain') return { pass: abstained, got: abstained ? 'abstained' : 'named a cause', want: 'abstain' };
  if (abstained) return { pass: false, got: 'abstained', want };
  const change = events.find(e => e.id === finding.relatedChangeId && CHANGE_TYPES.includes(e.type));
  if (change) return { pass: rubricCase.relevantChangeIds.includes(change.id), got: `blamed ${describeEvent(change.id, events)}`, want };
  const named = namedCause(finding.hypotheses[0]?.diagnosis);
  return { pass: named?.cause === want, got: named ? `"${named.word}" → ${named.cause}` : 'no cause word', want };
}

function gradeRollback(recommendation, rubricCase) {
  const { kind, target, approvalRequired } = recommendation, action = rubricCase.action;
  const got = kind === 'simulated_rollback'
    ? `rollback of ${target ?? 'nothing named'}, ${approvalRequired ? 'approval required' : 'no approval'}` : kind;
  if (action.kind !== 'simulated_rollback') return { pass: kind !== 'simulated_rollback', got, want: 'no rollback' };
  const rightTarget = new RegExp(`\\b${action.target}\\b`).test(words(target))
    || rubricCase.relevantChangeIds.some(id => String(target).includes(id));
  return { pass: kind === 'simulated_rollback' && approvalRequired === true && rightTarget, got,
    want: `rollback of ${action.target}, approval required` };
}

export function gradeRun(run, rubricCase, events) {
  const { finding, terminalStatus, failureReason } = run.result, exposed = new Set(run.metrics.exposedEvidenceIds);
  const outcome = failureReason && failureReason !== terminalStatus ? `${terminalStatus} (${failureReason})` : terminalStatus;
  const wantStatus = rubricCase.action.kind === 'abstain' ? 'epistemic_abstention' : 'completed';
  const changes = rubricCase.relevantChangeIds;
  const checks = finding ? {
    status: { pass: finding.terminalStatus === wantStatus, got: finding.terminalStatus, want: wantStatus },
    cause: gradeCause(finding, rubricCase, events),
    change: { pass: changes.length ? changes.includes(finding.relatedChangeId) : finding.relatedChangeId === null,
      got: finding.relatedChangeId === null ? 'none' : describeEvent(finding.relatedChangeId, events),
      want: changes.length ? changes.map(id => describeEvent(id, events)).join(' or ') : 'none' },
    segment: { pass: segmentKey(finding.affectedSegment) === segmentKey(rubricCase.affectedSegment),
      got: finding.affectedSegment ?? 'none', want: rubricCase.affectedSegment ?? 'none' },
    rollback: gradeRollback(finding.recommendation, rubricCase),
  } : Object.fromEntries(CHECKS.map(name => [name, { pass: false, got: `no finding: ${outcome}`, want: null }]));
  const m = run.metrics;
  return {
    label: rubricCase.label, split: rubricCase.split, caseRef: run.caseRef, method: run.method, model: run.model,
    modelVersion: run.result.modelVersion ?? null, runId: run.scope.runId, terminalStatus, failureReason: failureReason ?? null,
    score: CHECKS.filter(name => checks[name].pass).length, maxScore: CHECKS.length, checks,
    keyEvidence: finding ? criticalCoverage(finding, events.filter(e => exposed.has(e.id)), rubricCase)
      : { covered: 0, total: rubricCase.groups.length, groups: rubricCase.groups.map(g => ({ name: g.name, covered: false })) },
    citations: finding ? citationExistence(finding, exposed) : null,
    raw: finding ? { diagnoses: finding.hypotheses.map(h => h.diagnosis), relatedChangeId: finding.relatedChangeId,
      affectedSegment: finding.affectedSegment, recommendation: finding.recommendation } : null,
    metrics: { tokens: m.tokens.total, inputTokens: m.tokens.input, outputTokens: m.tokens.output, turns: m.turns,
      toolCalls: m.toolCalls, elapsedMs: m.elapsedMs, requests: m.requests.total, retries: m.requests.retries ?? 0 },
  };
}

// The scored attempt of a slot. Attempts stopped by quota, network or request failures stay beside it unscored.
export function savedRun(directory, slot) {
  const folder = join(directory, 'runs', slot);
  if (!existsSync(folder)) return null;
  const saved = readdirSync(folder).sort().map(name => join(folder, name, 'RESULT.json')).filter(path => existsSync(path))
    .map(path => JSON.parse(readFileSync(path, 'utf8'))).filter(run => run.saved === true);
  if (saved.length > 1) fail(`${slot} has more than one saved run`);
  return saved[0] ?? null;
}

const sum = (rows, pick) => rows.reduce((n, row) => n + pick(row), 0);
function cell(rows) {
  return { runs: rows.length, score: sum(rows, r => r.score), maxScore: sum(rows, r => r.maxScore),
    tokens: sum(rows, r => r.metrics.tokens), turns: sum(rows, r => r.metrics.turns), toolCalls: sum(rows, r => r.metrics.toolCalls),
    elapsedMs: sum(rows, r => r.metrics.elapsedMs), requests: sum(rows, r => r.metrics.requests) };
}
const byMethod = rows => Object.fromEntries(METHODS.map(m => [m, cell(rows.filter(r => r.method === m))]));

export function gradeBatch(directory, rubric = JSON.parse(readFileSync(resolve(root, RUBRIC), 'utf8'))) {
  const batch = JSON.parse(readFileSync(join(directory, 'BATCH.json'), 'utf8'));
  const runs = batch.slots.map(slot => savedRun(directory, slot) ?? fail(`${slot} is not saved yet; finish the batch before grading`));
  if (!runs.every(run => run.commit === batch.commit)) fail('runs came from more than one commit');
  const graded = runs.map(run => {
    const rubricCase = rubric.cases.find(c => c.caseRef === run.caseRef) ?? fail(`no rubric case for ${run.caseRef}`);
    return gradeRun(run, rubricCase, JSON.parse(readFileSync(resolve(root, run.case), 'utf8')).events);
  }).sort((a, b) => a.label.localeCompare(b.label) || METHODS.indexOf(a.method) - METHODS.indexOf(b.method));
  const cases = [...new Set(graded.map(r => r.label))].map(label => {
    const rows = graded.filter(r => r.label === label);
    return { label, caseRef: rows[0].caseRef, split: rows[0].split, methods: byMethod(rows) };
  });
  const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
  return { version: 'b01-results-v1', truthMode: 'SIMULATED', batch: relative(root, directory).replaceAll('\\', '/'),
    date: batch.date, startedAtUtc: batch.startedAtUtc, gradedAtUtc: new Date().toISOString(), commit: batch.commit,
    model: batch.model, modelVersions: [...new Set(graded.map(r => r.modelVersion).filter(Boolean))],
    rubricSha256: hash(resolve(root, RUBRIC)), graderSha256: hash(fileURLToPath(import.meta.url)), howGraded: HOW_GRADED,
    cases, totals: Object.fromEntries(Object.entries(SPLITS).map(([split, name]) => [name, byMethod(graded.filter(r => r.split === split))])
      .concat([['all', byMethod(graded)]])), runs: graded };
}

const escape = text => String(text).replaceAll('|', '\\|').replace(/\s+/g, ' ');
const count = (n, word) => `${n.toLocaleString('en-US')} ${word}${n === 1 ? '' : 's'}`;
const time = ms => ms < 1 ? '<1 ms' : ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
const summary = c => `**${c.score}/${c.maxScore}** · ${c.tokens.toLocaleString('en-US')} tok · ${count(c.turns, 'turn')} · `
  + `${count(c.toolCalls, 'tool')} · ${time(c.elapsedMs)} · ${c.requests.toLocaleString('en-US')} req`;
// A run without a finding fails every check for one reason, shown once under Status.
const mark = (run, name) => run.raw === null && name !== 'status' ? '✗ —'
  : `${run.checks[name].pass ? '✓' : '✗'} ${escape(run.checks[name].got)}`;

export function renderResults(results) {
  const labels = split => results.cases.filter(c => SPLITS[c.split] === split).map(c => c.label).join(', ');
  const failures = results.runs.filter(r => r.score < r.maxScore).map(r => `- **${r.label} · ${NAMES[r.method]}** (${r.score}/${r.maxScore}): `
    + (r.raw === null ? escape(r.checks.status.got) : CHECKS.filter(name => !r.checks[name].pass)
      .map(name => `${name}: ${escape(r.checks[name].got)}` + (r.checks[name].want ? `, want ${escape(r.checks[name].want)}` : '')).join('; ')));
  return [
    `# Benchmark results: ${results.cases.length} simulated cases × ${METHODS.length} methods (${results.date})`, '',
    `**SIMULATED incidents, not production data.** One fresh run per case and method (${results.runs.length} runs). `
      + `Model runs use \`${results.model}\` on the Gemini free tier. All runs came from commit \`${results.commit.slice(0, 12)}\`; `
      + 'the rubric was read only after every run was saved.', '',
    `| Case | Split | ${METHODS.map(m => NAMES[m]).join(' | ')} |`, `|---|---|${METHODS.map(() => '---').join('|')}|`,
    ...results.cases.map(c => `| ${c.label} | ${SPLITS[c.split] ?? c.split} | ${METHODS.map(m => summary(c.methods[m])).join(' | ')} |`),
    `| Dev (${labels('dev')}) | | ${METHODS.map(m => summary(results.totals.dev[m])).join(' | ')} |`,
    `| Holdout (${labels('holdout')}) | | ${METHODS.map(m => summary(results.totals.holdout[m])).join(' | ')} |`,
    `| **All** | | ${METHODS.map(m => summary(results.totals.all[m])).join(' | ')} |`, '',
    'Each cell: score (checks passed, of 5 per case) · tokens Gemini reported (input + output, thinking included) · model turns · tool calls · '
      + 'wall time · Gemini API requests (generate and token-count calls, retries included). '
      + 'Rules is the no-model baseline in `db/benchmark/rules.mjs`; its rules target this benchmark\'s incident families, '
      + 'so read its score as a reference point.',
    '', '## Verdicts', '',
    '| Case | Method | Score | Status | Raw diagnosis (top-ranked) | Cause | Change | Segment | Rollback | Key evidence | Citations seen |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
    ...results.runs.map(r => `| ${r.label} | ${NAMES[r.method]} | ${r.score}/${r.maxScore} | ${mark(r, 'status')} | `
      + `${r.raw?.diagnoses[0] ? escape(`"${r.raw.diagnoses[0]}"`) : '—'} | ${mark(r, 'cause')} | ${mark(r, 'change')} | `
      + `${mark(r, 'segment')} | ${mark(r, 'rollback')} | ${r.keyEvidence.covered}/${r.keyEvidence.total} | `
      + `${r.citations ? `${r.citations.present}/${r.citations.total}` : '—'} |`),
    '', '## Failed checks', '', ...(failures.length ? failures : ['None.']),
    '', '## How each check is graded', '',
    ...Object.entries(results.howGraded).map(([name, text]) => `- **${name}**: ${text}`),
    '', '## Provenance', '',
    `- Batch: \`${results.batch}\`, started ${results.startedAtUtc}, graded ${results.gradedAtUtc}`,
    `- Commit: \`${results.commit}\``,
    `- Model: \`${results.model}\`; versions reported: ${results.modelVersions.map(v => `\`${v}\``).join(', ') || 'none'}`,
    `- Rubric sha256 \`${results.rubricSha256}\`; grader sha256 \`${results.graderSha256}\``, '',
  ].join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = process.argv[2] ? resolve(process.argv[2]) : fail('Usage: node tests/evaluator/grade-b01.mjs <batch-dir>');
  const results = gradeBatch(directory), markdown = renderResults(results);
  writeFileSync(join(directory, 'results.json'), `${JSON.stringify(results, null, 2)}\n`);
  writeFileSync(join(directory, 'RESULTS.md'), markdown);
  process.stdout.write(`${markdown}\nSaved ${join(directory, 'RESULTS.md')} and results.json\n`);
}
