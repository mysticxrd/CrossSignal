# Build-plan schema

Every numbered phase plan uses the same contract so a human or agent can execute
it without reconstructing intent from the PRD.

## Required frontmatter

```yaml
---
id: phase-NN
status: planned | in_progress | blocked | complete | deferred
depends_on: [phase-XX]
unlocks: [phase-YY]
prd_requirements: [FR-00]
evals: [EV-00]
---
```

Conditional phases may add `entry_trigger`, `prd_remainders`, or another typed
metadata field, but `depends_on` and `unlocks` contain only real phase IDs.

## Required sections

1. **Outcome** — one measurable capability and the evaluator-visible proof.
2. **Baseline** — what exists, exact limitations, and reusable foundations.
3. **Entry criteria** — binary conditions required before starting.
4. **In scope / out of scope** — prevents later-phase infrastructure leakage.
5. **Architecture invariants** — state ownership, trust, and compatibility rules.
6. **Milestones** — stable IDs in dependency order.
7. **Verification matrix** — deterministic, integration, adversarial, recovery,
   UI persistence, build, and deployment checks.
8. **Demo checkpoint** — the shortest visible proof unlocked by the phase.
9. **Exit gate** — binary checklist; no "mostly complete" criteria.
10. **Rollback and recovery** — how to undo or safely contain a failed release.
11. **Handoff** — artifacts and contracts the next phase may rely on.

## Milestone contract

Each milestone must name:

- **Deliverables:** inspectable files, schema, UI state, run, or report produced.
- **Work:** ordered implementation checklist.
- **Acceptance evidence:** enough information across Deliverables, Work, and
  Acceptance evidence to identify the relevant input, action, durable result,
  primary failure behavior, and observable proof.

Every milestone inherits `_shared/QUALITY_GATES.md` and the phase's Architecture
invariants and Verification matrix. Add milestone-local **Security and tenant
checks** or **Failure and recovery** subsections whenever that milestone creates
a new boundary or differs from those inherited rules. Do not repeat boilerplate
inside all milestones merely to satisfy the template.

Subsection headings are optional: boundary-specific security and recovery may be
stated in the milestone's Work and Acceptance evidence. For a research,
decision, documentation, or rehearsal milestone that performs no durable
mutation, an approved ADR/report/session artifact is valid evidence and the
state-recovery case may be explicitly not applicable through the phase matrix.

The phase Verification matrix must cover every category relevant to that phase;
universal categories are covered by `_shared/QUALITY_GATES.md`. If a category is
genuinely not applicable, state the reason in the phase rather than silently
omitting it.

"Implement X" is not a complete milestone. "Given fixture version A, running
scan policy B persists one byte-stable rule receipt and retry creates no second
case" is.

## Status transitions

`planned -> in_progress -> complete`

- Use `blocked` only with a named blocker and a decision owner.
- Use `deferred` when another phase owns the work **or** when the phase itself has
  a typed, unmet `entry_trigger` that requires explicit approval/evidence.
- A phase becomes `complete` only after every exit-gate item has evidence.
- Reopening a gate returns the phase to `in_progress` and blocks dependents.
