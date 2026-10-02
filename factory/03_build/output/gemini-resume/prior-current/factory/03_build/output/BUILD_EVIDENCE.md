---
type: build-evidence
unit: b01-api-behavioral-benchmark
stage: 03_build
status: measured-profile-offline-prepared
truth_mode: SIMULATED
provider: openai-chatgpt-subscription
proposed_model: gpt-6.1-sol
execution_profile: b01-siwc-measured-v1
complete_build: false
model_evaluation: NOT_RUN
human_runtime_approval: NOT_RUN
---

# Stage 03 measured-profile preparation

The owner explicitly answered "Accept the measured profile" for exact proposal
hash fb0726293476d13ce909ff042f9712e970c5ba2537c79395a66b9f3f8398651f.
The additive Spec amendment/gate record that decision. Original accepted Spec/Data
outputs and hashes remain unchanged and fresh; no factory restart or new run.
Additive Data compatibility is verified offline and open for exact human review.

Active model proposal remains gpt-6.1-sol/low reasoning via CrossSignal's own SIWC
OAuth grant. API-key billing, credits, purchases and paid fallback remain forbidden.
Account/catalog/allowance and route compatibility are unverified. Model dispatch
remains blocked before credential lookup; no caller flag bypass exists.

## Changes and checks

The active profile uses an 8192-byte serialized request ceiling, a 1024-output
post-response qualification threshold and 6144-cumulative-output stop threshold.
No hard generation or combined-token guarantee. Added pure host budget accounting
and eight tests for byte limits, overshoot, usage, monotonic deadlines, tool/turn
counts, concurrency, interruption and no retries. No actual transport/timer or
durable investigator is claimed. Both model methods retain common task/schema.

31 offline tests, affected lint, both diff checks and original Data reverification
passed. All five eager bodies and initial tool bodies fit. QUERY_CONTEXT_CHECK
shows one 5-row revenue result already exceeds the byte ceiling; such failures
remain visible in the denominator, with no trimming or hidden repair. Full
compatibility report and its pending human gate are under
factory/02_data/amendments/b01-siwc-measured-v1/.

Raw commands/TAP: chatgpt-subscription/measured-profile/OFFLINE_CHECKS.json.
Accepted amendment: factory/01_spec/amendments/b01-siwc-measured-v1/HUMAN_GATE.md.
The reviewed proposal bytes are retained, including their preparation-time header.
Old Gemini and earlier subscription receipts are preserved as history. Nine
related current files were copied byte-for-byte before this pass; raw baseline
and exact changed-file list are in measured-profile/. All other old file bytes,
directories, links, indexes, HEADs and unrelated work are checked for preservation.
118 A01 archived factory files, 477 stored A01 files and 35 original Data files
remain intact. No database/history/evaluator/fixture was changed or regenerated.

## Current state and unfinished Build

Product: codex/phase3-decision-ux, HEAD 43d42d255bd22cb227e3410dda31ffb8437f6624.
Outer: codex/supabase-migration, HEAD ca44f2eb180ed2d7d1fba1b606208a3294d4830d.
Both checkouts remain uncommitted and unsealed. No model/sign-in, credential read,
installation, purchase, deployment, LIVE change or runtime intervention occurred.

- additive_data_compatibility_review_pending_human_acceptance
- crosssignal_oauth_grant_and_client_eligibility_unverified
- selected_account_model_catalog_unverified
- subscription_allowance_only_and_zero_credit_settings_unverified
- actual_route_schema_usage_and_model_compatibility_unverified
- Real OAuth listener/trusted discovery/protected credential storage and refresh lifecycle
- Automated transport/cancellation, durable bounded investigator/ledger and isolation probes
- Frozen experiment/schedule, three baselines, all 50 retained artifacts and blinded adjudication
- One pre-registered development change with preserved initial and second-round results
- Separate exact human-approved SIMULATED intervention and observed outcome
- Required complete Build lint/build/A01 and affected regression checks before opening its gate

Stage 03's human rule is "A person reviews exact Build/VERIFY hashes" and
"Verify stage cannot begin without acceptance." Complete Build remains blocked;
this pass prepares the additive compatibility review, not Stage 04 acceptance.
The owner must separately approve an exact runtime intent if later requested.

## Declared input hashes

| Input | SHA-256 |
| --- | --- |
| `factory/03_build/CONTEXT.md` | `122ac3fa64ba763246255e6b4bbf7f15b939a32b2122fd7d4b9767d83e0d0193` |
| `factory/03_build/verify.mjs` | `1994c5487707e285d61b390c9b23818290bbfdc766b642637a0ac6cb2e64b230` |
| `factory/03_build/subscription-preflight.mjs` | `5408c8e445f4cd1352610cb616f215bad8e1a9c0b5d4ca8fd725e5216477ab4c` |
| `factory/01_spec/output/SPEC.md` | `e6e2f7fa20903ed4b1dc96b156908a51bf872cee254084313a449914950dbf4e` |
| `factory/02_data/output/DATA_PACKAGE.md` | `ffa20862857b2083cc83d7c027e16938e5fc98266729852ef2f8df3610dc5d6f` |
| `factory/02_data/output/HUMAN_GATE.md` | `06bd60ec2e816cddcb4ecfe3db0ca0a9e0e0361edb1a7a326287e4302167a722` |
| `factory/02_data/output/VERIFY.md` | `2b7e2dc16b1aeaa7706fe800180511133593f85a86aa5011587cb5aede0f1fcc` |
| `factory/02_data/output/CONTRACT_EVIDENCE.json` | `17e988cb707f00ec913fe7213f47e3f82629580d0d60f845144810f7e0fd4935` |
| `factory/02_data/benchmark` | `be6d15ef711e30cf2820855eedc99508458f2de9cce513fc3d8597af2dc002da` |
| `factory/_shared/BENCHMARK_DIRECTION.md` | `361535a1979ff66497ded9ef1aefd6e43b0eae42bce9fadb88e6bab74ba17f6e` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `factory/02_data/verify.mjs` | `719462a7162c8f2dd00e13c763551e5034063793a46da1be4b405b45c58f5aa5` |
| `factory/_lib/verify-kit.mjs` | `b2c7434bf3acacbfb6323b33cf0b175f77d0e3b1d66aeadee6e9ea996c95015c` |
| `factory/_lib/factory-state.mjs` | `72870904445d54f01eea443ed5a5de1b2af2fd19df66e085a52bf47982594d28` |
| `factory/status.mjs` | `a1bfc445aeab8e9672885c13bc73aabf0aaef0a90f9d44f8ae17cf36b2cfbbe5` |
| `docs/api-execution-boundary.md` | `e1991c048563420f99543235a1d5bda5dfced6e65ccfb1aa61af3abf35c3dfbd` |
| `eslint.config.mjs` | `fd783131de1685f7971a45e0b493e1e8b818fc5c9d56ecd3fe401b29b8272c7d` |
| `package.json` | `a3e13c18962d9b5b1f4d68bf7114921e479ac240189918663e0960dec19d4274` |
| `package-lock.json` | `5cdde3db2fa840e2e9a3f162f706336c04296e5f52dc8be574956521c9453d87` |
| `db/benchmark` | `1da15a147eef8fee5c77eed29491daaac6ddb086dee90e66d3ea52c078287483` |
| `tests/benchmark.test.mjs` | `bbf03624252793a9877561fb8762fe749c1ce076520d1c489578ea2659b6760b` |
| `tests/benchmark-subscription.test.mjs` | `a60211f8deffb7bcb4a86cb36f26c1c8fda5c7c8db2b9ffc238ff4c417b133ea` |
| `tests/benchmark-subscription-budget.test.mjs` | `460b6c9ee5c66bdab2314fd7c469c26e5a05c08c03e220fa819cd1be229b4bb0` |
| `factory/01_spec/amendments/b01-siwc-measured-v1` | `4caeba4077caab8a2489de89b4c4ce1094fdc5b0867461ccd8f7d74144dd78e6` |
| `factory/02_data/amendments/b01-siwc-measured-v1` | `9beb5c233b81564dd785af815fe3fef9a7c8d80cb6d1e30a502439ec5a888b47` |
| `factory/03_build/output/chatgpt-subscription/CONTRACT_CHANGE_PROPOSAL.md` | `fb0726293476d13ce909ff042f9712e970c5ba2537c79395a66b9f3f8398651f` |
| `factory/03_build/output/chatgpt-subscription/CONTRACT_REVIEW.md` | `42262d77b823b8a0185fd2a7d119a80a39296f4f6f298c278dccff821a3a34b2` |
| `factory/03_build/output/chatgpt-subscription/ELIGIBILITY_OBSERVATION.json` | `d6c68a6dcb39c0ab8b23700129f7a5e765318405a023cdd4074c439b9b25ca9b` |
| `factory/03_build/output/chatgpt-subscription/measured-profile/PRESERVATION_BEFORE.json` | `a0f4fb492a83296eb1b6b9fedf5f7a330869f563ba5426f3d6699205ed50d137` |
| `factory/03_build/output/chatgpt-subscription/measured-profile/AUTHORIZED_CHANGES.json` | `b6ac7773dc7eeb2481d80a51946a28a49eb2808424cf057a26a63699b136741f` |
| `factory/03_build/output/chatgpt-subscription/measured-profile/prior-current` | `bf255f308c92646a6a475caf2afa5f5029eb9598c44d7335331d520463ac0d3f` |
| `factory/03_build/output/chatgpt-subscription/measured-profile/ACCEPTANCE.json` | `3059abbb269804d1275a24f66d2fdf679b7c85c06e4b86fa490410e5c4a3d689` |
| `factory/03_build/output/chatgpt-subscription/measured-profile/PREPARED_REQUESTS.json` | `e356178b49282ea5344e891512051d5d29912d7e44649627064ddc62930d73a5` |
| `factory/03_build/output/chatgpt-subscription/measured-profile/QUERY_CONTEXT_CHECK.json` | `e145b42c921b076af9f20f6c26404c861773475185cbfae1d42eeec929058562` |
| `factory/03_build/output/chatgpt-subscription/measured-profile/OFFLINE_CHECKS.json` | `0e7da834dc12a283d9ffca96fdeba2caa6733a613a355101eff456da93af55b5` |
