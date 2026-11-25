# 23: The judge, its controls and log

**What to build:** GLM-5.3-Flash judges summaries with three binary calls under `judge:` ledger ids; it never sees the key.

**Blocked by:** 20: A batch runner that never runs a run twice

**Status:** ready-for-agent

- [ ] >=9/10 on the 20 control fixtures.
- [ ] A judge call over the ceiling leaves the run not judged.
- [ ] `npm test` and `npm run lint` pass.
