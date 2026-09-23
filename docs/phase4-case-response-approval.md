# Phase 4a: Case response and exact approval

Implemented on 2026-09-24 for the existing Supabase Free-plan TEST project
`tonuxepirauyqcwbwenw`. This is a Case-bound approval foundation for one
FIXTURE incident. It does not execute a checkout change or record an outcome.
LIVE remains on D1 and is unchanged. The original OneDrive checkout remains
untouched; the TEST Site has a separate hosting manifest and source checkout.

## Contract and authority

The proposal is derived from the already verified Case and Investigator
artifact. It asks the workspace owner to reproduce the Mobile Safari checkout
in TEST once and record whether payment capture succeeds before considering a
production change. The target is TEST only; recipients are empty, maximum
cost is zero, and external writes are forbidden. It states the cause is
unconfirmed. The measurement plan names a separately recorded follow-up
window, at least 100 eligible starts, and a correlation-only assessment.
Until those follow-up observations exist, the displayed outcome is pending.

`db/case-response.mjs` builds the fixed response and verifies its saved JSON
and content hash. `projectCaseDecision` first re-derives the Case signal,
Investigator, and citations from the 56 recorded events, then verifies the
response and any approval against that same tenant and exact proposal hash.
Extra fields, including evaluator truth, fail closed.

The server action reloads and verifies the Case before approval. Edge Function
`case.response.approve` checks the existing preview token and owner
membership, compares the requested response hash to the saved proposal, and
inserts one immutable approval. Repeated approval of the same hash is
idempotent. No endpoint, database grant, or UI control executes the response.

## Persistence and TEST verification

- Additive migrations `202609230004_case_response_approvals.sql` and
  `202609230005_index_case_response_approval_hash.sql` created private
  `cfr_app` proposal and approval tables with forced RLS and composite
  tenant/hash foreign keys. The runtime role can read proposals and insert an
  owner approval. It cannot insert proposals or update/delete approvals.
- `scripts/generate-owner-case-response-sql.mjs` generated the one owner
  proposal in `supabase/scenarios/owner_case_response.sql`. Running the SQL
  twice kept exactly one identical proposal and preserved existing data.
- Thirteen focused local tests passed. They cover deterministic metrics and
  Investigator checks, invalid and cross-tenant response data, exact approval
  binding, JSON save/reload, and evaluator truth exclusion. A full `vinext`
  build passed. Repository-wide `tsc` still has pre-existing archived Eve,
  Cloudflare ambient-type, and database typing errors; the new app files did
  not add a reported TypeScript error.
- The restricted reader saw one proposal under an existing owner and zero
  under a foreign principal. A rollback-only owner approval insert saw one
  approval during the transaction; afterward the saved count was zero.
  Foreign-principal and wrong-hash inserts both failed with RLS error 42501.
  The TEST database still had 56 Case events and both runtime JSON
  normalization triggers.
- The Supabase security advisor returned no findings. A new composite index
  resolved the missing foreign-key-index advisory; remaining performance
  notices are informational unused indexes.
- `cfr-trace-reader` TEST Edge Function version 8 was deployed ACTIVE with its
  existing custom preview-token authentication.
- The separate owner-private TEST Site source was pushed as commit
  `bb4cebb3b621bad63772de45afac9afd1d86107e` and deployed as Site
  version 6 at `https://crosssignal-supabase-test.hishamxrd.chatgpt.site/`.
  The Sites packager could not parse Windows paths, so the already built
  Worker was staged with its bundled Windows-compatible preparation helper
  and archived with native `tar`. The saved archive contained the TEST
  manifest and Worker entrypoint. Its content hash was
  `sha256:93d8b0658ff252975be623e35ce59c453a08bf9c75e864cf3ee0d42c75cdb26b`.
- In the signed-in browser, reload showed the same Case metrics, three
  evidence claims, exact response hash
  `c3612015967709408c8aa9801434e37f0a665af7127d25fbec5ef97dd1eee754`,
  approval control, TEST scope, zero cost/recipients, and pending outcome.
  No business approval was submitted. The final TEST read still had one
  proposal, zero approvals, and 56 original Case events.

## Reproduce

1. On the selected TEST project, apply the two migrations in order. Run
   `node scripts/generate-owner-case-response-sql.mjs --check`, then execute
   `supabase/scenarios/owner_case_response.sql` twice. Existing Phase 1–3
   Case data and owner membership are prerequisites.
2. Deploy `supabase/functions/cfr-trace-reader/index.ts` to that TEST project
   with its pre-existing custom token authentication setting.
3. Run `node --test tests/golden-revenue-leak.test.mjs tests/case-investigator.test.mjs tests/case-decision.test.mjs tests/case-response.test.mjs`
   and `node node_modules/vinext/dist/cli.js build`.
4. Publish only from the separate TEST Site checkout with project ID
   `appgprj_6aa05c0d6ddc8191abe5dec0a7b77727`. Sign in as an owner,
   review the response details and hash, and reload. A human owner can then
   approve the displayed TEST response. Approval is not part of fixture setup.

## Next bounded milestone

Record a manually completed TEST check with a traceable receipt, then ingest
separate follow-up observations and calculate a correlation-only outcome from
those events. Any production intervention needs its own explicit authority
and effect path. A Replay/Evaluation stage comes after Action/Outcome.

The older L14 factory seal is a historical trace-resolution gate. This
product slice is not a newly accepted factory stage or human gate.
The approval endpoint's real HTTP happy path awaits an owner's intentional
approval; its restricted database insert path was verified in a transaction
that rolled back. The shared preview token is server-side and suitable only
for this private TEST surface; production authority will need user-bound
credentials at the gateway.
