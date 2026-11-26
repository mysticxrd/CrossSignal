# 19: The verifier stamps landed, and `verify:e1`

**What to build:** The verifier re-reads the raw backend and stamps landed; `npm run verify:e1` runs the offline proof.

**Blocked by:** 18: The executor applies a proposal once

**Status:** ready-for-agent

- [ ] `verify:e1` is green in under 2 minutes.
- [ ] The stamp is computed without the answer key.
- [ ] `npm test` and `npm run lint` pass.
