import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { randomBytes, createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { bindRun, START, CUTOFF, digest, signal, validateObservable, publicRow } from '../../../../db/benchmark/contracts.mjs';
import { prepareGemini } from '../../../../db/benchmark/gemini-context.mjs';
import { validateFinding } from '../../../../db/benchmark/schemas.mjs';
import { GEMINI } from '../../../../db/benchmark/gemini-config.mjs';

export const ROOT=fileURLToPath(new URL('../../../../',import.meta.url));
export const SESSION='outputs/b01/gemini-runner-v1/session-a629b14640c9c81c';
const json=async path=>JSON.parse(await readFile(path,'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const id=prefix=>`${prefix}_${randomBytes(6).toString('hex')}`;
const METHODS=['rules','single-shot-model','tool-using-model'];
export const escapeHtml=value=>String(value??'Unavailable').replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');

// Draft identities/request hashes only: never calls a method, transport or credential source.
export async function draftPlan() {
  const directory=resolve(ROOT,'factory/02_data/benchmark/observable');
  const names=(await readdir(directory)).sort();
  assert.equal(names.length,5);
  const records=[];
  for(const name of names) {
    assert.match(name,/^c_[a-f0-9]{12}\.json$/);
    const original=await json(resolve(directory,name));
    const sourceScope={workspaceId:original.events[0].workspaceId,caseId:original.caseRef,
      runId:original.events[0].runId,actorId:id('a'),start:START,clock:CUTOFF};
    validateObservable(original,sourceScope);
    for(const method of METHODS) {
      const scope={workspaceId:id('w'),caseId:id('c'),runId:id('r'),actorId:id('a'),start:START,clock:CUTOFF};
      const observable=bindRun(original,sourceScope,scope);
      const prepared=method==='rules'?null:prepareGemini(observable,scope,{method});
      records.push({sourceFile:name,sourceCaseId:original.caseRef,sourceSha256:digest(original),method,
        replicateIndex:1,scope,observableSha256:digest(observable),
        initialRequestSha256:prepared?.requestSha256??null,initialRequestBytes:prepared?.context.requestBytes??null,
        initialWireOutputCap:prepared?.body.generationConfig.maxOutputTokens??null,executionStatus:'NOT_RUN'});
    }
  }
  const modelCases=5,maximumGenerationDispatches=modelCases+modelCases*GEMINI.modelTurns;
  return {version:'b01-hiring-showcase-draft-plan-v1',status:'proposal_only',executionPermitted:false,
    originalAcceptedSchedule:{initialRecords:35,changedRecords:15,totalRecords:50},
    proposedSchedule:{cases:5,methods:METHODS,replicatesPerMethod:1,records:15},
    deferred:{initialRepeatedRecords:20,changedExperimentRecords:15,runtimeIntervention:'NOT_RUN'},
    model:GEMINI.model,profile:'original-accepted-b01-token-limits',configuration:GEMINI,
    ceilings:{maximumGenerationDispatches,maximumToolAttempts:50,
      maximumGeneratedTokensIncludingReasoning:modelCases*GEMINI.maxOutputTokens+modelCases*GEMINI.generatedTokens,
      maximumTokenCountRequests:20+2*maximumGenerationDispatches,maximumMetadataRequests:1,
      explanation:'Conservative bounds using the existing runner counting policy; 15 records are not 15 HTTP requests. This plan authorizes none.'},
    requiredBeforeExecution:['exact_amendment_accepted','fresh_source_and_account_verification',
      'generation_compatibility_resolved','every_original_limit_and_isolation_verified','new_immutable_manifest_and_stores'],
    freshContexts:true,priorArtifactsCredited:0,records};
}

// Reads an existing terminal Case. Avoid GeminiStore's writable constructor/PRAGMAs.
export async function inspectRecord(manifest,row,sessionDirectory) {
  assert.match(row.scope.runId,/^r_[a-f0-9]{12}$/);
  assert.match(row.sourceFile,/^c_[a-f0-9]{12}\.json$/);
  assert(METHODS.includes(row.method));
  const path=resolve(sessionDirectory,row.scope.runId,'case.sqlite');
  const before=sha(await readFile(path));
  const db=new DatabaseSync(path,{readOnly:true});
  let result;
  try {
    const runs=db.prepare('SELECT * FROM benchmark_runs').all();assert.equal(runs.length,1);
    const metadata=JSON.parse(runs[0].metadata);assert.equal(digest(metadata),runs[0].hash);
    assert.deepEqual(metadata.scope,row.scope);assert.equal(metadata.manifestHash,digest(manifest));
    assert.deepEqual(metadata.sourceHashes,manifest.sourceHashes);
    const original=await json(resolve(ROOT,'factory/02_data/benchmark/observable',row.sourceFile));
    assert.equal(digest(original),row.sourceHash);
    const sourceScope={...row.scope,workspaceId:original.events[0].workspaceId,caseId:original.caseRef,runId:original.events[0].runId};
    const expected=bindRun(original,sourceScope,row.scope);assert.equal(digest(expected),row.observableSha256);
    const rows=db.prepare('SELECT * FROM benchmark_evidence ORDER BY evidence_id').all();
    for(const r of rows) assert(r.workspace===row.scope.workspaceId&&r.case_id===row.scope.caseId&&r.run_id===row.scope.runId);
    const evidence=rows.map(r=>JSON.parse(r.payload));
    assert.deepEqual(evidence,[...expected.events].sort((a,b)=>a.id.localeCompare(b.id)));
    const history=db.prepare('SELECT * FROM benchmark_timeline ORDER BY sequence').all();
    let previous='0'.repeat(64),sequence=0;
    for(const entry of history) {
      assert.equal(entry.sequence,++sequence);assert.equal(entry.previous_hash,previous);
      assert(entry.workspace===row.scope.workspaceId&&entry.case_id===row.scope.caseId&&entry.run_id===row.scope.runId);
      assert.equal(digest({scope:row.scope,sequence:entry.sequence,kind:entry.kind,
        payload:JSON.parse(entry.payload),previousHash:previous}),entry.hash);previous=entry.hash;
    }
    assert.equal(history.at(-1)?.kind,'terminal');
    const terminal=JSON.parse(history.at(-1).payload);
    assert.deepEqual(terminal,await json(resolve(sessionDirectory,row.scope.runId,'RESULT.json')));
    assert.equal(terminal.runtimeEffects,0);
    if(terminal.finding)validateFinding(terminal.finding);
    const finding=terminal.finding??null;
    const ids=new Set(evidence.map(e=>e.id));
    const citationIds=finding?[...new Set([...finding.hypotheses.flatMap(h=>[...h.supportIds,...h.contradictionIds]),
      ...finding.claims.flatMap(c=>c.evidenceIds)])]:[];
    result={runId:row.scope.runId,sourceCaseId:original.caseRef,method:row.method,replicateIndex:row.replicateIndex,
      truthMode:'SIMULATED',provenance:'retained_original_35_record_schedule',terminalStatus:terminal.terminalStatus??finding.terminalStatus,
      failureReason:terminal.failureReason??null,finding,signal:signal(expected,row.scope),
      allowedEvidence:evidence.map(publicRow),citations:{referencedIds:citationIds,unknownIds:citationIds.filter(v=>!ids.has(v)),
        semanticSupport:'NOT_ADJUDICATED'},
      elapsedMs:terminal.elapsedMs??null,elapsedUnavailableReason:terminal.elapsedMs===undefined?'not_recorded_for_rules':null,
      usage:{knownGeneratedTokens:terminal.budget?.cumulativeGeneratedTokens??0,
        totalGeneratedTokens:row.method==='rules'?0:terminal.budget.records.every(r=>r.generatedTokens!==null&&r.status!=='indeterminate_usage')
          ?terminal.budget.cumulativeGeneratedTokens:null,
        unavailableReason:row.method==='rules'?null:terminal.budget.records.some(r=>r.generatedTokens===null)?'post_dispatch_usage_unavailable':null},
      history:history.map(e=>({sequence:e.sequence,kind:e.kind,hash:e.hash})),
      databaseRelativePath:`${SESSION}/${row.scope.runId}/case.sqlite`,databaseSha256:before,timelineSha256:previous,
      modelVersion:terminal.modelVersion??null,readOnlyValidated:true,runtimeEffects:0};
  } finally {db.close();}
  assert.equal(sha(await readFile(path)),before,'Inspector modified the saved database');
  return result;
}

export async function inspectSavedSession() {
  const directory=resolve(ROOT,SESSION);
  const manifest=await json(resolve(directory,'MANIFEST.json'));
  const summary=await json(resolve(directory,'SUMMARY.json'));
  const readiness=await json(resolve(directory,'PROVIDER_READINESS.json'));
  const records=[];
  for(const result of summary.results) {
    const row=manifest.schedule.find(r=>r.scope.runId===result.runId);assert(row);
    records.push(await inspectRecord(manifest,row,directory));
  }
  return {version:'hiring-showcase-inspection-v1',truthMode:'SIMULATED',evaluationStatus:'BLOCKED_PARTIAL_ORIGINAL_RUN',
    proposed15RecordStudy:'NOT_RUN',model:manifest.model,session:SESSION,manifestSha256:digest(manifest),
    originalPlannedInitialRecords:35,retainedRecords:records.length,validModelFindings:records.filter(r=>r.method!=='rules'&&r.finding).length,
    transport:summary.transport,largestMeasuredInitialInputBound:Math.max(...readiness.tokenCounts.map(r=>r.tokens.completeInputTokenBound)),
    blindedAdjudication:'NOT_RUN',scopeAmendment:'PENDING_HUMAN_REVIEW',runtimeIntervention:'NOT_RUN',records};
}

export function recordMarkdown(record) {
  const finding=record.finding;
  const hypotheses=finding?.hypotheses.map(h=>`- ${h.rank}. ${h.diagnosis}: ${h.summary}\n  Supporting IDs: ${h.supportIds.join(', ')||'none recorded'}\n  Contradictory IDs: ${h.contradictionIds.join(', ')||'none recorded'}`).join('\n')??'No model finding returned.';
  return `# Saved ${record.method} Case\n\nSIMULATED · ${record.terminalStatus} · original retained benchmark, not the proposed 15-record study.\n\nCase source: ${record.sourceCaseId}\nRun: ${record.runId}\nFailure: ${record.failureReason??'none recorded'}\n\n${finding?.signalSummary??'The scored provider request failed; no diagnosis or epistemic abstention is inferred.'}\n\n## Explanations and citations\n\n${hypotheses}\n\nRecommendation: ${finding?.recommendation.summary??'Unavailable after provider failure.'}\nBoundary: recommendation only; no effect.\nIndependent semantic adjudication: NOT_RUN.\n\n## Reloadable record\n\nDatabase: ${record.databaseRelativePath}\nDatabase SHA-256: ${record.databaseSha256}\nTimeline SHA-256: ${record.timelineSha256}\n\n${record.history.map(e=>`${e.sequence}. ${e.kind} — ${e.hash}`).join('\n')}\n\nGeneration usage: ${record.usage.totalGeneratedTokens??'unknown; known ledger counter is not total server usage'}\nLatency: ${record.elapsedMs===null?'not recorded':`${Math.round(record.elapsedMs)} ms`}\nRead-only source/manifest/history validation passed. Reload is inspection, not fresh inference or dispatch recovery.\n`;
}

function evidenceHtml(record,ids) {
  const rows=ids.map(id=>record.allowedEvidence.find(e=>e.id===id));
  return `<details><summary>Inspect ${ids.length} cited observations</summary>${rows.map((e,i)=>e
    ?`<div class="observation"><strong>${escapeHtml(e.type)} · ${escapeHtml(e.at)}</strong><code>${escapeHtml(e.id)}</code><pre>${escapeHtml(JSON.stringify(e.payload,null,2))}</pre></div>`
    :`<p>Unknown citation retained for grading: ${escapeHtml(ids[i])}</p>`).join('')}</details>`;
}

export function renderHtml(snapshot,plan) {
  const e=escapeHtml;
  const records=snapshot.records.map(record=>{
    const finding=record.finding;
    return `<article class="case" id="${e(record.runId)}"><header><span class="eyebrow">SAVED CASE / ${e(record.method)}</span><h2>${e(record.sourceCaseId)}</h2><p>${e(finding?.signalSummary??'Gemini request rejected. No model finding returned.')}</p><span class="badge">SIMULATED</span> <strong>${e(record.terminalStatus)}</strong></header>
      <div class="case-layout"><div><section class="metrics" aria-label="Received revenue"><div><span>09:00–09:30 received revenue</span><strong>INR ${(record.signal.pre.revenueMinor/100).toLocaleString('en-IN')}</strong></div><div><span>09:30–10:00 received revenue</span><strong>INR ${(record.signal.post.revenueMinor/100).toLocaleString('en-IN')}</strong></div></section><p>Affected segment: ${e(finding?.affectedSegment??'Unavailable')} · Atomic claims recorded: ${finding?.claims.length??'Unavailable'}</p><p>Unresolved alternatives: ${e(finding?.unresolvedAlternatives.join(', ')||'none recorded; no alternatives are inferred')}</p>
      ${finding?finding.hypotheses.map(h=>`<section class="claim"><span class="eyebrow">EXPLANATION ${h.rank}</span><h3>${e(h.diagnosis)}</h3><p>${e(h.summary)}</p><h4>Supporting evidence</h4>${evidenceHtml(record,h.supportIds)}<h4>Contradictory evidence</h4>${h.contradictionIds.length?evidenceHtml(record,h.contradictionIds):'<p class="missing">None recorded. This limitation stays visible.</p>'}</section>`).join(''):'<section><h3>Provider failure</h3><p>HTTP 400 · generateContent. Detailed error body was not retained; the parameter cause is unknown. One attempt, no automatic retry or paid fallback.</p><p>Unknown generation usage remains unknown. This transport failure is distinct from an evidence-based abstention.</p></section>'}
      </div><aside><h3>Next step</h3><p>${e(finding?.recommendation.summary??'Resolve generation compatibility before any further scored request.')}</p><p>${e(finding?.recommendation.kind??'request_blocked')}</p><p>Recommendation only. Runtime effects: 0.</p><h3>Record</h3><code>${e(record.runId)}</code><p>Actual latency: ${record.elapsedMs===null?'not recorded':Math.round(record.elapsedMs)+' ms'}</p><p>Generated tokens: ${record.usage.totalGeneratedTokens===null?'unknown':record.usage.totalGeneratedTokens}</p><details><summary>Inspect append-only history</summary><ol>${record.history.map(h=>`<li>${e(h.kind)}<code>${e(h.hash)}</code></li>`).join('')}</ol><p>Database SHA-256</p><code>${e(record.databaseSha256)}</code></details><p>Read-only reload verified against frozen source and manifest.</p><p>Semantic judgment: NOT_ADJUDICATED</p></aside></div></article>`;
  }).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>CrossSignal — saved Case inspection</title><style>
    :root{font-family:system-ui,sans-serif;color:#17252f;background:#f7f8fa;line-height:1.55}*{box-sizing:border-box}body{margin:0}main{max-width:1140px;margin:0 auto;padding:40px 24px}h1{font-size:28px;line-height:1.2;letter-spacing:-.6px}h2{font-size:22px}h3{font-size:18px}h4{font-size:15px}p{max-width:78ch}.eyebrow{font-size:11px;letter-spacing:1.1px;text-transform:uppercase;color:#536574}.intro{padding-bottom:28px;border-bottom:1px solid #d9e1e7}.intro p{color:#415564}.badge{display:inline-block;font-size:11px;font-weight:700;background:#e9eff5;padding:3px 8px;border-radius:3px}.status{margin:22px 0;padding:16px 20px;background:#edf2f7;border-left:3px solid #35566e}.flow{font-size:15px;padding:16px 0;color:#415564}.case{padding:28px 0;border-top:1px solid #d9e1e7}.case-layout{display:grid;grid-template-columns:minmax(0,2fr) minmax(260px,1fr);gap:36px;margin-top:20px}.metrics{display:flex;gap:28px;padding:16px 0}.metrics span{display:block;font-size:12px;color:#536574}.metrics strong{font-size:20px}.claim{padding:20px 0;border-top:1px solid #e0e6eb}aside{background:#fff;padding:20px;height:fit-content}code{display:block;font-size:11px;overflow-wrap:anywhere;padding:6px 0;color:#3d5263}details{padding:12px 0}summary{cursor:pointer;font-size:14px;color:#244e6a}pre{font-size:12px;white-space:pre-wrap;overflow-wrap:anywhere}.observation{padding:12px 0;border-bottom:1px solid #e2e8ed}.observation strong{font-size:13px}.missing{color:#685626}.limits{padding:20px 0}footer{margin-top:28px;border-top:1px solid #d9e1e7;padding-top:16px;color:#536574;font-size:12px}a{color:#244e6a}@media(max-width:760px){main{padding:24px 16px}.case-layout{grid-template-columns:1fr}.metrics{flex-wrap:wrap}}
    </style></head><body><main><header class="intro"><span class="eyebrow">CROSSSIGNAL / ENGINEERING SHOWCASE PREPARATION</span><h1>From a revenue signal to an inspectable Case.</h1><p>Bounded investigation, evidence citations and durable failure handling. This offline viewer reads preserved synthetic results; it makes no model request.</p></header><section class="status"><strong>Gemini happy path blocked by HTTP 400</strong><p>${snapshot.retainedRecords} retained records from the original 35-record schedule. Valid Gemini findings: ${snapshot.validModelFindings}. The proposed ${plan.proposedSchedule.records}-record showcase study is NOT_RUN and awaits exact amendment acceptance.</p></section><p class="flow">Synthetic revenue signal → permitted evidence → explanations and counterevidence → recommendation or abstention → readable saved Case</p>${records}<section class="limits"><h2>Small study proposed for review</h2><p>Five frozen synthetic cases × rules, single-shot Gemini and tool-using Gemini × one fresh investigation = 15 records. Repeated runs, the improvement experiment and intervention demo are deferred from the initial hiring showcase. The larger B01 milestone stays incomplete.</p><p>Original limits retained: 8192 context; 1024 response including reasoning; 6144 total generation; 12 turns; 10 tool attempts; 50 rows; 160 query characters; 180s request / 900s investigation; concurrency 1; retries 0.</p><p><a href="README.md">Showcase README</a> · <a href="DEMO_WALKTHROUGH.md">Three-minute walkthrough</a> · <a href="EVALUATION_REPORT.md">Evaluation report</a> · <a href="CONTRACT_CHANGE_PROPOSAL.md">Scope proposal</a></p></section><footer>SIMULATED. Independent adjudication pending. No broad accuracy or business-recovery claim. Existing approval/execution components remain preserved and uninvoked. Export identity: ${e(digest(snapshot))}</footer></main></body></html>`;
}

export function evaluationMarkdown(snapshot,plan) {
  const rules=snapshot.records.find(r=>r.method==='rules');
  const supports=rules.finding.hypotheses.flatMap(h=>h.supportIds).length;
  const contradictions=rules.finding.hypotheses.flatMap(h=>h.contradictionIds).length;
  return `# Small evaluation report — current evidence and proposed study\n\nSIMULATED · inspection only · ${plan.proposedSchedule.records}-record study NOT_RUN.\n\n## Proposed accepted-overlay study\n\nFive existing frozen cases; one fresh investigation for each of rules, single-shot Gemini and tool-using Gemini. No case, truth, rubric, cutoff, task or limit change. Fifteen investigation records are not fifteen API requests. This unaccepted draft can use at most ${plan.ceilings.maximumGenerationDispatches} generation dispatches and ${plan.ceilings.maximumGeneratedTokensIncludingReasoning} generated tokens including reasoning, plus counting/metadata requests. Quota must cover requests, tokens and rate conditions. No request is authorized by this report.\n\n## Retained original-session evidence\n\nSource: ${snapshot.session}\nManifest SHA-256: ${snapshot.manifestSha256}\n\n- Original initial schedule: 35 records; ${snapshot.retainedRecords} retained.\n- Rules: one completed finding, ${supports} support references, ${contradictions} contradiction references, ${rules.finding.hypotheses.length} ranked hypothesis and ${rules.finding.claims.length} atomic claims. Citation IDs exist; semantic relevance/support has not been adjudicated.\n- Single-shot Gemini: one retained failed scored dispatch; HTTP 400, indeterminate_usage, no finding or model revision.\n- Tool-using Gemini: NOT_RUN.\n- Metadata requests: ${snapshot.transport.metadataCalls}; countTokens requests: ${snapshot.transport.countCalls}; generateContent dispatches: ${snapshot.transport.generationCalls}; automatic retries: ${snapshot.transport.automaticRetries}.\n- Largest measured initial complete input bound: ${snapshot.largestMeasuredInitialInputBound}; adding 1024 output fits 8192. Actual accumulated-context generation is unverified.\n- Scored model findings: ${snapshot.validModelFindings}; independent blinded adjudication: NOT_RUN. No diagnosis/evidence/calibration accuracy rate is computed.\n- These older two records are not credited toward the proposed fresh 15-record schedule.\n\n## Failure analysis\n\nHTTP 400 establishes a rejected generation route/request, not poor reasoning. The provider error body was discarded, so the exact parameter cause is unavailable. A committed request and terminal failure survive reload; unknown usage is retained rather than reset or replayed. No standalone smoke, model substitution or paid fallback.\n\nThe deterministic finding has no recorded counterevidence or atomic claims and only one explanation. These are inspectable coverage gaps; do not present it as a complete competing-explanation Gemini investigation. Distinguish available evidence, citation membership and semantic support. Structural parsing is not correctness grading.\n\nNext bounded repair: offline validation of the frozen generation body and secret-free structured error diagnostics. Reverify all original limits/isolation and the verified Free allowance before any fresh scored request. No parameter cause is guessed and no failed attempt is regenerated.\n\n## Report after amendment acceptance and execution\n\nKeep all 15 scheduled records in denominators, including failure/abstention. Report per Case/method: diagnosis or epistemic abstention; support IDs and unsupported claims; contradictory evidence and active countersearch separately; alternatives; recommendation proportionality/authority; tool attempts and retrieved rows; latency; visible-output/reasoning/cumulative usage; provider revision/request ID; charge or its unavailable reason. Use the frozen rubric in a separate evaluator context, retain method-blinded human adjudication, and disclose the intentional eager/query compute difference. No private truth or report returns to the investigator.\n\nOne replicate per method cannot estimate variability, robust accuracy or improvement. Preserve the original development/transfer split; no tuning on transfer results. Repeated-run study and 15-record measured change stay deferred/NOT_RUN, and no runtime intervention is performed. Original B01 acceptance criteria remain incomplete.\n\n## Read-only evidence links\n\n${snapshot.records.map(r=>`- [${r.method}: ${r.runId}](saved-cases/${r.runId}.md) — ${r.terminalStatus}; database SHA-256 ${r.databaseSha256}`).join('\n')}\n\nOpen index.html for the readable Case projection. node prepare.mjs --replay validates/reloads the same stores; it does not infer again or repeat an effect.\n`;
}
