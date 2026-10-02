---
unit: a01-synthetic-revenue-investigation
stage: 03_build
status: ready-for-review
truth_mode: SIMULATED
prepared_at: 2026-09-26T17:57:48.577Z
---

# A01 Build — local investigation, approval and intervention

The user accepted the exact Spec and Data packages. This stage implements the
local deterministic lifecycle and leaves its own human gate open. The primary
review is the [checkout report](replay/checkout.md), its
[complete artifact](replay/checkout-1/artifact.json), and an
[unapproved operator preview](preview/preview.md).

## Run and review

One command from work/crosssignal-phase1:

```powershell
node --experimental-strip-types scripts/run-a01.mjs
```

Five comparisons each run twice in fresh child processes and separate SQLite
stores. A separate grader consumes the finished artifacts and its private
answer file. Reports, grades and full trace JSON are written to a new ignored
outputs/a01/replay-* directory; previous runs remain on disk. The logical
run-0001 identity is intentionally identical across the two independent replay
stores to test deterministic replay, not two dispatches in one durable run.
Interactive prepared Cases receive new run IDs.

For exact operator approval, run:

```powershell
node --experimental-strip-types scripts/a01-case.mjs prepare
```

The printed preview shows the proposed service/version rollback, zero-cost cap,
evidence, exact payload hash and approval command. inspect reloads that Case;
approve binds the displayed hash; resume recovers an already approved Case.
pause/unpause controls this local simulator. No action is taken by prepare.
The saved preview has no grant and no effect. Automated replay grants are
fixture_surrogate; no human runtime approval has been performed in this stage.

## Implemented surfaces and reuse

| Surface | Responsibility |
| --- | --- |
| db/a01/contracts.mjs and store.sql | Promote the accepted typed DATA boundaries and local append-only schema |
| db/a01/tools.mjs | Tenant/time bounded, paginated observable queries with exact response hashes |
| db/a01/investigator.mjs | Explicit deterministic baseline; three competing explanations, provisional ranking, falsification query, supported proposal or abstention |
| db/a01/analysis.mjs | Segment signal metrics and sufficient new-window recovery; rolling later observations can reopen the Case |
| db/a01/isolated.mjs | Fixed restricted investigator/tool process, stdin/stdout protocol; no evaluator or world imports |
| db/a01/runtime.mjs | Trusted operator host, durable query budget, trace chain, immutable proposal/grant, exact authority, transactional world/effect reservation and restart |
| scripts/a01-world.mjs | Private service-version/transaction mechanics; no grader-answer comparison |
| scripts/a01-case.mjs and run-a01.mjs | Local approval/inspection commands and separate replay/grader orchestration |
| tests/evaluator/a01/ | Evaluator-only truth, independent structured rubric and readable report |

Canonical hashing reuses db/revenue-leak.mjs. Exact execution authority and
citation/secret checks reuse db/flight-recorder-contracts.ts. Existing modules
are unchanged. The old Investigator, Mobile Safari response/checkout/outcome,
and existing replay scripts remain separate regression paths.

Initial observations are validated, canonicalized by timestamp/ID and frozen
by hash. Every query attempt is durably recorded before tool dispatch, including
failures, with at most ten attempts and three hypothesis revisions. Failed or
interrupted evidence calls end visibly with abstention rather than a blind
restart. Successful responses preserve query hashes and exact returned IDs.
The baseline ranks checkout, payment-provider and acquisition/mix explanations;
its provider-health query follows the provisional hypothesis and precedes the
final recommendation. Support text is treated as untrusted evidence.

The trusted host derives scope from the local Case and validates all proposal
fields. A fresh control-file read checks the local simulator's Global Pause
immediately before effect reservation; missing or malformed state fails closed.
Payload, context, policy, actor, nonce, expiry and prior attempts are rechecked
through the existing authority validator. One SQLite IMMEDIATE transaction
appends the effect reservation, changed world revision and confirmation.
A process exit before commit leaves none of that transaction; committed state
survives reopen. This adapter performs no external dispatch, so SQLite commit
recovery determines its outcome; it makes no general exactly-once network claim.
Observations and later reopening append history without rewriting resolution.

## Observable evidence

| Comparison | Result | Report |
| --- | --- | --- |
| Approved checkout rollback | One effect; affected windows recover to 190/200, Case resolved | [checkout](replay/checkout.md) |
| Approved unrelated rollback | One effect; affected windows stay 120/200, Case uncertain | [notifications](replay/notifications.md) |
| No intervention | Zero effects; affected windows stay 120/200, Case uncertain | [none](replay/none.md) |
| Limited evidence | Abstention; zero effects and no recovery | [limited](replay/limited.md) |
| Injected support text | No authority bypass; normal exact surrogate approval required | [injection](replay/injection.md) |

All five independently grade PASS for their designed mechanics. These are
five variants of one A01 incident, not five causally different incidents or an
accuracy benchmark. [Replay identities/hashes](replay-run.json) record two fresh
matching runs per variant. Copies of the first artifacts and all grade/report
outputs are retained here for review. Trace references resolve by event ID in
each artifact's timeline, evidence and tool-response arrays.

Fourteen [integrated tests](a01-tests.tap) and nineteen
[existing regressions](regression-tests.tap) passed. A focused
[grader tampering rerun](grader-tamper-tests.tap) additionally checks rehashed
irrelevant-but-existing citations and undeclared material claims. Deliberate
checks cover foreign/time/argument bounds, out-of-order and duplicate input,
missing/mismatched/manual/expired/mutated approval, Global Pause, double execution,
crash during reservation, reopening, missing observations, insufficient evidence,
failed-call budgets, injected content and changed cause/remedy/outcome/citations.

The actual restricted runtime denied reads of evaluator truth, world code,
Spec, an alternate traversal path, trusted host code and output/report location;
writes and child-process creation were denied. An injected synthetic evaluator
environment sentinel was not inherited. Exact files, not whole repository
directories, are on the runtime allowlist. The grader runs only after product
completion, with no feedback channel into investigation.

## Preservation and limitations

All 42 historical factory files still match their raw-byte preservation
manifest. Existing product/hosted surfaces and excluded receipt data have no
changes from the sealed baseline. The retained CLI cache also has its original
hash. No repository was replaced, no remote/hosted mutation was performed,
and existing TEST/LIVE data was not touched. The original uncommitted run
transition and reviewed artifacts are preserved.

This is a local CLI/readable-preview slice; the existing web app was not changed.
The actor is a trusted local operator, not a remote authenticated user. Node's
permission checks cover this fixed runtime; no arbitrary-code OS sandbox is
claimed. Hash chains establish consistency, not authenticity against an owner
rewriting all files. The independent rubric validates structured claims and
citation support; natural-language model quality is not evaluated.

No suitable local model was found in the limited PATH/default Ollama-manifest
checks. No model was downloaded or called. Model evaluation is NOT_RUN and
fullAiHiringProof is false in every grade. No actual Mobile Safari verification,
payment capture or real recovered revenue is established by these SIMULATED
results. Model integration/evaluation remains separate from deterministic proof.

## Next human gate

Review the complete report and unapproved preview, then accept or request
changes to this Build. AGENTS.md requires human acceptance before Stage 04
Verify. Build acceptance does not grant a rollback or accept later-stage work.
Stage 04/05 outputs remain absent. Current changes are uncommitted.

## Declared input roles

The stage contract, accepted upstream artifacts and shared references are
freshness dependencies. Existing modules are observed baselines. New product,
test and copied replay/preview evidence are stage-owned historical bindings.
The tables bind exact reviewed files using normalized-text SHA-256.

## Declared input hashes

| Input | SHA-256 |
| --- | --- |
| `factory/03_build/CONTEXT.md` | `ac359d97f61b2b1aa12498e373e921fe7f8e1452c56efe19db9ee7c6365f3774` |
| `factory/02_data/output/DATA_PACKAGE.md` | `2a3c7d8c5668eee58992284edbe0d14774ea6057a4a3991031816a39ab638eae` |
| `factory/02_data/output/HUMAN_GATE.md` | `d4d6b90656fd3e4244d4fd6adf997278cc438d5a8971ccc5c9983d7ba9a92537` |
| `factory/02_data/output/VERIFY.md` | `08fd239cf1eaecebb3ced35deb41dfcd4b25c1daf3b0e8d2cf5c3afc963d2986` |
| `factory/01_spec/output/SPEC.md` | `0f37074fcb86ec12e38bf51d4b4a1be8231206f7d463f60d67a51282ac510da5` |
| `factory/_shared/A01_DIRECTION.md` | `7a97909697409fff0f0ccb6ac58f812b54ccff11ed34d03cc4659051ba6dbb43` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `factory/_lib/verify-kit.mjs` | `b2c7434bf3acacbfb6323b33cf0b175f77d0e3b1d66aeadee6e9ea996c95015c` |
| `factory/_lib/factory-state.mjs` | `72870904445d54f01eea443ed5a5de1b2af2fd19df66e085a52bf47982594d28` |
| `factory/02_data/a01/contracts.mjs` | `8b77841481c500720797e0bea831eeb93d3c3f3842dd524010c4935b57d840cd` |
| `factory/02_data/a01/world.mjs` | `fb4418c81baf594da576df26a34fd3d8213605742627cc0631cff392261e3112` |
| `factory/02_data/a01/store.sql` | `62cef9c7e19194d8a01877cda7cf6cc1e7bf0b41f4a79f356943ddca58e44028` |
| `factory/02_data/a01/evaluator/truth.json` | `036540566b97ba5f07e87723b0df5f42b3494240204560dbaf8aa92820463940` |
| `factory/02_data/a01/observable/001.json` | `5f0908daeb35cbfffd039201452f9bfabf72181a6a9f61efdcee9ebb2ce84fd4` |
| `factory/02_data/a01/observable/002.json` | `98dc8a8406c300ada4d9de1b1e92162537e01e2632a7e8f7bbd678fbbe2113c7` |
| `factory/02_data/a01/observable/003.json` | `b78e8c829011cebfab2f42bb5406cd7b7b7a58ea997cd35a9cd70fe27af9c5ed` |
| `db/revenue-leak.mjs` | `a5b0c4891a44477d9d236ee9c00fa37a20dffa5ad21991215be96565ea1f22b2` |
| `db/case-investigator.mjs` | `f39ffdb2a1be45ca27dacab39eb888c01bd3f3ee34fb7f29e7ed17fb7e37e3c1` |
| `db/flight-recorder-contracts.ts` | `e6d61497b43979aeb8dd9154c49aec7a04949a8db22ea30107dd82c05f796192` |
| `scripts/run-golden-case-replay.mjs` | `8c45e2033c2b0e105065d8a8c4ecb41276ec928cf3f3a4d62a208b4793cfe797` |
| `db/a01/contracts.mjs` | `85ba1e5637da4a9e64d3271c97e0c1a88c6c4dabde5b54965f223f60977a1270` |
| `db/a01/analysis.mjs` | `dc14d941c7a9014723541f43c2d578e384cfe85f133d1c41d3ee56cab02e94a8` |
| `db/a01/tools.mjs` | `b70012e358ab8bab0a0ebee29b070137d413831d4586440bb3d634767dd55ab2` |
| `db/a01/investigator.mjs` | `a497a22c6675365285f077dc1d52994103647b6735ee228a3991fbacb1b841bf` |
| `db/a01/isolated.mjs` | `806ceb1c12fd2ff2e0c97eb0e15da50aa95da6431b3685aff5ee984cc2f8e920` |
| `db/a01/runtime.mjs` | `77f5c841f27a654ee222dfd6cce5591c6f3af577374099e7b80813d9cc49401c` |
| `db/a01/store.sql` | `ee9d8f9903f1a710acbe69158d772b43b17a3a8dbd43ee16c0ec4163a34d5691` |
| `scripts/a01-world.mjs` | `5918ea89403cb6cb5a7e6bfbcc5c10c62429807375f9a31600169b5237a8c42d` |
| `scripts/a01-case.mjs` | `9381635873ba12ac16e6cb6fad424a2d5090147d2953883b30a2bddb4432c91e` |
| `scripts/run-a01.mjs` | `90441ca63b033f3122b2e6c8a95a5acc31a41f0484c0fc330eaddc810be661a9` |
| `tests/a01.test.mjs` | `a779f75cd02c4766443b339003c9903b2475e9d4dd8165971df4d60664e8e087` |
| `tests/evaluator/a01/grade.mjs` | `8c2d284f99c6b2bd78e2e2f88bd1a73696b5eee722dedcb9bd2839e55782d800` |
| `tests/evaluator/a01/truth.json` | `036540566b97ba5f07e87723b0df5f42b3494240204560dbaf8aa92820463940` |
| `package.json` | `a3e13c18962d9b5b1f4d68bf7114921e479ac240189918663e0960dec19d4274` |
| `tests/golden-case-replay.test.mjs` | `b2ccfa374ed845bbc936ba1f6b470a5f4f38608bd8918308663d9111ccc3e8f8` |
| `tests/case-scenario-matrix.test.mjs` | `59dc6bf4db827ac8f246e0ef6be596de249259d940a0f500f4813adb78c32398` |
| `tests/case-investigator.test.mjs` | `6287e385b207227e016a5ad0b72c48b7be5a263d5514cec19b8cb3fb9c818a15` |
| `tests/case-response.test.mjs` | `4d89d998ec12f94e8c09b65a10c81093c689bb99246b08a46b2f0ace15aa0d5e` |
| `tests/case-outcome.test.mjs` | `a8cdf6d602f37c750e86ee95e43bc4d246da84c632c2950dced85ad6cf6775c0` |
| `tests/case-checkout.test.mjs` | `4f8fbfb6cb31ca0aee36e8877f46f30a045d93537f60fbda274726048069a9f4` |
| `tests/case-simulation-outcome.test.mjs` | `a438d027c9fcc7f91a906b5fda79c590c2fb0d8303aadd7c96fce95ff0e2f1b5` |
| `factory/03_build/output/a01-tests.tap` | `9bf942fd3c6aa4bbdbf8d9fb00f8f63e3fd933ff2993dc341f417765211a6ff6` |
| `factory/03_build/output/grader-tamper-tests.tap` | `d5a3108f192e129173486dcc0d3fae5e81c5cf9b510c5bd8efa8b115e209ece3` |
| `factory/03_build/output/regression-tests.tap` | `3e0148915af84b6188a6e556f34e6225d629137dc8762a31f8ecae7d0a30a855` |
| `factory/03_build/output/replay-run.json` | `e66f6e3674e3ebf9e0c6fa69424a1954116f2157178cbd924bdd6c40c377dff3` |
| `factory/03_build/output/replay/checkout-1/artifact.json` | `6cd2f8547c00e8016d514327807e7f38fcb07e4241130f64bd03ec07a637667d` |
| `factory/03_build/output/replay/checkout.grade.json` | `72618c9c83d477da87d73858d04bc026906f639d91cad1ef70fb9e361492dbc4` |
| `factory/03_build/output/replay/checkout.md` | `6583da1e2aebd1aa1db1c2a7db1fb12b6f51f4fd71e95c0d4eb6bd55f6238b53` |
| `factory/03_build/output/replay/notifications-1/artifact.json` | `50033daf73311a0171034793a4e1377c0e514e6ec258812fb0b19b10a6f277c3` |
| `factory/03_build/output/replay/notifications.grade.json` | `0222d1b05405cec7cd85f2621f72642a676bcb55cf3569a201afa0e28f7350a5` |
| `factory/03_build/output/replay/notifications.md` | `6659b6474c6b81e185779133ad1776c4301e94121e0d4c39cf18099dd7e474b1` |
| `factory/03_build/output/replay/none-1/artifact.json` | `778096df08cfdb6a4ee496a6160ace986149a282d5aa2625d58e0ad9fd1008e7` |
| `factory/03_build/output/replay/none.grade.json` | `fc69e37614d38da42821653282977498563cc17f80552a3c947fc0c8a990285f` |
| `factory/03_build/output/replay/none.md` | `eada01183b273ae2346d2531d0e7555681909c5b80e45088b84ead22c8097419` |
| `factory/03_build/output/replay/limited-1/artifact.json` | `6dfee498582122ff7cc57763396e0c1e7adc31399fc870b7dd3f15d6e0123b5a` |
| `factory/03_build/output/replay/limited.grade.json` | `619faf980ced72d5b5338f8ec6cced606a101792e5736a161209ad4ebe2b5e30` |
| `factory/03_build/output/replay/limited.md` | `9265f9659d262215fa101c2d83fd39eb4b310d76f7f54969d2db2d666db86872` |
| `factory/03_build/output/replay/injection-1/artifact.json` | `56c2923a6f8ae49c16756635e01261e3291135fa792c07b29e62ed549ddc71cc` |
| `factory/03_build/output/replay/injection.grade.json` | `d8b7a999a5f4bdab35dd042832eabf9b4cae2844d79d1e91612f0f46be66f5ba` |
| `factory/03_build/output/replay/injection.md` | `acecb27f58ce1aa6288b7c99135dc1911b27f54a59078813e270e2523b53b19f` |
| `factory/03_build/output/preview/preview.md` | `7ff6a0d33fd5a2f0482af4992fe305378a1bd2a47a59acf5b01d8dafe39bbf27` |
| `factory/03_build/output/preview/proposal.json` | `077c48afc471172e4d50861bb02a36eb42659d5927dbe474182ff2221e19f4a3` |
| `factory/03_build/output/preview/artifact.json` | `f59217a195488a2964afd6e5d2faa7df80fa1fa7f36cfb1af0eb68da5bc1b1ec` |
