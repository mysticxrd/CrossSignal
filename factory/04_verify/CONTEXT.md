---
type: stage-contract
unit: b01-api-behavioral-benchmark
stage: 04_verify
status: waiting
---

# 04_verify — resolve the benchmark promise independently

One job: audit evidence, deterministic boundaries and behavioral comparisons.

## Inputs

- Freshness dependency: `../03_build/output/BUILD_EVIDENCE.md`
- Freshness dependency: `../03_build/output/HUMAN_GATE.md`
- Freshness dependency: `../_shared/BENCHMARK_DIRECTION.md`
- Freshness dependency: `../_shared/QUALITY_GATES.md`
- Working inputs: exact code, frozen data/rubric, transcripts, grader reports and commands hash-bound in BUILD_EVIDENCE. Private evaluator material remains out of model/tool contexts.
- Stage-owned surface: this verifier/output only. Product fixes return to Build under the repository's correction rules.

Do not load: Ship, unrelated repository, source vault or old archive contents.

## Process

1. Require accepted/fresh Build; hash every declared evidence dependency.
2. Independently recompute grades and check every acceptance criterion, all terminal failures, exposure traces, configuration fairness, spend and human approval provenance.
3. Reproduce saved-transcript mechanics and required regressions; distinguish fresh API reruns and their cost/variation. Do not call a paid API without budget.
4. Publish per-case dimensions, experiment deltas/regressions, limitations and pending human gate; stop.

## Outputs

- `output/VERIFICATION_REPORT.md`
- `output/REVIEW.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md`

## Verify

Create/run `node factory/04_verify/verify.mjs`, exact deterministic regrade/replay/regression commands declared in Build, and `git diff --check`.
Reject changed rubric/data without consistent versioned regrading, leaked answers, false fresh-run labels, omitted failures, unknown charges hidden as zero and unsupported broad competence/recovery claims.

## Human gate

A person accepts exact report/VERIFY hashes before Ship. Required safety failures and missing human-demo proof block completion.

## Failure routing

Route defects to Build/Data/Spec; never manufacture evidence or acceptance.
