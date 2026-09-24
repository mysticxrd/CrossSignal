begin;

-- Follow-up fixture observations are separate from the 56 immutable incident
-- events. Only the TEST scenario administrator imports them after a receipt.
create table cfr_app.case_follow_up_events (
  workspace_id text not null,
  id text not null,
  case_id text not null,
  response_id text not null,
  truth_mode text not null default 'FIXTURE',
  source text not null,
  segment text not null,
  observed_day date not null,
  starts integer not null,
  completed integer not null,
  captures integer not null,
  revenue_cents bigint not null,
  content_hash text not null,
  recorded_at timestamptz not null default now(),
  constraint pk_case_follow_up_events primary key (workspace_id, id),
  constraint uq_case_follow_up_observation unique (workspace_id, response_id, source, observed_day),
  constraint fk_case_follow_up_case foreign key (workspace_id, case_id)
    references cfr_app.detected_cases(workspace_id, id) on delete restrict,
  constraint fk_case_follow_up_receipt foreign key (workspace_id, response_id)
    references cfr_app.case_response_receipts(workspace_id, response_id) on delete restrict,
  constraint chk_case_follow_up_truth check (truth_mode = 'FIXTURE'),
  constraint chk_case_follow_up_source check (source in ('checkout_analytics', 'payment_ledger')),
  constraint chk_case_follow_up_segment check (segment = 'mobile_safari'),
  constraint chk_case_follow_up_day check (observed_day <= (recorded_at at time zone 'utc')::date),
  constraint chk_case_follow_up_nonnegative check
    (starts >= 0 and completed >= 0 and captures >= 0 and revenue_cents >= 0),
  constraint chk_case_follow_up_shape check (
    (source = 'checkout_analytics' and starts > 0 and completed <= starts
      and captures = 0 and revenue_cents = 0)
    or (source = 'payment_ledger' and starts = 0 and completed = 0
      and ((captures = 0 and revenue_cents = 0) or (captures > 0 and revenue_cents > 0)))
  ),
  constraint chk_case_follow_up_hash check (content_hash ~ '^[0-9a-f]{64}$')
);
create index idx_case_follow_up_case on cfr_app.case_follow_up_events (workspace_id, case_id);
create index idx_case_follow_up_receipt on cfr_app.case_follow_up_events (workspace_id, response_id);

alter table cfr_app.case_follow_up_events enable row level security;
alter table cfr_app.case_follow_up_events force row level security;
create policy case_follow_up_events_owner_read on cfr_app.case_follow_up_events
for select to cfr_trace_reader using (
  workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')
  and exists (select 1 from cfr_app.workspace_members member
    where member.workspace_id = case_follow_up_events.workspace_id
      and member.user_id = nullif((select current_setting('app.current_user_id', true)), '')
      and member.role = 'owner')
);
revoke all on cfr_app.case_follow_up_events
  from public, anon, authenticated, service_role, cfr_app_runtime, cfr_trace_reader;
grant select on cfr_app.case_follow_up_events to cfr_trace_reader;

commit;
