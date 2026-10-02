---
type: build-evidence
unit: b01-api-behavioral-benchmark
stage: 03_build
status: gemini-offline-prepared
truth_mode: SIMULATED
provider: gemini
selected_model: gemini-3.5-flash-lite
execution_profile: original-accepted-b01-token-limits
complete_build: false
model_evaluation: NOT_RUN
human_runtime_approval: NOT_RUN
---

# Stage 03 Gemini preparation

The owner directed skipping ChatGPT subscription complexity and authorized
verified free-tier gemini-3.5-flash-lite requests, conditional on a Free-tier
project with billing disabled, sufficient quota and original-limit compatibility.
The active preparation selects Gemini. Dispatch remains blocked before any key
value lookup/network request because account and actual route checks are incomplete.
No paid fallback or runtime intervention is authorized.

## Changes and verification

Retained the original Gemini adapter/configuration and all original eager request
bodies. Added fresh query-context preparation and complete GenerateContentRequest
token-count envelopes, with no caller chat/answers/results/private fields accepted.
Added pure host budget accounting for 8192 input-plus-next-output tokens, at most
1024 output including thinking, 6144 cumulative generation, 12 turns, 10 invalid-
counted tool attempts, monotonic 180s/900s deadlines, concurrency one and retries zero.
The next wire output cap shrinks to the remaining cumulative allowance. Bytes
are diagnostics; no provider token measurements or runtime isolation claim.

41 offline tests passed (31 preserved protocol tests plus 10 new Gemini/context/
budget tests), affected lint and both Git diff checks passed. Original Data was
reverified without changing accepted evidence. Raw commands/TAP and preservation
checks are in gemini-resume/OFFLINE_CHECKS.json. The initial new-test schema-length
failure and its correction are disclosed in DIAGNOSTIC_CHECK.json; no accepted
schema/validator or historical request was rewritten.

15 exact prepared requests include five original eager bodies (6109–6842 bytes),
five initial tool bodies (7346 bytes), and five accumulated-query stress fixtures
(22896–25696 bytes). Complete token counts and framing/schema coverage remain
unmeasured; there is no claimed preflight token fit or silent context truncation.
The model uses one stable candidate/configuration for both methods; actual model
revision, seed support, schema response/usage and quota remain unverified.

## Preserved history and account observation

The exact previous provider configuration was copied to subscription-config.mjs;
subscription modules/tests now refer to that retained proposal. All subscription
packets, accepted SIWC amendment and pending Data compatibility gate remain intact.
The SIWC byte/threshold profile is not selected. No amendment was revoked or
accepted by inference, no new factory run, and original Spec/Data hashes stay fresh.

Before any change, 3499 outer files and 1370 product files were inventoried. Nine
related current files were copied byte-for-byte in gemini-resume/prior-current/.
The exact authorized list/baseline are retained. All other old files, directories,
links, Git indexes, HEADs, branches and unrelated uncommitted work are preserved.
118 A01 factory archive files and 477 stored A01 files remain intact, including
all existing databases/history. No fixture/evaluator/runtime source was changed.

Sanitized ACCOUNT_OBSERVATION.json records absent GEMINI_API_KEY/GOOGLE_API_KEY
variables and AI Studio session access with no visible imported project rows;
the initial key page returned a network error. No project/key was created/imported,
no key value revealed, no billing setting changed. A subscription badge proves
no API-project tier/quota. Existing $0 request authorization is separately recorded
in REQUEST_AUTHORIZATION.json; no model or token-count request occurred.

## Current stage and unfinished work

Product: codex/phase3-decision-ux at 43d42d255bd22cb227e3410dda31ffb8437f6624.
Outer: codex/supabase-migration at ca44f2eb180ed2d7d1fba1b606208a3294d4830d.
The product stays uncommitted/unsealed. No installation/download, payment,
deployment, LIVE change, database/history mutation or runtime intervention.

- verified_free_tier_project_with_billing_disabled_required
- scoped_gemini_api_key_unavailable
- account_model_quota_and_actual_route_compatibility_unverified
- complete_provider_request_token_count_not_measured
- real_isolated_transport_and_durable_runner_unfinished
- Frozen schedule, all 50 retained artifacts, method-blinded adjudication and one measured development change
- Separate exact human-approved SIMULATED intervention and observed outcome; currently prohibited
- Complete Build lint/build/A01 and affected regression checks before opening the human gate

Exact next prerequisite: a usable scoped key for a verified Free-tier project
with billing disabled, outside Git/chat. Then confirm quota, model/route/schema,
complete token counting and permitted $0 request scope before scoring.
The real transport, durable runner/permissions, all 50 artifacts, blinded grading,
one measured change and complete application verification remain unfinished.
A separately approved exact SIMULATED effect remains prohibited by the present
instruction; no generic factory or provider authorization supplies that grant.

Stage 03 says "Verify stage cannot begin without acceptance." Its complete Build
gate remains blocked/pending; Stage 04 and later stages were not started or loaded.

## Declared input hashes

| Input | SHA-256 |
| --- | --- |
| `factory/03_build/CONTEXT.md` | `d2b9cb23c70b3835ea037acc9e30004e26cfbb77b70175f8b605379ac6f7112a` |
| `factory/03_build/verify.mjs` | `025bc6091ccf7a905ee8967a16d224dcad077de4f0a3b5e2131d361af05bd9f1` |
| `factory/03_build/gemini-preflight.mjs` | `37a57f22a0b96c2b4251def2964624417c5747db602821ec33399abce33686b1` |
| `factory/01_spec/output/SPEC.md` | `e6e2f7fa20903ed4b1dc96b156908a51bf872cee254084313a449914950dbf4e` |
| `factory/01_spec/output/VERIFY.md` | `ba52080e93692f9be2220450a8bfb6fd0905827ee9a2a10c9ed6231ade1019ee` |
| `factory/01_spec/output/HUMAN_GATE.md` | `be8c05213e931e1aaae37ad5c21d68b34194a837ea9b8d94e3e4571d125dc423` |
| `factory/02_data/output/DATA_PACKAGE.md` | `ffa20862857b2083cc83d7c027e16938e5fc98266729852ef2f8df3610dc5d6f` |
| `factory/02_data/output/VERIFY.md` | `2b7e2dc16b1aeaa7706fe800180511133593f85a86aa5011587cb5aede0f1fcc` |
| `factory/02_data/output/HUMAN_GATE.md` | `06bd60ec2e816cddcb4ecfe3db0ca0a9e0e0361edb1a7a326287e4302167a722` |
| `factory/02_data/output/CONTRACT_EVIDENCE.json` | `17e988cb707f00ec913fe7213f47e3f82629580d0d60f845144810f7e0fd4935` |
| `factory/02_data/benchmark` | `be6d15ef711e30cf2820855eedc99508458f2de9cce513fc3d8597af2dc002da` |
| `factory/02_data/verify.mjs` | `719462a7162c8f2dd00e13c763551e5034063793a46da1be4b405b45c58f5aa5` |
| `factory/_shared/BENCHMARK_DIRECTION.md` | `361535a1979ff66497ded9ef1aefd6e43b0eae42bce9fadb88e6bab74ba17f6e` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `factory/_lib/verify-kit.mjs` | `b2c7434bf3acacbfb6323b33cf0b175f77d0e3b1d66aeadee6e9ea996c95015c` |
| `factory/_lib/factory-state.mjs` | `72870904445d54f01eea443ed5a5de1b2af2fd19df66e085a52bf47982594d28` |
| `factory/status.mjs` | `a1bfc445aeab8e9672885c13bc73aabf0aaef0a90f9d44f8ae17cf36b2cfbbe5` |
| `docs/api-execution-boundary.md` | `e1991c048563420f99543235a1d5bda5dfced6e65ccfb1aa61af3abf35c3dfbd` |
| `package.json` | `a3e13c18962d9b5b1f4d68bf7114921e479ac240189918663e0960dec19d4274` |
| `package-lock.json` | `5cdde3db2fa840e2e9a3f162f706336c04296e5f52dc8be574956521c9453d87` |
| `eslint.config.mjs` | `fd783131de1685f7971a45e0b493e1e8b818fc5c9d56ecd3fe401b29b8272c7d` |
| `db/benchmark` | `9a3a33a03b6b3460eb49d0fb953f7cf99bf4675ee971bab30239f66774e2989e` |
| `tests/benchmark.test.mjs` | `bbf03624252793a9877561fb8762fe749c1ce076520d1c489578ea2659b6760b` |
| `tests/benchmark-subscription.test.mjs` | `cc0bf5310d571f12737164b0d0312cfc6ad734ae677eeceb3814d87c956f218d` |
| `tests/benchmark-subscription-budget.test.mjs` | `460b6c9ee5c66bdab2314fd7c469c26e5a05c08c03e220fa819cd1be229b4bb0` |
| `tests/benchmark-gemini-budget.test.mjs` | `0edd662eb5d21e7e0c53d61f5dc8fa16e2b158bbc9478a877f9046e7761c9d20` |
| `factory/01_spec/amendments/b01-siwc-measured-v1` | `4caeba4077caab8a2489de89b4c4ce1094fdc5b0867461ccd8f7d74144dd78e6` |
| `factory/02_data/amendments/b01-siwc-measured-v1` | `9beb5c233b81564dd785af815fe3fef9a7c8d80cb6d1e30a502439ec5a888b47` |
| `factory/03_build/output/GEMINI_PROPOSAL.md` | `e17ef0089dee2e5c82376abdc446fbaa281bc9360cd44fe5522a79bcd9256622` |
| `factory/03_build/output/gemini-resume/PROPOSAL.md` | `05b8bd56b4b68b67c6ab8a38f28805cef8ee30514698f71bfa58f624901f387c` |
| `factory/03_build/output/gemini-resume/PRESERVATION_BEFORE.json` | `58e8fdb78e482aa02e3f0d5d3bad67bdac0f142dc87d60f3eb74503815d92d40` |
| `factory/03_build/output/gemini-resume/AUTHORIZED_CHANGES.json` | `6eb4a6c80ff1fd8f7b3b9ee00bf4176184e7d363221a9d735cb27daae900d0d2` |
| `factory/03_build/output/gemini-resume/prior-current` | `5735c5d2763baabead6238a0cc11b4f8b7777024c798dd340d6823eead214d37` |
| `factory/03_build/output/gemini-resume/ROUTE_DECISION.json` | `527afbed632ecae4903aedc702fa662173462acff0d6d942b61dec9aa1423844` |
| `factory/03_build/output/gemini-resume/REQUEST_AUTHORIZATION.json` | `d0d94e24ba3f124578e2c528717b0de5178c7c3202f64e7a3dbeea60202ed5f2` |
| `factory/03_build/output/gemini-resume/ACCOUNT_OBSERVATION.json` | `26903697725cc78de7adf9e99ce3c0b538ea8a38f802d37390b27fc10b53de13` |
| `factory/03_build/output/gemini-resume/DIAGNOSTIC_CHECK.json` | `709ffd179a8dcc7a98cf559bdb0dd04e0860f1a1e910903bc58af9b9dea6391b` |
| `factory/03_build/output/gemini-resume/PREPARED_REQUESTS.json` | `793d2f793b298d3eb491577fac9c7a178aa45e741b543d26f33a75c3a1330a2d` |
| `factory/03_build/output/gemini-resume/OFFLINE_CHECKS.json` | `95ec0c59118a9fc899e6dffdd9131d06dc819dd19b1c80c8fe1cf5fa58772e4b` |
