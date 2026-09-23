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

## Phase 1 golden revenue-leak fixture

The additive `202609230001` and `202609230002` migrations add private Case,
recorded-event, signal, and evidence tables. Apply them in lexical order to the
selected TEST project only. The second migration covers an index added after
the first migration had already run on TEST; it is a no-op on fresh installs.

Run `npm run verify:golden`, then run
`supabase/scenarios/golden_revenue_leak.sql` as a TEST administrator. The script
is repeatable: it inserts missing synthetic rows and checks their hashes; it
does not delete or overwrite existing rows. Run
`supabase/tests/golden_revenue_leak.sql` afterwards for rollback-only database
contract checks. See `docs/phase1-golden-revenue-leak.md` for the verified
project state, metrics, tenancy checks, and limits.

## Bounded Investigator

After the golden Case fixture exists, apply
`migrations/202609230003_bounded_case_investigations.sql` to the selected TEST
project. Run `queries/golden_investigator_input.sql` under the restricted reader
and save its `investigator_input` JSON as a local file. The query contains only
the fixture owner and workspace IDs; do not point it at LIVE.

Run `node scripts/verify-golden-investigator-snapshot.mjs <reader-export.json>`
to recompute and validate the Case from persisted rows. Generate the setup SQL
with `node scripts/generate-golden-investigation-sql.mjs <reader-export.json>`;
then run `scenarios/golden_investigation.sql` as a TEST administrator. It inserts
the content-hashed fixture artifact and linked citations without deleting or
overwriting existing data. `tests/golden_investigation.sql` is a rollback-only
negative database test. See `docs/phase2-bounded-investigator.md` for outcomes
and limits.
