---
type: verification-record
stage: 04_verify
unit: fixture-runtime-source-of-truth-correction
status: passed
verified_at: 2026-08-25T00:14:56.3722702+05:30
environment: windows-node-v22.15.0
---

# Stage 04 verification record

## Commands and results

| Command | Exit | Result |
|---|---:|---|
| `node node_modules/tsx/dist/cli.mjs --test tests/flight-recorder-data.test.mjs tests/flight-recorder-build.test.mjs tests/flight-recorder-release.test.mjs` | 0 | 66 passed, 0 failed |
| `node node_modules/eslint/bin/eslint.js` over the eight bound outputs | 0 | no findings |
| deterministic dependency, authority-count, identity, label, and attack-ID scans | 0 | all expected counts and values matched |
| `git diff --check` | 0 | no whitespace errors |
| `npm run build` | 1 | environment launcher defect: global `npm-cli.js` missing |
| `node node_modules/vinext/dist/cli.js build` in sandbox | 1 | environment restriction: Vite temp write `EPERM` through junction |
| approved `node node_modules/vinext/dist/cli.js build` | 0 | five environments built; route `/`; build complete |
| `node factory/04_verify/verify.mjs` | 0 | all bound checks replayed successfully |

## Deterministic replay

`factory/04_verify/verify.mjs` binds six stage/upstream/helper inputs and eight
durable outputs, rechecks the accepted Stage 03 gate, runs the 66 durable tests,
focused lint, production build, source scans, and diff hygiene, then validates
the open or accepted human gate against this record and `PRIMARY.md`.

## Result

`status: passed`. Environmental launcher and sandbox failures were routed to
the already installed direct build entrypoint and approved write path; they are
not product failures and the final production build completed successfully.
