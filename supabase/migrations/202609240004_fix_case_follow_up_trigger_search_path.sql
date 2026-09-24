begin;

-- Every table reference in this trigger is schema-qualified. Pin the search
-- path as well so callers cannot change how unqualified built-ins resolve.
alter function cfr_app.require_active_case_check_receipt()
  set search_path = '';

commit;
