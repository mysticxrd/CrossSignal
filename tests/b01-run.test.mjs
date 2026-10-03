import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GEMINI } from '../db/benchmark/gemini-config.mjs';
import { createHttpTransport } from '../db/benchmark/gemini-http.mjs';
import { createBatch, dailyQuota, latestBatch, runBatch } from '../scripts/run-b01.mjs';

const abstain = { version: 'benchmark-finding-v1', terminalStatus: 'epistemic_abstention', signalSummary: 'OFFLINE_FIXTURE: ungraded test answer.',
  hypotheses: [], affectedSegment: null, relatedChangeId: null, unresolvedAlternatives: [],
  recommendation: { kind: 'abstain', target: null, summary: 'Fixture only, no effect.', boundary: 'recommendation_only', risk: 'none',
    approvalRequired: false }, claims: [] };
const dailyQuotaBody = JSON.stringify({ error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'Quota exceeded.', details: [
  { '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }] },
  { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '0s' }] } });

// Offline stand-in for Gemini: every model abstains until `quotaAfter` generate calls have used up the day.
function fixtureGemini({ quotaAfter = Infinity } = {}) {
  let generations = 0;
  return () => createHttpTransport({ mode: 'OFFLINE_FIXTURE', keySource: () => 'OFFLINE_SECRET_KEY_CANARY_ONLY', log: () => {},
    fetchImpl: async (url, options) => {
      if (url.endsWith(':countTokens')) return new Response(JSON.stringify({ totalTokens: 1000 }));
      if (++generations > quotaAfter) return new Response(dailyQuotaBody, { status: 429 });
      const toolTurn = 'query' in (JSON.parse(options.body).generationConfig.responseFormat.text.schema.properties ?? {});
      const text = JSON.stringify(toolTurn ? { kind: 'finding', query: null, finding: abstain } : abstain);
      return new Response(JSON.stringify({ modelVersion: GEMINI.model, candidates: [{ finishReason: 'STOP', content: { parts: [{ text }] } }],
        usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 100, thoughtsTokenCount: 0, totalTokenCount: 1100 } }));
    } });
}
const attempts = (directory, slot) => readdirSync(join(directory, 'runs', slot)).sort()
  .map(name => JSON.parse(readFileSync(join(directory, 'runs', slot, name, 'RESULT.json'), 'utf8')));

test('a daily-quota stop keeps that attempt unscored and the rerun resumes without repeating saved runs', async () => {
  const parent = mkdtempSync(join(tmpdir(), 'crosssignal-b01-run-'));
  const directory = await createBatch({ parent, commit: 'fixture-commit', date: '2026-10-03' });
  assert.equal(latestBatch(parent), directory);
  const { slots, cases } = JSON.parse(readFileSync(join(directory, 'BATCH.json'), 'utf8'));
  assert.equal(slots.length, 15);
  const rows = JSON.parse(readFileSync(cases[0].file, 'utf8')).events.map(e => e.id);
  const quiet = { directory, commit: 'fixture-commit', log: () => {} };

  const stopped = await runBatch({ ...quiet, transportFactory: fixtureGemini({ quotaAfter: 1 }) });
  assert.equal(stopped.complete, false);
  assert.equal(stopped.stopped.slot, slots[2]);
  assert.equal(dailyQuota(stopped.stopped), 'GenerateRequestsPerDayPerProjectPerModel-FreeTier');
  const before = slots.slice(0, 2).map(slot => attempts(directory, slot));
  assert.deepEqual(before.map(list => list.map(r => r.saved)), [[true], [true]]);
  // Rules and the single-shot model see every row; the tool-using model sees only rows its tools return.
  assert.deepEqual(before.map(([saved]) => saved.metrics.exposedEvidenceIds), [rows, rows]);
  assert.deepEqual(attempts(directory, slots[2]).map(r => r.saved), [false]);

  const resumed = await runBatch({ ...quiet, transportFactory: fixtureGemini() });
  assert.equal(resumed.complete, true);
  for (const slot of slots) assert.equal(attempts(directory, slot).filter(r => r.saved).length, 1);
  assert.deepEqual(slots.slice(0, 2).map(slot => attempts(directory, slot)), before);
  assert.deepEqual(attempts(directory, slots[2]).map(r => r.saved), [false, true]);
  const tool = attempts(directory, slots[2])[1];
  assert.deepEqual(tool.metrics.tokens, { input: 1000, output: 100, total: 1100 });
  assert.equal(tool.metrics.requests.total, 3);
  assert.deepEqual(tool.metrics.exposedEvidenceIds, []);

  await assert.rejects(runBatch({ ...quiet, commit: 'other-commit', transportFactory: fixtureGemini() }), /batch_commit_mismatch/);
  assert.equal(await createBatch({ parent, commit: 'fixture-commit', date: '2026-10-03' }), join(parent, '2026-10-03-2'));
});
