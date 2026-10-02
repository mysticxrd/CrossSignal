---
type: stage-contract
unit: a01-synthetic-revenue-investigation
stage: 02_data
---

# 02_data — define executable A01 data, evidence isolation, authority and world-state contracts

One job: define executable A01 data, evidence isolation, authority and world-state contracts.

## Inputs

- Freshness dependency: `../01_spec/output/SPEC.md`.
- Freshness dependency: `../01_spec/output/HUMAN_GATE.md`.
- Verification dependency: `../01_spec/output/VERIFY.md`.
- Freshness dependency: `../_shared/A01_DIRECTION.md`.
- Freshness dependency: `../_shared/QUALITY_GATES.md`.
- Freshness dependency: this `CONTEXT.md`.
- Observed baseline: `../../db/revenue-leak.mjs`,
  `../../db/flight-recorder-contracts.ts`, `../../db/flight-recorder-schema.ts`.
- Tooling: `../_lib/verify-kit.mjs`, `../_lib/factory-state.mjs`.
- Stage-owned surface: `a01/`, `verify.mjs`, and `output/` in this stage.
  Existing legacy fixtures/SQL, product modules, and accepted Spec artifacts
  are preserved. Current status may be recorded in the root router and
  `../../docs/a01-data-status.md` without editing hash-bound Spec sources.

Do not load: `_archive/`, later stages, the source vault, or unrelated files.
Legacy fixture/helper files retained in stage folders are regression
dependencies and do not establish that this A01 stage has run.

## Process

1. Require accepted and fresh upstream evidence.
2. Name and hash exact stage inputs and permitted product surfaces.
3. Perform this stage's one transformation and required verification.
4. Write reviewable outputs, then stop for the human gate.

## Outputs

- `output/DATA_PACKAGE.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md`

## Verify

Run `node factory/02_data/verify.mjs --check-data`, then the same command
without the flag after assembling the review record. Run `git diff --check`.
Verify repeatable fixtures and private state transitions; strict observable,
query and intent shapes; tenant and time bounds; isolated file-read denial;
SQLite foreign-key/append-only/duplicate/transaction constraints; and fresh
accepted Spec binding. Use only in-memory or temporary local stores. Record
exact file hashes and results. This proves executable data contracts, not
the product investigator, human approval UI, or integrated executor.

## Human gate

Verification opens the gate. A person records reviewer, timestamp, artifact
hashes and accepted/changes-requested/rejected decision. Do not advance without
fresh accepted upstream and current gates.

## Failure routing

Correct this stage or its upstream source. Never manufacture missing acceptance
or patch a later stage to hide an earlier defect.
