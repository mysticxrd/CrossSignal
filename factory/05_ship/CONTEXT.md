---
type: stage-contract
stage: 05_ship
unit: fixture-runtime-source-of-truth-correction
status: active
---

# 05_ship - prepare the evaluator-ready L20 release

One job: turn accepted Stage 04 evidence into a cold-runnable, hash-bound L20
release candidate without committing or sealing before the final human gate.

## Inputs

- Freshness dependency: `../04_verify/output/PRIMARY.md`
- Freshness dependency: `../04_verify/output/HUMAN_GATE.md`
- Freshness dependency: `../_shared/ARCHITECTURE_SNAPSHOT.md`
- Freshness dependency: `../_shared/QUALITY_GATES.md`
- Execution helper: `../_lib/verify-kit.mjs`
- Execution helper: `../_lib/factory-state.mjs`
- Execution helper: `../status.mjs`
- Execution helper: `../seal.mjs`
- Observed governed baseline: `../CONTEXT.md`, `../01_spec/`, `../02_data/`,
  `../03_build/`, and `../04_verify/` (hash-only release coverage)
- Observed release surface: the Git status and diff metadata for the complete
  governed L20 candidate; product content reads remain limited to the eight
  durable outputs already bound by accepted Stage 04 evidence.
- Stage-owned surface: `CONTEXT.md`, `prepare.mjs`, `verify.mjs`, and `output/`
- Durable product changes: none

Do not load: `_archive/` contents, dependency folders, generated build output,
the source vault, or any product/reference content not named above.

## Process

1. Hash every declared freshness input and helper.
2. Confirm Stage 04 is accepted and its reviewed evidence hashes agree.
3. Prepare `RELEASE_MANIFEST.md` with the sealed base, branch, complete governed
   candidate-path inventory, current candidate hashes, cold commands, known
   environment routing, and post-gate commit/seal procedure.
4. Prepare `DEMO_SCRIPT.md` for an evaluator cold run with no hidden repair.
5. Run Stage 05 verification, open the final human gate, and stop.

## Outputs

- `output/RELEASE_MANIFEST.md` - release candidate and post-gate seal contract
- `output/DEMO_SCRIPT.md` - cold evaluator path
- `output/VERIFY.md` - exact Stage 05 command and hash evidence
- `output/HUMAN_GATE.md` - final reviewer-owned decision

## Verify

Run `node factory/05_ship/verify.mjs`. It must fail on Stage 04 drift or an
unaccepted gate, durable output drift, candidate inventory drift, benchmark
stash loss/application, active-factory or archive dependencies in durable L20
outputs, a missing cold command, an already closed final gate, or dirty diff
whitespace.

Stage 05 does not claim a future commit hash before review. `prepare.mjs`
recomputes the current pre-gate candidate metadata. After final gate acceptance,
commit the complete release once and run `node factory/seal.mjs` only from the
resulting clean worktree; the accepted manifest's path hashes provide the
release-head freshness binding.

## Human gate

The reviewer checks the release manifest, demo script, and verification record,
then records `accepted`, `changes-requested`, or `rejected`. Stop here; commit
and seal only after `accepted`.

## Failure routing

Correct the earliest owning stage for product or evidence drift. Correct this
stage only for packaging, candidate inventory, demo, or seal-procedure defects.
