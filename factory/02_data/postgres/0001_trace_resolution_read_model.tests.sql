-- Execute after the migration and the Stage 02 FIXTURE package are loaded.
-- The script is transactional and leaves no durable test mutations.

begin;

do $$
declare
  relation_name text;
begin
  if not exists (
    select 1 from pg_roles
    where rolname = 'cfr_trace_reader'
      and not rolsuper and not rolcreatedb and not rolcreaterole and not rolreplication and not rolbypassrls
  ) then
    raise exception 'cfr_trace_reader role attributes are unsafe';
  end if;

  foreach relation_name in array array['workspaces', 'workspace_members', 'flight_traces', 'flight_trace_events'] loop
    if not has_table_privilege('cfr_trace_reader', 'cfr_app.' || relation_name, 'select') then
      raise exception 'reader lacks select on %', relation_name;
    end if;
    if has_table_privilege('cfr_trace_reader', 'cfr_app.' || relation_name, 'insert,update,delete') then
      raise exception 'reader has mutation privileges on %', relation_name;
    end if;
    if has_table_privilege('anon', 'cfr_app.' || relation_name, 'select')
      or has_table_privilege('authenticated', 'cfr_app.' || relation_name, 'select')
      or has_table_privilege('service_role', 'cfr_app.' || relation_name, 'select') then
      raise exception 'Data API role can read %', relation_name;
    end if;
  end loop;

  if has_schema_privilege('anon', 'cfr_app', 'usage')
    or has_schema_privilege('authenticated', 'cfr_app', 'usage')
    or has_schema_privilege('service_role', 'cfr_app', 'usage') then
    raise exception 'Data API role has cfr_app schema usage';
  end if;

  if exists (
    select 1
    from pg_class relation
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'cfr_app'
      and relation.relname in ('workspaces', 'workspace_members', 'flight_traces', 'flight_trace_events')
      and (not relation.relrowsecurity or not relation.relforcerowsecurity)
  ) then
    raise exception 'RLS is not enabled and forced on every read-model table';
  end if;

  if (select count(*) from pg_policies where schemaname = 'cfr_app') <> 4 then
    raise exception 'expected exactly four cfr_app RLS policies';
  end if;
end
$$;

set local role cfr_trace_reader;
select set_config('app.current_user_id', 'l14-owner-a', true);
select set_config('app.current_workspace_id', 'l14-workspace-a', true);

do $$
begin
  if (select count(*) from cfr_app.workspace_members) <> 1 then raise exception 'owner A membership visibility drifted'; end if;
  if (select count(*) from cfr_app.flight_traces) <> 1 then raise exception 'owner A trace visibility drifted'; end if;
  if (select count(*) from cfr_app.flight_trace_events) <> 28 then raise exception 'owner A event visibility drifted'; end if;
  if exists (select 1 from cfr_app.flight_traces where id = 'l14-trace-b') then raise exception 'owner A can see owner B trace'; end if;
  begin
    insert into cfr_app.workspaces (id, name, slug, owner_user_id) values ('forbidden', 'forbidden', 'forbidden', 'forbidden');
    raise exception 'reader mutation unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
end
$$;

rollback;

begin;
set local role cfr_trace_reader;

do $$
begin
  if nullif(current_setting('app.current_user_id', true), '') is not null
    or nullif(current_setting('app.current_workspace_id', true), '') is not null then
    raise exception 'transaction-local tenant context leaked from the prior transaction';
  end if;
  if exists (select 1 from cfr_app.flight_traces) then
    raise exception 'missing tenant context returned rows';
  end if;
end
$$;

select set_config('app.current_user_id', 'l14-owner-b', true);
select set_config('app.current_workspace_id', 'l14-workspace-b', true);

do $$
begin
  if (select count(*) from cfr_app.flight_traces) <> 1 then raise exception 'owner B trace visibility drifted'; end if;
  if (select count(*) from cfr_app.flight_trace_events) <> 49 then raise exception 'owner B event visibility drifted'; end if;
  if exists (select 1 from cfr_app.flight_traces where id = 'l14-trace-a') then raise exception 'owner B can see owner A trace'; end if;
end
$$;

rollback;

begin;

insert into cfr_app.workspaces (id, name, slug, owner_user_id)
values ('contract-workspace', 'Contract workspace', 'contract-workspace', 'contract-owner');
insert into cfr_app.workspace_members (workspace_id, user_id, role)
values ('contract-workspace', 'contract-owner', 'owner');
insert into cfr_app.flight_traces (
  id, workspace_id, trace_key, fixture_key, truth_mode, current_state,
  retention_class, retention_until, created_by
) values (
  'contract-fixture-trace', 'contract-workspace', 'contract-fixture-trace', 'stage-02-contract',
  'FIXTURE', 'collecting', 'review_evidence', '2027-08-31T00:00:00Z', 'contract-owner'
);

insert into cfr_app.flight_trace_events (
  id, workspace_id, trace_id, sequence, event_type, subject_type, subject_id,
  prior_state, current_state, actor_type, actor_id, payload_json, payload_hash,
  idempotency_key, occurred_at
) values (
  'contract-event-1', 'contract-workspace', 'contract-fixture-trace', 1,
  'trace.collecting', 'trace', 'contract-fixture-trace', null, 'collecting',
  'system', null, '{}'::jsonb, repeat('0', 64), 'contract-event-1', '2026-08-13T09:00:01Z'
);

do $$
begin
  begin
    insert into cfr_app.flight_trace_events (
      id, workspace_id, trace_id, sequence, event_type, subject_type, subject_id,
      prior_state, current_state, actor_type, actor_id, payload_json, payload_hash,
      idempotency_key, occurred_at
    ) values (
      'contract-gap', 'contract-workspace', 'contract-fixture-trace', 3,
      'trace.context_frozen', 'trace', 'contract-fixture-trace', 'collecting', 'context_frozen',
      'system', null, '{}'::jsonb, repeat('0', 64), 'contract-gap', '2026-08-13T09:00:03Z'
    );
    raise exception 'sequence gap unexpectedly succeeded';
  exception when check_violation then null;
  end;

  begin
    insert into cfr_app.flight_trace_events (
      id, workspace_id, trace_id, sequence, event_type, subject_type, subject_id,
      prior_state, current_state, actor_type, actor_id, payload_json, payload_hash,
      idempotency_key, occurred_at
    ) values (
      'contract-foreign-subject', 'contract-workspace', 'contract-fixture-trace', 2,
      'trace.context_frozen', 'trace', 'another-trace', 'collecting', 'context_frozen',
      'system', null, '{}'::jsonb, repeat('0', 64), 'contract-foreign-subject', '2026-08-13T09:00:02Z'
    );
    raise exception 'foreign trace subject unexpectedly succeeded';
  exception when check_violation then null;
  end;

  begin
    insert into cfr_app.flight_trace_events (
      id, workspace_id, trace_id, sequence, event_type, subject_type, subject_id,
      prior_state, current_state, actor_type, actor_id, payload_json, payload_hash,
      idempotency_key, occurred_at
    ) values (
      'contract-bad-transition', 'contract-workspace', 'contract-fixture-trace', 2,
      'trace.assessed', 'trace', 'contract-fixture-trace', 'collecting', 'assessed',
      'system', null, '{}'::jsonb, repeat('0', 64), 'contract-bad-transition', '2026-08-13T09:00:02Z'
    );
    raise exception 'invalid transition unexpectedly succeeded';
  exception when check_violation then null;
  end;

  begin
    insert into cfr_app.flight_trace_events (
      id, workspace_id, trace_id, sequence, event_type, subject_type, subject_id,
      prior_state, current_state, actor_type, actor_id, payload_json, payload_hash,
      idempotency_key, occurred_at
    ) values (
      'contract-bad-actor', 'contract-workspace', 'contract-fixture-trace', 2,
      'trace.context_frozen', 'trace', 'contract-fixture-trace', 'collecting', 'context_frozen',
      'human', 'not-a-member', '{}'::jsonb, repeat('0', 64), 'contract-bad-actor', '2026-08-13T09:00:02Z'
    );
    raise exception 'foreign human actor unexpectedly succeeded';
  exception when check_violation then null;
  end;

  begin
    update cfr_app.flight_trace_events set event_type = 'tampered' where id = 'contract-event-1';
    raise exception 'event update unexpectedly succeeded';
  exception when check_violation then null;
  end;
end
$$;

delete from cfr_app.flight_trace_events where id = 'contract-event-1';

insert into cfr_app.flight_traces (
  id, workspace_id, trace_key, truth_mode, current_state,
  retention_class, retention_until, created_by
) values (
  'contract-test-trace', 'contract-workspace', 'contract-test-trace',
  'TEST', 'collecting', 'review_evidence', '2027-08-31T00:00:00Z', 'contract-owner'
);
insert into cfr_app.flight_trace_events (
  id, workspace_id, trace_id, sequence, event_type, subject_type, subject_id,
  prior_state, current_state, actor_type, actor_id, payload_json, payload_hash,
  idempotency_key, occurred_at
) values (
  'contract-test-event-1', 'contract-workspace', 'contract-test-trace', 1,
  'trace.collecting', 'trace', 'contract-test-trace', null, 'collecting',
  'system', null, '{}'::jsonb, repeat('0', 64), 'contract-test-event-1', '2026-08-13T09:00:01Z'
);

do $$
begin
  begin
    delete from cfr_app.flight_trace_events where id = 'contract-test-event-1';
    raise exception 'non-fixture event delete unexpectedly succeeded';
  exception when check_violation then null;
  end;
end
$$;

rollback;
