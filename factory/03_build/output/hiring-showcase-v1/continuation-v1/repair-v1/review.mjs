import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, inspectRecord, escapeHtml } from '../../inspection.mjs';
import { DIRECTORY, json, rawHash } from './preservation.mjs';
import { digest } from '../../../../../../db/benchmark/contracts.mjs';

// Read-only projection. No transport, execution entrypoint, credential source,
// writable store constructor or evaluator is imported by this module.
export async function reloadReview() {
  const claim=await json(resolve(DIRECTORY,'EXECUTION_CLAIM.json'));
  assert.match(claim.sessionId,/^showcase-session-[a-f0-9]{16}$/);
  const directory=resolve(ROOT,'outputs/b01/gemini-runner-v1',claim.sessionId);
  assert.equal(resolve(claim.directory),directory);
  const proof=await json(resolve(DIRECTORY,'OFFLINE_PROOF.json'));
  assert.equal(await rawHash(resolve(DIRECTORY,'OFFLINE_PROOF.json')),claim.offlineProofRawSha256);
  for(const [path,hash] of Object.entries(proof.sourceHashes)) {
    assert.equal(await rawHash(resolve(ROOT,path)),hash,'Execution source changed');
    assert.equal(await rawHash(resolve(DIRECTORY,'execution-source',path)),hash,'Execution snapshot changed');
  }
  const manifest=await json(resolve(directory,'MANIFEST.json'));
  const summary=await json(resolve(directory,'SUMMARY.json'));
  const readiness=await json(resolve(directory,'PROVIDER_READINESS.json'));
  const plan=await json(resolve(DIRECTORY,'PLAN.json'));
  assert.equal(digest(manifest),claim.manifestSha256);
  assert.equal(summary.manifestSha256,claim.manifestSha256);
  assert.equal(manifest.offlineProofRawSha256,claim.offlineProofRawSha256);
  assert.deepEqual(manifest.sourceHashes,proof.sourceHashes);
  assert.deepEqual(manifest.schedule,plan.schedule);
  assert.deepEqual(manifest.configuration,plan.configuration);
  assert.equal(manifest.fixture,false);assert.equal(summary.mode,'FREE_TIER_BENCHMARK');
  assert.equal(summary.sessionId,claim.sessionId);assert.equal(summary.scheduledRecords,15);
  assert.equal(summary.completedRecords,summary.results.length);
  assert.equal(new Set(summary.results.map(r=>r.runId)).size,summary.results.length);
  assert.equal(summary.transport.automaticRetries,0);assert.equal(summary.runtimeEffects,0);
  assert.equal(summary.paidFallback,false);assert.equal(summary.stage03Accepted,false);
  assert.equal(summary.complete,false);assert.equal(summary.modelRevision,null);
  assert.equal(summary.readinessCompleted,true);assert.equal(readiness.tokenCounts.length,10);
  assert.equal(readiness.model.name,'models/gemini-3.5-flash-lite');
  for(const count of readiness.tokenCounts) {
    const row=manifest.schedule.find(r=>r.scope.runId===count.runId);assert(row);
    assert.equal(count.requestSha256,row.initialRequestSha256);
    assert(count.tokens.completeInputTokenBound+manifest.configuration.maxOutputTokens<=manifest.configuration.contextTokens);
  }
  const session=relative(ROOT,directory).replaceAll('\\','/'),records=[];
  for(const saved of summary.results) {
    const row=manifest.schedule.find(r=>r.scope.runId===saved.runId);assert(row);
    const record=await inspectRecord(manifest,row,directory);
    assert.equal(record.databaseSha256,saved.databaseSha256);
    assert.equal(record.timelineSha256,saved.timelineSha256);
    assert.equal(record.terminalStatus,saved.terminalStatus);
    record.provenance='accepted_hiring_showcase_15_record_schedule';
    record.databaseRelativePath=`${session}/${record.runId}/case.sqlite`;
    records.push(record);
  }
  const statuses=manifest.schedule.map(row=>({ordinal:row.ordinal,sourceFile:row.sourceFile,
    runId:row.scope.runId,method:row.method,replicateIndex:1,
    status:records.find(r=>r.runId===row.scope.runId)?.terminalStatus??'NOT_RUN'}));
  assert.deepEqual(summary.recordStatuses,statuses.map(({runId,method,status})=>({runId,method,status})));
  const artifactHashes={};
  for(const name of ['MANIFEST.json','PROVIDER_READINESS.json','BLOCKER.json','SUMMARY.json',
    ...summary.results.flatMap(r=>[`${r.runId}/case.sqlite`,`${r.runId}/RESULT.json`,`${r.runId}/CASE.md`])])
    artifactHashes[`${session}/${name}`]=await rawHash(resolve(directory,name));
  return {version:'b01-hiring-showcase-repair-review-v1',truthMode:'SIMULATED',
    evaluationStatus:'BLOCKED_PROVIDER_REJECTION',scopeAmendment:'accepted',preservationQualification:'accepted',
    model:manifest.model,session,manifestSha256:claim.manifestSha256,
    sourcesVerified:Object.keys(proof.sourceHashes).length,scheduledRecords:15,savedRecords:records.length,
    notRunRecords:statuses.filter(r=>r.status==='NOT_RUN').length,
    validModelFindings:records.filter(r=>r.method!=='rules'&&r.finding).length,
    largestInitialInputBound:Math.max(...readiness.tokenCounts.map(r=>r.tokens.completeInputTokenBound)),
    limits:manifest.configuration,transport:summary.transport,blocker:summary.blocker,
    providerRevision:null,generationUsage:null,chargeUsd:null,
    unavailableReason:'Rejected generation did not report revision, generation usage or charge',
    independentAdjudication:'NOT_RUN',furtherModelRequests:'BLOCKED',
    runtimeIntervention:'NOT_RUN',runtimeEffects:0,stage03Accepted:false,largerB01Complete:false,
    statuses,records,artifactHashes};
}

export function renderReview(snapshot) {
  const e=escapeHtml;
  const rows=snapshot.statuses.map(r=>`<tr><td>${r.ordinal}</td><td><code>${e(r.sourceFile)}</code></td><td>${e(r.method)}</td><td>${e(r.status)}</td></tr>`).join('');
  const cases=snapshot.records.map(r=>`<article><p class="label">SAVED CASE · SIMULATED</p><h2>${e(r.method)}: ${e(r.runId)}</h2><p><strong>${e(r.terminalStatus)}</strong> · ${e(r.failureReason)}</p><p>No Gemini finding returned. No diagnosis, citations, recommendation or epistemic abstention is inferred.</p><div class="metrics"><span>Received revenue before<br><strong>INR ${e((r.signal.pre.revenueMinor/100).toLocaleString('en-IN'))}</strong></span><span>Received revenue after<br><strong>INR ${e((r.signal.post.revenueMinor/100).toLocaleString('en-IN'))}</strong></span></div><p>Elapsed: ${Math.round(r.elapsedMs)} ms. Generated usage and provider revision: unknown. The zero ledger counter is not a measured server total.</p><details><summary>Inspect the ordered durable timeline</summary><ol>${r.history.map(h=>`<li>${e(h.kind)}<code>${e(h.hash)}</code></li>`).join('')}</ol></details><details><summary>Inspect permitted synthetic observations</summary><pre>${e(JSON.stringify(r.allowedEvidence,null,2))}</pre></details><p>Database SHA-256: <code>${e(r.databaseSha256)}</code><br>Timeline SHA-256: <code>${e(r.timelineSha256)}</code></p><p>Source, manifest, scoped evidence, terminal result and append-only chain pass read-only reload. Reload never generates or repeats an effect.</p></article>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>CrossSignal: Stage 03 saved failure review</title><style>:root{font-family:system-ui,sans-serif;color:#18323b;background:#f1f6f7}body{margin:0}main{max-width:1080px;margin:auto;padding:32px 20px}h1{font-size:clamp(2rem,5vw,3.5rem);line-height:1.1;max-width:780px}p{line-height:1.6}article,section{background:white;border:1px solid #ccdade;border-radius:12px;padding:24px;margin:24px 0}.blocked{border-left:5px solid #a76020}.label{font-size:.8rem;letter-spacing:.08em;font-weight:700;color:#4d6670}.metrics{display:flex;gap:32px;padding:16px 0}table{width:100%;border-collapse:collapse;text-align:left}th,td{padding:12px;border-bottom:1px solid #d9e3e6}code{overflow-wrap:anywhere;font-size:.8rem}li code{display:block}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:.8rem}details{padding:12px 0}a{color:#126078}.scroll{overflow:auto}@media(max-width:650px){main{padding:20px 12px}article,section{padding:18px}.metrics{flex-direction:column;gap:12px}}</style></head><body><main><p class="label">CROSSSIGNAL · ENGINEERING SHOWCASE · STAGE 03 REVIEW</p><h1>A failed request still leaves an inspectable Case.</h1><p>The approved workflow is synthetic revenue drop → permitted evidence → competing explanations and citations → recommendation or abstention → saved Case. Successful Gemini investigation is still blocked.</p><section class="blocked"><h2>HTTP 400: INVALID_ARGUMENT</h2><p>${snapshot.savedRecords} of ${snapshot.scheduledRecords} investigations saved; ${snapshot.notRunRecords} NOT_RUN; ${snapshot.validModelFindings} Gemini findings. Detailed field information was unavailable in the retained diagnostic. Further model requests are blocked. No retry or fallback occurred.</p><p>One metadata request, ${snapshot.transport.countCalls} token-count requests, ${snapshot.transport.generationCalls} scheduled generation dispatch. Largest measured initial input bound: ${snapshot.largestInitialInputBound}; reserving 1024 output fits 8192.</p></section>${cases}<section><h2>Approved 15-record schedule</h2><p>Five frozen cases × three methods × one fresh investigation. This table preserves failures and unrun work. Older evidence and offline fixture tests are separate.</p><div class="scroll"><table><thead><tr><th>Order</th><th>Case source</th><th>Method</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div></section><section><h2>Review evidence</h2><p><a href="README.md">Current README</a> · <a href="DEMO_WALKTHROUGH.md">Three-minute walkthrough</a> · <a href="EVALUATION_REPORT.md">Evaluation and failure report</a> · <a href="ARCHITECTURE.md">Architecture and interview code paths</a></p><p>Scope and preservation qualification accepted; Stage 03 Build pending. Larger B01 incomplete. No runtime intervention or business-recovery claim. This static viewer has no scripts, external assets, network actions or database writes.</p><p>Snapshot identity: <code>${e(digest(snapshot))}</code></p></section></main></body></html>\n`;
}

export async function prepareReview() {
  const snapshot=await reloadReview();
  await writeFile(resolve(DIRECTORY,'SAVED_INSPECTION.json'),JSON.stringify(snapshot,null,2)+'\n',{flag:'wx'});
  await writeFile(resolve(DIRECTORY,'index.html'),renderReview(snapshot),{flag:'wx'});
  return snapshot;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const operation=process.argv.length===3?process.argv[2]:null;
  if(!['--prepare','--reload'].includes(operation))process.exitCode=2;
  else (operation==='--prepare'?prepareReview():reloadReview()).then(snapshot=>{
    process.stdout.write(JSON.stringify({evaluationStatus:snapshot.evaluationStatus,savedRecords:snapshot.savedRecords,
      notRunRecords:snapshot.notRunRecords,validModelFindings:snapshot.validModelFindings,
      readOnly:true,modelRequests:0,databaseHashes:snapshot.records.map(r=>r.databaseSha256)})+'\n');
  }).catch(()=>{process.stderr.write('read_only_review_integrity_failed\n');process.exitCode=1;});
}
