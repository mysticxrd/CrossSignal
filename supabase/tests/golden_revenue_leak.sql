-- TEST-only negative contract checks. The transaction always rolls back.
begin;

do $$
begin
  begin
    insert into cfr_app.case_recorded_events
      (workspace_id, id, scenario_id, truth_mode, source, window_key, segment,
       observed_day, starts, completed, captures, revenue_cents, content_hash)
    values ('phase1-golden-a', 'invalid-negative-starts', 'golden-mobile-checkout-v1',
      'FIXTURE', 'checkout_analytics', 'baseline', 'mobile_safari', '2026-07-31',
      -1, 0, 0, 0, repeat('a', 64));
    raise exception 'negative event count was accepted';
  exception when check_violation then null;
  end;

  begin
    insert into cfr_app.detected_cases
      (workspace_id, id, scenario_id, scenario_version, scenario_hash,
       title, status, truth_mode, content_hash)
    values ('phase1-golden-a', 'invalid-live-case', 'invalid-live-scenario', 1,
      repeat('a', 64), 'Invalid truth mode', 'detected', 'LIVE', repeat('b', 64));
    raise exception 'non-fixture Case was accepted';
  exception when check_violation then null;
  end;

  begin
    insert into cfr_app.case_evidence_event_refs (workspace_id, evidence_id, event_id)
    values ('phase1-golden-b', 'evidence-mobile-funnel',
      'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-24-checkout');
    raise exception 'cross-tenant evidence reference was accepted';
  exception when foreign_key_violation then null;
  end;
end $$;

select (select count(*) from cfr_app.case_recorded_events where workspace_id='phase1-golden-a')::int as recorded_events,
  (select count(*) from cfr_app.detected_cases where workspace_id='phase1-golden-a')::int as cases,
  (select count(*) from cfr_app.case_evidence_event_refs where workspace_id='phase1-golden-a')::int as evidence_refs;

rollback;
