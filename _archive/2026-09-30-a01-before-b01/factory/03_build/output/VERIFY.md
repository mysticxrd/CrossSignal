---
unit: a01-synthetic-revenue-investigation
stage: 03_build
status: passed
verified_at: 2026-09-26T17:57:48.577Z
---

# A01 Build verification

Environment: Windows; Node v22.15.0. Authoritative existing checkout:
C:/Users/hisha/ChatGPT/CrossSignal/work/crosssignal-phase1. Baseline 58b2aa0.
No paid calls or hosted migrations. All new outcome records are SIMULATED.

## Commands and observed results

| Command | Exit | Evidence |
| --- | ---: | --- |
| node factory/02_data/verify.mjs | 0 | Accepted Data artifact hashes and executable contracts pass |
| node --experimental-strip-types --test tests/a01.test.mjs | 0 | 14/14 integrated tests; a01-tests.tap |
| node --experimental-strip-types --test --test-name-pattern='independent grader' tests/a01.test.mjs | 0 | Focused rerun after tightening claim/citation rubric; grader-tamper-tests.tap |
| node --test tests/golden-case-replay.test.mjs tests/case-scenario-matrix.test.mjs tests/case-investigator.test.mjs tests/case-response.test.mjs tests/case-outcome.test.mjs tests/case-checkout.test.mjs tests/case-simulation-outcome.test.mjs | 0 | 19/19 preserved regressions; regression-tests.tap |
| node --experimental-strip-types scripts/run-a01.mjs | 0 | Five variants, two fresh processes/stores each; byte-identical artifact per pair; replay-run.json |
| node tests/evaluator/a01/grade.mjs <saved-artifact> <intervention> [limited] | 0 for all five | Latest rubric independently regraded each saved artifact; replay/*.grade.json and reports |
| node --experimental-strip-types scripts/a01-case.mjs prepare | 0 | Human preview saved with zero approvals/effects; preview/ artifacts |
| node ../../node_modules/eslint/bin/eslint.js db/a01 scripts/a01-world.mjs scripts/a01-case.mjs scripts/run-a01.mjs tests/a01.test.mjs tests/evaluator/a01/grade.mjs factory/03_build/verify.mjs | 0 | All new runtime, CLI, test, grader and factory verifier modules lint clean |
| node ../../node_modules/vinext/dist/cli.js build | 0 | Existing application build completes all five phases |
| git diff --name-only 58b2aa0 -- app worker drizzle supabase db/revenue-leak.mjs db/case-investigator.mjs db/flight-recorder-contracts.ts db/case-response.mjs db/case-outcome.mjs | 0 | Empty; old product and hosted surfaces unchanged |
| git diff --check | 0 | No whitespace errors |
| node factory/03_build/verify.mjs | 0 | 63 exact bindings, five current independent grades, replay hashes and pending gate hashes pass |
| node factory/status.mjs | 0 | Spec/Data complete and fresh; Build active with open gate; Verify/Ship never-run |

The first lint/build lookup used the nested node_modules path, which is absent.
The existing dependencies are installed at the authoritative parent repository;
using their explicit paths succeeded. No dependency installation or lockfile
change was needed. SQLite, type stripping and glob emitted experimental-feature
warnings; the application build also emitted plugin-timing notices.

The complete old npm test aggregate includes historical factory stages whose
artifacts were intentionally preserved in the archive. It was not represented
as an A01 verification command. The focused regressions above and unchanged
application build establish the scoped preservation claim.

## Deliberate failures and access boundary

Tests exercise exact approval mutations, foreign scope/time, missing grants,
old manual intent ID, stale nonce/actor, expiration, prior consumption, Global
Pause/unavailable control, duplicate execution and interrupted reservation.
A killed process exits 17 inside the SQLite transaction; reopening yields the
exact pre-reservation artifact, then resume produces one committed effect.
Later simulated regression appends reopening and keeps the old resolution.

The actual restricted runner denied six private reads plus writes/child-process
creation, while the environment sentinel was absent. Tool namespace/argument
checks reject evaluator reads and arbitrary paths. Failed calls consume the
persisted budget. Injection messages produce no approval or unauthorized effect.
Grader mutations include rehashed cause, recommendation, approval, outcome,
invented citation, real-but-irrelevant citation, observation count and an
undeclared material claim; all fail independent grading.

Preservation audit: 42/42 archived factory hashes match. Retained cache
SHA-256: 103e9d7a97f9a66c28586ffae6f8d81a90630d5cb2c537b23ed886a5e0e5ff01.
No saved trial receipt, TEST or LIVE data is changed. Existing exclusion and
Mobile Safari semantics remain regression-tested.

## Review and limits

The final factory verifier checks accepted/fresh upstream state, exact declared
bindings, gate hashes, all five saved artifacts against the independent grader,
repeatability hashes and zero approvals/effects in the human preview. It does
not record human acceptance. Its result is checked before handing off this
package; human review remains pending.

Mechanics PASS is separate from model NOT_RUN and human runtime approval NOT_RUN.
The local CLI is ready for exact operator approval; no actual approval was
inferred from stage acceptance. The fixed Node process is not an OS sandbox,
and the actor is local rather than remote-authenticated. No model-quality,
real payment, Mobile Safari device or business-outcome claim is made.

## Declared input hashes

| Input | SHA-256 |
| --- | --- |
| `factory/03_build/CONTEXT.md` | `ac359d97f61b2b1aa12498e373e921fe7f8e1452c56efe19db9ee7c6365f3774` |
| `factory/03_build/verify.mjs` | `e98ec1c6a06bd5dc5f196411f0c14203737d6c85466cb324492c1a5174adb211` |
| `factory/03_build/output/BUILD_EVIDENCE.md` | `bf6b679736e38e67a853415785510f4f3cfe4e3e7518d4b01d8e6bd1774680ea` |
