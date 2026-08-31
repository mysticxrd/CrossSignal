---
type: stage-contract
stage: 03_build
status: active
unit: authenticated-tenant-scoped-redacted-ordered-trace-resolution-endpoint
---

# 03_build - implement the L14 vertical slice

One job: turn the accepted L14 data package into one durable read-only App
Router endpoint with strict authentication, tenant-bound resolution, reused
redaction, and executable handler proof.

## Inputs

- Freshness dependency: `../02_data/output/DATA_PACKAGE.md`
- Freshness dependency: `../02_data/output/HUMAN_GATE.md`
- Freshness dependency: `../_shared/ARCHITECTURE_SNAPSHOT.md`
- Freshness dependency: `../_shared/QUALITY_GATES.md`
- Verifier library: `../_lib/verify-kit.mjs`
- Executable fixture: `../02_data/fixtures/l14-trace-resolution.fixture.mjs`
- Observed baseline: `../../package.json`
- Observed baseline: `../../app/chatgpt-auth.ts`
- Observed baseline: `../../app/crosssignal-auth.ts`
- Observed baseline: `../../db/index.ts`
- Observed baseline: `../../db/workspaces.ts`
- Observed baseline: `../../db/flight-recorder-contracts.ts`
- Observed baseline: `../../db/flight-recorder.ts`
- Observed baseline: `../../tests/flight-recorder-build.test.mjs`
- Stage-owned surface: `../../app/crosssignal-auth.ts`
- Stage-owned surface: `../../app/trace-resolution.ts`
- Stage-owned surface: `../../app/api/workspaces/[workspaceId]/traces/[traceId]/route.ts`
- Stage-owned surface: `../../db/trace-resolution.ts`
- Stage-owned surface: `../../tests/flight-recorder-build.test.mjs`
- Stage-owned surface: `CONTEXT.md`
- Stage-owned surface: `verify.mjs`
- Stage-owned surface: `output/BUILD_EVIDENCE.md`
- Stage-owned surface: `output/VERIFY.md`
- Stage-owned surface: `output/HUMAN_GATE.md`

Do not load: later stages, `_archive/`, the whole repository, generated build
output, dependency folders, or any reference not named above.

## Process

1. Read and hash the accepted data package, gate, two shared references,
   executable fixture, verifier library, and exact observed baselines.
2. Implement the strict auth helper, tenant-bound read resolver, request
   handler, route delegation, and fixture-driven product tests.
3. Run the focused handler suite, Stage 03 verifier, lint, production build,
   and diff inspection; write evidence and a pending reviewer gate; then stop.

## Outputs

- `output/BUILD_EVIDENCE.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md`
- `verify.mjs`

## Verify

Run `tsx --test tests/flight-recorder-build.test.mjs`,
`tsx factory/03_build/verify.mjs`, `npm run lint`, `npm run build`, and
`git diff --check`. Record commands, hashes, environment, positive and negative
results, and `status: passed | failed` in `VERIFY.md`.

The accepted Stage 02 outputs and two shared references are freshness
dependencies. Product paths are historical build bindings until Ship binds the
release head.

## Human gate

The reviewer confirms both successful tenant traces and representative `400`,
`401`, `404`, `409`, and `500` responses through the real handler, inspects
ordered redacted output and write-count invariance, and accepts or rejects the
vertical slice. Do not begin Stage 04 without `accepted`.

## Failure routing

Correct this build or return to the accepted data/spec contract. Never weaken
authentication, tenant predicates, projection integrity, or redaction to make
a test pass.
