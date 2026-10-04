// Compares finished run-b01 batches across token profiles. A batch is one fresh run per case and method, so batches
// with the same profile are repeats: each cell adds up every run of one case and method under one profile. Every batch
// is regraded here with grade-b01.mjs, so all of them share one grader. Like the grader, this runs in its own process
// after the runs are saved; nothing here reaches a model.
// Usage: node tests/evaluator/compare-b01.mjs --out <dir> <batch-dir>...   (writes comparison.json and COMPARISON.md)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROFILES } from '../../db/benchmark/gemini-config.mjs';
import { CHECKS, METHODS, gradeBatch } from './grade-b01.mjs';

const MODELS = METHODS.filter(method => method !== 'rules');
const NAMES = { 'single-shot-model': 'Single-shot', 'tool-using-model': 'Tool-using' };
const SPLITS = { development: 'Dev', frozen_transfer: 'Holdout', fresh_holdout: 'Fresh holdout', fresh_holdout_2: 'Fresh holdout 2' };
const MEANS = [['tokens', 'Tokens (input + output)'], ['outputTokens', 'Output tokens (thinking included)'], ['turns', 'Model turns'],
  ['toolCalls', 'Tool calls'], ['requests', 'Gemini requests'], ['elapsedMs', 'Wall time']];
const USAGE = 'Usage: node tests/evaluator/compare-b01.mjs --out <dir> <batch-dir>...';
const fail = message => { throw new Error(message); };
const sum = (rows, pick) => rows.reduce((n, row) => n + pick(row), 0);
const ending = run => run.failureReason && run.failureReason !== run.terminalStatus
  ? `${run.terminalStatus} (${run.failureReason})` : run.terminalStatus;

// Graded runs of one method under one profile, one list per batch.
function tally(batches) {
  const runs = batches.flat(), endings = {};
  for (const run of runs) endings[ending(run)] = (endings[ending(run)] ?? 0) + 1;
  return { runs: runs.length, score: sum(runs, r => r.score), maxScore: sum(runs, r => r.maxScore),
    perBatch: batches.map(list => sum(list, r => r.score)),
    checks: Object.fromEntries(CHECKS.map(name => [name, runs.filter(r => r.checks[name].pass).length])), endings,
    mean: Object.fromEntries(MEANS.map(([key]) => [key, runs.length ? sum(runs, r => r.metrics[key]) / runs.length : 0])) };
}

export function compareBatches(directories, grade = gradeBatch) {
  if (!directories.length) fail(USAGE);
  const batches = directories.map(directory => grade(directory)).sort((a, b) => a.startedAtUtc.localeCompare(b.startedAtUtc));
  const [first] = batches;
  for (const [what, pick] of [['commit', b => b.commit], ['model', b => b.model], ['cases', b => b.cases.map(c => c.caseRef).join()],
    ['request spacing', b => b.requestGapMs]])
    if (batches.some(b => pick(b) !== pick(first))) fail(`batches differ in ${what}; only the profile may change between them`);
  const stray = batches.find(b => !Object.hasOwn(PROFILES, b.profile));
  if (stray) fail(`${stray.batch} uses the unknown profile ${stray.profile}`);
  // The baseline first, then the other profiles in the order gemini-config.mjs lists them.
  const profiles = Object.keys(PROFILES).filter(name => batches.some(b => b.profile === name));
  const runs = (list, method, labels) => list.map(b => b.runs.filter(r => r.method === method && labels.includes(r.label)));
  const group = labels => ({ labels, cells: { rules: tally(runs(batches, 'rules', labels)), ...Object.fromEntries(MODELS.map(method =>
    [method, Object.fromEntries(profiles.map(name => [name, tally(runs(batches.filter(b => b.profile === name), method, labels))]))])) } });
  const inSplit = split => first.cases.filter(c => c.split === split).map(c => c.label);
  return {
    version: 'b01-comparison-v1', truthMode: 'SIMULATED', comparedAtUtc: new Date().toISOString(), commit: first.commit,
    model: first.model, modelVersions: [...new Set(batches.flatMap(b => b.modelVersions))], requestGapMs: first.requestGapMs,
    // Batches from before the profile switch recorded no limits; they all ran the baseline.
    profiles: profiles.map(name => ({ name, tokenLimits: batches.find(b => b.profile === name).tokenLimits ?? PROFILES[name],
      batches: batches.filter(b => b.profile === name).length })),
    // In start order, which shows how the profiles were interleaved; every perBatch list follows it.
    batches: batches.map(b => ({ batch: b.batch, profile: b.profile, startedAtUtc: b.startedAtUtc })),
    graderSha256: first.graderSha256, rubrics: first.rubrics, howGraded: first.howGraded,
    cases: first.cases.map(c => ({ label: c.label, caseRef: c.caseRef, split: c.split, ...group([c.label]) })),
    totals: Object.fromEntries(Object.keys(SPLITS).filter(split => inSplit(split).length).map(split => [split, group(inSplit(split))])
      .concat([['all', group(first.cases.map(c => c.label))]])),
  };
}

const escape = text => String(text).replaceAll('|', '\\|').replace(/\s+/g, ' ');
const number = (n, digits = 0) => n.toLocaleString('en-US', { maximumFractionDigits: digits });
const time = ms => ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
const scores = c => `${c.score}/${c.maxScore} (${c.perBatch.join(', ')})`;
// Rules use no model, so they should score the same in every batch; say so rather than repeat it.
const steady = c => c.perBatch.every(n => n === c.perBatch[0]) ? `${c.perBatch[0]}/${c.maxScore / c.perBatch.length} in every batch` : scores(c);

export function renderComparison(comparison) {
  const { profiles, cases, totals } = comparison, all = totals.all.cells, counts = [...new Set(profiles.map(p => p.batches))];
  const columns = MODELS.flatMap(method => profiles.map(p => ({ method, profile: p.name, title: `${NAMES[method]} · \`${p.name}\`` })));
  const cell = (cells, column) => cells[column.method][column.profile];
  const line = cells => `|${cells.map(text => (text ? ` ${text} ` : ' ')).join('|')}|`;
  const table = (lead, extra, rows) => [line([...lead, ...columns.map(c => c.title), ...extra]),
    `|${[...lead, ...columns, ...extra].map(() => '---').join('|')}|`,
    ...rows.map(([cells, pick, more = []]) => line([...cells, ...columns.map(pick), ...more]))];
  const endings = [...new Set(columns.flatMap(column => Object.keys(cell(all, column).endings)))].map(name =>
    [name, sum(columns, column => cell(all, column).endings[name] ?? 0)]).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const limits = p => p.tokenLimits;
  return [
    `# Benchmark: ${profiles.map(p => `\`${p.name}\``).join(' vs ')} on ${cases.length} simulated cases`, '',
    '**SIMULATED incidents, not production data.** A batch is one fresh run of every case with every method. This compares '
      + `${comparison.batches.length} batches: ${profiles.map(p => `${p.batches} with \`${p.name}\``).join(' and ')}, started in the `
      + 'order listed under Provenance. Only the token profile changed between them: every run came from commit '
      + `\`${comparison.commit.slice(0, 12)}\` with \`${comparison.model}\` on the Gemini free tier, and one grader scored them all `
      + 'after every run was saved.', '',
    `| Method | ${profiles.map(p => `\`${p.name}\`: ${limits(p).thinkingLevel} thinking, up to ${number(limits(p).maxOutputTokens)} `
      + 'output tokens a response').join(' | ')} |`,
    `|---|${profiles.map(() => '---').join('|')}|`,
    ...MODELS.map(method => `| ${NAMES[method]} model | ${profiles.map(p => {
      const c = all[method][p.name];
      return `**${c.score}/${c.maxScore}** (${Math.round((100 * c.score) / c.maxScore)}%) · per batch ${c.perBatch.join(', ')}`;
    }).join(' | ')} |`), '',
    `Scores count checks passed: 5 a run (status, cause, change, segment, rollback)${counts.length === 1
      ? `, so ${counts[0]} batch${counts[0] === 1 ? '' : 'es'} of ${cases.length} cases make ${counts[0] * cases.length * 5}` : ''}. `
      + `Rules, the no-model baseline in \`db/benchmark/rules.mjs\`, scored ${steady(all.rules)}; its rules target this `
      + 'benchmark\'s incident families, so read it as a reference point.',
    '', '## By case', '', 'Each cell: checks passed over all runs, then each batch\'s score in start order.', '',
    ...table(['Case', 'Split'], ['Rules'], [
      ...cases.map(c => [[c.label, SPLITS[c.split] ?? c.split], column => scores(cell(c.cells, column)), [steady(c.cells.rules)]]),
      ...Object.entries(totals).filter(([name]) => name !== 'all').map(([name, group]) =>
        [[`${SPLITS[name]} (${group.labels.join(', ')})`, ''], column => scores(cell(group.cells, column)), [steady(group.cells.rules)]]),
      [['**All**', ''], column => `**${scores(cell(all, column))}**`, [steady(all.rules)]]]),
    '', '## By check', '', 'Runs that passed each check, out of all runs.', '',
    ...table(['Check'], [], CHECKS.map(name => [[name], column => `${cell(all, column).checks[name]}/${cell(all, column).runs}`])),
    '', '## How runs ended', '', 'A run that ends without a finding fails every check.', '',
    ...table(['Ending'], [], endings.map(([name]) => [[escape(name)], column => String(cell(all, column).endings[name] ?? 0)])),
    '', '## Cost per run (mean)', '',
    ...table(['Per run'], [], MEANS.map(([key, title]) => [[title], column => {
      const value = cell(all, column).mean[key];
      return key === 'elapsedMs' ? time(value) : number(value, ['tokens', 'outputTokens'].includes(key) ? 0 : 1);
    }])), '',
    `Wall time ${comparison.requestGapMs ? 'includes waiting for free-tier request slots: Gemini requests start at least '
      + `${comparison.requestGapMs / 1000} s apart` : 'is end to end'}. Requests count generate and token-count calls, retries included.`,
    '', '## How each check is graded', '',
    ...Object.entries(comparison.howGraded).map(([name, text]) => `- **${name}**: ${text}`),
    '', '## Provenance', '',
    `- Commit: \`${comparison.commit}\``,
    `- Model: \`${comparison.model}\`; versions reported: ${comparison.modelVersions.map(v => `\`${v}\``).join(', ') || 'none'}`,
    ...profiles.map(p => `- Profile \`${p.name}\`: thinking ${limits(p).thinkingLevel}; ${limits(p).maxOutputTokens} output tokens `
      + `a response, ${limits(p).generatedTokens} a run; ${limits(p).contextTokens}-token context`),
    ...comparison.batches.map((b, i) => `- Batch ${i + 1}: \`${b.batch}\`, \`${b.profile}\`, started ${b.startedAtUtc}`),
    ...comparison.rubrics.map(r => `- Rubric \`${r.file}\` sha256 \`${r.sha256}\``),
    `- Grader sha256 \`${comparison.graderSha256}\`; compared ${comparison.comparedAtUtc}`, '',
  ].join('\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), at = args.indexOf('--out'), out = at === -1 ? null : args[at + 1];
  const directories = args.filter((_, i) => i !== at && i !== at + 1);
  if (!out || !directories.length) fail(USAGE);
  const comparison = compareBatches(directories.map(directory => resolve(directory))), markdown = renderComparison(comparison);
  mkdirSync(resolve(out), { recursive: true });
  writeFileSync(join(resolve(out), 'comparison.json'), `${JSON.stringify(comparison, null, 2)}\n`);
  writeFileSync(join(resolve(out), 'COMPARISON.md'), markdown);
  process.stdout.write(`${markdown}\nSaved ${join(resolve(out), 'COMPARISON.md')} and comparison.json\n`);
}
