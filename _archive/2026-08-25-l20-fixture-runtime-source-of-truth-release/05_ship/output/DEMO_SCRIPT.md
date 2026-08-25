---
type: evaluator-demo-script
stage: 05_ship
unit: fixture-runtime-source-of-truth-correction
finding: L20
status: candidate
---

# L20 cold evaluator script

## Preconditions

- Start on branch `codex/l20-fixture-runtime-source-of-truth` with dependencies
  installed and Node 22 available.
- Do not inspect `_archive/` and do not apply or alter any Git stash.
- Treat all showcased evidence as FIXTURE and the bounded email action as TEST.

## Cold run

1. Print the candidate metadata:

   `node factory/05_ship/prepare.mjs`

   Confirm sealed base `bed7f21a19d3b71abc0e3c58e13fd8e30ed5a2dd`,
   the expected L20 branch, 22 release bindings, and all three preserved stashes.

2. Run the complete release verifier through the approved Windows execution
   path when the dependency junction requires it:

   `node factory/05_ship/verify.mjs`

   Expected result: 66 passed, 0 failed; focused lint passes; the five-part
   production Vinext build completes; one graph registry exists; no durable
   output imports the active factory or archive; three benchmark stashes remain.

3. Inspect governed status:

   `node factory/status.mjs`

   Before review, Stages 01-04 are complete and accepted and Stage 05 is waiting
   only on its human gate. No release seal is claimed yet.

4. Review the durable ownership proof:

   - `db/flight-recorder-graph-definition.ts` contains the single ordered
     planner/workers/skeptic/synthesizer registry.
   - `db/flight-recorder-demo.ts` derives its precomputed projection from that
     registry and owns the compatible fixture identity.
   - `db/flight-recorder-graph.ts` consumes the same registry at runtime.
   - Durable tests and the fourteen L06 attack identities live under `tests/`.

5. Confirm exclusions: no migration, L04 authority-history implementation, or
   L14 authenticated trace-resolution endpoint appears in the candidate.

## After human acceptance only

Commit the complete candidate, confirm the worktree is clean, then run:

`node factory/seal.mjs`

Expected result: `sealed <commit>`. Stop if any stage, binding, Git state, or
stash-preservation check differs; do not repair the release silently.
