begin;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'cfr_app_runtime') then
    create role cfr_app_runtime
      nologin nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
  end if;
end
$$;

grant cfr_app_runtime to postgres;
grant usage on schema cfr_app to cfr_app_runtime;

create table cfr_app.workspace_runtime_states (
  workspace_id text primary key references cfr_app.workspaces(id) on delete cascade,
  version bigint not null,
  snapshot_json jsonb not null,
  updated_at timestamptz not null default now(),
  constraint chk_workspace_runtime_states_version check (version >= 1),
  constraint chk_workspace_runtime_states_object check (jsonb_typeof(snapshot_json) = 'object'),
  constraint chk_workspace_runtime_states_binding check (snapshot_json ->> 'workspaceId' = workspace_id),
  constraint chk_workspace_runtime_states_truth check (snapshot_json ->> 'truthMode' = 'FIXTURE')
);

create table cfr_app.workspace_runtime_events (
  workspace_id text not null references cfr_app.workspaces(id) on delete cascade,
  sequence bigint not null,
  event_type text not null,
  actor_user_id text not null,
  payload_json jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint pk_workspace_runtime_events primary key (workspace_id, sequence),
  constraint chk_workspace_runtime_events_sequence check (sequence >= 1),
  constraint chk_workspace_runtime_events_type check (event_type in (
    'runtime.initialized',
    'intent.replaced',
    'authority.paused',
    'authority.resumed',
    'action.confirmed',
    'action.failed',
    'action.indeterminate',
    'fixture.reset'
  )),
  constraint fk_workspace_runtime_events_actor
    foreign key (workspace_id, actor_user_id)
    references cfr_app.workspace_members(workspace_id, user_id)
    on delete restrict
);

create index idx_workspace_runtime_events_actor
  on cfr_app.workspace_runtime_events (workspace_id, actor_user_id);

alter table cfr_app.workspace_runtime_states enable row level security;
alter table cfr_app.workspace_runtime_states force row level security;
alter table cfr_app.workspace_runtime_events enable row level security;
alter table cfr_app.workspace_runtime_events force row level security;

create policy workspace_members_runtime_read on cfr_app.workspace_members
for select to cfr_app_runtime
using (
  user_id = nullif((select current_setting('app.current_user_id', true)), '')
  and role = 'owner'
  and (
    nullif((select current_setting('app.current_workspace_id', true)), '') is null
    or workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')
  )
);

create policy workspace_members_runtime_create on cfr_app.workspace_members
for insert to cfr_app_runtime
with check (
  workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')
  and user_id = nullif((select current_setting('app.current_user_id', true)), '')
  and role = 'owner'
);

create policy workspaces_runtime_read on cfr_app.workspaces
for select to cfr_app_runtime
using (
  owner_user_id = nullif((select current_setting('app.current_user_id', true)), '')
  and (
    nullif((select current_setting('app.current_workspace_id', true)), '') is null
    or id = nullif((select current_setting('app.current_workspace_id', true)), '')
  )
);

create policy workspaces_runtime_create on cfr_app.workspaces
for insert to cfr_app_runtime
with check (
  id = nullif((select current_setting('app.current_workspace_id', true)), '')
  and owner_user_id = nullif((select current_setting('app.current_user_id', true)), '')
);

create policy workspace_runtime_states_owner_read on cfr_app.workspace_runtime_states
for select to cfr_app_runtime
using (
  workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')
  and exists (
    select 1 from cfr_app.workspace_members member
    where member.workspace_id = workspace_runtime_states.workspace_id
      and member.user_id = nullif((select current_setting('app.current_user_id', true)), '')
      and member.role = 'owner'
  )
);

create policy workspace_runtime_states_owner_create on cfr_app.workspace_runtime_states
for insert to cfr_app_runtime
with check (
  workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')
  and exists (
    select 1 from cfr_app.workspace_members member
    where member.workspace_id = workspace_runtime_states.workspace_id
      and member.user_id = nullif((select current_setting('app.current_user_id', true)), '')
      and member.role = 'owner'
  )
);

create policy workspace_runtime_states_owner_update on cfr_app.workspace_runtime_states
for update to cfr_app_runtime
using (
  workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')
  and exists (
    select 1 from cfr_app.workspace_members member
    where member.workspace_id = workspace_runtime_states.workspace_id
      and member.user_id = nullif((select current_setting('app.current_user_id', true)), '')
      and member.role = 'owner'
  )
)
with check (
  workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')
  and exists (
    select 1 from cfr_app.workspace_members member
    where member.workspace_id = workspace_runtime_states.workspace_id
      and member.user_id = nullif((select current_setting('app.current_user_id', true)), '')
      and member.role = 'owner'
  )
);

create policy workspace_runtime_events_owner_read on cfr_app.workspace_runtime_events
for select to cfr_app_runtime
using (
  workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')
  and actor_user_id = nullif((select current_setting('app.current_user_id', true)), '')
);

create policy workspace_runtime_events_owner_create on cfr_app.workspace_runtime_events
for insert to cfr_app_runtime
with check (
  workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')
  and actor_user_id = nullif((select current_setting('app.current_user_id', true)), '')
  and exists (
    select 1 from cfr_app.workspace_members member
    where member.workspace_id = workspace_runtime_events.workspace_id
      and member.user_id = workspace_runtime_events.actor_user_id
      and member.role = 'owner'
  )
);

revoke all on cfr_app.workspace_runtime_states, cfr_app.workspace_runtime_events
  from public, anon, authenticated, service_role, cfr_trace_reader;
grant select, insert, update on cfr_app.workspaces to cfr_app_runtime;
grant select, insert on cfr_app.workspace_members to cfr_app_runtime;
grant select, insert, update on cfr_app.workspace_runtime_states to cfr_app_runtime;
grant select, insert on cfr_app.workspace_runtime_events to cfr_app_runtime;

commit;
