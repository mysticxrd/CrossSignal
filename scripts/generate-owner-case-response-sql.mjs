import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { investigatePersistedCase } from "../db/case-investigator.mjs";
import { buildGoldenCaseResponse } from "../db/case-response.mjs";
import { buildGoldenEvents, contentHash, detectRevenueLeak, GOLDEN_SCENARIO } from "../db/revenue-leak.mjs";

const scenario = { ...GOLDEN_SCENARIO, workspaceId: "l14-workspace-a" };
const { caseRecord, signal, evidence, events } = detectRevenueLeak(scenario, buildGoldenEvents(scenario));
const snapshot = {
  caseRow: { workspaceId: caseRecord.workspaceId, id: caseRecord.id,
    scenarioId: caseRecord.scenarioId, scenarioVersion: caseRecord.scenarioVersion,
    scenarioHash: contentHash(scenario), title: caseRecord.title,
    status: caseRecord.status, truthMode: caseRecord.truthMode,
    contentHash: contentHash(caseRecord) },
  signalRow: { workspaceId: signal.workspaceId, id: signal.id, caseId: signal.caseId,
    kind: signal.kind, methodVersion: signal.methodVersion, detected: signal.detected,
    metrics: signal.metrics, contentHash: contentHash(signal) },
  evidenceRows: evidence.map((item) => ({ workspaceId: item.workspaceId,
    id: item.id, caseId: item.caseId, source: item.source, relation: item.relation,
    claim: item.claim, truthMode: item.truthMode, contentHash: contentHash(item) })),
  eventRows: events.map((item) => ({ ...item, truthMode: "FIXTURE", contentHash: contentHash(item) })),
  citationRows: evidence.flatMap((item) => item.eventIds.map((eventId) => ({
    workspaceId: item.workspaceId, evidenceId: item.id, eventId,
  }))),
};
const report = investigatePersistedCase(snapshot, scenario);
const proposal = buildGoldenCaseResponse(snapshot.caseRow, report, contentHash(report));
const proposalHash = contentHash(proposal);
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const json = (value) => `${quote(JSON.stringify(value))}::jsonb`;
const outputPath = fileURLToPath(new URL("../supabase/scenarios/owner_case_response.sql", import.meta.url));
const sql = `-- Generated, idempotent TEST-only response for the existing Case.
-- Preserves prior Case data, approvals, membership, and every other row.
begin;
insert into cfr_app.case_response_proposals
  (workspace_id, id, case_id, investigation_id, truth_mode, status,
   artifact_json, content_hash, created_at)
values (${quote(scenario.workspaceId)}, ${quote(proposal.id)}, ${quote(proposal.caseId)},
  ${quote(proposal.investigationId)}, 'FIXTURE', 'proposed',
  ${json(proposal)}, ${quote(proposalHash)}, '2026-09-23T00:00:00Z')
on conflict do nothing;

do $$
begin
  if (select count(*) from cfr_app.case_response_proposals
      where workspace_id = ${quote(scenario.workspaceId)} and case_id = ${quote(proposal.caseId)}) <> 1
    or not exists (select 1 from cfr_app.case_response_proposals
      where workspace_id = ${quote(scenario.workspaceId)} and id = ${quote(proposal.id)}
        and investigation_id = ${quote(proposal.investigationId)}
        and truth_mode = 'FIXTURE' and status = 'proposed'
        and artifact_json = ${json(proposal)} and content_hash = ${quote(proposalHash)})
  then raise exception 'owner Case response differs from verified proposal'; end if;
end $$;
commit;
`;

if (process.argv.includes("--check")) {
  if (readFileSync(outputPath, "utf8") !== sql) throw new Error("Owner Case response SQL is stale");
  process.stdout.write(`Owner Case response matches source: ${proposalHash}\n`);
} else {
  writeFileSync(outputPath, sql, "utf8");
  process.stdout.write(`${outputPath}\n`);
}
