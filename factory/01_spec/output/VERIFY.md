---
type: stage-verification
stage: 01
status: passed
verified_at: 2026-08-22T15:53:35+05:30
environment: Windows; Node.js v22.15.0; vinext v1.0.0-beta.2; FIXTURE/TEST only
spec_sha256: 8a9a4c93f8fc2e8418d0d733e327d4d64d906261c0e65c82989ff6211a2de492
---

# Stage 01 verification - L08 authority correction

## Result

The proposed specification is bounded to L08, binds all ten declared repository
inputs, preserves the sealed release, chooses a database-atomic active-intent
invariant, and defines deterministic red/green interleaving evidence. No runtime,
schema, migration, worker, application, or provider code changed in Stage 01.

## Commands

| Command | Exit | Relevant result |
|---|---:|---|
| `node factory/01_spec/verify.mjs` | 0 | Passed 13 required sections, 8 acceptance criteria, 10 fresh input bindings, sealed-commit existence, secret scan, scope scan, and product-diff guard. |
| `node_modules/.bin/eslint.cmd . --ignore-pattern dist --ignore-pattern .next --ignore-pattern _archive` | 0 | No lint findings. |
| `node_modules/.bin/vinext.cmd build` | 0 | Five build phases completed; route `/` produced successfully. |
| `node_modules/.bin/tsx.cmd --test factory/_lib/factory-tools.test.mjs tests/rendered-html.test.mjs tests/icm-workspace.test.mjs tests/flight-recorder-data.test.mjs tests/flight-recorder-build.test.mjs tests/flight-recorder-release.test.mjs tests/flight-recorder-ship.test.mjs` | 0 | 41 tests passed; 0 failed, skipped, cancelled, or todo. |
| `git diff --check` | 0 | No whitespace errors. |
| `node factory/status.mjs` | 0 | Active stage remains `01_spec`; its verified gate is open and later stages cannot advance. |

The shell's user-level `npm` shim points to a missing global `npm-cli.js`, so the
named package scripts were executed through their exact installed binaries.
No dependency installation or network access was required. A pnpm fallback was
attempted once, stopped before installation, and its generated cache removed;
the original npm-managed `node_modules` packages were restored and tool versions
were checked before verification continued.

## Pre-gate corrections

The first full-suite run passed 39 of 41 tests, including all product, authority,
migration, release, and rendering cases. The only failures were two factory
self-tests coupled to the previously sealed live pipeline state. Stage 01
corrected only that harness behavior:

- `factory/_lib/factory-tools.test.mjs` now proves historical downstream drift
  in a synthetic two-stage factory instead of requiring the live factory to be
  complete.
- `tests/icm-workspace.test.mjs` now accepts a valid open/pending human gate and
  still enforces allowed gate/decision combinations.
- The fresh later-stage contracts put `_archive/` first in their `Do not load`
  clauses to preserve the existing cold-load contract.

These changes do not alter product behavior or relax factory acceptance. They
make the factory's own tests runnable during the active state they are meant to
govern.

## Negative checks

- A specification without `active_intent_id`, an in-batch raising assertion,
  deterministic barrier, migration abort behavior, rollback limits, or the L08
  scope boundary fails `verify.mjs`.
- A stale declared input hash fails verification.
- Any Stage 01 change under `app/`, `db/`, `drizzle/`, or `worker/` fails the
  product-diff guard.
- Any test change other than the exact workspace meta-test fails the scoped
  test-diff guard.
- Secret-like bearer, payment, GitHub, or private-key patterns fail the scan.

## Human review focus

Review the chosen linearization point, pointer transition rules, zero-row batch
sentinel, legacy backfill abort conditions, deterministic production-path test,
and rollback boundary. Verification opens this gate; it does not accept it.
