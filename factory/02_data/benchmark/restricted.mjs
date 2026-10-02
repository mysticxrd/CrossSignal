// Trusted host launcher. The worker receives only an observable packet and host-owned scope.
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
export const readAllowlist = Object.freeze(['restricted-worker.mjs', 'contracts.mjs', 'tools.mjs'].map(p => resolve(root, p)));
export function restricted(input) {
  const result = spawnSync(process.execPath, ['--experimental-permission', ...readAllowlist.map(p => `--allow-fs-read=${p}`), resolve(root, 'restricted-worker.mjs')],
    { cwd: root, input: JSON.stringify(input), encoding: 'utf8', timeout: 15_000, maxBuffer: 2_000_000,
      env: { SystemRoot: process.env.SystemRoot ?? '', WINDIR: process.env.WINDIR ?? '' } });
  if (result.status !== 0) throw new Error(`Restricted Data worker failed: ${result.error?.message ?? result.stderr}`);
  return JSON.parse(result.stdout);
}
