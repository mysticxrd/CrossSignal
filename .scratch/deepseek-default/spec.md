# DeepSeek as CrossSignal's model, with a spend ceiling

Approved by the owner on 2026-11-16 with "build" after the design discussion.

## Decision

The owner, 2026-11-15: drop Gemini; DeepSeek V4.1 Flash
(`deepseek-ai/DeepSeek-V4.1-Flash-1017` on Nebius Token Factory) is the model.
Paid API spend is allowed. Remove every rule and check that forbids paid
models. Then return to building features.

Follow-up answers the same day:

- v0.1 investigator (B01, A01, Case lab Investigate): port it to DeepSeek only
  when a feature needs it. Until then it stays on its Gemini runner as legacy,
  with its free-tier refusals removed.
- Spend limit: a ceiling the owner can raise, one number in a committed file,
  starting at $25. It counts lifetime spend, with reservations counted as
  spent until settled.

Not built now: host and price configuration. The Nebius host and the exact
price check stay hardcoded until the owner moves off Nebius credits.

## Flow (order recovery, after the change)

1. `node scripts/run-order-model.mjs --live --run-id X` starts a run;
   `--provider` defaults to `nebius`, and `gemini` is refused.
2. The script reads the ceiling from `order-recovery/spend.json` and opens the
   ledger in the shared git folder.
3. The run id is claimed in its output folder and in the ledger; a repeated
   id stops here.
4. The Nebius catalog is checked for the model and price, then the request is
   sent. At most three attempts, retrying only 429/500/503/504, inside a
   180-second deadline.
5. Each attempt reserves its worst-case cost first; a reservation above the
   ceiling minus used spend is refused before any request leaves.
6. The reply is checked (one choice, finished, model id, token counts), the
   decisions validated, the result saved, then the ledger settled to the
   actual cost.

## Rejected alternative

Keeping Gemini as a free second option: every prompt change would need two
wire formats tested, for a model that captured the duplicate payment in 10 of
10 public runs.

## Slices

1. Order recovery sends to DeepSeek only.
2. A spend ceiling I can raise, and no free-tier refusals.

## Proof bars

- `npm test`, `npm run lint` and CI green; no "gemini" in `order-recovery/` or
  the order-model tests. Surviving Nebius tests listed by name in the PR.
- At the ceiling, zero requests are sent and the saved reason is
  `spend_ceiling_reached` (a missing key or catalog failure also sends zero).
- A ledger made with the old fixed-cap table keeps its used total.
- One live run on public #670 comes back `validated`, with the ledger up by
  under $0.05. A failure is told apart from an outage by its saved HTTP status.
