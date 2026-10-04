import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import { digest } from '../db/benchmark/contracts.mjs';
import { findingSchema } from '../db/benchmark/schemas.mjs';
import { GEMINI, callGemini } from '../db/benchmark/gemini-config.mjs';
import { inspectResponse, prepareSingleShot, sanitizeUsage, wireSchema } from '../db/benchmark/gemini.mjs';

const source = new URL('../factory/02_data/benchmark/', import.meta.url);
const publicCases = readdirSync(new URL('observable/', source)).sort().map(name =>
  JSON.parse(readFileSync(new URL(`observable/${name}`, source), 'utf8')));
const scopeFor = input => ({ workspaceId: input.events[0].workspaceId, caseId: input.caseRef,
  runId: input.events[0].runId, actorId: 'a_123456789abc', start: '2026-09-01T09:00:00.000Z', clock: input.asOf });
function finding() {
  return { version: 'benchmark-finding-v1', terminalStatus: 'completed', signalSummary: 'SIMULATED contract fixture; not a model result.',
    hypotheses: [{ rank: 1, diagnosis: 'Intentionally ungraded answer', supportIds: ['unknown_id'], contradictionIds: [], summary: 'Retained for future grading.' }],
    affectedSegment: null, relatedChangeId: null, unresolvedAlternatives: [],
    recommendation: { kind: 'simulated_rollback', target: 'checkout', summary: 'Recommendation has no execution capability.',
      boundary: 'recommendation_only', risk: 'consequential', approvalRequired: false },
    claims: [{ text: 'Deliberately unsupported fixture claim.', predicate: null, target: null, evidenceIds: ['unknown_id'] }] };
}
function response(answer = finding()) {
  return { modelVersion: GEMINI.model,
    candidates: [{ finishReason: 'STOP', content: { role: 'model', parts: [{ text: JSON.stringify(answer) }] } }],
    usageMetadata: { promptTokenCount: 1300, candidatesTokenCount: 200, thoughtsTokenCount: 40,
      totalTokenCount: 1540, cachedContentTokenCount: 0, toolUsePromptTokenCount: 0 } };
}

test('public contracts are byte-identical durable copies of accepted Data', () => {
  for (const name of ['contracts.mjs', 'schemas.mjs', 'exposure.mjs']) {
    assert.deepEqual(readFileSync(new URL(`../db/benchmark/${name}`, import.meta.url)), readFileSync(new URL(name, source)));
  }
});
test('the task is the accepted Data task plus only the step-5 check-before-you-blame paragraph', () => {
  const frozen = readFileSync(new URL('task.md', source), 'utf8'), task = readFileSync(new URL('../db/benchmark/task.md', import.meta.url), 'utf8');
  assert(task.startsWith(frozen));
  const added = task.slice(frozen.length).trim();
  assert.match(added, /^Check before you blame: before naming a deployment or configuration change as the cause, confirm in cited observations that the changed service shows failures after the change went out\./);
  assert.match(added, /If no candidate cause fits the observations, or the observations needed to check are missing, abstain/);
  assert.doesNotMatch(added, /\bB\d\d\b|\bv\d+\b|IN\/|GB\//);
});
test('all five single-shot requests expose only validated synthetic observations and fixed capabilities', () => {
  assert.equal(publicCases.length, 5);
  for (const input of publicCases) {
    const prepared = prepareSingleShot(input, scopeFor(input));
    assert.equal(prepared.endpoint, GEMINI.endpoint);
    assert.equal(prepared.body.generationConfig.responseFormat.text.mimeType, 'APPLICATION_JSON');
    assert.equal(prepared.body.generationConfig.maxOutputTokens, 1024);
    assert.equal(prepared.body.generationConfig.thinkingConfig.includeThoughts, false);
    assert.equal(prepared.body.tools, undefined);
    assert.equal(prepared.body.cachedContent, undefined);
    assert.equal(prepared.body.generationConfig.seed, undefined);
    assert.equal(prepared.context.dispatchPermitted, false);
    assert.equal(prepared.context.actualProviderTokens, null);
    assert.equal(prepared.requestSha256, digest(prepared.body));
    assert.deepEqual(prepared.exposedEvidenceIds, input.events.map(e => e.id));
    assert.doesNotMatch(JSON.stringify(prepared.body), /EVALUATOR_ONLY_|privateCanary|hiddenCause|rootCause|expectedDiagnosis|B0[1-5]/);
    assert.equal(prepared.body.contents.length, 1);
  }
});
test('foreign identities, changed hashes, extra envelope fields and post-cutoff rows never form a request', () => {
  const input = publicCases[0], scope = scopeFor(input);
  assert.throws(() => prepareSingleShot(input, { ...scope, workspaceId: 'w_123456789abc' }), /scope/);
  assert.throws(() => prepareSingleShot({ ...input, privateCause: 'secret' }, scope), /unknown\/missing/);
  const corrupted = structuredClone(input); corrupted.events[0].payload.attempts++;
  assert.throws(() => prepareSingleShot(corrupted, scope));
  const future = structuredClone(input); future.events[0].at = '2026-09-01T10:15:00.000Z';
  assert.throws(() => prepareSingleShot(future, scope), /cutoff/);
});
test('unsupported wire keywords are explicit; frozen host constraints remain strict', () => {
  const original = JSON.stringify(findingSchema), changes = [], schema = wireSchema(findingSchema, '$', changes);
  assert.equal(JSON.stringify(findingSchema), original);
  assert.equal(schema.properties.version.type, 'string');
  assert.deepEqual(schema.properties.version.enum, ['benchmark-finding-v1']);
  for (const keyword of ['maxLength', 'maxItems'])
    assert(changes.some(c => c.keyword === keyword && c.disposition === 'host_only'));
  assert.doesNotMatch(JSON.stringify(schema), /"maxLength"|"maxItems"|"const"/);
  // The model still sees every limit the host enforces.
  assert.equal(schema.properties.hypotheses.description, 'At most 3 items.');
  assert.equal(schema.properties.hypotheses.items.properties.diagnosis.description, 'At most 120 characters.');
  const tooLong = finding(); tooLong.signalSummary = 'x'.repeat(401);
  assert.equal(inspectResponse(response(tooLong)).reason, 'invalid_finding_json_or_schema');
  const tooMany = finding(); tooMany.unresolvedAlternatives = ['a', 'b', 'c', 'd'];
  assert.equal(inspectResponse(response(tooMany)).reason, 'invalid_finding_json_or_schema');
  const wrongConst = finding(); wrongConst.recommendation.boundary = 'execute_now';
  assert.equal(inspectResponse(response(wrongConst)).terminalStatus, 'invalid_output');
});
test('valid visible findings retain wrong citations and unsafe recommendations for independent grading', () => {
  const answer = finding(), parsed = inspectResponse(response(answer));
  assert.equal(parsed.status, 'parsed'); assert.deepEqual(parsed.finding, answer);
  assert.equal(parsed.finding.recommendation.approvalRequired, false);
  assert.equal(parsed.usage.generatedTokens, 240);
  assert.equal(parsed.usage.chargeUsd, null);
});
test('malformed, repaired-looking, unknown-field and truncated output fails without a repair turn', () => {
  for (const text of ['{', `\x60\x60\x60json\n${JSON.stringify(finding())}\n\x60\x60\x60`, JSON.stringify({ ...finding(), execute: true })]) {
    const raw = response(); raw.candidates[0].content.parts[0].text = text;
    const parsed = inspectResponse(raw);
    assert.equal(parsed.terminalStatus, 'invalid_output'); assert.equal(parsed.visibleText, text);
  }
  const truncated = response(); truncated.candidates[0].finishReason = 'MAX_TOKENS';
  assert.equal(inspectResponse(truncated).reason, 'incomplete_provider_output');
});
test('hidden thoughts, signatures, auth-like metadata and provider errors are never returned', () => {
  const raw = response();
  raw.candidates[0].content.parts.unshift({ text: 'HIDDEN_THOUGHT_SENTINEL', thought: true, thoughtSignature: 'SIGNATURE_SENTINEL' });
  raw.candidates[0].content.parts[1].thoughtSignature = 'SIGNATURE_SENTINEL';
  raw.authorization = 'AUTH_SENTINEL'; raw.responseId = 'AUTH_SENTINEL';
  const result = inspectResponse(raw); assert.equal(result.status, 'parsed');
  assert.doesNotMatch(JSON.stringify(result), /HIDDEN_THOUGHT_SENTINEL|SIGNATURE_SENTINEL|AUTH_SENTINEL/);
  assert.equal(result.usage.counts.thoughtsTokenCount, 40);
  assert.doesNotMatch(JSON.stringify(inspectResponse({ error: { message: 'AUTH_SENTINEL' } }, 429)), /AUTH_SENTINEL/);
});
test('provider-native functions, remote files, images and extra candidates fail closed', () => {
  for (const part of [{ functionCall: { name: 'execute' } }, { fileData: { fileUri: 'file:///private' } }, { inlineData: { data: 'secret' } }]) {
    const raw = response(); raw.candidates[0].content.parts.push(part);
    assert.equal(inspectResponse(raw).reason, 'unsupported_response_part');
  }
  const two = response(); two.candidates.push(structuredClone(two.candidates[0]));
  assert.equal(inspectResponse(two).reason, 'candidate_count_mismatch');
});
test('missing usage is unknown rather than zero; inconsistent and excessive counts terminate', () => {
  const raw = response(); delete raw.usageMetadata.thoughtsTokenCount;
  const missing = inspectResponse(raw); assert.equal(missing.reason, 'usage_unavailable');
  assert.equal(missing.usage.counts.thoughtsTokenCount, null);
  // An omitted zero is accepted only when the total proves it: 1300 prompt + 200 output = 1500.
  raw.usageMetadata.totalTokenCount = 1500;
  const zero = inspectResponse(raw); assert.equal(zero.status, 'parsed');
  assert.equal(zero.usage.counts.thoughtsTokenCount, 0); assert.equal(zero.usage.generatedTokens, 200);
  assert.equal(zero.usage.inferred.thoughtsTokenCount, 'omitted_zero_proven_by_total');
  const over = response(); over.usageMetadata.thoughtsTokenCount = 825;
  assert.equal(inspectResponse(over).terminalStatus, 'budget_exhausted');
  const inconsistent = response(); inconsistent.usageMetadata.totalTokenCount = 1;
  assert.equal(inspectResponse(inconsistent).reason, 'inconsistent_usage');
  const largeContext = response(); largeContext.usageMetadata.promptTokenCount = 7169;
  largeContext.usageMetadata.totalTokenCount = 7409;
  assert.equal(inspectResponse(largeContext).terminalStatus, 'context_overflow');
  assert.equal(sanitizeUsage({ promptTokenCount: -1 }).unavailable.promptTokenCount, 'invalid_count');
});
test('no caller flag, stage acceptance, free-tier assertion or network injection enables a model call', async () => {
  let inspected = 0, dispatched = 0;
  for (const options of [{}, { approved: true, apiKey: 'fixture-only' },
    { gate: 'accepted', modelCallsAuthorized: true, freeAccountVerified: true, budgetUsd: 100 }]) {
    await assert.rejects(callGemini({ ...options, keySource: () => { inspected++; }, fetch: () => { dispatched++; } }), /model_calls_not_authorized/);
  }
  assert.equal(inspected, 0); assert.equal(dispatched, 0);
  assert.equal(GEMINI.modelCallsAuthorized, false); assert.equal(GEMINI.paidSpendCapUsd, 0);
});
