# E1 section 8: the trigger and the merchant's view

Settled with the owner 2026-11-24/25 (round 1 Q1-Q8, round 2 Q1-Q15, "yes to all"; the owner rewrote round 1 Q5: the trigger is internal and messages no one, and notices go out only when the merchant has something to decide or do). Each round was checked against the owner's Notion "AI Engineering Roadmap" (section 5, M3's "the Case screen shows … exactly what the human is authorizing", Temporal timers), "Learn AI Agent Harness & Loop Engineering In 19 Min" (blocked-state notification hooks, confirming the target end state) and "You Can Learn AI Agent Observability & Eval In 20 Min" (spend shown equals the trace, pre-call budget gate, failures disclosed). Words follow `GLOSSARY.md`; the trigger decision is `docs/adr/0008-trigger-compares-a-week-earlier-and-keeps-the-sale.md`.

Facts checked:
- **GA4 crossings** (`data/ga4-merch/daily.csv`, daily resolution, sale week kept): a 3-week same-weekday average fires on 0 of the 14 days that can be "now" (23 Nov-6 Dec). The same 24 h a week earlier fires on 6 of 28 (9 Nov-6 Dec): 9 Nov, 15 Nov, 26 Nov, 1 Dec, 2 Dec and 6 Dec by revenue, but only 3 by orders alone.
- **Razorpay:**
  - Agent Studio (30 Mar 2026) escalates "typically on WhatsApp", runs every agent review-first, and turns an agent off in one tap; its terms (s.3.15) say a pause stops new runs, not one in progress.
  - Downtimes reach merchants through `payment.downtime.*` webhooks and email on request.
  - Success-rate analytics is a dashboard feature, enabled on request, that sends no alert.
  - A disabled webhook emails its alert address.
- **WooCommerce:** new-order emails and Woo app push (new orders, stock and reviews, with thresholds). Neither Razorpay nor WooCommerce sends a revenue-dip alert.

## Decisions

1. **Trigger (ADR 0008).** Store revenue over the trailing 24 h is ≥25% below the same 24 h 7 days earlier. It is checked hourly on the case clock, and the first crossing becomes the case's frozen "now", never chosen by hand. The world's daily store revenue follows GA4's daily revenue in INR, not only its order counts. A world gate recounts crossings per hour: ≥6 distinct days, or the README says cases share windows. Every cause's injection must cross the threshold.
2. **Sale week.** The trigger keeps it and the watch skips it. Sale week = Mon 23-Mon 30 Nov 2020, shifted by whole weeks.
3. **Trigger record** (replaces "alert"). It holds the dip window, store revenue in it, the comparison window and its revenue, the gap, the threshold and "now", all from code. The run and the checklist get byte-identical copies, and a test asserts it. No merchant text ever enters a run.
4. **Notices** (owner). A trigger pushes nothing; the app may show "Investigating…" to whoever opens it. Notices come from fixed templates, with figures from code.
   - **Urgent:**
     - priced proposal ready (dip, cause, fix, recoverable ₹, approve/reject, "needs a second confirmation" on escalation);
     - 6 h before expiry, skipped if the proposal was born under 6 h;
     - run failed or void twice (the dip, "our investigation couldn't finish", a fixed check-by-hand list; it cannot be switched off);
     - expired, or born expired;
     - partially applied or `mismatch`.
   - **Quiet:**
     - no cause ("nothing is broken": the dip and why);
     - wait (the re-check time);
     - watch resolved or uncertain.
   - **None:** execution completed, and reopened (its fresh run's proposal notice follows).

   Section 5's two notices stand.
5. **Dip lifecycle.**
   - One open dip per store; crossings inside it do nothing.
   - It closes on a watch stamp, a rejection, expiry, the failure notice or the run cap.
   - It re-arms once the trailing 24 h is back within 10% of its comparison.
   - Reopened starts a fresh run at once. Rejected or expired dips re-run only through "Investigate again".
   - At most 3 runs a dip. A void run restarts once automatically.
6. **Re-check.** It is code, not a model run. On a durable case-clock timer, code evaluates the trigger again; a fresh run starts only if the dip persists, and otherwise the watch closes the dip with a quiet notice.
7. **No-cause windows.** Development and held-out cases use disjoint windows. 1 Dec stays in development (the post-sale proof case). Codex picks the held-out 3 of the other 5 (≥2 sale-related) in the sealing commit. The README says the windows are public by construction.
8. **Section 6 amended.**
   - The watch keeps the 3-week sale-skipping average and its thresholds. A one-week comparison would wrongly reopen a correct "no cause" at 1 Dec (3 Dec vs 19 Nov, −35%).
   - The proof's "sale left in" half now tests the trigger: kept, 1 Dec fires at −38%; skipped, it would not (+8%). It no longer tests the watch, which real data can't satisfy (−8%, −10%).
9. **Demo clock.** One case clock. It moves only by the agent's `wait` and a logged advance control (1 h, 6 h, next event); approval and execution take no case time; wall time never moves it. This resolves the conflict between sections 5 and 7. The screen shows "Case clock (simulated)" beside real time.
10. **Session log.** One append-only, hash-chained `session.jsonl` per demo session (ADR 0007 format) records:
    - trigger records;
    - dip opened, closed and re-armed;
    - `clock_advance`;
    - notices;
    - `run_started` (run id, head);
    - re-check timers;
    - "Investigate again".

    Eval runs have none.
11. **Screens.**
    1. **Home:** during a run it shows progress from `call_intent`, calls left and cost from the run log; no model text before `propose`.
    2. **Notice inbox.**
    3. **Card:** section 5's order, end state first; approve, reject, or a second confirmation on escalation.
    4. **Execution:** rows per operation and Stop.
    5. **Stamp:** three tiers, captioned "Checked by re-reading Razorpay and WooCommerce, without knowing the right answer".

    Never shown to the merchant: pass, the answer key or reasoning.
12. **Notices land** in a simulated phone inbox: urgent buzzes, quiet sits, "nothing is sent; planned: WhatsApp". Customer updates go to a separate masked customer outbox. v1 sends nothing real.
13. **Live versus public.**
    - Paid runs are local and owner-only (`npm run e1:lab`, the Case lab's server pattern, ledger and ceiling).
    - The public sees masked replays at a static `app/e1/[sessionId]`.
    - The Worker's gate adds `/e1/` as GET-only, with a test that the bundle can't reach the provider.
    - The Case lab and `/runs/[runId]` stay v0.1, untouched.
14. **One renderer.** The merchant view is a pure function of (session log, run logs) up to a cursor: live re-renders a growing log, public scrubs a finished one. The notice inbox, card, execution and stamp work at 390 px; the record and derived panes are desktop.
15. **Labels.** Every screen opens with a code-written strip: simulated (merchant, payments, customers, notices, clock; real GA4 rhythm), built (agent, trigger, pricing, executor, verifier, against the simulator), planned (test mode, real notices, an outside merchant). It adds "Razorpay and WooCommerce don't send revenue-dip alerts; this trigger is CrossSignal's", and is linted at export.
16. **View test.**
    - Section 5's card test runs on this card at 390 px, opened from its notice, and reports time to decision. Below 10/12, or a median over 60 s, the card changes before the reveal.
    - A 6-notice test: the owner's intended action must match on all 6.
    - An optional, non-gating think-aloud with one WooCommerce merchant.
17. **Scope now.** Three slices after the world and harness:
    1. trigger and session log;
    2. live lab and renderer;
    3. public route.

    Deferred: "Investigate again", polish beyond the card, the outside session and real sending.

## Overrule in a word

Owner's: `alert-notice` (notify when the trigger fires). Mine: `mean3` · `median3` · `20pct` · `orders-only` · `daily-check` · `skip-sale` · `alert-chart-breakdown` · `merchant-context` · `wall-clock` · `approval-advances` · `public-live` · `no-strip` · `one-level` · `notify-on-complete` · `no-rearm` · `auto-rerun-rejected` · `no-run-cap` · `recheck-run` · `shared-windows` · `watch-wow` · `keep-proof` · `no-session-log` · `show-reasoning` · `partial-findings` · `real-whatsapp` · `extend-case-lab` · `desktop-only` · `no-notice-test` · `build-all-now`.

## Handed to later sections

- **1 world build:**
  - daily store revenue follows GA4's daily revenue;
  - the per-hour crossing gate;
  - every cause crosses the threshold;
  - the sale calendar, 23-30 Nov;
  - the disjoint no-cause windows.
- **2 evals:** the pre-registration names the trigger and the window split; Codex's window pick goes in the sealing commit.
- **6 verification:** decision 8's amendment to its proof case.
- **9 budget:** demo live runs are local only, about 10 at ~$0.08, so about $1. The video and site use recorded runs. The 3-runs-a-dip cap bounds a looping dip at about $0.25.
- **10 harness ladder:** trigger settings are never a rung; changing them changes the world version.
- **11 presentation:**
  - **Video:** 1 Dec, quiet "nothing is broken, it's the sale's shadow", then a #670 case with its late-authorization decoy: urgent notice → card → approve → execution → landed → advance → resolved.
  - **README first screen:** the strip, the headline against the checklist with the clean/decoy split, and the link to that session's replay.
  - Credit Razorpay's WhatsApp escalation and pause scope accurately.

## Files changed (uncommitted)

- `GLOSSARY.md`: dip amended; new trigger, trigger record, case clock, customer update; new "merchant's view" group (notice, re-check, session log); opt-out now says customer update.
- `docs/adr/0008-trigger-compares-a-week-earlier-and-keeps-the-sale.md` (new).
- `docs/adr/0004-…`: addendum, the trigger record replaces "alert"; the re-check is code.
- `docs/adr/0003-…`: addendum, customer updates.
- `.scratch/e1-design/08-trigger-and-view.md` (this file).
