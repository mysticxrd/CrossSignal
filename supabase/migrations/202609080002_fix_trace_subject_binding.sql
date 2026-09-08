-- Preserve the source trace subject carried by the accepted fixture while
-- preventing later trace events from switching to a different subject.
create or replace function cfr_app.validate_flight_trace_event_insert()
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

  select max(event.sequence), max(event.occurred_at)
    into prior_sequence, prior_occurred_at
  from cfr_app.flight_trace_events event
  where event.workspace_id = new.workspace_id
    and event.trace_id = new.trace_id;

  if new.sequence <> coalesce(prior_sequence, 0) + 1 then
    raise exception using errcode = '23514', message = 'trace event sequence is not contiguous';
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

grant cfr_trace_reader to postgres;
