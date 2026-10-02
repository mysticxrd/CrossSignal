---
type: factory-reference
source_kind: compiled-snapshot
source_title: Company Flight Recorder Architecture Decision
source_location: Obsidian Vault/wiki/analysis/Company Flight Recorder Architecture Decision.md
source_updated: 2026-08-13
source_sha256: 752F1B2A74BAD47102FEF7C240FA66E6FD817874483D8A7A207AAB33A90514DF
compiled: 2026-08-13
edit_policy: edit-source-then-regenerate
---

# Company Flight Recorder architecture snapshot

This is the approved execution snapshot for the build factory. It is compiled
from the Obsidian source named above. Do not edit architectural facts here:
change the source with human approval, then regenerate and re-hash this file.

## Decision

Build the evidence, authority, execution, and outcome trace around one bounded
business workflow. Do not build another Company Brain, a generic RAG interface,
or a general-purpose multi-agent orchestrator.

CrossSignal is a standalone project intended to demonstrate product and
engineering judgment to the Result team. Result is the evaluation audience,
not a runtime vendor. Do not claim knowledge of or integration with Result's
private stack, APIs, agent topology, or hiring rubric.

The first proof is an approval-bound onboarding-rescue experiment:

```text
exact business evidence
  -> frozen context snapshot
  -> fixed planner / workers / skeptic / synthesizer graph
  -> immutable action intent
  -> deterministic policy decision
  -> approval bound to the exact payload
  -> trusted external-write function
  -> capped email test
  -> observed activation outcome
  -> supported / unsupported / correlated / inconclusive assessment
```

The compelling object is one `trace_id` that reconstructs every declared
context load, evidence citation, graph node, authority decision, external
effect, failure, cost, and later observation.

## Strategic fit

Result publicly presents an operating system for founders spanning product,
marketing, support, Company Brain, analytics, finance, and integrations. Its
thesis is that agents can compress the operational stack enough for very small
teams to run serious internet businesses. Company Flight Recorder is an
adjacent proof: not another knowledge layer, but a visible account of why an
agent proposed an action, who authorized it, what happened, and what business
outcome followed.

## System boundary

| Plane | Owns | Must not become |
|---|---|---|
| ICM/MWP factory | Architecture, stage contracts, reviewed outputs, verification evidence | Live multi-tenant state or runtime orchestration |
| Context | Approved immutable snapshot and retrieval manifest | Mutable local files during a run |
| Execution | One fixed bounded reasoning graph | An authority or arbitrary DAG platform |
| Authority | Deterministic policy and exact human approval | An LLM judgment call |
| Action/outcome | Trusted effect path, provider receipt, metric observation, assessment | A hidden or blindly retried side effect |
| Trace | Append-only events and projections | An execution bypass or chain-of-thought store |

Runtime choices must be proven against this repository and its deployed preview.
Result's public product direction informs the wedge and reviewer narrative; it
does not supply implementation primitives. External services remain explicit
adapters or labeled fixtures until directly observed.

## Runtime invariants

- Agents may propose an immutable intent; only deterministic policy and, where
  required, a payload-bound human grant provide authority.
- Any payload, context, policy, recipient, cap, or display mutation creates a
  new intent and invalidates prior approval.
- The external-write path rechecks tenant, policy, approval, caps, kill switch,
  and intended-effect identity immediately before dispatch.
- A possible post-dispatch timeout becomes `indeterminate`; it is never blindly
  retried.
- Every conclusion resolves to exact evidence and the frozen context snapshot.
- Runtime outcomes may propose a factory change but never silently rewrite
  prompts, policy, contracts, or approved knowledge.
- LIVE, TEST, and FIXTURE truth modes remain unmistakable.

## Five-stage build

CrossSignal uses the same sequential MWP lifecycle established for Whipoff.
Every meaningful vertical slice makes one complete pass:

1. `01_spec`: product uncertainty -> accepted build specification.
2. `02_data`: accepted specification -> executable data package.
3. `03_build`: accepted data package -> one durable vertical slice.
4. `04_verify`: functioning slice -> release-grade verification evidence.
5. `05_ship`: verified evidence -> evaluator-ready release.

Each stage uses `Inputs / Process / Outputs / Verify / Human gate`, stops after
one pass, and advances only when its outputs are fresh, verification passes,
and the human gate binds the reviewed artifact hashes.

## Non-goals for this run

No generic Company Brain, arbitrary agent swarm, general DAG engine,
self-modifying policy, automatic pricing/refunds/deployments, broad connector
catalog, causal-inference platform, production-scale observability program, or
invented claim about Result's internal implementation.
