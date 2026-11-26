# 14: The run log: chain, lock, cardinality

**What to build:** An append-only, hash-chained JSONL writer with fsync before each line, a per-run lock file and the event cardinality rules.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] The chain verifies and a changed line breaks it.
- [x] A torn last line is cut, with its length and hash recorded.
- [x] A second writer on the same run id is refused.
- [x] `npm test` and `npm run lint` pass.
