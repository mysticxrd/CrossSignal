begin;

-- Private Phase 1 read model. Application roles only receive tenant-scoped
-- SELECT; the synthetic setup script is run by the TEST project administrator.
create table cfr_app.case_recorded_events (
  workspace_id text not null references cfr_app.workspaces(id) on delete restrict,
  id text not null,
  scenario_id text not null,
  truth_mode text not null default 'FIXTURE',
  source text not null,
  window_key text not null,
  segment text not null,
  observed_day date not null,
  starts integer not null,
  completed integer not null,
  captures integer not null,
  revenue_cents bigint not null,
  content_hash text not null,
  constraint pk_case_recorded_events primary key (workspace_id, id),
  constraint uq_case_recorded_events_observation unique
    (workspace_id, scenario_id, source, window_key, segment, observed_day),
  constraint chk_case_recorded_events_truth check (truth_mode = 'FIXTURE'),
  constraint chk_case_recorded_events_source check (source in ('checkout_analytics', 'payment_ledger')),
  constraint chk_case_recorded_events_window check (window_key in ('baseline', 'observed')),
  constraint chk_case_recorded_events_segment check (segment in ('mobile_safari', 'desktop')),
  constraint chk_case_recorded_events_nonnegative check
    (starts >= 0 and completed >= 0 and captures >= 0 and revenue_cents >= 0),
  constraint chk_case_recorded_events_shape check (
    (source = 'checkout_analytics' and starts > 0 and completed <= starts
      and captures = 0 and revenue_cents = 0)
    or (source = 'payment_ledger' and starts = 0 and completed = 0)
  ),
  constraint chk_case_recorded_events_hash check (content_hash ~ '^[0-9a-f]{64}$')
);

create table cfr_app.detected_cases (
  workspace_id text not null references cfr_app.workspaces(id) on delete restrict,
  id text not null,
  scenario_id text not null,
  scenario_version integer not null,
  scenario_hash text not null,
  title text not null,
  status text not null,
  truth_mode text not null default 'FIXTURE',
  content_hash text not null,
  created_at timestamptz not null default now(),
  constraint pk_detected_cases primary key (workspace_id, id),
  constraint uq_detected_cases_scenario unique (workspace_id, scenario_id),
  constraint chk_detected_cases_version check (scenario_version >= 1),
  constraint chk_detected_cases_status check (status in ('detected', 'no_signal')),
  constraint chk_detected_cases_truth check (truth_mode = 'FIXTURE'),
  constraint chk_detected_cases_hashes check
    (scenario_hash ~ '^[0-9a-f]{64}$' and content_hash ~ '^[0-9a-f]{64}$')
);

create table cfr_app.case_signals (
  workspace_id text not null,
  id text not null,
  case_id text not null,
  kind text not null,
  method_version text not null,
  detected boolean not null,
  metrics_json jsonb not null,
  content_hash text not null,
  created_at timestamptz not null default now(),
  constraint pk_case_signals primary key (workspace_id, id),
  constraint uq_case_signals_case_method unique (workspace_id, case_id, method_version),
  constraint fk_case_signals_case foreign key (workspace_id, case_id)
    references cfr_app.detected_cases(workspace_id, id) on delete restrict,
  constraint chk_case_signals_kind check (kind = 'conversion_drop'),
  constraint chk_case_signals_metrics check (jsonb_typeof(metrics_json) = 'object'),
  constraint chk_case_signals_hash check (content_hash ~ '^[0-9a-f]{64}$')
);

create table cfr_app.case_evidence (
  workspace_id text not null,
  id text not null,
  case_id text not null,
  source text not null,
  relation text not null,
  claim text not null,
  truth_mode text not null default 'FIXTURE',
  content_hash text not null,
  constraint pk_case_evidence primary key (workspace_id, id),
  constraint fk_case_evidence_case foreign key (workspace_id, case_id)
    references cfr_app.detected_cases(workspace_id, id) on delete restrict,
  constraint chk_case_evidence_source check (source in ('checkout_analytics', 'payment_ledger')),
  constraint chk_case_evidence_relation check (relation in ('supports', 'contradicts')),
  constraint chk_case_evidence_truth check (truth_mode = 'FIXTURE'),
  constraint chk_case_evidence_hash check (content_hash ~ '^[0-9a-f]{64}$')
);
create index idx_case_evidence_case
  on cfr_app.case_evidence (workspace_id, case_id);

create table cfr_app.case_evidence_event_refs (
  workspace_id text not null,
  evidence_id text not null,
  event_id text not null,
  constraint pk_case_evidence_event_refs primary key (workspace_id, evidence_id, event_id),
  constraint fk_case_evidence_event_refs_evidence foreign key (workspace_id, evidence_id)
    references cfr_app.case_evidence(workspace_id, id) on delete restrict,
  constraint fk_case_evidence_event_refs_event foreign key (workspace_id, event_id)
    references cfr_app.case_recorded_events(workspace_id, id) on delete restrict
);
create index idx_case_evidence_event_refs_event
  on cfr_app.case_evidence_event_refs (workspace_id, event_id);

alter table cfr_app.case_recorded_events enable row level security;
alter table cfr_app.case_recorded_events force row level security;
alter table cfr_app.detected_cases enable row level security;
alter table cfr_app.detected_cases force row level security;
alter table cfr_app.case_signals enable row level security;
alter table cfr_app.case_signals force row level security;
alter table cfr_app.case_evidence enable row level security;
alter table cfr_app.case_evidence force row level security;
alter table cfr_app.case_evidence_event_refs enable row level security;
alter table cfr_app.case_evidence_event_refs force row level security;

create policy case_recorded_events_owner_read on cfr_app.case_recorded_events
for select to cfr_trace_reader using (
  workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')
  and exists (select 1 from cfr_app.workspace_members member
    where member.workspace_id = case_recorded_events.workspace_id
      and member.user_id = nullif((select current_setting('app.current_user_id', true)), '')
      and member.role = 'owner')
);
create policy detected_cases_owner_read on cfr_app.detected_cases
for select to cfr_trace_reader using (
  workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')
  and exists (select 1 from cfr_app.workspace_members member
    where member.workspace_id = detected_cases.workspace_id
      and member.user_id = nullif((select current_setting('app.current_user_id', true)), '')
      and member.role = 'owner')
);
create policy case_signals_owner_read on cfr_app.case_signals
for select to cfr_trace_reader using (
  workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')
  and exists (select 1 from cfr_app.workspace_members member
    where member.workspace_id = case_signals.workspace_id
      and member.user_id = nullif((select current_setting('app.current_user_id', true)), '')
      and member.role = 'owner')
);
create policy case_evidence_owner_read on cfr_app.case_evidence
for select to cfr_trace_reader using (
  workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')
  and exists (select 1 from cfr_app.workspace_members member
    where member.workspace_id = case_evidence.workspace_id
      and member.user_id = nullif((select current_setting('app.current_user_id', true)), '')
      and member.role = 'owner')
);
create policy case_evidence_event_refs_owner_read on cfr_app.case_evidence_event_refs
for select to cfr_trace_reader using (
  workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')
  and exists (select 1 from cfr_app.workspace_members member
    where member.workspace_id = case_evidence_event_refs.workspace_id
      and member.user_id = nullif((select current_setting('app.current_user_id', true)), '')
      and member.role = 'owner')
);

revoke all on cfr_app.case_recorded_events, cfr_app.detected_cases,
  cfr_app.case_signals, cfr_app.case_evidence, cfr_app.case_evidence_event_refs
  from public, anon, authenticated, service_role, cfr_app_runtime;
grant select on cfr_app.case_recorded_events, cfr_app.detected_cases,
  cfr_app.case_signals, cfr_app.case_evidence, cfr_app.case_evidence_event_refs
  to cfr_trace_reader;

commit;
