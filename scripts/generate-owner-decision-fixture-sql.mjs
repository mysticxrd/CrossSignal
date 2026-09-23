import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { investigatePersistedCase } from "../db/case-investigator.mjs";
import { buildGoldenEvents, contentHash, detectRevenueLeak, GOLDEN_SCENARIO } from "../db/revenue-leak.mjs";

// The existing TEST owner workspace already has authenticated membership.
// Add only FIXTURE Case data; never alter that workspace or its principals.
const scenario = { ...GOLDEN_SCENARIO, workspaceId: "l14-workspace-a" };
const result = detectRevenueLeak(scenario, buildGoldenEvents(scenario));
const { caseRecord, signal, evidence, events } = result;
const snapshot = {
  caseRow: {
    workspaceId: caseRecord.workspaceId, id: caseRecord.id,
    scenarioId: caseRecord.scenarioId, scenarioVersion: caseRecord.scenarioVersion,
    scenarioHash: contentHash(scenario), title: caseRecord.title,
    status: caseRecord.status, truthMode: caseRecord.truthMode,
    contentHash: contentHash(caseRecord),
  },
  signalRow: {
    workspaceId: signal.workspaceId, id: signal.id, caseId: signal.caseId,
    kind: signal.kind, methodVersion: signal.methodVersion, detected: signal.detected,
    metrics: signal.metrics, contentHash: contentHash(signal),
  },
  evidenceRows: evidence.map((item) => ({
    workspaceId: item.workspaceId, id: item.id, caseId: item.caseId,
    source: item.source, relation: item.relation, claim: item.claim,
    truthMode: item.truthMode, contentHash: contentHash(item),
  })),
  eventRows: events.map((item) => ({ ...item, truthMode: "FIXTURE", contentHash: contentHash(item) })),
  citationRows: evidence.flatMap((item) => item.eventIds.map((eventId) => ({
    workspaceId: item.workspaceId, evidenceId: item.id, eventId,
  }))),
};
const investigation = investigatePersistedCase(snapshot, scenario);
const investigationCitations = investigation.claims.flatMap((claim) => claim.eventIds.map((eventId) => ({
  claimId: claim.id, evidenceId: claim.evidenceId, eventId,
})));
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const json = (value) => `${quote(JSON.stringify(value))}::jsonb`;
const checksum = (rows) => createHash("md5").update(rows.sort().join("|")).digest("hex");
const eventChecksum = checksum(events.map((event) => `${event.id}:${contentHash(event)}`));
const evidenceChecksum = checksum(evidence.map((item) => `${item.id}:${contentHash(item)}`));
const refChecksum = checksum(snapshot.citationRows.map((row) => `${row.evidenceId}:${row.eventId}`));
const investigationCitationChecksum = checksum(investigationCitations.map((row) => `${row.claimId}:${row.evidenceId}:${row.eventId}`));
const outputPath = fileURLToPath(new URL("../supabase/scenarios/owner_decision_fixture.sql", import.meta.url));

const sql = `-- Generated TEST-only Case fixture for the existing authenticated owner workspace.
-- Inserts matching missing rows; never deletes, overwrites, or changes memberships.
begin;

insert into cfr_app.case_recorded_events
  (workspace_id, id, scenario_id, truth_mode, source, window_key, segment,
   observed_day, starts, completed, captures, revenue_cents, content_hash)
values
${events.map((event) => `  (${[
  event.workspaceId, event.id, event.scenarioId, "FIXTURE", event.source,
  event.window, event.segment, event.observedDay,
].map(quote).join(", ")}, ${event.starts}, ${event.completed}, ${event.captures}, ${event.revenueCents}, ${quote(contentHash(event))})`).join(",\n")}
on conflict do nothing;

insert into cfr_app.detected_cases
  (workspace_id, id, scenario_id, scenario_version, scenario_hash,
   title, status, truth_mode, content_hash, created_at)
values (${quote(scenario.workspaceId)}, ${quote(caseRecord.id)}, ${quote(scenario.id)},
  ${scenario.version}, ${quote(contentHash(scenario))}, ${quote(caseRecord.title)},
  ${quote(caseRecord.status)}, 'FIXTURE', ${quote(contentHash(caseRecord))}, '2026-09-23T00:00:00Z')
on conflict do nothing;

insert into cfr_app.case_signals
  (workspace_id, id, case_id, kind, method_version, detected, metrics_json, content_hash, created_at)
values (${quote(scenario.workspaceId)}, ${quote(signal.id)}, ${quote(signal.caseId)},
  ${quote(signal.kind)}, ${quote(signal.methodVersion)}, ${signal.detected},
  ${json(signal.metrics)}, ${quote(contentHash(signal))}, '2026-09-23T00:00:00Z')
on conflict do nothing;

insert into cfr_app.case_evidence
  (workspace_id, id, case_id, source, relation, claim, truth_mode, content_hash)
values
${evidence.map((item) => `  (${[
  item.workspaceId, item.id, item.caseId, item.source, item.relation,
  item.claim, item.truthMode, contentHash(item),
].map(quote).join(", ")})`).join(",\n")}
on conflict do nothing;

insert into cfr_app.case_evidence_event_refs (workspace_id, evidence_id, event_id)
values
${snapshot.citationRows.map((row) => `  (${[
  row.workspaceId, row.evidenceId, row.eventId,
].map(quote).join(", ")})`).join(",\n")}
on conflict do nothing;

insert into cfr_app.case_investigations
  (workspace_id, id, case_id, signal_id, method_version, truth_mode, status,
   assessment, source_case_hash, source_signal_hash, artifact_json, content_hash, created_at)
values (${quote(scenario.workspaceId)}, ${quote(investigation.id)}, ${quote(caseRecord.id)},
  ${quote(signal.id)}, ${quote(investigation.methodVersion)}, 'FIXTURE',
  ${quote(investigation.status)}, ${quote(investigation.assessment)},
  ${quote(investigation.sourceCaseHash)}, ${quote(investigation.sourceSignalHash)},
  ${json(investigation)}, ${quote(contentHash(investigation))}, '2026-09-23T00:00:00Z')
on conflict do nothing;

insert into cfr_app.case_investigation_citations
  (workspace_id, investigation_id, claim_id, evidence_id, event_id)
values
${investigationCitations.map((row) => `  (${[
  scenario.workspaceId, investigation.id, row.claimId, row.evidenceId, row.eventId,
].map(quote).join(", ")})`).join(",\n")}
on conflict do nothing;

do $$
begin
  if (select count(*) from cfr_app.case_recorded_events
      where workspace_id = ${quote(scenario.workspaceId)} and scenario_id = ${quote(scenario.id)}) <> ${events.length}
    or (select md5(string_agg(id || ':' || content_hash, '|' order by id))
      from cfr_app.case_recorded_events where workspace_id = ${quote(scenario.workspaceId)}
        and scenario_id = ${quote(scenario.id)}) <> ${quote(eventChecksum)}
  then raise exception 'owner Case events differ from source contract'; end if;
  if not exists (select 1 from cfr_app.detected_cases where workspace_id = ${quote(scenario.workspaceId)}
      and id = ${quote(caseRecord.id)} and scenario_hash = ${quote(contentHash(scenario))}
      and content_hash = ${quote(contentHash(caseRecord))})
    or not exists (select 1 from cfr_app.case_signals where workspace_id = ${quote(scenario.workspaceId)}
      and id = ${quote(signal.id)} and content_hash = ${quote(contentHash(signal))})
  then raise exception 'owner Case or signal differs from detection contract'; end if;
  if (select count(*) from cfr_app.case_evidence where workspace_id = ${quote(scenario.workspaceId)}
      and case_id = ${quote(caseRecord.id)}) <> ${evidence.length}
    or (select md5(string_agg(id || ':' || content_hash, '|' order by id))
      from cfr_app.case_evidence where workspace_id = ${quote(scenario.workspaceId)}
        and case_id = ${quote(caseRecord.id)}) <> ${quote(evidenceChecksum)}
  then raise exception 'owner Case evidence differs from detection contract'; end if;
  if (select count(*) from cfr_app.case_evidence_event_refs r
      join cfr_app.case_evidence e on e.workspace_id = r.workspace_id and e.id = r.evidence_id
      where r.workspace_id = ${quote(scenario.workspaceId)} and e.case_id = ${quote(caseRecord.id)}) <> ${snapshot.citationRows.length}
    or (select md5(string_agg(r.evidence_id || ':' || r.event_id, '|'
        order by r.evidence_id, r.event_id))
      from cfr_app.case_evidence_event_refs r
      join cfr_app.case_evidence e on e.workspace_id = r.workspace_id and e.id = r.evidence_id
      where r.workspace_id = ${quote(scenario.workspaceId)} and e.case_id = ${quote(caseRecord.id)}) <> ${quote(refChecksum)}
  then raise exception 'owner Case evidence references differ'; end if;
  if not exists (select 1 from cfr_app.case_investigations where workspace_id = ${quote(scenario.workspaceId)}
      and id = ${quote(investigation.id)} and artifact_json = ${json(investigation)}
      and content_hash = ${quote(contentHash(investigation))})
  then raise exception 'owner Case investigation differs'; end if;
  if (select count(*) from cfr_app.case_investigation_citations where workspace_id = ${quote(scenario.workspaceId)}
      and investigation_id = ${quote(investigation.id)}) <> ${investigationCitations.length}
    or (select md5(string_agg(claim_id || ':' || evidence_id || ':' || event_id, '|'
        order by claim_id, evidence_id, event_id)) from cfr_app.case_investigation_citations
      where workspace_id = ${quote(scenario.workspaceId)}
        and investigation_id = ${quote(investigation.id)}) <> ${quote(investigationCitationChecksum)}
  then raise exception 'owner Case investigation citations differ'; end if;
end $$;

commit;
`;

if (process.argv.includes("--check")) {
  if (readFileSync(outputPath, "utf8") !== sql) throw new Error("Owner decision SQL is stale");
  process.stdout.write(`Owner Decision UX fixture matches source: ${contentHash(investigation)}\n`);
} else {
  writeFileSync(outputPath, sql, "utf8");
  process.stdout.write(`${outputPath}\n`);
}
