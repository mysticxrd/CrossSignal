---
type: build-evidence
unit: b01-api-behavioral-benchmark
stage: 03_build
status: subscription-offline-preflight-prepared
truth_mode: SIMULATED
model_evaluation: NOT_RUN
human_runtime_approval: NOT_RUN
provider: openai-chatgpt-subscription
proposed_model: gpt-6.1-sol
complete_build: false
subscription_requests: conditionally-authorized
paid_api_authorization: not-granted
---

# Stage 03 subscription preparation

## Verified state and authority

Spec and Data remain accepted and fresh. Their unchanged hashes are bound below.
Data verification passed 13 contract checks, seven package negatives and 22 input
bindings; all 934 currently protected historical files remain unchanged. The
product is on codex/phase3-decision-ux at
43d42d255bd22cb227e3410dda31ffb8437f6624; the outer repository is on
codex/supabase-migration at ca44f2eb180ed2d7d1fba1b606208a3294d4830d.
Both retain their existing uncommitted work; the checkout remains unsealed.

The owner requested ChatGPT subscription integration and explicitly authorized
only benchmark requests wholly covered by the existing subscription, after
eligibility, compatibility and required contract changes are verified and
accepted. This supersedes the earlier no-model-call instruction only on those
conditions. API-key billing, credits, purchases and paid fallback remain forbidden.
No model request, sign-in, credential lookup, installation, download, database
write, intervention, LIVE change or deployment occurred in this preparation.

## Current proposal and changes

The active provider proposal is db/benchmark/provider-config.mjs: SIWC OAuth,
public Responses endpoint, candidate gpt-6.1-sol with low reasoning. Account-visible
model availability and allowance-only use are unverified. Sanitized desktop
metadata reports Plus and no credits; it does not prove a CrossSignal grant.

- subscription-auth.mjs provides pure PKCE/callback/identity/catalog helpers,
  tested with fixture keys and tokens. Real listener, trusted discovery/keys,
  credential storage and refresh lifecycle remain pending.
- subscription.mjs prepares stateless isolated requests from allowed synthetic
  observations/task/schema and current-run read-only queries/results. It rejects
  development messages, previous answers, supplied results, foreign scope and
  extra private fields. The model receives no native filesystem/network/shell/
  approval capability. Queries are recomputed against the accepted public tools.
- contracts.mjs, schemas.mjs, exposure.mjs, tools.mjs and task.md are byte-identical
  copies of accepted public Data contracts. Private/evaluator inputs are excluded
  from adapter imports and request bodies. Actual isolation probes are NOT_RUN.
- Fixture SSE inspection requires terminal completion, discards hidden reasoning,
  retains visible outputs and usage, distinguishes quota/incomplete/interruption
  failures, and never treats post-response checks as generation enforcement.
- callSubscription() blocks before credentials or dispatch. Caller flags cannot
  authorize an amendment or enable a fallback. No HTTP execution is claimed.
- All previous Gemini code, tests, prepared requests and evidence remain unchanged.
  Five previous current-stage files were copied byte-for-byte into
  chatgpt-subscription/prior-current before their current versions were updated.

Review packet: chatgpt-subscription/PROPOSAL.md, COMPATIBILITY.md,
CONTRACT_CHANGE_PROPOSAL.md, CONTRACT_REVIEW.md, ELIGIBILITY_OBSERVATION.json and
PREPARED_REQUESTS.json. The latter retains 15 exact public request bodies: five
single-shot, five tool-initial and five ten-query stress fixtures. Eager bodies
are 6108–6841 bytes; tool initial bodies are 7390 bytes; ten-query stress bodies
are 22940–25740 bytes. Actual provider tokens are unknown. No scored model answer
or grade is represented by these fixtures.

## Compatibility and pending decision

SIWC omits max_output_tokens; it cannot guarantee the accepted 1024 response,
6144 total generation or 8192 combined input/next-output token ceilings. Low
reasoning and client cancellation cannot replace those guarantees. The exact
contract proposal offers a distinct measured profile with a hard request-byte
ceiling and post-response token qualification/stop thresholds, explicitly allowing
overshoot and retaining failures. It is proposed, not applied or accepted.

Retaining the accepted hard bounds blocks subscription scoring. Accepting the
proposal requires an additive governed upstream amendment and Data compatibility
review with refreshed human acceptance/freshness before any frozen scored run.
No accepted Spec/Data output or hash has been rewritten. The owner's provider
choice and conditional request authority do not accept this different contract.

Other host limits are retained in configuration and the comparison, including
turns, tool attempts, rows, query length, concurrency, timeouts and no retries.
The durable loop, deadlines, ledger, exposure recording and route probes remain
unfinished; this packet establishes preparation, not a complete investigator.

## Checks and preservation

Offline commands ran 2026-10-01T16:41:28.609Z–2026-10-01T16:41:35.700Z
on v22.15.0, Windows x64. All 23 protocol/contract tests,
affected lint and both repository diff checks passed. Raw commands, timestamps,
exit codes and TAP are in chatgpt-subscription/OFFLINE_CHECKS.json. Data was
revalidated; no accepted evidence was regenerated. Full Build/A01/runtime/demo
checks were not run for this pure preparation; their evidence remains NOT_RUN.

PRESERVATION_BEFORE.json records raw file hashes before this provider replacement.
The final verifier requires all 3499 outer files unchanged and all 1326 original
product files unchanged except the exact five stage-current files whose prior
bytes are separately checked. All 1044 outer/366 product directories, junctions,
HEADs, branches, indexes and unrelated status entries must remain. This includes
118 archived A01 factory files, 477 A01 stored files, all 35 current Data files,
databases, append-only history, migrations, fixtures, evaluator sources and the
excluded trial receipt. No original item was deleted or relocated. New files are
restricted to this provider/test/preflight packet. No commit or seal was made.

## Complete Build remains unfinished

- accepted_1024_generation_cap_unsupported
- accepted_6144_total_generation_and_8192_combined_context_bounds_unenforceable
- contract_amendment_pending_human_review
- crosssignal_oauth_grant_and_client_eligibility_unverified
- selected_account_model_catalog_unverified
- subscription_allowance_only_and_zero_credit_settings_unverified
- pinned_tokenizer_and_route_compatibility_unverified
- Real OAuth listener/trusted discovery/protected credential storage and refresh lifecycle
- Durable bounded automated investigator, monotonic deadlines, ledger and isolation probes
- Frozen experiment/schedule, three baselines, all 50 retained artifacts and blinded adjudication
- One pre-registered development change with preserved initial and second-round results
- Separate exact human-approved SIMULATED intervention and observed outcome
- Required complete Build lint/build/A01 and affected regression checks before opening its gate

Stage 03 Process 1 says: "Require accepted/fresh Data and explicit provider/model/spend
conditions." Its human gate says: "A person reviews exact Build/VERIFY hashes."
The complete gate stays blocked/pending. Verification supports --preflight for
these offline checks and returns exit 2 by default because full Build proof is
absent. No later stage is advanced and no runtime human grant is synthesized.
Historical entry documents retain their hash-bound wording; this packet is the
current provider preparation.

## Declared input hashes

Factory-normalized hashes bind inputs below; raw bytes are checked separately.

| Input | SHA-256 |
| --- | --- |
| `factory/03_build/CONTEXT.md` | `83c60a835de9ff99ce853512409a92733a14c349af0626656743a6dc7ff05673` |
| `factory/03_build/verify.mjs` | `1994c5487707e285d61b390c9b23818290bbfdc766b642637a0ac6cb2e64b230` |
| `factory/03_build/subscription-preflight.mjs` | `137222151fb0d0b29515a6fe4c3f6063d99569279c97f0dd03d4e0da83dca323` |
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
| `db/benchmark` | `2c11e17278392735014711ae878916e75f6f5ab6995b7cfa37e9d3ef30d2c20c` |
| `tests/benchmark.test.mjs` | `bbf03624252793a9877561fb8762fe749c1ce076520d1c489578ea2659b6760b` |
| `tests/benchmark-subscription.test.mjs` | `22b80bd229e4cc5c27d7aed639a0d508acec5831151c40f1eea4ca9b52b4350d` |
| `factory/03_build/output/chatgpt-subscription/PRESERVATION_BEFORE.json` | `eb5a1b9957e28dd9114ba28a20d8954e586e2dd1745da3cadd08703de1dbb9f1` |
| `factory/03_build/output/chatgpt-subscription/prior-current` | `8dfb2d4102d8ae0e0af3341e40c30af5a101ceb124de14cdd1d3947e9cd52432` |
| `factory/03_build/output/chatgpt-subscription/PROPOSAL.md` | `0c6e80853a13ab48a51c88f3ac57caccb579d12d1861f801a3a7af4fd1d8b223` |
| `factory/03_build/output/chatgpt-subscription/COMPATIBILITY.md` | `39f0e1d63d84ea80b2125791e9334cfc8a87374bfa89f3b563a138e6fa6bd580` |
| `factory/03_build/output/chatgpt-subscription/CONTRACT_CHANGE_PROPOSAL.md` | `fb0726293476d13ce909ff042f9712e970c5ba2537c79395a66b9f3f8398651f` |
| `factory/03_build/output/chatgpt-subscription/CONTRACT_REVIEW.md` | `ff751860aa257bbbcd15f04662507cf3e3e3125326b91e476d614b378ed76d3a` |
| `factory/03_build/output/chatgpt-subscription/ELIGIBILITY_OBSERVATION.json` | `d6c68a6dcb39c0ab8b23700129f7a5e765318405a023cdd4074c439b9b25ca9b` |
| `factory/03_build/output/chatgpt-subscription/PREPARED_REQUESTS.json` | `86c547bb7f498ecf0e84c0d8727e29c13f9d13f4ab50299ce213588b571a1428` |
| `factory/03_build/output/chatgpt-subscription/OFFLINE_CHECKS.json` | `740bebf18d55756391d43f69912cc7bfc26b8fb1f586189d55c2f19ac2d1824c` |
