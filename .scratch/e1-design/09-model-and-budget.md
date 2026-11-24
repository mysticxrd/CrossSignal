# E1 section 9: the model and the budget

Settled with the owner 2026-11-25 over five rounds:
- **Round 1:** Q1-Q9, "yes to all".
- **Round 2:** Q1-Q9, "yes to all".
- **Round 3:** Q1-Q9. The owner changed four answers:
  - Q1: practise on Nebius and decide GOAT or a Nebius refill after practice;
  - Q2: no paid Gemini;
  - Q5: Nebius first;
  - Q7: submit to Razorpay only when the project is presentable.
- **Round 4:** Q1-Q7. Two side-chat decisions (2026-11-25) changed it:
  - the summary-faithfulness judge became GLM-5.3, then `zai-org/GLM-5.3-Flash`;
  - Q5 was inverted, so GLM-5.3 is now the challenger.
- **Round 5:** Q1, "yes": the judge reads every result.

Each round was checked against the owner's three Notion notes:
- "AI Engineering Roadmap": why a model, reasoning level, context, caching strategy and output mechanism; pin model, version and temperature; cost per successful task; the M1 free-tier budget; M2 25 Nov-8 Dec and M3 9-22 Dec.
- "Learn AI Agent Harness & Loop Engineering In 19 Min": health evals on token spend; model tiering.
- "You Can Learn AI Agent Observability & Eval In 20 Min": a pre-call budget check and post-call metering; spend shown equals metered; a ceiling as a pre-call gate plus a post-run assertion; cost skew.

Words follow `GLOSSARY.md`. The reveal decision is `docs/adr/0009-reveal-runs-on-one-model-version.md`.

Every cost figure here is **estimated** unless marked measured or quoted.

## Facts checked (2026-11-25)

- **Shared ledger** (measured; `crosssignal-order-model-budget.sqlite` in the home checkout's `.git`, read-only query):
  - 53 sends;
  - $0.1057 settled, all Nebius. The 27 Gemini sends ran on the free tier at $0;
  - $0.6390 reserved and never settled: two Nebius sends, `live-options-2026-11-15-nebius-01` and `-02`, at $0.3195 each, reserved at the 1M-token worst case;
  - $0.7447 counted as used, so $24.2553 left under `spend.json`'s $25.

  Section 2's "$24.26" included the two unsettled sends. The average settled Nebius send cost $0.0044.
- **Nebius price** ([models_info](https://tokenfactory.nebius.com/api/public/models_info), quoted). Inputs and outputs are per M tokens.

  | Model | Input | Cached input | Output | Notes |
  |---|---|---|---|---|
  | `deepseek-ai/DeepSeek-V4.1-Flash-1017` | $0.30 | $0.006 | $1.20 | 1,048,576 context, NVFP4, us-north1; function calling listed |
  | `zai-org/GLM-5.3-Flash` | $0.15 | $0.03 | $0.50 | 349 tokens/s |
  | `zai-org/GLM-5.3` | $1.40 | $0.26 | $4.40 | 455 tokens/s |

  The older `DeepSeek-V4.1-Flash` id was retired on 9 Nov 2026 with no reroute ([compute.info](https://compute.info/ai/nebius/deepseek-v4-1-flash/)).
- **Nebius caching** ([docs](https://docs.tokenfactory.nebius.com/cached-tokens), [cookbook](https://dev.nebius.com/cookbook/prompt-caching-token-factory), quoted):
  - implicit, matched on the prefix in 64-token blocks, best effort, with no SLA or TTL, so `cached_tokens: 0` is a valid answer;
  - the bill shows cached input as its own line.

  `order-recovery/provider.mjs` prices every input token at the uncached rate.
- **Nebius usage records** ([billing](https://docs.tokenfactory.nebius.com/other-capabilities/billing-new), quoted): the Usage tab in the console, and a monthly FOCUS 1.2 CSV export. No per-request usage API was found.
- **Nebius data terms** ([Token Factory terms](https://docs.nebius.com/legal/token-factory) s.5.1(b) and s.5.4; [legal quick guide](https://docs.tokenfactory.nebius.com/legal/legal-quick-guide), quoted):
  - inputs and outputs may train speculative-decoding draft models;
  - opting out is by email or the onboarding form;
  - an org-level Zero Data Retention toggle stops both retention and that training, "may impact … inference speed";
  - without it, retained data sits in Finland.
- **Command Code GOAT** ([GOAT](https://commandcode.ai/docs/plans/goat), [limits](https://commandcode.ai/docs/resources/pricing-limits), [provider API](https://commandcode.ai/docs/provider), [privacy](https://commandcode.ai/privacy), quoted):
  - $10 a month buys up to $100 of credit;
  - limits of $20 per 5 h, $50 per week and $100 per month;
  - DeepSeek V4.1 Flash "(latest)" costs $0.15/$0.60 off-peak and $0.30/$1.20 at peak (01-04 and 06-10 UTC, Mon-Fri), with cache reads at $0.003;
  - the API is OpenAI-compatible and tool arrays pass through;
  - `x-cmd-zdr: 1` enforces zero retention, or the request fails with 422; without it, data is kept for up to 30 days;
  - the model is an alias routed through gateways to inference providers it doesn't name.
- **Gemini 3.5 Flash-Lite** ([AI Studio](https://aistudio.google.com/docs/models/gemini-3.5-flash-lite), quoted): paid $0.30/$2.50; the free tier is "used to improve our products". It is no longer the judge.
- **CI** (measured): 150-252 s on windows-latest over the last 8 runs.

## Decisions

1. **The agent's model.**
   - `deepseek-ai/DeepSeek-V4.1-Flash-1017` on Nebius.
   - `temperature: 1` is written into every request and the harness version. No seed.
   - `reasoning_effort: "low"`, with reasoning tokens recorded per turn.
   - Output cap 8,192 a send. `finish_reason: "length"` is a model failure in the run log. If more than 1 send in 100 hits it in development batch 1, raise the cap to 16,384.
2. **Probe** (only on the owner's word; about $0.05 for the agent and $0.05 for the judges). It must show:
   1. the model id resolves and the catalog prices match;
   2. our schemas come back as `tool_calls`, strict mode is accepted, and `tool_choice` naming one tool is obeyed;
   3. whether the model makes several calls in one turn, and whether `parallel_tool_calls: false` holds;
   4. whether a turn degrades without the previous `reasoning_content`;
   5. `cached_tokens > 0` on a repeated prefix, with ZDR on and off;
   6. `usage` reports prompt, cached, completion and reasoning tokens;
   7. the settled cost matches Nebius's Usage tab a day later;
   8. the ratio of request bytes to `prompt_tokens`;
   9. GLM-5.3-Flash and GLM-5.3 accept our strict `json_schema` for the three binary answers and report `usage` with `cached_tokens`.

   Command Code gets its own ~$0.01 probe only if it is chosen at the decision point.
3. **Settled cost counts the cache.**
   - Settled = (uncached input × input price + cached input × cached price + output × output price) / M, from the price card.
   - Reservations keep assuming nothing is cached.
4. **Request layout for the cache.**
   - Order: system prompt, then tools, then trigger record, then messages, which are only appended.
   - Everything that changes per turn (`calls_left`, `as_of`, nudges) goes in the newest message.
   - A unit test asserts that each send's request starts with the previous send's request, byte for byte.
5. **Context cap per send: 300k by the byte bound.**
   - The longest legal run (30 calls of at most 1.5k-token results) reaches about 55k real tokens, about 190-220k bytes.
   - `context_overflow` therefore catches only bugs.
   - One send at the cap reserves about $0.10.
6. **Per-run cap: $0.50.**
   - A long uncached run settles at about $0.28.
   - A forced proposal reserves the next send's byte bound plus 8,192 output tokens, at most about $0.08.
   - The forced-proposal check therefore bites only after about $0.35 has settled.
   - A dip that keeps re-triggering costs at most 3 × $0.50 = $1.50.
7. **Admission, not a run-long hold.**
   - A run starts only if the ceiling leaves at least (runs in flight + 1) × $0.50.
   - Each send still reserves for itself.
   - The ledger's schema, shared with order-recovery, is unchanged.
8. **Model version (ADR 0009).**
   - The model version is the provider, the model id and the reported build. A change is `model_version_changed`.
   - On Command Code, every response's `model` field and any upstream header are recorded.
   - Without a stable upstream build, GOAT hosts practice only, never a reveal.
9. **Ceiling.**
   - One Nebius ceiling of $25 covers the agent and the judge.
   - Gemini is out.
   - GOAT is undecided until the decision point.
   - No raise is planned. A raise is decided at the decision point only if measured costs need it, and only the owner raises it.
10. **The judge** (amends section 6 decision 7; see Amendments).
    - `zai-org/GLM-5.3-Flash` on Nebius, under the same org-level ZDR as the agent, with its own price card.
    - Temperature written out at its default, reasoning at its default, output cap 4,096 a call, strict `json_schema`.
    - It reads every result the run saw (section 7 decision 15 as written). The shared log goes first and the question last, so calls 2-3 hit the cache.
    - Three binary coherence calls; it never sees the key.
    - **Controls:** at least 9/10 on 10 coherent and 10 planted summaries. At least 3 of the planted ones leave out a result the run read that contradicts the summary's cause. Its agreement (TPR/TNR) with the owner's 20 labels is reported.
    - **Fallback:** if Flash fails the controls or agrees badly with the labels, the judge becomes `zai-org/GLM-5.3`. That is a judge-version change under ADR 0006, allowed only before the checks freeze at sealing (section 6 decision 9).
    - **Challenger:** GLM-5.3 judges the same 40 summaries once, so both judges are seen side by side. It replaces Flash only on the owner's word.
11. **Which runs are judged** (340).
    - Every reveal run (252).
    - In development batch 1, the 20 the owner labels.
    - In batches 2-4, the first run of each case (16 each), chosen by that rule before the batch.
    - The 20 controls.
    - The gate batch is not judged in full: faithfulness sits beside pass, and the gate tests pass^3.
12. **The judge's spend is its own line.**
    - Judge sends claim ledger runs with a `judge:` id prefix, under their own price card.
    - Reports split agent and judge spend.
    - The judge runs after a batch's agent runs. A judge call that would cross the ceiling leaves that run **not judged**, and never blocks or voids an agent run.
13. **Data terms.**
    - Turn on Nebius's org-level Zero Data Retention before the next paid send. If the probe shows ZDR switches off prefix caching, use the s.5.4 email opt-out instead.
    - Only the simulated E1 world, our prompts and our schemas are ever sent. Never real merchant or customer data, keys or `docs/owner/`, and no held-out case to an endpoint without zero retention.
    - On Command Code, every request carries `x-cmd-zdr: 1`. A 422 `cmd_zdr_no_providers` makes the run void as `provider_unavailable`.
14. **The two unsettled sends.**
    - The owner reads Nebius's Usage tab for 15 Nov.
    - The first build slice writes one logged correction, settling both sends to what Nebius billed. If 15 Nov can't be read separately, use the console's all-time total minus $0.1057.
    - This frees about $0.64, leaving about $24.89.
15. **Reconciliation.**
    - **Automatic, every batch:** run-log settled costs equal the ledger's settlements (section 7).
    - **By the owner, weekly at `/retro` and once before the reveal:** compare the ledger with the provider's usage page for the same dates.
    - **Under-counting** by more than max($0.10, 5%) stops new paid batches until it's explained. The fix is a logged correction and a new price card.
    - **Over-counting** settles down to the bill, and work carries on.
16. **GOAT accounting**, if chosen.
    - Sends are counted at metered credit price, from a price card holding peak and off-peak rates. They reserve at peak and settle at the rate in force when the response arrived.
    - The $10 a month is a fixed line outside the ledger.
    - The plan's limits ($20 per 5 h, $50 per week, $100 per month) are local ceilings checked at each reservation.
    - Batches run off-peak: weekday peak is 06:30-09:30 and 11:30-15:30 IST, and weekends are off-peak all day.
17. **Practice and the decision point.**
    - Practice is the probe plus development batches 1-4 on Nebius, ending with the gate batch, or at the ceiling if that comes first. Nothing is held back for the reveal.
    - At the decision point I bring the owner: measured agent cost per run, measured judge cost per run, Nebius left, and what the reveal needs.
    - The owner chooses:
      - **refill Nebius:** raise the ceiling; the reveal runs on the practised model;
      - **GOAT for agent runs:** first its probe, the stable-build check and a rerun of the gate batch.
    - The judge stays on Nebius either way.
18. **The reveal (ADR 0009).**
    - Every rung runs on one model version.
    - Reveal admission first: Nebius left must cover the rungs' runs at planning cost, voids included.
    - A version change part-way voids the whole reveal, and all rungs rerun on one new version.
19. **Rungs and repeats.**
    - pass^3 stays.
    - 3 held-out rungs are planned.
    - After the gate batch, add rungs while the money left covers another at measured cost (about $2.82 a rung expected, $8.13 planning).
    - k is never lowered to fit rungs.
20. **Labels on cost.**
    - Every cost figure in the design, PRs and reports is *estimated* until a batch measures it, then *measured*, with the batch id.
    - On-screen spend comes from the run log and the price card.
21. **Time.**
    - `verify:e1` runs under 2 minutes with both replays, checked in CI.
    - Property tests use a fixed seed and add at most 60 s, so CI stays under 5 minutes.
    - `crosssignal-runlogs` at about 100 MB fits GitHub's limits; no file exceeds 1 MB.
    - **E1 v1 public target: 22 Dec.**
      - M2 (25 Nov-8 Dec): harness, tools, probe and development batches 1-2.
      - M3 (9-22 Dec): batches 3-4, sealing, the reveal and the replay.
    - Before 1 Dec, the public progress is the E1 design.
    - Test mode (1-2 days) comes after 22 Dec and stays *planned* in v1.
    - **The owner's time:** about 15 h over four weeks:
      - 2.5 h of error analysis per development batch; if a batch's reading passes 3 h, stop at 30 logs;
      - gate 3, about 2 h;
      - weekly reconciliation, about 10 min;
      - card test and walkthroughs, about 3 h.
    - The Razorpay AI Builders form (no deadline; razorpay.com/ai-builders, checked 18 Nov) goes in only when the project is presentable to Razorpay's team.

## The bill (estimated)

**Per run:**

| | Planning | Expected |
|---|---|---|
| Agent, typical: 13 sends, ~190k input tokens of which the schemas are ~47k, ~8k output | $0.07 | $0.02 |
| Agent, long: 31 sends | $0.28 | $0.04 |
| Judge, GLM-5.3-Flash, full log: 3 × ~45k input, ~2k output a call | $0.023 | $0.013 |
| GLM-5.3 challenger, full log, per summary | $0.215 | $0.114 |

**The whole v1 bill:**

| Line | Planning | Expected |
|---|---|---|
| Practice, agent: probe + batches 1-4 (192 runs) + 5% void restarts | $14.16 | $4.05 |
| Practice, judge: 20 controls + 68 sampled runs + judge probe | $2.10 | $1.14 |
| GLM-5.3 challenger, 40 summaries | $8.62 | $4.56 |
| **Practice total** | **$24.88** | **$9.75** |
| Reveal, agent: 3 rungs × 28 cases × 3 runs + 10 demo runs + 5% | $19.26 | $5.50 |
| Reveal, judge: 252 runs | $5.86 | $3.17 |
| **Against ~$24.89 left** | **−$25.11** | **+$6.47** |

- One more rung (agent and judge) costs $8.13 planning, $2.82 expected.
- At expected prices the whole of v1 fits under the current $25.
- If nothing caches, practice ends at the ceiling just short of the gate batch, and the decision point comes early.
- If the two unsettled sends turn out to have cost their full reservation, subtract $0.63 from everything left.

## Overrule in a word

Owner's alternatives:

`gemini-free-judge` · `glm-judge` · `goat-dev` · `form-now`

Mine:

`implicit-temperature` · `temp0` · `medium-reasoning` · `cap-32k` · `no-probe` · `uncached-settle` · `ctx-200k` · `run-cap-30c` · `run-hold` · `plan-cached` · `goat-reveal` · `reveal-reserve` · `raise-now` · `two-rungs` · `thin-judge` · `pass2` · `judge-gate` · `cited-only-judge` · `no-omission-controls` · `no-challenger` · `opt-out-only` · `monthly-reconcile`

## Amendments to earlier sections

- **Section 4, decision 5 (caps):** the context cap per send rises from about 200k to **300k by the byte bound**.
- **Section 4, decision 6 (spend):**
  - The reservation formula stands.
  - Settled cost now prices cached input at the price card's cached rate.
  - "Budget assumes no discount" now means the reservation and the planning cost, not the expected cost.
- **Section 4's sampling:** `temperature: 1` is written explicitly, no longer left to the default.
- **Section 6, decision 7 (summary faithfulness):**
  - The judge is `zai-org/GLM-5.3-Flash` on Nebius under org-level ZDR, not Gemini 3.5 Flash-Lite. It is still a different family from the agent.
  - The fallback is GLM-5.3, before sealing only. GLM-5.3 also judges once as the challenger.
  - The planted controls include at least 3 omissions of a read, contradicting result.
  - Everything else stands: the code checks (`unsupported_figure`, contradiction, `unread_record`, `beyond_proposal`), three binary calls with no key, the 9/10 bar, the owner's 20 labels, and faithfulness beside pass.
- **Section 7, decision 15 (judge input):** it **stands as written**; the judge reads every result text.
  - A ~15k cited-only projection was adopted in round 1 Q6 and carried into a side-chat decision by mistake.
  - It was withdrawn on 2026-11-25: a judge that sees only what the agent cited can't catch the agent leaving out evidence that contradicts it.
  - `cited-only-judge` stays rejected.
- **Section 2's "9 budget" line:**
  - "$24.26 left" becomes the measured figures above.
  - "Nebius until the credit runs out, then GOAT" becomes practice on Nebius and the decision point (ADR 0009).
  - The judge at "≈ $0.05" in total becomes $0.013 a run expected.
- **Section 8's "9 budget" line:**
  - Demo runs cost about $0.07 planning and $0.02 expected, not $0.08.
  - The re-triggering dip's worst case is $1.50, from the run cap; about $0.06 expected.

## Handed to later sections

- **Build** (the first slices):
  - an E1 provider module that settles with cached tokens and records the catalog's cached price;
  - price cards for `DeepSeek-V4.1-Flash-1017`, `GLM-5.3-Flash` and `GLM-5.3`;
  - a per-provider ceiling query;
  - the admission check and reveal admission;
  - the `judge:` prefix;
  - the prefix-stability test;
  - the one-time correction for the two unsettled sends.

  `provider.mjs`'s catalog check (`input_cache_read ≤ 0.0000003`) already admits $0.006/M.
- **2 evals:** the pre-registration names the model version, the judge model (and whether the fallback fired), and the rung count fixed at the decision point.
- **6 verification:** the control set's omission cases.
- **10 harness ladder:**
  - 3 held-out rungs at pass^3, more only while the money left covers another at measured cost;
  - every rung on one model version;
  - the judge's model and settings are never a rung: they belong to the grader version.
- **11 presentation:**
  - the README's first screen and the video show *measured* cost per run, agent and judge apart, and cost per passing run (section 7), each with its batch id and the date of the last reconciliation;
  - planning figures are never shown as spent;
  - the judge's model is named.

## Files changed (uncommitted)

- `.scratch/e1-design/09-model-and-budget.md` (this file).
- `docs/adr/0009-reveal-runs-on-one-model-version.md` (new).
- `GLOSSARY.md`: a new "Model and budget" group with model version, practice, decision point, planning cost and reveal admission. No existing entry named the judge's model, so none changed.
