# Phase 4c: exclude a trial receipt and reopen one real TEST check

Implemented on 2026-09-24 for the owner-private Supabase TEST project
`tonuxepirauyqcwbwenw`. The owner confirmed in the project conversation that
the saved check receipt was only a trial submission. Its run reference equals
the displayed Case investigation hash, and its capture status is
`indeterminate`. It is not evidence that checkout was performed.

## Correction

The original approval and receipt remain immutable. An owner can append a
`trial_submission` marker tied to the exact receipt hash. A marked trial is
shown in the Case but is excluded from outcome assessment. The Case reopens a
single owner-attested recheck form; that recheck must use a different run
reference and occur after the trial marker. The form requires an explicit
acknowledgment that the manual TEST checkout was performed and the reference
identifies that run. It will become the effective
receipt only after a real manual TEST check. Marking a trial or recording a
recheck does not execute checkout or make a production change.

Two additive tables, `case_check_trial_markers` and
`case_check_recheck_receipts`, use forced RLS, tenant and owner checks, exact
receipt/proposal foreign keys, and insert-only runtime grants. Migration
`202609240003_case_trial_rechecks.sql` also adds `receipt_hash` to the empty
follow-up table. A trigger rejects an observation unless its hash matches the
effective receipt and its day follows that check. The SQL generator and Case
projection enforce the same binding. Migration
`202609240004_fix_case_follow_up_trigger_search_path.sql` pins the trigger
function search path after the security advisor identified a warning.

## Verification

- Twenty focused tests passed, including JSON save/reload of trial exclusion,
  a distinct recheck, altered/foreign data rejection, receipt-bound follow-up,
  deterministic anomaly detection, and evaluator truth separation. The full
  `vinext` build passed in development and the separate TEST Site checkout.
- The TEST migration was applied only after confirming zero follow-up rows.
  Edge Function `cfr-trace-reader` version 10 is ACTIVE with its existing
  server-side TEST preview-token authentication. Supabase's security advisor
  returned zero findings after the search-path correction.
- The separate TEST source was pushed at
  `44d58ee897611774e80b11d705ca4e45d242f166` and owner-private Site
  version 9, deployment `appgdep_6ab4ede701e08191a59780c7f14bcebc`,
  succeeded. Signed-in reload displayed the trial control. The owner-confirmed
  trial was marked through that control; the Case then displayed the original
  receipt as excluded, an empty recheck form, and an awaiting-check outcome.
  A further reload of version 9 preserved the exclusion and showed the
  explicit performed-check acknowledgment unchecked with the save button
  disabled.
- Read-only TEST counts afterward were one approval, one original receipt,
  one trial marker, zero rechecks, and zero follow-up rows. A rollback-only
  owner-role transaction inserted and read a recheck; a foreign principal saw
  zero trial markers and its recheck insert was denied. A rollback-only
  follow-up insert tied to the trial receipt was rejected by the trigger.
  A separate rollback-only recheck plus correctly bound follow-up insert
  succeeded. Those test writes left no rows.

The real recheck HTTP path and persisted recheck reload remain unexercised:
performing them without an actual check would repeat the original mistake.
The marker records the owner's declaration that the first receipt was a trial;
it does not independently validate a future manual run. No effect or measured
outcome is claimed. The original 56 incident events and previous normalization
triggers were not changed; LIVE remains on D1 and untouched. No paid resource
or model evaluation was enabled. The older L14 factory seal is historical,
not a new human acceptance of this Case correction.

## Next real-world step

**Scope clarification — 2026-09-26:** This remains a future real-world
verification path. It is not a prerequisite for the synthetic hiring MVP.
Replay is now implemented, and the next product milestone is
[A01 synthetic investigation and intervention](a01-synthetic-investigation-handoff.md).
The original sequence below is historical; the receipt exclusion and genuine
observation requirements remain in force for any future real-world check.

After actually performing one Mobile Safari checkout check in TEST, the owner
records a distinct, non-sensitive run reference and the observed capture
result. Only then may seven genuinely new paired TEST follow-up days be
collected and imported. The import must bind each event to the effective
receipt hash and use at least 100 eligible starts. Any assessment is
correlation-only; Replay/Evaluation follows the Action/Outcome proof.
