# 05a: A case injects #670 and passes the counterfactual check

**Slice of:** 05: Payment causes: #670, late authorization, webhook, messages, decoys

**What to build:** `buildCase` turns a case spec (seed, at most one cause, at most one decoy) into a world whose hash covers the injection (ADR 0001). The first cause is #670: from its start the store runs plugin 4.8.8 with Payment Action "Authorize", so an order whose payment reaches the store only by webhook is marked Failed with the plugin's notes while Razorpay holds the payment authorized, and Razorpay refunds it when the capture window ends. The counterfactual check builds the case three ways: no cause, no dip at the frozen "now"; no decoy, the same "now" and the same dip.

**Blocked by:** 04: The trigger freezes "now" and writes the trigger record

**Status:** done

- [x] Counterfactual check passes on a #670 case, and catches a decoy that moves the dip.
- [x] The #670 symptoms from the public report appear in the records the backend serves.
- [x] The world hash changes with the injection; the baseline orders do not.
- [x] `npm test`, `npm run lint` and `npm run typecheck` pass.
