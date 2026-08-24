---
type: stage-output
stage: 04_verify
status: review-ready
unit: persisted-graph-executor-correction
finding: L06
---

# L06 persisted graph executor verification report

## Verdict

PASS. The accepted L06 implementation executes the fixed six-node graph through
persisted runtime attempts. Independent SQLite/D1-compatible probes, the
relevant product suites, migration cases, deterministic races, direct database
attacks, production build, scoped lint, factory tests, and diff inspection all
pass.

This verdict proves runtime orchestration over deterministic fixture handlers.
The evidence remains in `FIXTURE` truth mode, and executor cost remains unknown.

## Independent persisted-runtime proof

Stage 04 creates a fresh in-memory SQLite database, applies all eight checked-in
migrations, injects it through the same D1 interface used by product code, and
calls the product entry points directly. It does not import the Stage 02 oracle
or materialize Stage 03 test objects.

The probe observed:

- six runtime handler invocations, six succeeded runtime attempts, and six
  canonical artifacts for `crosssignal-fixed-graph-v1`;
- an independently recomputed input hash match for every node using the frozen
  context hash, handler/graph versions, attempt number, and ordered predecessor
  hashes;
- cleared terminal leases, gap-free unique events, one synthesizer-bound intent,
  one policy, and zero grants or effects;
- three completed nodes preserved byte-for-byte across a separate-process-style
  resume, followed by completion of only the remaining graph;
- an unexpired planner claim remaining busy, then an expired attempt retained as
  failed `l06_interrupted_attempt` before attempt 2 succeeded;
- a skeptic handler failure retaining four upstream artifacts, producing no
  synthesizer artifact and no authority rows; and
- caller-controlled topology, caller-controlled `LIVE` truth mode, and a foreign
  workspace scope rejected with the exact stable error and no projection change.

The user-visible snapshot contains runtime mode, graph version, handler version,
and attempt number. It contains no lease token or terminal lease value.

## Acceptance resolution

| Criterion | Result | Release-grade evidence |
|---|---|---|
| AC-L06-01 — PASS | PASS | Cold product entry invokes each of six handlers once; persisted successes are `runtime`, not seeded successes. |
| AC-L06-02 — PASS | PASS | Registry has exactly six fixed nodes; caller topology and truth controls fail with `l06_arbitrary_graph_rejected`. |
| AC-L06-03 — PASS | PASS | Stage 04 recomputes all six canonical input hashes; product tests reject predecessor/context drift before artifact creation. |
| AC-L06-04 — PASS | PASS | Attempts, artifacts, terminal timestamps, output hashes, and append-only success events resolve in the database. |
| AC-L06-05 — PASS | PASS | Product tests cover boundaries 1–5; the independent three-node probe preserves completed rows byte-for-byte. |
| AC-L06-06 — PASS | PASS | Busy-before-expiry and immutable failed attempt 1 followed by succeeded attempt 2 are independently observed. |
| AC-L06-07 — PASS | PASS | Barrier-controlled concurrent calls converge to six artifacts, one intent/policy pair, and unique ordered events. |
| AC-L06-08 — PASS | PASS | Handler, secret, and citation failures stop synthesis; independent skeptic failure leaves all authority/effect counts zero. |
| AC-L06-09 — PASS | PASS | Runtime scope checks plus fourteen direct database attacks reject tenant, node, artifact, claim, event, and handoff mutation. |
| AC-L06-10 — PASS | PASS | Runtime execution and `FIXTURE` truth are distinct on persisted, snapshot, report, and demo surfaces; lease tokens are absent. |
| AC-L06-11 — PASS | PASS | Only completed synthesizer output creates one active intent/policy; grants, effects, observations, and assessments remain zero. |
| AC-L06-12 — PASS | PASS | Empty, current-L08, interrupted, completed, and invalid-history migration cases pass; invalid history rolls back. |
| AC-L06-13 — PASS | PASS | Two L08 production races, ten L08 database attacks, build, lint, relevant tests, migration chain, factory tests, and diff check pass. |
| AC-L06-14 — PASS | PASS | Scope remains L06, usage is persisted as unknown with null measured cost, and L20, L04, and L14 remain open. |

## Schedule and negative-case matrix

| Required schedule | Result | Durable observation |
|---|---|---|
| Cold success | PASS | Six runtime attempts/artifacts; one intent/policy; zero grant/effect/outcome rows. |
| Stop and resume | PASS | All five completion boundaries pass; independent boundary 3 retains exact completed records. |
| Claim and crash | PASS | Claim cannot be stolen before expiry; recovery preserves failure history and advances attempt. |
| Concurrent calls | PASS | Explicit promise barrier creates two arrivals at the same claim and converges without duplicate canonical rows. |
| Skeptic failure | PASS | Four upstream artifacts remain; trace fails; synthesizer and authority remain absent. |
| Input drift | PASS | Stored-input mutation is rejected before handler or artifact creation. |
| Tenant attack | PASS | Product and database scope checks reject foreign workspace/trace operations without mutation. |
| L08 regression | PASS | Both production races and all ten direct database attacks retain their sealed behavior. |

All fourteen `DB-L06-01` through `DB-L06-14` attacks execute against the real
SQLite schema. Each asserts the exact L06 error and an unchanged before/after
projection. Duplicate and out-of-order work is therefore checked below the
application layer as well as through executor requests.

## Migration and build evidence

The independent probe applies migrations `0000` through `0007` with foreign
keys enabled and verifies the L06 reasoning columns. The product suite also
covers five `0007` histories, including atomic rollback on invalid duplicate
success history. The production vinext build, active product/factory lint scope,
factory state tests, and `git diff --check` pass.

## Truth, limitations, and remaining findings

- Runtime execution means that durable claims invoke code-owned handlers and
  persist their results. It does not validate the underlying business evidence.
- Every handler artifact is labeled `FIXTURE`; no provider or live connector was
  observed in this stage.
- Usage is `unknown` and `measuredCostUsd` is `null`; no cost estimate is
  invented.
- The implementation is a sequential fixed graph, not an arbitrary workflow
  engine or a production-scale scheduler.
- L20 fixture/runtime drift remains intentionally outside this L06 suite; its
  stale legacy test is not release evidence for this correction.
- L20, L04, and L14 remain open for separate governed runs.

## Declared input bindings

| Input | SHA-256 |
|---|---|
| `factory/04_verify/CONTEXT.md` | `d5b7c506760afd06e4706d9e16fadfe51a97b7ce686c15fd84587988492732fa` |
| `factory/03_build/output/BUILD_EVIDENCE.md` | `f196e33acd0961016cd2a6b5857f9d09781ee72896fc156c8c22f50f577b67bc` |
| `factory/03_build/output/HUMAN_GATE.md` | `cf40bdb92a0a723290563e82b61f27bbc5183cc3f6d8afb7c64f6b24bc23b2c3` |
| `factory/02_data/output/DATA_PACKAGE.md` | `9fbda72f20659df210d95a6be5b1a13dbe4fde288461d5f435fcfdc8164bbaa6` |
| `factory/01_spec/output/SPEC.md` | `f90a9fa515c9e8357b12bb0374939fdeec7ba4580ffc6573d2f8384fdc67ea7c` |
| `factory/_shared/ARCHITECTURE_SNAPSHOT.md` | `e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `db/flight-recorder.ts` | `2cea63997ca52a5404fb02287297371c0a32d17d53a28512f7147243c01c6b39` |
| `db/flight-recorder-graph.ts` | `7ccfdf3bd101ec3152da9bf3eb3b366197e0fc7bc708a81ea24275e33d334061` |
| `db/flight-recorder-demo.ts` | `2d23a77f6ebea793650677872895c1376123a38bdeeec7f0dc6109a1bdbc08db` |
| `db/flight-recorder-contracts.ts` | `5057dd60c778165f11444875c5bfb6b669e8e889d1363ec9ebf5268af3bc9799` |
| `db/flight-recorder-schema.ts` | `aaf5a11d3f8e2a77c1d358891248c246551f9670493a4b0e8fb32b1e579ae9cb` |
| `db/migrations.ts` | `7d7512db9c1e49eeffa2089b6fb6ffee1c5071b899958d66ff3c8e198d5b1062` |
| `drizzle/0007_l06_persisted_graph_executor.sql` | `4649dc761eb877d4fc708bd6e8928e04375ccc1021486024b893eb62bec1cf1c` |
| `drizzle/meta/0007_snapshot.json` | `28d211019b32ddbd8ef3316b0a16e1a7163ce1bcff7ecb09c6e6419ea5f12eae` |
| `drizzle/meta/_journal.json` | `c8e05396284aef1f5307dcd0d6fd16a0c06cfa30a4cd227a46f7f8086ae634a7` |
| `tests/flight-recorder-build.test.mjs` | `7c5be086037e7dcb293ea6e76db17297d38ae1542c07231024ebe53e00359974` |
| `tests/flight-recorder-release.test.mjs` | `fda88e925e632e4d4aa25dc365712f2a14ae2074440d625c4974a145fe6c3b88` |
| `app/flight-recorder-types.ts` | `599890454757b677593540167c9359d2a6bd03b40bb361fc446128b58b4a1c24` |
