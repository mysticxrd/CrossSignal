---
type: stage-primary-output
stage: 05_ship
unit: append-only-authority-control-history-and-trace-projection-completeness
status: ready-for-review
release_candidate: crosssignal-l04-2026-08-26
created: 2026-08-26
---

# CrossSignal L04 release manifest

## Release identity

- Candidate: `crosssignal-l04-2026-08-26`
- Unit: append-only authority-control history and complete trace projection
- Verification fixture: `l04-authority-trace-v1`
- Verification trace: `trace_l04_onboarding`
- Governed state: Stages 01-04 accepted; Stage 05 pending human review
- Seal state: uncommitted and unsealed until the Stage 05 gate is accepted

This candidate adds no HTTP trace-resolution endpoint. L14 remains a separate
future run.

## Truth manifest

| Surface | Truth |
|---|---|
| Evidence, context, outcome, and persisted review trace | `FIXTURE`; deterministic evaluator data, not live customer state |
| Consequential email path | `TEST`; trusted test adapter, not a live provider integration |
| Authority history | Persisted database rows resealed and read as canonical runtime truth |
| Effect authority | Persisted immutable binding to the exact latest unengaged control event used at reservation |
| Outcome conclusion | Correlated fixture observation only; no causal claim |
| Tenant and redaction proof | Executable database/runtime tests; the single-workspace UI is not visual proof |

## Architecture

The release preserves the fixed CrossSignal flow: immutable evidence and
context, persisted fixed reasoning graph, immutable intent, deterministic
policy, exact human grant, current workspace control event, one bounded TEST
effect, append-only outcome, and a complete ordered redacted trace. Durable
authority lives in `workspace_authority_control_events`; each effect records one
immutable `effect_authority_control_bindings` proof. The existing authenticated
snapshot is the only read surface in L04.

## Threat model

- Mutable or deleted authority history is rejected by database guards.
- Missing, malformed, ambiguous, stale, or cross-tenant control history fails
  closed before effect reservation.
- A pause-versus-reservation race commits one complete boundary or none.
- Trace gaps, hash drift, subject discontinuity, or tenant collision reject the
  entire projection rather than returning partial evidence.
- Actor identities and payload details are closed/allowlisted; raw payloads,
  recipients, message bodies, provider responses, credentials, and secrets do
  not cross the client boundary.
- FIXTURE reset removes only its trace/effect graph and preserves workspace
  control history.

## Cold setup

From a clean checkout with Node 22.13 or newer:

```powershell
npm ci
node factory/05_ship/prepare.mjs
node factory/05_ship/verify.mjs
npm run dev
```

Use `output/DEMO_SCRIPT.md` for the reviewer flow. The first two Node commands
are read-only with respect to product state except for normal build artifacts.

## Proof index

| Proof | Resolution |
|---|---|
| `L04-AC01` `L04-AC02` `L04-AC03` `L04-AC04` | Canonical immutable history, fail-closed effective head, no-op semantics, races, and migration compatibility |
| `L04-AC05` `L04-AC06` | Complete subject histories and exact effect/control binding |
| `L04-AC07` `L04-AC08` `L04-AC09` | Complete ordering, tenant isolation, actor redaction, and detail allowlists |
| `L04-AC10` `L04-AC11` `L04-AC12` | Authority-preserving reset, L08/L06 regression safety, and L14 exclusion |
| `L04-N01` `L04-N02` `L04-N03` `L04-N04` | Immutable/frozen history, tenant/actor binding, and same-value no-op |
| `L04-N05` `L04-N06` `L04-N07` `L04-N08` | Atomic stale races, projection integrity, subject authority, and leakage rejection |
| `L04-N09` `L04-N10` `L04-N11` `L04-N12` | Migration invalidity, bounded reset, collision isolation, and transport exclusion |

The accepted Stage 04 report resolves every ID individually. Executable truth
contains 12 acceptance IDs, 12 negative IDs, 3 race schedules, 6 migration
schedules, and one 34-event ordered reference trace.

## Residual limits

- There is no authenticated L14 trace-resolution HTTP endpoint in this release.
- There is no LIVE provider, live customer evidence, production-scale load
  result, exactly-once delivery claim, or causal inference claim.
- The UI demonstrates one authorized workspace; tenant isolation and hostile
  collision behavior are proven by executable tests.
- The complete factory seal becomes meaningful only after human acceptance,
  commit, and a clean-worktree `node factory/seal.mjs` run.

## Declared input hashes

| Input | SHA-256 |
|---|---|
| `factory/05_ship/CONTEXT.md` | `8ede87ed09ff4ec41246e48b869d926e77258568697c0e811edaaf15749c9811` |
| `factory/04_verify/output/VERIFICATION_REPORT.md` | `08517d722b9da7140174549b3279bbc9d4bd0335ec21237b6efb7212c8cb4b7a` |
| `factory/04_verify/output/VERIFY.md` | `03b5076c97c56d00daae7b7bb2ff13e12d07a14255b1cc8b0e714c6531d84b9a` |
| `factory/04_verify/output/HUMAN_GATE.md` | `e529623ba2938d7f4391eeeabb47ed35cf6ac49db574acf36a0b838396b5c741` |
| `factory/03_build/output/BUILD_EVIDENCE.md` | `4115ea1b852b8cbebcd11cdd9da341b1406424a7140d68c7195ccfe36b5ac246` |
| `factory/03_build/output/HUMAN_GATE.md` | `7d6776a41fc6d1c86cb2cd05668fbba106f4f0922aa34e3d366f148371ecfeeb` |
| `factory/02_data/output/DATA_PACKAGE.md` | `a503213bfcccd597700fe6934c365855d90d422d9c03b015bf10b2a96438979d` |
| `factory/02_data/output/HUMAN_GATE.md` | `d9e7efd6b2084026e5ee8c7a993670df2fba89539da0bc51c460f272e2b8aaa9` |
| `factory/01_spec/output/SPEC.md` | `a61807c8500b2b1038c8acdeb340d82999fc86c1be53bd428e6390f74204a527` |
| `factory/01_spec/output/HUMAN_GATE.md` | `a8944174459eed47ebbcb8ba3ed896d96fc6430c7629a95e2a1662473af13a73` |
| `factory/_shared/ARCHITECTURE_SNAPSHOT.md` | `e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `factory/_lib/verify-kit.mjs` | `b2c7434bf3acacbfb6323b33cf0b175f77d0e3b1d66aeadee6e9ea996c95015c` |
| `factory/_lib/factory-state.mjs` | `72870904445d54f01eea443ed5a5de1b2af2fd19df66e085a52bf47982594d28` |
| `package.json` | `c8a9ab36760f08998d304efdc6a4d514a22f8d7ea05ab8c8df992ecc09f75972` |
| `eslint.config.mjs` | `6090bd544865638d8c77a3443f037b3b289596a7ec1e1dccc3a13677e6d1ca83` |
| `tsconfig.json` | `379054f6cec60ebd0e18c47a3ce72b2cc1b3f7abd0037c668e87cb2070891147` |
| `tests/icm-workspace.test.mjs` | `549c1f9dd55c864a1bdb745ebae4b2fdfa168258a4fa9d29b7b06a68a05ba312` |
| `factory/01_spec/verify.mjs` | `b714e852ec0afcc37c5fab0be8e7df885aed17faba08124a10da0fe964c1cf4d` |
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
| `factory/05_ship/prepare.mjs` | `39e9fa286ac7093cf073b61ae71818f7c43773fe12869948e400a997824938d0` |
| `factory/05_ship/verify.mjs` | `31e1e8fe4d2a442381dd3f73f543bd56056d0b1d75b66870161da934730fec23` |
