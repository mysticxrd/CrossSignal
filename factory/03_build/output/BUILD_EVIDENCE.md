---
type: build-evidence
unit: b01-api-behavioral-benchmark
stage: 03_build
status: runner-offline-verified-provider-blocked
truth_mode: SIMULATED
provider: gemini
selected_model: gemini-3.5-flash-lite
execution_profile: original-accepted-b01-token-limits
complete_build: false
model_evaluation: BLOCKED_AFTER_FIRST_SCORED_ATTEMPT
human_runtime_approval: NOT_RUN
---

# Stage 03 bounded Gemini runner

The restricted request runner, monotonic timeouts, original token/tool limits
and append-only benchmark recorder are implemented and verified offline using
existing dependencies. The first authorized Free-tier scored generation
returned HTTP 400; the batch stopped. No automatic retry or paid fallback.
Further generation is blocked because actual generation compatibility is unclear.
Full Build remains incomplete and the human gate blocked/pending.

Review [the Stage 03 packet](gemini-runner-v1/STAGE03_REVIEW.md) for the
limit/isolation matrix, actual request counters, preserved source snapshots,
checks, additive documentation reconciliation and exact remaining decisions.

## Implementation and actual outcome

- Fresh opaque replicate identities; synthetic observations/task/schema/current
  bounded read-only query results only. The actual worker denies private truth,
  rubric, evaluator/history/credential reads, writes and child-process creation.
  No model code is evaluated; no network/file/effect tool is exposed.
- Complete GenerateContentRequest and serialized-body token counts before each
  generation; 8192 combined context, 1024 output including thoughts, 6144
  cumulative generation, 12 turns, 10 invalid-counted tool attempts, 50 rows,
  160 query characters, 180s/900s monotonic deadlines, concurrency one/retries zero.
  Cumulative wire output reservations shrink; unknown usage stops the run.
- New scoped SQLite stores with FULL-synchronous append transactions, immutable
  rows, timeline hash checks, committed dispatch and terminal failures. No A01
  migration or overwrite. Interrupted dispatch never automatically regenerates.
- Existing key was read from Windows User GEMINI_API_KEY into a trusted child
  environment in memory only. No value was printed/logged/stored or passed to
  the worker. Owner-confirmed Free tier, disabled billing and sufficient quota
  are in ACCOUNT_ATTESTATION.json; no independent billing API proof is claimed.

Frozen actual session: outputs/b01/gemini-runner-v1/session-a629b14640c9c81c/.
One metadata GET matched the selected model. Twenty-two countTokens requests
measured all ten initial method/Case contexts plus the first investigation.
Maximum complete initial input bound 2593 + 1024 output = 3617 < 8192.
These checks did not establish generation/schema compatibility.

Two of 35 initial artifacts are retained: rules r_d564012e62fd and failed
single-shot r_05af95690c5e. One generateContent dispatch returned HTTP 400.
The failed scored artifact records indeterminate_usage/http_failure, no finding,
no model revision and unknown generated tokens. Known cumulative zero does not
mean zero server generation or zero billed usage. The non-2xx body was discarded;
the exact parameter-level cause is unavailable, and no diagnostic replay was made.
Fifteen changed-experiment artifacts, blinded adjudication and the exact
human-approved SIMULATED intervention remain NOT_RUN.

EXECUTION_SOURCE_SNAPSHOT.json and execution-source/ preserve all 35 exact
source files from the immutable pre-call OFFLINE_VERIFICATION_FINAL.json proof.
Post-run code adds the durable HTTP-rejection regression, read-only result
checks and exit 2 for incomplete CLI batches. The original executing CLI exit 0
and incomplete summary remain preserved. Source drift invalidates the old online
proof; the immutable EXECUTION_CLAIM also prevents another launch. Post-run
verification is separate offline evidence, not renewed request authorization.

## Checks and preservation

57 benchmark/protocol/runner tests, 28 prior product tests, 18 A01 tests and five
fixture replay mechanics checks passed. Affected lint, both git diff --check
commands, accepted Spec/Data freshness and Data's 13 checks/7 negatives/22
bindings/934 protected-history comparisons passed. POST_RUN_VERIFICATION.json,
PRODUCT_REGRESSIONS.json and A01_REGRESSIONS.json retain actual evidence.
Offline fixture authority does not count as a human approval or runtime demo.

Full-project lint still fails on four existing errors in db/case-investigator.mjs
and tests/evaluator/grade-golden-case.mjs; those unrelated files are unchanged.
The application build passed in the additive second build-input snapshot using
existing root dependencies. The first snapshot's omitted shared-module failure
is retained. Active dist/.vinext and the original product node_modules junction
were preserved; there was no installation, download or repository clone/init.

Original preservation manifests are unchanged. RECONCILIATION.json additively
records seven later documentation entries with exact old/current hashes and
retained current copies. All 3500 existing outer files remain unchanged.
All 1394 existing product files remain; the only permitted old-file changes
are the six exact entries in AUTHORIZED_CHANGES.json, with prior raw copies.
Accepted Spec/Data hashes, 118 A01 archive files, 477 original A01 stored files,
databases/approval/history, migrations/fixtures/evaluator/excluded trial receipt
and unrelated uncommitted work are intact. HEADs, branches, the product index, old
directories and links are unchanged. The later outer raw-index discrepancy is
retained in INDEX_OBSERVATION.json and its binary snapshot; logical indexed
content still equals HEAD and no staged diff exists. Strict preservation remains
blocked at that byte assertion; no baseline replacement, waiver or reset. The accepted SIWC amendment and pending
Data compatibility decision remain preserved and unselected.

## Remaining Build blockers and human review

Generation compatibility is blocked by the retained HTTP 400. Review the frozen
request against official model/REST documentation and prepare bounded secret-free
error capture offline before any fresh scored attempt. No model substitution,
limit weakening or failed-run replay. An unsupported limit requires an exact
human-reviewed contract amendment before scoring.

Full Build also needs remaining initial evidence, one preregistered/measured
change, blinded adjudication, complete lint and a separately approved exact
SIMULATED intervention. Present instructions prohibit runtime intervention;
it remains NOT_RUN. Generic factory acceptance cannot supply that authority.

The product stays codex/phase3-decision-ux at
43d42d255bd22cb227e3410dda31ffb8437f6624, uncommitted and unsealed.
Stage 03's rule: "Verify stage cannot begin without acceptance." No later stage
was started or human gate accepted. Initial verifier exit 2 reported incomplete
Build; latest exit 1 additionally reports the strict outer-index byte discrepancy.
RESULT_SOURCE_CHECK.json independently verifies frozen data/manifest/SQLite
equality. The unknown index writer/cause remains a disclosed review item.

## Declared input hashes

| Input | SHA-256 |
| --- | --- |
| `factory/03_build/CONTEXT.md` | `d5efd0a0492c95a970b71ec17c77211411c4658719eb51d8c2147370e7c16645` |
| `factory/03_build/verify.mjs` | `e905f5f74c314e7023b1a9652a1456409f42c9d577602cdecc302643d6894806` |
| `factory/03_build/runner-checks.mjs` | `e2f5ac0a9c7b18eb9ed4da2d762137fa9249ae0a6c11c2df0229eff69191b15c` |
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
| `docs/api-execution-boundary.md` | `e1991c048563420f99543235a1d5bda5dfced6e65ccfb1aa61af3abf35c3dfbd` |
| `db/benchmark` | `ebf8cf9a94adfb4309691f58a05833e0a918be2c024c0680e5d5845ac430c3a5` |
| `scripts/run-benchmark.mjs` | `1979c619f8700a60dbefec9094647ebfb93fbc47ea128533d07d8d72624f0ec2` |
| `tests/benchmark-gemini-runner.test.mjs` | `f48ee6d896026c75b59fcb6f951a798b72bda197eebc108b26b8adcac2dfe1dd` |
| `tests/benchmark-gemini-budget.test.mjs` | `0edd662eb5d21e7e0c53d61f5dc8fa16e2b158bbc9478a877f9046e7761c9d20` |
| `tests/benchmark.test.mjs` | `bbf03624252793a9877561fb8762fe749c1ce076520d1c489578ea2659b6760b` |
| `tests/benchmark-subscription.test.mjs` | `cc0bf5310d571f12737164b0d0312cfc6ad734ae677eeceb3814d87c956f218d` |
| `tests/benchmark-subscription-budget.test.mjs` | `460b6c9ee5c66bdab2314fd7c469c26e5a05c08c03e220fa819cd1be229b4bb0` |
| `tests/a01-path-compat.mjs` | `77201e5e927727863ac78d9bedeea7ad46a543705ed8f7a342f57abf4d03043b` |
| `package.json` | `a3e13c18962d9b5b1f4d68bf7114921e479ac240189918663e0960dec19d4274` |
| `package-lock.json` | `5cdde3db2fa840e2e9a3f162f706336c04296e5f52dc8be574956521c9453d87` |
| `eslint.config.mjs` | `fd783131de1685f7971a45e0b493e1e8b818fc5c9d56ecd3fe401b29b8272c7d` |
| `factory/01_spec/amendments/b01-siwc-measured-v1` | `4caeba4077caab8a2489de89b4c4ce1094fdc5b0867461ccd8f7d74144dd78e6` |
| `factory/02_data/amendments/b01-siwc-measured-v1` | `9beb5c233b81564dd785af815fe3fef9a7c8d80cb6d1e30a502439ec5a888b47` |
| `factory/03_build/output/gemini-resume/PRESERVATION_BEFORE.json` | `58e8fdb78e482aa02e3f0d5d3bad67bdac0f142dc87d60f3eb74503815d92d40` |
| `factory/03_build/output/gemini-runner-v1/PRESERVATION_BEFORE.json` | `ef1b7eac5afdcbef8757865a38c16fd91eeeaaf9dbaf1447826c69f1544a576c` |
| `factory/03_build/output/gemini-runner-v1/AUTHORIZED_CHANGES.json` | `1f423c25db73d4377ea0fd18d9cd44f842e2dddcc22a133a6d195f861ec2742c` |
| `factory/03_build/output/gemini-runner-v1/RECONCILIATION.json` | `e23d2012734ef2d29a63ff374dfc04fbb049d32efda58d44609b225f1d293bbf` |
| `factory/03_build/output/gemini-runner-v1/documentation-current` | `cecec2361f90fffc4e4348374e815ffc255a4a00d492c2360d5331661d98778a` |
| `factory/03_build/output/gemini-runner-v1/prior-current` | `f9c9be4877d0bd55588f2053c8ef85210ae1f7ab84c0f2960d0d0f597012f33c` |
| `factory/03_build/output/gemini-runner-v1/ACCOUNT_ATTESTATION.json` | `81cd264704f81f236e50c9c7a8347a593c2ce10c660aff1f92515f8a52c8eeff` |
| `factory/03_build/output/gemini-runner-v1/PROVIDER_CONTRACT.md` | `1e2956a8937f783bab9c09ad77883b505f3935a2b461280f7013eebdf9f81a2e` |
| `factory/03_build/output/gemini-runner-v1/OFFLINE_VERIFICATION_FINAL.json` | `525ff4c9a1da697a094ecb39721cdfb6f822b14ee211c205ab5136adbde69a63` |
| `factory/03_build/output/gemini-runner-v1/EXECUTION_CLAIM.json` | `3fcd4d01e9aa7a3e43c90630887f374cce1340bfbd31476df0a50e1867b949f4` |
| `factory/03_build/output/gemini-runner-v1/EXECUTION_SOURCE_SNAPSHOT.json` | `02c32dfffb047c1794eecfc4c5eb533e1824db914daabb87dc9953724b8378c1` |
| `factory/03_build/output/gemini-runner-v1/execution-source` | `1f228a385e31730b8336b97f8670a872aca55ded8abcddf54a9e2fa51e5792dc` |
| `factory/03_build/output/gemini-runner-v1/A01_REGRESSIONS.json` | `b72ca999973ffcc49d5d7c7b34965f69da778e77752a9cf65a0206b6afda0b12` |
| `factory/03_build/output/gemini-runner-v1/PRODUCT_REGRESSIONS.json` | `c5b7ce3c9bb284f1082a7bd9d1bfe5b9610f4545b959d277c9c576d726a96943` |
| `factory/03_build/output/gemini-runner-v1/APPLICATION_LINT.json` | `782985f86ee4e229e5d008de22de283f829cc0c395cc06bfa38e06b836ab1d6f` |
| `factory/03_build/output/gemini-runner-v1/APPLICATION_BUILD.json` | `df54f9d191418bbbe51f41fd5c4059e4db43d6f7f3180e517cb0cf25a382fb77` |
| `factory/03_build/output/gemini-runner-v1/APPLICATION_BUILD_ADDENDUM.json` | `9ff7e05207d6414784ef05bf44d6f36ef8f9117ae75d071d201c5dc23afd6025` |
| `factory/03_build/output/gemini-runner-v1/BUILD_SNAPSHOT.json` | `ca4d228ad2a3908f796124b33002f0d8b2becf19c4acc035edf1b02adab0b23e` |
| `factory/03_build/output/gemini-runner-v1/BUILD_SNAPSHOT_ADDENDUM.json` | `0a93361f10418783d27c5debfa43453697c5b7bb8fce37d8d4c97d7fb781273c` |
| `factory/03_build/output/gemini-runner-v1/STAGE03_REVIEW.md` | `3f5098cf948c70da38028049b2d0b752cc0eb7366c99ade82980a162481232f2` |
| `outputs/b01/gemini-runner-v1/session-a629b14640c9c81c` | `b045939464056b142d450ec2f7632178a9ac64e0facc327f100f1075b2874656` |
