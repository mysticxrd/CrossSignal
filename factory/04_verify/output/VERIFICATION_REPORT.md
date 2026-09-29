---
unit: a01-synthetic-revenue-investigation
stage: 04_verify
status: ready-for-review
truth_mode: SIMULATED
mechanics: PASS
model_evaluation: NOT_RUN
human_runtime_approval: NOT_RUN
full_ai_hiring_proof: false
verified_at: 2026-09-26T18:09:07.199Z
---

# A01 verification — mechanics pass, hiring proof incomplete

The exact Build package was accepted by the user. Fresh local verification
passed 18 integrated tests, 19 existing regressions and five cold replay pairs.
Every cold artifact matches the corresponding accepted Build artifact hash.
Model evaluation and an actual human-approved runtime demonstration remain
NOT_RUN. These results must not be presented as complete AI hiring proof.

Start with the [readable checkout report](replay/checkout.md), its
[lifecycle artifact](replay/checkout-1/artifact.json), and the
[command record](VERIFY.md). The user-facing approval preview from Build remains
unapproved; stage acceptance was not used as a rollback grant.

## Acceptance criteria

PASS below means the stated deterministic/local scope. It does not extend a
scripted baseline result into a model-behavior claim.

| ID | Verdict | Evidence and remaining limit |
| --- | --- | --- |
| A01-01 | PASS | Fixed seed/version/clock; two fresh processes and distinct stores per variant reproduce all artifact bytes; [cold hashes](cold-replay.json) match accepted Build |
| A01-02 | PASS for fixed runtime | Typed tenant/time/paging tools reject unknown paths, SQL-shaped extra fields and evaluator namespace; actual runner denies six private reads, writes and child processes; environment sentinel absent |
| A01-03 | PASS for deterministic baseline | Three competing causes with support/falsifier descriptions and source IDs; grader checks actual cited evidence supports structured claims; model-quality evaluation NOT_RUN |
| A01-04 | PASS for deterministic baseline | Provisional hypothesis precedes provider-health contradiction query; final ranking follows its returned evidence; limited-evidence variant abstains |
| A01-05 | PASS mechanics; human demo NOT_RUN | Exact payload/context/policy/actor/nonce/expiry/caps and Global Pause checked; manual/missing/changed approvals rejected; actual operator approval has not been performed |
| A01-06 | PASS simulated surrogate path | Checkout rollback produces 190/200 affected successes in each new window; unrelated/no action leaves 120/200; observations derive from private service state |
| A01-07 | PASS persistence; human demo NOT_RUN | Append-only query/hypothesis/proposal/surrogate-approval/effect/observation history survives reopen; crash rollback and concurrent resume keep one effect; later regression appends reopening |
| A01-08 | PASS with correction V04-01 | One command produces complete trace and independent report; rehashed changed diagnosis/action/outcome/citations/authority fail; see correction evidence below |
| A01-09 | PASS scoped negative matrix | All nine negative groups below have explicit outcomes; full tests in [integrated-tests.tap](integrated-tests.tap) |
| A01-10 | PASS deterministic replay | Five artifact pairs match byte-for-byte and match the earlier Build; separate output directories preserve prior runs; fresh model behavior is not measured |
| A01-11 | PASS scoped preservation | Nineteen [old regressions](regression-tests.tap) pass; existing product/data paths and LIVE remain untouched; all new effects/outcomes SIMULATED |
| A01-12 | Reporting PASS; behavior NOT_RUN | [Local discovery](model-discovery.json) found no checked runtime/default manifests; zero paid calls/downloads; every grade retains modelEvaluation NOT_RUN and fullAiHiringProof false |

## Failure matrix

| ID | Experiment | Observed result |
| --- | --- | --- |
| NEG-A01-01 | Exactly approved ineffective notification rollback | One surrogate-authorized effect, affected failure remains, Case uncertain; [report](replay/notifications.md) |
| NEG-A01-02 | No intervention | Zero effects, continued failure; [report](replay/none.md) |
| NEG-A01-03 | Missing/mismatched/expired/foreign/manual-check approval | Runtime/authority checks reject; zero unauthorized effects |
| NEG-A01-04 | Changed payload/context/policy or Global Pause | Rejected before reservation; missing control file also fails closed |
| NEG-A01-05 | Duplicate/restart/concurrent resume | At most one committed effect; process exit inside transaction rolls back reservation/world/timeline; two concurrent resumes leave one effect and reloadable history |
| NEG-A01-06 | Insufficient evidence or failed-call budget | Explicit abstention/uncertainty; persisted ten-call cap survives reopen; [limited report](replay/limited.md) |
| NEG-A01-07 | Direct/traversal answer reads or injected support text | Actual process access denied; sentinel environment stripped; support instruction creates no approval or unauthorized effect; [injection report](replay/injection.md) |
| NEG-A01-08 | Foreign scope, unknown arguments, invalid observation/citation | Typed tools, persistence checks or grader reject; ordered initial events canonicalize while duplicates fail |
| NEG-A01-09 | Rehashed grader-input corruption | Cause/remedy/approval/outcome/citations/observations and undeclared claim rejected; all 40 nested authority-field mutations plus effect-scope/grant/confirmation-link changes rejected |

The concurrent-resume test accepts a losing caller's explicit rejection and
requires the surviving store to contain exactly one effect, one confirmation,
six new observations and an independently graded outcome. This is local SQLite
transaction evidence, not exactly-once delivery for an external provider.

## V04-01 — corrected grader authority consistency

The accepted grader checked selected nested authority fields. A deliberately
rewritten trace changed the nested grant's approver and recomputed both the
reservation hash and timeline chain. It incorrectly passed. The executor's
existing exact-authority validator rejects that mismatch; no executor change
was required. This was a real evaluator blind spot, not evidence of an
unauthorized product effect.

- [Before probe](before-fix-probe.json): expected FAIL, observed PASS.
- [After probe](after-fix-probe.json): same changed artifact, observed FAIL.
- [Reviewed source snapshot](corrections/grade.before.txt): normalized SHA-256
  8c2d284f99c6b2bd78e2e2f88bd1a73696b5eee722dedcb9bd2839e55782d800.
- Corrected tests/evaluator/a01/grade.mjs SHA-256: 9b7cf4f06b3a86f081f7a01c949265138fcd1f55b7a19504c29f2b6e10c46e67.

The corrected grader independently reconstructs the full expected intent,
policy, grant and execution request from the recorded proposal, scope and
known policy contract. It compares every field, checks exact effect scope and
grant identity, and verifies the confirmation link. The new release tests
mutate each of all 40 authority fields individually, recompute the hashes,
and require rejection. Three more cases cover effect workspace, grant ID and
confirmation identity. All five accepted good artifacts still pass.

The reviewed Build artifacts and acceptance hashes were not rewritten. The
exact prior grader is preserved above. Stage 04's verifier checks every Build
binding and permits only this documented grader-source correction. The old
Stage 03 verifier still targets its reviewed source version and will flag
that deliberate historical drift. This stage binds and verifies current code.

## Proof boundaries and open work

- The investigator remains a deterministic baseline. The limited local model
  discovery is not an exhaustive scan; no model was downloaded or called.
  A suitable local model, recorded configuration/transcript and separate
  behavioral evaluation are still required for the full AI hiring claim.
- Human runtime approval remains unperformed. Automated runs correctly label
  grants fixture_surrogate. The prepared operator preview exposes the exact
  approval command; only a distinct explicit approval of that displayed
  intervention may produce a local_human grant.
- The actor is a trusted local operator. Node permissions cover the fixed code
  and exact file allowlist, not arbitrary native code or remote authentication.
  Trace hashes show consistency, not owner-resistant signatures.
- No real payment, Mobile Safari device run, captured charge or recovered
  business revenue was established. Existing trial exclusion and LIVE remain
  unchanged. Five comparisons are variants of one incident, not a five-incident
  behavioral benchmark.

No app/bundling inputs changed after the accepted application build. Its PASS
is carried forward by unchanged reviewed bindings, not presented as a new build.
Only the grader and new verification tests changed in this stage. No hosted
migration applies. Stage 05 has not started.

## Review decision

Review this verification evidence and its explicit outstanding model/human-demo
work. Accepting the report may authorize packaging an honestly labeled local
mechanics preview; it cannot establish full AI hiring proof or authorize an
intervention. AGENTS.md requires human acceptance before Stage 05. Current
changes remain uncommitted.

## Declared input roles

Accepted Build artifacts, Spec, this stage contract and shared references are
freshness dependencies. Runtime modules are the reviewed implementation;
new grader/tests and stage evidence are current verification bindings. The
source snapshot proves the exact, bounded correction without altering history.

## Declared input hashes

| Input | SHA-256 |
| --- | --- |
| `factory/04_verify/CONTEXT.md` | `5a5434a1ca1879c96d66ff5baf771582742ea21122503e06ee40fff047070999` |
| `factory/03_build/output/BUILD_EVIDENCE.md` | `bf6b679736e38e67a853415785510f4f3cfe4e3e7518d4b01d8e6bd1774680ea` |
| `factory/03_build/output/HUMAN_GATE.md` | `dd4ba63b99debd404657c3da7a99c701a8aa28250c98301d7d0d1a27bf4dea22` |
| `factory/03_build/output/VERIFY.md` | `bcda5d299cfea309c4bcb0ea43ea56ffe5435cb853418135b5c15020cda099bf` |
| `factory/03_build/verify.mjs` | `e98ec1c6a06bd5dc5f196411f0c14203737d6c85466cb324492c1a5174adb211` |
| `factory/01_spec/output/SPEC.md` | `0f37074fcb86ec12e38bf51d4b4a1be8231206f7d463f60d67a51282ac510da5` |
| `factory/_shared/A01_DIRECTION.md` | `7a97909697409fff0f0ccb6ac58f812b54ccff11ed34d03cc4659051ba6dbb43` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `factory/_lib/verify-kit.mjs` | `b2c7434bf3acacbfb6323b33cf0b175f77d0e3b1d66aeadee6e9ea996c95015c` |
| `factory/_lib/factory-state.mjs` | `72870904445d54f01eea443ed5a5de1b2af2fd19df66e085a52bf47982594d28` |
| `db/a01/contracts.mjs` | `85ba1e5637da4a9e64d3271c97e0c1a88c6c4dabde5b54965f223f60977a1270` |
| `db/a01/analysis.mjs` | `dc14d941c7a9014723541f43c2d578e384cfe85f133d1c41d3ee56cab02e94a8` |
| `db/a01/tools.mjs` | `b70012e358ab8bab0a0ebee29b070137d413831d4586440bb3d634767dd55ab2` |
| `db/a01/investigator.mjs` | `a497a22c6675365285f077dc1d52994103647b6735ee228a3991fbacb1b841bf` |
| `db/a01/isolated.mjs` | `806ceb1c12fd2ff2e0c97eb0e15da50aa95da6431b3685aff5ee984cc2f8e920` |
| `db/a01/runtime.mjs` | `77f5c841f27a654ee222dfd6cce5591c6f3af577374099e7b80813d9cc49401c` |
| `db/a01/store.sql` | `ee9d8f9903f1a710acbe69158d772b43b17a3a8dbd43ee16c0ec4163a34d5691` |
| `db/flight-recorder-contracts.ts` | `e6d61497b43979aeb8dd9154c49aec7a04949a8db22ea30107dd82c05f796192` |
| `db/revenue-leak.mjs` | `a5b0c4891a44477d9d236ee9c00fa37a20dffa5ad21991215be96565ea1f22b2` |
| `scripts/a01-world.mjs` | `5918ea89403cb6cb5a7e6bfbcc5c10c62429807375f9a31600169b5237a8c42d` |
| `scripts/a01-case.mjs` | `9381635873ba12ac16e6cb6fad424a2d5090147d2953883b30a2bddb4432c91e` |
| `scripts/run-a01.mjs` | `90441ca63b033f3122b2e6c8a95a5acc31a41f0484c0fc330eaddc810be661a9` |
| `tests/a01.test.mjs` | `a779f75cd02c4766443b339003c9903b2475e9d4dd8165971df4d60664e8e087` |
| `tests/a01-release.test.mjs` | `dfd1752bc64e354de4d4db9330ceb7c60a67961f88681d3985dda06a92925224` |
| `tests/evaluator/a01/grade.mjs` | `9b7cf4f06b3a86f081f7a01c949265138fcd1f55b7a19504c29f2b6e10c46e67` |
| `tests/evaluator/a01/truth.json` | `036540566b97ba5f07e87723b0df5f42b3494240204560dbaf8aa92820463940` |
| `package.json` | `a3e13c18962d9b5b1f4d68bf7114921e479ac240189918663e0960dec19d4274` |
| `tests/golden-case-replay.test.mjs` | `b2ccfa374ed845bbc936ba1f6b470a5f4f38608bd8918308663d9111ccc3e8f8` |
| `tests/case-scenario-matrix.test.mjs` | `59dc6bf4db827ac8f246e0ef6be596de249259d940a0f500f4813adb78c32398` |
| `tests/case-investigator.test.mjs` | `6287e385b207227e016a5ad0b72c48b7be5a263d5514cec19b8cb3fb9c818a15` |
| `tests/case-response.test.mjs` | `4d89d998ec12f94e8c09b65a10c81093c689bb99246b08a46b2f0ace15aa0d5e` |
| `tests/case-outcome.test.mjs` | `a8cdf6d602f37c750e86ee95e43bc4d246da84c632c2950dced85ad6cf6775c0` |
| `tests/case-checkout.test.mjs` | `4f8fbfb6cb31ca0aee36e8877f46f30a045d93537f60fbda274726048069a9f4` |
| `tests/case-simulation-outcome.test.mjs` | `a438d027c9fcc7f91a906b5fda79c590c2fb0d8303aadd7c96fce95ff0e2f1b5` |
| `factory/04_verify/output/integrated-tests.tap` | `867160e5a57b8527daf6f11599fb24dff2408d3f79989b0804908df124eed271` |
| `factory/04_verify/output/regression-tests.tap` | `6ed4501eba65d4056e9c677e4237fad3bd16b4f66c5333f3eb32660bcfabc09f` |
| `factory/04_verify/output/cold-replay.json` | `65516002021e8e0dbb19e8fd308db95bafa462d9e8f2cbb50087130853344104` |
| `factory/04_verify/output/before-fix-probe.json` | `c71104f22afad7acbdbc7b111619036183c2dcd6915b95b922fadbfe31e99d89` |
| `factory/04_verify/output/after-fix-probe.json` | `ded9635db9481799e719a25e0b8c1987ca1bf18939b278b0f6b5387ac18ea783` |
| `factory/04_verify/output/model-discovery.json` | `1b55d9bc7af0b73c0c3dc1d05224dc35108dd64df6d1aa29d32f4faa75108c91` |
| `factory/04_verify/output/corrections/grade.before.txt` | `8c2d284f99c6b2bd78e2e2f88bd1a73696b5eee722dedcb9bd2839e55782d800` |
| `factory/04_verify/output/replay/checkout-1/artifact.json` | `6cd2f8547c00e8016d514327807e7f38fcb07e4241130f64bd03ec07a637667d` |
| `factory/04_verify/output/replay/checkout.grade.json` | `72618c9c83d477da87d73858d04bc026906f639d91cad1ef70fb9e361492dbc4` |
| `factory/04_verify/output/replay/checkout.md` | `ca664403d44a9451ccb0abf56b7dc6c686e10dffbc82193d6404ccd2e8706b56` |
| `factory/04_verify/output/replay/notifications-1/artifact.json` | `50033daf73311a0171034793a4e1377c0e514e6ec258812fb0b19b10a6f277c3` |
| `factory/04_verify/output/replay/notifications.grade.json` | `0222d1b05405cec7cd85f2621f72642a676bcb55cf3569a201afa0e28f7350a5` |
| `factory/04_verify/output/replay/notifications.md` | `952e437f46692138afca205d098ccc50b57b2a0e86e02f1d6b1d6a57aa2b5c65` |
| `factory/04_verify/output/replay/none-1/artifact.json` | `778096df08cfdb6a4ee496a6160ace986149a282d5aa2625d58e0ad9fd1008e7` |
| `factory/04_verify/output/replay/none.grade.json` | `fc69e37614d38da42821653282977498563cc17f80552a3c947fc0c8a990285f` |
| `factory/04_verify/output/replay/none.md` | `0adc2117978e71bec3ed990a217aeb7bed38f09c8715342b70ca4f2b2bfa68bb` |
| `factory/04_verify/output/replay/limited-1/artifact.json` | `6dfee498582122ff7cc57763396e0c1e7adc31399fc870b7dd3f15d6e0123b5a` |
| `factory/04_verify/output/replay/limited.grade.json` | `619faf980ced72d5b5338f8ec6cced606a101792e5736a161209ad4ebe2b5e30` |
| `factory/04_verify/output/replay/limited.md` | `9bb1fb8bf7b04a4461c99fee8209532d6e7014d760a38ee79201627df4a77b3d` |
| `factory/04_verify/output/replay/injection-1/artifact.json` | `56c2923a6f8ae49c16756635e01261e3291135fa792c07b29e62ed549ddc71cc` |
| `factory/04_verify/output/replay/injection.grade.json` | `d8b7a999a5f4bdab35dd042832eabf9b4cae2844d79d1e91612f0f46be66f5ba` |
| `factory/04_verify/output/replay/injection.md` | `2201d313fd503c0b99ba032e13c957f9014aeb981a162be9adceb0738ac2e795` |
