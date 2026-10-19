// Manual browser acceptance harness. Offline answers and approvals are visibly labelled fixture_surrogate.
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { CaseStore } from '../../db/cases/store.mjs';
import { Cases } from '../../db/cases/service.mjs';
import { ModelJobs } from '../../db/cases/model-jobs.mjs';
import { caseServer } from '../../db/cases/http.mjs';
import { fixtureFinding, fixtureTransport } from './saas-fixture.mjs';
const directory = resolve('outputs/case-browser', String(Date.now())); mkdirSync(directory, { recursive: true });
const store = new CaseStore(resolve(directory, 'cases.sqlite')), cases = new Cases(store, { recordings: directory, source: 'fixture_surrogate', maxAttempts: 20 });
const jobs = new ModelJobs(cases, { transportFactory: () => {
  const active = store.db.prepare("SELECT case_id FROM attempts WHERE status='running'").get();
  return fixtureTransport(fixtureFinding(store.get(active.case_id).snapshot));
} });
const server = caseServer({ cases, jobs, staticDirectory: resolve('dist/case-lab') });
server.listen(4318, '127.0.0.1', () => console.log('Offline browser harness: http://127.0.0.1:4318'));
process.on('SIGINT', async () => { server.close(); if (jobs.active) await jobs.active; store.close(); });
