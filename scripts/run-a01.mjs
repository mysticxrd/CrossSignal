// One-command orchestrator. Grader output never returns to the investigator.
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = fileURLToPath(new URL('../', import.meta.url)), base = resolve(root, 'outputs/a01');
mkdirSync(base, { recursive: true });
const directory = mkdtempSync(resolve(base, 'replay-'));
function run(script, args) { const r = spawnSync(process.execPath, ['--experimental-strip-types', script, ...args], { cwd: root, encoding: 'utf8', timeout: 60000, maxBuffer: 8000000, env: { SystemRoot: process.env.SystemRoot ?? 'C:\\Windows' } }); if (r.status !== 0)
    throw new Error(r.stderr || r.stdout || r.error?.message); return r.stdout; }
const summaries = [];
for (const variant of ['checkout', 'notifications', 'none', 'limited', 'injection']) {
    const first = run('scripts/a01-case.mjs', ['replay', resolve(directory, variant + '-1'), variant]);
    const second = run('scripts/a01-case.mjs', ['replay', resolve(directory, variant + '-2'), variant]);
    if (first !== second)
        throw new Error('Repeatability failed: ' + variant);
    const artifactPath = resolve(directory, variant + '-1/artifact.json');
    const evaluated = JSON.parse(run('tests/evaluator/a01/grade.mjs', [artifactPath, variant === 'injection' ? 'checkout' : variant === 'limited' ? 'none' : variant, ...(variant === 'limited' ? ['limited'] : [])]));
    const sha256 = createHash('sha256').update(first).digest('hex');
    writeFileSync(resolve(directory, variant + '.md'), evaluated.report + '\n[Complete lifecycle artifact](' + variant + '-1/artifact.json)\n\nRepeatability: two fresh processes and separate SQLite stores matched. SHA-256 `' + sha256 + '`.\n');
    writeFileSync(resolve(directory, variant + '.grade.json'), JSON.stringify(evaluated.grade, null, 2));
    summaries.push({ variant, mechanics: evaluated.grade.mechanics, sha256, report: variant + '.md' });
}
const summary = { truthMode: 'SIMULATED', modelEvaluation: 'NOT_RUN', fullAiHiringProof: false, runs: summaries };
writeFileSync(resolve(directory, 'summary.json'), JSON.stringify(summary, null, 2));
process.stdout.write(JSON.stringify({ directory, ...summary }, null, 2) + '\n');
