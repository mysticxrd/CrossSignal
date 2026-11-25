# E1 section 4: orchestration and context

Settled with the owner 2026-11-23 (round 1 Q1-Q11, round 2 Q1-Q10, "yes to all"). Round 2 folded in the owner's gap check against the Notion note "Learn AI Agent Harness & Loop Engineering In 19 Min". Each recommendation was checked against the Notion "AI Engineering Roadmap", section 3 and its Harness Engineering notes. Words follow `GLOSSARY.md`; the loop decision is `docs/adr/0004-one-model-driven-loop.md`, and void runs are an addendum to ADR 0002.

Facts checked:
- **Tools on Nebius:** Token Factory Chat Completions takes `tools` with `strict` (an undocumented subset), `tool_choice` auto/required/none/named, and no documented `parallel_tool_calls`. Its docs don't confirm tool support for DeepSeek V4.1 Flash; aggregators say yes.
- **Context and price:** 1,048,576 tokens, $0.30/M in and $1.20/M out.
- **Caching:** automatic, reported as `usage.prompt_tokens_details.cached_tokens`, with no discount promised. One aggregator lists cached input at $0.30, so budgets assume no discount.
- **Sampling:** no `seed`; `temperature` defaults to 1.

## Decisions

1. **Loop (ADR 0004).** One model-driven loop opened by the alert alone. Code owns the clock, caps, validation, pricing, execution and grading, and never orders the steps or makes the opening reads. One agent, no subagents. No memory between runs, with `store: false`. Merchant history comes from records.
2. **Tools.** Native tool calls with `tool_choice: required`, gated by a build probe of about $0.02 on a development fixture. The probe checks strict calls, `required`, several calls in one turn, and `reasoning_content` across turns; if it fails, we fall back to a JSON next action. E1 gets its own transport, and `order-recovery`'s `tool_calls` refusal stays. Up to 5 parallel reads per turn, run in listed order. `wait` and `propose` must be alone in their turn, or the envelope refuses them. A valid `propose` ends the run, and nothing is sent back to the model.
3. **Steps** are labelled afterwards. A fixed map in analysis code (outside the harness version) pre-labels calls, and the owner labels "candidate causes" from the reasoning text and corrects the rest. Words: *call*, *turn*, *investigation step*; "step" alone is retired.
4. **Context.**
   - Full history, with no compaction and no scratchpad.
   - Reasoning text is kept in the run log and passed back only as the probe shows the model needs.
   - Envelopes gain `as_of` (world clock at read) and `calls_left`. Code never marks earlier results stale.
   - No stopping rule: the prompt says what a proposal holds, never when one is ready.
5. **Caps.**
   - 30 calls, or the run's dollar cap: one forced proposal (tools cut to `propose`), graded and counted apart.
   - Context per send, about 200k tokens by byte bound: `context_overflow`, fail.
   - Run wall time 15 min: `run_timeout`, fail. Each send keeps 180 s.
6. **Spend.** Each send reserves (request bytes + 16 × messages + 1,024) × $0.30/M + output cap × $1.20/M. Byte-level BPE can't make more tokens than bytes. If `prompt_tokens` exceeds the bound, every send stops. A 12-call run's largest send reserves about $0.03, not $0.32. Full history costs about $0.08 a run at 12 calls and about $0.32 at 30.
7. **Failures.**
   - A malformed proposal (shape only) gets one retry. Content errors (mixed kind, a target outside the affected orders, an unseen citation) are graded, never retried.
   - A turn without a tool call gets one nudge per run.
   - Transport retries stay as `provider.mjs` has them: 429/500/503/504, 3 attempts, inside the deadline.
   - Statuses:
     - graded: `proposed`;
     - fail: `malformed_proposal`, `no_action`, `run_timeout`, `context_overflow`, `harness_error`;
     - void: `provider_unavailable`, `spend_ceiling_reached`, `model_version_changed`, `reservation_bound_broken`.

     A void run restarts once; a second void is "not scored" (ADR 0002 addendum, pre-registered).
8. **Prompt.**
   - It holds: the role; merchant facts (prepaid, IST, frozen "now"); the sale-week calendar; one neutral line per cause (what it is, never how it shows); one line per effect (what code does, with no cause-to-effect map); a warning that messages are untrusted; the 30-call limit and `price_orders`.
   - It never holds symptoms, "lookalike" or "decoy", frequencies, or anything about evals, held-out cases or simulation. The leak scanner covers it.
   - The prompt version and harness version are hashed beside the toolset version in every run log and in the pre-registration.
9. **Determinism.** Default sampling, unseeded, `reasoning_effort: low`, and effective parameters logged. pass^3 means the identical world, with only sampling differing. The run log is write-ahead (intent before each send and call). A crashed run restarts and never resumes.

## Overrule in a word

`workflow` · `hybrid` · `json-action` · `single-call` · `confirm-turn` · `retry-content` · `all-fail` · `full-context` · `runbook` · `symptoms` · `one-hash` · `subagents` · `temp0` · `resume` · `memory` · `drop-reasoning` · `declared` · `compact` · `scratchpad` · `mark-stale` · `blind-cap` · `stop-rule` · `cap-fails` · `mid-ask` · `timeout-void`.

## Handed to later sections

- **Build:** run the probe first and put its result in the ticket; record `input_cache_read` from the live catalog.
- **2 evals / 6 verification / 11 presentation:** the summary is ungraded. Figures the merchant sees should come from code, never model text; prose is checked for figures that contradict code's pricing, and for records the run never read (section 3 tags these); a model judge decides only whether the explanation holds together. This is reported beside pass as summary faithfulness.
- **5 autonomy / 8 trigger:** approval expiry tied to the earliest capture deadline, with a notice to the merchant before it. In eval runs the world clock stands still between proposal and approval, because rupees are priced at proposal time. Section 8 says which clock runs in the demo. Any per-order asks live inside the proposal; mid-run asks reopen ADR 0004. Assumed alert: the dip window, store revenue against its 3-week average, and "now".
- **7 run logs:** levels run → turn → call. Per turn: reasoning text and tokens, `cached_tokens`, reservation and settled cost. Per call: `as_of`, `calls_left`, step pre-label. Void attempts are kept. Assumed: reasoning is shown in the replay, labelled as the model's private reasoning.
- **9 budget:** a per-run dollar cap, assumed $0.50; the context cap per send; whether to reserve per run up front so no run stops at the ceiling mid-way.
- **10 harness ladder:** candidates are compaction, a working-state note, a stopping rule (judged by pass^3, unnecessary calls, evidence coverage and calls per run), a "same as call N" note, and one read-only subagent. Each is one harness-version change.
- **Not gaps:** retrieval over past runs and a summarizer agent (no memory between runs). Loop guards: repeats are measured as retry loops, and the cap bounds a looping run at about $0.32.

## Files changed (uncommitted)

- `GLOSSARY.md`: prompt version, harness version, turn, investigation step, forced proposal, void run; pass^3 now says only sampling differs.
- `docs/adr/0004-one-model-driven-loop.md` (new); `docs/adr/0002-…`: void-run addendum.
- `.scratch/e1-design/04-orchestration.md` (this file).
