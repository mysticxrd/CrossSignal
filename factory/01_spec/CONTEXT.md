---
type: stage-contract
stage: 01_spec
status: active
unit: supabase-postgres-authenticated-trace-resolution-parity
---

# 01_spec - bound the first Supabase persistence slice

One job: specify a reviewer-observable Supabase PostgreSQL replacement proof
for the authenticated tenant-scoped trace-resolution path without implementing
or cutting over runtime persistence.

## Inputs

- Freshness dependency: `../_shared/ARCHITECTURE_SNAPSHOT.md`
- Freshness dependency: `../_shared/QUALITY_GATES.md`
- Verifier library: `../_lib/verify-kit.mjs`
- Observed baseline: `../../package.json`
- Observed baseline: `../../drizzle.config.ts`
- Observed baseline: `../../vite.config.ts`
- Observed baseline: `../../worker/index.ts`
- Observed baseline: `../../db/index.ts`
- Observed baseline: `../../db/migrations.ts`
- Observed baseline: `../../db/schema.ts`
- Observed baseline: `../../db/flight-recorder-schema.ts`
- Observed baseline: `../../db/trace-resolution.ts`
- Observed baseline: `../../drizzle/`
- Observed baseline: `../../tests/flight-recorder-build.test.mjs`
- Observed baseline: `../../tests/flight-recorder-data.test.mjs`
- Stage-owned surface: `CONTEXT.md`
- Stage-owned surface: `verify.mjs`
- Stage-owned surface: `output/SPEC.md`
- Stage-owned surface: `output/VERIFY.md`
- Stage-owned surface: `output/HUMAN_GATE.md`

Do not load: later stages, `_archive/`, the whole repository, generated build
output, dependency folders, environment secret values, or any reference not
named above.

## Process

1. Read and hash the two shared references and exact observed baselines.
2. Specify the first PostgreSQL parity slice, security boundary, migration and
   rollback rules, observable acceptance criteria, and explicit exclusions.
3. Preserve the accepted D1 path until local and hosted TEST evidence proves
   the Supabase slice; prohibit silent fallback and dual writes.
4. Write the spec, deterministic verifier, verification record, and pending
   reviewer gate; then stop.

## Outputs

- `output/SPEC.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md`
- `verify.mjs`

## Verify

Run `node factory/01_spec/verify.mjs`. Record input hashes, output hashes,
environment, command results, negative checks, and `status: passed | failed`
in `output/VERIFY.md`.

Only the contract and two shared references are freshness dependencies.
Observed product baselines are historical bindings and may be superseded by
later accepted stages.

## Human gate

The reviewer confirms that the first Supabase slice is bounded, PostgreSQL
constraints preserve audit and authority invariants, tenant access fails
closed, rollback is explicit, and every claim has an observable acceptance
criterion. Record `accepted`, `changes-requested`, or `rejected`. Do not begin
Stage 02 without `accepted`.

## Failure routing

Correct this specification or an upstream shared reference. Never implement a
later-stage workaround for an ambiguous migration, security, or rollback rule.
