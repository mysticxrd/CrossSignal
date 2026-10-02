---
type: verification
unit: b01-api-behavioral-benchmark
stage: 03_build
status: blocked
offline_preflight: tests-passed-strict-preservation-blocked
model_evaluation: BLOCKED_AFTER_FIRST_SCORED_ATTEMPT
human_runtime_approval: NOT_RUN
---

# Stage 03 verification — incomplete Build

Selected gemini-3.5-flash-lite with the original accepted Spec/Data limits.
57 offline benchmark/protocol/runner tests pass, covering actual worker denial
probes, leakage, scoped query validation, hard context admission, output/reasoning
accounting, cumulative/turn/tool caps, abortable HTTP/stream deadlines, unknown
usage, durable failure recording, tamper detection, interruption and no replay.
Affected lint and both Git diff checks pass. Exact command arrays, UTC times,
Node/platform, TAP and output are retained in gemini-runner-v1/POST_RUN_VERIFICATION.json.

28 prior product tests pass (PRODUCT_REGRESSIONS.json). A01: 18 fixture tests
and all five fresh replay mechanics pass (A01_REGRESSIONS.json). Test-only
historical-path compatibility preserves original tests/evaluator/archive.
Fixture surrogate effects are not an actual human-approved intervention.
Original accepted Spec/Data remain accepted/fresh; Data's 13 checks, 7 negative
tests, 22 bindings and 934 historical-file comparisons passed without drift.

Application build passed in the second additive build-input snapshot
(APPLICATION_BUILD_ADDENDUM.json, exact command/UTC times/full output).
The first missing-shared-module build failure remains in APPLICATION_BUILD.json.
Whole-project lint remains failed: four pre-existing errors in the preserved
case investigator and evaluator; APPLICATION_LINT.json contains exact output.
No full Build pass is claimed.

The already-authorized Free-tier benchmark actually made one metadata GET,
22 countTokens requests and one scored generateContent dispatch. Selected-model
metadata and all ten initial context counts passed; maximum full input bound
2593 plus 1024 output fits the original 8192 ceiling. Generation returned
HTTP 400. Only two of 35 initial artifacts are retained; the failed model
artifact is indeterminate_usage/http_failure with no finding/revision/usage.
No parameter-level error body was retained; no cause is invented and no retry
or smoke request occurred. The 15-run measured experiment and blinded
adjudication remain NOT_RUN. Additional generation stays blocked.

Actual records and both new SQLite databases were checked read-only against
the frozen manifest and timeline/evidence hashes. Executing source bytes and
the immutable pre-call 56-test proof are preserved in EXECUTION_SOURCE_SNAPSHOT.json
and execution-source/. Post-run offline changes deliberately invalidate that
online proof; the retained execution claim prevents another launch. Post-run
verification commands make zero model requests; the actual scored attempt
is separately counted as one dispatch and must not be omitted.

Additive reconciliation covers seven documentation entries without replacing
either original manifest. All original outer files are unchanged; six explicitly
authorized product Stage 03/budget files have retained prior raw copies.
Accepted evidence, databases/history, fixtures/evaluator, excluded trial and
unrelated work remain intact. No install/download, paid fallback, deployment,
LIVE change, runtime intervention, commit, seal or human-gate advance.

Complete Build additionally requires resolving generation compatibility and
the existing lint failures, all required comparison/experiment/adjudication
evidence and separately approved exact SIMULATED runtime evidence. Current
instructions prohibit that intervention. Review STAGE03_REVIEW.md for details.

The initial node factory/03_build/verify.mjs passed offline checks and returned
exit 2 for incomplete Build (FINAL_STAGE_CHECK.json). A later run returned exit 1
at the strict outer-index byte assertion (FINAL_STAGE_CHECK_ADDENDUM.json).
INDEX_OBSERVATION.json and a retained binary snapshot disclose old/new hashes,
unchanged outer file/status/HEAD/branch and exact logical index equality with HEAD;
no staged diff exists. The raw-index writer/cause is unconfirmed. The product
index is unchanged. No preservation exception, reset or baseline replacement.
RESULT_SOURCE_CHECK.json independently passes frozen observable/manifest/store
equality read-only. This discrepancy needs review before a current complete
strict preservation pass; offline test/lint results remain retained.
HUMAN_GATE.md remains blocked/pending with current Build/VERIFY hashes.
Stage 03: "A person reviews exact Build/VERIFY hashes. Behavioral losses are
valid results; missing model/demo evidence stays NOT_RUN. Verify stage cannot
begin without acceptance." Stage 04 and later stages were not started.
