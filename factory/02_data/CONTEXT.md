---
type: stage-contract
unit: b01-api-behavioral-benchmark
stage: 02_data
status: in-progress
---

# 02_data — freeze executable cases, judgments and exposure boundaries

One job: make the accepted Spec executable as a five-case data contract.

## Inputs

- Freshness dependency: `../01_spec/output/SPEC.md`
- Freshness dependency: `../01_spec/output/HUMAN_GATE.md`
- Freshness dependency: `../01_spec/output/VERIFY.md`
- Freshness dependency: `../_shared/BENCHMARK_DIRECTION.md`
- Freshness dependency: `../_shared/QUALITY_GATES.md`
- Working input: `../../tests/evaluator/benchmark/expected-judgments.md` (evaluator-only).
- Observed baseline: `../../db/a01/contracts.mjs`, `../../db/a01/tools.mjs`, `../../db/a01/isolated.mjs`, `../../db/a01/store.sql`; `../../tests/a01.test.mjs`.
- Verification tooling (unchanged): `../_lib/verify-kit.mjs`, `../_lib/factory-state.mjs`, `../01_spec/verify.mjs`, `../status.mjs`.
- Observed verification environment (read/hash only): `../../package.json`, `../../package-lock.json`, `../../eslint.config.mjs`; existing parent-resolved Node/ESLint dependencies.
- Preservation inventory: hash-only inventory of existing files and junctions in both authoritative repositories, excluding Git/dependency contents and this stage's new outputs. Do not load archived source or modify stored results.
- Stage-owned surface: this contract, verifier, `benchmark/`, output; proposed benchmark schemas/fixtures and frozen rubric. Do not change A01 fixtures or runtime here.

Do not load: later stages, archive, unrelated repository or unlisted references.

## Process

1. Require accepted/fresh Spec; hash inputs by role.
2. Freeze exactly five generators/observable cutoffs, private truth, evidence IDs/claim predicates, split, rubric aliases, prompt exposure allowlist and shared output schema before scoring.
3. Validate bounded variable prices/configuration/missingness without leaking causes; prove eager and query evidence universes match.
4. Write Data package, executable contract evidence and pending gate; stop.

## Outputs

- `output/DATA_PACKAGE.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md`
- `output/CONTRACT_EVIDENCE.json` (evaluator-only offline probes, not a model transcript)

## Verify

Create/run `node factory/02_data/verify.mjs` using unchanged verify-kit; run `git diff --check`.
Cover ledger/schema consistency, opaque IDs, different causes, B05 underidentification, discriminator references, no-future/cross-tenant rows, full-context fit and forbidden exposure probes. No API scoring or runtime effect.

## Human gate

A person accepts exact Data/VERIFY hashes before Build; expected answers remain inaccessible to the model/tools.

## Failure routing

Fix the contract or upstream Spec; never adjust private answers after seeing model performance to make it pass.
