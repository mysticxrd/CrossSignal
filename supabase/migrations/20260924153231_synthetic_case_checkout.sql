-- Additive TEST-only correction. Apply through the existing selected project.
begin;
create table cfr_app.case_simulated_checkouts (
  workspace_id text not null,
  case_id text not null,
  response_id text not null,
  proposal_hash text not null,
  run_id text not null unique,
  scenario text not null check (scenario in ('capture', 'decline')),
  recorded_by text not null,
  executed_at timestamptz not null,
  truth_mode text not null check (truth_mode = 'SIMULATED'),
  artifact_json jsonb not null,
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  primary key (workspace_id, run_id),
  foreign key (workspace_id, case_id) references cfr_app.detected_cases(workspace_id, id) on delete restrict,
  foreign key (workspace_id, response_id, proposal_hash) references cfr_app.case_response_proposals(workspace_id, id, content_hash) on delete restrict,
  foreign key (workspace_id, recorded_by) references cfr_app.workspace_members(workspace_id, user_id) on delete restrict,
  constraint simulated_run_id check (run_id ~ '^sim_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
  constraint simulated_artifact check ((
    jsonb_typeof(artifact_json) = 'object'
    and artifact_json->>'workspaceId' = workspace_id
    and artifact_json->>'caseId' = case_id
    and artifact_json->>'responseId' = response_id
    and artifact_json->>'proposalHash' = proposal_hash
    and artifact_json->>'runId' = run_id
    and artifact_json->>'recordedBy' = recorded_by
    and artifact_json->>'scenario' = scenario
    and (artifact_json->>'executedAt')::timestamptz = executed_at
    and artifact_json->>'truthMode' = 'SIMULATED'
    and artifact_json->>'environment' = 'TEST'
    and artifact_json->>'methodVersion' = 'synthetic-checkout-v1'
    and artifact_json->>'chargedCents' = '0'
    and artifact_json->>'orderCents' = '5000'
    and artifact_json->>'deviceVerification' = 'pending'
    and artifact_json->>'businessOutcome' = 'not_measured'
    and artifact_json->>'captureStatus' = case when scenario = 'capture' then 'simulated_captured' else 'simulated_declined' end
    and jsonb_array_length(artifact_json->'events') = 3
  ) is true)
);
create index idx_simulated_checkout_case on cfr_app.case_simulated_checkouts(workspace_id, case_id);
create index idx_simulated_checkout_response on cfr_app.case_simulated_checkouts(workspace_id, response_id, proposal_hash);
create index idx_simulated_checkout_owner on cfr_app.case_simulated_checkouts(workspace_id, recorded_by);
alter table cfr_app.case_simulated_checkouts enable row level security;
alter table cfr_app.case_simulated_checkouts force row level security;
create policy simulated_checkout_owner_read on cfr_app.case_simulated_checkouts
for select to cfr_trace_reader, cfr_app_runtime using (
  workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')
  and exists (select 1 from cfr_app.workspace_members m where m.workspace_id = case_simulated_checkouts.workspace_id
    and m.user_id = nullif((select current_setting('app.current_user_id', true)), '') and m.role = 'owner')
);
create policy simulated_checkout_owner_insert on cfr_app.case_simulated_checkouts
for insert to cfr_app_runtime with check (
  workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')
  and recorded_by = nullif((select current_setting('app.current_user_id', true)), '')
  and exists (select 1 from cfr_app.workspace_members m where m.workspace_id = case_simulated_checkouts.workspace_id
    and m.user_id = case_simulated_checkouts.recorded_by and m.role = 'owner')
  and exists (select 1 from cfr_app.case_response_proposals p where p.workspace_id = case_simulated_checkouts.workspace_id
    and p.id = case_simulated_checkouts.response_id and p.case_id = case_simulated_checkouts.case_id
    and p.content_hash = case_simulated_checkouts.proposal_hash)
);
revoke all on cfr_app.case_simulated_checkouts from public, anon, authenticated, service_role, cfr_trace_reader, cfr_app_runtime;
grant select on cfr_app.case_simulated_checkouts to cfr_trace_reader, cfr_app_runtime;
grant insert on cfr_app.case_simulated_checkouts to cfr_app_runtime;

create function cfr_app.limit_simulated_checkout_runs() returns trigger
language plpgsql security invoker set search_path = pg_catalog, cfr_app as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.workspace_id || '/' || new.case_id || '/synthetic-checkout', 0));
  if not exists (select 1 from cfr_app.case_simulated_checkouts where workspace_id = new.workspace_id and run_id = new.run_id)
    and (select count(*) from cfr_app.case_simulated_checkouts where workspace_id = new.workspace_id and case_id = new.case_id) >= 20 then
    raise exception 'Synthetic checkout run limit reached' using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function cfr_app.limit_simulated_checkout_runs() from public, anon, authenticated, service_role;
create trigger trg_limit_simulated_checkout_runs before insert on cfr_app.case_simulated_checkouts
for each row execute function cfr_app.limit_simulated_checkout_runs();

-- Reserved IDs cannot be submitted as owner-attested real-device receipts.
alter table cfr_app.case_response_receipts add constraint receipt_not_simulated check (run_reference !~* '^sim_');
alter table cfr_app.case_check_recheck_receipts add constraint recheck_not_simulated check (run_reference !~* '^sim_');
commit;
