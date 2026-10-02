import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DIRECTORY, rawHash } from './preservation.mjs';
import { reloadReview, renderReview } from './review.mjs';
import { inspectSavedSession } from '../../inspection.mjs';
import { digest } from '../../../../../../db/benchmark/contracts.mjs';

test('new rejected dispatch reloads unchanged with unknown usage and all 15 statuses',async()=>{
  const first=await reloadReview(),second=await reloadReview();
  assert.equal(digest(first),digest(second));assert.equal(first.savedRecords,1);
  assert.equal(first.notRunRecords,14);assert.equal(first.validModelFindings,0);
  assert.equal(first.records[0].terminalStatus,'indeterminate_usage');
  assert.equal(first.records[0].usage.totalGeneratedTokens,null);
  assert.equal(first.records[0].usage.knownGeneratedTokens,0);
  assert.equal(first.transport.generationCalls,1);assert.equal(first.transport.countCalls,22);
  assert.equal(first.blocker.lastFailure.diagnostic.fields.length,0);
  assert.equal(first.furtherModelRequests,'BLOCKED');assert.equal(first.stage03Accepted,false);
  assert.equal(first.records[0].databaseSha256,'ac724d8014db1b45226695271eeca844795d8234c3a61fe688869ba8027f3524');
});
test('older retained databases remain separate and unchanged after read-only inspection',async()=>{
  const older=await inspectSavedSession();assert.equal(older.records.length,2);
  assert.deepEqual(older.records.map(r=>r.databaseSha256),[
    '95c998a4f3bc499768d3dd402a54cdba0f0753f31c1fface57587334de827ad8',
    '462c4e344e1d4652e9bc13c421309ae074abeff9614050e026004e374f3e5c43']);
});
test('viewer escapes synthetic strings and has no active script or external asset',async()=>{
  const snapshot=await reloadReview();snapshot.records[0].runId='<script>alert(1)</script>';
  const html=renderReview(snapshot);
  assert(!html.includes('<script>'));assert(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert(!html.includes('src=')&&!html.includes('fetch(')&&!html.includes('https://'));
  assert(html.includes('default-src \'none\''));assert(html.includes('14 NOT_RUN'));
  const source=await readFile(resolve(DIRECTORY,'review.mjs'),'utf8');
  assert(!/from ['"].*(?:transport|run\.mjs|evaluator|gemini-store)/.test(source));
  assert.match(await rawHash(resolve(DIRECTORY,'EXECUTION_CLAIM.json')),/^[a-f0-9]{64}$/);
});
