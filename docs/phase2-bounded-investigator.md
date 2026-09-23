# Phase 2: bounded Case Investigator

Verified on 2026-09-23 against the existing Free-plan TEST project
`tonuxepirauyqcwbwenw`. This milestone follows the Phase 1 recorded-event,
signal, and Case foundation. It is a deterministic, evidence-bound
Investigator. It does not call an AI model, claim a root cause, propose an
action, or change the preview UI or LIVE.

## Input and output contract

`supabase/queries/golden_investigator_input.sql` reads the persisted Case,
signal, 56 events, three evidence rows, and 42 evidence/event links inside a
read-only transaction under `cfr_trace_reader`. Its `investigator_input` JSON
is the only runtime input to `db/case-investigator.mjs`. The module rejects
unexpected fields (including evaluator answers), cross-tenant rows, non-fixture
truth modes, changed content hashes, incomplete events or citations, and a
signal or Case that differs from re-deriving the incident from raw events.

The Investigator emits three claims: Mobile Safari conversion fell from
20.00% to 8.57%; captured revenue fell from $1,400 to $600, leaving an $800
baseline-rate projected gap; and desktop conversion remained at 20.00%,
contradicting a campaign-wide checkout decline. Each claim binds one evidence
record and its 14 exact event IDs. The assessment is
`targeted_drop_supported_cause_unconfirmed`; the report explicitly says this
synthetic pattern cannot establish cause or a LIVE loss. The report has no
recommendation or approval state. Its content hash is
`baba5e4bd04fd771683f166f7720ee7c929670b880b974aa1fcb045c456c7a6b`.

The evaluator truth file from Phase 1 remains in `tests/evaluator/`. Neither
the Investigator nor its SQL generator imports it. The generated SQL contains
no expected-answer field.

## Persistence and verification

Migration `202609230003_bounded_case_investigations.sql` adds private
`cfr_app.case_investigations` and `cfr_app.case_investigation_citations`. The
first stores the verified artifact and hashes of its source Case and signal.
The second links every investigation claim to an allowed evidence/event pair
through a composite foreign key. Both tables have forced RLS and owner-only
`SELECT` for `cfr_trace_reader`; no application write grant was added.

The TEST migration applied as `bounded_case_investigations` (version
`20260923150443`). The generated scenario SQL ran twice successfully and left
one investigation and 42 citations. A separate reader session reloaded the
artifact, and `verifyInvestigation` matched the reloaded JSON to a fresh
derivation from the persisted Case snapshot. Under fixture A's owner context,
the reader saw one report with three claims and 42 citations and had no INSERT
privilege. Fixture B's owner using A's workspace context saw zero rows; a
reader with no principal context also saw zero. The rollback-only SQL test
rejected a non-fixture investigation, a cross-tenant citation, and a citation
to an unlinked evidence/event pair.

After deployment, TEST still held 56 Phase 1 recorded events and 77 prior
flight trace events. Both normalization triggers remained installed. The
Supabase security advisor had no findings; the performance advisor reported
only informational unused indexes and no missing foreign-key index.

Local verification: four Phase 1 tests and four Investigator tests passed with
`node --test`; `node --check` and `git diff --check` passed. The machine's
global `npm` launcher is missing its `npm-cli.js`, so the package script is
provided for a normal Node installation but the tests were run directly here.
The existing repository-wide TypeScript failures described in the Phase 1
record were not changed by this JavaScript-only slice.

## Reproduce

1. Seed and verify Phase 1 as described in
   `docs/phase1-golden-revenue-leak.md`. Apply the Investigator migration to
   the explicitly selected TEST project.
2. Run `supabase/queries/golden_investigator_input.sql` and save the returned
   `investigator_input` object as JSON in ignored `work/`. Run
   `node scripts/verify-golden-investigator-snapshot.mjs <reader-export.json>`.
3. Generate `supabase/scenarios/golden_investigation.sql` with
   `node scripts/generate-golden-investigation-sql.mjs <reader-export.json>`.
   Run it in TEST as an administrator. Re-running it checks the existing
   artifact and citations without deleting or overwriting them.
4. Run `supabase/tests/golden_investigation.sql` in TEST. To verify reload,
   read `artifact_json` under the owner reader context and run
   `node scripts/verify-golden-investigator-snapshot.mjs <reader-export.json> <reloaded-artifact.json>`.

## Next milestone

Decision UX should present the Case, evidence, contradictory claim, and
explicit uncertainty before any response is proposed or authorized. A future
model-assisted narrative would have to pass this same citation and numeric
verification boundary; no model evaluation was run in this milestone.
