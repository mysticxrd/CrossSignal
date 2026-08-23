---
type: stage-contract
stage: 01
job: specify-superseded-intent-authority-correction
---

# 01_spec - define the authority correction

One job: turn the confirmed L08 edit/authorize race into one bounded, testable
correction specification without changing product code.

## Inputs

- Reference: `../_shared/ARCHITECTURE_SNAPSHOT.md`
- Reference: `../_shared/QUALITY_GATES.md`
- Working baseline: `../../db/flight-recorder.ts`,
  `../../db/flight-recorder-schema.ts`, `../../db/migrations.ts`
- Working baseline: `../../drizzle/`, `../../tests/`, `../../package.json`
- Factory verification baseline: `../_lib/factory-tools.test.mjs`
- Audit input: the L08 superseded-intent interleaving described by the owner
- Historical release binding: commit
  `7b07ff62b2c0de605c86b378a1b90639f4b90547`
- External during this stage only: Cloudflare D1 prepared-statement and batch
  documentation, and SQLite foreign-key documentation. Record URLs and
  retrieval date; use only primary sources.

Do not load: `_archive/`, later stages, dependency folders, generated build
output, or unrelated product surfaces.

## Process

1. Model the edit/authorize interleaving and the exact authority invariant.
2. Decide the atomic database condition and migration/backfill behavior.
3. Define deterministic concurrency and negative acceptance tests.
4. Bound compatibility, rollback, non-goals, and observable completion.
5. Write `SPEC.md`, verify it, and stop.

## Outputs

- `output/SPEC.md` - canonical correction specification for this run
- `output/VERIFY.md`
- `output/HUMAN_GATE.md`

## Verify

Fail on a check-then-act authorization design, an unbound active intent,
ambiguous migration behavior, a nondeterministic race test, unrelated audit
scope, or any proposal that rewrites the sealed release.

## Human gate

Accept only if the authority invariant, atomic enforcement point, migration
behavior, deterministic failing test, and scope boundary are explicit. Product
code must still be unchanged at this gate.

## Failure routing

Correct this specification. Do not begin Data or patch the runtime to hide a
specification gap.
