# Company Flight Recorder Supabase TEST assets

This directory contains the reviewed PostgreSQL migration and transactional SQL
tests for the first authenticated trace-resolution read slice.

- Apply every file in `migrations/` in lexical order with the supported
  Supabase migration operation against an explicitly selected TEST project.
  The second migration preserves the accepted source trace subject while
  binding later trace events to it; the third resolves advisor findings for
  RLS initialization plans and composite foreign-key coverage.
- Generate the deterministic labeled fixture SQL with
  `node factory/03_build/generate-supabase-fixture-sql.mjs` and load it once in
  the same selected TEST project.
- Run `tests/trace_resolution_read_model.sql` only after the fixture counts are
  `2 / 2 / 2 / 77`. The test script rolls back its own mutations.
- The migrations grant the SQL Editor's non-superuser `postgres` administrator
  membership in `cfr_trace_reader` so the hosted test can use `set local role`.
  Application traffic must use a separate login that inherits only
  `cfr_trace_reader`; it must never use `postgres` or a Data API service role.
- Use a direct or session connection for migration work. Application traffic
  uses the transaction pooler on port `6543` with prepared statements disabled.

No project reference, password, connection string, service-role key, or LIVE
data belongs in this directory.
