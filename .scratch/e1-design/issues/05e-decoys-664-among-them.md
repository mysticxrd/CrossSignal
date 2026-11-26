# 05e: Decoys, #664 among them

**Slice of:** 05: Payment causes: #670, late authorization, webhook, messages, decoys

**What to build:** Decoys from a fixed list per cause: each shows another cause's surface in a source the checklist reads, starts within 48 h of the cause, and does not move store revenue. #664 (a refund that arrives before the authorization is dropped, so the order stays Processing) is one of them.

**Blocked by:** 05a: A case injects #670 and passes the counterfactual check

**Status:** ready-for-agent

- [ ] Counterfactual check passes on a case with each decoy: no decoy, the same dip.
- [ ] The #664 symptom from the public report appears in the records.
- [ ] `npm test`, `npm run lint` and `npm run typecheck` pass.
