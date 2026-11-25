# 12: Grader v1 with oracle, self-test and thin passes

**What to build:** Pass = f(run log, answer key, world version, grader version). Oracle proposals pass, planted bad proposals fail, and every pass carries a thin flag: true when no result the run saw held the decisive evidence (owner's decision C).

**Blocked by:** 06: Other causes and the 16 development answer keys; 11: `propose`: schema, kind of action, rupees

**Status:** ready-for-agent

- [ ] The oracle passes all 16 development cases.
- [ ] Every planted bad proposal is caught, including the 9.9%/10.1% edge.
- [ ] A right-cause run that never read the decisive record gives pass = true, thin = true.
- [ ] A citation never read is `unread_record`.
- [ ] `npm test` and `npm run lint` pass.
