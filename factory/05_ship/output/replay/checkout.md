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

Intervention: checkout v142 → v141. Approval: fixture_surrogate. Committed simulated effects: 1.

Observed result: **RESOLVED**. Both subsequent affected windows returned to 95% success. These are simulated outcomes.

Artifact hash: `f2d0cd7f529300adc5780ff34aa92157b55bbab85aa941e594f7b032cb0d7364`

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
- **trace-run-0001-15** — proposal — 2026-09-01T10:00:00.000Z — `ae0796184297eb0fe404a3b593e49698785005b5bddf6c3f35865ee8eace7d02`
- **trace-run-0001-16** — approval — 2026-09-01T10:00:00.000Z — `14ab291dba9f691d0dacf7ca91ebc175c6e6932518ee85c7cd9c76035c4d2791`
- **trace-run-0001-17** — effect_reserved — 2026-09-01T10:00:00.000Z — `cc5568c3eb8ff7f5a73accc13cf5eaefaf7479dd55cb24d107912a1de5b01ca6`
- **trace-run-0001-18** — effect_confirmed — 2026-09-01T10:00:00.000Z — `1c9ab9dd092d0255167f8fa9635dd47c899350a6173c569ed91b41300dc66019`
- **trace-run-0001-19** — observation — 2026-09-01T10:15:00.000Z — `e6688fd6511d080355b2d6b7ac10c6c1f34d73c9b3d9a5e2f9ecd07e30705331`
- **trace-run-0001-20** — observation — 2026-09-01T10:30:00.000Z — `396a983c02357317708fc53cb8380dda50ad309f021ab3d9481cde14a6462846`
- **trace-run-0001-21** — resolved — 2026-09-01T10:30:00.000Z — `e37b237165334e07974bcf092155bd48a4a57144f91a12f36fc531a259be5ddc`

Detailed query results, findings, exact proposal/grant, effects and observations resolve in the adjacent artifact JSON by these IDs. Automated grants are fixture_surrogate; they do not establish human runtime approval.

[Complete lifecycle artifact](checkout-1/artifact.json)

Repeatability: two fresh processes and separate SQLite stores matched. SHA-256 `23e32be6e1410f1124658f8cb9c6ed67a596466451a9218ba499e57efb105e88`.
