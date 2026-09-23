# Phase 1: foundations and golden revenue-leak scenario

Verified on 2026-09-23. This is a backend TEST fixture milestone. The product
sequence is Contract -> Recorder -> Signals -> Investigator -> Decision UX ->
Action/Outcome -> Replay/Evaluation. This change covers the first three pieces
for one synthetic scenario and persists a Case. It does not implement an AI
investigator, decision flow, external action, outcome assessment, or model
evaluation.

## Recovered baseline

- The saved OneDrive checkout was temporarily incomplete: source files and
  `.git/HEAD` were absent during sync. On reappearance, Git still had an older
  branch ref (`a6bd74e`) and a later reflog/commit (`ca44f2eb180ed2d7d1fba1b606208a3294d4830d`).
  The original checkout and any staged work were left untouched. This branch
  was made from `ca44f2e` in an isolated local clone under `work/crosssignal-phase1`.
  The original repository has no configured remote.
- The September 10 release is a Supabase-backed TEST trace-resolution slice.
  Existing flight trace data, a restricted trace-reader role, tenant policies,
  and the three-cast `cfr-trace-reader` Edge Function were present on the
  selected Supabase project. The prior 28-owner/0-foreign check was reproduced
  after the project finished restoring: 77 total flight events across two
  traces; the reader saw 28 in its owner workspace and zero foreign rows.
- The prior app had a hard-coded D1 Case sample and trace browsing. It did not
  contain a recorded revenue-leak incident, a derived Case, or an investigator.
  Historical factory stage seals describe prior slices, not this milestone.
- The current TEST preview loaded the fixture onboarding Action control page.
  Its Narrative trace and Outcome navigation opened; the trace showed 14
  durable fixture events and the Outcome view correctly showed no outcome
  before authorization. The preview was left on Action control. The September
  10 edit/save/reload check is historical and was not rerun against this page.
- Supabase project `tonuxepirauyqcwbwenw` belongs to the CrossSignal Free
  organization. It was restored from inactivity, remained on Free, and was
  `ACTIVE_HEALTHY` after these checks. LIVE stayed on its existing D1 path.

## Contract and detection

`db/revenue-leak.mjs` validates exact scenario, event, signal, evidence, and
Case shapes. The v1 fixture records 56 daily observations: checkout starts and
completions plus payment captures and revenue for Mobile Safari and desktop,
each over seven baseline and seven observed days. Every checkout observation
must match its payment capture for that day. Duplicate, missing, cross-tenant,
out-of-window, unsafe-size, and malformed records fail before detection.

The deterministic detector reads only those observations. It computes integer
basis-point rates and a projected revenue gap; it checks minimum volume,
relative target drop, stable desktop control, and positive lost revenue. It
returns one `conversion_drop` signal and a Case with two supporting evidence
items and one contradictory item. Evidence cites exact recorded event IDs.

| Measure | Baseline | Observed |
| --- | ---: | ---: |
| Mobile Safari checkout starts | 140 | 140 |
| Mobile Safari completions / captures | 28 | 12 |
| Mobile Safari conversion | 20.00% | 8.57% |
| Desktop completions / captures | 28 | 28 |

Mobile Safari relative conversion drop is 5,714 basis points (57.14%);
desktop relative drop is zero. At the fixture's $50 capture value, expected
observed-window revenue is $1,400, recorded revenue is $600, and the projected
gap is $800. This is a synthetic estimate, not a causal claim or LIVE loss.

`tests/evaluator/golden-revenue-leak.truth.json` holds expected answers for
verification. The runtime module and generated setup SQL neither import nor
embed this evaluator file. All persisted records carry `FIXTURE` truth mode.

## TEST persistence and isolation

The additive migrations add `cfr_app.case_recorded_events`, `detected_cases`,
`case_signals`, `case_evidence`, and `case_evidence_event_refs`. Composite
foreign keys bind citations and signals to a Case and workspace. The schema is
private; RLS is enabled and forced on all five tables. Only the existing
`cfr_trace_reader` role receives tenant-scoped `SELECT`. No public, anon,
authenticated, service-role, or runtime write grants were added. The original
normalization triggers remain installed.

`scripts/generate-golden-revenue-leak-sql.mjs` creates
`supabase/scenarios/golden_revenue_leak.sql`. It provisions synthetic fixture A
and an empty fixture B, inserts rows with `ON CONFLICT DO NOTHING`, then checks
counts and content hashes. An existing row with the same ID and changed content
causes setup to fail rather than overwrite historical data. There is no cleanup
or reset step.

On TEST, both the initial run and a second run succeeded. Counts after each:
56 recorded events, 1 detected Case, 1 signal, 3 evidence items, 42 evidence
references. An independent SQL aggregation of stored events reproduced the
140/28 -> 140/12 target change, 5,714-basis-point drop, $800 projected gap,
and stable desktop control. A later, separate read under the owner role
reloaded the Case, signal, evidence, and all 42 references. Fixture B's owner
given fixture A's workspace context saw zero cases/events/references; no
principal context also saw zero. The reader had `SELECT` and no Case `INSERT`
or event `UPDATE` privilege. The rollback-only SQL test rejected a negative
event count, a non-fixture Case, and a cross-tenant evidence reference.

The TEST migrations applied as `golden_revenue_leak_foundations` and
`index_case_evidence_case`. Existing flight events remained at 77. The
Supabase security advisor returned no findings after the first migration; a
performance advisor finding for the new evidence/Case foreign key led to the
second index migration.

## Reproduce and review

1. From this checkout, run `npm run verify:golden`. Regenerate the SQL only
   after intentionally changing the contract or fixture with
   `node scripts/generate-golden-revenue-leak-sql.mjs`.
2. On the explicitly selected TEST Supabase project, apply both migrations in
   lexical order if absent. Run the generated scenario SQL as an administrator.
   Re-running it is safe and verifies existing fixture hashes.
3. Run `supabase/tests/golden_revenue_leak.sql` in TEST; it rolls back. Read the
   Case via a transaction that sets `app.current_workspace_id` and
   `app.current_user_id`, then assumes `cfr_trace_reader` as in the existing
   trace-reader gateway.

The generated-SQL consistency check and all four `node --test` tests passed
when run directly. The machine's `npm` launcher points to a missing global
`npm-cli.js`, so the package script could not be invoked here. `node --check`
for both new modules and `git diff --check` passed. The repository-wide TypeScript
check remains red from pre-existing archived EVE dependencies and Cloudflare/
Deno typing errors; this new module is JavaScript and was verified separately.
The preview site's Case UI was not changed, so this Case is currently a
private database read model rather than a user-visible app flow.

## Next milestone

Build a bounded Investigator that consumes this Case and its cited evidence,
surfaces supporting and contradictory observations with the same tenant and
truth-mode rules, and keeps evaluator answers outside its input. Verify its
claims against exact event references before adding Decision UX.
