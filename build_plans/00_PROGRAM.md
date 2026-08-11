---
id: crosssignal-demo-program
status: active
active_phase: phase-00-complete
target: result-team-evaluation
release_profile: result-demo
---

# CrossSignal ICM + EVE development program

## North-star proof

> A deterministic signal stamps an ICM case. EVE reads only the declared stage
> context, gathers bounded evidence, asks an independent skeptic, writes an
> inspectable artifact, parks for a human edit, resumes from the edited artifact,
> executes one approved sandbox action exactly once, measures the outcome, and
> proposes a versioned Company Brain diff.

CrossSignal is not ready for the Result-team demonstration until that statement
is observable end to end.

## State ownership

| Layer | Authoritative responsibility | Must never become |
|---|---|---|
| ICM repository | Human-readable case artifacts, stage contracts, semantic status, and accepted Company Brain knowledge | Hidden agent memory or an unversioned blob store |
| EVE | Durable execution, bounded tools, declared subagents, parking, continuation, cancellation, and runtime traces | The permanent business ledger or canonical company memory |
| D1 | Users, workspace authorization, scan projections, run mapping, approvals, action intents, idempotency, and ledger index | A competing semantic source of truth |
| UI | Inspect, edit, approve, compare, recover, and understand | The authoritative owner of workflow state |
| Fixture adapters | Deterministic demo inputs behind provider-neutral contracts | A presentation that implies live customer connections |

## Composite lifecycle rule

CrossSignal has one semantic authority and one operational authority; they are
composed, not interchangeable:

- **ICM artifacts and canonical review artifacts** answer what the human-reviewed
  business decision means and which reasoning stage is semantically complete.
- **D1 approvals, run mappings, action intents, receipts, and ledger rows** answer
  whether a runtime operation is currently authorized, executing, reconciled,
  or completed.
- A D1 approval must bind the hash of the corresponding ICM review artifact and
  ActionSpec. The review artifact alone never authorizes a side effect.
- The UI lifecycle is a deterministic projection of both domains. If their
  expected hashes or heads disagree, CrossSignal fails closed in a visible
  reconciliation state; neither side silently overwrites the other.
- Semantic state can be rebuilt from ICM artifacts and reviews. Operational
  action state can be rebuilt only from D1 and ledger records. No rebuild
  pretends one is recoverable from the other.

## Phase map

| Phase | Status | Depends on | Outcome | Evaluator-visible proof |
|---|---|---|---|---|
| 00. Foundation and demo contract | Complete | Existing repo | Honest baseline and viable EVE/hosting topology | Owner-approved contract, D1-safe private baseline, and pinned EVE restart proof |
| 01. ICM workspace kernel | Planned | 00 | Real stamped, versioned decision workspaces | Browse contracts, artifacts, history, diffs, and derived status |
| 02. Fixture data and scan provenance | Planned | 00 | Explainable deterministic scan input | Rule-by-rule scan receipt creates exactly one ICM case |
| 03. EVE investigation over ICM | Planned | 01 + 02 | First undeniable combined proof | Human edit survives interruption and changes resumed EVE work |
| 04. Human gates and sandbox action | Planned | 03 | Approval-bound exactly-once action | Mutated approval fails; retry returns one sandbox receipt |
| 05. Measurement, learning, and Lab | Planned | 04 | Calculated outcome and approved learning | EVE proposes a diff; only the reviewed diff changes the brain |
| 06. Safety, recovery, and evals | Planned | 05 | Engineering evidence for every critical claim | Linked runs, interruption matrix, truthful stored eval results |
| 07. Result-team demo release | Planned | 06 | Repeatable three-minute evaluation package | A new evaluator understands the mechanism without coaching |
| 08. Post-evaluation productionization | Deferred | 07 + explicit trigger | Validated production expansion | Live providers and scale only after demand justifies them |

## Dependency policy

- Phases 01 and 02 may proceed in parallel after Phase 00 closes.
- Phase 03 cannot start until both ICM and source-tool contracts are stable.
- Security tests are written with the feature that creates the risk; Phase 06
  aggregates and adversarially expands them rather than postponing safety.
- Phase 07 freezes the demo. Phase 08 work may not destabilize that release.

## Result-team demo gate

All conditions are mandatory:

- [ ] A real EVE run creates a real ICM artifact.
- [ ] A human edits the artifact and the resumed run reads its new hash.
- [ ] The skeptic has demonstrably narrower capabilities than the root agent.
- [ ] The sandbox action cannot execute without a current payload-bound approval.
- [ ] Retry or ambiguous timeout produces one immutable action receipt.
- [ ] Measurement is calculated from versioned fixture windows.
- [ ] A Company Brain change occurs only through the previewed approved diff.
- [ ] The permanent ledger remains intelligible without platform traces.
- [ ] Displayed eval counts come from stored executions.
- [ ] Fixtures, sandbox actions, and time compression are labeled everywhere.
- [ ] The complete golden path is repeatable from a fresh demo workspace.

This gate closes the **Result-team demo release**, not the full PRD MVP release.
The binding scope amendment is `_shared/DEMO_RELEASE_PROFILE.md`.

## Explicit demo deferrals

The canonical decision register is
`00_evidence/P00_M1/DEFERRED_SCOPE_REGISTER.md`. Every row is assigned to Phase
08 with an explicit re-entry trigger, stays open in `TRACEABILITY.md`, and does
not block the Result-team demo while its disclosed demo treatment is used.
