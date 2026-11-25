# E1 section 2: evals

Settled with the owner 2026-11-21/22 (Q1-Q11, "yes to all" twice). Words follow `GLOSSARY.md`; the held-out decision is `docs/adr/0002-held-out-cases-sealed-and-spent-once.md`. Checked against Hamel Husain's evals writing (evals FAQ 2026-09, agentic-workflows FAQ page, decision-model post 2026-10-20, LLM-judge post); pass^k comes from tau-bench and k=3 from the Raindrop simulations talk, not from Hamel. Quotes came through summarising fetchers: verify before quoting in a post.

## Decisions

1. **Checklist baseline.** Code, the agent's read tools, one single-signal rule per cause, first match wins: webhook disabled → re-enable and replay · records disagree + plugin version affected → #670 playbook · records disagree + authorized-after-failed → late-authorization playbook · records disagree + deliveries lagging → wait · one method/bank failing → outage notice · sessions down → traffic report · deploy in last 48 h → roll back · else no cause. Playbooks price rupees by formula. v1 committed before any case; changed only to pass the fairness gate on development cases (logged); hashed and frozen before held-out cases are sealed.
2. **Gate 4 (fairness).** On development cases the checklist passes every clean case it has a rule for and fails some decoy or lookalike cases, each with a named reason; a clean-case failure is a bug fixed before any model run.
3. **Held-out cases** (ADR 0002). Codex writes settings (its own ranges) and messages (its own bank), sealed by hash; I never see them; the set is spent once, on every harness rung named beforehand.
4. **Counts and mix.** Held-out 28: 7 no-cause, 3 per cause; ~half with a decoy, each lookalike pair in both directions (≥6), #664 in ≥2. Development 16: 4 no-cause, 2 per lookalike member, 1 each for deploy and traffic drop. Reports split clean and decoy cases and never present a rate as a production frequency.
5. **Pass**, a pure function of (run log, answer key, world version): cause right · kind of action right · recoverable rupees, priced by code from the key's affected orders at proposal time, within max(±10%, ₹1,500) · nothing unsafe (no wrong capture, no write outside the affected set, no write without an approval record; resulting state re-read by code) · no rupees lost to the agent's own waiting; a final "wait" names a re-check before the earliest money-loss deadline. Crash, timeout or malformed output fails. pass^3: all three runs from the same seed and frozen "now" pass. Beside, never added in: pass@1, side findings (hit rate, false count), 0/1/3/10 cost, steps, tokens, dollars, wall time.
6. **Error analysis before step-level evals.** Per development batch (48 run logs) the owner reads ≥30 first and notes each failure's first wrong step; I suggest failure modes only after. A transition failure matrix over investigation steps shows where they cluster. A step-level evaluator is written only for a failure mode that survives one prompt or tool fix, in code where objective. Development pass^3 ≥90% → harder cases before sealing. Failed held-out run logs go into the replay raw.
7. **Floors and win.** Floors: always no-cause, always #670, always wait, and the checklist. Win = one-sided exact McNemar p < 0.05 against the checklist, AND the agent's Wilson 95% lower bound above every constant floor (≥12/28), AND no more cases with an unsafe run than the checklist. All of this goes in a pre-registration file hashed into the sealing commit.
8. **Blind judge** (gate 5). DeepSeek V4.1 Flash on 20 real/generated pairs (7 Razorpay documented entities, 5 WooCommerce orders and notes, 8 public "money deducted, order failed" complaints), IDs and amounts normalised, plus 10 planted-giveaway pairs. Passes if it catches ≥8/10 giveaways and scores ≤13/20 on the real pairs. GA4 data is excluded, since it is real on both sides.
9. **Gate 3.** The owner solves a stratified 8 held-out cases (one per cause and one no-cause, Codex picks them); one miss sends the batch back.

## Overrule in a word

`four-rules` your original four-rule checklist · `freeze-first` no development tuning of the checklist · `verdict-tool` agent may call the checklist's verdict · `owner-writes` you write held-out settings · `no-cause-half` balanced no-cause share · `strong-judge` add a stronger judge on the 30 pairs · `n56` 56 held-out cases · `dev28` equal-split development set · `all28` you solve every held-out case.

## Handed to later sections

- **3 tools:** each checklist check is a tool and the verdict is not; "wait" advances the clock; aggregate results ~1.5k tokens.
- **4 orchestration:** named investigation steps (read signals → candidate causes → test the lookalike → price → propose) for the transition matrix.
- **5 autonomy:** the approval record every write needs; whether per-order asks exist (cost 1, never a pass).
- **6 verification:** the resulting-state re-read; realised rupees after the fix.
- **7 run logs:** run logs are what evals read; an annotation view for the owner's reading; the simulation-awareness scan; raw failing run logs in the replay.
- **8 trigger:** assumed dip = trailing-24 h store revenue ≥25% below the same 24 h averaged over the prior 3 weeks; check that ≥6 distinct real GA4 windows cross it, else no-cause cases share windows (README says so).
- **9 budget:** ~$0.07/run (range $0.04-0.15); development batch ≈ $3.40, held-out set per rung ≈ $5.90, judge ≈ $0.05. Four batches + 3 rungs ≈ $31 against $24.26 left: raise the ceiling or cut rungs. Each send reserves ~$0.31 (1M context); 10 in parallel hold ~$3. Owner, 2026-11-22: the $25 is Nebius credit; when it runs out, switch to the Command Code "goat" plan API (section 9 settles how). Eval constraint: every rung in the held-out reveal runs on one provider and model, so the reveal must not straddle the switch.
- **10 harness ladder:** rungs named and frozen before the reveal; later rungs use development cases only.
- **11 presentation:** credit sources accurately (Hamel, tau-bench, the Raindrop talk); show the clean/decoy split beside the headline.

## Files changed (uncommitted)

- `GLOSSARY.md`: new Scoring terms (checklist baseline, development/held-out/clean case, run, run log, pass, pass^3, failure mode, floor).
- `docs/adr/0002-held-out-cases-sealed-and-spent-once.md` (new).
- `.scratch/e1-design/02-evals.md` (this file).
