begin;

-- A fixed TEST proposal is seeded by the scenario administrator. Runtime
-- owners can approve only its exact hash; no runtime proposal mutation,
-- execution, or outcome write privilege is granted here.
create table cfr_app.case_response_proposals (
  workspace_id text not null,
  id text not null,
  case_id text not null,
  investigation_id text not null,
  truth_mode text not null default 'FIXTURE',
  status text not null default 'proposed',
  artifact_json jsonb not null,
  content_hash text not null,
  created_at timestamptz not null default now(),
  constraint pk_case_response_proposals primary key (workspace_id, id),
  constraint uq_case_response_proposals_hash unique (workspace_id, id, content_hash),
  constraint uq_case_response_proposals_case unique (workspace_id, case_id),
  constraint fk_case_response_proposals_case foreign key (workspace_id, case_id)
    references cfr_app.detected_cases(workspace_id, id) on delete restrict,
  constraint fk_case_response_proposals_investigation foreign key (workspace_id, investigation_id)
    references cfr_app.case_investigations(workspace_id, id) on delete restrict,
  constraint chk_case_response_proposals_truth check (truth_mode = 'FIXTURE'),
  constraint chk_case_response_proposals_status check (status = 'proposed'),
  constraint chk_case_response_proposals_artifact check (jsonb_typeof(artifact_json) = 'object'),
  constraint chk_case_response_proposals_hash check (content_hash ~ '^[0-9a-f]{64}$')
);
create index idx_case_response_proposals_investigation
  on cfr_app.case_response_proposals (workspace_id, investigation_id);

create table cfr_app.case_response_approvals (
  workspace_id text not null,
  response_id text not null,
  proposal_hash text not null,
  approved_by text not null,
  approved_at timestamptz not null default now(),
  constraint pk_case_response_approvals primary key (workspace_id, response_id),
  constraint fk_case_response_approvals_proposal foreign key (workspace_id, response_id, proposal_hash)
    references cfr_app.case_response_proposals(workspace_id, id, content_hash) on delete restrict,
  constraint fk_case_response_approvals_owner foreign key (workspace_id, approved_by)
    references cfr_app.workspace_members(workspace_id, user_id) on delete restrict,
  constraint chk_case_response_approvals_hash check (proposal_hash ~ '^[0-9a-f]{64}$')
);
create index idx_case_response_approvals_owner
  on cfr_app.case_response_approvals (workspace_id, approved_by);

alter table cfr_app.case_response_proposals enable row level security;
alter table cfr_app.case_response_proposals force row level security;
alter table cfr_app.case_response_approvals enable row level security;
alter table cfr_app.case_response_approvals force row level security;

create policy case_response_proposals_owner_read on cfr_app.case_response_proposals
for select to cfr_trace_reader, cfr_app_runtime using (
  workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')
  and exists (select 1 from cfr_app.workspace_members member
    where member.workspace_id = case_response_proposals.workspace_id
      and member.user_id = nullif((select current_setting('app.current_user_id', true)), '')
      and member.role = 'owner')
);
create policy case_response_approvals_owner_read on cfr_app.case_response_approvals
for select to cfr_trace_reader, cfr_app_runtime using (
  workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')
  and exists (select 1 from cfr_app.workspace_members member
    where member.workspace_id = case_response_approvals.workspace_id
      and member.user_id = nullif((select current_setting('app.current_user_id', true)), '')
      and member.role = 'owner')
);
create policy case_response_approvals_owner_insert on cfr_app.case_response_approvals
for insert to cfr_app_runtime with check (
  workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')
  and approved_by = nullif((select current_setting('app.current_user_id', true)), '')
  and exists (select 1 from cfr_app.workspace_members member
    where member.workspace_id = case_response_approvals.workspace_id
      and member.user_id = case_response_approvals.approved_by
      and member.role = 'owner')
  and exists (select 1 from cfr_app.case_response_proposals proposal
    where proposal.workspace_id = case_response_approvals.workspace_id
      and proposal.id = case_response_approvals.response_id
      and proposal.content_hash = case_response_approvals.proposal_hash
      and proposal.status = 'proposed' and proposal.truth_mode = 'FIXTURE')
);

revoke all on cfr_app.case_response_proposals, cfr_app.case_response_approvals
  from public, anon, authenticated, service_role, cfr_app_runtime, cfr_trace_reader;
grant select on cfr_app.case_response_proposals, cfr_app.case_response_approvals
  to cfr_trace_reader, cfr_app_runtime;
grant insert on cfr_app.case_response_approvals to cfr_app_runtime;

commit;
