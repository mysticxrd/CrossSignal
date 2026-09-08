---
type: stage-contract
stage: 04_verify
unit: authenticated-tenant-scoped-redacted-ordered-trace-resolution-endpoint
status: active
truth_mode: FIXTURE
---

# 04_verify - turn the working L14 slice into release-grade evidence

One job: independently verify the complete authenticated, tenant-scoped,
redacted, ordered trace-resolution promise and resolve every accepted Stage 03
acceptance and negative case with reproducible local evidence.

## Inputs

- Freshness dependency: `../03_build/output/BUILD_EVIDENCE.md`
- Freshness dependency: `../03_build/output/HUMAN_GATE.md`
- Freshness dependency: `../_shared/ARCHITECTURE_SNAPSHOT.md`
- Freshness dependency: `../_shared/QUALITY_GATES.md`
- Verification helper: `../_lib/verify-kit.mjs`
- Observed baseline: `../../package.json`
- Observed baseline: `../../app/crosssignal-auth.ts`
- Observed baseline: `../../app/trace-resolution.ts`
- Observed baseline: `../../app/api/workspaces/[workspaceId]/traces/[traceId]/route.ts`
- Observed baseline: `../../db/trace-resolution.ts`
- Observed baseline: `../../tests/flight-recorder-build.test.mjs`
- Observed baseline: `../02_data/fixtures/l14-trace-resolution.fixture.mjs`
- Stage-owned surface: `verify.mjs` and `output/`

Do not load: later stages, `_archive/`, the whole repository, generated build
output, dependency source, environment secret values, or any reference not
named above. Stage 04 does not change durable product code.

## Process

1. Read and hash every declared input by role.
2. Infer and record the complete flow: authenticated request -> tenant-bound
   membership/trace/event reads -> L04 projection -> stable redacted response.
3. Inspect each boundary and independently execute the accepted success,
   failure, integrity, isolation, secrecy, and read-only cases.
4. Run focused tests, lint, production build, the Stage 04 verifier, and diff
   inspection. Stop on the first broken boundary and route correction upstream.
5. Write release-grade evidence with an explicit `FIXTURE` truth label, then
   open the human gate and stop.

## Outputs

- `output/VERIFICATION_REPORT.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md`

## Verify

The verification report must resolve `AC-L14-01` through `AC-L14-14` and
`NEG-L14-01` through `NEG-L14-12`, bind the exact route-to-data-to-response
surfaces, show `28` pending and `49` completed ordered events, exercise all
five corruptions through the real L04 projector, prove byte-identical
non-disclosing `404` responses, prove stable `400`/`401`/`409`/`500` envelopes,
and prove repeated reads do not mutate durable counts.

Record exact command, timestamp, Windows/Node environment, exit code, and
relevant output. Lint, focused tests, production build, verifier, and
`git diff --check` must pass. A local fixture-backed result is not a deployed or
live-integration claim.

## Human gate

The reviewer inspects the verification report and verification record, records
their hashes, and chooses `accepted`, `changes-requested`, or `rejected`.
Verification opens this gate but never accepts it. Do not begin Stage 05 without
an accepted Stage 04 gate.

## Failure routing

Correct Stage 04 evidence or route a real product defect back to Stage 03. Do
not patch Stage 05 to hide an earlier defect.
