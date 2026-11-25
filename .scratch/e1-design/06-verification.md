# E1 section 6: verification

Settled with the owner 2026-11-23/24 (round 1 Q1-Q7, round 2 Q1-Q11, "yes to all"; seven gaps directed by the owner from Addy Osmani's X Article "How the Claude Code team thinks about verification", 17 Nov 2026, read via fxtwitter). Each round was checked against the owner's Notion "AI Engineering Roadmap" (section 3 notes 3-4, M3, section 5) and "Learn AI Agent Harness & Loop Engineering In 19 Min" (quality and health, code assertions plus a judge). Words follow `GLOSSARY.md`; the grader decision is `docs/adr/0006-grader-versioned-out-of-reach.md`. Facts checked:
- **Razorpay capture docs:** no idempotency key; a repeat capture returns 400 "already either captured or voided", and the fix is to fetch the payment; the amount must equal the authorized amount, so there is no partial capture of one payment; "another payment operation is in progress" is a 400.
- **WooCommerce REST docs:** `PUT /orders/<id>` returns 200 with the full order; a note POST returns the new note; there is no idempotency.
- **Agent Studio (30 Mar 2026):** "Errors are caught both before and after execution, with repeated mistakes triggering review and correction through our internal evaluation system"; it describes no separate check after execution.

## Decisions

1. **Three meanings, one stamp.**
   - **Landed** is a validity gate: a mismatch is the status `verification_mismatch`, a fail like `harness_error`.
   - **Fixed** (the watch) and **realised** sit beside pass, never in it.
   - Every run log ends with a verification stamp (owner; `blank-stamp`):
     - landed: `verified`, `mismatch` or `not_run(reason)`;
     - fixed: `resolved`, `uncertain` or `reopened`, watched for every proposal, wait and no cause included;
     - realised: a figure or `not_run(reason)`.
   - A pass × fixed confusion table shows how often a check without the answer key would have told the merchant the truth.
   - From A01 we keep the import rule (verifier and watch read no key and no simulator internals), `sufficient` and `reopened`. We drop its windows and thresholds.
2. **Verifier.** It is separate from the executor and reads the raw backend interface the tools wrap, with no envelope, projection or caps. In the simulator, a state oracle also compares every target with internal state. An import lint bars the verifier from the executor, pricing and the key.
3. **Re-read.**
   - Records per target:
     - capture: payment `captured`, its amount and no refund;
     - mark-paid: order `processing`, `transaction_id`, `date_paid`, our key in `meta_data` once, totals equal to the payment;
     - webhook: the enabled flag;
     - plugin: the active version;
     - deploy: the latest entry;
     - notify: one notice per key and the recipient hash.
   - A whole-world snapshot is taken at execution start. In the simulator its hash must equal the world-state hash on the approval.
   - Disagreements already in the snapshot are **pre-existing**, tagged and never charged (owner; `whole-world-mismatch`).
   - A mismatch is any of: a new disagreement, a targeted pair left unresolved, a changed untargeted record, a duplicate key, or the executor's outcome contradicted.
   - `world_change` (demo and test mode only) is a new disagreement on a record that has no key of ours.
4. **Watch.**
   - It lasts 48 h of case clock after execution, or after `recheck_at` for a wait, and fewer remaining days give `uncertain(insufficient future)`.
   - It uses the dip's own measure: resolved if both 24 h windows are within 10%; reopened if the second is ≥25% below; otherwise uncertain.
   - **Sale week:**
     - The baseline averages the same weekday and hours over the 3 latest weeks whose comparison window doesn't overlap the sale week in the merchant's calendar.
     - Fewer than 2 clean weeks gives `uncertain(no clean baseline)`.
     - A watch window inside the sale week is `uncertain(sale week)`, since a sale can hide a broken fix.
   - **Proof:**
     - One of the 4 development no-cause cases is set in the first day after the sale; its oracle "no cause" must never stamp reopened, and with the sale week left in, the same watch must stamp reopened, or the case isn't testing the trap.
     - One development webhook-disablement case also starts just after the sale; a wrong "no cause" on it must still stamp reopened.
   - In eval runs, reopened only stamps the run.
5. **Realised rupees** are in pricing's unit, with the gap itemised: refused, not reached, expired, `world_change`. In eval runs a gap raises `pricing_vs_execution`.
6. **Executor failures.**
   - Ambiguous outcomes (a timeout, a 5xx, a reset after sending) re-read before any retry.
   - A 429 honours `Retry-After`; transient failures, including "operation in progress", back off 1, 2 and 4 s; each gets at most 3 attempts inside the deadline.
   - Other 4xx responses refuse and stop.
   - "Already captured" with our intent pending is `reconciled`.
   - Mark-paid is one PUT (status, `transaction_id`, key in `meta_data`) with the note as an echo.
   - Resume needs each target to be in its approved state or the state this proposal's landed operations produced.
   - A second `execute` gets `approval_used`.
   - Eval runs never retry.
7. **Summary faithfulness** (beside pass).
   - Code checks: `unsupported_figure` / `contradiction` against priced and checked numbers, `unread_record`, `beyond_proposal`.
   - The judge is Gemini 3.5 Flash-Lite, a different family from the agent. It never sees the key and makes three binary coherence calls.
   - Controls: ≥9/10 on 10 coherent and 10 planted summaries; the owner labels 20 real ones and we report TPR/TNR.
8. **Grader version** (owner; `no-grader-version`; ADR 0006).
   - Pass = f(run log, answer key, world version, grader version).
   - The executor joins the policy version.
   - CI reads the grader paths from `origin/main` from the v1 tag. A grader-only PR carries a re-grade with flips.
   - Run logs are archived in the home checkout, with a committed manifest of verdicts.
   - Held-out flips are reported beside the headline.
9. **Check modes** (owner; `enforce-now`).
   - Pass's own parts are enforced from the start.
   - Observing on batch one: `verification_mismatch`, the figure parser, `unread_record`, `beyond_proposal`, the judge and `pricing_vs_execution`.
   - The owner reviews false alarms, then every check is enforced and frozen before sealing. There's no escape hatch.
10. **Grader self-test** (owner; `self-authored-bad`).
    - The oracle proposal must pass every case, with boundary-good controls at 9.9% and ₹1,499.
    - The planted bad proposals: wrong capture, write outside the set, mark-paid without capture, no approval event, wrong kind, 10.1% and ₹1,501 off, a wait past the deadline, a duplicate target.
    - Codex's half is sealed by hash and reported by class. The catch rate, false flags and the first layer to catch each one are reported per author.
    - At sealing, Codex runs the self-test on the held-out set and commits only counts.
11. **Property tests and the fault table** (owner; `no-property-tests`).
    - fast-check on development cases checks the owner's five invariants, measured on the change since the snapshot, plus agreement between oracle and reader.
    - It uses 2n+1 crash points, one real kill, and a fixed seed list in CI. `--explore` commits every failing seed.
    - The M3 table has one row each for: a lost ack (capture, PUT, notice), a crash, a stop between a capture and its mark-paid, a duplicate, a changed target, 429/5xx/operation in progress, an unreadable switch, a mutant executor and a forged hash.
    - Injection rows are in the table and scored by the grader; their fixes belong to section 10.
12. **`npm run verify:e1`** (owner; `no-e2e`).
    - With no model call, it runs every development case's oracle proposal, the floors and the checklist end to end against the expected stamp in each answer key and a committed scoreboard.
    - It runs in CI on E1 PRs in under 2 minutes.
13. **Test mode:** later, once, after the reveal, never in pass.
    - It covers one #670 run on a real WooCommerce install.
    - The diff normalises ids and times, with a committed `e1/testmode/approved-diffs.json`.
    - The README says "the executor has never touched a real backend" until then, and lists what the simulator never does.

## Overrule in a word

Owner's: `no-grader-version` · `whole-world-mismatch` · `no-property-tests` · `enforce-now` · `blank-stamp` · `self-authored-bad` · `no-e2e`. Mine: `recovery-in-pass` · `same-tools` · `no-oracle` · `target-snapshot` · `keep-sale` · `24h-watch` · `new-run-on-reopen` · `two-calls` · `blind-retry` · `resume-strict` · `reexecute-noop` · `same-judge` · `executor-in-grader` · `addendum-0002` · `commit-runlogs` · `open-codex-bad` · `no-held-out-selftest` · `random-seeds` · `testmode-now` · `testmode-never`.

## Handed to later sections

- **1 world build:**
  - the sale-week calendar as merchant data;
  - the post-sale no-cause case and the webhook control, within the 16;
  - an expected stamp in every answer key;
  - order `meta_data`, `transaction_id`, `date_paid`; payment `amount_refunded`.
- **2 evals:** the pass signature now includes the grader version (pre-registration); whether held-out messages carry injections is Codex's call.
- **5 autonomy:** the resume rule and `approval_used` refine decision 9.
- **7 run logs:**
  - display the stamp, the `verification` event (pre-existing, resolved, mismatch, world_change), check modes, `reconciled` outcomes, watch windows and skipped weeks;
  - the archive and manifest;
  - a run-log schema change must still load and replay every old run log, with a round-trip property.
- **8 trigger and the merchant's view:**
  - whether the alert also skips the sale week (that would remove post-sale no-cause dips);
  - assumed: reopened starts a fresh run in the demo;
  - the merchant sees all three tiers, labelled as verified without an answer key.
- **9 budget:** judge cost (assumed negligible), CI time for property tests, test mode's 1-2 days.
- **10 harness ladder:** injection and poisoned-output fixes are rungs; the grader and policy versions are never rung variables.
- **11 presentation:**
  - credit Osmani accurately (direct: property tests, the tolerant diff, the verify smoke; adapted: everything else);
  - the confusion table;
  - test-mode claims.
- **Weekly retro:** add `verify:e1` and the grader-path rule to AGENTS.md's Done.

## Files changed (uncommitted)

- `GLOSSARY.md`:
  - new Verification group (verifier, pre-existing disagreement, mismatch, watch, verification stamp, realised rupees);
  - sale week;
  - grader version, check mode, oracle proposal and grader self-test;
  - approval and policy version amended.
- `docs/adr/0006-grader-versioned-out-of-reach.md` (new).
- `.scratch/e1-design/06-verification.md` (this file).
