---
type: stage-contract
stage: 04
job: prove-the-complete-product-promise
---

# 04_verify - turn the working slice into evidence

One job: resolve every acceptance criterion and attack recovery, isolation,
authority, provenance, effects, and truthfulness before release.

## Inputs

- Working specification: `../01_spec/output/SPEC.md`
- Data contract: `../02_data/output/DATA_PACKAGE.md`
- Working: `../03_build/output/BUILD_EVIDENCE.md`
- Working verification: `../03_build/output/VERIFY.md`
- Working gate: `../03_build/output/HUMAN_GATE.md`
- Reference: `../_shared/ARCHITECTURE_SNAPSHOT.md`
- Reference: `../_shared/QUALITY_GATES.md`
- Test surface: `../../tests/` and the deployed preview named by Stage 03

Do not load: `_archive/`, Stage 05, unrelated vault material, or production
customer data.

## Process

1. Map each Spec acceptance criterion to a test, trace, receipt, screenshot, or explicit failure.
2. Exercise recovery, tenant isolation, duplicate ingress, injection, context leakage, authority mutation/replay, ambiguous effects, and late outcomes.
3. Fix defects at their owning source and rerun the complete relevant matrix.
4. Add `npm run verify:release`, write the verification report, and stop.

## Outputs

- Durable tests and source fixes in the product tree
- `output/VERIFICATION_REPORT.md` - acceptance matrix, evidence, failures, fixes, and residual risk
- `output/VERIFY.md`
- `output/HUMAN_GATE.md`

## Verify

Run `npm run verify:release`, `npm run build`, `npm run lint`, and `npm test`.
No acceptance criterion may remain implied; no unauthorized write may occur;
failures remain visible; replay creates zero external effects.

## Human gate

Inspect failed and passing cases. Accept only if each acceptance criterion has
resolvable evidence, attacks fail closed, and limitations remain explicit.

## Failure routing

Return product-definition defects to Spec, contract defects to Data, and
implementation defects to Build. Upstream changes make this report stale.
