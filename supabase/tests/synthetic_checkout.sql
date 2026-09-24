-- Run only on the selected TEST project. Every test row rolls back.
begin;
create temporary table checkout_test_context as
select p.workspace_id, p.case_id, p.id response_id, p.content_hash proposal_hash, a.approved_by owner_id
from cfr_app.case_response_proposals p join cfr_app.case_response_approvals a
on a.workspace_id=p.workspace_id and a.response_id=p.id
where p.workspace_id='l14-workspace-a' and p.case_id='case-golden-mobile-checkout';
grant select on checkout_test_context to cfr_app_runtime;

create function pg_temp.checkout_test_insert(n integer, mode text default 'capture', truth text default 'SIMULATED') returns void
language plpgsql security invoker as $$
declare c record; run text; a jsonb; t text := '2026-09-24T16:00:00.000Z'; result text;
begin
  select * into strict c from checkout_test_context;
  run := 'sim_00000000-0000-4000-8000-' || lpad(n::text,12,'0');
  result := case when mode='capture' then 'simulated_captured' else 'simulated_declined' end;
  a := jsonb_build_object('workspaceId',c.workspace_id,'caseId',c.case_id,'responseId',c.response_id,
    'proposalHash',c.proposal_hash,'runId',run,'scenario',mode,'recordedBy',c.owner_id,'executedAt',t,
    'methodVersion','synthetic-checkout-v1','truthMode',truth,'environment','TEST',
    'product','Synthetic test order','currency','USD','orderCents',5000,'chargedCents',0,
    'captureStatus',result,'deviceVerification','pending','businessOutcome','not_measured',
    'events',jsonb_build_array(
      jsonb_build_object('id',run||'-started','sequence',1,'type','simulated_checkout_started','at',t),
      jsonb_build_object('id',run||'-capture','sequence',2,'type',result,'at',t),
      jsonb_build_object('id',run||'-completed','sequence',3,'type','simulated_checkout_completed','at',t)));
  insert into cfr_app.case_simulated_checkouts(workspace_id,case_id,response_id,proposal_hash,
    run_id,scenario,recorded_by,executed_at,truth_mode,artifact_json,content_hash)
  values(c.workspace_id,c.case_id,c.response_id,c.proposal_hash,run,mode,c.owner_id,t::timestamptz,truth,a,repeat('a',64));
end $$;

select set_config('app.current_workspace_id','l14-workspace-a',true),
  set_config('app.current_user_id',(select owner_id from checkout_test_context),true);
set local role cfr_app_runtime;
select pg_temp.checkout_test_insert(1);
select pg_temp.checkout_test_insert(2,'decline');
do $$ begin
  if (select count(*) from cfr_app.case_simulated_checkouts where run_id like 'sim_00000000-%') <> 2 then
    raise exception 'Owner cannot read two simulations'; end if;
  begin perform pg_temp.checkout_test_insert(1); raise exception 'Duplicate run accepted';
    exception when unique_violation then null; end;
  begin perform pg_temp.checkout_test_insert(3,'capture','LIVE'); raise exception 'LIVE result accepted';
    exception when check_violation then null; end;
  begin update cfr_app.case_simulated_checkouts set scenario='decline'; raise exception 'Update accepted';
    exception when insufficient_privilege then null; end;
  begin delete from cfr_app.case_simulated_checkouts; raise exception 'Delete accepted';
    exception when insufficient_privilege then null; end;
end $$;

select set_config('app.current_user_id','sha256:'||repeat('f',64),true);
do $$ begin
  if exists(select 1 from cfr_app.case_simulated_checkouts) then raise exception 'Foreign principal read simulations'; end if;
  begin perform pg_temp.checkout_test_insert(3); raise exception 'Foreign principal inserted simulation';
    exception when insufficient_privilege then null; end;
end $$;
select set_config('app.current_user_id','',true);
do $$ begin
  if exists(select 1 from cfr_app.case_simulated_checkouts) then raise exception 'Missing principal read simulations'; end if;
end $$;
select set_config('app.current_user_id',(select owner_id from checkout_test_context),true);
select set_config('app.current_workspace_id','phase1-golden-a',true);
do $$ begin
  if exists(select 1 from cfr_app.case_simulated_checkouts) then raise exception 'Cross-workspace read simulations'; end if;
  begin perform pg_temp.checkout_test_insert(3); raise exception 'Cross-workspace insert accepted';
    exception when insufficient_privilege then null; end;
end $$;
select set_config('app.current_workspace_id','l14-workspace-a',true);
do $$ declare existing integer; begin
  select count(*) into existing from cfr_app.case_simulated_checkouts;
  for n in 3..(22-existing) loop perform pg_temp.checkout_test_insert(n); end loop;
  if (select count(*) from cfr_app.case_simulated_checkouts) <> 20 then raise exception 'Cap setup differs'; end if;
  begin perform pg_temp.checkout_test_insert(99); raise exception '21st run accepted';
    exception when check_violation then null; end;
end $$;

reset role;
do $$ begin
  if has_table_privilege('anon','cfr_app.case_simulated_checkouts','SELECT')
    or has_table_privilege('authenticated','cfr_app.case_simulated_checkouts','INSERT')
    or has_table_privilege('service_role','cfr_app.case_simulated_checkouts','SELECT') then
    raise exception 'Unexpected public grant'; end if;
  begin
    insert into cfr_app.case_check_recheck_receipts(workspace_id,response_id,proposal_hash,
      supersedes_receipt_hash,recorded_by,run_reference,capture_status,checked_at,recorded_at,content_hash)
    select c.workspace_id,c.response_id,c.proposal_hash,m.receipt_hash,c.owner_id,
      'sim_00000000-0000-4000-8000-000000000001','captured',now(),now(),repeat('a',64)
    from checkout_test_context c join cfr_app.case_check_trial_markers m
      on m.workspace_id=c.workspace_id and m.response_id=c.response_id;
    raise exception 'Simulation accepted as real receipt';
  exception when check_violation then null; end;
  begin
    insert into cfr_app.case_follow_up_events(workspace_id,id,case_id,response_id,truth_mode,source,
      segment,observed_day,starts,completed,captures,revenue_cents,content_hash,receipt_hash)
    select workspace_id,'simulation-follow-up-must-fail',case_id,response_id,'FIXTURE',
      'checkout_analytics','mobile_safari','2026-09-26',20,4,0,0,repeat('b',64),repeat('a',64)
    from checkout_test_context;
    raise exception 'Simulation supplied follow-up evidence' using errcode='23514';
  exception when raise_exception then null; end;
end $$;
select 'PASS: owner read/write, foreign/missing/cross-workspace isolation, truth boundary, duplicate rejection, append-only grants, 20-run cap, no simulated real receipt or outcome' as result;
rollback;
