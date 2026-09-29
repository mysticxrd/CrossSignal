---
type: stage-contract
unit: a01-synthetic-revenue-investigation
stage: 05_ship
---

# 05_ship — package a reproducible, truthful A01 evaluator demonstration

One job: package a reproducible, truthful A01 evaluator demonstration.

## Inputs

- Freshness dependency: `../04_verify/output/VERIFICATION_REPORT.md`.
- Freshness dependency: `../04_verify/output/HUMAN_GATE.md`.
- Freshness dependency: `../_shared/A01_DIRECTION.md`.
- Freshness dependency: `../_shared/QUALITY_GATES.md`.
- Read ../04_verify/output/VERIFY.md, ../04_verify/verify.mjs and its declared
  evidence/bindings; shared tooling ../_lib/verify-kit.mjs and factory-state.mjs.
- Read ../../scripts/run-a01.mjs, a01-case.mjs, ../../tests/a01-release.test.mjs,
  ../../tests/evaluator/a01/grade.mjs and package.json for exact demo commands.
- Own this contract, prepare.mjs, verify.mjs and output/; update only current
  routing in ../../CONTEXT.md, ../../README.md and ../../docs/a01-release-status.md.
- Inventory and hash every existing Git-visible tracked/nonignored file for
  complete release coverage, including the preserved archive (hash-only).
  Exclude only this stage's manifest, verification and human gate to avoid
  circular hashes; VERIFY binds manifest, and gate binds all three outputs.
  This inventory grants no product/archive edit ownership. Ignored runtime
  stores, dependencies, secrets and generated builds are not release inputs.

Do not load: `_archive/`, later stages, the source vault, or unrelated files.
Legacy fixture/helper files retained in stage folders are regression
dependencies and do not establish that this A01 stage has run.

## Process

1. Require accepted and fresh upstream evidence.
2. Name and hash exact stage inputs and permitted product surfaces.
3. Perform this stage's one transformation and required verification.
4. Write reviewable outputs, then stop for the human gate.

## Outputs

- `output/RELEASE_MANIFEST.md`
- `output/DEMO_SCRIPT.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md`

## Verify

Run node factory/04_verify/verify.mjs and require accepted/fresh Stages 01-04.
Run node factory/05_ship/prepare.mjs: cold-run the documented one-command replay
in fresh stores; compare every branch with accepted Verify; run the four
tests in tests/a01-release.test.mjs (40 authority mutations, effect links,
concurrency and accepted artifact compatibility). Preserve earlier outputs.
Save reports/artifacts and exact command/time/environment evidence. Preparation
must refuse to overwrite an accepted Ship gate. No human runtime approval,
model call, installation, external deployment, product change or commit here.
Run node ../../node_modules/eslint/bin/eslint.js factory/05_ship/prepare.mjs
factory/05_ship/verify.mjs, node factory/05_ship/verify.mjs and git diff --check.
The verifier rejects missing/new/changed release inputs, upstream drift,
incorrect cold hashes/grades and inflated model/human/business claims.
Carry forward the accepted unchanged integrated/regression/app build evidence.
No migration applies. Stop for the final human gate; only after acceptance
commit the complete release and run node factory/seal.mjs.

## Human gate

Verification opens the gate. A person records reviewer, timestamp, artifact
hashes and accepted/changes-requested/rejected decision. Do not advance without
fresh accepted upstream and current gates.

## Failure routing

Correct this stage or its upstream source. Never manufacture missing acceptance
or patch a later stage to hide an earlier defect.
