begin;

drop policy workspaces_runtime_read on cfr_app.workspaces;

create policy workspaces_runtime_read on cfr_app.workspaces
for select to cfr_app_runtime
using (
  (
    nullif((select current_setting('app.current_workspace_id', true)), '') is null
    or id = nullif((select current_setting('app.current_workspace_id', true)), '')
  )
  and exists (
    select 1 from cfr_app.workspace_members member
    where member.workspace_id = workspaces.id
      and member.user_id = nullif((select current_setting('app.current_user_id', true)), '')
      and member.role = 'owner'
  )
);

commit;
