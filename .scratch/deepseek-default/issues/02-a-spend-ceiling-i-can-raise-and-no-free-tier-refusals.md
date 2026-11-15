# 02: A spend ceiling I can raise, and no free-tier refusals

**What to build:** The order-recovery ledger stops sends at the dollar
ceiling in `order-recovery/spend.json` (starting at $25), and raising that
number lets sends through again. The v0.1 runner's free-tier refusals in
`scripts/run-b01.mjs`, `scripts/run-a01-gemini.mjs` and
`db/cases/model-jobs.mjs` are removed, and AGENTS.md, README.md and
CONTEXT.md no longer say paid models are forbidden.

**Blocked by:** 01: Order recovery sends to DeepSeek only.

**Status:** ready-for-agent

- [ ] A send above the ceiling is refused with `spend_ceiling_reached` and no request leaves.
- [ ] Raising the number in `spend.json` lets the next send through.
- [ ] A ledger created with the old fixed-cap table keeps its used total.
- [ ] No code path refuses to send because of the Gemini account attestation.
- [ ] The Case lab no longer labels a run "free tier".
- [ ] One live public #670 run is `validated`, with the ledger up by under $0.05.
- [ ] `npm test` and `npm run lint` pass.
