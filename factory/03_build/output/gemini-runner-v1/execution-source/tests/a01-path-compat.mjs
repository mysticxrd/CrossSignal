import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// Test-only path bridge to the byte-preserved accepted A01 artifacts.
// No old test, fixture, evaluator or accepted document is rewritten.
const root = fileURLToPath(new URL('..', import.meta.url));
const paths = new Map(['checkout','notifications','none','limited','injection'].map(name => [
  resolve(root,`factory/03_build/output/replay/${name}-1/artifact.json`).toLowerCase(),
  resolve(root,`_archive/2026-09-30-a01-before-b01/factory/03_build/output/replay/${name}-1/artifact.json`),
]));
const original = fs.readFileSync;
fs.readFileSync = function(path, ...args) {
  const name = path instanceof URL ? fileURLToPath(path) : typeof path === 'string' ? resolve(path) : null;
  return original.call(this, paths.get(name?.toLowerCase()) ?? path, ...args);
};
syncBuiltinESMExports();
