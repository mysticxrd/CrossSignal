begin;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'cfr_trace_reader') then
    create role cfr_trace_reader
      nologin nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
  end if;
end
$$;

-- The hosted SQL Editor runs as the non-superuser project administrator.
-- Membership permits explicit SET ROLE checks without changing app access.
grant cfr_trace_reader to postgres;

create schema cfr_app;
revoke all on schema cfr_app from public, anon, authenticated, service_role;
grant usage on schema cfr_app to cfr_trace_reader;

create table cfr_app.workspaces (
  id text primary key,
  name text not null,
  slug text not null,
  owner_user_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_workspaces_slug unique (slug)
);

create index idx_workspaces_owner_user_id on cfr_app.workspaces (owner_user_id);
create index idx_workspaces_owner_membership on cfr_app.workspaces (id, owner_user_id);

create table cfr_app.workspace_members (
  workspace_id text not null references cfr_app.workspaces(id) on delete cascade,
  user_id text not null,
  role text not null,
  joined_at timestamptz not null default now(),
  constraint pk_workspace_members primary key (workspace_id, user_id),
  constraint chk_workspace_members_role check (role = 'owner')
);

create index idx_workspace_members_user_id on cfr_app.workspace_members (user_id);

alter table cfr_app.workspaces
  add constraint fk_workspaces_owner_membership
  foreign key (id, owner_user_id)
  references cfr_app.workspace_members(workspace_id, user_id)
  deferrable initially deferred;

create table cfr_app.flight_traces (
  id text primary key,
  workspace_id text not null references cfr_app.workspaces(id) on delete cascade,
  trace_key text not null,
  fixture_key text,
  truth_mode text not null,
  current_state text not null default 'collecting',
  active_intent_id text,
  retention_class text not null,
  retention_until timestamptz not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_flight_traces_workspace_key unique (workspace_id, trace_key),
  constraint uq_flight_traces_workspace_id unique (workspace_id, id),
  constraint fk_flight_traces_workspace_creator_membership
    foreign key (workspace_id, created_by)
    references cfr_app.workspace_members(workspace_id, user_id)
    on delete restrict,
  constraint chk_flight_traces_truth_mode check (truth_mode in ('LIVE', 'TEST', 'FIXTURE')),
  constraint chk_flight_traces_state check (current_state in (
    'collecting', 'context_frozen', 'reasoning', 'awaiting_approval',
    'executing', 'observing', 'assessed', 'failed', 'cancelled'
  )),
  constraint chk_flight_traces_retention check (retention_class in ('ephemeral_demo', 'review_evidence')),
  constraint chk_flight_traces_fixture_label check (truth_mode <> 'FIXTURE' or fixture_key is not null)
);

create index idx_flight_traces_workspace_state on cfr_app.flight_traces (workspace_id, current_state);
create index idx_flight_traces_workspace_active_intent on cfr_app.flight_traces (workspace_id, active_intent_id);
create index idx_flight_traces_workspace_creator on cfr_app.flight_traces (workspace_id, created_by);

create table cfr_app.flight_trace_events (
  id text primary key,
  workspace_id text not null references cfr_app.workspaces(id) on delete cascade,
  trace_id text not null,
  sequence bigint not null,
  event_type text not null,
  subject_type text not null,
  subject_id text not null,
  prior_state text,
  current_state text not null,
  actor_type text not null,
  actor_id text,
  payload_json jsonb not null default '{}'::jsonb,
  payload_hash text not null,
  idempotency_key text not null,
  occurred_at timestamptz not null,
  constraint uq_flight_trace_events_workspace_id unique (workspace_id, id),
  constraint uq_flight_trace_events_sequence unique (workspace_id, trace_id, sequence),
  constraint uq_flight_trace_events_idempotency unique (workspace_id, idempotency_key),
  constraint fk_flight_trace_events_workspace_trace
    foreign key (workspace_id, trace_id)
    references cfr_app.flight_traces(workspace_id, id)
    on delete cascade,
  constraint chk_flight_trace_events_sequence check (sequence >= 1),
  constraint chk_flight_trace_events_subject_type check (subject_type in (
    'trace', 'context', 'graph', 'intent', 'policy', 'approval', 'effect', 'outcome'
  )),
  constraint chk_flight_trace_events_actor_type check (actor_type in ('human', 'system', 'agent', 'adapter')),
  constraint chk_flight_trace_events_payload_hash check (payload_hash ~ '^[0-9a-f]{64}$')
);

create index idx_flight_trace_events_subject
  on cfr_app.flight_trace_events (workspace_id, subject_type, subject_id);
create index idx_flight_trace_events_trace_order
  on cfr_app.flight_trace_events (workspace_id, trace_id, sequence);

create function cfr_app.reject_flight_trace_identity_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if row(
    new.id, new.workspace_id, new.trace_key, new.fixture_key, new.truth_mode,
    new.retention_class, new.retention_until, new.created_by, new.created_at
  ) is distinct from row(
    old.id, old.workspace_id, old.trace_key, old.fixture_key, old.truth_mode,
    old.retention_class, old.retention_until, old.created_by, old.created_at
  ) then
    raise exception using errcode = '23514', message = 'flight trace identity and truth are immutable';
  end if;
  return new;
end
$$;

create trigger trg_flight_traces_identity_immutable
before update on cfr_app.flight_traces
for each row execute function cfr_app.reject_flight_trace_identity_change();

create function cfr_app.guard_flight_trace_event_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  source_truth_mode text;
begin
  if tg_op = 'UPDATE' then
    raise exception using errcode = '23514', message = 'flight trace events are append-only';
  end if;
  select trace.truth_mode into source_truth_mode
  from cfr_app.flight_traces trace
  where trace.workspace_id = old.workspace_id and trace.id = old.trace_id;
  if source_truth_mode is distinct from 'FIXTURE' then
    raise exception using errcode = '23514', message = 'non-fixture flight trace events cannot be deleted';
  end if;
  return old;
end
$$;

create trigger trg_flight_trace_events_update_guard
before update on cfr_app.flight_trace_events
for each row execute function cfr_app.guard_flight_trace_event_mutation();

create trigger trg_flight_trace_events_delete_guard
before delete on cfr_app.flight_trace_events
for each row execute function cfr_app.guard_flight_trace_event_mutation();

create function cfr_app.is_allowed_subject_transition(
  checked_subject_type text,
  checked_prior_state text,
  checked_current_state text
)
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
  select coalesce(case checked_subject_type
    when 'trace' then
      (checked_prior_state is null and checked_current_state = 'collecting') or
      (checked_prior_state = 'collecting' and checked_current_state in ('context_frozen', 'failed', 'cancelled')) or
      (checked_prior_state = 'context_frozen' and checked_current_state in ('reasoning', 'failed', 'cancelled')) or
      (checked_prior_state = 'reasoning' and checked_current_state in ('awaiting_approval', 'failed', 'cancelled')) or
      (checked_prior_state = 'awaiting_approval' and checked_current_state in ('executing', 'failed', 'cancelled')) or
      (checked_prior_state = 'executing' and checked_current_state in ('observing', 'failed', 'cancelled')) or
      (checked_prior_state = 'observing' and checked_current_state in ('assessed', 'failed', 'cancelled'))
    when 'context' then
      (checked_prior_state is null and checked_current_state = 'collecting') or
      (checked_prior_state = 'collecting' and checked_current_state = 'frozen') or
      (checked_prior_state = 'frozen' and checked_current_state = 'superseded')
    when 'graph' then
      (checked_prior_state is null and checked_current_state = 'pending') or
      (checked_prior_state = 'pending' and checked_current_state in ('running', 'skipped')) or
      (checked_prior_state = 'running' and checked_current_state in ('succeeded', 'failed'))
    when 'intent' then
      (checked_prior_state is null and checked_current_state = 'drafted') or
      (checked_prior_state = 'drafted' and checked_current_state in ('sealed', 'discarded')) or
      (checked_prior_state = 'sealed' and checked_current_state in ('expired', 'superseded', 'policy_evaluated')) or
      (checked_prior_state = 'policy_evaluated' and checked_current_state in ('expired', 'superseded', 'approval_pending')) or
      (checked_prior_state = 'approval_pending' and checked_current_state in ('approved', 'rejected', 'expired', 'superseded')) or
      (checked_prior_state = 'approved' and checked_current_state in ('consumed', 'expired', 'superseded'))
    when 'policy' then
      (checked_prior_state is null and checked_current_state = 'unevaluated') or
      (checked_prior_state = 'unevaluated' and checked_current_state in ('deny', 'allow', 'approval_required'))
    when 'approval' then
      (checked_prior_state is null and checked_current_state = 'pending') or
      (checked_prior_state = 'pending' and checked_current_state in ('approved', 'rejected', 'expired')) or
      (checked_prior_state = 'approved' and checked_current_state in ('consumed', 'expired'))
    when 'effect' then
      (checked_prior_state is null and checked_current_state = 'reserved') or
      (checked_prior_state = 'reserved' and checked_current_state in ('dispatching', 'failed')) or
      (checked_prior_state = 'dispatching' and checked_current_state in ('confirmed', 'failed', 'indeterminate')) or
      (checked_prior_state = 'indeterminate' and checked_current_state in ('reconciled_confirmed', 'reconciled_failed'))
    when 'outcome' then
      (checked_prior_state is null and checked_current_state = 'preregistered') or
      (checked_prior_state = 'preregistered' and checked_current_state in ('observed', 'inconclusive')) or
      (checked_prior_state = 'observed' and checked_current_state in ('assessed', 'inconclusive')) or
      (checked_prior_state in ('assessed', 'inconclusive') and checked_current_state = 'superseded')
    else false
  end, false);
$$;

create function cfr_app.validate_flight_trace_event_insert()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  prior_sequence bigint;
  prior_occurred_at timestamptz;
  bound_trace_subject text;
  subject_head text;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.workspace_id || pg_catalog.chr(31) || new.trace_id, 0)
  );

  select event.sequence, event.occurred_at
  into prior_sequence, prior_occurred_at
  from cfr_app.flight_trace_events event
  where event.workspace_id = new.workspace_id and event.trace_id = new.trace_id
  order by event.sequence desc
  limit 1;

  if new.sequence <> coalesce(prior_sequence, 0) + 1 then
    raise exception using errcode = '23514', message = 'trace event sequence is not globally gap-free';
  end if;
  if prior_occurred_at is not null and new.occurred_at < prior_occurred_at then
    raise exception using errcode = '23514', message = 'trace event time precedes the prior global event';
  end if;
  if new.actor_type = 'human' and (
    new.actor_id is null or not exists (
      select 1 from cfr_app.workspace_members member
      where member.workspace_id = new.workspace_id
        and member.user_id = new.actor_id
        and member.role = 'owner'
    )
  ) then
    raise exception using errcode = '23514', message = 'human trace event actor is not a workspace member';
  end if;
  if new.subject_type = 'trace' then
    select event.subject_id into bound_trace_subject
    from cfr_app.flight_trace_events event
    where event.workspace_id = new.workspace_id
      and event.trace_id = new.trace_id
      and event.subject_type = 'trace'
    order by event.sequence asc
    limit 1;

    if bound_trace_subject is not null and new.subject_id <> bound_trace_subject then
      raise exception using errcode = '23514', message = 'trace event subject is outside its trace';
    end if;
  end if;

  select event.current_state into subject_head
  from cfr_app.flight_trace_events event
  where event.workspace_id = new.workspace_id
    and event.trace_id = new.trace_id
    and event.subject_type = new.subject_type
    and event.subject_id = new.subject_id
  order by event.sequence desc
  limit 1;

  if new.prior_state is null and subject_head is not null then
    raise exception using errcode = '23514', message = 'subject state history cannot restart';
  end if;
  if new.prior_state is not null and subject_head is distinct from new.prior_state then
    raise exception using errcode = '23514', message = 'trace event prior state is not the subject head';
  end if;
  if not cfr_app.is_allowed_subject_transition(new.subject_type, new.prior_state, new.current_state) then
    raise exception using errcode = '23514', message = 'trace event violates its subject state machine';
  end if;
  return new;
end
$$;

create trigger trg_flight_trace_events_insert_guard
before insert on cfr_app.flight_trace_events
for each row execute function cfr_app.validate_flight_trace_event_insert();

alter table cfr_app.workspaces enable row level security;
alter table cfr_app.workspaces force row level security;
alter table cfr_app.workspace_members enable row level security;
alter table cfr_app.workspace_members force row level security;
alter table cfr_app.flight_traces enable row level security;
alter table cfr_app.flight_traces force row level security;
alter table cfr_app.flight_trace_events enable row level security;
alter table cfr_app.flight_trace_events force row level security;

create policy workspaces_owner_read on cfr_app.workspaces
for select to cfr_trace_reader
using (
  id = nullif((select current_setting('app.current_workspace_id', true)), '')
  and exists (
    select 1 from cfr_app.workspace_members member
    where member.workspace_id = workspaces.id
      and member.user_id = nullif((select current_setting('app.current_user_id', true)), '')
      and member.role = 'owner'
  )
);

create policy workspace_members_owner_read on cfr_app.workspace_members
for select to cfr_trace_reader
using (
  workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')
  and user_id = nullif((select current_setting('app.current_user_id', true)), '')
  and role = 'owner'
);

create policy flight_traces_owner_read on cfr_app.flight_traces
for select to cfr_trace_reader
using (
  workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')
  and exists (
    select 1 from cfr_app.workspace_members member
    where member.workspace_id = flight_traces.workspace_id
      and member.user_id = nullif((select current_setting('app.current_user_id', true)), '')
      and member.role = 'owner'
  )
);

create policy flight_trace_events_owner_read on cfr_app.flight_trace_events
for select to cfr_trace_reader
using (
  workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')
  and exists (
    select 1 from cfr_app.workspace_members member
    where member.workspace_id = flight_trace_events.workspace_id
      and member.user_id = nullif((select current_setting('app.current_user_id', true)), '')
      and member.role = 'owner'
  )
);

revoke all on all tables in schema cfr_app from public, anon, authenticated, service_role;
revoke execute on all functions in schema cfr_app from public, anon, authenticated, service_role, cfr_trace_reader;
grant select on cfr_app.workspaces, cfr_app.workspace_members,
  cfr_app.flight_traces, cfr_app.flight_trace_events to cfr_trace_reader;

alter default privileges in schema cfr_app revoke all on tables from public, anon, authenticated, service_role;
alter default privileges in schema cfr_app revoke execute on functions from public, anon, authenticated, service_role;

commit;
