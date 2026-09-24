import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { assessCaseFollowUp } from "../db/case-outcome.mjs";
import { contentHash } from "../db/revenue-leak.mjs";

const HASH = /^[0-9a-f]{64}$/;
const EVENT_KEYS = ["workspaceId", "id", "caseId", "responseId", "source",
  "segment", "observedDay", "starts", "completed", "captures", "revenueCents"];
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const exact = (value, keys) => value && typeof value === "object" && !Array.isArray(value)
  && Object.keys(value).sort().join("|") === [...keys].sort().join("|");

export function buildCaseFollowUpSql(input, recordedAt = new Date().toISOString()) {
  if (!exact(input, ["receipt", "events"])
    || !exact(input.receipt, ["workspaceId", "caseId", "responseId", "checkedAt", "contentHash"])
    || typeof input.receipt.contentHash !== "string" || !HASH.test(input.receipt.contentHash)
    || typeof input.receipt.checkedAt !== "string" || Number.isNaN(Date.parse(input.receipt.checkedAt))
    || !Array.isArray(input.events) || input.events.length !== 14
    || input.events.some((event) => !exact(event, EVENT_KEYS))) {
    throw new TypeError("Follow-up import contract is invalid");
  }
  const rows = input.events.map((event) => {
    const artifact = { ...event, receiptHash: input.receipt.contentHash };
    return { ...artifact, truthMode: "FIXTURE", contentHash: contentHash(artifact), recordedAt };
  });
  const assessment = assessCaseFollowUp(rows, input.receipt,
    { id: input.receipt.responseId, caseId: input.receipt.caseId,
      measurement: { minimumStarts: 100 } },
    { observed: { conversionBps: 857 } });
  if (assessment.status !== "assessed") throw new TypeError("Follow-up import needs seven paired days and 100 starts");
  const values = rows.map((row) => `(${[
    row.workspaceId, row.id, row.caseId, row.responseId, row.receiptHash, row.source,
    row.segment, row.observedDay, row.starts, row.completed, row.captures,
    row.revenueCents, row.contentHash,
  ].map(quote).join(", ")})`).join(",\n  ");
  const { workspaceId, caseId, responseId, contentHash: receiptHash } = input.receipt;
  const assertRows = rows.map((row) => `  if not exists (
    select 1 from cfr_app.case_follow_up_events
    where workspace_id = ${quote(workspaceId)} and id = ${quote(row.id)}
      and response_id = ${quote(responseId)} and receipt_hash = ${quote(receiptHash)}
      and content_hash = ${quote(row.contentHash)}
  ) then raise exception 'Follow-up row differs: ${row.id}'; end if;`).join("\n");
  return `begin;
-- Owner-attested TEST receipt ${receiptHash}; no original Case event is changed.
insert into cfr_app.case_follow_up_events
  (workspace_id, id, case_id, response_id, receipt_hash, source, segment, observed_day,
   starts, completed, captures, revenue_cents, content_hash)
select v.workspace_id, v.id, v.case_id, v.response_id, v.receipt_hash, v.source, v.segment,
  v.observed_day::date, v.starts::int, v.completed::int, v.captures::int,
  v.revenue_cents::bigint, v.content_hash
from (values
  ${values}
) as v(workspace_id, id, case_id, response_id, receipt_hash, source, segment,
       observed_day, starts, completed, captures, revenue_cents, content_hash)
join cfr_app.case_response_receipts original
  on original.workspace_id = v.workspace_id and original.response_id = v.response_id
left join cfr_app.case_check_trial_markers marker
  on marker.workspace_id = original.workspace_id and marker.response_id = original.response_id
left join cfr_app.case_check_recheck_receipts recheck
  on recheck.workspace_id = marker.workspace_id and recheck.response_id = marker.response_id
join cfr_app.case_response_proposals proposal
  on proposal.workspace_id = original.workspace_id and proposal.id = original.response_id
  and proposal.case_id = v.case_id and proposal.content_hash = original.proposal_hash
where v.workspace_id = ${quote(workspaceId)} and v.case_id = ${quote(caseId)}
  and v.response_id = ${quote(responseId)}
  and v.receipt_hash = ${quote(receiptHash)}
  and (marker.workspace_id is null or recheck.workspace_id is not null)
  and coalesce(recheck.content_hash, original.content_hash) = ${quote(receiptHash)}
  and coalesce(recheck.checked_at, original.checked_at) = ${quote(input.receipt.checkedAt)}::text::timestamptz
  and v.observed_day::date > (coalesce(recheck.checked_at, original.checked_at) at time zone 'utc')::date
on conflict do nothing;
do $$ begin
${assertRows}
  if (select count(*) from cfr_app.case_follow_up_events
      where workspace_id = ${quote(workspaceId)} and response_id = ${quote(responseId)}) <> 14
  then raise exception 'Follow-up event set is incomplete or has extra rows'; end if;
end $$;
commit;
`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , inputPath, outputPath] = process.argv;
  if (!inputPath || !outputPath) {
    throw new Error("Usage: node scripts/generate-case-follow-up-sql.mjs input.json output.sql");
  }
  const sql = buildCaseFollowUpSql(JSON.parse(readFileSync(inputPath, "utf8")));
  writeFileSync(outputPath, sql);
  process.stdout.write(`Wrote ${outputPath}\n`);
}
