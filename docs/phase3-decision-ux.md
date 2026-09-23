# Phase 3: Case decision view

Implemented on 2026-09-23 against the existing Supabase Free-plan TEST
project `tonuxepirauyqcwbwenw`. The live D1 deployment and the original
OneDrive checkout were left untouched. The TEST Site has its own source
checkout and hosting manifest; it must never be published using this
development checkout's LIVE `.openai/hosting.json`.

## What exists

The existing owner workspace `l14-workspace-a` now contains the same
reproducible FIXTURE incident as Phase 1: 56 recorded events, one detected
Case and signal, three evidence rows, 42 evidence/event links, one bounded
Investigator artifact, and 42 claim citations. Its investigation hash is
`e308c57c9718eb59c39a7c13bcab63dba29dc527eb8fadd148f379bbb1f4da66`.
The owner fixture SQL inserts missing rows and verifies matching hashes; it
does not delete data, change memberships, or overwrite existing rows. It ran
twice successfully in TEST.

The Edge Function adds `case.decision.read`. It uses the existing TEST preview
token, then switches to `cfr_trace_reader` in a read-only transaction and
sets the authenticated owner's hashed principal and workspace context. A
missing owner membership or Case returns 404. The same tenant RLS policies
apply to Case, signal, evidence, events, investigation, and citations.

The server reads one Case only for the authenticated owner in the seeded
workspace. Before rendering it, `projectCaseDecision` re-derives metrics from
the saved 56 events, verifies all stored row hashes, compares the saved
Investigator artifact with the deterministic derivation, verifies its hash,
and checks all 42 investigation citations. An incomplete or changed response
fails closed to an unavailable state. A foreign workspace has no Case in this
bounded milestone.

The Cases view shows the synthetic 20.00% to 8.57% Mobile Safari conversion
drop, $800 baseline-rate revenue gap, stable desktop countercheck, all three
claims, and expandable raw observation references. It says the cause is
unconfirmed and approval is unavailable because no response exists for this
Case. The older onboarding Action control, Narrative trace, and Outcome pages
sit under a separate **Onboarding demo** navigation label; their approval
control does not authorize this Case. No AI model, external action, or outcome
measurement was added.

## Verification

- `node scripts/generate-owner-decision-fixture-sql.mjs --check` matched the
  generated SQL and stored report hash.
- Ten Phase 1, Investigator, and decision projection tests passed with
  `node --test`. They include invalid inputs, deterministic re-derivation,
  JSON save/reload, cross-tenant changes, altered metrics and report hashes,
  missing citations, and evaluator truth exclusion.
- A full `vinext build` passed. Repository-wide `tsc` still reports prior
  archived Eve spike, Cloudflare ambient-type, and existing database typing
  errors; the new view's initial implicit callback types were fixed.
- The restricted TEST role saw the Case and investigation under two existing
  owner principals and zero rows under a foreign principal. The TEST fixture
  SQL was run twice; the second execution changed no values.
- `cfr-trace-reader` TEST Edge Function version 7 deployed ACTIVE with the
  existing custom token authentication and `verify_jwt=false` configuration.
- The owner-private TEST Site deployed successfully at
  `https://crosssignal-supabase-test.hishamxrd.chatgpt.site/`. A signed-in
  owner saw the saved Case, exact metrics, all three claims, the blocked Case
  response, and the expected investigation hash. Expanding a claim showed
  its 14 dated observations and event IDs. Reload preserved the Case and
  metrics. Navigation to the separate onboarding Action control and back
  worked. Only one owner workspace was available in that browser session,
  so cross-tenant isolation was verified at the restricted database role
  and projection boundaries rather than through a workspace switch.
- The TEST Site source was pushed from its separate manifest and built with
  `vinext`. The Sites workflow pushed the source but its bundled Bash
  packager could not parse a Windows path, so the same `prepare-site-build`
  helper and tar archive steps were run with Windows-native paths before
  the Sites private deployment call. The verified archive contained the
  TEST hosting manifest and Worker entrypoint.

## Reproduce

1. Apply the Phase 1 and 2 migrations only to the selected TEST project.
2. Run `node scripts/generate-owner-decision-fixture-sql.mjs --check`; execute
   `supabase/scenarios/owner_decision_fixture.sql` there. Re-run to confirm
   idempotence. The SQL assumes the already authorized TEST owner workspace.
3. Deploy `supabase/functions/cfr-trace-reader/index.ts` to that TEST project.
4. Run `node --test tests/golden-revenue-leak.test.mjs tests/case-investigator.test.mjs tests/case-decision.test.mjs`
   and `node node_modules/vinext/dist/cli.js build`.
5. Publish only from the separate TEST Site checkout with the TEST project ID.
   Sign in as an existing workspace owner, open Cases, expand the three
   claims, then reload. Check another workspace and verify it has no Case.

## Next milestone

Prepare a bounded response tied to this Case, including exact intent, scope,
recipients, cost, authority, and a measurement plan. Approval and execution
should be unavailable until those fields and controls are present. The later
Action/Outcome stage can measure an observed result without claiming cause
from this synthetic incident.
