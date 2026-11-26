# 17: Approval record and fixed rule

**What to build:** The approval is a run-log event binding the priced proposal's hashes, single use; the fixed rule approves in evals and the policy layer flags large actions.

**Blocked by:** 11: `propose`: schema, kind of action, rupees; 14: The run log: chain, lock, cardinality

**Status:** ready-for-agent

- [ ] A changed proposal hash refuses execution.
- [ ] A second use is `approval_used`.
- [ ] Changed targets give `targets_changed`.
- [ ] `npm test` and `npm run lint` pass.
