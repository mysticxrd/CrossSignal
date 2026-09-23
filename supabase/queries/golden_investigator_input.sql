-- TEST-only read of the persisted golden Case under the restricted reader.
-- The returned snapshot is the sole input to db/case-investigator.mjs.
begin read only;
select set_config('app.current_workspace_id', 'phase1-golden-a', true);
select set_config('app.current_user_id',
  'sha256:671c807a45b39b1c350c4a7c0337b73ae3654f1c2a09d5206c2bf03f643b6c67', true);
set local role cfr_trace_reader;

with case_row as (
  select workspace_id as "workspaceId", id, scenario_id as "scenarioId",
    scenario_version as "scenarioVersion", scenario_hash as "scenarioHash",
    title, status, truth_mode as "truthMode", content_hash as "contentHash"
  from cfr_app.detected_cases
  where workspace_id = 'phase1-golden-a' and id = 'case-golden-mobile-checkout'
), signal_row as (
  select workspace_id as "workspaceId", id, case_id as "caseId", kind,
    method_version as "methodVersion", detected, metrics_json as metrics,
    content_hash as "contentHash"
  from cfr_app.case_signals
  where workspace_id = 'phase1-golden-a' and case_id = 'case-golden-mobile-checkout'
), evidence_rows as (
  select workspace_id as "workspaceId", id, case_id as "caseId", source,
    relation, claim, truth_mode as "truthMode", content_hash as "contentHash"
  from cfr_app.case_evidence
  where workspace_id = 'phase1-golden-a' and case_id = 'case-golden-mobile-checkout'
), event_rows as (
  select workspace_id as "workspaceId", id, scenario_id as "scenarioId",
    truth_mode as "truthMode", source, window_key as "window", segment,
    observed_day::text as "observedDay", starts, completed, captures,
    revenue_cents as "revenueCents", content_hash as "contentHash"
  from cfr_app.case_recorded_events
  where workspace_id = 'phase1-golden-a' and scenario_id = 'golden-mobile-checkout-v1'
), citation_rows as (
  select r.workspace_id as "workspaceId", r.evidence_id as "evidenceId",
    r.event_id as "eventId"
  from cfr_app.case_evidence_event_refs r
  join cfr_app.case_evidence e on e.workspace_id = r.workspace_id and e.id = r.evidence_id
  where r.workspace_id = 'phase1-golden-a' and e.case_id = 'case-golden-mobile-checkout'
)
select jsonb_build_object(
  'caseRow', (select to_jsonb(x) from case_row x),
  'signalRow', (select to_jsonb(x) from signal_row x),
  'evidenceRows', (select coalesce(jsonb_agg(to_jsonb(x) order by id), '[]'::jsonb) from evidence_rows x),
  'eventRows', (select coalesce(jsonb_agg(to_jsonb(x) order by id), '[]'::jsonb) from event_rows x),
  'citationRows', (select coalesce(jsonb_agg(to_jsonb(x) order by "evidenceId", "eventId"), '[]'::jsonb) from citation_rows x)
) as investigator_input;

commit;
