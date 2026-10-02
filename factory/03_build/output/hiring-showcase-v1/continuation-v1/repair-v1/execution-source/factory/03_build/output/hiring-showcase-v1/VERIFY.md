---
type: additive-preparation-verification
unit: b01-api-behavioral-benchmark
stage: 03_build
amendment: b01-hiring-showcase-v1
status: passed-offline-preparation-only
scope_decision: pending
proposed_evaluation: NOT_RUN
model_requests_this_pass: 0
runtime_effects_this_pass: 0
complete_build: false
---

# Hiring-showcase preparation evidence

This packet prepares an inspectable hiring direction and a read-only saved-Case
projection. It does not accept the proposed schedule or complete the original
Build. No original file, gate, accepted artifact or evidence store was changed.

## Current verified state

- Product: codex/phase3-decision-ux, HEAD
  43d42d255bd22cb227e3410dda31ffb8437f6624.
- Outer: codex/supabase-migration, HEAD
  ca44f2eb180ed2d7d1fba1b606208a3294d4830d.
- Spec/Data accepted and fresh; Stage 03 in progress with blocked/pending gate.
  Stage 04/05 never run; release unsealed. See FINAL_STATE_OBSERVATION.json.
- Original Build input hashes and existing Build/VERIFY gate bindings remain
  valid. Freshness is not full acceptance or request authorization.

## Executed checks

- Eight packet tests passed in SHOWCASE_TESTS_ADDENDUM.json: fresh draft scopes
  and public-fact equality; no dispatch; cold read-only reload; foreign identity,
  source/manifest substitution and corrupted-copy history rejection; escaped
  answer/evidence strings; no fabricated answer after failure; CLI execution
  refusal; exact static-export/data equality and correct frozen revenue labels.
  The earlier seven-test receipt remains preserved.
- All 57 existing benchmark tests passed in BENCHMARK_REGRESSIONS.json. These
  use offline fixtures, actual restricted-process probes and mocked transport.
  They cover private/evaluator/history/credential/write/process denials,
  injection/scope/cutoff/tool arguments, complete context admission, reasoning
  accounting, shrinking cumulative output limits, attempts/turns, abortable HTTP
  and body timeouts, concurrency, retries, immutable failure and interruption.
  They establish host behavior, not successful real-provider generation.
- Affected-file lint passed for inspection.mjs, prepare.mjs, tests.mjs and
  verify-preparation.mjs. See AFFECTED_LINT_FINAL.json and exact source hashes.
- git diff --check passed in both repositories; DIFF_CHECKS.json retains
  line-ending notices without converting any file.
- prepare.mjs produced a proposal-only 15-row plan, two readable existing Case
  exports, HTML projection and report. --replay reopened the same terminal
  records read-only. See PREPARATION_EVIDENCE.json and RELOAD_EVIDENCE.json.
  Snapshot SHA-256:
  d0b79469c8fb61ac705da46f103a06d419a350034ae6bef92d9d4a8e85db148c.
  SQLite hashes:
  95c998a4f3bc499768d3dd402a54cdba0f0753f31c1fface57587334de827ad8 and
  462c4e344e1d4652e9bc13c421309ae074abeff9614050e026004e374f3e5c43.
  No database write, model call, retry, recovery dispatch or effect occurred.
- The unaccepted HTML draft's revenue labels were corrected to the two frozen
  received-revenue intervals; affected segment and absent claims/alternatives
  are visible. PRESENTATION_REVIEW.json and draft-history/index.initial.html
  preserve the initial projection. Original observations and results are unchanged.
- verify-preparation.mjs passed for this additive pass. PRESERVATION_CHECK.json
  records unchanged raw bytes for all 3500 preexisting outer files and 1951
  product files, existing directories/links/status entries, branches/HEAD/index;
  all seven accepted Spec/Data hashes and 51 original Stage 03 input bindings.
  All additions are confined to this packet. It includes 118 A01 factory files
  and all 572 currently stored A01 files, plus original benchmark stores,
  databases/history, fixtures, evaluators, migrations and excluded trial receipt.
- INPUT_BINDINGS.json binds 70 finite current input files, including original
  accepted gates, public observations, runner, UI, preserved evidence and existing
  dependencies. No private truth/rubric content enters investigation preparation.

## Existing checks and limitations kept visible

Application implementation and dependencies were unchanged. This pass did not
rebuild the product or invoke its packaging cleanup hook. Preserved prior
APPLICATION_BUILD_ADDENDUM.json records a successful build in an additive input
snapshot using existing dependencies; this is prior evidence, not a new build.
Prior A01/product regressions remain preserved. Full-project lint still has four
recorded existing errors in db/case-investigator.mjs and the private evaluator's
grade-golden-case.mjs. They were not edited to make this packet pass.

The prior runner's strict outer raw-index check remains blocked by the earlier
observed byte difference. Logical indexed content equals HEAD and the staged
diff was empty, but the writer/cause is unknown. Original manifests/baselines
and the raw observation are preserved. RECONCILIATION_ADDENDUM.json records that
qualification and the existing seven documentation edits; this new baseline
does not erase or waive the original failed assertion. The original Stage 03
verifier has not become a full pass.

Current official sources still list gemini-3.5-flash-lite and Free standard
input/output. PROVIDER_COMPATIBILITY.md separates that support from the unresolved
generateContent HTTP 400 and actual-generation limit compatibility. No key value
was printed, logged or copied into the packet. No new provider request was made.

## Evaluation and review boundary

The proposed 15-record study is NOT_RUN. The retained original run contains one
rules finding and one failed single-shot request, zero valid Gemini findings,
and no tool-using finding or blinded adjudication. No broad accuracy, measured
improvement, runtime intervention or business recovery claim is made. The viewer
is an offline projection, not an integration into the authenticated runtime UI.

The exact next review is b01-hiring-showcase-v1, bound in this packet's HUMAN_GATE.
Accept/change/reject its initial schedule and deferrals; retain every original
limit and isolation/data/authority safeguard. Even acceptance does not repair
HTTP 400, waive preservation, authorize paid requests, accept the original Stage
03 Build, advance later stages, commit or seal. The original 35-record runner
and consumed execution claim remain untouched.

Stage rule: "A person reviews exact Build/VERIFY hashes. Behavioral losses are
valid results; missing model/demo evidence stays NOT_RUN. Verify stage cannot
begin without acceptance." ([Current contract](../../CONTEXT.md))
