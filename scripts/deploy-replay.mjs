// Builds the public, replay-only Worker (see worker/public-replay.mjs) and deploys it to Cloudflare's free Workers
// plan as `crosssignal`. Run `npx wrangler login` once first. Nothing here calls a model or reads a key, and the
// Worker has no database. `--dry-run` builds and packages without uploading or logging in.
// Usage: node scripts/deploy-replay.mjs [--dry-run]
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dryRun = process.argv.includes('--dry-run');
const env = { ...process.env, CROSSSIGNAL_DEPLOY: 'public-replay' };

function run(command) {
  console.log(`> ${command}`);
  // Fixed commands only; a shell is needed to find npx/vinext shims on Windows.
  const { status } = spawnSync(command, { cwd: root, env, stdio: 'inherit', shell: true });
  if (status !== 0) process.exit(status ?? 1);
}

run('npx vinext build');
run(dryRun ? 'npx wrangler deploy --dry-run' : 'npx wrangler deploy');
