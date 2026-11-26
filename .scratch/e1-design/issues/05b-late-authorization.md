# 05b: Late authorization

**Slice of:** 05: Payment causes: #670, late authorization, webhook, messages, decoys

**What to build:** A late-authorization cause: from its start, a share of payments fail at the bank first, the store marks the order Failed, and the payment turns authorized minutes to hours later with no plugin fault, so Razorpay holds money for a Failed order until the capture window ends.

**Blocked by:** 05a: A case injects #670 and passes the counterfactual check

**Status:** ready-for-agent

- [ ] Counterfactual check passes on a late-authorization case.
- [ ] Its records differ from #670's where the design says they do: a failed attempt before the authorization, and no #670 notes.
- [ ] `npm test`, `npm run lint` and `npm run typecheck` pass.
