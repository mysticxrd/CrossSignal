# 05c: The webhook disabled or delayed

**Slice of:** 05: Payment causes: #670, late authorization, webhook, messages, decoys

**What to build:** Two causes on the webhook. Disabled: deliveries fail from the cause's start, Razorpay retries for 24 h and then turns the webhook off, and orders the browser callback never reached stay pending. Delayed: deliveries land hours late, so the same orders turn paid late and the dip heals if the agent waits.

**Blocked by:** 05a: A case injects #670 and passes the counterfactual check

**Status:** ready-for-agent

- [ ] Counterfactual check passes on a disabled and on a delayed case.
- [ ] The delivery log shows the failed retries, then the disabled flag, as Razorpay documents.
- [ ] `npm test`, `npm run lint` and `npm run typecheck` pass.
