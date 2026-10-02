---
type: stage-contract
unit: b01-api-behavioral-benchmark
stage: 05_ship
status: waiting
---

# 05_ship — package truthful evaluator-ready benchmark proof

One job: bind the release head and provide a cold review of comparisons.

## Inputs

- Freshness dependency: `../04_verify/output/VERIFICATION_REPORT.md`
- Freshness dependency: `../04_verify/output/HUMAN_GATE.md`
- Freshness dependency: `../_shared/BENCHMARK_DIRECTION.md`
- Freshness dependency: `../_shared/QUALITY_GATES.md`
- Working inputs: exact proof/transcript/dataset/rubric paths bound in accepted Verify; `../../scripts/run-benchmark.mjs`, `../../package.json`.
- Stage-owned surface: this verifier/output; current `../../CONTEXT.md`, `../../README.md`, new benchmark release-status documentation. Preserve historical A01 sources.
- Hash-only release inventory: all Git-visible tracked/nonignored files, including preserved archives. Exclude circular manifest/VERIFY/gate bindings using the existing convention.

Do not load: archive content, unrelated repository or source vault.

## Process

1. Require accepted/fresh Stages 01–04 and all hard acceptance evidence.
2. Provide a cold offline transcript replay/regrade and a separately labeled fresh API evaluation command with explicit credentials/spend conditions.
3. Bind complete release files; package comparison tables, one experiment, exact human-demo proof and honest five-case limits.
4. Write manifest/demo/VERIFY/pending gate; stop. No install, deploy, commit, paid call or runtime effect implied.

## Outputs

- `output/RELEASE_MANIFEST.md`
- `output/DEMO_SCRIPT.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md`

## Verify

Create/run `node factory/05_ship/verify.mjs` with unchanged verify-kit; cold offline regrade/replay; check manifest coverage, release tests and `git diff --check`.
No silent API spend in cold review. Saved transcripts prove replay mechanics only. Fresh evaluation remains separately labeled with provider/version/usage and variability.

## Human gate

A person cold-reviews and accepts exact manifest/demo/VERIFY hashes. Only then commit the complete release and run `node factory/seal.mjs` with clean Git.

## Failure routing

Fix upstream evidence/claims; never rewrite accepted hashes to conceal drift.
