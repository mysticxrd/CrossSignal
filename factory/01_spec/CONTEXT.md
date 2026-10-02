---
type: stage-contract
unit: b01-api-behavioral-benchmark
stage: 01_spec
status: in-progress
---

# 01_spec — define one comparable API investigation benchmark

One job: turn the proposed milestone into one reviewable specification.

## Inputs

- Freshness dependency: `../_shared/BENCHMARK_DIRECTION.md`
- Freshness dependency: `../_shared/QUALITY_GATES.md`
- Working inputs: `../../docs/api-benchmark-charter.md`, `../../docs/api-execution-boundary.md`, `../../docs/benchmark-planning-reconciliation.md`.
- Evaluator-only design: `../../tests/evaluator/benchmark/expected-judgments.md`; never a model input.
- Observed baseline: `../../db/a01/contracts.mjs`, `../../db/a01/tools.mjs`, `../../db/a01/isolated.mjs`, `../../db/a01/investigator.mjs`, `../../db/a01/runtime.mjs`, `../../db/a01/analysis.mjs`, `../../db/a01/store.sql`; `../../scripts/run-a01.mjs`, `../../scripts/a01-case.mjs`; `../../tests/a01.test.mjs`, `../../tests/a01-release.test.mjs`; `../../package.json`.
- Scoped compatibility inspection: `../../tests/icm-workspace.test.mjs`, `../../tests/flight-recorder-data.test.mjs`, `../../tests/flight-recorder-build.test.mjs`, `../../tests/flight-recorder-release.test.mjs`, `../../tests/flight-recorder-ship.test.mjs`, `../../tests/supabase-trace-resolution.test.mjs`.
- Confirmed transition input: `../TRANSITION.md`. Hash-only sealed source: `../A01_PRESERVATION_MANIFEST.json`; never load archived stage outputs into Spec or model input.
- Verification tooling: `../_lib/verify-kit.mjs`, `../_lib/factory-state.mjs` (generic source, not additional shared references).
- Stage-owned surface: this contract, its verifier and output only.

Do not load: later stages, `_archive/`, dependencies, source vault or unlisted references.

## Process

1. Require confirmed transition/Spec entry; hash declared inputs by role.
2. Specify comparable baselines, five families/split, independent judgments, API/spend conditions, isolation, metrics and one-change experiment.
3. Enumerate minimal v2 contract differences and factory-sensitive test compatibility; assign executable changes to later stages.
4. Write Spec, verification and pending gate; stop. No implementation, API call, installation or runtime approval.

## Outputs

- `output/SPEC.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md`

## Verify

Create `verify.mjs` using unchanged `../_lib/verify-kit.mjs`; run `node factory/01_spec/verify.mjs` and `git diff --check`.
Reject missing evidence fairness, private-answer exposure, undocumented spending, unsupported competence/recovery claims, unbounded retries and conflated stage/runtime authority.
Record environment, exact commands/exit codes and normalized hashes in VERIFY; no migrations/build apply to specification-only work.

## Human gate

A person reviews exact Spec/VERIFY hashes and records accepted, changes-requested or rejected. Do not begin Data without accepted and fresh gate.

## Failure routing

Correct this stage or its source. Never patch later stages to hide a defect.
