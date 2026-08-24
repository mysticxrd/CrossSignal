---
type: human-gate
stage: 01_spec
gate_status: closed
decision: accepted
reviewer: owner
reviewed_at: 2026-08-23T19:06:32.7252329Z
spec_sha256: f90a9fa515c9e8357b12bb0374939fdeec7ba4580ffc6573d2f8384fdc67ea7c
verification_sha256: 8efc701e40b617573de9fac6814747eeea1ea79b2045c54907bb0c6e32336c25
---

# Stage 01 human gate

The owner accepted Stage 01 against the bound artifact hashes below.

## Review checklist

- [x] The baseline finding accurately distinguishes fixture-built succeeded
  rows from actual runtime graph execution.
- [x] The six fixed nodes and their dependencies are the intended bounded
  CrossSignal graph.
- [x] The persisted claim, immutable attempt history, lease-expiry recovery,
  duplicate-call convergence, and fail-closed rules are acceptable.
- [x] The synthesizer-to-intent handoff preserves the sealed L08 authority
  correction and never creates approval or effect authority.
- [x] FIXTURE inputs and outputs remain unmistakable even though the executor
  itself runs at runtime.
- [x] The fourteen acceptance criteria and eight deterministic schedules are
  sufficient for Stage 02 data-contract work.
- [x] L20, L04, and L14 remain out of scope.

## Decisions requiring owner confirmation

1. Accept `crosssignal-fixed-graph-v1` with planner; quantitative,
   qualitative, and experiment-design workers; skeptic; then synthesizer.
2. Accept deterministic lease expiry and immutable later attempts for recovery
   from a claimed but interrupted reasoning node.
3. Accept sequential topological execution for the first release; concurrency
   may be implemented only if its persisted behavior is identical.
4. Accept the claim boundary: actual runtime orchestration over explicitly
   `FIXTURE` evidence and handlers, with no production-model claim.

## Reviewer action

Accepted by the owner at `2026-08-23T19:06:32.7252329Z`. The reviewed
specification and verification hashes remain unchanged. Stage 02 may start only
as a separate governed stage action.
