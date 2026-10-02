---
type: stage-verification
unit: b01-api-behavioral-benchmark
stage: 02_data
status: passed
prepared_at: 2026-10-01T15:48:42.558Z
model_evaluation: NOT_RUN
human_runtime_approval: NOT_RUN
---

# Data verification

Windows; Node v22.15.0; existing dependencies; no installation/download.
The following commands completed with exit 0 during preparation:

| Command | Evidence |
| --- | --- |
| node factory/01_spec/verify.mjs | Accepted/fresh Spec hashes and 118 archived files verified |
| node factory/02_data/verify.mjs --prepare | 13 deterministic checks; 7 negative package mutations; 22 hash bindings |
| node node_modules/eslint/bin/eslint.js factory/02_data/verify.mjs factory/02_data/benchmark/*.mjs | Targeted lint clean, no output |
| git -c safe.directory=<authoritative-product> diff --check | No whitespace errors |
| git -c safe.directory=<authoritative-outer> diff --check | No whitespace errors |

CONTRACT_EVIDENCE.json contains full deterministic checks and ordered exposure
probe manifests, not scored model answers or API usage. The evidence digest is
5600e9647438d27f6e4afb9c3d5a659172665f35bd12074faa605907898d74bf. Package negative checks: model performance claim; runtime approval claim; budget claim; missing case; hidden cause substituted for epistemic proof; missing human review; unqualified context claim.

- frozen-five-case-contract: passed
- bounded-ledger-and-schema-rejections: passed
- fresh-host-identities-preserve-facts-without-cross-run-access: passed
- aggregate-signal-separates-count-rate-price-and-coverage: passed
- b05-two-private-worlds-one-observable-cutoff: passed
- eager-and-query-universes-match-with-bounded-pagination: passed
- foreign-future-path-url-and-unknown-tool-denials: passed
- actual-node-read-write-child-and-credential-denials: passed
- untrusted-text-is-inert-and-invalid-attempts-consume-budget: passed
- frozen-discriminators-and-typed-claim-counterexamples: passed
- common-finding-retains-wrong-answers-and-missing-citations: passed
- lossless-allowlisted-exposure-and-conservative-context-fit: passed
- existing-files-git-state-and-stored-results-preserved: passed

Five different hidden causes, B05 underidentification, 23 exact required groups,
15 actual private reads denied, writes/children denied, clean worker credentials,
10 attempts including failures, matched eager/query universes, lossless compact
serialization and 80 canary-scanned surfaces. Full single-shot/initial context
checks use a stated conservative byte-fallback condition, not measured provider tokens.
Model behavior, transport, paid scoring, durability and runtime approval/effects
are NOT_RUN. Prototype injection probes prove fixed tool dispatch, not API resistance.

Preservation at preparation: outer: 3499 existing files, 1044 directories, branch codex/supabase-migration, HEAD ca44f2eb180ed2d7d1fba1b606208a3294d4830d; product: 1279 existing files, 359 directories, branch codex/phase3-decision-ux, HEAD 43d42d255bd22cb227e3410dda31ffb8437f6624.
Product A01 archive 118 files and outputs/a01 477 files are raw-byte unchanged.
No deletion, relocation, Git index/HEAD change, database write or history rewrite.

Full application build, TypeScript, migrations and effect-producing A01 tests are
outside this Data-only change. Existing full-source lint/TS failures and historical
test-path compatibility remain recorded for Build; no global pass is claimed.
The Data gate is pending, Build remains unstarted and release remains unsealed.
