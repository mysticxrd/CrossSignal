begin;

-- An owner attests to one manually performed TEST check after approval. This
-- records evidence about a human check; it does not execute the response.
create table cfr_app.case_response_receipts (
  workspace_id text not null,
  response_id text not null,
  proposal_hash text not null,
  recorded_by text not null,
  run_reference text not null,
  capture_status text not null,
  checked_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  content_hash text not null,
  constraint pk_case_response_receipts primary key (workspace_id, response_id),
  constraint fk_case_response_receipts_approval foreign key (workspace_id, response_id)
    references cfr_app.case_response_approvals(workspace_id, response_id) on delete restrict,
  constraint fk_case_response_receipts_proposal foreign key (workspace_id, response_id, proposal_hash)
    references cfr_app.case_response_proposals(workspace_id, id, content_hash) on delete restrict,
  constraint fk_case_response_receipts_owner foreign key (workspace_id, recorded_by)
    references cfr_app.workspace_members(workspace_id, user_id) on delete restrict,
  constraint chk_case_response_receipts_reference check (run_reference ~ '^[A-Za-z0-9_-]{8,64}$'),
  constraint chk_case_response_receipts_capture check (capture_status in ('captured', 'not_captured', 'indeterminate')),
  constraint chk_case_response_receipts_time check (checked_at <= recorded_at),
  constraint chk_case_response_receipts_hash check (content_hash ~ '^[0-9a-f]{64}$')
);
create index idx_case_response_receipts_owner
  on cfr_app.case_response_receipts (workspace_id, recorded_by);
create index idx_case_response_receipts_proposal_hash
  on cfr_app.case_response_receipts (workspace_id, response_id, proposal_hash);

alter table cfr_app.case_response_receipts enable row level security;
alter table cfr_app.case_response_receipts force row level security;

create policy case_response_receipts_owner_read on cfr_app.case_response_receipts
for select to cfr_trace_reader, cfr_app_runtime using (
  workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')
  and exists (select 1 from cfr_app.workspace_members member
    where member.workspace_id = case_response_receipts.workspace_id
      and member.user_id = nullif((select current_setting('app.current_user_id', true)), '')
      and member.role = 'owner')
);
create policy case_response_receipts_owner_insert on cfr_app.case_response_receipts
for insert to cfr_app_runtime with check (
  workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')
  and recorded_by = nullif((select current_setting('app.current_user_id', true)), '')
  and exists (select 1 from cfr_app.workspace_members member
    where member.workspace_id = case_response_receipts.workspace_id
      and member.user_id = case_response_receipts.recorded_by
      and member.role = 'owner')
  and exists (select 1 from cfr_app.case_response_approvals approval
    where approval.workspace_id = case_response_receipts.workspace_id
      and approval.response_id = case_response_receipts.response_id
      and approval.proposal_hash = case_response_receipts.proposal_hash
      and approval.approved_at <= case_response_receipts.checked_at)
);

revoke all on cfr_app.case_response_receipts
  from public, anon, authenticated, service_role, cfr_app_runtime, cfr_trace_reader;
grant select on cfr_app.case_response_receipts to cfr_trace_reader, cfr_app_runtime;
grant insert on cfr_app.case_response_receipts to cfr_app_runtime;

commit;
