import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CUTOFF, START } from '../db/benchmark/contracts.mjs';
import { PROFILES } from '../db/benchmark/gemini-config.mjs';
import { rulesFinding } from '../db/benchmark/rules.mjs';
import { compareBatches, renderComparison } from './evaluator/compare-b01.mjs';
import { METHODS, RUBRICS } from './evaluator/grade-b01.mjs';

// Fixture batches only: the rules answer stands in for every method, so no model and no network.
const FOLDERS = ['factory/02_data/benchmark/observable', 'db/benchmark/cases/b06-b10', 'db/benchmark/cases/b11-b15'];
// The SIMULATED rubrics, the first three of RUBRICS.
const cases = RUBRICS.slice(0, FOLDERS.length).flatMap((path, i) => JSON.parse(readFileSync(path, 'utf8')).cases
  .map(c => ({ label: c.label, caseRef: c.caseRef, file: `${FOLDERS[i]}/${c.caseRef}.json` }))).sort((a, b) => a.label.localeCompare(b.label));
const source = c => JSON.parse(readFileSync(c.file, 'utf8'));
const scope = observable => ({ workspaceId: observable.events[0].workspaceId, caseId: observable.caseRef,
  runId: observable.events[0].runId, actorId: 'a_123456789abc', start: START, clock: CUTOFF });
const parent = mkdtempSync(join(tmpdir(), 'crosssignal-b01-compare-'));

// One finished batch. Runs named in `broken` (label-method) end without a finding; `tokens` is each model run's total.
function batch(name, { profile = 'minimal', started, commit = 'fixture-commit', broken = [], tokens = 1000, labels = null }) {
  const directory = join(parent, name), slots = [];
  for (const c of cases.filter(c => !labels || labels.includes(c.label))) for (const method of METHODS) {
    const slot = `${c.caseRef}-${method}`, finding = broken.includes(`${c.label}-${method}`) ? null : rulesFinding(source(c), scope(source(c)));
    const used = method === 'rules' ? 0 : tokens;
    const run = { version: 'b01-run-v1', saved: true, slot, case: c.file, caseRef: c.caseRef, method, commit,
      model: method === 'rules' ? null : 'fixture-model', scope: { runId: 'r_000000000000' },
      metrics: { tokens: { input: Math.min(used, 900), output: Math.max(used - 900, 0), total: used }, turns: 1, toolCalls: 0,
        elapsedMs: 1500, requests: { total: 3, retries: 0 }, exposedEvidenceIds: source(c).events.map(e => e.id) },
      result: { truthMode: 'SIMULATED', terminalStatus: finding?.terminalStatus ?? 'invalid_output',
        failureReason: finding ? null : 'invalid_json_or_schema', finding } };
    mkdirSync(join(directory, 'runs', slot, 'attempt'), { recursive: true });
    writeFileSync(join(directory, 'runs', slot, 'attempt', 'RESULT.json'), JSON.stringify(run));
    slots.push(slot);
  }
  writeFileSync(join(directory, 'BATCH.json'), JSON.stringify({ version: 'b01-batch-v1', truthMode: 'SIMULATED', date: '2026-10-04',
    startedAtUtc: started, commit, model: 'fixture-model', profile, tokenLimits: PROFILES[profile] ?? null, requestGapMs: 4500, slots }));
  return directory;
}
// Interleaved like the real step-4 run; one model run of each minimal batch ends without a finding.
const minimal1 = batch('minimal-1', { started: '2026-10-04T01:00:00.000Z', broken: ['B01-tool-using-model'] });
const low1 = batch('low-1', { profile: 'low', started: '2026-10-04T02:00:00.000Z', tokens: 4000 });
const minimal2 = batch('minimal-2', { started: '2026-10-04T03:00:00.000Z', broken: ['B02-single-shot-model'] });
const low2 = batch('low-2', { profile: 'low', started: '2026-10-04T04:00:00.000Z', tokens: 4000 });

test('a comparison adds up each profile\'s repeated batches, case by case and in start order', () => {
  // The frozen rules answer scores 67/75 a batch: it abstains on B06, picks the wrong segment on B07, B08 and B11, and misses
  // B12's provider deploy.
  const comparison = compareBatches([low2, minimal1, low1, minimal2]);
  assert.deepEqual(comparison.batches.map(b => b.profile), ['minimal', 'low', 'minimal', 'low']);
  assert.deepEqual(comparison.arms.map(a => [a.name, a.batches, a.tokenLimits.thinkingLevel]), [['minimal', 2, 'MINIMAL'], ['low', 2, 'LOW']]);
  assert.deepEqual(comparison.commits, ['fixture-commit']);
  const all = comparison.totals.all.cells;
  assert.deepEqual([all['single-shot-model'].minimal.perBatch, all['tool-using-model'].minimal.perBatch], [[67, 62], [62, 67]]);
  assert.deepEqual([all['single-shot-model'].low.perBatch, all['tool-using-model'].low.perBatch], [[67, 67], [67, 67]]);
  assert.deepEqual([all['tool-using-model'].minimal.score, all['tool-using-model'].minimal.maxScore], [129, 150]);
  assert.deepEqual(all.rules.perBatch, [67, 67, 67, 67]);
  assert.deepEqual(Object.keys(comparison.totals), ['development', 'frozen_transfer', 'fresh_holdout', 'fresh_holdout_2', 'all']);
  const b01 = comparison.cases.find(c => c.label === 'B01').cells['tool-using-model'];
  assert.deepEqual([b01.minimal.perBatch, b01.low.perBatch], [[0, 5], [5, 5]]);
  assert.equal(b01.minimal.endings['invalid_output (invalid_json_or_schema)'], 1);
  assert.equal(all['tool-using-model'].minimal.checks.status, all['tool-using-model'].low.checks.status - 1);
  assert.deepEqual([all['tool-using-model'].minimal.mean.tokens, all['tool-using-model'].low.mean.outputTokens], [1000, 3100]);

  assert.equal(comparison.truthMode, 'SIMULATED');
  const markdown = renderComparison(comparison);
  assert.match(markdown, /^# Benchmark: `minimal` vs `low` on 15 simulated cases$/m);
  assert.match(markdown, /^\*\*SIMULATED incidents, not production data\.\*\* A batch is one fresh run of every case with every method\. /m);
  assert.match(markdown, /This compares 4 batches: 2 with `minimal` and 2 with `low`, started in the order listed under Provenance\./);
  assert.match(markdown, /^\| Method \| `minimal`: MINIMAL thinking, up to 1,024 output tokens a response \| `low`: LOW thinking, up to 4,096 /m);
  assert.match(markdown, /^\| Tool-using model \| \*\*129\/150\*\* \(86%\) · per batch 62, 67 \| \*\*134\/150\*\* \(89%\) · per batch 67, 67 \|$/m);
  assert.match(markdown, /so 2 batches of 15 cases make 150\. Rules, the no-model baseline in `db\/benchmark\/rules\.mjs`, scored 67\/75 in every batch;/);
  assert.match(markdown, /^\| Case \| Split \| Single-shot · `minimal` \| Single-shot · `low` \| Tool-using · `minimal` \| Tool-using · `low` \| Rules \|$/m);
  assert.match(markdown, /^\| B01 \| Dev \| 10\/10 \(5, 5\) \| 10\/10 \(5, 5\) \| 5\/10 \(0, 5\) \| 10\/10 \(5, 5\) \| 5\/5 in every batch \|$/m);
  assert.match(markdown, /^\| Dev \(B01, B02\) \| \| 15\/20 \(10, 5\) \| 20\/20 \(10, 10\) \| 15\/20 \(5, 10\) \| 20\/20 \(10, 10\) \| 10\/10 in every batch \|$/m);
  assert.match(markdown, /^\| Fresh holdout \(B06, B07, B08, B09, B10\) \| \| 42\/50 \(21, 21\) \|/m);
  assert.match(markdown, /^\| Fresh holdout 2 \(B11, B12, B13, B14, B15\) \| \| 42\/50 \(21, 21\) \|/m);
  assert.match(markdown, /^\| \*\*All\*\* \| \| \*\*129\/150 \(67, 62\)\*\* \| \*\*134\/150 \(67, 67\)\*\* \| \*\*129\/150 \(62, 67\)\*\* \| \*\*134\/150 \(67, 67\)\*\* \| 67\/75 in every batch \|$/m);
  assert.match(markdown, /^\| invalid_output \(invalid_json_or_schema\) \| 1 \| 0 \| 1 \| 0 \|$/m);
  assert.match(markdown, /^\| Output tokens \(thinking included\) \| 100 \| 3,100 \| 100 \| 3,100 \|$/m);
  assert.match(markdown, /^\| Wall time \| 1\.5 s \| 1\.5 s \| 1\.5 s \| 1\.5 s \|$/m);
  assert.match(markdown, /Gemini requests start at least 4\.5 s apart\./);
  assert.match(markdown, /^- Profile `low`: thinking LOW; 4096 output tokens a response, 24576 a run; 16384-token context$/m);
  assert.match(markdown, /^- Batch 2: `[^`]*low-1`, `low`, started 2026-10-04T02:00:00\.000Z$/m);
  assert.match(markdown, /^- Rubric `tests\/evaluator\/b06-b10\/rubric\.json` sha256 `[0-9a-f]{64}`$/m);
});

test('with one profile and two commits, each commit is an arm, ordered by its first batch', () => {
  // Step 5 alternates a baseline commit and a new commit, both under `low`; the new commit breaks one tool-using run.
  const base = 'aaaaaaa1111111111111111111111111111111111', next = 'bbbbbbb2222222222222222222222222222222222';
  const arm = (name, started, commit, broken = []) => batch(name, { profile: 'low', started, commit, broken, tokens: 4000 });
  const b1 = arm('base-1', '2026-10-05T01:00:00.000Z', base), n1 = arm('new-1', '2026-10-05T02:00:00.000Z', next, ['B03-tool-using-model']);
  const b2 = arm('base-2', '2026-10-05T03:00:00.000Z', base), n2 = arm('new-2', '2026-10-05T04:00:00.000Z', next);
  const comparison = compareBatches([n2, b2, n1, b1]);
  assert.equal(comparison.version, 'b01-comparison-v2');
  assert.deepEqual(comparison.commits, [base, next]);
  assert.deepEqual(comparison.arms.map(a => [a.name, a.commit, a.profile, a.batches]), [['aaaaaaa', base, 'low', 2], ['bbbbbbb', next, 'low', 2]]);
  assert.deepEqual(comparison.batches.map(b => b.arm), ['aaaaaaa', 'bbbbbbb', 'aaaaaaa', 'bbbbbbb']);
  const tool = comparison.totals.all.cells['tool-using-model'];
  assert.deepEqual([tool.aaaaaaa.perBatch, tool.bbbbbbb.perBatch], [[67, 67], [62, 67]]);
  assert.deepEqual(comparison.totals.fresh_holdout_2.cells['tool-using-model'].bbbbbbb.perBatch, [21, 21]);
  const markdown = renderComparison(comparison);
  assert.match(markdown, /^# Benchmark: `aaaaaaa` vs `bbbbbbb` on 15 simulated cases$/m);
  assert.match(markdown, /This compares 4 batches: 2 with `aaaaaaa` and 2 with `bbbbbbb`, started in the order listed under Provenance\. /);
  assert.match(markdown, /Only the commit changed between them: every run used the `low` profile, with `fixture-model` on the Gemini free tier/);
  assert.match(markdown, /^\| Method \| `aaaaaaa`: commit `aaaaaaa11111`, LOW thinking, up to 4,096 output tokens a response \| `bbbbbbb`: commit /m);
  assert.match(markdown, /^\| Tool-using model \| \*\*134\/150\*\* \(89%\) · per batch 67, 67 \| \*\*129\/150\*\* \(86%\) · per batch 62, 67 \|$/m);
  assert.match(markdown, /^\| B03 \| Holdout \| 10\/10 \(5, 5\) \| 10\/10 \(5, 5\) \| 10\/10 \(5, 5\) \| 5\/10 \(0, 5\) \| 5\/5 in every batch \|$/m);
  assert.match(markdown, /^- Commit: `aaaaaaa1{34}`$/m);
  assert.match(markdown, /^- Commit: `bbbbbbb2{34}`$/m);
  assert.match(markdown, /^- Batch 2: `[^`]*new-1`, `bbbbbbb`, started 2026-10-05T02:00:00\.000Z$/m);
  // When both vary, an arm names both.
  const mixed = compareBatches([minimal1, b1]);
  assert.deepEqual(mixed.arms.map(a => a.name), ['minimal @ fixture', 'low @ aaaaaaa']);
  assert.match(renderComparison(mixed), /Each arm is one commit and one token profile, with/);
});

test('a comparison refuses batches that differ in anything but the commit and the profile', () => {
  const fewer = batch('b01-b05', { started: '2026-10-04T06:00:00.000Z', labels: ['B01', 'B02', 'B03', 'B04', 'B05'] });
  assert.throws(() => compareBatches([minimal1, fewer]),
    /batches differ in cases; only the commit and the profile may change between them/);
  const stray = batch('high', { profile: 'high', started: '2026-10-04T07:00:00.000Z' });
  assert.throws(() => compareBatches([minimal1, stray]), /uses the unknown profile high/);
  assert.throws(() => compareBatches([]), /Usage/);
});

test('the comparison runs as its own process and writes COMPARISON.md and comparison.json', () => {
  const out = join(parent, 'comparison');
  const compared = spawnSync(process.execPath, ['tests/evaluator/compare-b01.mjs', '--out', out, minimal1, low1], { encoding: 'utf8' });
  assert.equal(compared.status, 0, compared.stderr);
  assert.equal(JSON.parse(readFileSync(join(out, 'comparison.json'), 'utf8')).version, 'b01-comparison-v2');
  assert.match(readFileSync(join(out, 'COMPARISON.md'), 'utf8'), /^\| Single-shot model \| \*\*67\/75\*\* \(89%\) · per batch 67 \| /m);
  // Without --out it refuses rather than write into a batch folder.
  const refused = spawnSync(process.execPath, ['tests/evaluator/compare-b01.mjs', minimal1, low1], { encoding: 'utf8' });
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /Usage: node tests\/evaluator\/compare-b01\.mjs --out <dir> <batch-dir>/);
  assert(!existsSync(join(minimal1, 'COMPARISON.md')));
});
