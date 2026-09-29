---
type: stage-contract
unit: a01-synthetic-revenue-investigation
stage: 04_verify
---

# 04_verify — verify the entire A01 promise and deliberate failure cases

One job: verify the entire A01 promise and deliberate failure cases.

## Inputs

- Freshness dependency: `../03_build/output/BUILD_EVIDENCE.md`.
- Freshness dependency: `../03_build/output/HUMAN_GATE.md`.
- Freshness dependency: `../_shared/A01_DIRECTION.md`.
- Freshness dependency: `../_shared/QUALITY_GATES.md`.
- Verification dependencies: ../03_build/output/VERIFY.md, ../03_build/verify.mjs,
  ../01_spec/output/SPEC.md and this stage contract.
- Shared tooling: ../_lib/verify-kit.mjs and ../_lib/factory-state.mjs.
- Read accepted implementation: ../../db/a01/, ../../scripts/a01-world.mjs,
  a01-case.mjs, run-a01.mjs; ../../tests/a01.test.mjs,
  ../../tests/evaluator/a01/; existing authority in ../../db/flight-recorder-contracts.ts.
- Verification baselines: ../03_build/output/replay/ and preview/;
  ../../tests/golden-case-replay.test.mjs, case-scenario-matrix.test.mjs,
  case-investigator.test.mjs, case-response.test.mjs, case-outcome.test.mjs,
  case-checkout.test.mjs, case-simulation-outcome.test.mjs.
- Stage-owned: verify.mjs, output/, ../../tests/a01-release.test.mjs,
  ../../docs/a01-verification-status.md; current root CONTEXT.md and README.md.
- Correct a demonstrated evaluator defect only in ../../tests/evaluator/a01/;
  preserve reviewed Build artifacts and record the exact delta and old/new hashes.
  No app, hosted schema, runtime effect scope or accepted specification change.
- Read ../../package.json and existing parent installed tooling only for lint/build.
  Local runtime evidence stays under ignored outputs/a01/.

Do not load: `_archive/`, later stages, the source vault, or unrelated files.
Legacy fixture/helper files retained in stage folders are regression
dependencies and do not establish that this A01 stage has run.

## Process

1. Require accepted and fresh upstream evidence.
2. Name and hash exact stage inputs and permitted product surfaces.
3. Perform this stage's one transformation and required verification.
4. Write reviewable outputs, then stop for the human gate.

## Outputs

- `output/VERIFICATION_REPORT.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md`

## Verify

Run node factory/03_build/verify.mjs before starting to verify reviewed hashes.
Then run node --experimental-strip-types --test tests/a01.test.mjs
 tests/a01-release.test.mjs for the complete mechanic/failure matrix, including
concurrent execution, repeated reload, actual restricted runtime and rehashed
nested-authority corruption. Run node --experimental-strip-types
scripts/run-a01.mjs from a fresh output directory and compare all five hashes
with accepted Build. Run the seven named old regression suites with node --test.
Lint changed/new verifier files using the existing parent ESLint entry point.
Carry forward the accepted unchanged app build by exact source bindings; rerun
only if application/bundling inputs change. No hosted migration applies.
Map all twelve acceptance IDs and nine negatives explicitly, including partial
or NOT_RUN outcomes. Check local model availability without downloading/calling
models. Never convert surrogate approval into an actual human demo.
Run this stage verifier and git diff --check after assembling output hashes.

## Human gate

Verification opens the gate. A person records reviewer, timestamp, artifact
hashes and accepted/changes-requested/rejected decision. Do not advance without
fresh accepted upstream and current gates.

## Failure routing

Correct this stage or its upstream source. Never manufacture missing acceptance
or patch a later stage to hide an earlier defect.
