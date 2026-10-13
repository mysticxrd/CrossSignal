// Copies one saved, graded B01 run out of the gitignored outputs/b01 into db/replays/<runId>.json, so the public
// replay page (app/runs/[runId]) and npm test can re-check it. The recording is copied as saved, never edited.
// Refuses runs that were not saved, never ended, break their hash chain or look like they hold a key; never
// replaces a different file for the same run id.
// Usage: node scripts/export-replay.mjs --batch 2026-10-06-3 --case B17 --method tool-using-model
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireThat } from '../db/benchmark/contracts.mjs';
import { verifyRun } from '../db/replay.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const json = value => `${JSON.stringify(value, null, 2)}\n`;
const read = file => JSON.parse(readFileSync(file, 'utf8'));
const arg = name => {
  const at = process.argv.indexOf(name);
  requireThat(at !== -1 && process.argv[at + 1], `missing ${name}`);
  return process.argv[at + 1];
};

const batch = arg('--batch'), label = arg('--case'), method = arg('--method');
const batchDir = join(root, 'outputs/b01', batch);
const meta = read(join(batchDir, 'BATCH.json')), graded = read(join(batchDir, 'results.json'));
const grade = graded.runs.find(r => r.label === label && r.method === method);
requireThat(grade, `${batch} has no graded ${label} ${method} run`);
const slot = `${grade.caseRef}-${method}`, slotDir = join(batchDir, 'runs', slot);
// An interrupted attempt may have no RESULT.json; it cannot be the graded run, so skip it.
const attempt = readdirSync(slotDir).find(name => existsSync(join(slotDir, name, 'RESULT.json'))
  && read(join(slotDir, name, 'RESULT.json')).scope?.runId === grade.runId);
requireThat(attempt, `no attempt of ${slot} has run id ${grade.runId}`);

const run = read(join(slotDir, attempt, 'RESULT.json')), history = read(join(slotDir, attempt, 'HISTORY.json'));
requireThat(run.saved === true, `${grade.runId} was not saved, so it was never scored`);
requireThat(history.at(-1)?.kind === 'terminal', `${grade.runId} has no final row`);
const source = meta.cases.find(c => c.caseRef === grade.caseRef);
requireThat(source, `${batch}/BATCH.json does not list case ${grade.caseRef}`);
const bundle = {
  version: 'replay-bundle-v1',
  exportedFrom: `outputs/b01/${batch}/runs/${slot}/${attempt}`,
  batch: { name: batch, date: meta.date, startedAtUtc: meta.startedAtUtc, commit: meta.commit, model: meta.model,
    profile: meta.profile, truthMode: meta.truthMode, caseFile: source.file, caseSha256: source.sha256 },
  grader: { gradedAtUtc: graded.gradedAtUtc, graderSha256: graded.graderSha256, rubrics: graded.rubrics },
  grade, run, history,
};
const check = verifyRun(bundle);
requireThat(check.ok, `${grade.runId} breaks its hash chain at row ${check.brokenAt}`);
const text = json(bundle);
requireThat(!/AIza[0-9A-Za-z_-]{20,}/.test(text), `${grade.runId} contains something shaped like a Google API key`);

const out = join(root, 'db/replays', `${grade.runId}.json`);
if (existsSync(out)) {
  requireThat(readFileSync(out, 'utf8') === text, `${out} already holds a different recording`);
  console.log(`${grade.runId}: already exported, unchanged`);
} else {
  writeFileSync(out, text, { flag: 'wx' });
  console.log(`${grade.runId}: ${label} ${method} ${grade.score}/${grade.maxScore}, ${history.length} rows, head ${check.head}`);
  console.log(`Add it to db/replays/index.mjs to put it on the replay page.`);
}
