---
type: stage-contract
stage: 04_verify
unit: fixture-runtime-source-of-truth-correction
status: active
---

# 04_verify - independently verify the L20 correction

One job: independently verify that the accepted Stage 03 build removes
fixture/runtime source-of-truth drift without changing durable product code.

## Inputs

- Freshness dependency: `../03_build/output/BUILD_EVIDENCE.md`
- Freshness dependency: `../03_build/output/HUMAN_GATE.md`
- Freshness dependency: `../_shared/ARCHITECTURE_SNAPSHOT.md`
- Freshness dependency: `../_shared/QUALITY_GATES.md`
- Execution helper: `../_lib/verify-kit.mjs`
- Observed baseline: `../../db/flight-recorder-demo.ts`
- Observed baseline: `../../db/flight-recorder-graph-definition.ts`
- Observed baseline: `../../db/flight-recorder-graph.ts`
- Observed baseline: `../../db/flight-recorder.ts`
- Observed baseline: `../../tests/fixtures/persisted-graph-executor.fixture.mjs`
- Observed baseline: `../../tests/flight-recorder-data.test.mjs`
- Observed baseline: `../../tests/flight-recorder-build.test.mjs`
- Observed baseline: `../../tests/flight-recorder-release.test.mjs`
- Stage-owned surface: `CONTEXT.md`, `verify.mjs`, and `output/`
- Durable product changes: none

Do not load: later stages, `_archive/`, the whole repository, or any reference
not named above.

## Process

1. Hash every declared freshness input and observed baseline.
2. Confirm the Stage 03 gate is accepted and binds its evidence.
3. Independently run the durable L20 tests, focused lint, production build,
   source-of-truth dependency scan, registry-count check, and diff hygiene.
4. Record exact commands, hashes, results, and limitations.
5. Open the human gate and stop without entering Stage 05.

## Outputs

- `output/PRIMARY.md` - independent verification evidence
- `output/VERIFY.md` - deterministic verifier result
- `output/HUMAN_GATE.md` - reviewer-owned decision

## Verify

Run `node factory/04_verify/verify.mjs`. The verifier must fail on upstream hash
drift, an unaccepted Stage 03 gate, durable source drift, active-factory or
archive dependencies, duplicate graph authority, numbered public exports,
failed product tests, lint failures, production-build failures, or dirty diff
whitespace.

The production build may require the already approved unsandboxed execution
path when Windows denies writes through the ignored dependency junction. Raw
workspace-wide TypeScript diagnostics are supporting evidence, not an L20
acceptance check, because the inherited workspace baseline includes unrelated
archived and Cloudflare-global failures.

## Human gate

The reviewer checks `PRIMARY.md` and `VERIFY.md`, then records `accepted`,
`changes-requested`, or `rejected` in `HUMAN_GATE.md`. Do not begin Stage 05
without `accepted`.

## Failure routing

Correct Stage 03 if any durable behavior or source ownership check fails.
Correct this stage only for verifier or evidence defects. Never patch Stage 05
to hide an earlier defect.
