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
  The TEST Edge Function authenticates the owner-only Site with a dedicated
  random token, opens a read-only transaction, and assumes `cfr_trace_reader`
  before resolving any workspace or trace row.
- The Site reaches Supabase over HTTPS. The Edge Function uses its managed
  `SUPABASE_DB_URL` with prepared statements disabled, avoiding persistent TCP
  sockets in the Cloudflare Worker.

No project reference, plaintext gateway token, password, connection string,
service-role key, or LIVE data belongs in this directory.
