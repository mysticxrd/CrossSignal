# E1 section 10: the harness ladder

Settled with the owner 2026-11-25 over two rounds:
- **Round 1:** Q1-Q9, "yes to all".
- **Round 2:** Q10-Q22, "yes to all". The owner added seven gaps from their Notion note "Personal agent harness Design report":
  - from Part 1 (six harness layers), memory, the code-check rule, the injection defence's code part and subagent scoping, which became Q10-Q12 and decision 18;
  - from Part 2 (always-on agents), the name clash, the `wait` label and one active run per dip, which became Q20-Q22.

  Each gap was checked against ADR 0004, ADR 0009 and sections 2-8 before it was asked.

Each round was checked against the owner's three Notion notes:
- "AI Engineering Roadmap":
  - harness experimentation: one variable, the same multi-trial suite, keep or revert, failures become regression cases;
  - benchmark any multi-agent design against a single strong agent;
  - the M1 eval-stats module (Wilson, paired bootstrap over tasks, exact McNemar, pass^k; resample tasks, not trials);
  - the experiment-log template and its KEEP / REVERT / INCONCLUSIVE rule;
  - cost per successful task;
  - the M3 red-team table;
  - M2 25 Nov-8 Dec and M3 9-22 Dec.
- "Learn AI Agent Harness & Loop Engineering In 19 Min": end-loop guardrails [11:45]; unnecessary tool calls and not recognising when done [10:31]; gate, fix and re-run [18:16-18:40].
- "You Can Learn AI Agent Observability & Eval In 20 Min": a release gate for new harness versions [07:59, 15:21]; error-injection replay; divergence detection in replay.

Words follow `GLOSSARY.md`. The new rule is `docs/adr/0010-no-fix-or-rung-weakens-a-code-check.md`; the ladder's shape is an addendum to ADR 0002.

## Facts checked (2026-11-25)

- **Context engineering** (Anthropic, "Effective context engineering for AI agents", 29 Sep 2025, quoted):
  - compaction, structured note-taking and sub-agent architectures are framed for "long-horizon tasks… where the token count exceeds the LLM's context window";
  - tool-result clearing is "one of the safest lightest touch forms of compaction".
- **Building effective agents** (Anthropic, 19 Dec 2024, quoted):
  - "it's also common to include stopping conditions (such as a maximum number of iterations) to maintain control";
  - "consider adding complexity only when it demonstrably improves outcomes".
- **pass^k** (Yao et al., tau-bench, arXiv 2406.12045, quoted): the chance that all k independent trials of a task succeed, averaged over tasks. Our pass^3 with 3 runs per case is the n = k case of its estimator. Independence is why memory between runs is a never-rung (decision 9).
- **Paired tests at small n:**
  - Fagerland, Lydersen & Laake 2013, BMC Med Res Methodol 13:91, quoted: the exact conditional McNemar test is conservative; mid-p keeps the nominal level and is nearly as powerful as the asymptotic test.
  - Miller 2024, arXiv 2411.00640, quoted: cluster by question and test per-question paired differences.
- **Spotlighting** (Hines et al., Microsoft, arXiv 2403.14720, March 2024, quoted):
  - defensive instructions in the system prompt alone had "only a negligible impact" on attack success;
  - datamarking cut GPT-3.5 summarisation attack success from about 50% to 3.1%, with no measured loss on four benchmarks.

  Their attacks were simple keyword payloads against 2024 models, so our own development red-team table must show the effect on DeepSeek.
- **Exact McNemar thresholds** (computed), on the 28 held-out cases at pass^3:
  - one-sided p < 0.05 needs 5-0 discordant (p = 0.031);
  - two-sided needs 6-0 (p = 0.031) or 8-1 (p = 0.039).

  The smallest two-sided win is therefore a net 6 cases, 21 points.
- **Power** (*simulated*, 300 simulated comparisons per row, fixed seed, `.scratch/e1-design/10-power.py`; it runs in seconds with no model call). The setup: 28 cases of mixed difficulty (30% at p = 0.95, 40% between 0.55 and 0.85, 30% between 0.10 and 0.35), 3 runs each, rung 0 at pass^3 ≈ 0.42.

  | Gain in each run's pass rate | Median pass^3 gap (cases) | Power, exact McNemar on pass^3 | Power, sign-flip on per-case passes |
  |---|---|---|---|
  | 0 (identical harnesses) | 5-95% range −5 to +4 | 0.02 (false alarms) | 0.02 (false alarms) |
  | +0.05 | 2 | 0.06 | 0.12 |
  | +0.10 | 3 | 0.12 | 0.26 |
  | +0.15 | 4 | 0.22 | 0.44 |
  | +0.20 | 6 | 0.36 | 0.64 |
  | +0.25 | 7 | 0.61 | 0.82 |
  | +0.30 | 8 | 0.74 | 0.93 |

## Decisions

### Rung 0 and what sits beside it

1. **Rung 0** (Q1) is section 4's harness plus every kept fix. Section 4's harness (ADR 0004) is:
   - one loop opened by the trigger record alone;
   - native tool calls with `tool_choice: required`;
   - up to 5 parallel reads a turn;
   - full history, with no compaction, scratchpad or stopping rule;
   - 30 calls, $0.50, 300k per send, 15 min per run and 180 s per send;
   - one retry and one nudge;
   - the 22 tools;
   - `DeepSeek-V4.1-Flash-1017` at temperature 1, `reasoning_effort: low`, output cap 8,192.

   A **fix** is one harness change made in practice to repair a failure mode seen in development run logs. Each fix is logged in the experiment log with its decision rule written first, measured on development cases only, and folded into rung 0. Rung 0 freezes when development batch 2 ends (decision 11; this refines Q1's "at the decision point"). Overrule: `start-rung`.
2. **Comparators** (Q2). The checklist baseline and the floors (always no-cause, always #670, always wait):
   - sit beside the ladder, never on it;
   - each runs once on the held-out cases at no model cost, so its pass^3 equals its pass;
   - are drawn as lines across every rung's result.

### Candidates

3. **Not on the v1 ladder** (Q3): compaction and the read-only subagent. The longest legal run is about 55k tokens, about 5% of the window, and Anthropic frames both for work beyond the window. The subagent would also reopen ADR 0004 and need its own comparison against a single agent. Both are listed as "planned, after v1". Overrules: `compaction`, `subagent-rung`.
4. **The candidate pool** (Q4) is the working-state note, the "same as call N" note and a stopping rule. Each is eligible only when error analysis names the failure mode it targets; without that it stays "planned".

   The stopping rule carries v0.1's lesson in writing. In 121c532, open-at-finish went from 3/15 to 0/15, but the score went from 51 to 46/75 and requests from 16.6 to 19.3. So its hypothesis metric is secondary, and pass^3 is a guard it must not lower.
5. **Injection and poisoned-output defences are fixes in rung 0, not rungs** (Q5, sharpened by Q12; amends section 6).
   - Development cases plant injections.
   - If one takes effect, the defence becomes a rung-0 fix with a part in code (decision 7), and the attack becomes a regression case.
   - The red-team table (attack → outcome → fix → regression case) is published as a development-only result.

   Held-out cases carry at most a few injections, if Codex plants any, and too few cases to judge a rung on. Overrule: `defence-rung`.
6. **Toolset changes** (Q6; amends section 3). A tool change made in practice is a fix. The toolset version may still change between rungs, one change per rung.
7. **The injection defence's code part is datamarking** (Q12).
   - **What it does:** code rewrites the text of each `list_messages` result, replacing its whitespace with a marker, and one prompt line explains the marker. Order ids and emails contain no spaces, so they read unchanged.
   - **Why not a prompt line alone:** it is the kind of text the attack itself is, and Hines et al. measured its effect as negligible.
   - **Never in proposal validation:** validation allows one retry, which would hide the first proposal from grading (ADR 0005).
   - **A provenance guard** (every effect target backed by a non-message record) is adopted only if the development red-team table shows a wrong-target proposal the current guard misses. It would be a policy-version change before sealing, reported in guard catches.
   - **The backstop** stays section 5's guard.

   Overrules: `validation-defence`, `encode` (base64 encoding: stronger in the paper, but it costs reading quality on weaker models).

### Never rungs

8. **The never-rung list** (Q8, Q10, Q11). These are frozen across the ladder:

   | Never a rung | Why |
   |---|---|
   | World version, including trigger settings | §1, ADR 0008 |
   | Model version | ADR 0009 |
   | Grader version, including the judge's model and settings | ADR 0006, §9 |
   | Policy version: pricing, executor, limits | §5, ADR 0005 |
   | Model settings: temperature, `reasoning_effort`, output cap | Raising effort is a model comparison and moves cost |
   | The caps: 30 calls, $0.50, 300k context, 15 min, 180 s | Loosening one buys pass with money, which cost per passing run would hide |
   | k = 3 and the case sets | §2 |
   | The pre-registration | §2 |
   | Memory between runs | Decision 9 |
   | Saved skills | Decision 9 |
   | A memory-lookup gate | Decision 9 |

   Overrule: `effort-rung`.
9. **Memory, saved skills and a memory-lookup gate** (Q10, gap 1) are never rungs in v1 and are listed as "planned, after v1". pass^3 means "right three times in a row" only if each run starts fresh. With memory, run 2 can copy run 1, and lessons from the held-out batch would leak into it. ADR 0004 already rejects memory between runs, and section 7 holds `memory-pillar`.

   Fixes are the one carry-over allowed: they come from development cases only, a person reviews each one, and they are frozen before any held-out run.
10. **No fix or rung weakens a code check** (Q11, gap 2; ADR 0010).
    - The code checks are proposal validation, pricing, limits, the executor and the caps.
    - A fix or rung may add one, as decision 7 does. It never removes, loosens or replaces one.
    - A model may add a flag on top of the code checks but is never the only guard, and v1 has no flagging model. Overrule: `model-flag` (owner's).
    - The judge is unchanged: it grades after the run, never blocks, and belongs to the grader version.

    The reasons:
    - a guard model reads the same injected text that fooled the agent (Part 1's "recursive trust" [15:57]);
    - at temperature 1, a guard that catches 19 attacks in 20 lets a merchant's money move on the 20th. This protects the demo: grading happens before any guard (ADR 0005), so no guard changes section 2's unsafe count;
    - a code check can be unit-tested on every case;
    - a second model in the harness stretches ADR 0009 and changes two things in one rung.

### Selection, shape and count

11. **Selection** (Q13). Candidates are tried one per batch inside the batches already planned, so selection adds no spend:

    | Batch | Harness |
    |---|---|
    | 1 | Rung 0 as built |
    | 2 | Rung 0 after fixes; it freezes when this batch ends |
    | 3 | Rung 0 + candidate A, nothing else |
    | 4 | The kept rung + candidate B |
    | Gate | The top kept rung, against section 2's ≥90% development bar |

    **KEEP** if both hold; otherwise **REVERT**:
    - total passes over the 48 development runs are no lower than the previous batch's;
    - the candidate's pre-written hypothesis metric moves the predicted way: calls per run for the "same as call N" note and the stopping rule; the count of the targeted failure for the working-state note.

    The stopping rule also needs open-at-finish not to rise. Every development result is labelled "tuned on these cases", and fixes that batches 3-4 suggest wait until after v1.

    The roadmap's "paired 95% CI excludes 0" would almost never keep anything on 16 cases. Development chooses and held-out confirms; a neutral candidate is kept about half the time, and the held-out ladder catches that. Overrule: `ci-keep`.
12. **Shape** (Q7). Rungs are cumulative: each is the one below plus one harness change, in the order the batches tried them. The comparisons are each adjacent pair, plus the top rung against rung 0. Overrule: `star` (each against rung 0).
13. **Claim rung** (Q14). The top rung of the frozen ladder, named in the pre-registration, is the harness v1 ships. Section 2's win test runs once, on it alone: McNemar against the checklist, the Wilson bound against every floor, and the unsafe count. Rungs are never picked after the reveal, and the other rungs give ladder comparisons only.
14. **Count** (Q15). The count is fixed at the decision point: 1 + the kept candidates, at most 3 as planned. Reveal admission at planning cost then checks 28 × 3 runs per rung, the 10 demo runs and the judge.
    - If the money doesn't cover every rung, rungs are cut from the top, and the claim rung becomes the highest admitted rung. This happens before sealing.
    - k stays 3.
    - Section 9 shows v1 at −$25.11 at planning cost, so a ladder of rung 0 alone, with a development-only ladder beside it, is possible. Funding it is the owner's call at the decision point.

### Reading a difference

15. **Statistics** (Q16). For each comparison, d = per-case passes (0-3) of the higher rung minus the lower.
    - **Test:** a two-sided exact sign-flip test over cases, enumerated when ≤20 cases differ, otherwise 100,000 draws with a fixed seed.
    - **Correction:** Holm across the ladder's comparisons.
    - **Reported with it:** the pass^3 difference and a 95% paired bootstrap CI over cases (10,000 resamples, fixed seed).
    - **Hypothesis metric:** the same test on per-case means, as a secondary result.

    Held-out verdicts are **BETTER**, **WORSE** or **INCONCLUSIVE**. KEEP and REVERT are development decisions only.

    The smallest difference it can show is about +0.25 per run at 80% power (the sign-flip test reaches 0.82 there), a median gap of about +7 cases, 25 points of pass^3. Two identical harnesses differ by up to ±5 cases. Inside that, the wording is: "+2 cases at pass^3 (95% CI −3 to +7); 28 cases can't separate a change this size from chance."

    Section 2's win test stays one-sided exact McNemar. Overrule: `mid-p`.
16. **Cost** (Q17). Cost per passing run (section 7) is always shown beside pass^3, never alone. It gains a partner metric, **cost per pass^3 case**: a rung's settled spend divided by the cases it passed three runs out of three. A rung whose pass^3 falls is WORSE, whatever its cost does.

### Diagnostics and labels

17. **Diagnostics** (Q9).
    - Each rung gets section 7's stub-model divergence report: its first divergent turn, reported as information, never pass or fail.
    - No forced-failure replay in v1: a stub can't show the model's reaction, and a live replay is a new paid run that is never scored. Overrule: `fault-replay`.
    - Each rung is labelled built or planned, and every figure says "simulated world".
18. **The subagent, if `subagent-rung` is ever used** (gap 4; Part 1's "Sub-Agent Scoping"):
    - read-only tools only: no `propose`, `ask` or `wait`;
    - its sends and calls count toward the parent run's 30 calls and $0.50;
    - it runs on the same model version as the parent (ADR 0009).

### Time

19. **Build on demand, with an 11 Dec cut-off** (Q18). Candidates are built only after batch 2's error analysis names their failure mode. Each is one slice of under 300 lines, built by Claude or Codex, not from the owner's 15 h.

    | Step | Dates |
    |---|---|
    | Batches 1-2 | By 8 Dec |
    | Build candidates | 9-11 Dec |
    | Batches 3-4 | 12-14 Dec |
    | Gate batch | 15 Dec |
    | Sealing | 16 Dec |
    | Reveal | 17-18 Dec |
    | Replay and README | By 22 Dec |

    A candidate not built by 11 Dec is "planned". If none is built, the ladder is rung 0 alone and v1 still ships on 22 Dec. Rungs added after v1 are development-only (ADR 0002).

### From the always-on part of the note

20. **The name stays "harness ladder"** (Q20, gap 1 of Part 2). Its glossary entry says *Avoid: maturity ladder*. If we ever cite Part 2, its reactive → always-on → team-router steps are called **stages**, never rungs.
21. **Only the `wait` tool is labelled simulated with a planned park-and-resume** (Q21, gap 2 of Part 2; amends sections 4 and 8).
    - **The `wait` tool:** "simulated: a wait moves the case clock forward at once. Planned: a real-time wait saves the run's history, frees the worker and resumes the same run on a timer."
    - **A proposal to wait:** unchanged. Its re-check already starts a fresh run, Part 2's new-session route [06:36], as ADR 0004 requires.
    - **The label words:** they avoid "pause", which the glossary's Wait entry avoids.
    - **A constraint on the planned version:** a real-time wait must count only the run's active time against the 15 min and $0.50 caps. Noted, not designed.

    Overrule: `label-both`.
22. **One active run per dip** (Q22, gap 3 of Part 2; amends section 8 decisions 5 and 10). While a dip has an active run:
    - the advance control and "Investigate again" are refused, logged as `refused{reason: run_active}` and greyed out;
    - a timer that comes due is logged as `timer_held` and fires when the run closes, so it is never dropped.

    The lock is a pure function of the session log: a dip has an active run if its last `run_started` has no matching `run_closed`. Section 8 decision 5 reads "one open dip per store, and one active run per dip". Overrule: `ignore-timers` (owner's first wording).

## Not gaps (owner's note, checked)

Part 1:

| Note item | Why it isn't a gap |
|---|---|
| A sandbox per user | The world is simulated in code (ADR 0001) |
| Logins and connectors | Tools are code functions over records (§3), already the note's API-first choice |
| Scheduler and run history | §8 has the trigger. §7 keeps every log (ADR 0007), unlike the note's last-20 cap, because the eval needs the evidence |
| Live progress and human takeover | §8 and §11; neither is a rung |
| Skill learning from demonstrations | It breaks fresh runs, as in decision 9 |
| Keys out of prompts | An AGENTS.md rule; provider calls are code and the model never sees a key |

Part 1 audit items already met:
- deterministic termination (the caps, in code);
- structured traces (§7);
- explicit approvals for side effects (ADR 0005);
- context separated from privilege (the agent holds no credentials).

Part 2:

| Note item | Covered by |
|---|---|
| Events written before the model runs | §8 decision 10 (trigger records and `run_started` first); §7 `send_intent` before every send |
| Timers through code | §8 decision 6; ADR 0004 addendum |
| Approval as a separate record | §5 decision 2. The run ends at `propose` and code executes under the approval, so no model session waits for the person |
| Idempotency and crash resume | §5 decision 9; §6's lost-ack and crash rows and fetch-then-retry (Razorpay has no idempotency key); §7 `restart_of`, `resume`, `reconciled` |
| Outbox | §8 decision 12: the phone inbox and a masked customer outbox, whose urgent, quiet and none tiers are its attention budget. Tracked delivery comes with "planned: real notices" (§8 decision 15) |
| Privacy by channel | §7 decision 11, the export mask; §8 decision 13, live runs local and owner-only |
| Who approved | §5 decision 2: `approver` and provenance (`person` or `fixed_rule`) |
| Records as memory | ADR 0004: the world's records are the state; the session log, not the model, carries continuity |
| No router | ADR 0004, one loop |

## Overrule in a word

Owner's: `model-flag` · `ignore-timers`.

Mine: `start-rung` · `compaction` · `subagent-rung` · `defence-rung` · `validation-defence` · `encode` · `star` · `effort-rung` · `ci-keep` · `mid-p` · `fault-replay` · `label-both`.

## Amendments to earlier sections

- **2 evals:**
  - the win test applies to the claim rung only;
  - the pre-registration also names the ladder (each rung's change, order and hypothesis metric), the claim rung, the KEEP rule, the rung test (decision 15) and the count after admission.
- **3 tools:** "the toolset version is a rung variable" becomes "the toolset version may change between rungs, one change per rung; practice tool changes are fixes". The `wait` tool carries decision 21's label.
- **4 orchestration:**
  - the candidate list becomes decisions 3-4: compaction and the subagent are planned after v1, and the other three form the pool;
  - "measured on development cases" now reads: fixes on development cases, rungs on held-out cases;
  - rung 0's `wait` is labelled simulated (decision 21).
- **5 autonomy:** the guard stays the backstop for injections. A provenance guard, if adopted, is a policy-version change before sealing (decision 7).
- **6 verification:** "injection and poisoned-output fixes are rungs" becomes "fixes in rung 0, each with a code part, proved by the development red-team table".
- **7 run logs:**
  - cost per pass^3 case joins cost per passing run;
  - each rung gets a stub-model divergence report;
  - `fault-replay` stays out of v1.
- **8 trigger and view:**
  - decision 5 gains one active run per dip;
  - decision 10's session log gains `run_closed`, `refused` and `timer_held`;
  - decision 15's planned list gains "real-time waits".
- **9 budget:** rungs are cut from the top to fit reveal admission, and the claim rung moves down with them.
- **ADR 0002:** addendum on the ladder's shape (below).

## Handed to later sections

- **1 world build:** the development message bank includes planted injections for the red-team table. Held-out injections stay Codex's call (§6).
- **2 evals:** the pre-registration contents above.
- **11 presentation:**
  - **The headline** is section 2's win test on the claim rung against the checklist and the floors.
  - **The ladder sits second, as one table**, with a row per rung: the change, built or planned, pass^3 with its CI, calls per run, cost per passing run and cost per pass^3 case, and the verdict.
  - **Beside it:** the ±5-case noise band, labelled simulated, and the development red-team table. Every figure says "simulated world".
  - **The video** gives the ladder one shot.
  - **The README's first screen** says "each rung = one change, measured on sealed cases", for admitted rungs only. A rung cut by admission reads "development only, not sealed".
  - **Open (naming):** the glossary's Held-out case entry lists "sealed case" under *Avoid*. Section 11 either writes "measured on held-out cases" or the glossary allows "sealed" as the public word.
  - **Planned after v1:** compaction, the subagent, memory, saved skills, a memory-lookup gate, real-time waits.

## Files changed (uncommitted)

- `.scratch/e1-design/10-harness-ladder.md` (this file).
- `.scratch/e1-design/10-power.py` (new): the power simulation behind decision 15 and the table above.
- `docs/adr/0010-no-fix-or-rung-weakens-a-code-check.md` (new).
- `docs/adr/0002-held-out-cases-sealed-and-spent-once.md`: addendum, the harness ladder.
- `GLOSSARY.md`: a new "Harness ladder" group (harness ladder, rung, rung 0, fix, candidate, claim rung, rung verdict, code check, cost per pass^3 case). The merchant's view gains active run. Datamarking is left out: it is a general technique, not a word of this project.
