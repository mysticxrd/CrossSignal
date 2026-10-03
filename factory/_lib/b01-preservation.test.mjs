import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, rmdir, symlink, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { checkB01GitPreservation, checkHistoricalBinding, checkSavedRuntimeBindings, checkSavedStructure } from './b01-preservation.mjs';
import { pathHash, runChecked, sha256 } from './verify-kit.mjs';

test('Git transition distinguishes exact approved contents, proposed changes and every protected drift', async () => {
  const root = await mkdtemp(join(tmpdir(), 'b01-git-transition-'));
  const git = (...args) => runChecked('git', ['-c', `safe.directory=${root}`, '-c', 'core.autocrlf=false',
    '-c', 'user.name=Offline fixture', '-c', 'user.email=offline@example.invalid', ...args], { cwd: root }).stdout;
  const write = async (path, text) => { await mkdir(dirname(join(root, path)), { recursive: true }); await writeFile(join(root, path), text); };
  try {
    for (const [path, text] of Object.entries({ '.gitignore': 'outputs/\n', 'CONTEXT.md': 'snapshot\n',
      'factory/01_spec/output/SPEC.md': 'accepted\n', 'factory/03_build/output/EXECUTION_CLAIM.json': 'consumed\n',
      'db/benchmark/gemini-http.mjs': 'frozen transport\n' })) await write(path, text);
    git('init'); git('add', '-A'); git('commit', '-m', 'snapshot');
    const snapshotCommit = git('rev-parse', 'HEAD').trim();
    await write('CONTEXT.md', 'approved diet\n');
    git('add', 'CONTEXT.md'); git('commit', '-m', 'approved factory diet');
    const approvedDietCommit = git('rev-parse', 'HEAD').trim();
    const options = { projectRoot: root, snapshotCommit, approvedDietCommit };
    const historical = { input: 'db/benchmark', expected: await pathHash(root, join(root, 'db/benchmark')) };
    await write('db/benchmark/gemini-http.mjs', 'offline diagnostic proposal\n');
    const report = await checkB01GitPreservation(options);
    assert.equal(report.protectedInputs, 'unchanged');
    assert.deepEqual(report.approvedFactoryDiet.changes.map(change => change.path), ['CONTEXT.md']);
    assert.deepEqual(report.proposedOffline.changes.map(change => change.path), ['db/benchmark/gemini-http.mjs']);
    assert.equal(report.proposedOffline.changes[0].currentBlob, git('hash-object', '--', 'db/benchmark/gemini-http.mjs').trim());
    assert.equal(report.reviewRequired, true); assert.equal(report.providerRequestsAuthorized, false);
    const qualified = await checkHistoricalBinding(root, historical, report);
    assert.equal(qualified.status, 'superseded-preservation-binding');
    assert.equal(qualified.historicalSha256, historical.expected); assert.equal(qualified.bindingReplaced, false);
    assert.deepEqual(qualified.transitionPaths, ['db/benchmark/gemini-http.mjs']);
    await assert.rejects(checkHistoricalBinding(root, { input: 'factory/01_spec/output/SPEC.md', expected: '0'.repeat(64) }, report), /Input drift/);
    await write('factory/01_spec/output/SPEC.md', 'unapproved\n');
    await assert.rejects(checkB01GitPreservation(options), /Protected inputs changed/);
    await write('factory/01_spec/output/SPEC.md', 'accepted\n');
    await rm(join(root, 'factory/03_build/output/EXECUTION_CLAIM.json'));
    await assert.rejects(checkB01GitPreservation(options), /Protected inputs changed/);
    await write('factory/03_build/output/EXECUTION_CLAIM.json', 'consumed\n');
    await write('factory/02_data/new-untracked.txt', 'unapproved\n');
    await assert.rejects(checkB01GitPreservation(options), /Protected inputs changed/);
    await rm(join(root, 'factory/02_data/new-untracked.txt'));
    await write('CONTEXT.md', 'staged unapproved content\n'); git('add', 'CONTEXT.md');
    await write('CONTEXT.md', 'approved diet\n');
    const index = git('ls-files', '--stage');
    await assert.rejects(checkB01GitPreservation(options), /outside the offline proposal/);
    assert.equal(git('ls-files', '--stage'), index, 'Preservation checking must not change staged work');
    git('add', 'CONTEXT.md');
    await write('unrelated.txt', 'preserve this uncommitted work\n');
    await assert.rejects(checkB01GitPreservation(options), /outside the offline proposal/);
    assert.equal(await readFile(join(root, 'unrelated.txt'), 'utf8'), 'preserve this uncommitted work\n');
    await rm(join(root, 'unrelated.txt'));
    git('add', 'db/benchmark/gemini-http.mjs'); git('commit', '-m', 'offline proposal, not execution approval');
    assert.equal((await checkB01GitPreservation(options)).proposedOffline.status, 'pending-human-review');
    await write('CONTEXT.md', 'later content on an approved path is not approved\n');
    await assert.rejects(checkB01GitPreservation(options), /outside the offline proposal/);
  } finally {
    assert.equal(dirname(resolve(root)), resolve(tmpdir()));
    assert.ok(root.startsWith(join(tmpdir(), 'b01-git-transition-')));
    await rm(root, { recursive: true });
  }
});

test('ignored runtime keeps the existing raw-byte binding and refuses drift, secrets and traversal', async () => {
  const root = await mkdtemp(join(tmpdir(), 'b01-git-transition-'));
  try {
    await mkdir(join(root, 'outputs/saved'), { recursive: true });
    const path = 'outputs/saved/case.sqlite', bytes = Buffer.from('immutable fixture\r\n');
    await writeFile(join(root, path), bytes);
    const bindings = { [path]: sha256(bytes) };
    assert.deepEqual(await checkSavedRuntimeBindings(root, bindings),
      { existingRawBindingsChecked: 1, status: 'unchanged', inventoryCreated: false });
    assert.deepEqual(await readFile(join(root, path)), bytes);
    await writeFile(join(root, path), 'changed fixture\n');
    await assert.rejects(checkSavedRuntimeBindings(root, bindings), /Saved runtime changed/);
    await assert.rejects(checkSavedRuntimeBindings(root, { 'outputs/.env': 'unused' }), /Credential paths/);
    await assert.rejects(checkSavedRuntimeBindings(root, { 'outputs/../../outside.txt': 'unused' }), /Invalid runtime binding/);
  } finally {
    assert.equal(dirname(resolve(root)), resolve(tmpdir()));
    assert.ok(root.startsWith(join(tmpdir(), 'b01-git-transition-')));
    await rm(root, { recursive: true });
  }
});

test('historical directory and junction guards remain effective without an inventory scan', async () => {
  const root = await mkdtemp(join(tmpdir(), 'b01-git-transition-'));
  try {
    const first = join(root, 'first'), second = join(root, 'second');
    await mkdir(first); await mkdir(second);
    await symlink(first, join(root, 'dependencies'), process.platform === 'win32' ? 'junction' : 'dir');
    const saved = { directories: ['first', 'second'], links: { dependencies: first } };
    assert.deepEqual(await checkSavedStructure(root, saved), { originalDirectoriesChecked: 2, originalLinksChecked: 1 });
    await unlink(join(root, 'dependencies'));
    await symlink(second, join(root, 'dependencies'), process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(checkSavedStructure(root, saved), /Junction\/link changed/);
    await rmdir(first);
    await assert.rejects(checkSavedStructure(root, saved), /ENOENT/);
  } finally {
    assert.equal(dirname(resolve(root)), resolve(tmpdir()));
    assert.ok(root.startsWith(join(tmpdir(), 'b01-git-transition-')));
    await rm(root, { recursive: true });
  }
});
