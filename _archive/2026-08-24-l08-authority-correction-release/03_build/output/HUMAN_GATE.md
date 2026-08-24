---
type: human-gate
stage: 03
gate_status: closed
decision: accepted
reviewer: owner
reviewed_at: 2026-08-23T01:35:26.2571847+05:30
build_evidence_sha256: 09c0c113adbc67b0a3dced716a6637e2b44e27d042aba3aa0b97317c07d9d895
verification_sha256: 5753beff4a9c5232a671afe192833a1ab4a94509a7fa12466ba4d62b716cc850
---

# Stage 03 human gate - L08 atomic authority correction

Review `BUILD_EVIDENCE.md` after `VERIFY.md` passes. Accept only if:

- `flight_traces.active_intent_id` is the sole runtime authority head;
- normal runtime lookup never infers the head from time, `rowid`, insertion
  order, or an aggregate;
- edit wins rejects the complete stale v1 authorization batch and exact v2
  authorization subsequently succeeds once;
- authorization wins rolls back both the v2 intent and policy while retaining
  exactly one v1 effect;
- grant, effect, compare-and-swap, and executing-event guards enforce the same
  active identity inside the transaction;
- the five migration cases are atomic and the historical mismatch restores
  the complete 0005 schema/data state;
- all ten direct database attacks fail closed;
- build, lint, targeted tests, full tests, and diff inspection pass; and
- the Build claims only L08, with L06, L20, L04, and L14 unchanged.

Verification opened this gate. Only a human may set `reviewer`, `reviewed_at`,
`gate_status`, and `decision`. Stage 04 may not begin while this gate is open.

## Review outcome

Accepted by the owner after correction of the stale
`factory/03_build/verify.mjs` evidence binding. Product code and behavior were
unchanged; no further corrections were requested.
