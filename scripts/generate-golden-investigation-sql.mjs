import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { investigatePersistedCase } from "../db/case-investigator.mjs";
import { contentHash } from "../db/revenue-leak.mjs";

const check = process.argv.includes("--check");
const inputPath = process.argv.slice(2).find((arg) => arg !== "--check");
if (!inputPath) throw new Error("Usage: node scripts/generate-golden-investigation-sql.mjs <reader-export.json> [--check]");
const outputPath = fileURLToPath(new URL("../supabase/scenarios/golden_investigation.sql", import.meta.url));
const snapshot = JSON.parse(readFileSync(inputPath, "utf8"));
const artifact = investigatePersistedCase(snapshot);
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const json = (value) => `${quote(JSON.stringify(value))}::jsonb`;
const citations = artifact.claims.flatMap((claim) => claim.eventIds.map((eventId) => ({
  workspaceId: artifact.workspaceId, investigationId: artifact.id,
  claimId: claim.id, evidenceId: claim.evidenceId, eventId,
})));
const citationChecksum = createHash("md5")
  .update(citations.map((row) => `${row.claimId}:${row.evidenceId}:${row.eventId}`).sort().join("|"))
  .digest("hex");
const values = citations.map((row) => `  (${[
  row.workspaceId, row.investigationId, row.claimId, row.evidenceId, row.eventId,
].map(quote).join(", ")})`);
const artifactHash = contentHash(artifact);

const sql = `-- Generated from a restricted-reader export of the persisted TEST Case.
-- Re-run safely: matching rows are retained; changed rows make the transaction fail.
begin;

insert into cfr_app.case_investigations
  (workspace_id, id, case_id, signal_id, method_version, truth_mode, status,
   assessment, source_case_hash, source_signal_hash, artifact_json, content_hash,
   created_at)
values (${quote(artifact.workspaceId)}, ${quote(artifact.id)}, ${quote(artifact.caseId)},
  ${quote(snapshot.signalRow.id)}, ${quote(artifact.methodVersion)},
  ${quote(artifact.truthMode)}, ${quote(artifact.status)}, ${quote(artifact.assessment)},
  ${quote(artifact.sourceCaseHash)}, ${quote(artifact.sourceSignalHash)},
  ${json(artifact)}, ${quote(artifactHash)}, '2026-09-23T00:00:00Z')
on conflict do nothing;

insert into cfr_app.case_investigation_citations
  (workspace_id, investigation_id, claim_id, evidence_id, event_id)
values
${values.join(",\n")}
on conflict do nothing;

do $$
begin
  if not exists (select 1 from cfr_app.detected_cases
      where workspace_id = ${quote(artifact.workspaceId)} and id = ${quote(artifact.caseId)}
        and content_hash = ${quote(artifact.sourceCaseHash)})
    or not exists (select 1 from cfr_app.case_signals
      where workspace_id = ${quote(artifact.workspaceId)} and id = ${quote(snapshot.signalRow.id)}
        and case_id = ${quote(artifact.caseId)} and content_hash = ${quote(artifact.sourceSignalHash)})
  then raise exception 'investigation source Case or signal changed'; end if;
  if not exists (select 1 from cfr_app.case_investigations
      where workspace_id = ${quote(artifact.workspaceId)} and id = ${quote(artifact.id)}
        and case_id = ${quote(artifact.caseId)} and signal_id = ${quote(snapshot.signalRow.id)}
        and method_version = ${quote(artifact.methodVersion)}
        and source_case_hash = ${quote(artifact.sourceCaseHash)}
        and source_signal_hash = ${quote(artifact.sourceSignalHash)}
        and artifact_json = ${json(artifact)} and content_hash = ${quote(artifactHash)})
  then raise exception 'persisted investigation differs from verified artifact'; end if;
  if (select count(*) from cfr_app.case_investigation_citations
      where workspace_id = ${quote(artifact.workspaceId)}
        and investigation_id = ${quote(artifact.id)}) <> ${citations.length}
    or (select md5(string_agg(claim_id || ':' || evidence_id || ':' || event_id, '|'
        order by claim_id, evidence_id, event_id))
      from cfr_app.case_investigation_citations
      where workspace_id = ${quote(artifact.workspaceId)}
        and investigation_id = ${quote(artifact.id)}) <> ${quote(citationChecksum)}
  then raise exception 'investigation citations differ from verified evidence'; end if;
end $$;

commit;
`;

if (check) {
  if (readFileSync(outputPath, "utf8") !== sql) throw new Error("Golden investigation SQL is stale");
  process.stdout.write(`Verified investigation SQL: ${artifactHash}\n`);
} else {
  writeFileSync(outputPath, sql, "utf8");
  process.stdout.write(`${outputPath}\n`);
}
