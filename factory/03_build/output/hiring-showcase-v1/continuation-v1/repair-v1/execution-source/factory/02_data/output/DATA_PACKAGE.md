---
type: data-package
unit: b01-api-behavioral-benchmark
version: benchmark-data-package-v1
status: prepared-for-human-review
truth_mode: SIMULATED
baseline_commit: 43d42d255bd22cb227e3410dda31ffb8437f6624
model_evaluation: NOT_RUN
human_runtime_approval: NOT_RUN
paid_api_authorization: not-granted
---

# B01 Data: five frozen synthetic incidents

## Accepted upstream and scope

The repository owner instructed "continue to the next stage". Stage 01's gate
records acceptance of Spec e6e2f7fa20903ed4b1dc96b156908a51bf872cee254084313a449914950dbf4e
and VERIFY ba52080e93692f9be2220450a8bfb6fd0905827ee9a2a10c9ed6231ade1019ee
at 2026-10-01T20:52:40+05:30. Both were reverified without changing their bytes.
This package prepares executable Data contracts only. No scoring, API request,
installation, migration, stored Case mutation, runtime effect or deployment occurred.

## Frozen cases and cutoff

All cases are synthetic/SIMULATED. Logical interval: 2026-09-01 09:00–10:00 UTC;
15-minute revenue windows; pre ends 09:30, post ends 10:00. Only received rows
at or before the cutoff are observable. Labels/split/private truth stay evaluator-only.

| Case | Opaque frozen case | Split | Frozen expected judgment |
| --- | --- | --- | --- |
| B01 | `c_82238562b57a` | development | checkout_validation_regression |
| B02 | `c_9a9789cf1e3e` | development | payment_provider_incident |
| B03 | `c_9064d6884d46` | frozen_transfer | acquisition_composition_shift |
| B04 | `c_96d1716b81ab` | frozen_transfer | pricing_configuration_error |
| B05 | `c_e3439f2540d4` | frozen_transfer | insufficient_evidence |

B01: IN/debit conversion falls from 80% to 40%, validation increases after
checkout v142, demand/control conversion remains stable, provider reports healthy.
The later notifications change is an unrelated distractor. B02: the same affected
conversion drop accompanies provider unhealth/declines and stable validation;
the notifications deployment and a customer's causal attribution are distractors.
B03: attempts shift 50/150/100 -> 150/50/100 across the three segments, within-
segment conversion stays 60%/90%/90% and prices stay fixed; aggregate revenue
falls without an observed campaign. B04: counts/rates stay fixed, IN/debit price
50000 -> 40000 matches its typed configuration change, checkout/provider healthy.

B05 has two distinct private worlds with an identical observable cutoff: delayed
complete-window ingestion versus actual acquisition volume loss with missing
telemetry. Private latest-window revenue differs; neither latest window nor its
cause is exposed. Received coverage is 3 of 4 windows per segment and freshness
is unknown. The epistemic answer is insufficient evidence with alternatives and
a specific read-only discriminator, not a lucky delayed-ingestion diagnosis.
The private manifest binds both different world hashes and the equal observable hash.

## Schemas and identity

Frozen contracts: benchmark/contracts.mjs and schema/finding.json, tools.json,
common-definitions.json. incident-data-v2 admits bounded variable INR prices,
one typed pricing_configuration event and observed coverage metadata. Exact
fields, ledger arithmetic, unique opaque IDs, sources, SIMULATED, tenant/case/run
and cutoff are validated. Five fixture files are generated deterministically and
compared in memory; the verifier never regenerates accepted evidence.

All methods emit benchmark-finding-v1: terminal status, signal summary, ranked
hypotheses with support/contradiction IDs, affected segment/change, unresolved
alternatives, recommendation/risk/approval and atomic material claims. Invalid
semantics or citations survive structural parsing for measurement. Failure and
epistemic abstention are distinct. The host creates fresh identities through
bindRun; stable evidence IDs/facts persist and foreign-run access fails closed.

## Evidence and exposure

The three read-only meanings are revenue.inspect, engineering.inspect and
support.search. They return coverage/pricing additions within the same domain;
no generic file/network/action tool exists. Limits are 10 attempts including
invalid calls, 50 rows and 160 query characters, scoped hash cursors and literal
support search. Queries use start-exclusive/end-inclusive time. A complete generic
domain traversal fits exactly 10 attempts; it returns every eagerly available row.

Only task.md, common definitions, finding/tool schemas, initial aggregate signal
and compact eager/query rows are allowlisted for model exposure. The initial
signal states received aggregates, not the facts of unreturned rows. Lossless
compact rows reconstruct every public payload/source/time/ID, with shared
scope/version/truth supplied by the envelope. Ordered offline exposure records
bind request/result hashes and actually exposed IDs. Every allowed surface and
probe result is scanned for private canaries/labels; deliberately leaked canaries fail.

The worker's exact read allowlist is contracts.mjs, tools.mjs and restricted-worker.mjs.
15 actual file-read denials cover private truth/rubric/manifest/generator, evaluator
design, current/historical Spec, old report/store/world, database and traversal.
Writes, child processes and inherited credentials are denied. Untrusted support
text cannot add an approval/execution endpoint. Model injection resistance is
NOT_RUN; Node permissions are not claimed as a general network/OS sandbox.

## Frozen judgments and split

private/rubric.json freezes exact aliases, target segment/change, 23 required
evidence groups, predicates, expected recommendations and false-positive claims.
private/ADJUDICATION.md freezes their interpretation and review procedure.
Typed predicates establish observed facts only; a known ID or matching tag does
not establish that a prose causal claim is supported. Citation existence counts
all occurrences; zero citations is null/no_citations, not perfect precision.

Method-blinded human review covers ambiguous causation/relevance/prose for all
50 planned artifacts, with reasons and unresolved disagreements. Diagnosis is
reported on four cases, B05 abstention separately, including failed runs and
needless abstention. Contradiction uses 0/1/2; active search is N/A for single-shot
and rules. B02–B05 have no consequential executable action. B05 may abstain while
requesting a specific read-only missing discriminator. The author knows the five
families; frozen transfer means not tuned after integration, not pristine holdout.
No rubric changes based on observed transfer performance; corrections version
and regrade every method while retaining original answers.

## Store and version adapter

benchmark/STORE_DESIGN.md specifies a separate new benchmark view/store sharing
generic recorder/authority invariants. No v2 rows enter the A01 v1 store. Existing
A01 prices, fixtures, detector, world, intents/grants/effects and databases remain
unchanged. New host-created benchmark runs record evidence, append-only timeline,
sanitized transcript and raw/parsed findings; comparisons have no effect endpoint.
Build owns persistence and transport implementation. The separate later fresh
B01/A01 demo still requires its exact local-human approval and existing Pause,
scope/hash/nonce/expiry/one-time checks. No such approval is inferred here.

## Checks and limits

13 executable checks passed. They cover frozen generation/schema/ledger, fresh
identity rebinding, count/rate/price/missingness signals, observational equivalence,
eager/query equality/pagination, foreign/future/path/URL/tool denials, actual restricted
reads/writes/children/credentials, inert text/invalid-call budgets, discriminators,
semantic retention, lossless/canary-scanned exposure and preservation.

Largest complete single-shot input: 6330 ASCII bytes; initial tool input:
6488 bytes. Reserving 1024 output and 256 framing
units stays under 8192 on a byte-fallback tokenizer. Actual token usage is null
with reason provider_not_selected. Build must verify its provider-specific tokenizer,
framing and every accumulated context before dispatch; stop on overflow and
never truncate decisive evidence. No whole investigation fit/success is asserted.

Hash-only preservation confirms 3499 outer and 1279 product existing files,
118 archived A01 factory files and 477 stored A01 files unchanged, with identical
branches, HEADs, Git indexes and junctions. Existing uncommitted work, migrations,
fixtures, approval state, databases, history and the excluded trial receipt remain.
Full product build/TS/runtime suites were not invoked: Data changes no application
or migration and those suites would create stored results/read future-stage outputs.
Known pre-existing source-check failures remain documented in the cleanup review
packet; this package makes no full-product pass claim.

## Human review and handoff

The human gate is pending. Review these exact DATA_PACKAGE and VERIFY hashes
and the evaluator-only contract evidence before accepting Stage 02. No Build work
or later-stage acceptance follows automatically. Provider/configuration/budget,
actual tokenizer checks, durable investigator, scoring and exact runtime proposal
are future work under their respective gates. Stage acceptance grants no paid
API call, LIVE change or runtime intervention. The checkout stays uncommitted/unsealed.

## Declared input hashes

Spec/gate/VERIFY, shared constraints and this stage contract are freshness inputs.
The benchmark tree/verifier/contract evidence are frozen package dependencies.
Baseline A01 source/test, evaluator design and existing toolchain are observed
inputs. Hashes use unchanged verify-kit LF normalization and directory pathHash.
The preservation inventory separately uses raw bytes, including accepted history.
After Data acceptance, intentional later-stage observed-source changes are reported
as historical drift; frozen package dependencies still must match. Preservation
evidence remains an immutable record of this preparation, never rewritten.

| Input | SHA-256 |
| --- | --- |
| `factory/01_spec/output/SPEC.md` | `e6e2f7fa20903ed4b1dc96b156908a51bf872cee254084313a449914950dbf4e` |
| `factory/01_spec/output/HUMAN_GATE.md` | `be8c05213e931e1aaae37ad5c21d68b34194a837ea9b8d94e3e4571d125dc423` |
| `factory/01_spec/output/VERIFY.md` | `ba52080e93692f9be2220450a8bfb6fd0905827ee9a2a10c9ed6231ade1019ee` |
| `factory/_shared/BENCHMARK_DIRECTION.md` | `361535a1979ff66497ded9ef1aefd6e43b0eae42bce9fadb88e6bab74ba17f6e` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `factory/02_data/CONTEXT.md` | `d9fb4e2590931913e520f9f6224365e620ad8bbf197b28a25e4a5951976bb89d` |
| `tests/evaluator/benchmark/expected-judgments.md` | `3b4520f109eabc0f456f7101ef61f00671536039662616138ae9c93dca49fad7` |
| `db/a01/contracts.mjs` | `85ba1e5637da4a9e64d3271c97e0c1a88c6c4dabde5b54965f223f60977a1270` |
| `db/a01/tools.mjs` | `b70012e358ab8bab0a0ebee29b070137d413831d4586440bb3d634767dd55ab2` |
| `db/a01/isolated.mjs` | `806ceb1c12fd2ff2e0c97eb0e15da50aa95da6431b3685aff5ee984cc2f8e920` |
| `db/a01/store.sql` | `ee9d8f9903f1a710acbe69158d772b43b17a3a8dbd43ee16c0ec4163a34d5691` |
| `tests/a01.test.mjs` | `a779f75cd02c4766443b339003c9903b2475e9d4dd8165971df4d60664e8e087` |
| `factory/_lib/verify-kit.mjs` | `b2c7434bf3acacbfb6323b33cf0b175f77d0e3b1d66aeadee6e9ea996c95015c` |
| `factory/_lib/factory-state.mjs` | `72870904445d54f01eea443ed5a5de1b2af2fd19df66e085a52bf47982594d28` |
| `factory/01_spec/verify.mjs` | `7aeadc553dacdbdd95d36f29578f87e730a03f54b1e1a8cb585b5f426d3cf36b` |
| `factory/status.mjs` | `a1bfc445aeab8e9672885c13bc73aabf0aaef0a90f9d44f8ae17cf36b2cfbbe5` |
| `package.json` | `a3e13c18962d9b5b1f4d68bf7114921e479ac240189918663e0960dec19d4274` |
| `package-lock.json` | `5cdde3db2fa840e2e9a3f162f706336c04296e5f52dc8be574956521c9453d87` |
| `eslint.config.mjs` | `fd783131de1685f7971a45e0b493e1e8b818fc5c9d56ecd3fe401b29b8272c7d` |
| `factory/02_data/verify.mjs` | `719462a7162c8f2dd00e13c763551e5034063793a46da1be4b405b45c58f5aa5` |
| `factory/02_data/benchmark` | `be6d15ef711e30cf2820855eedc99508458f2de9cce513fc3d8597af2dc002da` |
| `factory/02_data/output/CONTRACT_EVIDENCE.json` | `17e988cb707f00ec913fe7213f47e3f82629580d0d60f845144810f7e0fd4935` |
