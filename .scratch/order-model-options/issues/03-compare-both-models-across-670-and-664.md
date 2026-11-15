# 03: Compare both models across #670 and #664

**What to build:** Extend provider selection to the separate refund-ordering
world and produce comparison reports using each world's existing grader.

**Blocked by:** 02: Enable bounded Gemini and Nebius calls.

**Status:** ready-for-agent

- [ ] #664 retains its own evidence and decision contract; neither world supplies evaluator truth to a provider.
- [ ] Reports compare saved Gemini/Nebius decisions and code-only rivals on identical public inputs.
- [ ] Show cost, deciding records cited, extra citations, unneeded writes, latency and usage with run IDs, dates and model versions.
- [ ] Never score a failed run as a valid abstention or combine offline fixtures with actual model results.
- [ ] Total Nebius task usage remains within the same $25 ceiling; held-out #670 orders stay sealed.
- [ ] npm test, lint and typecheck pass; local diff review and whole-task walkthrough are complete.
