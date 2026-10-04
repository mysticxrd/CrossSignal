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
const FOLDERS = ['factory/02_data/benchmark/observable', 'db/benchmark/cases/b06-b10'];
const cases = RUBRICS.flatMap((path, i) => JSON.parse(readFileSync(path, 'utf8')).cases
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
      result: { terminalStatus: finding?.terminalStatus ?? 'invalid_output', failureReason: finding ? null : 'invalid_json_or_schema', finding } };
    mkdirSync(join(directory, 'runs', slot, 'attempt'), { recursive: true });
    writeFileSync(join(directory, 'runs', slot, 'attempt', 'RESULT.json'), JSON.stringify(run));
    slots.push(slot);
  }
  writeFileSync(join(directory, 'BATCH.json'), JSON.stringify({ version: 'b01-batch-v1', date: '2026-10-04', startedAtUtc: started, commit,
    model: 'fixture-model', profile, tokenLimits: PROFILES[profile] ?? null, requestGapMs: 4500, slots }));
  return directory;
}
// Interleaved like the real step-4 run; one model run of each minimal batch ends without a finding.
const minimal1 = batch('minimal-1', { started: '2026-10-04T01:00:00.000Z', broken: ['B01-tool-using-model'] });
const low1 = batch('low-1', { profile: 'low', started: '2026-10-04T02:00:00.000Z', tokens: 4000 });
const minimal2 = batch('minimal-2', { started: '2026-10-04T03:00:00.000Z', broken: ['B02-single-shot-model'] });
const low2 = batch('low-2', { profile: 'low', started: '2026-10-04T04:00:00.000Z', tokens: 4000 });

test('a comparison adds up each profile\'s repeated batches, case by case and in start order', () => {
  // The frozen rules answer scores 46/50 a batch: it abstains on B06 and picks the wrong segment on B07 and B08.
  const comparison = compareBatches([low2, minimal1, low1, minimal2]);
  assert.deepEqual(comparison.batches.map(b => b.profile), ['minimal', 'low', 'minimal', 'low']);
  assert.deepEqual(comparison.profiles.map(p => [p.name, p.batches, p.tokenLimits.thinkingLevel]), [['minimal', 2, 'MINIMAL'], ['low', 2, 'LOW']]);
  const all = comparison.totals.all.cells;
  assert.deepEqual([all['single-shot-model'].minimal.perBatch, all['tool-using-model'].minimal.perBatch], [[46, 41], [41, 46]]);
  assert.deepEqual([all['single-shot-model'].low.perBatch, all['tool-using-model'].low.perBatch], [[46, 46], [46, 46]]);
  assert.deepEqual([all['tool-using-model'].minimal.score, all['tool-using-model'].minimal.maxScore], [87, 100]);
  assert.deepEqual(all.rules.perBatch, [46, 46, 46, 46]);
  assert.deepEqual(Object.keys(comparison.totals), ['development', 'frozen_transfer', 'fresh_holdout', 'all']);
  const b01 = comparison.cases.find(c => c.label === 'B01').cells['tool-using-model'];
  assert.deepEqual([b01.minimal.perBatch, b01.low.perBatch], [[0, 5], [5, 5]]);
  assert.equal(b01.minimal.endings['invalid_output (invalid_json_or_schema)'], 1);
  assert.equal(all['tool-using-model'].minimal.checks.status, all['tool-using-model'].low.checks.status - 1);
  assert.deepEqual([all['tool-using-model'].minimal.mean.tokens, all['tool-using-model'].low.mean.outputTokens], [1000, 3100]);

  const markdown = renderComparison(comparison);
  assert.match(markdown, /^# Benchmark: `minimal` vs `low` on 10 simulated cases$/m);
  assert.match(markdown, /This compares 4 batches: 2 with `minimal` and 2 with `low`, started in the order listed under Provenance\./);
  assert.match(markdown, /^\| Method \| `minimal`: MINIMAL thinking, up to 1,024 output tokens a response \| `low`: LOW thinking, up to 4,096 /m);
  assert.match(markdown, /^\| Tool-using model \| \*\*87\/100\*\* \(87%\) · per batch 41, 46 \| \*\*92\/100\*\* \(92%\) · per batch 46, 46 \|$/m);
  assert.match(markdown, /so 2 batches of 10 cases make 100\. Rules, the no-model baseline in `db\/benchmark\/rules\.mjs`, scored 46\/50 in every batch;/);
  assert.match(markdown, /^\| Case \| Split \| Single-shot · `minimal` \| Single-shot · `low` \| Tool-using · `minimal` \| Tool-using · `low` \| Rules \|$/m);
  assert.match(markdown, /^\| B01 \| Dev \| 10\/10 \(5, 5\) \| 10\/10 \(5, 5\) \| 5\/10 \(0, 5\) \| 10\/10 \(5, 5\) \| 5\/5 in every batch \|$/m);
  assert.match(markdown, /^\| Dev \(B01, B02\) \| \| 15\/20 \(10, 5\) \| 20\/20 \(10, 10\) \| 15\/20 \(5, 10\) \| 20\/20 \(10, 10\) \| 10\/10 in every batch \|$/m);
  assert.match(markdown, /^\| Fresh holdout \(B06, B07, B08, B09, B10\) \| \| 42\/50 \(21, 21\) \|/m);
  assert.match(markdown, /^\| \*\*All\*\* \| \| \*\*87\/100 \(46, 41\)\*\* \| \*\*92\/100 \(46, 46\)\*\* \| \*\*87\/100 \(41, 46\)\*\* \| \*\*92\/100 \(46, 46\)\*\* \| 46\/50 in every batch \|$/m);
  assert.match(markdown, /^\| invalid_output \(invalid_json_or_schema\) \| 1 \| 0 \| 1 \| 0 \|$/m);
  assert.match(markdown, /^\| Output tokens \(thinking included\) \| 100 \| 3,100 \| 100 \| 3,100 \|$/m);
  assert.match(markdown, /^\| Wall time \| 1\.5 s \| 1\.5 s \| 1\.5 s \| 1\.5 s \|$/m);
  assert.match(markdown, /Gemini requests start at least 4\.5 s apart\./);
  assert.match(markdown, /^- Profile `low`: thinking LOW; 4096 output tokens a response, 24576 a run; 16384-token context$/m);
  assert.match(markdown, /^- Batch 2: `[^`]*low-1`, `low`, started 2026-10-04T02:00:00\.000Z$/m);
  assert.match(markdown, /^- Rubric `tests\/evaluator\/b06-b10\/rubric\.json` sha256 `[0-9a-f]{64}`$/m);
});

test('a comparison refuses batches that differ in anything but the profile', () => {
  const other = batch('other-commit', { started: '2026-10-04T05:00:00.000Z', commit: 'other-commit' });
  assert.throws(() => compareBatches([minimal1, other]), /batches differ in commit; only the profile may change between them/);
  const fewer = batch('b01-b05', { started: '2026-10-04T06:00:00.000Z', labels: ['B01', 'B02', 'B03', 'B04', 'B05'] });
  assert.throws(() => compareBatches([minimal1, fewer]), /batches differ in cases/);
  const stray = batch('high', { profile: 'high', started: '2026-10-04T07:00:00.000Z' });
  assert.throws(() => compareBatches([minimal1, stray]), /uses the unknown profile high/);
  assert.throws(() => compareBatches([]), /Usage/);
});

test('the comparison runs as its own process and writes COMPARISON.md and comparison.json', () => {
  const out = join(parent, 'comparison');
  const compared = spawnSync(process.execPath, ['tests/evaluator/compare-b01.mjs', '--out', out, minimal1, low1], { encoding: 'utf8' });
  assert.equal(compared.status, 0, compared.stderr);
  assert.equal(JSON.parse(readFileSync(join(out, 'comparison.json'), 'utf8')).version, 'b01-comparison-v1');
  assert.match(readFileSync(join(out, 'COMPARISON.md'), 'utf8'), /^\| Single-shot model \| \*\*46\/50\*\* \(92%\) · per batch 46 \| /m);
  // Without --out it refuses rather than write into a batch folder.
  const refused = spawnSync(process.execPath, ['tests/evaluator/compare-b01.mjs', minimal1, low1], { encoding: 'utf8' });
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /Usage: node tests\/evaluator\/compare-b01\.mjs --out <dir> <batch-dir>/);
  assert(!existsSync(join(minimal1, 'COMPARISON.md')));
});
