# 05: Payment causes: #670, late authorization, webhook, messages, decoys

**What to build:** The world can inject #670, late authorization, a disabled or delayed webhook, customer messages from the message bank, and decoys, each from the case seed.

**Blocked by:** 04: The trigger freezes "now" and writes the trigger record

**Status:** ready-for-agent

**Slices** (over 300 lines, so one ticket and one PR each, each built on `origin/main`): 05a: A case injects #670 and passes the counterfactual check · 05b: Late authorization · 05c: The webhook disabled or delayed · 05d: Customer messages · 05e: Decoys, #664 among them.

- [ ] Counterfactual check: no cause, no dip; no decoy, same dip.
- [ ] The #670 and webhook symptoms from the public bug reports appear in the records.
- [ ] `npm test` and `npm run lint` pass.
