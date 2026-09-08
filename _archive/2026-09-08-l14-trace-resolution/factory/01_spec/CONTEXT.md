---
type: stage-contract
stage: 01_spec
status: active
unit: authenticated-tenant-scoped-redacted-ordered-trace-resolution-endpoint
---

# 01_spec - bound the L14 endpoint promise

One job: turn L14 into an accepted, evaluator-observable specification for one
read-only HTTP trace-resolution endpoint without implementing it.

## Inputs

- Freshness dependency: `../_shared/ARCHITECTURE_SNAPSHOT.md`
- Freshness dependency: `../_shared/QUALITY_GATES.md`
- Verifier library: `../_lib/verify-kit.mjs`
- Observed baseline: `../../package.json`
- Observed baseline: `../../app/crosssignal-auth.ts`
- Observed baseline: `../../app/page.tsx`
- Observed baseline: `../../db/flight-recorder-contracts.ts`
- Observed baseline: `../../db/flight-recorder.ts`
- Observed baseline: `../../tests/flight-recorder-build.test.mjs`
- Observed baseline: `../../tests/flight-recorder-data.test.mjs`
- Stage-owned surface: `CONTEXT.md`
- Stage-owned surface: `verify.mjs`
- Stage-owned surface: `output/SPEC.md`
- Stage-owned surface: `output/VERIFY.md`
- Stage-owned surface: `output/HUMAN_GATE.md`

Do not load: later stages, `_archive/`, the whole repository, generated build
output, dependency folders, or any reference not named above.

## Process

1. Read and hash the two shared references and exact observed baselines.
2. Specify one GET route, its authenticated tenant boundary, identifier rules,
   redacted ordered response, failure semantics, exclusions, and acceptance
   criteria.
3. Write the spec, deterministic stage verifier, verification record, and a
   pending reviewer gate; then stop.

## Outputs

- `output/SPEC.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md`
- `verify.mjs`

## Verify

Run `node factory/01_spec/verify.mjs`. Record input hashes, output hashes,
environment, command results, negative checks, and `status: passed | failed`
in `VERIFY.md`.

Only the contract and two shared references are freshness dependencies.
Observed product baselines are historical bindings and may be superseded by
later accepted stages.

## Human gate

The reviewer confirms the endpoint is exactly bounded, authentication and
tenant isolation fail closed, the response is both redacted and ordered, and
every observable result has an acceptance criterion. Record `accepted`,
`changes-requested`, or `rejected` in `HUMAN_GATE.md`. Do not begin Stage 02
without `accepted`.

## Failure routing

Correct this specification or an upstream shared reference. Never implement a
later-stage workaround for an ambiguous security or response contract.
