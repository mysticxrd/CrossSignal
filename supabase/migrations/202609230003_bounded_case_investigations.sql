begin;

-- Private, read-only-to-application Investigator artifacts. The TEST fixture
-- setup inserts one verified artifact as administrator; no runtime write grant.
create table cfr_app.case_investigations (
  workspace_id text not null,
  id text not null,
  case_id text not null,
  signal_id text not null,
  method_version text not null,
  truth_mode text not null default 'FIXTURE',
  status text not null,
  assessment text not null,
  source_case_hash text not null,
  source_signal_hash text not null,
  artifact_json jsonb not null,
  content_hash text not null,
  created_at timestamptz not null default now(),
  constraint pk_case_investigations primary key (workspace_id, id),
  constraint uq_case_investigations_case_method unique (workspace_id, case_id, method_version),
  constraint fk_case_investigations_case foreign key (workspace_id, case_id)
    references cfr_app.detected_cases(workspace_id, id) on delete restrict,
  constraint fk_case_investigations_signal foreign key (workspace_id, signal_id)
    references cfr_app.case_signals(workspace_id, id) on delete restrict,
  constraint chk_case_investigations_truth check (truth_mode = 'FIXTURE'),
  constraint chk_case_investigations_status check (status = 'ready_for_review'),
  constraint chk_case_investigations_assessment check
    (assessment = 'targeted_drop_supported_cause_unconfirmed'),
  constraint chk_case_investigations_method check (method_version = 'bounded-deterministic-v1'),
  constraint chk_case_investigations_artifact check (jsonb_typeof(artifact_json) = 'object'),
  constraint chk_case_investigations_hashes check (
    source_case_hash ~ '^[0-9a-f]{64}$' and source_signal_hash ~ '^[0-9a-f]{64}$'
    and content_hash ~ '^[0-9a-f]{64}$'
  )
);
create index idx_case_investigations_signal
  on cfr_app.case_investigations (workspace_id, signal_id);

create table cfr_app.case_investigation_citations (
  workspace_id text not null,
  investigation_id text not null,
  claim_id text not null,
  evidence_id text not null,
  event_id text not null,
  constraint pk_case_investigation_citations primary key
    (workspace_id, investigation_id, claim_id, evidence_id, event_id),
  constraint fk_case_investigation_citations_investigation
    foreign key (workspace_id, investigation_id)
    references cfr_app.case_investigations(workspace_id, id) on delete restrict,
  constraint fk_case_investigation_citations_evidence_event
    foreign key (workspace_id, evidence_id, event_id)
    references cfr_app.case_evidence_event_refs(workspace_id, evidence_id, event_id)
    on delete restrict,
  constraint chk_case_investigation_citations_claim check
    (claim_id in ('claim-mobile-conversion', 'claim-mobile-revenue', 'claim-desktop-control'))
);
create index idx_case_investigation_citations_evidence_event
  on cfr_app.case_investigation_citations (workspace_id, evidence_id, event_id);

alter table cfr_app.case_investigations enable row level security;
alter table cfr_app.case_investigations force row level security;
alter table cfr_app.case_investigation_citations enable row level security;
alter table cfr_app.case_investigation_citations force row level security;

create policy case_investigations_owner_read on cfr_app.case_investigations
for select to cfr_trace_reader using (
  workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')
  and exists (select 1 from cfr_app.workspace_members member
    where member.workspace_id = case_investigations.workspace_id
      and member.user_id = nullif((select current_setting('app.current_user_id', true)), '')
      and member.role = 'owner')
);
create policy case_investigation_citations_owner_read on cfr_app.case_investigation_citations
for select to cfr_trace_reader using (
  workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')
  and exists (select 1 from cfr_app.workspace_members member
    where member.workspace_id = case_investigation_citations.workspace_id
      and member.user_id = nullif((select current_setting('app.current_user_id', true)), '')
      and member.role = 'owner')
);

revoke all on cfr_app.case_investigations, cfr_app.case_investigation_citations
  from public, anon, authenticated, service_role, cfr_app_runtime;
grant select on cfr_app.case_investigations, cfr_app.case_investigation_citations
  to cfr_trace_reader;

commit;
