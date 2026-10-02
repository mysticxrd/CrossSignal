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
- Additive amendment inputs: `../01_spec/amendments/b01-siwc-measured-v1/CONTRACT.md` and `HUMAN_GATE.md`; `../02_data/amendments/b01-siwc-measured-v1/DATA_COMPATIBILITY.md`, `VERIFY.md`, `HUMAN_GATE.md`. Original accepted Spec/Data paths remain unchanged. Require accepted/fresh amendment and compatibility gates before scoring.
- Working inputs: executable benchmark contracts named/hash-bound by DATA_PACKAGE; `../../docs/api-execution-boundary.md`.
- Preflight inputs: `../02_data/output/VERIFY.md`, `../01_spec/output/SPEC.md`, `../02_data/verify.mjs`, `../_lib/verify-kit.mjs`, `../_lib/factory-state.mjs`, `../status.mjs`, `../../eslint.config.mjs`, `../../package-lock.json`; prior Gemini preparation, current official OpenAI Sign in with ChatGPT/model/Responses references linked in `output/chatgpt-subscription/PROPOSAL.md`; installed-client path and sanitized desktop plan observation; `../../tests/benchmark-subscription.test.mjs`.
- Observed baseline: `../../db/a01/`, `../../db/flight-recorder-contracts.ts`, `../../scripts/run-a01.mjs`, `a01-case.mjs`, `a01-world.mjs`; `../../tests/a01.test.mjs`, `a01-release.test.mjs`, `../../package.json`.
- Stage-owned surface: bounded investigator injection in A01 runtime; new `../../db/benchmark/`, `../../scripts/run-benchmark.mjs`, `../../tests/benchmark.test.mjs`, `../../tests/evaluator/benchmark/`; historical A01 test-path compatibility; this verifier/output. Preserve existing fixtures/authority and separate evaluator files from model modules.

Do not load: later stages, unrelated product, source vault or private truth into model/tool contexts.

## Process

1. Require accepted/fresh Data and explicit provider/model/spend conditions.
   The owner superseded the no-model-call instruction only for requests wholly covered by an existing ChatGPT subscription, after eligibility, compatibility and required contract changes are verified and accepted. Prepare the subscription adapter/configuration and offline tests first. Ordinary API-key billing, credits, purchases and paid fallback remain prohibited. Unsupported accepted limits require a separate hash-bound contract-change proposal; preserve accepted Spec/Data bytes and do not score until review resolves it. Preserve prior Gemini preparation as history. These conditions do not waive the complete Build gate or separate runtime authority.
   The owner explicitly accepted the exact b01-siwc-measured-v1 proposal hash fb0726293476d13ce909ff042f9712e970c5ba2537c79395a66b9f3f8398651f. Apply its request-byte ceiling and post-response thresholds honestly; no hard generation or combined-token guarantee. Prepare the additive Data compatibility review and host-budget offline checks without changing accepted originals. Account/route conditions and full Build evidence remain unfinished.
2. Implement one trusted API transport, strict model outputs and bounded tools with durable recording. Freeze configurations before scored calls.
3. Run all three baselines, retain failures, analyze development failures, pre-register one change, rerun and record regressions.
4. Prepare one exact SIMULATED proposal; pause for separate runtime human approval, then record the one-time effect and observed outcome. Never synthesize a human grant.
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

A person reviews exact Build/VERIFY hashes. Behavioral losses are valid results; missing model/demo evidence stays NOT_RUN. Verify stage cannot begin without acceptance.

## Failure routing

Fix this stage or upstream contract; preserve initial results when applying the one measured change.
