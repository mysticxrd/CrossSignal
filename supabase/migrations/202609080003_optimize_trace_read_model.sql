-- Resolve the Supabase RLS initialization-plan warnings and add covering
-- indexes for the two composite foreign keys.
create index if not exists idx_workspaces_owner_membership
  on cfr_app.workspaces (id, owner_user_id);

create index if not exists idx_flight_traces_workspace_creator
  on cfr_app.flight_traces (workspace_id, created_by);

drop policy workspaces_owner_read on cfr_app.workspaces;
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

drop policy workspace_members_owner_read on cfr_app.workspace_members;
create policy workspace_members_owner_read on cfr_app.workspace_members
for select to cfr_trace_reader
using (
  workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')
  and user_id = nullif((select current_setting('app.current_user_id', true)), '')
  and role = 'owner'
);

drop policy flight_traces_owner_read on cfr_app.flight_traces;
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

drop policy flight_trace_events_owner_read on cfr_app.flight_trace_events;
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
