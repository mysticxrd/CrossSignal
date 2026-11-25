# E1 section 11: presentation

Settled with the owner 2026-11-25 over two rounds:
- **Round 1:** Q1-Q7, "yes to all".
- **Round 2:** Q8-Q13, "yes to all". The owner added a hire page ("why Razorpay should hire me"), not urgent; I settled where it sits (decision 14).
- **Follow-up:** the owner said issues #670 and #664 were taken from another GitHub account's reports, chosen as good-quality bugs to test CrossSignal; the hire page is built later; the credit-link rechecks below are negligible and change nothing.

Each round was checked against the owner's Notion notes:
- "AI Engineering Roadmap": every number carries its task count, trials and a 95% CI; every milestone ends with an eval result, a regression case and a public write-up; the M2 write-up "how CrossSignal stays honest with numbers"; the M3 write-up "what broke when you attacked your own agent" with its red-team table; "publish every kept or reverted experiment"; cut M3/M4 scope first if a milestone slips.
- "Agent Interaction Design": surface judgment, not activity; completion means verified external state, not agent confidence; avoid fake progress, false certainty and unclear completion; "say no relentlessly".
- "You Can Learn AI Agent Observability & Eval In 20 Min": shown spend equals metered spend; errors disclosed.
- "Learn AI Agent Harness & Loop Engineering In 19 Min" and "Personal agent harness Design report": quality and health evals; streaming structured progress builds trust.

Words follow `GLOSSARY.md`, which gains a "Presentation" group. The result templates and the publish-every-held-out-run rule are an addendum to ADR 0002. No new ADR: nothing else here is hard to reverse.

## Facts checked (2026-11-25)

- **razorpay.com/ai-builders**, quoted: "Fill the form · Submit your project or GitHub · If it has signal, we'll call in 48 hrs"; it wants builders who "speak in prompts and GitHub links, and can show projects they have shipped or seriously prototyped".
- **razorpay.com/buildathon**, quoted: "Students only"; "show your work (a public repo, a 5 minute pitch video, the architecture)". Track 03's bar: "Show measured money recovered across a batch, with compliant escalation, stopping rules, and an audit trail". E1 goes in through the AI Builders form; the Buildathon's three items become our "presentable" bar.
- **Razorpay Agent Studio: Principles, Guardrails, and Merchant Control** (razorpay.com/blog, Sarang S babu, 30 Mar 2026). Every quote in sections 5 and 8 checks out word for word: "typically on WhatsApp"; review-first mode; "double confirmation and are never eligible for auto-approval"; "One tap. Immediate."; "Errors are caught both before and after execution"; "A no is a no" sits under "Customer communication follows consent rules", so it is about customer opt-out.
- **The evals FAQ** is "AI Evals: Everything You Need to Know" by Hamel Husain **and Shreya Shankar** (hamel.dev/blog/posts/evals-faq/, updated Sep 2026). It holds "How do I evaluate agentic workflows?".
- **The Raindrop talk** is "How To Test AI Agents With Simulations", given by Raindrop's CTO and co-founder on Hamel Husain's YouTube channel (youtube.com/watch?v=eLkESCLvvAs). Confirmed in the transcript: the "Swiss cheese" picture and simulation awareness as a measured metric. A second upload of the same talk exists; the build picks one link on publish day.
- **Osmani's article** is on the claude.dev blog, "How the Claude Code team thinks about verification", Addy Osmani, 16 Nov 2026. Confirmed: property tests, differential tests, the verify skill as a smoke test, observe mode before enforce, "--resume loads old transcripts", "changes can't modify their own checks".
- **GA4 data:** Google describes `bigquery-public-data.ga4_obfuscated_sample_ecommerce` (Google Merchandise Store, 1 Nov 2020-31 Jan 2021) as obfuscated data that "emulates a real-world dataset" with placeholder values and "somewhat limited internal consistency".
- **The two issues:** razorpay/razorpay-woocommerce #670 (opened 27 Sep 2026) and #664 (opened 25 Aug 2026) are both open, filed by another GitHub account; CrossSignal took them as well-made reports to anchor its world (owner, 2026-11-25).
- **The repository:** the root has 41 entries, so a screener opening GitHub scrolls past them before the README; the README's top still describes v0.1.
- **Not rechecked today, rechecked by the build on publish day:** tau-bench, Anthropic's two posts, Spotlighting, Fagerland 2013 and Miller 2024 (all checked in section 10 today); OTel GenAI (section 7, 24 Nov); Sean's AI Stories video and Temporal (via the owner's notes).

## Decisions

1. **Audience and the one claim** (Q1). The audience is one Razorpay AI Builders screener reading cold for about 30 seconds; post readers come second. The claim, worded now and filled by code after the reveal: "On 28 held-out revenue-dip cases it never saw, written by a different author, CrossSignal's agent named the right cause and proposed the right fix on all three runs in X/28; a code-only checklist managed Y/28 (95% CI …, p = …)." E1 is set apart only by facts a visitor can check from a public link: the real bug anchor, lookalike causes (the clean/decoy split), held-out cases by another author, live approval and metered, capped spend. No "first", "only" or "unlike", and no other project named.
2. **"Sealed" is a verb in public** (Q2). "28 held-out cases, sealed by hash on 16 Dec before anyone saw the agent run them." Section 10's README line reads "each rung = one change, measured on the held-out cases"; a cut rung reads "development only, not held-out". The glossary keeps *Avoid: sealed case* and notes the verb.
3. **Before the reveal** (Q3). The first screen says "Result: not yet", the win test in one line ("written before we looked") and links the pre-registration, plus the sealing commit after 16 Dec. Development figures sit below the fold only, each labelled "development: 16 cases the agent was tuned on". Before batch 1 the first screen points to the E1 design.
4. **Public replays** (Q4; confirms section 7's assumption).
   - After the reveal, every held-out run of every admitted rung is published, masked but otherwise raw, failures included.
   - Development runs: only those the video and posts use, each labelled "development".
   - The results page lists every run (case, rung, run number, pass, cost) and links its replay; each replay carries its run id, date and model.
   - Masking is section 7's; the video is recorded only from the masked export.
   - A visitor checks a replay two ways: the page's "✓ matches manifest, stamped <date>", and the README's two shell commands (`sha256sum`, `ots verify`).
5. **Labels** (Q5).
   - **(a) One "What's real" table** in the README, three columns:
     - *Built:* the agent loop and 22 tools, the approval card, the executor, the verifier, hash-chained run logs, metered spend, the judge (`zai-org/GLM-5.3-Flash`, named).
     - *Simulated:* the merchant's payments, with a real daily rhythm from GA4; prepaid only, no COD; the 3-day capture window, naming the 5-day conflict in Razorpay's own pages; tools that are MCP-named, REST-shaped or dashboard-shaped, all answered by the simulator; "the executor has never touched a real backend" and what the simulator never does; a wait moves the case clock at once; the phone inbox ("planned: WhatsApp"); the windows are public by construction, and "cases share windows" if the world gate says so; rates describe the case mix, never production frequency; the three verification tiers, "verified without an answer key".
     - *Planned:* Razorpay test mode on a real WooCommerce install (after 22 Dec), WhatsApp notices, real-time waits, compaction, the subagent, memory, saved skills, a memory-lookup gate, and autonomy: the bar is stated, "v1 earns none".
   - **(b) Generated figures.** The result block's numbers and every cost figure are written by a script between markers in the README and on the results page, from the reveal report and the spend ledger. Each cost carries its batch id and the last reconciliation date; planning figures never appear as spent. `--check` runs in `npm run lint`, so a hand-edited number fails CI. This carries section 4's "figures from code, never model text" to the README.
   - **(c) The export lint** stays as sections 7 and 8 designed it. Prose is not linted.
6. **Credits** (Q6). One table, `docs/credits.md`, linked from the README in one line: Source · What CrossSignal took · Direct or adapted · Link · Checked on. Rows: Hamel Husain's evals FAQ, viewer and hotkeys; tau-bench; the Raindrop talk; Osmani (direct and adapted apart); Razorpay Agent Studio's principles post and terms s.3.15; Anthropic's two posts; Spotlighting; Fagerland 2013; Miller 2024; OTel GenAI; Sean's AI Stories video; Temporal; issues #670 and #664, linked to the account that filed them; Google's GA4 sample dataset. Razorpay quotes are word for word with the date fetched, and the "no is a no" row says it covers customer opt-out. The build rechecks every link on publish day.
7. **Posts, the form and "presentable"** (Q7).

   | Date | Post |
   |---|---|
   | By 1 Dec | "I wrote down what counts as my agent winning before building it": the win test, the floors, held-out cases by another author |
   | 8 Dec | The M2 write-up, "how CrossSignal stays honest with numbers": batches 1-2, labelled development |
   | 22 Dec | The reveal, whatever it says, with the red-team table (the M3 write-up) |

   **Presentable** means all four: the first screen shows the held-out result from the generated block; one held-out replay opens, verifies and reads at 390 px; a video of 5 minutes or less; one architecture picture. The AI Builders form goes in on 22 Dec.
8. **Where the screener lands** (Q8). The form links the results page (`/e1`, the replay index) first and GitHub second. GitHub's About line becomes the one-line claim with the result in it. The README opens with the same result block. The root is not reorganised.
9. **The first screen, line by line** (Q9). Shared by the results page and the README after the reveal:
   1. `CrossSignal`
   2. "An AI agent that finds why a merchant's revenue dipped and proposes a fix a person approves."
   3. The labels strip: "Simulated merchant world, anchored to Razorpay WooCommerce plugin issues #670 and #664 · Razorpay and WooCommerce don't send revenue-dip alerts; this trigger is CrossSignal's."
   4. The result (generated), in the template the numbers choose (decision 10).
   5. The split (generated): clean cases and cases with a lookalike decoy, agent against checklist.
   6. Floors and safety (generated): the best fixed answer of 28; unsafe proposals, agent and checklist.
   7. Cost (generated): measured cost per run, agent and judge apart; cost per passing run; batch id; reconciliation date.
   8. Links: the video (3 min) · the #670 replay · all runs · how the test was sealed.

   At 390 px lines 1-4 fit the first phone screen and 5-8 one scroll; at 1280 px all eight fit. The ladder, the pass × fixed confusion table, held-out flips, summary faithfulness and the card test open the second screen.
10. **Results that miss the bar** (Q10). The pre-registration holds three result templates (ADR 0002 addendum):
    - **Win:** "X vs Y of 28 (p = …)".
    - **Not a win:** "X vs Y of 28 (p = …). 28 cases can't separate this from chance."
    - **Worse:** "The checklist beat the agent: Y vs X of 28."

    Line 4 always adds "This bar was set and sealed by hash on 16 Dec, before any held-out run." No other metric takes the headline's place; secondary results sit on the second screen, labelled secondary. Ladder all INCONCLUSIVE: the table stands, with the noise-band line under it. Rung 0 alone: no table, one line, "No rung beyond rung 0 was built by 11 Dec; planned: …". The card test always reads "an upper bound: the owner judged cards they designed".
11. **The ladder table** (Q11) opens the second screen: Rung (rung 0 first) · Change · Built/planned · pass^3 (95% CI) · Difference vs rung below (95% CI) · Calls per run · Cost per passing run · Cost per pass^3 case · Verdict (BETTER / WORSE / INCONCLUSIVE, Holm-corrected). Under it: "Simulated world. Two identical harnesses differ by up to ±5 cases (simulated); a smaller difference isn't evidence." and "Each rung = one change, measured on the held-out cases." A cut rung is a row reading "development only, not held-out". Neither cost figure ever appears without pass^3 on its row. The development red-team table follows, labelled development-only.
12. **The video** (Q12): about 3 minutes, recorded by the build from the masked export (Playwright) during 12-16 Dec from development runs; after the reveal only the result card and the ladder shot are added. Every frame carries the strip, a lower third ("development case" or "held-out case") and the run's id, date and model. The owner records the voiceover from a script I draft.

    | Time | Shot |
    |---|---|
    | 0:00 | The result card (line 4) |
    | 0:15 | Issue #670 on GitHub, then the simulated store |
    | 0:40 | 1 Dec, quiet no-cause: the dip crosses the threshold, the agent finds the sale-week aftermath and sends only a quiet notice |
    | 1:20 | #670 with its late-authorization decoy: urgent notice → card → approve → execution → landed → advance → resolved |
    | 2:30 | The ladder table |
    | 2:50 | What's planned, and the link |

    It shows what the README can't: the moment a person approves, the order of events in time, and the agent holding back on the quiet case.
13. **Time** (Q13). The owner's hours were already about 15.7 (error analysis 10, gate 3 2, reconciliation ~0.7, card test and walkthroughs 3). Section 11 adds about 2.5 (voiceover 1, three post edits 1, README read-through and the form 0.5), paid for by capping error analysis on batches 3-4 at 1.5 h each (stop at 20 logs): about 16.2 h. Everything else in this section is agent-built. 18-22 Dec is left for running the generated block on the real report, the export, the final shots, the post and the form.
14. **The hire page** (owner, round 2; settled by me). A page on why Razorpay should hire the owner, pitch-deck shaped, from the skills built on CrossSignal.
    - **Not in E1 v1** (owner: "we can build the hire page later"). It is its own task, designed with `/design` after the reveal, because its strongest line cites the result.
    - **Constraints written now:** every skill claim links its evidence in the repo (a PR, an ADR, a replay, a test or a post), and a claim with no link is cut; built, simulated and planned labels apply; its numbers come from the result block, never typed; no other candidate or project is named; the owner's own name and contact appear only as the owner chooses, which needs an allowlist in the export lint's email and phone rule.
    - **Its sources:** the owner's Notion "Hiring Plan v2" and the AI Builders page's own words ("payments, revenue, operations", "shipped or seriously prototyped").

### The pushes, answered

| Push | Answer |
|---|---|
| A screener gets the claim in 30 s without scrolling | The form links the results page; lines 1-4 fit one phone screen; GitHub's About line carries the claim (8, 9) |
| Overclaiming | Every figure on the first screen is generated, carries its count, runs and CI, and fails CI if hand-edited (5b, 9) |
| "Simulated" beside the real bug anchor | The strip says both in one line, and the credits link each issue to its author (6, 9) |
| A negative or inconclusive result as a strength | The wording is fixed before the reveal, and line 4 always says the bar was sealed first (10) |
| How E1 differs from Track 03 repos | Four checkable facts, no one named (1) |
| What the video shows that the README can't | Approval, time order, restraint (12) |
| Privacy | Masked export only, for replays and the video; the hire page's contact is the owner's call (4, 12, 14) |
| Work nobody scheduled | Six new tickets, all agent-built (13 and "What build produces") |

## Hand-forwards from sections 1-10

| Item | From | Settled by |
|---|---|---|
| A Razorpay test-mode run on a real WooCommerce install | §1, §9 | 5a: *planned*, after 22 Dec |
| Real-versus-simulated lines; prepaid only; the 3-day vs 5-day conflict | §1 | 5a |
| Credit Hamel, tau-bench, the Raindrop talk | §2 | 6 |
| The clean/decoy split beside the headline | §2 | 9, line 5 |
| No rate shown as production frequency | §2 | 5a |
| MCP-named, REST-shaped or dashboard-shaped tools | §3 | 5a |
| Figures from code, never model text | §4 | 5b |
| Summary faithfulness beside pass; reasoning labelled | §4, §7 | 9 (second screen); 4 (replays as section 7 set them) |
| Razorpay's principles credited; "no is a no" is customer opt-out | §5 | 6, quotes rechecked today |
| The autonomy bar and "v1 earns none" | §5 | 5a |
| The card test's upper-bound caveat | §5 | 10 |
| Osmani, direct versus adapted | §6 | 6 |
| The pass × fixed confusion table; held-out flips | §6 | 9 (second screen) |
| "The executor has never touched a real backend"; three tiers "verified without an answer key" | §6 | 5a |
| Publish every held-out run, failures raw, plus chosen development runs | §7 | 4, confirmed |
| The credits list | §7 | 6 |
| The video script | §8 | 12 |
| The README's first screen | §8 | 9 |
| WhatsApp escalation and pause scope | §8 | 6 |
| Public windows, shared windows, the strip lint, "planned: WhatsApp" | §8 | 5a, 5c |
| Measured cost, agent and judge apart, batch id and reconciliation date; planning never as spent | §9 | 5b, 9 line 7 |
| The judge's model named | §9 | 5a |
| The headline is the win test on the claim rung | §10 | 1, 9, 10 |
| The ladder as one table, the noise band, the red-team table, one video shot | §10 | 11, 12 |
| "Each rung = one change"; the planned-after-v1 list | §10 | 2, 11, 5a |
| The public word "sealed" | §10 | 2 |
| "Every figure says simulated world" | §10 | 9 line 3, 11 |

## Overrule in a word

Owner's (offered in the rounds): `early` (the form goes in on 8 Dec with the design and development replays) · `captions` (text only, no voiceover).

Mine (settled without a question): `hire-in-readme` (a README section instead of a page).

## Amendments to earlier sections

- **2 evals:** the pre-registration gains the three result templates (decision 10; ADR 0002 addendum).
- **7 run logs:** the published-run assumption is confirmed (decision 4); the replay index is the results page; the video is recorded from the masked export.
- **8 trigger and view:** the README's first screen is decision 9's eight lines; the strip's README text is line 3.
- **9 budget:** the owner's hours become about 16.2, with error analysis on batches 3-4 capped at 1.5 h and 20 logs each.
- **10 harness ladder:** "measured on sealed cases" becomes "measured on the held-out cases"; "development only, not sealed" becomes "development only, not held-out".

## Still open across sections 1-11

| # | Item | From | Owner | When |
|---|---|---|---|---|
| 1 | The probe, a paid send of about $0.10 | §4, §9 | Owner's word, then the build | Start of M2 |
| 2 | Nebius org-level Zero Data Retention on before the next paid send | §9 | Owner | Before the probe |
| 3 | Ledger against Nebius's usage page, weekly and once before the reveal | §9 | Owner | Weekly `/retro` |
| 4 | The card test after batch 1; the card changes if it scores below 10/12 | §5 | Owner, then the build | After batch 1 |
| 5 | Which candidates become rungs, after batch 2's error analysis; cut-off 11 Dec | §10 | Build, owner reads | 9-11 Dec |
| 6 | The decision point: refill Nebius or move agent runs to GOAT; the rung count and its funding; any ceiling raise | §9, §10 | Owner | After practice |
| 7 | The 28 held-out cases, their messages and injection settings, and the held-out no-cause windows | §2, §6, §8 | Codex | The sealing commit, 16 Dec |
| 8 | Authorization time from the `payment.authorized` event, checked in Razorpay's docs | §3 | Build | World generator ticket |
| 9 | Native tool calls or the JSON action loop | §4 | Build (the probe decides) | Start of M2 |
| 10 | The one-time correction for the two unsettled sends | §9 | Build | First slice |
| 11 | `verify:e1` and the grader-path rule in AGENTS.md's Done | §6 | Owner | A weekly `/retro` |
| 12 | Every credit link rechecked | §11 | Build | Publish day |
| 13 | The hire page | §11 | Owner's `/design` | After the reveal |
| 14 | Test mode on a real WooCommerce install | §1, §6, §9 | Owner | After 22 Dec |

## What "build" produces

On "build", and not before, I write `.scratch/e1-design/spec.md`, which gathers sections 1-11 into one spec, and one ticket per slice in `.scratch/e1-design/issues/<NN>-<title>.md`, each `Status: ready-for-agent`, under 300 changed lines plus its nearest test. In order, about 20 tickets, the exact split fixed when they are written:

| Slices | From |
|---|---|
| The E1 provider module, price cards, the unsettled-sends correction | §9 |
| The probe (paid, on the owner's word) | §4, §9 |
| The world generator: GA4 baseline, then causes and decoys (two or three slices) | §1, §8 |
| The simulator and its read tools | §3 |
| The checklist baseline, floors, grader and grader self-test | §2, §6 |
| The agent loop, `propose` and the caps | §4 |
| Approval record, guard and executor | §5 |
| The verifier and its stamp | §6 |
| Run logs, the chain and the replay page | §7 |
| Trigger, session log, phone inbox and card | §8 |
| The batch runner and the statistics (pass^3, McNemar, Wilson, sign-flip, bootstrap) | §2, §10 |
| Export, masking lint, manifest and timestamp | §7 |
| The generated result block and its `--check` | §11 |
| The results page at `/e1` | §11 |
| `docs/credits.md` and its link check | §11 |
| The README's pre-reveal update and GitHub's About line (a docs chore, by 1 Dec) | §11 |
| The video recording | §11 |
| The architecture picture | §11 |

## Files changed (uncommitted)

- `.scratch/e1-design/11-presentation.md` (this file).
- `GLOSSARY.md`: the Held-out case entry notes "sealed by hash" as the public verb; a new "Presentation" group (labels strip, result block, result template, results page).
- `docs/adr/0002-held-out-cases-sealed-and-spent-once.md`: addendum, result templates and publishing every held-out run.
