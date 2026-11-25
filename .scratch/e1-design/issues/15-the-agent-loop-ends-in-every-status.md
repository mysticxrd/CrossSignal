# 15: The agent loop ends in every status

**What to build:** The model-driven loop with caps, nudges, forced proposals and statuses, run against a stub provider. The 15-minute cap counts model and tool time only; provider backoff is logged and a 30-minute total cap voids (Fix F6).

**Blocked by:** 01: The E1 provider settles with cached tokens; 10: Checks, `price_orders`, `wait` and the toolset hash; 14: The run log: chain, lock, cardinality

**Status:** ready-for-agent

- [ ] Stub runs end in every pass, fail and void status.
- [ ] A run slowed only by 429 backoff is void, not `run_timeout`.
- [ ] `wait` and `propose` alone in their turn, or refused.
- [ ] `npm test` and `npm run lint` pass.
