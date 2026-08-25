---
type: build-evidence
stage: 03_build
unit: fixture-runtime-source-of-truth-correction
finding: L20
status: proposed
---

# L20 durable fixture ownership build evidence

## Outcome

The durable product tree is now the sole source of runtime fixture identity and
fixed-graph topology. Numbered factory fixtures are projections used only by
the governed run; application code and durable Flight Recorder tests no longer
import them. Persisted fixture keys and truth labels remain unchanged.

## Accepted input bindings

| Input | SHA-256 |
|---|---|
| `factory/03_build/CONTEXT.md` | `a07fae976105a3828daf955bd690ca0aae5f6876befed3f081148b6dd739072f` |
| `factory/02_data/output/DATA_PACKAGE.md` | `c59eca1d8f968d7b103f9f2bebc7bd44e066d52baf7747220078c077273b33da` |
| `factory/02_data/output/HUMAN_GATE.md` | `5a1b649ae622d76f0f960e8a7da2afb6964004978393ec8e0273a8f5a5d2adbc` |
| `factory/_shared/ARCHITECTURE_SNAPSHOT.md` | `e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |

## Durable output bindings

| Output | SHA-256 |
|---|---|
| `db/flight-recorder-demo.ts` | `40e489216a9dcb2d5ec9721ab70eae85c40cf39173a0e72a34dceaa63b6dd1ae` |
| `db/flight-recorder-graph-definition.ts` | `31c0e55b72d2e4712b94c77e4e7cbd7b7d92638f9e0178979d16e952e4d30b39` |
| `db/flight-recorder-graph.ts` | `248137ac1b37e252895ae4d4138a12062bd5c3bae8244c978f266c92de120cfd` |
| `db/flight-recorder.ts` | `5f173de447f77c2eafa6aad607b3a4ce5d43836523453be292fb8961d5a5659a` |
| `tests/fixtures/persisted-graph-executor.fixture.mjs` | `3c9f911d80704616ef926aff69e85334514ebf620021553845da738f4e2580f9` |
| `tests/flight-recorder-data.test.mjs` | `09ccb1926136f3611d618f62742be8e08a2ac399d2a67e70515af7c381d25624` |
| `tests/flight-recorder-build.test.mjs` | `0997721d66d69d8b66ee79f577ac1047a7d5af6f01ccba07d9fafa045c55b2a8` |
| `tests/flight-recorder-release.test.mjs` | `4e406531692b62dfd506099e92107b05935bc191ac2795bb036de956b76b26d8` |

## Implementation proof

- `db/flight-recorder-graph-definition.ts` owns the graph, handler, artifact
  versions and the ordered six-node registry.
- Runtime execution and precomputed demo rows both derive from that registry;
  the durable product contains exactly one registry definition.
- Public TypeScript names no longer contain `STAGE_03_`; persisted values remain
  `onboarding-rescue:stage03-v1` and `onboarding-rescue-stage03-v1` for row
  compatibility.
- The fourteen L06 direct-database attack vectors now live under
  `tests/fixtures/` and survive factory seal/archive transitions.
- Durable data, build, and release tests read durable product truth. They have
  no numbered fixture, active factory evidence, or archive import.
- Seed and runtime graph execution use one injectable runtime clock, preserving
  deterministic lease behavior without changing production semantics.
- Reset coverage still proves exact same-tenant FIXTURE deletion, cross-tenant
  denial, and non-FIXTURE preservation through the existing authenticated
  runtime boundary.

## Executed verification

| Check | Result |
|---|---|
| Durable Flight Recorder data/build/release suite | PASS — 66 tests, 0 failures |
| Stage 02 executable import/projection/reset/seal cases | PASS — replayed by Stage 03 verifier |
| Focused ESLint over all eight durable outputs | PASS — 0 errors |
| Production `vinext build` | PASS — five environments built; route `/` emitted |
| Product/test dependency scan | PASS — no active factory or archive imports |
| Graph authority scan | PASS — one registry definition |
| L04/L14 and migration scope | PASS — no endpoint, authority-history, or migration change |

The repository-wide raw TypeScript diagnostic was also inspected. It remains
unsuitable as an L20 gate because the project configuration includes excluded
historical Eve sources and lacks the Cloudflare ambient declarations used by
unmodified baseline files. It reported no error in any L20-owned product or
test file. The production build and focused lint are the applicable compile and
static checks for this stage.

## Scope preservation

No database migration, L04 authority-history implementation, L14 endpoint,
archived release content, or benchmark stash was changed. The three benchmark
stashes remain present and un-applied.

## Human review requested

Review the single graph definition, the durable fixture/test dependency
direction, the persisted compatibility values and truth labels, and the exact
reset/runtime test evidence. Stage 04 must not begin until this gate is
accepted.
