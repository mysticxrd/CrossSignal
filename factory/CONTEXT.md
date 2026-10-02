---
type: pipeline-contract
form: pipeline
unit: b01-api-behavioral-benchmark
status: instantiated
---

# Revenue Leak Investigator behavioral benchmark factory

One run: spec → data → build → verify → ship. Direction is
`_shared/BENCHMARK_DIRECTION.md`; the other shared reference is unchanged
`_shared/QUALITY_GATES.md`. The user confirmed transition and Stage 01 entry on
2026-10-01. `TRANSITION.md` binds the sealed A01 baseline and full byte-preserved
factory. Use derived status for the active stage; A01 acceptance never transfers
here. Stage 01 prepares Spec/VERIFY and then stops for its separate human gate.

| Stage | One transformation | Primary output |
| --- | --- | --- |
| 01_spec | Make the API behavioral milestone reviewable | output/SPEC.md |
| 02_data | Make five cases, judgments and isolation executable | output/DATA_PACKAGE.md |
| 03_build | Implement the bounded API investigator and experiments | output/BUILD_EVIDENCE.md |
| 04_verify | Independently resolve every criterion and failure | output/VERIFICATION_REPORT.md |
| 05_ship | Package evaluator-ready comparisons and honest limits | output/RELEASE_MANIFEST.md |

After activation run `node factory/status.mjs`; status is derived, never an
editable program table. Complete requires passed VERIFY, accepted hash-bound
HUMAN_GATE and fresh dependencies. The first incomplete stage is active.
Read only that stage's contract, declared inputs and its two shared references.
Do not load later stages, the archive, dependencies or the whole source vault.

Freshness dependencies are upstream outputs/gates, current contract and shared
references. Product surfaces remain historical bindings until Ship binds the
whole release head. A stage writes its outputs and stops for a person's gate.
Never bypass an unaccepted stage or regenerate accepted artifacts to hide drift.

After final acceptance, commit the complete release and run the read-only
`node factory/seal.mjs`; it requires all stages complete, Ship head fresh and
Git clean. A new run starts only from a sealed commit. Preserve the complete
run-specific factory (contracts, verifiers, fixtures and outputs), instantiate
fresh contracts and update the root unit, then stop for human confirmation
before Stage 01. Archiving and instantiation remain human-owned transitions.
