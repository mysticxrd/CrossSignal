# 20: A batch runner that never runs a run twice

**What to build:** Run ids are fixed per (batch, case, repeat, harness version); closed runs are skipped; an unclosed run is closed `crashed` and restarted under the existing rule; a batch lock refuses a second runner (Fix F5).

**Blocked by:** 16: Admission, void restarts and the forced-proposal budget; 19: The verifier stamps landed, and `verify:e1`

**Status:** ready-for-agent

- [ ] Starting the same batch twice at once: one runs, the other refuses.
- [ ] Rerun after a kill starts only unfinished runs.
- [ ] Batch run-log settlements equal the ledger's.
- [ ] `npm test` and `npm run lint` pass.
