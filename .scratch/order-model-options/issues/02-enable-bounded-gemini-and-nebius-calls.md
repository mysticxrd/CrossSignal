# 02: Enable bounded Gemini and Nebius calls

**What to build:** Run the public #670 task with either provider and record
the actual response, model, usage and timing. Keep Gemini free tier only and
enforce the owner's $25 total Nebius task budget with durable reservations.

**Blocked by:** 01: Record provider-selectable #670 decisions.

**Status:** ready-for-agent

- [ ] Verify the exact Nebius model, price and structured-response contract before live dispatch.
- [ ] Both providers use the accepted shared task and host decision validator.
- [ ] Every send and retry reserves maximum cost first; restarts and duplicate runs cannot reset the task budget.
- [ ] Ambiguous timeouts preserve reservations and stop; provider failures never trigger fallback.
- [ ] Gemini keeps its free-tier checks and request spacing; keys are absent from all saved/logged data, including errors and echoed responses.
- [ ] Offline fault tests cover malformed responses, persistence failure, timeout, retry and budget exhaustion before a bounded live run.
- [ ] Report the live run ID, date, model, evidence supplied/cited, usage and matched baseline results without claiming superiority.
- [ ] npm test, lint and typecheck pass; local diff review is complete.
