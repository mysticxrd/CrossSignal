import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {fileHash, frontmatterValue, markdownHashBindings, markdownSection, runChecked} from '../_lib/verify-kit.mjs';
import {deriveFactoryState} from '../_lib/factory-state.mjs';
import {verifyStage as verifyUpstream, variants} from '../04_verify/verify.mjs';
import {grade} from '../../tests/evaluator/a01/grade.mjs';

export const root = fileURLToPath(new URL('../../', import.meta.url));
export const out = 'factory/05_ship/output';
export const excluded = ['RELEASE_MANIFEST.md', 'VERIFY.md', 'HUMAN_GATE.md'].map(p => `${out}/${p}`);
// The shared factory resolves dot-prefixed bindings relative to the output.
export const bindingName = p => p.startsWith('.') ? '../../../' + p : p;
const read = p => readFileSync(resolve(root, p), 'utf8');
const json = p => JSON.parse(read(p));

export function releaseFiles() {
    const result = runChecked('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {cwd: root});
    return [...new Set(result.stdout.split('\0').filter(p => p && !excluded.includes(p) && existsSync(resolve(root, p))))].sort();
}

export async function verifyStage() {
    assert.equal((await verifyUpstream()).gate, 'accepted');
    const state = await deriveFactoryState({projectRoot: root, includeGit: false});
    for (const stage of state.stages.slice(0, 4)) assert.equal(stage.status, 'complete', stage.name);
    assert.equal(state.stages[4].head, 'fresh', 'shared factory release-head coverage');
    const manifest = read(`${out}/RELEASE_MANIFEST.md`);
    const bindings = markdownHashBindings(markdownSection(manifest, /^## Declared input hashes$/));
    const files = releaseFiles();
    assert.deepEqual(bindings.map(b => b.input), files.map(bindingName), 'release coverage changed');
    for (const [i, b] of bindings.entries()) assert.equal(await fileHash(root, resolve(root, files[i])), b.expected, 'release drift: ' + b.input);
    assert.equal(frontmatterValue(manifest, 'release_kind'), 'local-deterministic-mechanics-preview');
    for (const name of ['RELEASE_MANIFEST.md', 'DEMO_SCRIPT.md']) {
        const doc = read(`${out}/${name}`);
        for (const [key, value] of Object.entries({truth_mode: 'SIMULATED', model_evaluation: 'NOT_RUN', human_runtime_approval: 'NOT_RUN', full_ai_hiring_proof: 'false'})) {
            assert.equal(frontmatterValue(doc, key), value, `${name}: ${key}`);
        }
    }
    const cold = json(`${out}/cold-replay.json`), previous = json('factory/04_verify/output/cold-replay.json');
    assert.deepEqual(cold.runs, previous.runs, 'cold replay differs from accepted verification');
    assert.equal(cold.truthMode, 'SIMULATED');
    assert.equal(cold.modelEvaluation, 'NOT_RUN');
    assert.equal(cold.fullAiHiringProof, false);
    for (const v of variants) {
        const artifact = json(`${out}/replay/${v}-1/artifact.json`);
        const result = grade(artifact, {intervention: v === 'injection' ? 'checkout' : v === 'limited' ? 'none' : v, limited: v === 'limited'});
        assert.deepEqual(result, json(`${out}/replay/${v}.grade.json`));
        assert.equal(result.mechanics, 'PASS');
        assert.equal(result.fullAiHiringProof, false);
        assert.equal(createHash('sha256').update(JSON.stringify(artifact)).digest('hex'), cold.runs.find(r => r.variant === v).sha256);
        assert.match(read(`${out}/replay/${v}.md`), /simulated/i);
    }
    const tests = read(`${out}/release-tests.tap`);
    assert.match(tests, /# pass 4\b/); assert.match(tests, /# fail 0\b/);
    const commands = json(`${out}/commands.json`);
    assert.equal(commands.commands.length, 3);
    for (const c of commands.commands) { assert.equal(c.exitCode, 0); assert.ok(Number.isFinite(Date.parse(c.startedAt))); }
    const verification = read(`${out}/VERIFY.md`), gate = read(`${out}/HUMAN_GATE.md`);
    assert.equal(frontmatterValue(verification, 'status'), 'passed');
    const verifyBindings = markdownHashBindings(markdownSection(verification, /^## Declared input hashes$/));
    assert.deepEqual(verifyBindings.map(b => b.input), [`${out}/RELEASE_MANIFEST.md`, `${out}/DEMO_SCRIPT.md`]);
    for (const b of verifyBindings) assert.equal(await fileHash(root, resolve(root, b.input)), b.expected);
    for (const [field, file] of Object.entries({release_manifest_sha256: 'RELEASE_MANIFEST.md', demo_script_sha256: 'DEMO_SCRIPT.md', verification_sha256: 'VERIFY.md'})) {
        assert.equal(frontmatterValue(gate, field), await fileHash(root, resolve(root, out, file)));
    }
    const decision = frontmatterValue(gate, 'decision');
    assert.ok(['pending', 'accepted', 'changes-requested', 'rejected'].includes(decision));
    assert.equal(frontmatterValue(gate, 'gate_status'), decision === 'pending' ? 'open' : 'closed');
    if (decision !== 'pending') {
        assert.ok(frontmatterValue(gate, 'reviewer') && frontmatterValue(gate, 'reviewer') !== 'pending');
        assert.ok(Number.isFinite(Date.parse(frontmatterValue(gate, 'reviewed_at'))));
    }
    return {stage: '05_ship', releaseKind: 'local-deterministic-mechanics-preview', boundFiles: bindings.length, coldReplayBranches: 5, releaseTests: 4, modelEvaluation: 'NOT_RUN', humanRuntimeApproval: 'NOT_RUN', fullAiHiringProof: false, gate: decision};
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(await verifyStage(), null, 2));
