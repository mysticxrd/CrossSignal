---
type: stage-contract
unit: b01-api-behavioral-benchmark
stage: 03_build
status: in-progress
---

# 03_build — implement and measure bounded API investigation

One job: turn accepted data into a durable evaluated Case slice.

## Inputs

- Freshness dependency: `../02_data/output/DATA_PACKAGE.md`
- Freshness dependency: `../02_data/output/HUMAN_GATE.md`
- Freshness dependency: `../_shared/BENCHMARK_DIRECTION.md`
- Freshness dependency: `../_shared/QUALITY_GATES.md`
- Subscription history: see D-01; SIWC proposal `fb0726293476d13ce909ff042f9712e970c5ba2537c79395a66b9f3f8398651f`.
- Working inputs: executable benchmark contracts named/hash-bound by DATA_PACKAGE; `../../docs/api-execution-boundary.md`.
- Preflight inputs and observed baseline: `factory/03_build/CONTEXT.md@62787d1:20-21`.
- Stage-owned surface: bounded investigator injection in A01 runtime; new `../../db/benchmark/`, `../../scripts/run-benchmark.mjs`, `../../tests/benchmark.test.mjs`, `../../tests/evaluator/benchmark/`; historical A01 test-path compatibility; this verifier/output. Preserve existing fixtures/authority and separate evaluator files from model modules.
- Runner continuation: see D-02. Stores: `../../outputs/b01/gemini-runner-v1/`; no A01 migration, paid fallback, smoke generation, runtime effect or gate advance.

Do not load: later stages, archive, unrelated product, source vault or private truth into model/tool contexts.

## Process

1. Require accepted/fresh Data and explicit provider/model/spend conditions; see D-03. Unsupported limits require an exact contract proposal before scoring.
2. Implement trusted API transport, strict outputs and bounded durable tools; freeze configurations before scoring.
3. Run three baselines, retain/analyze failures, pre-register one change, rerun and record regressions.
4. Prepare one exact SIMULATED proposal; pause for separate runtime human approval, record its one-time effect/outcome. Never synthesize a grant.
5. Write Build evidence and pending gate; stop.

## Outputs

- `output/BUILD_EVIDENCE.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md`

## Verify

Create/run `node factory/03_build/verify.mjs`; record actual runner commands/API usage and artifact links.
Run `node --experimental-strip-types scripts/run-a01.mjs`, `node --experimental-strip-types --test tests/a01.test.mjs tests/a01-release.test.mjs tests/benchmark.test.mjs`, affected prior product suites, existing lint/build and `git diff --check`.
Cover leak/injection/tenant/time/argument/budget/model-failure/spend-cap checks, interruption/replay and exact authority/Global Pause. New stores only; no overwrite of existing runs.

## Human gate

Review exact Build/VERIFY hashes. Losses are valid results; absent model/demo evidence stays NOT_RUN. Verify requires acceptance.

## Failure routing

Fix this stage or upstream contract; preserve initial measured-change results.
