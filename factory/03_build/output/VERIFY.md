---
type: verification
stage: 03
status: passed
verified_at: 2026-08-23T01:05:42.2082437+05:30
unit: superseded-intent-authority-correction
finding: L08
---

# Stage 03 L08 verification

The accepted Data package is implemented and the original superseded-intent
race fails closed in both deterministic schedules. Verification opens the
Build gate; it does not accept it.

## Artifact bindings

Text hashes normalize CRLF to LF before SHA-256.

| Artifact | SHA-256 |
|---|---|
| `BUILD_EVIDENCE.md` | `09c0c113adbc67b0a3dced716a6637e2b44e27d042aba3aa0b97317c07d9d895` |
| `../verify.mjs` | `4a959cf71527cd3a4d6fa9b6a9f3e1d8b1fbfcdd6f4643581beebe8c48a4e7fd` |
| `../../../db/flight-recorder-schema.ts` | `b86b23ca9a079fb6b458a631e75e7371d1723677be3c23ba82d154a0c2297b11` |
| `../../../db/migrations.ts` | `259c0cd885daaf23bccb1bf3bfc46c278240c45d3291b045a999335f97cdd47d` |
| `../../../db/flight-recorder.ts` | `ab984e95650e30ff338ef8896a413267d5be6189709dd034060cf3eca31b1cc6` |
| `../../../drizzle/0006_l08_active_intent_authority.sql` | `a97ce8f9b2a6b595197981742f80b1c4089cf05d57834921b3855fa5d2f844c5` |
| `../../../drizzle/meta/0006_snapshot.json` | `ed1b70151519da162b465f3bc4c82de3a296b9b32d53855a001c1287d63c0bee` |
| `../../../tests/flight-recorder-build.test.mjs` | `98a7c9232b2aa96a6fddd92e605ec07f540326876ae9020e2775602729cc57a9` |

## Executable evidence

- The sealed 0005 red run exited `1` because the stale v1 grant produced
  `Missing expected exception` after v2 replacement.
- The same assertion passes with migration 0006.
- The real production operations run through manual promise barriers for edit
  wins and authorization wins; the losing batch leaves zero partial rows.
- Ten direct database attacks fail closed, including the zero-row compare-and-
  swap followed by its in-batch executing-event assertion.
- Five migration databases pass the accepted matrix. The invalid historical
  race rolls the schema change back and retains the old immutable trigger.
- Confirmed, failed, and indeterminate v1/v2 paths preserve one effect and no
  retry behavior.
- Static verification proves runtime authority lookup has no timestamp,
  `rowid`, `MAX`, or ordering inference.

## Command record

| Command | Exit | Relevant result |
|---|---:|---|
| Red: `node_modules/.bin/tsx.cmd --test tests/flight-recorder-build.test.mjs` on sealed 0005 behavior | `1` | Replacement committed; stale v1 grant was accepted (`Missing expected exception`). |
| `node factory/03_build/verify.mjs` | `0` | 2 schedules, 10 attacks, 5 migration cases, 7 Data tests, 15 Build tests; exact input hashes emitted. |
| `node_modules/.bin/tsx.cmd --test tests/flight-recorder-data.test.mjs` | `0` | 7 tests passed. |
| `node_modules/.bin/tsx.cmd --test tests/flight-recorder-build.test.mjs` | `0` | 15 tests passed, including five migration subtests. |
| `node node_modules/eslint/bin/eslint.js . --ignore-pattern dist --ignore-pattern .next --ignore-pattern _archive` | `0` | Exact repository lint scope passed. |
| `node_modules/.bin/vinext.cmd build` | `0` | All five build environments passed; dynamic `/` emitted and migration 0006 packaged. |
| `node_modules/.bin/tsx.cmd --test factory/_lib/factory-tools.test.mjs tests/rendered-html.test.mjs tests/icm-workspace.test.mjs tests/flight-recorder-data.test.mjs tests/flight-recorder-build.test.mjs tests/flight-recorder-release.test.mjs tests/flight-recorder-ship.test.mjs` | `0` | 50 tests passed, 0 failed. |
| `git diff --check` | `0` | No whitespace errors. |

## Acceptance mapping

| Criterion | Result |
|---|---|
| `AC-L08-01` | Red 0005 reproduction captured stale-v1 success. |
| `AC-L08-02` | Explicit head, predecessor edge, migration, exact lookup, and required-state guards implemented. |
| `AC-L08-03` | Edit-wins real v1 batch returns the named stale error with zero rejected writes; exact v2 succeeds once. |
| `AC-L08-04` | Authorization-wins rolls back both v2 rows and retains one v1 effect. |
| `AC-L08-05` | Confirmed v1/v2, failed v1, and indeterminate v2 paths complete once. |
| `AC-L08-06` | Ten attacks and zero-row projection assertion abort. |
| `AC-L08-07` | Five migration cases match the canonical matrix and generated metadata. |
| `AC-L08-08` | Build, lint, targeted tests, full tests, migration compatibility, and diff checks pass. Only L08 is claimed. |

## Gate state

Verification passed. Stage 03 is ready for human review. Stage 04 remains
unauthorized until the Build gate binds this verification and Build Evidence.
