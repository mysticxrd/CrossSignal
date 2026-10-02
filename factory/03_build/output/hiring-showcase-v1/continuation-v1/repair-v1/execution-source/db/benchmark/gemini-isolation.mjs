import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

const root = fileURLToPath(new URL('../..', import.meta.url));
export const geminiReadAllowlist = Object.freeze([
  'db/benchmark/gemini-worker.mjs', 'db/benchmark/gemini-context.mjs', 'db/benchmark/gemini-inspect.mjs',
  'db/benchmark/gemini.mjs', 'db/benchmark/gemini-config.mjs', 'db/benchmark/contracts.mjs',
  'db/benchmark/tools.mjs', 'db/benchmark/exposure.mjs', 'db/benchmark/schemas.mjs', 'db/benchmark/task.md',
].map(p => resolve(root, p)));

export function isolatedGemini(command, { deadline = performance.now() + 15000 } = {}) {
  return new Promise((accept, reject) => {
    const remaining = Math.min(15000, deadline - performance.now());
    if (remaining <= 0) return reject(new Error('investigation_timeout'));
    const child = spawn(process.execPath, ['--permission', ...geminiReadAllowlist.map(p => `--allow-fs-read=${p}`),
      resolve(root, 'db/benchmark/gemini-worker.mjs')], { cwd: root, windowsHide: true,
      env: { SystemRoot: process.env.SystemRoot ?? '', WINDIR: process.env.WINDIR ?? '' }, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      if (error) { child.kill(); reject(error); } else accept(value);
    };
    const timer = setTimeout(() => finish(new Error('isolated_worker_timeout')), remaining);
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', value => {
      out += value;
      if (Buffer.byteLength(out) > 2_000_000) finish(new Error('worker_output_limit'));
    });
    child.stderr.resume();
    child.stdin.on('error', () => finish(new Error('isolated_worker_failure')));
    child.on('error', () => finish(new Error('isolated_worker_failure')));
    child.on('close', code => {
      if (code !== 0) return finish(new Error('isolated_worker_failure'));
      try {
        const packet = JSON.parse(out);
        if (!packet.ok) throw new Error();
        finish(null, packet.result);
      } catch { finish(new Error('isolated_validation_failed')); }
    });
    child.stdin.end(JSON.stringify(command));
  });
}
