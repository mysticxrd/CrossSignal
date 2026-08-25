---
type: stage-contract
stage: 01_spec
unit: append-only-authority-control-history-and-trace-projection-completeness
status: active
---

# 01_spec - bound the L04 authority-history correction

One job: turn the L04 finding into one reviewable specification for append-only
authority-control history and complete trace projection, without entering data,
schema, runtime, UI, or endpoint implementation.

## Inputs

- Freshness dependency: `../_shared/ARCHITECTURE_SNAPSHOT.md`
- Freshness dependency: `../_shared/QUALITY_GATES.md`
- Tooling dependency: `../_lib/verify-kit.mjs`
- Tooling dependency: `../_lib/factory-state.mjs`
- Observed baseline: `../../db/flight-recorder-schema.ts`
- Observed baseline: `../../db/flight-recorder-contracts.ts`
- Observed baseline: `../../db/flight-recorder.ts`
- Observed baseline: `../../db/flight-recorder-demo.ts`
- Observed baseline: `../../db/flight-recorder-graph.ts`
- Observed baseline: `../../app/flight-recorder-types.ts`
- Observed baseline: `../../app/CrossSignalApp.tsx`
- Observed baseline: `../../drizzle/0004_typical_omega_red.sql`
- Observed baseline: `../../drizzle/0005_flight_recorder_guards.sql`
- Observed baseline: `../../drizzle/0006_l08_active_intent_authority.sql`
- Observed baseline: `../../tests/flight-recorder-data.test.mjs`
- Observed baseline: `../../tests/flight-recorder-build.test.mjs`
- Stage-owned surface: `output/SPEC.md`
- Stage-owned surface: `output/VERIFY.md`
- Stage-owned surface: `output/HUMAN_GATE.md`
- Stage-owned surface: `verify.mjs`

Do not load: later stages, `_archive/`, the whole repository, the source vault,
or any product path not named above.

## Process

1. Read and hash the declared inputs by role.
2. Describe the current overwrite/projection gap using repository evidence.
3. Specify identities, ordering, supersession, projection completeness,
   tenant isolation, redaction boundaries, and observable negative cases.
4. Bound L04 away from L14 endpoint delivery and unrelated product work.
5. Write the specification and verification record, then stop.

## Outputs

- `output/SPEC.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md` - opened for reviewer decision

## Verify

Run `node factory/01_spec/verify.mjs`. It must fail closed on undeclared inputs,
missing or drifted hashes, ambiguous authority-history identity or ordering,
overwrite-compatible language, incomplete trace projection, absent tenant and
redaction constraints, missing negative cases, or scope leakage into L14.

Record the verifier command, timestamp, environment, exit code, and relevant
output in `output/VERIFY.md` with `status: passed`.

## Human gate

The reviewer edits `SPEC.md` if needed, records the reviewed specification and
verification hashes in `HUMAN_GATE.md`, and chooses `accepted`,
`changes-requested`, or `rejected`. Do not begin Stage 02 without `accepted`.

## Failure routing

Correct this specification or its declared inputs. Never patch a later stage to
hide an incomplete authority-history or trace-projection contract.
