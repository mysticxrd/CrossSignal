import { createHash } from 'node:crypto';
import { readFile, readdir, lstat, readlink } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const sha = value => createHash('sha256').update(value).digest('hex');
export async function inventory(root, product = false) {
  const files = {}, links = {}, directories = [];
  async function walk(dir) {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const full = resolve(dir, e.name), name = relative(root, full).replaceAll('\\', '/');
      if (e.name === '.git' || (!product && name === 'work/crosssignal-phase1')) continue;
      if (product && (name === 'factory/02_data/CONTEXT.md' || name === 'factory/02_data/verify.mjs'
        || name.startsWith('factory/02_data/benchmark') || name.startsWith('factory/02_data/output'))) continue;
      const info = await lstat(full);
      if (info.isSymbolicLink()) { links[name] = await readlink(full); continue; }
      if (e.name === 'node_modules') { directories.push(name); continue; }
      if (info.isDirectory()) { directories.push(name); await walk(full); }
      else if (info.isFile()) files[name] = sha(await readFile(full));
    }
  }
  await walk(root);
  const git = args => {
    const r = spawnSync('git', ['-c', `safe.directory=${resolve(root).replaceAll('\\', '/')}`, ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } });
    if (r.status !== 0) throw new Error(r.stderr); return r.stdout.trim();
  };
  return { root, files, links, directories: directories.sort(), branch: git(['branch', '--show-current']), head: git(['rev-parse', 'HEAD']),
    indexSha256: sha(await readFile(resolve(root, '.git/index'))), status: git(['status', '--porcelain=v1', '--untracked-files=all']).split('\n').filter(Boolean) };
}
export async function checkPreservation(baseline) {
  const results = [];
  for (const [kind, before] of Object.entries(baseline.repositories)) {
    const after = await inventory(before.root, kind === 'product');
    const drift = Object.entries(before.files).filter(([name, hash]) => after.files[name] !== hash).map(([name]) => name);
    const missingDirs = before.directories.filter(name => !after.directories.includes(name));
    if (drift.length || missingDirs.length || JSON.stringify(before.links) !== JSON.stringify(after.links)
      || before.head !== after.head || before.branch !== after.branch || before.indexSha256 !== after.indexSha256) throw new Error(`Preservation drift (${kind}): ${JSON.stringify({ drift, missingDirs })}`);
    const owned = name => kind === 'product' && /^(?:factory\/02_data\/CONTEXT\.md|factory\/02_data\/verify\.mjs|factory\/02_data\/(?:benchmark|output)\/)/.test(name.slice(3));
    const lostStatus = before.status.filter(line => !owned(line) && !after.status.includes(line));
    if (lostStatus.length) throw new Error(`Existing Git status changed (${kind}): ${lostStatus.join(', ')}`);
    results.push({ repository: kind, unchangedFiles: Object.keys(before.files).length, preservedDirectories: before.directories.length,
      unchangedHead: after.head, unchangedBranch: after.branch, unchangedIndex: after.indexSha256,
      preservedA01FactoryFiles: Object.keys(before.files).filter(n => n.startsWith('_archive/2026-09-30-a01-before-b01/factory/')).length,
      preservedA01StoredFiles: Object.keys(before.files).filter(n => n.startsWith('outputs/a01/')).length });
  }
  return results;
}
export async function checkImmutableHistory(baseline) {
  const root = baseline.repositories.product.root;
  const protectedFiles = Object.entries(baseline.repositories.product.files).filter(([name]) =>
    name.startsWith('_archive/') || name.startsWith('outputs/a01/') || name.startsWith('factory/02_data/fixtures/')
    || name.startsWith('factory/02_data/postgres/'));
  for (const [name, hash] of protectedFiles) {
    if (sha(await readFile(resolve(root, name))) !== hash) throw new Error(`Preserved historical bytes changed: ${name}`);
  }
  return protectedFiles.length;
}
