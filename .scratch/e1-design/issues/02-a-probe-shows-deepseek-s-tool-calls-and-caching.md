# 02: A probe shows DeepSeek's tool calls and caching

**What to build:** A probe script prints its requests offline with `--prepare`, and on the owner's word (with zero data retention on) sends about $0.05 of requests that show what section 9 decision 2 lists: the model id and prices, strict tool calls, `tool_choice: required`, several calls in one turn, `reasoning_content` across turns, cached tokens on a repeated prefix, and usage fields. The result is written into this ticket.

**Blocked by:** 01: The E1 provider settles with cached tokens

**Status:** done

- [x] `--prepare` writes a request snapshot that a test compares.
- [x] The paid send waits for the owner's word and zero data retention on.
- [x] Findings (pass or fallback to a JSON next action) are recorded here.
- [x] `npm test` and `npm run lint` pass.

## Findings (measured, 2026-11-26)

Two runs, both with Nebius org-level ZDR on (owner), both on `deepseek-ai/DeepSeek-V4.1-Flash-1017`, `temperature: 1`, `reasoning_effort: "low"`, output cap 2,048:
- `e1-probe-2026-11-26-01`: 6 sends, settled $0.007903.
- `e1-probe-2026-11-26-02`: 7 sends, settled $0.012700.

Run 01's turn 2 passed back `reasoning_content: null`, because Nebius returns the text as `message.reasoning`. So run 01 doesn't answer item 4. Run 02 is the probe as committed. Each run is one sample at temperature 1, so the item 4 lines are weak evidence.

1. **Pass.** The catalog lists `DeepSeek-V4.1-Flash-1017` with context 1,048,576 and prompt/cached/completion $0.30/$0.006/$1.20 per M, matching the card `deepseek-v4.1-flash-1017`. Every response's `model` is that id.
2. **Pass.** Strict tools were accepted, and every call in both runs fits our schemas (13 sends). `tool_choice` naming `list_deploys` returned exactly one `list_deploys` call both times. `required` returned calls every time.
3. **Pass.** With `required`, the model made 5 read calls in one turn both times, the prompt's limit. `parallel_tool_calls: false` was accepted and held: 1 call both times.
4. **Pass: don't pass reasoning back.**
   - Turn 2 works without the reasoning text: run 02 made 4 valid calls, with no exact repeat of a turn 1 read.
   - Nebius renders both `reasoning_content` and `reasoning`: the prompt grows from 2,822 to 3,786 tokens.
   - Passed back as `reasoning_content`, the model reasoned to the 2,048 cap and made no call (`finish_reason: length`). Passed back as `reasoning`, it made 5 valid calls.
   - Nothing shows the model needs the text, and passing it back costs about 960 tokens a turn, growing with the run. So the loop keeps the text in the run log only (section 4 decision 4).
5. **Pass with ZDR on, so no switch to the s.5.4 email opt-out.**
   - 9 of 13 sends read cached tokens, each 1,920 (the 30 shared 64-token blocks of system, tools and trigger).
   - A turn 2 extending that prefix read the 1,920 in run 02 and missed in run 01.
   - The latest write wasn't always readable by the very next send (run 01 send 2, run 02 send 5), so caching is best effort as documented.
   - Nebius also reports `created_cache_tokens`. No catalog price line exists for it, and the settled costs assume it is free; item 7 checks that.
6. **Pass.** All 13 sends reported `prompt_tokens`, `completion_tokens`, `total_tokens`, `prompt_tokens_details.cached_tokens` and `completion_tokens_details.reasoning_tokens`, and `total = prompt + completion` held.
7. **Pending owner.** The ledger settled **$0.020603** over 13 sends on 2026-11-26, 09:32-09:38 UTC (run 01 $0.007903, run 02 $0.012700), with no other Nebius sends that day. Compare it with the Nebius Usage tab for 26 Nov on 27 Nov.
8. **Pass.** Request bytes per prompt token ran from 2.85 to 3.01, so the reservation's byte bound over-reserves input by about 3×. A 300k-byte send is about 100k tokens.

Side findings for later tickets:
- **Ticket 08:** in run 01 the model wrote `fetch_all_payments` windows as unix seconds a year early (Nov 2025); run 02 got them right. The tool's note should echo the window back in IST.
  - The error appeared in send 2, before the model had seen any result.
  - The probe's own made-up payment `created_at` (1763356800) is also a 2025 value, but the model only saw it in turn 2, after that error. It is kept as sent, so the snapshot matches run 02.
- **Decision 1's length rule:** at `reasoning_effort: "low"`, turn 2 reasoned 1,125-2,048 tokens, and 1 of 13 sends hit the probe's 2,048 cap. E1's 8,192 cap stands; development batch 1 applies the 1-in-100 rule.
- Item 9 (the GLM judge probe) is deferred to ticket 23.

The saved requests and responses are in `outputs/e1-probe/` of the home checkout. The committed snapshot is `tests/fixtures/e1-probe-requests.json` (`node scripts/e1-probe.mjs --prepare`).
