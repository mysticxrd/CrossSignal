# 14: The run log: chain, lock, cardinality

**What to build:** An append-only, hash-chained JSONL writer with fsync before each line, a per-run lock file and the event cardinality rules.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] The chain verifies and a changed line breaks it.
- [ ] A torn last line is cut, with its length and hash recorded.
- [ ] A second writer on the same run id is refused.
- [ ] `npm test` and `npm run lint` pass.
