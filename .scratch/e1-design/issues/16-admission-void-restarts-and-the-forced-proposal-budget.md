# 16: Admission, void restarts and the forced-proposal budget

**What to build:** A run starts only if the ceiling covers (in flight + 1) x $0.50; a void run restarts once; the proposal is forced before the money runs out; a ledger still busy after its timeout voids the run with nothing sent (Fix F6).

**Blocked by:** 15: The agent loop ends in every status

**Status:** ready-for-agent

- [ ] Admission refuses when the ceiling is short.
- [ ] `reservation_bound_broken` fires when settled exceeds the cap.
- [ ] A busy ledger gives `ledger_unavailable` and no request leaves.
- [ ] `npm test` and `npm run lint` pass.
