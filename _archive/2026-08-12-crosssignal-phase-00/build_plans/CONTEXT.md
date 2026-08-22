# CrossSignal development program

One job: turn the current durable product prototype into an evaluator-verifiable
demonstration that ICM and EVE can close a business decision loop safely.

## Form

This is an ICM pipeline with one controlled fork:

`Phase 00 -> (Phase 01 + Phase 02) -> Phase 03 -> Phase 04 -> Phase 05 -> Phase 06 -> Phase 07`

Phase 08 is a conditional production-expansion backlog, not part of the
Result-team critical path.

## Inputs

- Working product: `../app/`, `../db/`, `../drizzle/`, and `../tests/`
- Product contract: `../PRD.md`
- Current project handoff: `../README.md`
- Program standards: `_shared/PLAN_SCHEMA.md`, `_shared/QUALITY_GATES.md`, and
  `_shared/DEMO_RELEASE_PROFILE.md`
- Requirement ownership: `TRACEABILITY.md`

## Process

1. Confirm the active phase's entry criteria.
2. Complete milestones in dependency order; do not mark tasks complete from UI
   appearance alone.
3. Capture the acceptance evidence named by each milestone.
4. Run the phase verification matrix and universal quality gate.
5. Update phase status, the program table, and traceability.
6. Perform the phase's human exit review before opening dependent work.

## Outputs

- One deployable product increment per demo-critical phase.
- Versioned architecture decisions, schemas, tests, eval results, and demo proof.
- A three-minute demonstration in which every claim links to a real artifact,
  ledger event, EVE run, or stored eval result.

## Human check

At every phase boundary, replay the evaluator-visible proof and reject the phase
if any important behavior is static copy, client-only state, or unsupported
simulation.

## Status rule

Program status is derived from each phase file's frontmatter plus its completed
exit-gate checklist. The phase table is a generated summary in spirit: update
it only after the phase file changes, never instead of changing the phase file.
