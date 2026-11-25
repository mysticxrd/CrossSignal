# 04: The trigger freezes "now" and writes the trigger record

**What to build:** The hourly trigger (trailing-24 h revenue >=25% below the same 24 h a week earlier) runs on the case clock; the first crossing becomes the frozen "now" and writes the trigger record that both the agent and the checklist receive. A world gate recounts distinct crossing windows (Fix F2).

**Blocked by:** 03: A GA4 world with 7 real future days

**Status:** ready-for-agent

- [ ] A fixture lists the baseline's crossing hours and the test matches it.
- [ ] The distinct-window count is written into the world report.
- [ ] The agent run and the checklist get byte-identical trigger records.
- [ ] `npm test` and `npm run lint` pass.
