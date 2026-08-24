---
type: build-specification
stage: 01_spec
unit: fixture-runtime-source-of-truth-correction
finding: L20
status: proposed
---

# L20 fixture/runtime source-of-truth correction

## Decision

CrossSignal's durable product tree owns executable fixture truth. Run-scoped
factory artifacts may project, verify, and explain that truth, but application
code, workers, and durable product tests must never import a numbered factory
stage or rely on an active run retaining a particular fixture file.

`db/flight-recorder-demo.ts` remains the canonical owner of the onboarding
fixture's evidence, policy, outcome, intent, deterministic identity/time
materialization, and exact reset identity. `db/flight-recorder-graph.ts` (or a
pure durable `db/` definition module extracted from it) owns the one fixed graph
topology, citations, handler version, and runtime execution semantics. A
factory data fixture may only be a thin executable projection of these durable
owners; it may not carry an independently editable copy.

## Finding and baseline evidence

The sealed L06 tree proves three incompatible ownership signals:

1. `db/flight-recorder.ts` imports `buildFlightRecorderSeed` and fixture keys
   from `db/flight-recorder-demo.ts`, then persists the seed and invokes the
   L06 graph runtime. This is the actual product path.
2. `tests/flight-recorder-release.test.mjs` also imports the durable demo
   builder, while `tests/flight-recorder-data.test.mjs` and
   `tests/flight-recorder-build.test.mjs` import separate builders from
   `factory/02_data/fixtures/*`.
3. A normal factory seal archives and replaces the numbered stage folders.
   Those durable tests then fail at module resolution even though product code
   is unchanged. The factory lifecycle therefore changes the apparent product
   proof surface, and the independently editable fixture definitions can drift
   from the persisted runtime executor.

There is a second, narrower duplication inside the durable tree:
`buildPendingFlightRecorderDemo` constructs a precomputed six-node graph while
the L06 runtime owns `REASONING_NODE_REGISTRY`. Precomputed legacy/migration
fixtures may remain, but their topology, citations, and version identifiers
must be derived from the runtime-owned definition or checked for exact parity.

## Input bindings

| Input | SHA-256 |
|---|---|
| `factory/01_spec/CONTEXT.md` | `f1a29a11777dc7d4b9b7bdf44d0f5159e5b4db320778de853dcbf0b357727047` |
| `factory/_shared/ARCHITECTURE_SNAPSHOT.md` | `e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `db/flight-recorder-demo.ts` | `2d23a77f6ebea793650677872895c1376123a38bdeeec7f0dc6109a1bdbc08db` |
| `db/flight-recorder.ts` | `2cea63997ca52a5404fb02287297371c0a32d17d53a28512f7147243c01c6b39` |
| `db/flight-recorder-graph.ts` | `7ccfdf3bd101ec3152da9bf3eb3b366197e0fc7bc708a81ea24275e33d334061` |
| `tests/flight-recorder-data.test.mjs` | `18ea70aead27579460bcf01157953a3f8337f3a5eafde523b9b55b36a774f2b1` |
| `tests/flight-recorder-build.test.mjs` | `7c5be086037e7dcb293ea6e76db17297d38ae1542c07231024ebe53e00359974` |
| `tests/flight-recorder-release.test.mjs` | `fda88e925e632e4d4aa25dc365712f2a14ae2074440d625c4974a145fe6c3b88` |

The delegated human directive supplies the L20 label and sequencing. Read-only
benchmark-stash inspection corroborated the lifecycle failure; no stash is an
active dependency and no stash content is copied into this run.

## Ownership contract

| Concern | Durable authority | Allowed factory role | Forbidden dependency |
|---|---|---|---|
| Fixture keys, truth labels, evidence, policy, outcome, recipient cap, replay identity | `db/flight-recorder-demo.ts` or one extracted durable fixture module consumed by it | Import and verify the durable definition; record provenance and hashes | A runtime or durable test importing `factory/NN_stage/**` |
| Fixed graph topology, citations, handler/schema versions | `db/flight-recorder-graph.ts` or one extracted pure durable graph-definition module | Assert exact projection/parity | A second independently editable node registry in a factory fixture or demo builder |
| Persistence and exact tenant-scoped reset | `db/flight-recorder.ts` | Exercise through a controlled adapter/harness | A factory-owned SQL/reset package treated as runtime authority |
| Legacy `precomputed_fixture` compatibility | Durable migration/test helper derived from the same definitions | Supply labeled migration vectors | Presenting precomputed rows as runtime execution proof |
| Factory evidence | Current numbered stage outputs | Bind canonical inputs and observed results | Application, worker, or product module loading factory outputs at runtime |

Factory artifacts remain durable review records after acceptance, but they are
not product dependencies. Archiving or replacing an active run must be
behaviorally irrelevant to application startup, runtime execution, reset, and
the durable fixture/data/build/release test suites.

## Observable behavior

For the same `userId`, `workspaceId`, and ISO time, the durable fixture builder
produces byte-stable canonical JSON, hashes, identities, ordered evidence,
context manifest, outcome definition, intent inputs, and truth labels. Runtime
materialization persists that seed and the L06 executor creates graph attempts
from the one registered topology. UI and evidence continue to distinguish
`FIXTURE`, `TEST`, runtime execution, and legacy `precomputed_fixture` rows.

Reset remains authenticated by its caller, workspace-scoped, and exact: it may
delete only the canonical FIXTURE trace matching the durable fixture and trace
keys, preserves workspace membership and authority controls, and rebuilds via
the same durable source. Missing, renamed, or archived factory directories do
not affect the result.

## Compatibility and migration

- No database migration is expected for L20. Existing L06/L08 rows and the
  `execution_mode = 'precomputed_fixture' | 'runtime'` distinction remain valid.
- Export renames must use an intentional compatibility window or update every
  durable consumer atomically; stage-numbered names such as `STAGE_03_*` must
  not remain the public source-of-truth vocabulary after the correction.
- Existing persisted fixture keys must remain stable unless Stage 02 proves an
  explicit reset/migration plan. Silent key or hash changes are rejected.
- Benchmark stashes remain untouched and outside release-head coverage.

## Failure behavior

- Any import from `app/`, `db/`, or `worker/` into `factory/` is a release
  blocker.
- Any import by the durable fixture/data/build/release suites into numbered
  factory fixture paths is a release blocker. Factory-contract tests may still
  inspect the factory as factory infrastructure.
- A factory projection whose declared durable-source hash or exported values
  do not match fails closed with an L20-named verification error.
- Duplicate graph topology, citation, handler-version, fixture-key, truth-mode,
  or reset-scope definitions without an exact parity assertion fail review.
- Determinism, truth labeling, tenant isolation, or exact reset regressions fail
  before build acceptance; no fallback silently loads an archived fixture.

## Acceptance criteria

- **AC-L20-01 — dependency direction:** `app/`, `db/`, and `worker/` contain no
  imports from `factory/`; the durable data, build, and release suites contain
  no imports from `factory/02_data/fixtures`.
- **AC-L20-02 — one fixture authority:** fixture keys, evidence payloads,
  policy/outcome inputs, truth modes, caps, and deterministic seed construction
  have one durable product owner consumed by runtime and durable tests.
- **AC-L20-03 — one graph authority:** runtime and any labeled legacy
  `precomputed_fixture` builder derive topology, citations, and versions from
  one durable graph definition, with a negative parity test for drift.
- **AC-L20-04 — deterministic contract:** two builds with identical actor,
  tenant, and clock inputs are deeply equal and retain stable hashes, ordering,
  FIXTURE/TEST labels, and bounded recipient/cost policy.
- **AC-L20-05 — runtime proof:** an isolated migrated database materializes the
  canonical seed through `db/flight-recorder.ts`, runs the persisted graph, and
  resolves six succeeded runtime nodes and their artifacts under one tenant and
  trace without reading a factory file.
- **AC-L20-06 — reset safety:** exact reset removes and reconstructs only the
  caller's canonical FIXTURE trace; another tenant, authority control,
  membership, non-fixture trace, and prior release evidence remain unchanged.
- **AC-L20-07 — seal-transition resilience:** in an isolated copy with numbered
  factory fixtures absent or replaced by fresh templates, application build
  and durable L20 tests still resolve and pass.
- **AC-L20-08 — projection drift fails closed:** the Stage 02 executable data
  package binds the durable source hashes and demonstrates a named failure when
  fixture or graph projections disagree; it is never a second authority.
- **AC-L20-09 — compatibility and scope:** legacy precomputed rows remain
  explicitly labeled, no schema/history rewrite occurs, benchmark stashes are
  preserved, and the release makes no L04 authority-history or L14 endpoint
  change.

## Verification matrix

| Case | Required observation |
|---|---|
| Canonical deterministic build | Repeated identical inputs produce deep-equal fixture output and hashes |
| Runtime materialization | Persisted seed and six runtime graph nodes resolve under one trace |
| Missing factory fixture | Durable imports, targeted tests, and application build still resolve |
| Projection mutation | Named L20 verifier error; zero fallback to archive or stale copy |
| Graph-definition mutation | Parity check fails before handler execution |
| Cross-tenant reset | Access denied or zero mutation in both tenants |
| Exact reset | Canonical tenant trace rebuilds; authority/workspace/non-fixture rows persist |
| Truth-label regression | FIXTURE/TEST/precomputed/runtime distinction test fails |
| Legacy migration fixture | Existing precomputed history remains readable and explicitly non-runtime |
| Secret and archive scan | No secret-like fixture value and no active `_archive/` import |

## Delivery sequence

1. Stage 02 creates the executable ownership/projection contract and negative
   drift fixtures, binding the durable baseline without changing runtime code.
2. Stage 03 moves all durable consumers to the canonical product source,
   removes duplicate definitions, and proves runtime/reset behavior.
3. Stage 04 runs the full L20 matrix, build, lint, migration compatibility,
   tenant isolation, archive-independence, and secret scans.
4. Stage 05 binds reviewer-ready evidence to the final head and cold-runs the
   fixture without hidden repair.

## Non-goals

- Do not implement L04 append-only authority-control history or trace
  projection completeness.
- Do not implement the L14 authenticated trace-resolution endpoint.
- Do not redesign the fixed graph, add arbitrary DAG control, add a live
  provider, change authority semantics, rewrite persisted history, or broaden
  the fixture into production data.
- Do not pop, apply, rewrite, or delete any benchmark stash.

## Human decision requested

Accept this specification only if durable product code is clearly authoritative,
factory projections cannot become a second source, seal transitions cannot
break product proof, and the L20 boundary stays separate from L04 and L14.
