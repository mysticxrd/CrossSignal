# CrossSignal build plans

This folder is the execution map for developing CrossSignal into a truthful,
compelling demonstration of ICM and EVE.

## Start here

1. Read `CONTEXT.md` for the program contract.
2. Read `00_PROGRAM.md` for sequence, dependencies, and current status.
3. Open only the active numbered phase plan.
4. Apply `_shared/QUALITY_GATES.md` before closing any phase.
5. Update `TRACEABILITY.md` whenever scope or phase ownership changes.

## Routing

| Need | File |
|---|---|
| Program sequence and status | `00_PROGRAM.md` |
| Required plan structure | `_shared/PLAN_SCHEMA.md` |
| Universal completion rules | `_shared/QUALITY_GATES.md` |
| Result-demo versus PRD-MVP scope | `_shared/DEMO_RELEASE_PROFILE.md` |
| PRD requirement and eval ownership | `TRACEABILITY.md` |
| Current foundation and topology decisions | `00_foundation_and_demo_contract.md` |
| Phase 00 acceptance evidence | `00_evidence/CONTEXT.md` |
| Phase 00 retrospective owner visibility | `00_retrospective/CONTEXT.md` |
| ICM semantic workspace | `01_icm_workspace_kernel.md` |
| Fixture adapters and deterministic scans | `02_fixture_data_and_scan_provenance.md` |
| EVE investigation over ICM | `03_eve_investigation_over_icm.md` |
| Human gates and sandbox action | `04_human_gates_and_sandbox_action.md` |
| Measurement and accepted learning | `05_measurement_learning_and_lab.md` |
| Safety, recovery, observability, and evals | `06_safety_recovery_and_evals.md` |
| Result-team demonstration package | `07_result_team_demo_release.md` |
| Conditional production expansion | `08_post_evaluation_productionization.md` |

## Working rules

- ICM owns semantic business state; EVE owns durable bounded execution.
- D1 owns identity, authorization, projections, approvals, idempotency, and the
  permanent ledger. It must not silently become a second Company Brain.
- Every milestone ends in an inspectable artifact and binary acceptance proof.
- Fixtures, sandbox actions, and simulated time advances are labeled honestly.
- A later phase may rely only on an earlier phase's completed exit gate.
- Phase 08 cannot enter `in_progress` without explicit evidence or direction.
