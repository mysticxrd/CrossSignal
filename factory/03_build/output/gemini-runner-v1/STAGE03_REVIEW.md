# Stage 03 review — Gemini runner prepared; generation blocked

Prepared October 2, 2026 in the authoritative product checkout:
`C:\Users\hisha\ChatGPT\CrossSignal\work\crosssignal-phase1`.
Product branch `codex/phase3-decision-ux`, HEAD
`43d42d255bd22cb227e3410dda31ffb8437f6624`; outer branch
`codex/supabase-migration`, HEAD
`ca44f2eb180ed2d7d1fba1b606208a3294d4830d`. Both retain their existing
uncommitted work. The checkout is unsealed. Stage 01 and Stage 02 remain
accepted/fresh; Stage 03 remains incomplete and its human gate blocked/pending.

The missing runner, restricted worker, request deadlines, token ledger and
durable recorder are implemented and verified offline. The first authorized
scored generation returned HTTP 400. The batch stopped after one rules artifact
and that failed single-shot artifact. No generation retry, replacement model,
standalone smoke test, manual-chat substitute or paid fallback was made.
No model finding, generation usage or model revision was returned. Full Build
acceptance and behavioral accuracy are not established.

## Implementation and accepted limits

The selected model remains **gemini-3.5-flash-lite**, with the original accepted
Spec/Data limits. `gemini-config.mjs`, the accepted task/common definitions,
original eager bodies and public/private Data package were preserved. The
generic provider paths remain disabled; only the verified host benchmark path
was permitted. Caller flags cannot authorize that path.

| Requirement | Implementation and observed evidence |
| --- | --- |
| Fresh synthetic-only investigation | Opaque fresh workspace/Case/run/actor identities for each replicate; worker gets only scoped synthetic observations, task/schema and current-run bounded query results. No private truth, rubric, previous answers, development chat or evaluator modules enter model requests. |
| Restricted worker | Fresh Node permission-restricted process for preparation, parsing and queries; exact ten-source read allowlist; no credentials, file writes or child-process grant. Actual denial probes cover private/evaluator/history/credential paths. No model code is evaluated and no network/file/effect tool is exposed. Node permissions are not a general same-user OS/network sandbox. |
| 8192 combined context tokens | Exact complete GenerateContentRequest count and a second count of its entire canonical serialized body; reserve max(counts)+256 framing tokens+next output cap. No byte-based authorization, truncation or history substitution. All ten initial method/Case contexts were actually counted; largest full input bound 2593, plus 1024 output = 3617. Accumulated tool contexts are counted again before every request; only offline fixtures exercised that loop. |
| 1024 output including reasoning | Hard wire maxOutputTokens, MINIMAL thinking, includeThoughts=false; explicit candidates+thoughts accounting. Missing/inconsistent usage, truncation, native parts or an overrun is a retained failure. Provider documentation supports the cutoff; the HTTP 400 run supplied no usage, so actual generation-path enforcement remains unverified. |
| 6144 cumulative generated tokens | Durable leases and shrinking next wire cap; known usage is counted once. Unknown post-dispatch usage terminates without a budget reset or replay. The failed run records generatedTokens=null; its known cumulative counter of zero does not mean zero server generation. |
| 12 turns; one single-shot call | Host generation admission, separate token-count calls, no repair generation. |
| 10 tool attempts including invalid | Persist query intents and validation denials; at most ten execute. The eleventh is recorded as budget-denied, without tool execution. |
| 50 rows; 160 query characters | Original schemas enforce paging, argument length, time, scope and cursors inside the worker. Native provider capabilities are refused. |
| 180s request; 900s investigation | Monotonic deadline covers counts, worker phases and each generation. HTTP and bounded streaming race abort timers even if the transport ignores cancellation. A post-dispatch timeout remains indeterminate and is not replayed. |
| Concurrency one; retries zero | Transport busy guard, sequential schedule and immutable execution claim. No second launcher or forgotten-budget resume. |
| Durable results | New benchmark-only SQLite stores with scoped foreign keys, atomic FULL-synchronous transactions, append-only triggers and evidence/timeline hash validation. Dispatch is committed before HTTP. Result JSON and terminal history agree; the two retained databases were independently checked read-only. |
| Free allowance only | Direct owner confirmation of the associated Free-tier project, disabled billing and sufficient quota is retained as an account attestation. No separate billing API proof is claimed. Only the host child reads Windows User GEMINI_API_KEY in memory; the key value is absent from printed/logged/persisted data and from the worker. No purchase, paid route or fallback. |

Sources checked this turn: [selected stable model](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite),
[deprecations](https://ai.google.dev/gemini-api/docs/deprecations),
[thinking and output cutoff](https://ai.google.dev/gemini-api/docs/generate-content/thinking),
[generation REST contract](https://ai.google.dev/api/generate-content),
[complete request token counting](https://ai.google.dev/api/tokens),
[Free-tier pricing](https://ai.google.dev/gemini-api/docs/pricing).
The metadata endpoint also returned the exact selected model, input limit
1048576 and output limit 65536. Metadata and token counting do not establish
generation-route/schema compatibility.

## Actual benchmark attempt

Frozen session: `outputs/b01/gemini-runner-v1/session-a629b14640c9c81c/`.

| Recorded item | Result |
| --- | --- |
| Metadata GET | 1; selected model matched |
| Token-count requests | 22: two counts for each of ten scheduled initial contexts, plus two for the first scored investigation |
| Generation dispatch | 1; HTTP 400, operation generateContent |
| Rules artifact | r_d564012e62fd; completed; not yet adjudicated |
| Single-shot artifact | r_05af95690c5e; terminal indeterminate_usage; failureReason http_failure; finding/modelVersion/usage unavailable |
| Automatic retries / standalone smoke generation / paid fallback | 0 / 0 / false |
| Runtime intervention / deployment / LIVE changes | NOT_RUN / NOT_RUN / none |
| Complete initial comparison | 2 of 35 retained artifacts; incomplete |
| Changed-investigator experiment | 15 artifacts NOT_RUN; no measured change preregistered |
| Blinded human adjudication | NOT_RUN; pending human review |

`MANIFEST.json` freezes configuration, original data/rubric hashes, source hashes
and all 35 initial scopes before scoring. The rubric hash is host bookkeeping;
its content is never given to the investigator. `PROVIDER_READINESS.json`,
`SUMMARY.json`, `BLOCKER.json` and each new Case database/RESULT.json retain
the actual outcome. The failure timestamp is 2026-10-02T08:35:55.115Z.
The non-2xx body was intentionally discarded by that transport, so the exact
parameter-level rejection cause cannot be recovered from this run. No diagnostic
replay was made. Usage and account charge details are unavailable; zero billed
usage is not inferred from a rejection or from the ledger's known-token counter.

`EXECUTION_SOURCE_SNAPSHOT.json` and `execution-source/` preserve all 35 exact
raw source/input files bound by the pre-call proof. `OFFLINE_VERIFICATION_FINAL.json`
remains immutable and matches those executing bytes. Subsequent offline edits
add one HTTP-rejection regression test, validate the recorded databases read-only,
and make an incomplete CLI batch return exit 2. The original executing CLI
returned exit 0 despite its explicit incomplete summary; that defect and execution
source are preserved. Current source drift deliberately blocks the old online
proof; `EXECUTION_CLAIM.json` also prevents another launch. The post-run proof
is a separate record and is not a new network authorization.

## Checks and retained failures

| Check | Actual result and receipt |
| --- | --- |
| Benchmark/protocol/runner suites | 57 tests passed; POST_RUN_VERIFICATION.json retains command, UTC times, TAP, environment and affected lint/diff results. The pre-call 56-test proof is preserved separately. |
| Prior product suites | 28 passed; PRODUCT_REGRESSIONS.json. Includes golden replay, investigator, response, decision, checkout, outcome and simulation contracts. |
| A01 suites and fresh replay | 18 passed and all five fixture replay mechanics PASS; A01_REGRESSIONS.json. Test-only compatibility routes five historical reads to the preserved A01 archive. Original tests, evaluator and fixtures are unchanged. Fixture surrogate authority is not actual human approval or a runtime demo. |
| Accepted Data verifier | 13 checks and 7 negative tests; 22 bindings and 934 protected historical files checked without drift. Accepted Spec/Data freshness passed. |
| Affected lint and both Git diff --check | Passed. |
| Full-project lint | Failed with four pre-existing errors: unused _contentHash/_truthMode at db/case-investigator.mjs:33 and two unnecessary escapes at tests/evaluator/grade-golden-case.mjs:208. Those unrelated/protected files were preserved. APPLICATION_LINT.json retains exact output. |
| Application build | Passed with existing dependencies in a fresh build-input snapshot; APPLICATION_BUILD_ADDENDUM.json. The first snapshot omitted one existing shared checkout module and failed; APPLICATION_BUILD.json preserves that failure. The additive second snapshot includes it. Active dist/.vinext were preserved because the packaging hook mutates generated files. No repository clone/init or download/install. |
| Initial new runner test | One failure among the first 21 tests is preserved in INITIAL_RUNNER_TESTS.tap. Worker environment stripping was corrected; later suites passed. |

The whole-project lint failure and incomplete model/experiment/demo evidence
remain full Build blockers. Passing offline checks does not open or accept that
gate. The initial complete offline verifier returned exit 2 for incomplete Build
(FINAL_STAGE_CHECK.json). The later strict check returns exit 1 because outer
index bytes changed (FINAL_STAGE_CHECK_ADDENDUM.json). Tests and affected lint
passed before that assertion; no current complete preservation pass is claimed.

## Preservation and additive documentation reconciliation

The original `gemini-resume/PRESERVATION_BEFORE.json` is unchanged. New
`PRESERVATION_BEFORE.json` records the actual current bytes before this turn.
`RECONCILIATION.json` accounts for seven already-existing documentation entries
against the older manifest, with exact old/current hashes and retained current
copies. They are outer README, cleanup CHECKS/ENTRY_ROUTER_PROPOSAL/MANIFEST,
the additive October 2 recheck receipt, and product CONTEXT/README. Neither
baseline was replaced and these documents were not edited again.

All 3500 original outer files and original outer directories/junctions remain.
All 1394 original product files remain; only the six enumerated Stage 03/budget
files may change, and their previous raw bytes are in `prior-current/`.
New code and evidence are confined to the declared runner/test/stage packet
and new benchmark, fixture-test/replay and build-check outputs. Branches, HEADs and unrelated uncommitted status remain. The product Git
index is byte-identical; the later outer-index byte discrepancy is recorded below. The existing
broken product node_modules junction remains; execution uses existing root
dependencies and scratch-only junctions.

Accepted Spec/Data artifacts and hashes, 118 A01 factory archive files, 477
original A01 stored files, runtime databases, approval state, append-only history,
migrations, fixtures, evaluator files and the excluded trial receipt are
preserved. A01/SIWC accepted evidence was not regenerated. The accepted SIWC
amendment and its pending Data compatibility decision remain historical and
unselected. Build inputs build/sites-vite-plugin.ts and .openai/hosting.json
remain unchanged.

## Remaining review decisions

1. Review this Stage 03 preparation and the retained failed scored artifact.
   Generation compatibility is unclear after HTTP 400; all further model
   requests stop. Do not switch models, weaken token limits or replay that run.
2. Next development step: compare the frozen generation body with the official
   model/REST schema and prepare bounded, secret-free structured error capture
   offline before any fresh scored attempt. The existing error cannot be
   retroactively recovered. Reverify isolation, every original limit, unchanged
   Free-tier conditions and the exact revised sources before any new dispatch.
   A demonstrated unsupported required limit needs an exact contract-change
   proposal and human acceptance before scoring; none is silently substituted.
3. Full Build additionally needs remaining initial artifacts, one separately
   preregistered/measured investigator change, blinded adjudication and resolution
   of the existing lint blockers. Current Stage 03 also requires one separately
   human-approved exact SIMULATED intervention; present instructions prohibit
   it, so it remains NOT_RUN. No factory approval supplies that authority.

Exact current rule, [Stage 03 CONTEXT.md](../../CONTEXT.md):
"A person reviews exact Build/VERIFY hashes. Behavioral losses are valid results;
missing model/demo evidence stays NOT_RUN. Verify stage cannot begin without
acceptance." HUMAN_GATE.md remains blocked/pending. No later-stage work was
started and no human decision was inferred.

## Additive outer-index observation — strict check blocked

After the successful final check, the outer raw Git index changed from
33cc89df4b1ea6588ca2e40a280c4403cffffba91f138e1a5d70186fd5e508c3 to
f2b71d8c898fa92339eb453c6dac09052ec0a824d017f9466a85789157f02fef.
Its observed modification time was 2026-10-02T09:04:17.554Z. The writer/cause
is unconfirmed; no task command staged, reset or replaced an index.

Read-only ls-files --stage equals ls-tree -r HEAD exactly for both repositories;
git diff --cached --raw is empty. The outer status is identical to the last
successful check and all 3500 old outer file bytes remain unchanged. Product
HEAD/branch/index and all old content outside the six authorized files remain
unchanged. This excludes a staged-content change; it does not prove why the raw
index metadata changed. Neither old baseline was altered or an exception silently
accepted. OUTER_INDEX_OBSERVATION.bin retains the observed current bytes.

INDEX_OBSERVATION.json raw SHA-256: ce8b756d80f8ec6dcdc3c8a77058f89a276a81e2449258e63386c5b0fb3d7ae7.
The strict raw-index preservation assertion remains in force; the latest
FINAL_STAGE_CHECK_ADDENDUM.json reports exit 1 at that assertion. Review this
additive observation or investigate the writer before claiming a complete strict
preservation pass. No restoration/reset is proposed. RESULT_SOURCE_CHECK.json
separately passes exact frozen public-source/manifest/SQLite-history equality
without modifying either result database or making any request. Model requests
and the Stage 03 human gate remain blocked.
