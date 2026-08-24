---
type: stage-contract
status: blank
stage: 04_verify
unit: persisted-graph-executor-correction
---

# 04_verify - independently verify actual graph execution

One job: turn the accepted L06 build into release-grade proof that the fixed
graph executes, persists, and resumes at runtime.

## Inputs

- Freshness dependency: `../03_build/output/BUILD_EVIDENCE.md`
- Freshness dependency: `../03_build/output/HUMAN_GATE.md`
- Freshness dependency: `../02_data/output/DATA_PACKAGE.md`
- Freshness dependency: `../01_spec/output/SPEC.md`
- Freshness dependency: `../_shared/ARCHITECTURE_SNAPSHOT.md`
- Freshness dependency: `../_shared/QUALITY_GATES.md`
- Observed baseline: `../../app/`
- Observed baseline: `../../db/`
- Observed baseline: `../../drizzle/`
- Observed baseline: `../../worker/`
- Observed baseline: `../../tests/`
- Stage-owned surface: `output/VERIFICATION_REPORT.md`
- Stage-owned surface: `output/VERIFY.md`
- Stage-owned surface: `output/HUMAN_GATE.md`
- Stage-owned surface: `verify.mjs`

Do not load Stage 05, `_archive/`, unrelated product areas, or the source vault.

## Process

1. Independently resolve every accepted criterion to runtime evidence.
2. Exercise clean execution, interruption/resume, duplicate and out-of-order
   work, node failure, workspace isolation, and fixture-truth rejection.
3. Inspect durable traces and prove completed nodes are not rerun.
4. Record all passes, failures, limitations, and remaining findings, then stop.

## Outputs

- `output/VERIFICATION_REPORT.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md`

## Verify

Create an independent `verify.mjs` using `../_lib/verify-kit.mjs`. Run the full
relevant suite, build, lint, migrations, cold and resumed runtime probes, and
diff inspection. A functioning UI or fixture-built trace alone is a failure.
Record exact commands, hashes, environment, results, and
`status: passed | failed`.

## Human gate

The reviewer resolves every specification criterion, inspects negative cases,
and binds `VERIFICATION_REPORT.md` and `VERIFY.md`. Do not begin Stage 05
without `accepted`.

## Failure routing

Route defects to the stage that owns them. Never rewrite verification evidence
to conceal missing runtime execution.
