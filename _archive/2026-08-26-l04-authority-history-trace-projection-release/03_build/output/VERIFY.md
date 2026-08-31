---
type: stage-verification
stage: 03_build
unit: append-only-authority-control-history-and-trace-projection-completeness
status: passed
verified_at: 2026-08-25T14:56:07+05:30
environment: Windows; Node 22+; node:sqlite; vinext production build
---

# Stage 03 verification

## Result

Passed. The governed L04 product surface implements canonical append-only
workspace authority history, exact effect binding, complete subject history,
and a complete redacted ordered snapshot/UI projection without entering L14.

## Commands

| Command | Exit | Summary |
|---|---:|---|
| `node node_modules/tsx/dist/cli.mjs --test tests/flight-recorder-data.test.mjs tests/flight-recorder-build.test.mjs` | 0 | 63 tests passed; L04 plus L08/L06 regression coverage green |
| `node node_modules/eslint/bin/eslint.js app/CrossSignalApp.tsx app/flight-recorder-types.ts db/flight-recorder-schema.ts db/flight-recorder-contracts.ts db/flight-recorder-graph.ts db/flight-recorder.ts db/migrations.ts tests/flight-recorder-data.test.mjs tests/flight-recorder-build.test.mjs` | 0 | No lint findings |
| `node node_modules/vinext/dist/cli.js build` | 0 | Five build environments and `/` dynamic route completed |
| `node factory/03_build/verify.mjs` | 0 | Inputs, accepted gate, fixture parity, schema/metadata, guards, projection/redaction, scope, tests, lint, and build passed |

The first sandboxed production-build attempt was denied with Windows `EPERM`
when Vite followed the checked dependency junction to write `.vite-temp`. The
identical build was rerun with workspace permission and passed; no dependency or
source mutation was used to bypass the failure.

## Verified invariants

- Stage 02 gate is closed/accepted and its package/fixture hashes are unchanged.
- The durable fixture is byte-equivalent to accepted Stage 02 fixture truth.
- Both L04 tables, generated metadata, migration assertions, indexes, and all
  required append-only/exact-binding/runtime-boundary triggers exist.
- Runtime contains no legacy kill-switch SELECT/UPDATE authority path.
- Control and trace histories are resealed, gap-free, tenant-bound, and complete.
- Every projected field is closed; raw payload/idempotency/actor/recipient/body/
  provider/secret material remains server-side.
- Pause-wins and reservation-wins schedules preserve atomicity and exact proof.
- FIXTURE reset preserves workspace authority history.
- No route, endpoint, middleware, worker, provider, or graph-topology surface was
  added in Stage 03.

## Evidence hashes

The human gate binds the normalized SHA-256 of the final `BUILD_EVIDENCE.md` and
this `VERIFY.md`. Product hashes will be rebound by later governed stages after
the Stage 03 human decision.
