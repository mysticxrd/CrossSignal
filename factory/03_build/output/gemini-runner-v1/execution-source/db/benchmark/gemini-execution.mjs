import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createHttpTransport } from './gemini-http.mjs';
import { requireThat } from './contracts.mjs';
import { GEMINI } from './gemini-config.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
export const runnerPacket = resolve(root, 'factory/03_build/output/gemini-runner-v1');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// Only the trusted host reads credentials. No model/caller option can choose a
// model, paid tier, endpoint, alternate key, proof file or relaxed configuration.
export async function freeTierTransport(...options) {
  requireThat(options.length === 0, 'caller_options_not_authorized');
  const receipt = JSON.parse(await readFile(resolve(runnerPacket, 'OFFLINE_VERIFICATION_FINAL.json'), 'utf8'));
  requireThat(receipt.status === 'passed' && receipt.modelRequests === 0 && receipt.runtimeEffects === 0,
    'offline_verification_required');
  requireThat(receipt.coverage?.everyAcceptedLimit === true && receipt.coverage?.realRestrictedWorker === true
    && receipt.coverage?.durableRecovery === true && receipt.coverage?.abortableTransport === true,
  'incomplete_offline_coverage');
  for (const [name, hash] of Object.entries(receipt.sourceHashes))
    requireThat(sha(await readFile(resolve(root, name))) === hash, 'offline_verification_source_drift');
  const account = JSON.parse(await readFile(resolve(runnerPacket, 'ACCOUNT_ATTESTATION.json'), 'utf8'));
  requireThat(account.source === 'Direct owner message on 2026-10-02' && account.provider === 'gemini'
    && account.model === GEMINI.model && account.freeTier === true && account.billingDisabled === true
    && account.sufficientQuota === true && account.paidSpendCapUsd === 0 && account.paidFallback === false
    && account.standaloneSmokeTests === false && account.scope === 'benchmark requests only', 'free_tier_attestation_required');
  requireThat(typeof process.env.GEMINI_API_KEY === 'string' && process.env.GEMINI_API_KEY.trim().length > 0,
    'host_process_key_unavailable');
  return createHttpTransport({ mode: 'FREE_TIER_BENCHMARK', fetchImpl: globalThis.fetch,
    keySource: () => process.env.GEMINI_API_KEY,
    beforeRequest: async () => {
      for (const [name, hash] of Object.entries(receipt.sourceHashes))
        requireThat(sha(await readFile(resolve(root, name))) === hash, 'offline_verification_source_drift');
    } });
}
