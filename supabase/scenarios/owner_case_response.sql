-- Generated, idempotent TEST-only response for the existing Case.
-- Preserves prior Case data, approvals, membership, and every other row.
begin;
insert into cfr_app.case_response_proposals
  (workspace_id, id, case_id, investigation_id, truth_mode, status,
   artifact_json, content_hash, created_at)
values ('l14-workspace-a', 'response-case-golden-mobile-checkout-v1', 'case-golden-mobile-checkout',
  'investigation-case-golden-mobile-checkout', 'FIXTURE', 'proposed',
  '{"id":"response-case-golden-mobile-checkout-v1","workspaceId":"l14-workspace-a","caseId":"case-golden-mobile-checkout","caseHash":"f969c7fb24aabcb5e4b2946190b665a3f21625674905d1386967ad2bc322bd68","investigationId":"investigation-case-golden-mobile-checkout","investigationHash":"e308c57c9718eb59c39a7c13bcab63dba29dc527eb8fadd148f379bbb1f4da66","truthMode":"FIXTURE","status":"proposed","intent":{"kind":"internal_test_validation","instruction":"Have the workspace owner reproduce the Mobile Safari checkout in TEST and record whether payment capture succeeds before considering a production change.","target":"TEST checkout, Mobile Safari segment","environment":"TEST","recipients":[],"maxCostCents":0,"maxRuns":1,"externalWrite":false},"authority":{"requiredRole":"owner","approvalBinds":"exact_response_hash","execution":"manual_after_approval"},"measurement":{"metric":"Mobile Safari checkout conversion and captured revenue","baseline":"2026-07-24 through 2026-07-30 fixture observations","followUp":"New, separately recorded TEST observations after the manual check","minimumStarts":100,"assessment":"correlated_only","status":"awaiting_follow_up_events"},"uncertainty":"The recorded decline is supported, but the cause is unconfirmed. This approval cannot authorize a production change or establish recovered revenue."}'::jsonb, 'c3612015967709408c8aa9801434e37f0a665af7127d25fbec5ef97dd1eee754', '2026-09-23T00:00:00Z')
on conflict do nothing;

do $$
begin
  if (select count(*) from cfr_app.case_response_proposals
      where workspace_id = 'l14-workspace-a' and case_id = 'case-golden-mobile-checkout') <> 1
    or not exists (select 1 from cfr_app.case_response_proposals
      where workspace_id = 'l14-workspace-a' and id = 'response-case-golden-mobile-checkout-v1'
        and investigation_id = 'investigation-case-golden-mobile-checkout'
        and truth_mode = 'FIXTURE' and status = 'proposed'
        and artifact_json = '{"id":"response-case-golden-mobile-checkout-v1","workspaceId":"l14-workspace-a","caseId":"case-golden-mobile-checkout","caseHash":"f969c7fb24aabcb5e4b2946190b665a3f21625674905d1386967ad2bc322bd68","investigationId":"investigation-case-golden-mobile-checkout","investigationHash":"e308c57c9718eb59c39a7c13bcab63dba29dc527eb8fadd148f379bbb1f4da66","truthMode":"FIXTURE","status":"proposed","intent":{"kind":"internal_test_validation","instruction":"Have the workspace owner reproduce the Mobile Safari checkout in TEST and record whether payment capture succeeds before considering a production change.","target":"TEST checkout, Mobile Safari segment","environment":"TEST","recipients":[],"maxCostCents":0,"maxRuns":1,"externalWrite":false},"authority":{"requiredRole":"owner","approvalBinds":"exact_response_hash","execution":"manual_after_approval"},"measurement":{"metric":"Mobile Safari checkout conversion and captured revenue","baseline":"2026-07-24 through 2026-07-30 fixture observations","followUp":"New, separately recorded TEST observations after the manual check","minimumStarts":100,"assessment":"correlated_only","status":"awaiting_follow_up_events"},"uncertainty":"The recorded decline is supported, but the cause is unconfirmed. This approval cannot authorize a production change or establish recovered revenue."}'::jsonb and content_hash = 'c3612015967709408c8aa9801434e37f0a665af7127d25fbec5ef97dd1eee754')
  then raise exception 'owner Case response differs from verified proposal'; end if;
end $$;
commit;
