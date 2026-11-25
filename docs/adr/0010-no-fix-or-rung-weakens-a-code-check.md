# No fix or rung weakens a code check

The code checks are proposal validation, pricing, limits, the executor and the run caps. A fix or a rung may add a code check, but it never removes, loosens or replaces one. A model may add a flag on top of the code checks; it is never the only guard, and v1 has no flagging model at all.

We chose this for four reasons:
- a guard model reads the same injected text that fooled the agent, so it fails on the same cases;
- at temperature 1 a model guard is not repeatable: one that stops 19 attacks in 20 lets a merchant's money move on the 20th;
- a code check can be unit-tested on every case, while a model guard needs its own eval, with no data or time for one before v1;
- a second model inside the harness would stretch ADR 0009's one model version and change two things in one rung.

## Considered options

- **A flagging model beside the code checks in v1** (the "sentinel agent" pattern from the owner's harness note): it adds no guarantee the code checks don't already give, and it costs a model version and an eval.
- **An injection defence inside proposal validation**: validation allows one retry, so the agent's second attempt would hide the first proposal from grading. ADR 0005 grades the proposal before any safety net for exactly this reason.

## Consequences

- An injection defence that is meant to change pass must act before the model reads the attack: code datamarking of message text plus one prompt line, added as a fix to rung 0. A prompt line alone doesn't count as the defence.
- A new guard, such as a provenance check on effect targets, is a policy-version change made before sealing. It shows in guard catches, never in pass.
- Guards protect the merchant's state, not the score. Section 2's unsafe count is graded on the proposal, so no guard can lower it.
- The summary-faithfulness judge is untouched: it grades after the run, never blocks an action, and belongs to the grader version (ADR 0006).
