import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { once } from 'node:events';
import { request } from 'node:http';
import { spawn } from 'node:child_process';
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

  // The two bytes of é arrive in separate body chunks.
  const { id: deferred } = await (await post('/api/cases', { key: 'utf8-http-case', scenario: 'normal' })).json();
  const bytes = Buffer.from(JSON.stringify({ revision: store.get(deferred).revision, command: 'defer', reason: 'Wait for café data' })), cut = bytes.indexOf(0xa9);
  const deferStatus = await new Promise((accept, reject) => {
    const req = request(`${base}/api/cases/${deferred}/command`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Case-Token': session.token } }, res => { res.resume(); accept(res.statusCode); });
    req.on('error', reject); req.write(bytes.subarray(0, cut)); setTimeout(() => req.end(bytes.subarray(cut)), 50);
  });
  assert.equal(deferStatus, 200); assert.match(JSON.stringify(store.view(deferred).history), /Wait for café data/);
});

test('a page served on port 80 sends Host and Origin without the port, and the local API accepts both', async t => {
  const store = new CaseStore(':memory:'), cases = new Cases(store, { recordings: '.', source: 'fixture_surrogate' });
  const jobs = new ModelJobs(cases, { transportFactory: () => { throw new Error('not_needed'); } });
  const server = caseServer({ cases, jobs, staticDirectory: resolve('dist/case-lab') });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { server.close(); await once(server, 'close'); store.close(); });
  // Binding port 80 needs privileges in CI, so the server reports port 80 while it listens on a free port.
  const { port } = server.address(); server.address = () => ({ address: '127.0.0.1', family: 'IPv4', port: 80 });
  const browser = { Host: '127.0.0.1', Origin: 'http://127.0.0.1', 'Sec-Fetch-Site': 'same-origin' };
  const send = (method, path, headers, body) => new Promise((accept, reject) => {
    const req = request(`http://127.0.0.1:${port}${path}`, { method, headers: { ...browser, ...headers } }, res => {
      let text = ''; res.setEncoding('utf8'); res.on('data', chunk => { text += chunk; }); res.on('end', () => accept({ status: res.statusCode, body: JSON.parse(text) }));
    });
    req.on('error', reject); req.end(body);
  });
  const session = await send('GET', '/api/session', {});
  assert.equal(session.status, 200, JSON.stringify(session.body));
  const created = await send('POST', '/api/cases', { 'Content-Type': 'application/json', 'X-Case-Token': session.body.token }, JSON.stringify({ key: 'port-80-case', scenario: 'incident' }));
  assert.equal(created.status, 201, JSON.stringify(created.body));
});

test('exclusive local host ownership prevents recovery of a live process', { timeout: 15000 }, async t => {
  const directory = mkdtempSync(join(tmpdir(), 'case-lock-')), path = join(directory, 'host-lock.sqlite');
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const release = lockHost(path); assert.throws(() => lockHost(path), /already_running/); release();
  // Another process holds the lock until it dies, and being killed without cleanup leaves nothing stale behind.
  const child = spawn(process.execPath, ['--no-warnings', '--input-type=module', '-e',
    `import { lockHost } from ${JSON.stringify(import.meta.resolve('../db/cases/host-lock.mjs'))}; lockHost(${JSON.stringify(path)}); console.log('locked'); setInterval(() => {}, 1000);`]);
  t.after(() => child.kill());
  await once(child.stdout, 'data'); assert.throws(() => lockHost(path), /already_running/);
  child.kill(); await once(child, 'exit');
  const again = lockHost(path); again();
});
