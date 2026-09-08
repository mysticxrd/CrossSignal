---
type: stage-contract
stage: 05_ship
unit: authenticated-tenant-scoped-redacted-ordered-trace-resolution-endpoint
status: active
truth_mode: FIXTURE
---

# 05_ship - turn verified L14 evidence into an evaluator-ready release

One job: bind the complete current release head and give a reviewer a cold,
reproducible path to inspect the authenticated tenant-scoped redacted ordered
trace-resolution endpoint without hidden repair.

## Inputs

- Freshness dependency: `../04_verify/output/VERIFICATION_REPORT.md`
- Freshness dependency: `../04_verify/output/HUMAN_GATE.md`
- Freshness dependency: `../_shared/ARCHITECTURE_SNAPSHOT.md`
- Freshness dependency: `../_shared/QUALITY_GATES.md`
- Verification helper: `../_lib/verify-kit.mjs`
- Factory state helper: `../_lib/factory-state.mjs`
- Factory status helper: `../status.mjs`
- Release seal helper: `../seal.mjs`
- Observed baseline: `../../package.json`
- Release inventory: Git-tracked and untracked non-ignored files outside `_archive/`, dependency folders, generated build output, and `factory/05_ship/output/` (the human gate binds Stage 05 outputs without a self-reference)
- Stage-owned surface: `prepare.mjs`, `verify.mjs`, and `output/`

Do not load: `_archive/`, dependency source, generated build output,
environment secret values, or any reference not named above. Stage 05 does not
change durable product code.

## Process

1. Read and hash every declared file input by role.
2. Derive the release inventory with the same exclusions enforced by the seal
   helper and bind every current release-head file in the manifest.
3. Write a cold demo script that begins from the repository state, preserves
   the `FIXTURE` truth label, runs reproducible checks, and requires no repair.
4. Run the cold preparation helper, focused tests, lint, production build,
   Stage 05 verifier, status, and diff inspection.
5. Write release evidence, open the human gate, and stop before commit or seal.

## Outputs

- `output/RELEASE_MANIFEST.md`
- `output/DEMO_SCRIPT.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md`

## Verify

The release manifest must bind the accepted Stage 04 report and gate, the
current product and governed factory head required by `seal.mjs`, the exact
Stage 05 scripts, the L14 route contract, the 28-event pending and 49-event
completed evidence, all 14 acceptance IDs, all 12 negative IDs, and the local
production `401`/`400`/masked-`500` probes. It must state that the durable
success proof is local `FIXTURE` evidence and is not a deployed or live D1
claim.

Record exact command, timestamp, Windows/Node environment, exit code, and
relevant output. Focused tests, lint, production build, preparation, verifier,
status, and `git diff --check` must pass. The seal is intentionally not run
until after the Stage 05 human gate and release commit.

## Human gate

The reviewer cold-runs the demo script, inspects the manifest and verification
record, records their hashes, and chooses `accepted`, `changes-requested`, or
`rejected`. Verification opens this gate but never accepts it.

## Failure routing

Correct Stage 05 evidence or route a real defect to the owning upstream stage.
Do not edit product code or suppress a seal prerequisite in ship evidence.
