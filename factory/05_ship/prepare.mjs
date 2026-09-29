import assert from 'node:assert/strict';
import {mkdirSync, readFileSync, writeFileSync, copyFileSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileHash, frontmatterValue} from '../_lib/verify-kit.mjs';
import {root, out, releaseFiles, bindingName, verifyStage} from './verify.mjs';

const target = p => resolve(root, out, p);
const write = (p, content) => writeFileSync(target(p), content);
if (existsSync(target('HUMAN_GATE.md'))) {
    assert.equal(frontmatterValue(readFileSync(target('HUMAN_GATE.md'), 'utf8'), 'decision'), 'pending', 'Preserve reviewed Ship gate; start a governed correction instead');
}
const records = [];
function run(args) {
    const startedAt = new Date().toISOString();
    const result = spawnSync(process.execPath, args, {cwd: root, encoding: 'utf8', timeout: 180000, maxBuffer: 8000000});
    assert.equal(result.status, 0, result.error?.message || result.stderr || result.stdout);
    records.push({command: 'node ' + args.join(' '), startedAt, completedAt: new Date().toISOString(), exitCode: result.status, stderr: result.stderr});
    return result.stdout;
}
const upstream = JSON.parse(run(['factory/04_verify/verify.mjs']));
assert.equal(upstream.gate, 'accepted');
mkdirSync(target('replay'), {recursive: true});
const coldText = run(['--experimental-strip-types', 'scripts/run-a01.mjs']);
const cold = JSON.parse(coldText);
const accepted = JSON.parse(readFileSync(resolve(root, 'factory/04_verify/output/cold-replay.json'), 'utf8'));
assert.deepEqual(cold.runs, accepted.runs);
write('cold-replay.json', coldText);
for (const {variant} of cold.runs) {
    mkdirSync(target(`replay/${variant}-1`), {recursive: true});
    for (const p of [`${variant}-1/artifact.json`, `${variant}.md`, `${variant}.grade.json`]) copyFileSync(resolve(cold.directory, p), target('replay/' + p));
}
write('release-tests.tap', run(['--experimental-strip-types', '--test', 'tests/a01-release.test.mjs']));
write('commands.json', JSON.stringify({node: process.version, platform: process.platform, architecture: process.arch, cwd: root, commands: records}, null, 2) + '\n');
const hash = p => fileHash(root, resolve(root, p));
const rows = async paths => (await Promise.all(paths.map(async p => '| `' + bindingName(p) + '` | `' + await hash(p) + '` |'))).join('\n');
const truth = 'truth_mode: SIMULATED\nmodel_evaluation: NOT_RUN\nhuman_runtime_approval: NOT_RUN\nfull_ai_hiring_proof: false';
write('RELEASE_MANIFEST.md', `---
unit: a01-synthetic-revenue-investigation
stage: 05_ship
status: ready-for-review
release_kind: local-deterministic-mechanics-preview
${truth}
---

# A01 local mechanics preview

This package demonstrates one synthetic deployment incident from bounded
investigation through a surrogate-approved simulated intervention, observed
outcome and independent hidden-truth grade. It is ready for the final human
packaging review. It is not complete AI hiring proof or a production release.

## Start here

Follow [DEMO_SCRIPT.md](DEMO_SCRIPT.md). The [checkout report](replay/checkout.md)
links the durable lifecycle artifact and cites query, event and timeline IDs.
[Verification](../../04_verify/output/VERIFICATION_REPORT.md) maps every accepted
criterion and deliberate failure. [Command evidence](commands.json) records this
package's new cold replay and four focused release tests.

## What passed

- Five cold replay pairs in fresh processes and separate SQLite stores exactly
  match accepted Verify and Build artifacts. Each replay preserves earlier runs.
- Correct checkout rollback reaches 190/200 affected successes per new window;
  unrelated/no intervention remains 120/200. Every observation is SIMULATED.
- Limited evidence abstains; injected support instructions do not grant authority.
- Four release tests pass: all 40 nested authority mutations reject, corrupted
  effect links reject, concurrent resume retains one effect, all accepted good
  artifacts still grade successfully. The corrected grader is independent.
- Accepted 18 integrated checks, 19 regression checks and the unchanged app
  build remain valid by current source/evidence bindings; they were not all rerun.

## Boundaries

The investigator is deterministic_baseline. Model evaluation is NOT_RUN. Actual
human runtime approval is NOT_RUN; automated grants are fixture_surrogate.
Stage acceptance does not grant rollback authority. No paid model calls or model
downloads occurred. These five branches are variants of one incident.

The local operator is trusted. Fixed Node code runs with exact file permissions;
this does not establish arbitrary native-code isolation or remote authentication.
SQLite transaction evidence does not establish external exactly-once delivery.
Trace hashes check consistency, not owner-resistant signatures.

Existing data, tenant safeguards, excluded trial receipt and LIVE are preserved.
No hosted schema or application changes were made for packaging. No real payment
capture, Mobile Safari device verification or recovered business revenue is
claimed. The original factory run remains preserved in the archive.

## Remaining proof and recommended next work

After packaging acceptance and the required commit/seal, complete one exact
human-approved simulated Case using the displayed preview. Then add a bounded
local model evaluation with recorded model/configuration, tool transcript,
independent grading and deterministic-baseline comparison. Resolve these A01
proof gaps before expanding to five and then ten causally different incidents.
Real payment/device verification remains separate work.

## Release identity and coverage

The table below binds the complete existing Git-visible working tree, including
preserved historical files. Text hashes normalize line endings using the shared
kit. Ignored runtime SQLite stores, dependencies, generated builds and secrets
are excluded. Manifest, VERIFY and HUMAN_GATE are excluded from this table to
avoid circular hashes: VERIFY binds manifest/demo and the human gate binds all
three. The verifier requires the exact current file inventory, so new or removed
files also invalidate coverage. Runtime reports/artifacts are copied here for
durable review; local runtime directories remain intact.

The package is uncommitted and unsealed while its gate is pending. After explicit
final acceptance, commit the complete reviewed release and run factory/seal.mjs;
the clean commit then supplies release identity. No publish or deployment occurs.

## Declared input hashes

| Input | SHA-256 |
| --- | --- |
${await rows(releaseFiles())}
`);
write('VERIFY.md', `---
unit: a01-synthetic-revenue-investigation
stage: 05_ship
status: passed
verified_at: ${new Date().toISOString()}
---

# Ship packaging verification

Environment: ${process.version}, ${process.platform}/${process.arch}. See
[commands.json](commands.json) for exact commands, start/end UTC, exit codes and
runtime warnings. No installation, hosted migration, model call or deployment.

1. node factory/04_verify/verify.mjs — PASS; accepted and fresh upstream evidence.
2. node --experimental-strip-types scripts/run-a01.mjs — PASS; five branches
   repeated in ten fresh processes/stores; identical to accepted Verify hashes.
3. node --experimental-strip-types --test tests/a01-release.test.mjs — 4 PASS,
   0 failures; [TAP](release-tests.tap), including 40 mutated authority fields.
4. node factory/05_ship/verify.mjs — validates complete coverage, independent
   grades, hash references, current upstream, truth labels and pending gate.

Accepted app build, 18 integrated checks and 19 regressions are carried forward
by exact unchanged source/evidence bindings. Only Ship tooling/documentation
changed. Historical Build's single grader-source correction remains documented
and verified by Stage 04. Full model/human-runtime proof remains NOT_RUN.

The package preparer writes an open gate; a human owns acceptance. Separate lint
and git diff --check are required before handoff. No release is sealed yet.

The initial packaging assertion required uppercase SIMULATED in an existing
report titled "simulated Case". The replay and all tests had passed; the new
packaging check was corrected to accept casing. Product code and accepted
reports were preserved, and the final package was regenerated and verified.

## Declared input hashes

| Input | SHA-256 |
| --- | --- |
${await rows([`${out}/RELEASE_MANIFEST.md`, `${out}/DEMO_SCRIPT.md`])}
`);
write('HUMAN_GATE.md', `---
unit: a01-synthetic-revenue-investigation
stage: 05_ship
gate_status: open
decision: pending
reviewer: pending
reviewed_at: pending
release_manifest_sha256: ${await hash(`${out}/RELEASE_MANIFEST.md`)}
demo_script_sha256: ${await hash(`${out}/DEMO_SCRIPT.md`)}
verification_sha256: ${await hash(`${out}/VERIFY.md`)}
---

# Final packaging review

Review [release manifest](RELEASE_MANIFEST.md), run [the cold demo](DEMO_SCRIPT.md)
and inspect [verification](VERIFY.md). AGENTS.md requires this human gate before
the complete release is committed and sealed. Acceptance applies to the local
deterministic mechanics preview with its explicit remaining proof gaps.

It is not runtime rollback approval, model evaluation, production deployment,
actual Mobile Safari verification or a business outcome. No publish is proposed.

## Reviewer notes

Pending. Model evaluation and actual human runtime approval remain NOT_RUN.
`);
console.log(JSON.stringify(await verifyStage(), null, 2));
