import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyGeminiPreflight } from './gemini-preflight.mjs';

export { verifyGeminiPreflight as verifyPreflight } from './gemini-preflight.mjs';

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  verifyGeminiPreflight().then(result => {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    // Offline preparation cannot establish full Build acceptance or authorize scoring.
    if (!process.argv.includes('--preflight')) process.exitCode = 2;
  }).catch(error => { process.stderr.write(`${error.stack}\n`); process.exitCode = 1; });
}
