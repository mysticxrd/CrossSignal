# A01 simulated Case — PASS

Deterministic mechanics: **PASS**. Model evaluation: **NOT RUN**. Full AI hiring proof: **pending**.

No real payment, Mobile Safari device check, or business recovery is established.

## What happened

Indian debit-card checkout fell from 95% to 60% success in the synthetic incident. Other segments stayed at 95%.

The baseline recommends reversing the checkout validation change.

| Explanation | Assessment | Evidence |
| --- | --- | --- |
| checkout_validation_regression | supported | `ev-6f3dd8ddc09c7e8f1c70adbc`, `ev-9429caa36d809993de75e98b`, `ev-d1a93ba9bd3422e19b45e5ae` |
| payment_provider_incident | disfavored | `ev-5d20f38a5836c3ca13a74949` |
| acquisition_mix_change | disfavored | `ev-d7560b360b6f8575bd341a90`, `ev-2bd3c5e301bd7c9b668edd69`, `ev-54c5e6fc379fd4954be9061d`, `ev-845a2384e6ecb0dd6f68bc5a`, `ev-d8dc142201e06471a76fc7f0`, `ev-2b2f95369911681a6220399f`, `ev-46495470084297c5013f1699`, `ev-ea18cf95fb3b2bb13aecb113`, `ev-293174fed6d90d35370f814d`, `ev-f56137b6052d2127b16e5141`, `ev-73a14434882db24f0c92b4e3`, `ev-b82439649facb44a1cdceee7` |

Challenge to the leading explanation: Provider health weakens provider outage and supports checkout ranking.

Intervention: notifications v8 → v7. Approval: fixture_surrogate. Committed simulated effects: 1.

Observed result: **UNCERTAIN**. Subsequent affected windows remained at 60% success. These are simulated outcomes.

Artifact hash: `63ced3997acf4a4f91028dbab6ae04d85211fd100ffaed3b526f375983d2e683`

## Independent checks

| Check | Result | Trace references |
| --- | --- | --- |
| truth_and_model_boundary | PASS |  |
| trace_integrity | PASS | `trace-run-0001-1`, `trace-run-0001-2`, `trace-run-0001-3`, `trace-run-0001-4`, `trace-run-0001-5`, `trace-run-0001-6`, `trace-run-0001-7`, `trace-run-0001-8`, `trace-run-0001-9`, `trace-run-0001-10`, `trace-run-0001-11`, `trace-run-0001-12`, `trace-run-0001-13`, `trace-run-0001-14`, `trace-run-0001-15`, `trace-run-0001-16`, `trace-run-0001-17`, `trace-run-0001-18`, `trace-run-0001-19`, `trace-run-0001-20`, `trace-run-0001-21` |
| evidence_integrity | PASS | `ev-293174fed6d90d35370f814d`, `ev-d7560b360b6f8575bd341a90`, `ev-d8dc142201e06471a76fc7f0`, `ev-2b2f95369911681a6220399f`, `ev-2bd3c5e301bd7c9b668edd69`, `ev-6f3dd8ddc09c7e8f1c70adbc`, `ev-f56137b6052d2127b16e5141`, `ev-cdfcf160d9228a13f7a97745`, `ev-46495470084297c5013f1699`, `ev-54c5e6fc379fd4954be9061d`, `ev-73a14434882db24f0c92b4e3`, `ev-9429caa36d809993de75e98b`, `ev-96e257356e0ea675191090be`, `ev-b32351481272812d973ff375`, `ev-5d20f38a5836c3ca13a74949`, `ev-d1a93ba9bd3422e19b45e5ae`, `ev-a122f4e9f51cd706d3b652d4`, `ev-845a2384e6ecb0dd6f68bc5a`, `ev-b82439649facb44a1cdceee7`, `ev-ea18cf95fb3b2bb13aecb113`, `ev-1bb39d53d624989bd6267532`, `ev-5e87077dcc95e697d924ff43`, `ev-bf5ba0db04a642644352d063`, `ev-6218fb0de0ce4874963bba55`, `ev-9a7b1390beff5e025b725584`, `ev-a949d5bc026369f0e122ed2b` |
| bounded_tools | PASS | `trace-run-0001-2`, `trace-run-0001-3`, `trace-run-0001-5`, `trace-run-0001-6`, `trace-run-0001-7`, `trace-run-0001-8`, `trace-run-0001-10`, `trace-run-0001-11`, `trace-run-0001-12`, `trace-run-0001-13` |
| signal_detection | PASS | `trace-run-0001-1` |
| evidence_precision | PASS | `trace-run-0001-4`, `trace-run-0001-9`, `trace-run-0001-14` |
| supported_structured_claims | PASS | `trace-run-0001-4`, `trace-run-0001-9`, `trace-run-0001-14` |
| required_evidence_recall | PASS | `trace-run-0001-2`, `trace-run-0001-3`, `trace-run-0001-5`, `trace-run-0001-6`, `trace-run-0001-7`, `trace-run-0001-8`, `trace-run-0001-10`, `trace-run-0001-11`, `trace-run-0001-12`, `trace-run-0001-13` |
| diagnosis_and_second_cause | PASS | `trace-run-0001-4`, `trace-run-0001-9`, `trace-run-0001-14` |
| contradiction_search | PASS | `trace-run-0001-4`, `trace-run-0001-9`, `trace-run-0001-14`, `trace-run-0001-2`, `trace-run-0001-3`, `trace-run-0001-5`, `trace-run-0001-6`, `trace-run-0001-7`, `trace-run-0001-8`, `trace-run-0001-10`, `trace-run-0001-11`, `trace-run-0001-12`, `trace-run-0001-13` |
| recommendation | PASS | `trace-run-0001-4`, `trace-run-0001-9`, `trace-run-0001-14` |
| exact_authorization | PASS | `trace-run-0001-15`, `trace-run-0001-16`, `trace-run-0001-17` |
| no_duplicate_effect | PASS | `trace-run-0001-18` |
| observed_outcome | PASS | `trace-run-0001-19`, `trace-run-0001-20`, `trace-run-0001-21` |

## Case timeline

- **trace-run-0001-1** — signal — 2026-09-01T10:00:00.000Z — `adcef9f08a3efd5c45fb9507a76542a6129dab0dcfa4d4a23160ec32c5e60ca9`
- **trace-run-0001-2** — evidence_query — 2026-09-01T10:00:00.000Z — `ec9d076456d47b1f92ea10aed6cb0dc71ce2a84cee4650880549c781b3cd11a1`
- **trace-run-0001-3** — evidence_query — 2026-09-01T10:00:00.000Z — `d97ded1df568acf01df6809ed6d862bb66e497ef588ace804f1e3623b13e2383`
- **trace-run-0001-4** — hypothesis — 2026-09-01T10:00:00.000Z — `e12ca50dbd5c44e2c50dd3d370c6dbf76a2f09d810ec4c88ea6da917f8cce90c`
- **trace-run-0001-5** — evidence_query — 2026-09-01T10:00:00.000Z — `e7ee3a735526aed8acb2f41ffd2e4bef3aaf6670e87cd2805fbfdd4beba4efe3`
- **trace-run-0001-6** — evidence_query — 2026-09-01T10:00:00.000Z — `06f78278e9a8370da8452960a606b8393d6c0125a08663a69fac197c26300e6d`
- **trace-run-0001-7** — evidence_query — 2026-09-01T10:00:00.000Z — `fc3b08aa2ae3c5552033f9d93367a616bf2a5f2c9088cb3d00b7e789f4364eae`
- **trace-run-0001-8** — evidence_query — 2026-09-01T10:00:00.000Z — `82b2cf95d17370abb4ddbc2b14cfc8645864bb3477fb4810ba7c1b5e5d33bda7`
- **trace-run-0001-9** — hypothesis — 2026-09-01T10:00:00.000Z — `69788b13ab6bdb3bae780b56d5bb09b5920534a1134bc17f7a6c978bff6663d6`
- **trace-run-0001-10** — evidence_query — 2026-09-01T10:00:00.000Z — `a6e06341f8cef89c05b8d0b0b038fcddffd1e2407a5581713801ac55078e55b8`
- **trace-run-0001-11** — evidence_query — 2026-09-01T10:00:00.000Z — `23c3b1f3449a50af07a75f570c6a061fcb5804b254add0e420c058f90a239cb2`
- **trace-run-0001-12** — evidence_query — 2026-09-01T10:00:00.000Z — `3d36704938819560be8cfc1a3387db599df3fd1c3a6f3947372ac01fa8f443be`
- **trace-run-0001-13** — evidence_query — 2026-09-01T10:00:00.000Z — `84fafbb7c630e58822349708f97e9b6c96c911f25b50bf0a9846e342628d5c29`
- **trace-run-0001-14** — hypothesis — 2026-09-01T10:00:00.000Z — `f50fa2b012e3d69771a46df86f363830807ec6dab3de18dd725725fe6fa9ad8f`
- **trace-run-0001-15** — proposal — 2026-09-01T10:00:00.000Z — `0156bcfb99fba18fddb0a1cd1362ec94326f90e22723a0354ddbec7bf08dc259`
- **trace-run-0001-16** — approval — 2026-09-01T10:00:00.000Z — `a64068439876922d4f229147b916ea39d03a96931025d90fb79feed829f1b4d1`
- **trace-run-0001-17** — effect_reserved — 2026-09-01T10:00:00.000Z — `91d34fdb8251001bdd2fb0cb5f5f05b59dc5e37872c1bfe8aa0faea116d0e91f`
- **trace-run-0001-18** — effect_confirmed — 2026-09-01T10:00:00.000Z — `8ebd947ba4b021c0fc7770778f2c0144799593e6080eee13420698b0cd2943e9`
- **trace-run-0001-19** — observation — 2026-09-01T10:15:00.000Z — `f65df3bce60df582ca6e10c3b18abd43de04c506897e94056b8f6c806b5f24c7`
- **trace-run-0001-20** — observation — 2026-09-01T10:30:00.000Z — `307ffafcf83169f8b8fcbfae599cf979ca1cce5c7253b13fff4f67edfb4148c1`
- **trace-run-0001-21** — uncertain — 2026-09-01T10:30:00.000Z — `192415e20293fa0f7813671d1e609344ef2942780d3fd5239106f22eb2b2ba28`

Detailed query results, findings, exact proposal/grant, effects and observations resolve in the adjacent artifact JSON by these IDs. Automated grants are fixture_surrogate; they do not establish human runtime approval.

[Complete lifecycle artifact](notifications-1/artifact.json)

Repeatability: two fresh processes and separate SQLite stores matched. SHA-256 `972d1e8b5bcd891c616e797a7aa5d9bdb1c777cb4591071abcd3190c88ae6c01`.
