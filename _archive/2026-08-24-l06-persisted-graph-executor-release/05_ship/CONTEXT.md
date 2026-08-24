---
type: stage-contract
status: blank
stage: 05_ship
unit: persisted-graph-executor-correction
---

# 05_ship - package the verified graph-executor release

One job: turn accepted L06 verification into an evaluator-ready, cold-runnable
release that claims only actual bounded graph execution.

## Inputs

- Freshness dependency: `../04_verify/output/VERIFICATION_REPORT.md`
- Freshness dependency: `../04_verify/output/HUMAN_GATE.md`
- Freshness dependency: `../_shared/ARCHITECTURE_SNAPSHOT.md`
- Freshness dependency: `../_shared/QUALITY_GATES.md`
- Observed baseline: `../../README.md`
- Observed baseline: `../../package.json`
- Observed baseline: `../../app/`
- Observed baseline: `../../db/`
- Observed baseline: `../../drizzle/`
- Observed baseline: `../../worker/`
- Observed baseline: `../../tests/`
- Stage-owned surface: `output/RELEASE_MANIFEST.md`
- Stage-owned surface: `output/DEMO_SCRIPT.md`
- Stage-owned surface: `output/VERIFY.md`
- Stage-owned surface: `output/HUMAN_GATE.md`
- Stage-owned surface: `prepare.mjs`
- Stage-owned surface: `verify.mjs`

Do not load `_archive/`, unrelated product areas, the source vault, or hidden
repair state.

## Process

1. Bind the accepted verification report and complete release head.
2. Provide idempotent cold preparation and an evaluator script that visibly
   distinguishes runtime execution from fixture evidence.
3. Re-run independent verification from the cold path.
4. State corrected and remaining findings without expanding the release claim,
   then stop.

## Outputs

- `output/RELEASE_MANIFEST.md`
- `output/DEMO_SCRIPT.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md`

## Verify

Create `prepare.mjs` and `verify.mjs` using the factory helpers. Verify
idempotent preparation, accepted Stage 04 inheritance, complete release-head
hash coverage, actual persisted graph execution, interruption recovery, build,
lint, tests, migrations, and diff inspection. Record exact commands, hashes,
environment, results, and `status: passed | failed`.

## Human gate

The reviewer runs the release cold, binds both primary artifacts and
`VERIFY.md`, and records `accepted`, `changes-requested`, or `rejected`. Only an
accepted, fresh, committed release may be sealed.

## Failure routing

Correct Ship packaging here; route product or evidence defects upstream. Never
broaden the claim or use fixture output as proof of runtime execution.
