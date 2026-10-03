import assert from 'node:assert/strict';
import { lstat, readFile, readlink, stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { changedSince, pathHash, runChecked, sha256 } from './verify-kit.mjs';

export const B01_SNAPSHOT = '62787d1e832773a24fda569826d3adc2789a6585';
export const APPROVED_FACTORY_DIET = '81a0cdae838ebc4502f6675b195265a5b6857626';
export const OFFLINE_PROPOSAL_PATHS = Object.freeze([
  'db/benchmark/gemini-diagnostics.mjs',
  'db/benchmark/gemini-http.mjs',
  'docs/b01-unblock-offline-proposal.md',
  'factory/03_build/gemini-preflight.mjs',
  'factory/03_build/runner-checks.mjs',
  'factory/03_build/subscription-preflight.mjs',
  'factory/_lib/b01-preservation.mjs',
  'factory/_lib/b01-preservation.test.mjs',
  'tests/benchmark-gemini-diagnostics.test.mjs',
]);
const protectedPaths = Object.freeze([
  '_archive', 'factory/_shared', 'factory/01_spec', 'factory/02_data',
  'factory/03_build/output', 'factory/TRANSITION.md', 'factory/A01_PRESERVATION_MANIFEST.json',
]);
const defaultRoot = resolve(import.meta.dirname, '../..');
const contains = (parent, path) => path === parent || path.startsWith(`${parent}/`);

// Git commits qualify exact changes; they never grant provider execution authority.
// Historical packets and ignored-runtime bindings remain separate, immutable proof.
export async function checkB01GitPreservation({ projectRoot = defaultRoot,
  snapshotCommit = B01_SNAPSHOT, approvedDietCommit = APPROVED_FACTORY_DIET } = {}) {
  const git = (...args) => runChecked('git', ['-c', `safe.directory=${resolve(projectRoot)}`,
    ...args], { cwd: projectRoot }).stdout;
  git('merge-base', '--is-ancestor', snapshotCommit, approvedDietCommit);
  git('merge-base', '--is-ancestor', approvedDietCommit, 'HEAD');
  const diffNames = (...args) => git('diff', '--name-only', '--no-renames', '-z', ...args, '--')
    .split('\0').filter(Boolean).sort();
  const approvedPaths = diffNames(snapshotCommit, approvedDietCommit);
  assert(!approvedPaths.some(path => protectedPaths.some(parent => contains(parent, path))),
    'Approved factory diet changed a protected input');
  const protectedChanges = new Set([
    ...changedSince(snapshotCommit, protectedPaths, { cwd: projectRoot }),
    ...diffNames('--cached', snapshotCommit).filter(path => protectedPaths.some(parent => contains(parent, path))),
  ]);
  assert.equal(protectedChanges.size, 0, `Protected inputs changed: ${[...protectedChanges].sort().join(', ')}`);
  const changed = [...new Set([...changedSince(snapshotCommit, [], { cwd: projectRoot }),
    ...diffNames('--cached', snapshotCommit)])].sort();
  const afterApproval = [...new Set([...changedSince(approvedDietCommit, [], { cwd: projectRoot }),
    ...diffNames('--cached', approvedDietCommit)])].sort();
  const unknown = afterApproval.filter(path => !OFFLINE_PROPOSAL_PATHS.includes(path));
  assert.equal(unknown.length, 0, `Unreviewed changes outside the offline proposal: ${unknown.join(', ')}`);
  const proposed = await Promise.all(afterApproval.map(async path => {
    assert((await stat(resolve(projectRoot, path))).isFile(), `Proposed source removed: ${path}`);
    return { path, currentBlob: git('hash-object', '--', path).trim(), approval: 'pending' };
  }));
  const approved = approvedPaths.map(path => ({ path,
    blob: git('rev-parse', `${approvedDietCommit}:${path}`).trim() }));
  const classified = new Set([...approvedPaths, ...afterApproval]);
  assert(changed.every(path => classified.has(path)), 'Snapshot changes were not fully classified');
  return { repository: 'product', preservation: 'changedSince(snapshot), with exact approved Git contents',
    snapshotCommit, protectedInputs: 'unchanged', approvedFactoryDiet: { commit: approvedDietCommit, changes: approved },
    proposedOffline: { status: 'pending-human-review', changes: proposed },
    reviewRequired: true, providerRequestsAuthorized: false, frozenBaselinesReplaced: false };
}

export function transitionPaths(report, input) {
  return [...report.approvedFactoryDiet.changes, ...report.proposedOffline.changes]
    .map(change => change.path).filter(path => contains(input, path)).sort();
}

// Qualify only specifically classified preservation drift. Preserve the old hash
// as evidence and report the mismatch; never claim that a frozen binding is fresh.
export async function checkHistoricalBinding(projectRoot, binding, report) {
  const current = await pathHash(projectRoot, resolve(projectRoot, binding.input));
  if (current === binding.expected) return { input: binding.input, status: 'unchanged' };
  const paths = transitionPaths(report, binding.input);
  assert(paths.length > 0, `Input drift: ${binding.input}`);
  return { input: binding.input, status: 'superseded-preservation-binding',
    historicalSha256: binding.expected, currentSha256: current, transitionPaths: paths,
    reviewRequired: true, bindingReplaced: false };
}

// Reuse existing raw-byte bindings for Gitignored stores. No new inventory,
// credential read, directory copy or replacement preservation baseline is made.
export async function checkSavedRuntimeBindings(projectRoot, files) {
  let checked = 0;
  for (const [path, expected] of Object.entries(files)) {
    if (!path.startsWith('outputs/')) continue;
    assert(!/(?:^|\/)\.env(?:\.|$)/.test(path), 'Credential paths cannot be inspected');
    const target = resolve(projectRoot, path);
    assert(target.startsWith(`${resolve(projectRoot, 'outputs')}${sep}`), 'Invalid runtime binding path');
    assert.equal(sha256(await readFile(target)), expected, `Saved runtime changed: ${path}`);
    checked++;
  }
  return { existingRawBindingsChecked: checked, status: 'unchanged', inventoryCreated: false };
}

// Retain the old structural guards without recursively reading repository files.
export async function checkSavedStructure(projectRoot, saved) {
  for (const path of saved.directories)
    assert((await lstat(resolve(projectRoot, path))).isDirectory(), `Original directory removed or replaced: ${path}`);
  for (const [path, target] of Object.entries(saved.links))
    assert.equal(resolve(await readlink(resolve(projectRoot, path))), resolve(target), `Junction/link changed: ${path}`);
  return { originalDirectoriesChecked: saved.directories.length, originalLinksChecked: Object.keys(saved.links).length };
}
