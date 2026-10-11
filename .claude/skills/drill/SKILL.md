---
name: drill
description: Set up a small exercise where the owner rebuilds a core primitive by hand, with a spec and failing tests but no solution. Use only when the owner types /drill.
argument-hint: <primitive, e.g. "retryable job with an idempotency key">
disable-model-invocation: true
---

# Drill: rebuild it without AI

Primitive: $ARGUMENTS

Good primitives: a retryable job with an idempotency key; a one-tool agent loop
with a stop and abstain rule; a deterministic grader for one benchmark case; a
rate limiter that keeps requests 4.5 s apart; a resumable investigation state
machine.

1. Create `work/drills/<slug>/` (gitignored, so it never ships).
2. Write `README.md`: the spec in at most 15 lines (inputs, outputs,
   invariants and failure cases), plus the `file:line` where CrossSignal does
   the real version.
3. Write `drill.mjs` exporting the needed functions, each body throwing
   `new Error("TODO(human)")`.
4. Write `drill.test.mjs` with `node:test`: 5 to 8 failing tests, including
   failure cases such as a duplicate run, a timeout and a crash between two
   steps.
5. Tell the owner to run `node --test work/drills/<slug>/` and stop. Give
   hints only when asked, smallest hint first. Never write the solution.
6. When the owner says done, run the tests and review their code like a senior
   engineer: correctness, failure handling, and how it compares with the
   CrossSignal version.
