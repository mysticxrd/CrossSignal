---
type: stage-output
stage: 02_data
status: review-ready
unit: persisted-graph-executor-correction
finding: L06
fixture: persisted-graph-executor.fixture.mjs
---

# L06 persisted graph executor data package

## Decision

Represent the approved graph as a code-owned logical registry plus immutable
execution attempts. Persist the graph version and six-node topology in the
initialization event, but create an attempt row only when all predecessor
artifacts exist and its canonical input hash can be computed exactly.

This avoids fake placeholder input hashes. A logical node with no attempt is
still visibly pending in the graph projection; its first durable attempt is
created when it becomes runnable. The executable fixture is a reference model
and oracle for Stage 03, not the product executor.

## Existing-model gap

The current `reasoning_nodes` relation can store node keys, attempt numbers,
state, input/output hashes, errors, and timestamps. It cannot yet prove:

- whether a row was fixture-precomputed or produced by a runtime handler;
- graph and handler versions;
- ordered predecessor outputs used to compute the input hash;
- durable lease ownership and expiry;
- one active attempt and one canonical success per logical node; or
- immutable interrupted-attempt history with a later attempt.

Stage 03 must add only the persistence needed for these L06 facts. Existing L08
rows remain valid and must be backfilled as legacy precomputed fixture evidence,
never relabeled as runtime execution.

## Fixed logical registry

| Order | Node | Predecessors | Artifact |
|---:|---|---|---|
| 1 | `planner` | none | `plan` |
| 2 | `quantitative` | `planner` | `analysis` |
| 3 | `qualitative` | `planner` | `analysis` |
| 4 | `experiment_design` | `planner` | `analysis` |
| 5 | `skeptic` | `quantitative`, `qualitative`, `experiment_design` | `critique` |
| 6 | `synthesizer` | all prior nodes | `intent_draft` |

Registry version: `crosssignal-fixed-graph-v1`.

The runtime request contains authenticated workspace, actor, and trace identity
only. `nodes`, `edges`, `handler`, `graphVersion`, and `truthMode` are forbidden
request fields and map to `l06_arbitrary_graph_rejected`.

## Attempt persistence contract

Stage 03 may implement equivalent normalized tables, but the persisted fields
and constraints below are mandatory.

| Field | Contract |
|---|---|
| `logical_node_id` | Stable for workspace + trace + graph version + node key. |
| `id` | Stable attempt identity including logical node and positive attempt number. |
| `graph_version` | Exact code-owned registry version. Legacy rows use an explicit legacy value. |
| `execution_mode` | `runtime` or `precomputed_fixture`; existing rows backfill to `precomputed_fixture`. |
| `handler_version` | Exact code-owned handler contract version. |
| `predecessor_outputs_json` | Ordered node keys and persisted output hashes; valid JSON and canonical order. |
| `input_hash` | SHA-256 of workspace, trace, truth mode, context hash, versions, node, attempt, and predecessor outputs. |
| `current_state` | `pending`, `running`, `succeeded`, `failed`, or `skipped` under existing graph transitions. |
| `lease_token` | Opaque claim-owner token; required only while `running` and never emitted to user-visible evidence. |
| `lease_expires_at` | Deterministic expiry; required only while `running`. |
| `output_hash` | Required only for `succeeded`; equals the canonical artifact content hash. |
| `error_code` | Required for `failed`; stable L06 codes are preserved. |
| timestamps | Pending has none; running has start; terminal has completion. |

Required database uniqueness:

- existing `{workspace_id, trace_id, node_key, attempt}` identity remains unique;
- at most one `pending` or `running` attempt per logical node;
- at most one `running` attempt per logical node;
- at most one `succeeded` canonical attempt per logical node;
- artifact identity is unique for a node attempt and a conflicting content hash
  cannot replace the canonical artifact;
- graph event sequence and idempotency keys remain unique per workspace/trace.

Terminal attempts are immutable. Expired recovery changes the abandoned
`running` attempt to `failed` with `l06_interrupted_attempt`, then inserts a new
pending attempt with the next number. It never rewrites the prior attempt.

## Canonical input payload

The fixture executes the following canonical shape through the repository's
`sealCanonical` contract:

```json
{
  "workspaceId": "workspace_l06_fixture",
  "traceId": "trace_l06_fixture",
  "truthMode": "FIXTURE",
  "contextManifestHash": "<sha256>",
  "graphVersion": "crosssignal-fixed-graph-v1",
  "nodeKey": "skeptic",
  "handlerVersion": "crosssignal-fixture-handlers-v1",
  "attempt": 1,
  "predecessorOutputs": [
    { "nodeKey": "quantitative", "outputHash": "<sha256>" },
    { "nodeKey": "qualitative", "outputHash": "<sha256>" },
    { "nodeKey": "experiment_design", "outputHash": "<sha256>" }
  ]
}
```

Predecessor order comes from the fixed registry. A missing, reordered, foreign,
or changed output blocks claim before handler invocation.

## Artifact contract

Every successful handler returns structured content with:

- `truthMode: FIXTURE`;
- graph, node, and handler versions;
- ordered predecessor outputs;
- declared evidence citations;
- a bounded summary with no hidden chain-of-thought;
- usage status and measured cost, or `unknown` with `null` cost.

The existing `validateReasoningArtifact` and `sealCanonical` contracts run
before persistence. Secret-like content, undeclared citations, invalid JSON, or
conflicting duplicate content maps to `l06_invalid_artifact`. The artifact,
attempt success projection, and completion event commit atomically.

## Lifecycle oracle

1. Initialization appends `graph.initialized` with the fixed topology and
   creates only the runnable planner attempt.
2. A claim recomputes the exact input hash, compare-and-sets pending to running,
   and stores a lease token/expiry.
3. Finalization requires the exact unexpired token, validates and seals the
   runtime-produced artifact, marks the attempt succeeded, and appends
   `graph.node_succeeded`.
4. Success materializes newly runnable attempts in registry order.
5. Synthesizer success confirms all six canonical artifacts, creates one
   intent/policy pair bound to the synthesizer artifact, and transitions the
   trace to `awaiting_approval`.
6. Graph execution always leaves grant, effect, and outcome counts at zero.

## Stable errors

| Code | Meaning |
|---|---|
| `l06_arbitrary_graph_rejected` | Caller attempted to control topology, handlers, version, or truth mode. |
| `l06_claim_busy` | An unexpired owner already holds the logical node. |
| `l06_claim_expired` | A caller attempted finalization after deterministic expiry. |
| `l06_claim_ownership_mismatch` | The finalize/recovery token does not own the attempt. |
| `l06_dependency_blocked` | A required predecessor or completion invariant is absent. |
| `l06_input_drift` | Recomputed context/predecessor input differs from the stored hash. |
| `l06_interrupted_attempt` | An expired running attempt was closed visibly before a later attempt. |
| `l06_invalid_artifact` | Artifact content, citations, secret scan, or duplicate hash failed. |
| `l06_handler_failed` | The bounded handler failed without blind retry. |
| `l06_workspace_trace_mismatch` | Actor, workspace, trace, row, or relation ownership disagrees. |

## Executable schedules

| ID | Schedule | Executable oracle |
|---|---|---|
| `S-L06-01` | Cold success | Six succeeded runtime attempts/artifacts, one intent and policy, zero grants/effects/outcomes. |
| `S-L06-02` | Stop and resume | Stop after boundaries 1–5; completed IDs/hashes remain and each handler count is one. |
| `S-L06-03` | Claim and crash | Duplicate observes busy; expiry retains failed attempt 1 and succeeds attempt 2. |
| `S-L06-04` | Concurrent calls | Wrong token fails; one token finalizes; duplicate same-token finalize is idempotent. |
| `S-L06-05` | Skeptic failure | Four upstream artifacts remain, skeptic fails, synthesizer is absent, and authority/effects remain empty. |
| `S-L06-06` | Input drift | Mutated predecessor hash blocks claim before handler invocation or artifact creation. |
| `S-L06-07` | Tenant attack | Foreign workspace/trace and caller-controlled graph fields fail before mutation. |
| `S-L06-08` | L08 regression | Stage 03 must run the existing two L08 race schedules and ten direct attacks unchanged. |

The fixture uses deterministic timestamps and explicit operations. It contains
no sleep, timer, network, model, provider, or random race.

## Direct-database attack package

The fixture exports fourteen stable attacks, `DB-L06-01` through `DB-L06-14`,
covering cross-workspace/trace writes, unregistered nodes and edges,
out-of-order claims, predecessor drift, lease theft/expiry, undeclared or
secret artifacts, conflicting duplicates, early authority handoff, and direct
trace transition. Stage 03 must implement them against the real database and
prove zero partial mutation.

## Fixture truth boundary

`persisted-graph-executor.fixture.mjs` is an executable reference model. It
imports repository canonical hashing and artifact validation, but its state is
in memory and every evidence/handler artifact is `FIXTURE`. Passing Stage 02
does not prove a database executor exists. Only Stage 03 product tests and Stage
04 independent persisted-runtime probes may make that claim.

## Acceptance mapping

| Stage 01 criterion | Stage 02 contract |
|---|---|
| AC-L06-01/02 | Fixed registry, forbidden request fields, and handler invocation counters. |
| AC-L06-03/04 | Canonical input payload, attempt fields, lifecycle, events, and artifacts. |
| AC-L06-05/06 | Boundary stop/resume and expired-running attempt oracle. |
| AC-L06-07 | Claim-owner/idempotent-finalize schedule. |
| AC-L06-08 | Failure and artifact-validation schedules with zero authority rows. |
| AC-L06-09 | Fourteen attack cases and exact scope checks. |
| AC-L06-10 | FIXTURE truth boundary and explicit `execution_mode`. |
| AC-L06-11 | Synthesizer-only intent/policy handoff; grant/effect remain empty. |
| AC-L06-12 | Legacy precomputed backfill plus empty/current/interrupted/completed/invalid migration cases. |
| AC-L06-13 | Existing L08 schedule delegated unchanged to Stage 03. |
| AC-L06-14 | Unknown cost is explicit; L20, L04, and L14 remain open. |

## Stage 03 handoff

Stage 03 must implement the fixture semantics in durable product code. It must
not import this reference model into runtime code or pass by replaying fixture
objects. Tests may import it only as an oracle. Any implementation that labels
legacy rows as runtime, creates child input hashes before predecessors exist,
exposes lease tokens, or creates authority before synthesizer success violates
this data package.

## Declared input bindings

| Input | SHA-256 |
|---|---|
| `factory/02_data/CONTEXT.md` | `c4e7c6e44af8e0abe82aca39ce48754066caf1b3114f3aa51925bba766e37888` |
| `factory/01_spec/output/SPEC.md` | `f90a9fa515c9e8357b12bb0374939fdeec7ba4580ffc6573d2f8384fdc67ea7c` |
| `factory/01_spec/output/HUMAN_GATE.md` | `beb2466f7082e9cca93550db9be7c3bf06c43caa184422d9c1b6ad8700f74664` |
| `factory/_shared/ARCHITECTURE_SNAPSHOT.md` | `e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `db/flight-recorder-contracts.ts` | `5057dd60c778165f11444875c5bfb6b669e8e889d1363ec9ebf5268af3bc9799` |
| `db/flight-recorder-schema.ts` | `b86b23ca9a079fb6b458a631e75e7371d1723677be3c23ba82d154a0c2297b11` |
| `db/flight-recorder-demo.ts` | `74a8d6b28ddab26e1392e3bf43318ff3e7290ba4950d2806ab98efbb5387c369` |
| `factory/02_data/fixtures/persisted-graph-executor.fixture.mjs` | `fb2d985e76b6f05bfdda04cfa42b6effbf1dd75d96e1756947e7f555463f9051` |

## Review questions

1. Accept creating attempt rows only when their exact predecessor-derived input
   hash is computable, while projecting not-yet-runnable logical nodes from the
   fixed registry and initialization event?
2. Accept explicit `precomputed_fixture` backfill for all legacy reasoning rows?
3. Accept the mandatory attempt/lease/version fields and partial uniqueness
   constraints as the minimum L06 schema delta?
4. Accept fourteen direct-database attacks and the eight schedule oracles as
   the Stage 03 executable contract?
