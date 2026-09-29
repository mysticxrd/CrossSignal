# A01 — Verification checkpoint

The user accepted the exact Stage 03 Build package. Stage 04 now has fresh
verification evidence and is pending human review.

## Results

- 18 integrated checks and 19 existing regressions passed.
- All five cold replay comparisons reproduced the accepted Build artifact hashes.
- Two concurrent resume attempts produced one committed effect and reloadable history.
- The independent grader now rejects all 40 nested authority-field mutations,
  including traces whose hashes were recomputed after tampering.

Review the [verification report](../factory/04_verify/output/VERIFICATION_REPORT.md),
[commands and evidence](../factory/04_verify/output/VERIFY.md), and
[cold Case report](../factory/04_verify/output/replay/checkout.md).

## Correction found during verification

The prior grader checked only selected fields of nested execution authority.
A rehashed trace with a different nested approver incorrectly passed. The
grader now reconstructs the entire expected authority and effect record and
checks the confirmation link. The executor already checked those authority
bindings and required no change.

The exact reviewed grader is retained as a hash-verified snapshot under this
stage's corrections directory. Accepted Build outputs and their acceptance are
unchanged. The prior Build verifier targets its reviewed source version and
will report the intentional grader drift; use Stage 04's verifier for current
release evidence. It permits this one documented correction and rejects any
other change to the reviewed Build bindings.

## Current limits

**Deterministic mechanics pass. Full AI hiring proof remains pending.**
Model evaluation and a real human-approved runtime demonstration are NOT_RUN.
The checked local model locations remain empty; no model was downloaded or
called. Surrogate replay approvals are labeled explicitly.

All results remain SIMULATED. This work establishes no real payment capture,
Mobile Safari device verification or recovered business revenue. Existing
data, trial exclusion, tenant safeguards and LIVE remain unchanged.

Run `node factory/04_verify/verify.mjs` to validate this review package and
`node factory/status.mjs` for derived gate status. Per AGENTS.md, Stage 05
cannot begin until this verification gate is accepted. Acceptance reviews the
evidence and its stated gaps; it does not approve an intervention or establish
model quality. Current changes remain uncommitted.
