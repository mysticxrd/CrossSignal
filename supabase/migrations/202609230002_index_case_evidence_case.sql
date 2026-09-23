-- Follow-up for the TEST project, where 202609230001 ran before its index was added.
-- On a fresh installation the first migration creates it, so this is a no-op.
create index if not exists idx_case_evidence_case
  on cfr_app.case_evidence (workspace_id, case_id);
