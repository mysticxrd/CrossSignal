import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { once } from 'node:events';
import { request } from 'node:http';
import { CaseStore } from '../db/cases/store.mjs';
import { Cases } from '../db/cases/service.mjs';
import { ModelJobs } from '../db/cases/model-jobs.mjs';
import { caseServer } from '../db/cases/http.mjs';
import { lockHost } from '../db/cases/host-lock.mjs';
import { fixtureFinding } from './helpers/saas-fixture.mjs';

test('local API rejects foreign origins, missing tokens, forged identity and unbound approval; GET has no side effects', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'case-http-')), store = new CaseStore(join(directory, 'cases.sqlite'));
  const cases = new Cases(store, { recordings: directory, source: 'fixture_surrogate' });
  const jobs = new ModelJobs(cases, { transportFactory: () => { throw new Error('not_needed'); } });
  const logged = [], server = caseServer({ cases, jobs, staticDirectory: resolve('dist/case-lab'), errorLog: line => logged.push(line) });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { server.close(); await once(server, 'close'); store.close(); rmSync(directory, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const session = await (await fetch(`${base}/api/session`)).json();
  const post = (path, body, extra = {}) => fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Case-Token': session.token, ...extra }, body: JSON.stringify(body) });
  assert.equal((await post('/api/cases', { key: 'creation-http', scenario: 'incident' }, { Origin: 'https://evil.example' })).status, 409);
  assert.equal((await post('/api/cases', { key: 'creation-http', scenario: 'incident' }, { 'X-Case-Token': '' })).status, 409);
  assert.equal((await post('/api/cases', { key: 'creation-http', scenario: 'incident', actorId: 'attacker' })).status, 409);
  const { id } = await (await post('/api/cases', { key: 'creation-http', scenario: 'incident' })).json();
  assert(id); const original = JSON.stringify(store.get(id));
  await fetch(`${base}/api/cases/${id}`); await fetch(`${base}/api/cases/${id}`); assert.equal(JSON.stringify(store.get(id)), original);
  const attempt = cases.requestInvestigation(id, 0); cases.attachResult(attempt, { terminalStatus: 'completed', finding: fixtureFinding(store.get(id).snapshot) });
  const hash = store.get(id).proposal.hash;
  assert.equal((await post(`/api/cases/${id}/approve`, { proposalHash: hash, actorId: 'forged' })).status, 409);
  assert.equal((await post(`/api/cases/${id}/approve`, { proposalHash: 'wrong' })).status, 409);
  const accepted = await (await post(`/api/cases/${id}/approve`, { proposalHash: hash })).json();
  assert.equal(accepted.receipt.provenance, 'fixture_surrogate');
  await post(`/api/cases/${id}/approve`, { proposalHash: hash });
  assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM effects').get().n, 1);
  assert.equal((await fetch(`${base}/api/session`, { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 409);

  const hostStatus = await new Promise((accept, reject) => {
    const req = request(`${base}/api/session`, { headers: { Host: 'attacker.example' } }, res => { res.resume(); accept(res.statusCode); });
    req.on('error', reject); req.end();
  });
  assert.equal(hostStatus, 409);
  assert(!JSON.stringify(accepted).includes('scenario'));
  const failures = logged.length, favicon = await fetch(`${base}/favicon.ico`);
  assert.equal(favicon.status, 404); assert.deepEqual(await favicon.json(), { error: 'asset_not_found' }); assert.equal(logged.length, failures);
});

test('exclusive local host ownership prevents recovery of a live process', t => {
  const directory = mkdtempSync(join(tmpdir(), 'case-lock-')), path = join(directory, 'host.lock');
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const release = lockHost(path); assert.throws(() => lockHost(path), /already_running/); release();
  const again = lockHost(path); again();
});
