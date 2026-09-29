---
type: stage-contract
unit: a01-synthetic-revenue-investigation
stage: 01_spec
---

# 01_spec — define one complete synthetic investigation

One job: turn the approved A01 direction into a reviewable bounded product
specification. Entry is confirmed in `../TRANSITION.md`.

## Inputs

- Freshness dependency: this `CONTEXT.md`.
- Freshness dependency: `../_shared/A01_DIRECTION.md`.
- Freshness dependency: `../_shared/QUALITY_GATES.md`.
- Working inputs: `../TRANSITION.md`,
  `../../docs/a01-synthetic-investigation-handoff.md`,
  `../../docs/hiring-mvp-direction.md`,
  `../../docs/hiring-mvp-reconciliation-evidence.md`.
- Observed baseline: `../../db/revenue-leak.mjs`,
  `../../db/case-investigator.mjs`, `../../db/case-response.mjs`,
  `../../db/flight-recorder-contracts.ts`,
  `../../supabase/functions/_shared/case-checkout.mjs`,
  `../../scripts/run-golden-case-replay.mjs`,
  `../../scripts/run-case-scenario-matrix.mjs`.
- Tooling: `../_lib/verify-kit.mjs`, `../_lib/factory-state.mjs`.
- Stage-owned surface: this stage's `output/` and `verify.mjs`.

Do not load: `_archive/`, later stages, the source vault, or unrelated product
files. The transition's already verified archive manifest is sufficient for
preservation evidence.

## Process

1. Bind the declared inputs by role and SHA-256.
2. Specify the complete A01 behavior, acceptance/failure cases, domain tools,
   truth isolation, deterministic/model boundaries, and minimal extensions.
3. Verify specification integrity and negative validation cases.
4. Write reviewable outputs and stop for the human gate.

## Outputs

- `output/SPEC.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md`

## Verify

Run `node factory/01_spec/verify.mjs` and `git diff --check`.
The verifier must detect source drift, missing acceptance/failure requirements,
and a gate bound to different artifacts. Record command, environment, result,
input/output hashes, and limitations in `VERIFY.md`. This is specification
verification, not A01 product or model validation. Application build, lint,
migration and preview checks become required when those surfaces change.

## Human gate

Review the exact Spec and verification hashes, then record reviewer, timestamp,
decision, and corrections in `output/HUMAN_GATE.md`. Only a person can accept
the gate. Do not start Data until this gate is accepted and fresh.

## Failure routing

Correct this specification or its declared source; never fabricate implementation
results or bypass the gate through another stage.
