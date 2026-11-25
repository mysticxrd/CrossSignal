# 18: The executor applies a proposal once

**What to build:** The executor checks every effect, applies them in the fixed order with idempotency keys and intent/outcome lines, stops at the first refusal, and resumes by re-reading.

**Blocked by:** 07: A simulator that remembers landed writes; 17: Approval record and fixed rule

**Status:** ready-for-agent

- [ ] Lost-ack and crash rows of the fault table pass.
- [ ] A resumed capture already landed is logged `reconciled`, never repeated.
- [ ] `npm test` and `npm run lint` pass.
