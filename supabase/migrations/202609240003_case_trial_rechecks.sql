begin;

-- A mistaken attestation remains immutable. An owner can mark it as a trial,
-- then record one separate real check without erasing the original receipt.
create unique index uq_case_response_receipt_hash
  on cfr_app.case_response_receipts (workspace_id, response_id, content_hash);

create table cfr_app.case_check_trial_markers (
  workspace_id text not null,
  response_id text not null,
  receipt_hash text not null,
  marked_by text not null,
  reason text not null,
  marked_at timestamptz not null,
  content_hash text not null,
  constraint pk_case_check_trial_markers primary key (workspace_id, response_id),
  constraint uq_case_check_trial_marker_hash unique (workspace_id, response_id, receipt_hash),
  constraint fk_case_check_trial_receipt foreign key (workspace_id, response_id, receipt_hash)
    references cfr_app.case_response_receipts(workspace_id, response_id, content_hash) on delete restrict,
  constraint fk_case_check_trial_owner foreign key (workspace_id, marked_by)
    references cfr_app.workspace_members(workspace_id, user_id) on delete restrict,
  constraint chk_case_check_trial_reason check (reason = 'trial_submission'),
  constraint chk_case_check_trial_hash check (content_hash ~ '^[0-9a-f]{64}$')
);

create table cfr_app.case_check_recheck_receipts (
  workspace_id text not null,
  response_id text not null,
  proposal_hash text not null,
  supersedes_receipt_hash text not null,
  recorded_by text not null,
  run_reference text not null,
  capture_status text not null,
  checked_at timestamptz not null,
  recorded_at timestamptz not null,
  content_hash text not null,
  constraint pk_case_check_recheck_receipts primary key (workspace_id, response_id),
  constraint fk_case_check_recheck_trial foreign key (workspace_id, response_id, supersedes_receipt_hash)
    references cfr_app.case_check_trial_markers(workspace_id, response_id, receipt_hash) on delete restrict,
  constraint fk_case_check_recheck_approval foreign key (workspace_id, response_id)
    references cfr_app.case_response_approvals(workspace_id, response_id) on delete restrict,
  constraint fk_case_check_recheck_proposal foreign key (workspace_id, response_id, proposal_hash)
    references cfr_app.case_response_proposals(workspace_id, id, content_hash) on delete restrict,
  constraint fk_case_check_recheck_owner foreign key (workspace_id, recorded_by)
    references cfr_app.workspace_members(workspace_id, user_id) on delete restrict,
  constraint chk_case_check_recheck_reference check (run_reference ~ '^[A-Za-z0-9_-]{8,64}$'),
  constraint chk_case_check_recheck_capture check (capture_status in ('captured', 'not_captured', 'indeterminate')),
  constraint chk_case_check_recheck_time check (checked_at <= recorded_at),
  constraint chk_case_check_recheck_hash check (content_hash ~ '^[0-9a-f]{64}$')
);
create unique index uq_case_check_recheck_hash
  on cfr_app.case_check_recheck_receipts (workspace_id, response_id, content_hash);

alter table cfr_app.case_check_trial_markers enable row level security;
alter table cfr_app.case_check_trial_markers force row level security;
create policy case_check_trial_owner_read on cfr_app.case_check_trial_markers
for select to cfr_trace_reader, cfr_app_runtime using (
  workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')
  and exists (select 1 from cfr_app.workspace_members member
    where member.workspace_id = case_check_trial_markers.workspace_id
      and member.user_id = nullif((select current_setting('app.current_user_id', true)), '')
      and member.role = 'owner')
);
create policy case_check_trial_owner_insert on cfr_app.case_check_trial_markers
for insert to cfr_app_runtime with check (
  workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')
  and marked_by = nullif((select current_setting('app.current_user_id', true)), '')
  and exists (select 1 from cfr_app.workspace_members member
    where member.workspace_id = case_check_trial_markers.workspace_id
      and member.user_id = case_check_trial_markers.marked_by
      and member.role = 'owner')
);

alter table cfr_app.case_check_recheck_receipts enable row level security;
alter table cfr_app.case_check_recheck_receipts force row level security;
create policy case_check_recheck_owner_read on cfr_app.case_check_recheck_receipts
for select to cfr_trace_reader, cfr_app_runtime using (
  workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')
  and exists (select 1 from cfr_app.workspace_members member
    where member.workspace_id = case_check_recheck_receipts.workspace_id
      and member.user_id = nullif((select current_setting('app.current_user_id', true)), '')
      and member.role = 'owner')
);
create policy case_check_recheck_owner_insert on cfr_app.case_check_recheck_receipts
for insert to cfr_app_runtime with check (
  workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')
  and recorded_by = nullif((select current_setting('app.current_user_id', true)), '')
  and exists (select 1 from cfr_app.workspace_members member
    where member.workspace_id = case_check_recheck_receipts.workspace_id
      and member.user_id = case_check_recheck_receipts.recorded_by
      and member.role = 'owner')
  and exists (select 1 from cfr_app.case_check_trial_markers marker
    join cfr_app.case_response_receipts trial
      on trial.workspace_id = marker.workspace_id and trial.response_id = marker.response_id
    where marker.workspace_id = case_check_recheck_receipts.workspace_id
      and marker.response_id = case_check_recheck_receipts.response_id
      and marker.receipt_hash = case_check_recheck_receipts.supersedes_receipt_hash
      and case_check_recheck_receipts.checked_at > marker.marked_at
      and case_check_recheck_receipts.run_reference <> trial.run_reference)
);

revoke all on cfr_app.case_check_trial_markers, cfr_app.case_check_recheck_receipts
  from public, anon, authenticated, service_role, cfr_app_runtime, cfr_trace_reader;
grant select on cfr_app.case_check_trial_markers, cfr_app.case_check_recheck_receipts
  to cfr_trace_reader, cfr_app_runtime;
grant insert on cfr_app.case_check_trial_markers, cfr_app.case_check_recheck_receipts
  to cfr_app_runtime;

-- Existing follow-up rows are empty in TEST. Bind every future row to the
-- effective receipt hash so a trial cannot become outcome evidence.
alter table cfr_app.case_follow_up_events add column receipt_hash text not null;
alter table cfr_app.case_follow_up_events add constraint chk_case_follow_up_receipt_hash
  check (receipt_hash ~ '^[0-9a-f]{64}$');

create function cfr_app.require_active_case_check_receipt() returns trigger
language plpgsql as $$
declare
  active_hash text;
  active_checked_at timestamptz;
  is_trial boolean;
  has_recheck boolean;
begin
  select coalesce(recheck.content_hash, original.content_hash),
         coalesce(recheck.checked_at, original.checked_at),
         marker.workspace_id is not null, recheck.workspace_id is not null
    into active_hash, active_checked_at, is_trial, has_recheck
  from cfr_app.case_response_receipts original
  left join cfr_app.case_check_trial_markers marker
    on marker.workspace_id = original.workspace_id and marker.response_id = original.response_id
  left join cfr_app.case_check_recheck_receipts recheck
    on recheck.workspace_id = marker.workspace_id and recheck.response_id = marker.response_id
  where original.workspace_id = new.workspace_id and original.response_id = new.response_id;
  if active_hash is null or (is_trial and not has_recheck)
    or new.receipt_hash <> active_hash
    or new.observed_day <= (active_checked_at at time zone 'utc')::date then
    raise exception 'Follow-up requires an active, matching real TEST check receipt';
  end if;
  return new;
end $$;
create trigger trg_case_follow_up_active_receipt
  before insert or update on cfr_app.case_follow_up_events
  for each row execute function cfr_app.require_active_case_check_receipt();

commit;
