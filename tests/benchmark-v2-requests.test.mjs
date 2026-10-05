import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { CUTOFF, START } from '../db/benchmark/contracts.mjs';
import { answerQuery, prepareGemini, validateGeminiTurn } from '../db/benchmark/gemini-context.mjs';
import { inspectGeminiTurn } from '../db/benchmark/gemini-inspect.mjs';
import { rulesFinding } from '../db/benchmark/rules.mjs';
import { CASE_SETS, DEFAULT_SETS } from '../scripts/run-b01.mjs';

// The daily format (B16 on) shares the request code with the SIMULATED cases. This pins every request, tool answer,
// rule finding and turn inspection the 15 SIMULATED cases produce to the bytes they had before it was added, so the
// B01-B15 results keep their meaning. A change here is a change to every v2 result.
test('the SIMULATED cases produce exactly the requests, answers and inspections they always did', () => {
  const all = createHash('sha256'), requests = [];
  const raw = text => ({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }],
    usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, thoughtsTokenCount: 0, totalTokenCount: 15 }, modelVersion: 'gemini-3.5-flash-lite' });
  for (const directory of DEFAULT_SETS.map(set => CASE_SETS[set]))
    for (const file of readdirSync(directory).filter(name => name.endsWith('.json')).sort()) {
      const input = JSON.parse(readFileSync(`${directory}/${file}`, 'utf8'));
      const scope = { workspaceId: input.events[0].workspaceId, caseId: input.caseRef, runId: input.events[0].runId,
        actorId: 'a_000000000000', start: START, clock: CUTOFF };
      const queries = [
        { tool: 'revenue.inspect', arguments: { start: START, end: CUTOFF, limit: 50, cursor: null, segment: null } },
        { tool: 'engineering.inspect', arguments: { start: START, end: CUTOFF, limit: 5, cursor: null, service: 'checkout', kind: 'changes' } },
        { tool: 'support.search', arguments: { start: START, end: CUTOFF, limit: 5, cursor: null, segment: 'IN/debit', query: 'card' } },
        { tool: 'revenue.inspect', arguments: { start: CUTOFF, end: START, limit: 5, cursor: null, segment: null } },
        { tool: 'nope', arguments: {} },
      ];
      for (const profile of ['minimal', 'low'])
        for (const [method, asked] of [['single-shot-model', []], ['tool-using-model', []], ['tool-using-model', queries]]) {
          const request = prepareGemini(input, scope, { method, queries: asked, profile });
          requests.push(request.requestSha256);
          all.update(JSON.stringify(request.body)); all.update(JSON.stringify({ ...request, body: null }));
        }
      for (const query of queries) all.update(JSON.stringify(answerQuery(input, scope, query)));
      all.update(JSON.stringify(rulesFinding(input, scope)));
      const turn = { kind: 'query', query: queries[0], finding: null };
      all.update(JSON.stringify(validateGeminiTurn(turn)));
      const options = { method: 'tool-using-model', outputReservation: 1024 };
      all.update(JSON.stringify(inspectGeminiTurn(raw(JSON.stringify(turn)), options)));
      const foreign = { ...turn, query: { ...queries[0], arguments: { ...queries[0].arguments, segment: 'mobile' } } };
      all.update(JSON.stringify(inspectGeminiTurn(raw(JSON.stringify(foreign)), options)));
    }
  assert.equal(requests.length, 90);
  assert.equal(createHash('sha256').update(requests.join(',')).digest('hex'), '68ed7f016ce6e87bafc2fd3ed9e7e19cf88201a73b2b752b76d4c1672a0ed62c');
  assert.equal(all.digest('hex'), 'ede505ce13ad3b95be5a5e2c0b78203a5baa495e7bbcf0b6fc6d90ee341b5869');
});
