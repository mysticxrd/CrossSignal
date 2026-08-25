---
type: executable-data-package
stage: 02_data
unit: fixture-runtime-source-of-truth-correction
finding: L20
status: proposed
---

# L20 fixture/runtime ownership data package

## Transformation

The accepted specification is represented as deterministic executable cases in
`fixtures/fixture-runtime-ownership.fixture.mjs`. The fixture is a hash-bound
factory projection of the current durable product owners. It supplies no
runtime data and exports no builder consumed by application or durable tests.

Stage 03 receives a closed set of dependency-direction, projection, graph,
reset, and seal-transition cases. Product changes pass only when the durable
tree satisfies these cases and numbered factory fixtures can disappear without
changing runtime behavior.

## Input bindings

| Input | SHA-256 |
|---|---|
| `factory/02_data/CONTEXT.md` | `98183d21218902525ead8bc31677e61e9010b04a1a6be5b862e5588337b1c547` |
| `factory/01_spec/output/SPEC.md` | `2b4acd7fecccf0c952de54ca8ac81bcc3511353e27ed9d34e75640599bc40ca0` |
| `factory/01_spec/output/HUMAN_GATE.md` | `74390b5ce66fa24d6d068decc2fb7105dbf49e164ccbda47a57fd608ba8b7bcb` |
| `factory/_shared/ARCHITECTURE_SNAPSHOT.md` | `e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `db/flight-recorder-demo.ts` | `2d23a77f6ebea793650677872895c1376123a38bdeeec7f0dc6109a1bdbc08db` |
| `db/flight-recorder.ts` | `2cea63997ca52a5404fb02287297371c0a32d17d53a28512f7147243c01c6b39` |
| `db/flight-recorder-graph.ts` | `7ccfdf3bd101ec3152da9bf3eb3b366197e0fc7bc708a81ea24275e33d334061` |
| `tests/flight-recorder-data.test.mjs` | `18ea70aead27579460bcf01157953a3f8337f3a5eafde523b9b55b36a774f2b1` |
| `tests/flight-recorder-build.test.mjs` | `7c5be086037e7dcb293ea6e76db17297d38ae1542c07231024ebe53e00359974` |
| `tests/flight-recorder-release.test.mjs` | `fda88e925e632e4d4aa25dc365712f2a14ae2074440d625c4974a145fe6c3b88` |
| `factory/02_data/fixtures/fixture-runtime-ownership.fixture.mjs` | `ca07b39075bb92c760b4f5876b46b80268c4acdbe560dbb6c160cf73bb2b464e` |

## Executable schema

The fixture exports these immutable structures and evaluators:

| Export | Contract |
|---|---|
| `L20_ERRORS` | Eight stable named failure codes for archive authority, dependency direction, fixture/graph projection, duplicate graph authority, truth modes, and reset scope |
| `DURABLE_PROJECTION` | Current fixture keys, cap, truth modes, graph/handler/schema versions, and ordered six-node topology |
| `IMPORT_CASES` / `evaluateImport` | Six allowed/forbidden dependency-direction cases |
| `PROJECTION_MUTATIONS` / `assertDurableProjection` | One positive projection and five named drift mutations |
| `RESET_CASES` / `evaluateResetCase` | Exact same-tenant reset, cross-tenant denial, and non-FIXTURE preservation |
| `SEAL_TRANSITION_CASE` | Missing numbered fixture with unchanged durable runtime/test expectations |
| `ACCEPTANCE_COVERAGE` | Explicit mapping for all nine accepted criteria |

## Canonical projection

- Fixture key: `onboarding-rescue:stage03-v1` (preserved for row compatibility)
- Trace key: `onboarding-rescue-stage03-v1`
- Spending cap: `$0.15`
- Evidence/trace truth: `FIXTURE`
- Intended effect truth: `TEST`
- Graph: `crosssignal-fixed-graph-v1`
- Handler: `crosssignal-fixture-handlers-v1`
- Artifact schema: `reasoning-artifact-v2`
- Ordered nodes: planner; quantitative, qualitative, experiment design;
  skeptic; synthesizer

These values describe the current accepted durable baseline. Stage 03 may
rename stage-numbered exports while preserving persisted values. Any value
change requires an explicit compatibility decision rather than silent drift.

## Case inventory

### Dependency direction

- `IMP-L20-01`: durable runtime importing durable demo is allowed.
- `IMP-L20-02`: durable runtime importing a factory fixture fails with
  `l20_forbidden_product_factory_import`.
- `IMP-L20-03`: a durable Flight Recorder test importing a numbered fixture
  fails with `l20_forbidden_test_fixture_import`.
- `IMP-L20-04`: any active archive import fails with
  `l20_active_archive_dependency`.
- `IMP-L20-05`: the factory verifier reading durable product truth is allowed.
- `IMP-L20-06`: the factory infrastructure test inspecting a factory verifier
  remains allowed.

### Projection drift

- `DRIFT-L20-01`: fixture-key drift fails.
- `DRIFT-L20-02`: graph-version drift fails.
- `DRIFT-L20-03`: FIXTURE → LIVE truth-mode drift fails.
- `DRIFT-L20-04`: duplicate graph-node authority fails.
- `DRIFT-L20-05`: predecessor topology drift fails.

### Reset and transition

- `RESET-L20-01`: exact same-tenant FIXTURE reset deletes one trace and
  preserves workspace, membership, authority, other-tenant/non-fixture traces,
  and prior evidence.
- `RESET-L20-02`: cross-tenant reset deletes zero and returns the named reset
  scope error.
- `RESET-L20-03`: same-tenant TEST trace deletes zero.
- `SEAL-L20-01`: runtime resolves solely from durable sources when numbered
  factory fixtures are absent.

## State and authority

The data fixture is pure and performs no database, filesystem, network,
authentication, approval, or effect mutation. It describes expected results;
Stage 03 must prove them through authenticated runtime entry points and an
isolated migrated database. Actor/workspace identity remains server-derived,
and factory case fields never become trusted runtime input.

## Provenance and truth labels

Every value is either bound to the accepted specification or extracted from
the declared durable baseline. `FIXTURE`, `TEST`, `precomputed_fixture`, and
runtime execution remain distinct. The package contains no LIVE claim, secret,
provider credential, copied benchmark data, or archive dependency.

## Stage 03 handoff

Stage 03 must:

1. remove the two durable test imports from `factory/02_data/fixtures/*`;
2. keep application/runtime/worker imports directed only into durable product
   modules;
3. consolidate the demo's precomputed topology with the runtime graph
   definition without introducing a circular runtime dependency;
4. rename stage-numbered TypeScript exports while preserving persisted key
   values or provide an explicit compatibility adapter;
5. add executable deterministic, projection-drift, runtime persistence,
   cross-tenant reset, and missing-factory tests;
6. leave L04, L14, migrations, archives, and benchmark stashes unchanged.

## Acceptance mapping

All `AC-L20-01` through `AC-L20-09` keys have at least one executable case.
The data verifier rejects missing keys, unknown case identifiers, a non-named
negative result, input hash drift, secrets, or an open Stage 01 gate.

## Non-goals

No product code, migration, L04 history, L14 endpoint, general graph, provider,
archive, or benchmark change belongs to this data stage.

## Human decision requested

Accept only if the package is a projection rather than a second authority, the
negative errors are stable and specific, reset and seal-transition cases are
complete, and the Stage 03 handoff is sufficiently unambiguous to build.
