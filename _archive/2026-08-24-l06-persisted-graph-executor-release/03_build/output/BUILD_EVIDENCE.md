---
type: stage-output
stage: 03_build
status: review-ready
unit: persisted-graph-executor-correction
finding: L06
---

# L06 persisted graph executor build evidence

## Outcome

The product path now uses a persisted runtime executor for the fixed six-node
CrossSignal graph. It no longer writes precomputed succeeded reasoning objects
as execution. The seed path persists only the FIXTURE evidence, frozen context,
trace, and pre-registered outcome definition; the executor then creates,
claims, invokes, validates, and finalizes each runnable attempt from durable
state.

The executor is real orchestration over deterministic FIXTURE handlers. It is
not evidence of a production model or provider. Executor cost is unknown: each
artifact persists `usage.status: unknown` and `measuredCostUsd: null`.

## Implemented slice

- `db/flight-recorder-graph.ts` owns the versioned code registry,
  predecessor-derived inputs, runtime handler invocation, lease claims,
  finalization, recovery, failure, and guarded handoff.
- `db/flight-recorder.ts` seeds frozen context and calls the executor; the old
  batch loop over `demo.reasoningNodes` is absent from the product path.
- `db/flight-recorder-demo.ts` exposes a seed-only builder while retaining the
  precomputed builder solely as a legacy test oracle.
- `drizzle/0007_l06_persisted_graph_executor.sql` adds runtime provenance,
  predecessor inputs, leases, completion-token hashes, partial uniqueness,
  stable database errors, legacy backfill, and migration assertions.
- The snapshot playbook exposes `runtime` versus `precomputed_fixture`, graph
  version, handler version, and attempt number. It never exposes lease tokens.

## Persisted runtime proof

The cold product schedule persists exactly six successful runtime attempts and
six canonical artifacts under `crosssignal-fixed-graph-v1`. Every attempt has a
stable logical identity, handler version, canonical predecessor-output JSON,
attempt-specific input hash, timestamps, and terminal output hash. Every
artifact records FIXTURE truth mode and unknown cost explicitly.

The successful synthesizer artifact is the only source accepted by the intent
handoff. Graph completion creates one intent and one deterministic policy,
promotes the active intent through the sealed L08 trigger, and stops at
`awaiting_approval`. It creates zero grants, effects, observations, or
assessments.

## Deterministic schedules

| Schedule | Product/database evidence |
|---|---|
| Cold success | Six handler invocations, attempts, artifacts, and graph events; one intent/policy; zero grant/effect/outcome rows. |
| Stop and resume | Boundaries 1–5 preserve completed rows byte-for-byte and invoke every handler exactly once. |
| Claim and crash | An unexpired claim is busy; expiry leaves attempt 1 failed with `l06_interrupted_attempt`; attempt 2 succeeds. |
| Concurrent calls | Two barrier-controlled calls converge to six artifacts, one intent/policy pair, gap-free sequences, and unique idempotency keys. |
| Skeptic failure | Four upstream artifacts remain; handler, secret, and undeclared-citation variants fail visibly with no synthesizer or authority. |
| Input drift | The database rejects persisted input mutation with `l06_input_drift` before handler invocation or artifact creation. |
| Tenant attack | Runtime scope and database ownership reject foreign workspace/trace operations without mutation. |
| L08 regression | Both production race schedules and all ten L08 direct attacks pass on the current product path. |

All fourteen Stage 02 direct-database attacks execute against an in-memory
SQLite database with the checked-in migration chain. Each produces its named
stable L06 error and an exact before/after projection proves zero partial
mutation.

## Migration proof

Migration `0007` covers empty, current L08, interrupted, completed, and invalid
history. Existing reasoning rows backfill as `precomputed_fixture` with a
legacy graph/handler version. A legacy running row becomes a visible failed
`l06_interrupted_attempt`; it is never relabeled runtime. Duplicate canonical
success history aborts atomically as `migration_l06_invalid_history`, and the
schema remains unchanged after rollback.

## Authority and regression boundary

The approval grant, external-effect, kill-switch, payload-binding, and active
intent paths were not weakened. The sealed L08 migration matrix, two
barrier-controlled production races, and ten direct database attacks pass in
the same Stage 03-owned test file as L06.

The unscoped workspace lint command also sees three existing unused-variable
errors in the user's out-of-scope, untracked `benchmarks/` work. Those files
were not changed. Scoped lint over the product, worker, owned tests, and active
factory scripts passes.

The legacy `tests/flight-recorder-data.test.mjs` still imports the archived
onboarding fixture. That is the already-open L20 fixture/runtime drift and is
not used as L06 runtime evidence. The current Stage 02 executable oracle still
passes at its accepted gate; its baseline file hashes are expected to differ
after this downstream build.

## Claim discipline

This stage corrects L06 only. L20, L04, and L14 remain open for separate
governed runs. It makes no arbitrary-DAG, production-model, live-integration,
exactly-once delivery, production-scale scheduling, or causal claim.

## Declared input bindings

| Input | SHA-256 |
|---|---|
| `factory/03_build/CONTEXT.md` | `8471a47ce278431b010eea0084b74c5e37d4e6ac173535952f44fc2573ffbd23` |
| `factory/02_data/output/DATA_PACKAGE.md` | `9fbda72f20659df210d95a6be5b1a13dbe4fde288461d5f435fcfdc8164bbaa6` |
| `factory/02_data/output/HUMAN_GATE.md` | `965ecd2509782de2a1ecabaf18eee311d9c7bb2c75980711d2da6648d4291c29` |
| `factory/01_spec/output/SPEC.md` | `f90a9fa515c9e8357b12bb0374939fdeec7ba4580ffc6573d2f8384fdc67ea7c` |
| `factory/_shared/ARCHITECTURE_SNAPSHOT.md` | `e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |

## Implementation bindings

| File | SHA-256 |
|---|---|
| `db/flight-recorder.ts` | `2cea63997ca52a5404fb02287297371c0a32d17d53a28512f7147243c01c6b39` |
| `db/flight-recorder-graph.ts` | `7ccfdf3bd101ec3152da9bf3eb3b366197e0fc7bc708a81ea24275e33d334061` |
| `db/flight-recorder-demo.ts` | `2d23a77f6ebea793650677872895c1376123a38bdeeec7f0dc6109a1bdbc08db` |
| `db/flight-recorder-contracts.ts` | `5057dd60c778165f11444875c5bfb6b669e8e889d1363ec9ebf5268af3bc9799` |
| `db/flight-recorder-schema.ts` | `aaf5a11d3f8e2a77c1d358891248c246551f9670493a4b0e8fb32b1e579ae9cb` |
| `db/migrations.ts` | `7d7512db9c1e49eeffa2089b6fb6ffee1c5071b899958d66ff3c8e198d5b1062` |
| `drizzle/0007_l06_persisted_graph_executor.sql` | `4649dc761eb877d4fc708bd6e8928e04375ccc1021486024b893eb62bec1cf1c` |
| `tests/flight-recorder-build.test.mjs` | `7c5be086037e7dcb293ea6e76db17297d38ae1542c07231024ebe53e00359974` |
| `tests/flight-recorder-release.test.mjs` | `fda88e925e632e4d4aa25dc365712f2a14ae2074440d625c4974a145fe6c3b88` |
| `app/flight-recorder-types.ts` | `599890454757b677593540167c9359d2a6bd03b40bb361fc446128b58b4a1c24` |
