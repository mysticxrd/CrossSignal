-- TEST-only negative contract checks; all attempted mutations roll back.
begin;

do $$
begin
  begin
    insert into cfr_app.case_investigations
      (workspace_id, id, case_id, signal_id, method_version, truth_mode,
       status, assessment, source_case_hash, source_signal_hash,
       artifact_json, content_hash)
    values ('phase1-golden-a', 'invalid-live-investigation',
      'case-golden-mobile-checkout', 'signal-golden-mobile-checkout-v1',
      'bounded-deterministic-v1', 'LIVE', 'ready_for_review',
      'targeted_drop_supported_cause_unconfirmed', repeat('a',64), repeat('b',64),
      '{}'::jsonb, repeat('c',64));
    raise exception 'non-fixture investigation was accepted';
  exception when check_violation then null;
  end;

  begin
    insert into cfr_app.case_investigation_citations
      (workspace_id, investigation_id, claim_id, evidence_id, event_id)
    values ('phase1-golden-b', 'investigation-case-golden-mobile-checkout',
      'claim-mobile-conversion', 'evidence-mobile-funnel',
      'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-24-checkout');
    raise exception 'cross-tenant investigation citation was accepted';
  exception when foreign_key_violation then null;
  end;

  begin
    insert into cfr_app.case_investigation_citations
      (workspace_id, investigation_id, claim_id, evidence_id, event_id)
    values ('phase1-golden-a', 'investigation-case-golden-mobile-checkout',
      'claim-mobile-conversion', 'evidence-desktop-control',
      'golden-mobile-checkout-v1-baseline-mobile_safari-2026-07-24-checkout');
    raise exception 'uncited evidence/event pair was accepted';
  exception when foreign_key_violation then null;
  end;
end $$;

select (select count(*) from cfr_app.case_investigations where workspace_id='phase1-golden-a')::int as investigations,
  (select count(*) from cfr_app.case_investigation_citations where workspace_id='phase1-golden-a')::int as citations;

rollback;
