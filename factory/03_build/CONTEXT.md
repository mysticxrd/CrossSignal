---
type: stage-contract
unit: a01-synthetic-revenue-investigation
stage: 03_build
---

# 03_build — build one durable A01 Case from signal through observed synthetic result

One job: build one durable A01 Case from signal through observed synthetic result.

## Inputs

- Freshness dependency: `../02_data/output/DATA_PACKAGE.md`.
- Freshness dependency: `../02_data/output/HUMAN_GATE.md`.
- Freshness dependency: `../_shared/A01_DIRECTION.md`.
- Freshness dependency: `../_shared/QUALITY_GATES.md`.
- Verification dependency: ../02_data/output/VERIFY.md; accepted Spec at
  ../01_spec/output/SPEC.md; this CONTEXT.md.
- Shared tooling: ../_lib/verify-kit.mjs and ../_lib/factory-state.mjs.
- Accepted executable inputs: ../02_data/a01/contracts.mjs, world.mjs,
  store.sql, evaluator/truth.json and observable/001.json through 003.json.
- Observed baseline: ../../db/revenue-leak.mjs, case-investigator.mjs,
  flight-recorder-contracts.ts; ../../scripts/run-golden-case-replay.mjs.
- Stage-owned product: ../../db/a01/; ../../scripts/a01-world.mjs,
  a01-case.mjs, run-a01.mjs; ../../tests/a01.test.mjs,
  ../../tests/evaluator/a01/; ../../docs/a01-build-status.md.
- Integration/configuration: ../../package.json, ../../eslint.config.mjs,
  ../../.gitignore, ../../CONTEXT.md, ../../README.md. Preserve old scripts.
- Regression verification: ../../tests/golden-case-replay.test.mjs,
  case-scenario-matrix.test.mjs, case-investigator.test.mjs, case-response.test.mjs,
  case-outcome.test.mjs, case-checkout.test.mjs, case-simulation-outcome.test.mjs.
- Own verifier and output/ with exact artifact hashes; runtime output goes under
  ignored outputs/a01/. No app, hosted database or LIVE mutations.

Do not load: `_archive/`, later stages, the source vault, or unrelated files.
Legacy fixture/helper files retained in stage folders are regression
dependencies and do not establish that this A01 stage has run.

## Process

1. Require accepted and fresh upstream evidence.
2. Name and hash exact stage inputs and permitted product surfaces.
3. Perform this stage's one transformation and required verification.
4. Write reviewable outputs, then stop for the human gate.

## Outputs

- `output/BUILD_EVIDENCE.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md`

## Verify

Run node --experimental-strip-types --test tests/a01.test.mjs for integrated
query/authority/citation/isolation/budget/duplicate/crash/tamper checks. Run
node --experimental-strip-types scripts/run-a01.mjs for two independent local
replays and a separate grader report. Run the named old regression tests with
node --test. Lint new modules with the installed ESLint entry point; run the
installed vinext build entry point to check the unchanged app. Run node
factory/03_build/verify.mjs after recording exact commands/results/hashes and
git diff --check. Do not claim model evaluation or actual human runtime
approval from surrogate replay. No hosted migrations apply.

## Human gate

Verification opens the gate. A person records reviewer, timestamp, artifact
hashes and accepted/changes-requested/rejected decision. Do not advance without
fresh accepted upstream and current gates.

## Failure routing

Correct this stage or its upstream source. Never manufacture missing acceptance
or patch a later stage to hide an earlier defect.
