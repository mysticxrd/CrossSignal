---
type: stage-contract
stage: 02_data
status: active
unit: authenticated-tenant-scoped-redacted-ordered-trace-resolution-endpoint
---

# 02_data - make the L14 HTTP contract executable

One job: turn the accepted L14 specification into deterministic request,
response, error, tenant-collision, integrity-failure, and redaction fixtures
without implementing the endpoint.

## Inputs

- Freshness dependency: `../01_spec/output/SPEC.md`
- Freshness dependency: `../01_spec/output/HUMAN_GATE.md`
- Freshness dependency: `../_shared/ARCHITECTURE_SNAPSHOT.md`
- Freshness dependency: `../_shared/QUALITY_GATES.md`
- Verifier library: `../_lib/verify-kit.mjs`
- Observed baseline: `../../app/chatgpt-auth.ts`
- Observed baseline: `../../app/crosssignal-auth.ts`
- Observed baseline: `../../db/workspaces.ts`
- Observed baseline: `../../db/flight-recorder-schema.ts`
- Observed baseline: `../../db/flight-recorder-contracts.ts`
- Observed baseline: `../../db/flight-recorder.ts`
- Observed baseline: `../../tests/fixtures/l04-authority-trace.fixture.mjs`
- Stage-owned surface: `CONTEXT.md`
- Stage-owned surface: `fixtures/l14-trace-resolution.fixture.mjs`
- Stage-owned surface: `verify.mjs`
- Stage-owned surface: `output/DATA_PACKAGE.md`
- Stage-owned surface: `output/VERIFY.md`
- Stage-owned surface: `output/HUMAN_GATE.md`

Do not load: later stages, `_archive/`, the whole repository, generated build
output, dependency folders, or any reference not named above.

## Process

1. Read and hash the accepted spec, gate, two shared references, verifier
   library, and exact observed baselines.
2. Encode the v1 request/response/error shapes and all twelve negative cases in
   one deterministic fixture with tenant-collision and corrupt-row variants.
3. Write the data package, executable fixture, deterministic verifier,
   verification record, and pending reviewer gate; then stop.

## Outputs

- `output/DATA_PACKAGE.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md`
- `fixtures/l14-trace-resolution.fixture.mjs`
- `verify.mjs`

## Verify

Run `node factory/02_data/verify.mjs`. Record input hashes, fixture hash,
output hashes, environment, command results, and `status: passed | failed` in
`VERIFY.md`.

The accepted Stage 01 outputs and two shared references are freshness
dependencies. Observed product baselines remain historical bindings.

## Human gate

The reviewer confirms the fixture is deterministic, represents all fourteen
acceptance criteria and twelve negative cases, keeps tenant collisions
indistinguishable from absence, and cannot widen the L04 redaction allowlist.
Record `accepted`, `changes-requested`, or `rejected` in `HUMAN_GATE.md`. Do not
begin Stage 03 without `accepted`.

## Failure routing

Correct the data package or return to the accepted specification. Never alter
the product implementation to hide a fixture or contract defect.
