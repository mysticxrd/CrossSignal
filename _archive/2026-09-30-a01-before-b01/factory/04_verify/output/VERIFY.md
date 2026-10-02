---
unit: a01-synthetic-revenue-investigation
stage: 04_verify
status: passed
verified_at: 2026-09-26T18:09:07.199Z
---

# Verification procedure and evidence

Environment: Windows, Node v22.15.0, existing authoritative checkout
C:/Users/hisha/ChatGPT/CrossSignal/work/crosssignal-phase1.
Verification procedure PASS; full AI hiring proof remains false. All outcome
records are SIMULATED. No paid calls, downloads or hosted migrations occurred.

## Commands and observed results

| Command/check | Exit | Result |
| --- | ---: | --- |
| node factory/03_build/verify.mjs before correction | 0 | Exact reviewed Build hashes and accepted gate verified |
| Deliberately rehashed nested approval actor probe | 0 | Revealed grader error: expected FAIL, observed PASS; before-fix-probe.json |
| node --experimental-strip-types --test tests/a01-release.test.mjs (initial harness run) | 1 | All mutation checks rejected correctly; expected-count assertion said 42 but actual authority has 40 fields; corrected that test count |
| node --experimental-strip-types --test tests/a01.test.mjs tests/a01-release.test.mjs | 0 | 18/18 pass; integrated-tests.tap |
| node --experimental-strip-types scripts/run-a01.mjs | 0 | Five variants, two fresh processes/stores each, matching artifacts; cold-replay.json |
| Independent regrade/copy/hash comparison against accepted Build | 0 | All five hashes unchanged; current grades PASS and fullAiHiringProof false |
| node --test tests/golden-case-replay.test.mjs tests/case-scenario-matrix.test.mjs tests/case-investigator.test.mjs tests/case-response.test.mjs tests/case-outcome.test.mjs tests/case-checkout.test.mjs tests/case-simulation-outcome.test.mjs | 0 | 19/19 existing regressions pass |
| node ../../node_modules/eslint/bin/eslint.js tests/evaluator/a01/grade.mjs tests/a01-release.test.mjs | 0 | Corrected/new code lint clean |
| PATH/default Ollama-manifest discovery | 0 | No checked runtime or manifest directory; model NOT_RUN, no downloads/calls |
| node factory/04_verify/verify.mjs | 0 | Current bindings, accepted gates, documented correction, grades and baseline preservation verified |
| node factory/status.mjs | 0 | Spec/Data/Build accepted and fresh; Verify pending; Ship never-run |
| git diff --check and preservation diff/status checks | 0 | No whitespace errors or changed/new preserved product/build files |

SQLite and type stripping emit installed-runtime experimental warnings. No
new application build is claimed: application/bundling sources and package
configuration retain the exact accepted Build bindings, whose build passed.
The stage verifier enforces that only the grader source differs from those
bindings and verifies its preserved old source hash. Full old npm test includes
historical factory scripts and is not represented as an A01 command.

## Additional final checks

The stage verifier validates all exact current input hashes, accepted/fresh
upstream gates, the one documented source correction, cold/current/Build
artifact hash equality, independent saved grades, test outcomes, all twelve
acceptance IDs and nine negative groups. It preserves model and human runtime
approval as NOT_RUN and full AI hiring proof as false. It opens no gate itself.
Final diff inspection and local review-link checks passed. The application,
worker, migrations, hosted code, lockfile and build/lint configuration have no
tracked changes against sealed baseline 58b2aa0 and no untracked additions;
the current stage verifier enforces those checks too.

## Material limits

The proof is deterministic and local. An actual operator approval and local
model evaluation remain unperformed. Stage 04 evidence does not erase these
gaps, prove real Mobile Safari behavior or establish a business outcome. A
surrogate grant is never labeled human approval. Existing data and LIVE remain
untouched. The pending human gate is distinct from runtime approval.

## Declared input hashes

| Input | SHA-256 |
| --- | --- |
| `factory/04_verify/CONTEXT.md` | `5a5434a1ca1879c96d66ff5baf771582742ea21122503e06ee40fff047070999` |
| `factory/04_verify/verify.mjs` | `2825d8fd4253a3749c549fcea319cf87a89dfd55d9b675c42607ac483aff5670` |
| `factory/04_verify/output/VERIFICATION_REPORT.md` | `46cc03175b24342a416cfe0427e2bfc667a90c41d9a3af155c08e3769bcfbc1b` |
