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

Intervention: none. Approval: none. Committed simulated effects: 0.

Observed result: **UNCERTAIN**. Subsequent affected windows remained at 60% success. These are simulated outcomes.

Artifact hash: `4aeb8b97b3b04fce78f24035a65c47c4185d316fa42931792ad502ad21330dee`

## Independent checks

| Check | Result | Trace references |
| --- | --- | --- |
| truth_and_model_boundary | PASS |  |
| trace_integrity | PASS | `trace-run-0001-1`, `trace-run-0001-2`, `trace-run-0001-3`, `trace-run-0001-4`, `trace-run-0001-5`, `trace-run-0001-6`, `trace-run-0001-7`, `trace-run-0001-8`, `trace-run-0001-9`, `trace-run-0001-10`, `trace-run-0001-11`, `trace-run-0001-12`, `trace-run-0001-13`, `trace-run-0001-14`, `trace-run-0001-15`, `trace-run-0001-16`, `trace-run-0001-17` |
| evidence_integrity | PASS | `ev-293174fed6d90d35370f814d`, `ev-d7560b360b6f8575bd341a90`, `ev-d8dc142201e06471a76fc7f0`, `ev-2b2f95369911681a6220399f`, `ev-2bd3c5e301bd7c9b668edd69`, `ev-6f3dd8ddc09c7e8f1c70adbc`, `ev-f56137b6052d2127b16e5141`, `ev-cdfcf160d9228a13f7a97745`, `ev-46495470084297c5013f1699`, `ev-54c5e6fc379fd4954be9061d`, `ev-73a14434882db24f0c92b4e3`, `ev-9429caa36d809993de75e98b`, `ev-96e257356e0ea675191090be`, `ev-b32351481272812d973ff375`, `ev-5d20f38a5836c3ca13a74949`, `ev-d1a93ba9bd3422e19b45e5ae`, `ev-a122f4e9f51cd706d3b652d4`, `ev-845a2384e6ecb0dd6f68bc5a`, `ev-b82439649facb44a1cdceee7`, `ev-ea18cf95fb3b2bb13aecb113`, `ev-1bb39d53d624989bd6267532`, `ev-5e87077dcc95e697d924ff43`, `ev-bf5ba0db04a642644352d063`, `ev-6218fb0de0ce4874963bba55`, `ev-9a7b1390beff5e025b725584`, `ev-a949d5bc026369f0e122ed2b` |
| bounded_tools | PASS | `trace-run-0001-2`, `trace-run-0001-3`, `trace-run-0001-5`, `trace-run-0001-6`, `trace-run-0001-7`, `trace-run-0001-8`, `trace-run-0001-10`, `trace-run-0001-11`, `trace-run-0001-12`, `trace-run-0001-13` |
| signal_detection | PASS | `trace-run-0001-1` |
| evidence_precision | PASS | `trace-run-0001-4`, `trace-run-0001-9`, `trace-run-0001-14` |
| supported_structured_claims | PASS | `trace-run-0001-4`, `trace-run-0001-9`, `trace-run-0001-14` |
| required_evidence_recall | PASS | `trace-run-0001-2`, `trace-run-0001-3`, `trace-run-0001-5`, `trace-run-0001-6`, `trace-run-0001-7`, `trace-run-0001-8`, `trace-run-0001-10`, `trace-run-0001-11`, `trace-run-0001-12`, `trace-run-0001-13` |
| diagnosis_and_second_cause | PASS | `trace-run-0001-4`, `trace-run-0001-9`, `trace-run-0001-14` |
| contradiction_search | PASS | `trace-run-0001-4`, `trace-run-0001-9`, `trace-run-0001-14`, `trace-run-0001-2`, `trace-run-0001-3`, `trace-run-0001-5`, `trace-run-0001-6`, `trace-run-0001-7`, `trace-run-0001-8`, `trace-run-0001-10`, `trace-run-0001-11`, `trace-run-0001-12`, `trace-run-0001-13` |
| recommendation | PASS | `trace-run-0001-4`, `trace-run-0001-9`, `trace-run-0001-14` |
| exact_authorization | PASS |  |
| no_duplicate_effect | PASS |  |
| observed_outcome | PASS | `trace-run-0001-15`, `trace-run-0001-16`, `trace-run-0001-17` |

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
- **trace-run-0001-15** — observation — 2026-09-01T10:15:00.000Z — `a089f371ac0b8b61f190b5b5d7c8e3fc09d3544b96db57ca74eae94ef2ade6b0`
- **trace-run-0001-16** — observation — 2026-09-01T10:30:00.000Z — `8ae34e1d762b47f9b8a0a216ff8f73a966170ec34e1bdb2009e2bde4de96cb51`
- **trace-run-0001-17** — uncertain — 2026-09-01T10:30:00.000Z — `7185d1452c31ce287ed5d88a4974b40e3eb63c17752360e7b7a15fe349cab99d`

Detailed query results, findings, exact proposal/grant, effects and observations resolve in the adjacent artifact JSON by these IDs. Automated grants are fixture_surrogate; they do not establish human runtime approval.

[Complete lifecycle artifact](none-1/artifact.json)

Cold replay matched the accepted Build SHA-256: `17e439842f91e8fe0e245acc06cf97785b48b5fe8fce66a52a2afe874521ed4a`.
