---
type: verification
unit: b01-api-behavioral-benchmark
stage: 03_build
status: blocked
offline_preflight: passed
model_evaluation: NOT_RUN
human_runtime_approval: NOT_RUN
---

# Build verification: offline subset only

This is not complete Build verification. Offline checks passed; execution and
remaining implementation are blocked by the retained no-model-call constraint,
model/configuration review and unverified account-specific spend conditions.
No behavioral result, actual usage/charge, semantic grade or human effect is claimed.

## Performed checks

Environment: v22.15.0; win32/x64. Recorded interval:
2026-10-01T16:13:41.729Z–2026-10-01T16:14:10.559Z. OFFLINE_CHECKS.json retains each actual
command, timestamp, exit code and relevant output.

| Check | Result |
| --- | --- |
| node factory/02_data/verify.mjs | Passed; accepted Data, 13 contract checks, 7 negative package checks, 22 bindings, 934 historical files |
| node --test tests/benchmark.test.mjs | Passed 10; pure requests/fixture responses, no network or effects |
| node node_modules/eslint/bin/eslint.js db/benchmark tests/benchmark.test.mjs factory/03_build/verify.mjs | Exit 0 |
| git -c safe.directory=<authoritative-product> diff --check | Exit 0 |
| git -c safe.directory=<authoritative-outer> diff --check | Exit 0 |
| Raw preservation against PREFLIGHT_PRESERVATION.json | Outer 3499 and product 1309 unchanged files; one authorized contract edit; all original directories, links, HEADs/indexes/status preserved |
| Prepared requests | Five bodies recomputed read-only and compared exactly; no private labels/worlds/rubric in exposure |

Coverage: exact public-copy bytes; tenant/cutoff/hash rejection; explicit wire
schema projection and strict host constraints; wrong citations/recommendations
retained; malformed/truncated/unknown-field output; thoughts/signatures/error
redaction; provider-native capability rejection; missing/nonzero/invalid usage;
output/context bounds; disabled-call guard resisting caller approval flags.
These are contract checks with authored responses, not model injection-resistance
or API compatibility evidence. Actual Gemini tokens/charges/fingerprint remain null.

During preparation, the first preservation check (exit 1) rejected the Git status
change of the stage-owned verifier path from the transition's deleted A01 file
to the newly created B01 verifier. Existing raw bytes and all unrelated statuses
were intact. The checker was narrowed to allow only declared Stage 03 status
changes; it does not excuse old-file byte drift. Subsequent checks passed.

## Required full-stage checks and missing evidence

NOT_RUN: actual Gemini requests/tokenizer, durable store/query-loop recovery,
three baselines, blinded adjudication, one measured change, runtime-human demo;
node --experimental-strip-types scripts/run-a01.mjs; combined A01/release/benchmark
and affected prior suites; existing full lint/build. This pure offline change
modifies no A01 runtime, app or migration. A01/effect runners and the full build
were not invoked while execution prerequisites are unresolved; they create new
stores or rewrite generated outputs and cannot substitute for missing benchmark
proof. Complete Build will need the exact required checks and preservation of
initial/new stores before its gate opens. Prior product lint/TypeScript issues
are not concealed by the clean targeted lint result.

Read-only verification commands:

- node factory/03_build/verify.mjs --preflight: expected exit 0, offline scope only.
- node factory/03_build/verify.mjs: expected exit 2, complete Build blocked.
- node factory/status.mjs: Stage 01/02 complete/fresh, Stage 03 in progress.

## Gate boundary

Build HUMAN_GATE is blocked/pending and binds this packet for review. A person
cannot accept missing evidence into existence. Stage 04 is not permitted by this
packet. Process 1 of CONTEXT requires explicit provider/model/spend conditions;
QUALITY_GATES says "Build, lint, tests, migrations, and diff inspection pass before
a gate opens." Separate runtime authority is still required for the exact demo.
