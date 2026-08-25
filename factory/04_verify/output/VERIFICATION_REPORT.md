---
type: stage-primary-output
stage: 04_verify
unit: append-only-authority-control-history-and-trace-projection-completeness
status: ready-for-review
truth_mode: independently-verified
created: 2026-08-26
---

# L04 release-grade verification report

## Release-readiness result

The accepted L04 build satisfies all twelve acceptance criteria and all twelve
required negative cases. Canonical workspace control history is append-only,
effect authorization is immutably bound to the exact current unengaged control
event, and the existing authenticated snapshot produces a complete, ordered,
tenant-bound, redacted projection of every durable trace event.

The independent Stage 04 battery passed 75 factory-tool, rendered-output,
product, L08, and L06 tests; the focused import-safe ICM specification contract
passed separately. Focused lint, the production Vinext build, and the accepted
Stage 03 verifier also pass. No L14 endpoint, route, middleware, worker,
authentication, provider, or graph-topology surface entered the release.

## Acceptance resolution

| Criterion | Independent resolution |
|---|---|
| L04-AC01 | The three-event off/on/off control history reseals, orders, and survives immutable update/delete probes. |
| L04-AC02 | Runtime authority reads only canonical events and fails closed for missing, malformed, hash-mismatched, or ambiguous history. |
| L04-AC03 | Same-value requests append nothing; all three deterministic race schedules select one serializable winner. |
| L04-AC04 | Six migration schedules prove deterministic legacy bootstrap, retry identity, bounded FIXTURE reset, and fail-closed ambiguity. |
| L04-AC05 | The 34-event fixture and runtime tests prove complete intent, policy, approval, effect, trace, and outcome subject chains. |
| L04-AC06 | Every reserved effect has one immutable binding to the exact current unengaged control event sequence and hash. |
| L04-AC07 | Projection begins at sequence 1, is contiguous and complete, retains unknown event types, and equals `traceEventCount`. |
| L04-AC08 | Mixed-tenant same-ID collisions are excluded by workspace and trace binding before projection. |
| L04-AC09 | Actors use a closed display vocabulary; subject details are allowlisted and serialized leakage probes remain absent. |
| L04-AC10 | FIXTURE trace reset deletes the bounded trace/effect graph while preserving every workspace authority event. |
| L04-AC11 | L08 active-intent and L06 persisted-graph behavior, FIXTURE/TEST truth labels, and topology remain green. |
| L04-AC12 | Changed product paths contain no HTTP endpoint, route, middleware, worker, or other L14 transport implementation. |

## Negative-case resolution

| Negative | Independent resolution |
|---|---|
| L04-N01 | Authority event update/delete fails with `l04_authority_history_immutable`. |
| L04-N02 | Legacy mutable heads are frozen and never read as runtime authority. |
| L04-N03 | Cross-workspace actors and control/projection tenant mismatches fail closed. |
| L04-N04 | A requested value equal to the effective head is an idempotent no-op. |
| L04-N05 | Stale toggle/effect writers fail atomically without partial grants, bindings, effects, or trace events. |
| L04-N06 | Sequence gaps, duplicate sequence, hash drift, and discontinuous subject chains reject the whole projection. |
| L04-N07 | Subject binding and L08 active-intent authority guards remain enforced. |
| L04-N08 | Raw payloads, actor IDs, idempotency keys, recipients, bodies, provider responses, credentials, and secret-like fields are absent. |
| L04-N09 | Invalid boolean, time, membership, and ambiguous legacy migration inputs block compatibility. |
| L04-N10 | Bounded FIXTURE reset cannot delete authority-control history. |
| L04-N11 | Reused event and subject IDs from another tenant never enter the authenticated projection. |
| L04-N12 | Static path and source checks reject entry into the L14 delivery surface. |

## Independent execution evidence

- The durable Stage 02 fixture and test copy have identical normalized SHA-256
  hashes and validate 12 acceptance IDs, 12 negative IDs, 3 race schedules,
  6 migration schedules, and 34 ordered trace events.
- The independent relevant suite passed 75/75 tests, including factory hash and
  seal helpers, rendered HTML, migration/runtime data, concurrency, reset,
  redaction, tenant isolation, and L08/L06 regression coverage.
- The focused generic specification compatibility contract passed 1/1 after
  the explicitly authorized Stage 01 verifier correction.
- The accepted Stage 03 verifier reruns 63 product tests, focused lint, static
  migration/scope checks, fixture parity, and a production Vinext build.
- `git diff --check` passes and all three benchmark stashes remain present.

## Upstream compatibility correction

The first diagnostic aggregate included the whole end-of-pipeline ICM test
module and exposed a missing named `validateSpec` export in the accepted Stage
01 verifier. The project owner authorized the correction. Stage 01 now exports
that pure compatibility function and its governed CLI body is import-safe; no
accepted specification, product behavior, or product test changed.

Stage 04 then narrowed the ICM execution to its applicable focused contract.
The catalog case that deliberately loads archived history is excluded by the
governed no-archive rule, and the factory-state case is deferred until Stage 05
outputs exist. The initial diagnostic failure and the passing reruns are both
recorded in `VERIFY.md`.

## Residual risk and release boundary

No unresolved L04 product defect remains. The complete repository-level ICM
pipeline-state test is intentionally deferred to Stage 05 because it requires
Ship outputs and a closed final factory state. This is a sequencing limitation,
not an L04 runtime risk. Stage 04 does not authorize shipping or L14 work.

## Declared input hashes

| Input | SHA-256 |
|---|---|
| `factory/04_verify/CONTEXT.md` | `915d621466df18aae1fdd25afb7d5f751d359bba10b5212b987bd413194f5393` |
| `factory/03_build/output/BUILD_EVIDENCE.md` | `4115ea1b852b8cbebcd11cdd9da341b1406424a7140d68c7195ccfe36b5ac246` |
| `factory/03_build/output/VERIFY.md` | `be0e44a282f52929a282bae5c034aff01ecfee81e9038067468cee9e80b8483a` |
| `factory/03_build/output/HUMAN_GATE.md` | `7d6776a41fc6d1c86cb2cd05668fbba106f4f0922aa34e3d366f148371ecfeeb` |
| `factory/01_spec/output/SPEC.md` | `a61807c8500b2b1038c8acdeb340d82999fc86c1be53bd428e6390f74204a527` |
| `factory/02_data/output/DATA_PACKAGE.md` | `a503213bfcccd597700fe6934c365855d90d422d9c03b015bf10b2a96438979d` |
| `factory/02_data/fixtures/l04-authority-trace.fixture.mjs` | `cd565ba32b846e2848be56c6ef8c705bb13088d6424f80feb962d96411afa464` |
| `factory/_shared/ARCHITECTURE_SNAPSHOT.md` | `e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `factory/_lib/verify-kit.mjs` | `b2c7434bf3acacbfb6323b33cf0b175f77d0e3b1d66aeadee6e9ea996c95015c` |
| `factory/_lib/factory-state.mjs` | `72870904445d54f01eea443ed5a5de1b2af2fd19df66e085a52bf47982594d28` |
| `package.json` | `c8a9ab36760f08998d304efdc6a4d514a22f8d7ea05ab8c8df992ecc09f75972` |
| `eslint.config.mjs` | `6090bd544865638d8c77a3443f037b3b289596a7ec1e1dccc3a13677e6d1ca83` |
| `tsconfig.json` | `379054f6cec60ebd0e18c47a3ce72b2cc1b3f7abd0037c668e87cb2070891147` |
| `factory/01_spec/verify.mjs` | `b714e852ec0afcc37c5fab0be8e7df885aed17faba08124a10da0fe964c1cf4d` |
| `tests/icm-workspace.test.mjs` | `549c1f9dd55c864a1bdb745ebae4b2fdfa168258a4fa9d29b7b06a68a05ba312` |
| `db/flight-recorder-schema.ts` | `18f30283877491c7a15de0667134aa07cd1ff21e41f9b626f0377b145c46cd09` |
| `db/flight-recorder-contracts.ts` | `e6d61497b43979aeb8dd9154c49aec7a04949a8db22ea30107dd82c05f796192` |
| `db/flight-recorder.ts` | `4bf6802a6dc96463381d9a58135e10a1cc27a64e7a27159e99217061166411b0` |
| `db/flight-recorder-demo.ts` | `40e489216a9dcb2d5ec9721ab70eae85c40cf39173a0e72a34dceaa63b6dd1ae` |
| `db/flight-recorder-graph.ts` | `e63e9473deeb3cc5491ae7413c5ef49235ce6ee8ab9bcddaeafd8deda15322dd` |
| `db/migrations.ts` | `a33c9d1a2435c4a93b1f8f9a779d99084e4903aca6c326d7f308667d285a53b1` |
| `app/flight-recorder-types.ts` | `69f588d2bc6f7584e66725026ff9fe247a7e7aed7de1ae074fc4ecbca062e7ea` |
| `app/CrossSignalApp.tsx` | `29cd9f0b0bb9b42074b0ffe51c113d8e626c2077ef6a0b88991011104b1ecacb` |
| `drizzle/0008_l04_authority_history_trace_projection.sql` | `afcda8bfbf26136c9e46b10f5e051639967c539e4087897a428d86be88389973` |
| `drizzle/meta/0008_snapshot.json` | `f64ece2bd27b3dcf2f2b216d2443118c97fbf3dad7dbd36cec990331d1bd4221` |
| `drizzle/meta/_journal.json` | `d671f5d25a21f2533ea2fdec2298dc610ae40d90bdab51c269a1175d74c0b422` |
| `tests/flight-recorder-data.test.mjs` | `d4be07a521bbfd19726d3ea2aa3bdd034620a2518a2375e8e4cf79ada8e032cf` |
| `tests/flight-recorder-build.test.mjs` | `7efeb3f0ca10d7b49b5d7498d364ab6c345b1919b74b6686bc774f664e52cedd` |
| `tests/fixtures/l04-authority-trace.fixture.mjs` | `cd565ba32b846e2848be56c6ef8c705bb13088d6424f80feb962d96411afa464` |
