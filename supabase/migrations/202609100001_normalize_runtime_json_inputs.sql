begin;

create or replace function cfr_app.normalize_workspace_runtime_state_json()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if jsonb_typeof(new.snapshot_json) = 'string' then
    new.snapshot_json := (new.snapshot_json #>> '{}')::jsonb;
  end if;
  return new;
end
$$;

create or replace function cfr_app.normalize_workspace_runtime_event_json()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if jsonb_typeof(new.payload_json) = 'string' then
    new.payload_json := (new.payload_json #>> '{}')::jsonb;
  end if;
  return new;
end
$$;

create trigger normalize_workspace_runtime_state_json
before insert or update of snapshot_json on cfr_app.workspace_runtime_states
for each row execute function cfr_app.normalize_workspace_runtime_state_json();

create trigger normalize_workspace_runtime_event_json
before insert or update of payload_json on cfr_app.workspace_runtime_events
for each row execute function cfr_app.normalize_workspace_runtime_event_json();

alter table cfr_app.workspace_runtime_events
add constraint chk_workspace_runtime_events_payload_object
check (jsonb_typeof(payload_json) = 'object');

commit;
