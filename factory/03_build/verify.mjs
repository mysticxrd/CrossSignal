import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyRunner } from './runner-checks.mjs';

export { verifyRunner as verifyPreflight } from './runner-checks.mjs';

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  verifyRunner().then(result => {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    // Offline preparation cannot establish full Build acceptance or authorize scoring.
    if (!process.argv.includes('--preflight')) process.exitCode = 2;
  }).catch(error => { process.stderr.write(`${error.stack}\n`); process.exitCode = 1; });
}
