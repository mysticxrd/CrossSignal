---
type: offline-verification-addendum
unit: b01-api-behavioral-benchmark
stage: 03_build
status: passed-for-additive-offline-preparation-only
verified_at_utc: 2026-10-02T12:35:05.646Z
verification_receipt_raw_sha256: 87fc03eeb42a602495320ea9e9f188a09dfd4de79a14e28fadc0806784da00f0
scope_decision: accepted
original_stage03_gate: blocked-pending
actual_showcase_evaluation: NOT_RUN
model_requests: 0
runtime_effects: 0
---

# Stage 03 continuation evidence

Accepted scope: **b01-hiring-showcase-v1**, proposal SHA-256
a717d9aed1bdaeda5941b63aceffbf3e4f85f2cc3163ad3e1f4010f3f445cac2. The additive [human decision](HUMAN_GATE.md)
binds the original five reviewed files. It does not accept Build or qualify the
historical index discrepancy. The prepared schedule has 15 records, five per
method, with cyclic method order (position frequencies 2/2/1). All are NOT_RUN.

## Commands and observed results

- C:\Program Files\nodejs\node.exe --test factory/03_build/output/hiring-showcase-v1/continuation-v1/tests.mjs — 0, eight tests passed, zero failed;
  2026-10-02T11:01:08.476Z to 2026-10-02T11:01:10.211Z. Actual restricted preparations
  cover all ten model contexts. Tests exercise write-ahead hash binding, reasoning
  accounting, bounded HTTP errors, timeout/cancellation, secret denial and the
  guarded execution path. Mock provider responses are OFFLINE_FIXTURE and ungraded.
- C:\Program Files\nodejs\node.exe --test tests/benchmark.test.mjs tests/benchmark-subscription.test.mjs tests/benchmark-subscription-budget.test.mjs tests/benchmark-gemini-budget.test.mjs tests/benchmark-gemini-runner.test.mjs — 0, 57 existing benchmark
  tests passed, zero failed; 2026-10-02T10:58:12.801Z to 2026-10-02T10:58:22.758Z.
  The old core sources remained unchanged. Its captured run.mjs hash preceded
  the unused-import cleanup; the final eight-test receipt binds the final six
  continuation sources. No behavioral code changed in that cleanup.
- C:\Program Files\nodejs\node.exe C:/Users/hisha/ChatGPT/CrossSignal/node_modules/eslint/bin/eslint.js factory/03_build/output/hiring-showcase-v1/continuation-v1 — 0, no diagnostics;
  2026-10-02T12:34:17.158Z to 2026-10-02T12:34:25.530Z. This final receipt includes the
  new preservation verifier. The earlier unused-import lint failure remains
  recorded in LINT.json; the corrected LINT_FINAL.json is also preserved.
- run.mjs --prepare — exit zero, ten offline request snapshots and one 15-row
  schedule, no dispatch; see PREPARATION_COMMAND.json. Exclusive writes prevent
  overwrite. The --execute guard was tested to exit two before credentials,
  provider access or result-store creation; caller approval flags cannot enable it.
- verifyContinuation with read-only INPUT_BINDINGS and final-lint checks —
  passed; [VERIFY.json](VERIFY.json) contains actual command timestamps, receipts
  and counts. Node v22.15.0, Windows x64; existing dependencies
  only. Both repositories' git diff --check exited zero. Read-only Git commands
  set GIT_OPTIONAL_LOCKS=0. factory/status.mjs still selects 03_build.

The initial source lint issue was repaired before final verification. Existing
full-application lint failures remain recorded in the original runner packet;
this is not a full-project lint/Build pass. Existing application build evidence
is retained, not regenerated. No source/application change required another build.

## Preservation result

All **3500 outer + 1988 product = 5488** inventoried existing files are unchanged.
No existing directory, junction, Git status entry, branch, HEAD or current raw
index changed. New files are confined to continuation-v1. The product still has
its inherited uncommitted work and obsolete node_modules junction; no dependency
installation or junction repair was performed.

All 36 entries in the reviewed parent packet and its original manifest are
unchanged. The seven accepted Spec/Data/reference artifact hashes, all 70 parent
input bindings, all 51 original Stage 03 bindings and 18 continuation bindings
passed. Seven old/current documentation reconciliation pairs and their original
baseline remain exact. A01 archived factory and stored files, fixtures, evaluator
files, migrations, excluded trial receipt and unrelated work are included in the
unchanged-file inventory. No accepted evidence was regenerated.

Read-only reload preserved the two original B01 result databases:
95c998a4f3bc499768d3dd402a54cdba0f0753f31c1fface57587334de827ad8
462c4e344e1d4652e9bc13c421309ae074abeff9614050e026004e374f3e5c43.
Their unchanged inspection snapshot is d0b79469c8fb61ac705da46f103a06d419a350034ae6bef92d9d4a8e85db148c.
The HTTP 400 record remains a failure with unknown generation usage. It is not
credited to the new schedule or relabeled an epistemic abstention.

Outer HEAD: ca44f2eb180ed2d7d1fba1b606208a3294d4830d.
Product HEAD: 43d42d255bd22cb227e3410dda31ffb8437f6624.
Product branch: codex/phase3-decision-ux. No commit or seal was created.

## Exact remaining review and technical conditions

The pending [preservation qualification proposal](PRESERVATION_QUALIFICATION_PROPOSAL.md)
has raw SHA-256 **0b2fdd96d3173ebd4a8a58b38dd65fc59f8112474b08d8c5728551fc591f5901**. It preserves the old strict failure and
proposes an additive future-check binding for the current unchanged index plus
logical HEAD equality. Writer/cause is unknown. The original raw-index assertion
is not waived, repaired or reported as passed. Scope acceptance did not accept it.

The selected model remains gemini-3.5-flash-lite. Host-only Windows User key
presence is verified without disclosing its value. Inherited Process presence is
false. No key, provider prose, hidden thoughts or development-chat context enters
an investigation. [Compatibility review](COMPATIBILITY_REVIEW.md) records current
primary documentation, original limits and the candidate enum-type adapter.

The previous HTTP 400's parameter cause remains unconfirmed. The candidate repair
has offline tests, not successful generation proof. A complete frozen, verified
15-record online execution path is still required. The current preparation entrypoint
is deliberately blocked. No model/provider request, smoke test, manual chat,
paid fallback, download, install, deployment, LIVE mutation or runtime effect
occurred. Existing conditional Free authorization is preserved; all prerequisites
must be clear before any dispatch. Acceptance of preservation alone cannot enable it.

The original Stage 03 Build/VERIFY files and blocked/pending gate remain exact.
The prior read-only verifier's scopeAmendment=pending field is historical; the
new human decision above supplies accepted scope without rewriting that verifier.
The 20 initial repeats, 15 changed-study records and runtime intervention remain
deferred from this showcase. Larger B01 is incomplete; later stages stay unstarted.

The stage rule remains: "A person reviews exact Build/VERIFY hashes. Behavioral
losses are valid results; missing model/demo evidence stays NOT_RUN. Verify stage
cannot begin without acceptance." ([Contract](../../../CONTEXT.md))
