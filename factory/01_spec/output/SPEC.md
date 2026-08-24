---
type: stage-output
stage: 01_spec
status: review-ready
unit: persisted-graph-executor-correction
finding: L06
---

# L06 persisted graph executor specification

## Decision

Replace the demo's precomputed reasoning-node materialization with one bounded
runtime executor for the approved six-node CrossSignal graph. The executor
must claim runnable work in durable state, invoke the node handler, validate
and persist its artifact, append trace evidence, and resume safely after an
interruption. It is not a generic DAG engine or a general agent platform.

This correction proves actual orchestration while retaining honest truth
labels: the current demo's sources, node handlers, provider, and outcomes remain
`FIXTURE`. Running fixture handlers through a real executor does not make their
business evidence `LIVE`.

## Baseline finding

Finding L06 is confirmed by three cooperating shortcuts:

1. `buildPendingFlightRecorderDemo` in `db/flight-recorder-demo.ts` constructs
   the complete six-node graph in memory, seals every artifact, and returns
   every node already marked `succeeded`.
2. `materializePendingDemo` in `db/flight-recorder.ts` consumes those completed
   objects and batches `pending -> running -> succeeded` writes plus artifact
   inserts without invoking a node runner or scheduling dependencies.
3. `AC-06` in `tests/flight-recorder-release.test.mjs` calls
   `planReasoningRecovery` over fixture-built objects. It proves classification
   logic, but not persisted interruption and resumed runtime execution.

The schema already models the six permitted node keys, attempts, node states,
artifacts, hashes, workspace ownership, and graph transitions. Those primitives
are necessary but are not themselves an executor.

## User-visible promise

For one authenticated workspace owner and one frozen onboarding-rescue trace,
CrossSignal can execute the fixed reasoning graph, stop or fail visibly,
resume only eligible incomplete work, and reconstruct which runtime node
produced each artifact. The trace may enter `awaiting_approval` only after the
synthesizer succeeds and the exact intent and policy rows are derived from its
persisted artifact.

The evaluator can distinguish:

- actual runtime graph execution from fixture preconstruction;
- a logical node from its individual execution attempts;
- completed work from pending, leased, interrupted, failed, or skipped work;
- executor truth from the truth mode of the evidence and generated content;
- reasoning execution from later human approval and external effects.

## Fixed graph contract

The topology is code-owned, versioned as `crosssignal-fixed-graph-v1`, and
cannot be supplied or changed by a request, model, fixture, or database row.
The deterministic topological order is the table order below.

| Node key | Required predecessors | Artifact kind | Bounded responsibility |
|---|---|---|---|
| `planner` | none | `plan` | Scope the reviewed onboarding-rescue question and name the evidence needed by later nodes. |
| `quantitative` | `planner` | `analysis` | Analyze the declared activation evidence without inventing causal certainty. |
| `qualitative` | `planner` | `analysis` | Analyze approved, redacted feedback and brand context. |
| `experiment_design` | `planner` | `analysis` | Define the capped TEST cohort and pre-registered outcome rule. |
| `skeptic` | `quantitative`, `qualitative`, `experiment_design` | `critique` | Challenge alternatives, missing evidence, and causal overreach. |
| `synthesizer` | `planner`, `quantitative`, `qualitative`, `experiment_design`, `skeptic` | `intent_draft` | Produce the single bounded action draft consumed by deterministic intent construction. |

Stage 03 may execute independent workers concurrently only if it proves the
same persisted results and deterministic dependency checks. Sequential
topological execution is acceptable and preferred for the first correction.

## Runtime boundary

### Entry

The public runtime entry receives authenticated actor and workspace authority,
then an exact `trace_id`. The database lookup must bind all three. The trace
must own one frozen context snapshot and be in `context_frozen`, `reasoning`, or
an explicitly recoverable graph state. A caller cannot submit node definitions,
handler names, dependency edges, truth mode, policy, or filesystem paths.

Starting execution creates or confirms the six logical nodes as `pending` and
appends the transition from `context_frozen` to `reasoning`. Initialization is
idempotent for `{workspace_id, trace_id, graph_version}`.

### Logical identity and attempts

The logical node identity is `{workspace_id, trace_id, graph_version,
node_key}`. Each execution attempt has a stable identity including a positive
attempt number. A retry or expired-lease recovery never overwrites a terminal
attempt; it appends a new attempt or equivalent immutable attempt evidence.

The input hash for an attempt is the canonical SHA-256 of:

- workspace and trace identity;
- frozen context manifest hash and trace truth mode;
- graph version, node key, node contract/handler version;
- ordered predecessor node keys and their persisted output hashes.

The executor must reject context drift, predecessor drift, missing artifacts,
undeclared citations, cross-workspace rows, and an input hash that does not
recompute exactly.

### Claim, invoke, and finalize

Runnable means every required predecessor has one succeeded canonical attempt
with a valid persisted artifact and no required predecessor is failed. The
executor uses a database compare-and-set claim with an opaque run/lease token
and deterministic expiry. Only the claim owner may finalize that attempt.

After claiming, the runtime invokes the code-owned handler. The handler receives
only the frozen context sources and persisted predecessor artifacts declared by
the fixed registry. It returns structured content, evidence citations, handler
version, timing, and measured usage/cost when available. Missing cost data is
stored and presented as unknown; it is never invented.

Success finalization is atomic across the canonical reasoning artifact, the
attempt's `succeeded` projection, and its append-only trace event. Content hash
and citations are validated before the write. A duplicate finalization with
the same identity and content is a no-op; different content fails closed.

### Completion and authority handoff

Only a successfully persisted synthesizer artifact may be used to construct an
action intent. After all six nodes succeed, one transaction or guarded batch:

1. confirms the exact synthesizer artifact and graph version;
2. creates the immutable intent and deterministic policy decision through the
   existing trusted contracts;
3. promotes that intent as the trace's active intent; and
4. transitions the trace from `reasoning` to `awaiting_approval` with an
   append-only event.

No approval grant or effect attempt is created by graph execution. The sealed
L08 active-intent authority rules remain unchanged and must pass in full.

## Interruption, duplication, and failure

### Interruption between nodes

On restart, succeeded attempts and their artifacts are preserved byte-for-byte.
The executor recomputes readiness from persisted state and claims only pending
nodes whose predecessors succeeded. It does not rebuild completed fixture
objects or replay their handlers.

### Interruption while running

An unexpired claim is busy and cannot be stolen. Once a deterministic lease has
expired, recovery compare-and-sets the abandoned running attempt to terminal
`failed` with stable code `l06_interrupted_attempt`, appends recovery evidence,
and creates the next pending attempt with a recomputed input hash. Reasoning
handlers have no external side effects; this recovery rule must never be reused
for approval or effect dispatch.

### Duplicate and concurrent invocation

Two invocations against the same workspace and trace may observe progress, but
only one claim may win for a logical node. They must converge to one canonical
successful artifact per node, one completion event per successful attempt, one
intent/policy pair, and no duplicate canonical sequence or idempotency key.

### Handler or contract failure

A handler exception, invalid artifact, secret-like value, undeclared citation,
or finalize CAS loss is persisted visibly. Non-recoverable handler failure
marks the attempt and trace `failed`; downstream nodes become `skipped` or stay
non-runnable according to the accepted data contract. It creates no intent,
policy, approval, grant, effect, or outcome. There is no blind retry. A new
human-authorized run or an explicitly defined recovery action is required.

## Persistence and trace evidence

At minimum, the durable trace must reconstruct:

- graph version and fixed topology;
- logical node key, attempt identity, input hash, handler version, state, and
  claim/recovery disposition;
- predecessor identities and exact output hashes used as inputs;
- start/completion/failure timestamps and stable error code;
- canonical artifact kind, content hash, evidence citations, and inherited
  truth mode;
- append-only graph events with workspace, trace, subject, actor, idempotency
  key, and ordered sequence;
- whether cost/usage was measured or remains unknown.

Schema changes are permitted only when Stage 02 proves existing rows cannot
represent the claim, attempt, or event invariants. Migration must preserve all
valid L08 data, fail atomically on invalid history, and prepare idempotently.

## Truth and claims

- `FIXTURE` evidence and deterministic fixture handlers stay `FIXTURE` in the
  database, API snapshot, UI, verification report, and demo script.
- "Runtime executed" describes the executor path, not the truth of the
  business evidence or a claim that a production model/provider ran.
- `TEST` and `LIVE` are permitted only when their real adapters and provenance
  are directly observed and independently verified.
- Fixture-built golden objects remain valid test oracles but cannot satisfy an
  acceptance criterion requiring persisted runtime execution.
- Comprehensive authority/cost-history repair remains L04; this run records
  executor evidence honestly but does not claim to close L04.

## Acceptance criteria

- **AC-L06-01 — runtime replacement:** the product path no longer materializes
  precomputed succeeded reasoning nodes and artifacts as execution. A test
  proves each persisted success came from an invoked runtime handler.
- **AC-L06-02 — fixed topology:** exactly the six registered nodes execute with
  the dependencies and topological order declared above; caller-supplied nodes,
  edges, handlers, graph versions, or arbitrary DAGs fail closed.
- **AC-L06-03 — exact inputs:** every attempt input hash recomputes from the
  frozen context, node/handler version, truth mode, and ordered predecessor
  hashes. Context or predecessor drift blocks execution with zero artifact.
- **AC-L06-04 — durable lifecycle:** persisted evidence shows pending, claimed
  running, and terminal state transitions plus one validated artifact and
  append-only event for each successful attempt.
- **AC-L06-05 — between-node resume:** an injected stop after any completed node
  resumes from the database, preserves completed IDs/hashes/timestamps, and
  invokes only remaining eligible handlers.
- **AC-L06-06 — running-node recovery:** an injected crash after claim leaves a
  visible running attempt; an unexpired claim is not stolen; deterministic
  expiry closes it as `l06_interrupted_attempt` and a later attempt completes
  without overwriting history or duplicating the canonical artifact.
- **AC-L06-07 — concurrent idempotency:** two barrier-controlled executor calls
  converge to six canonical successful artifacts, one intent/policy pair, and
  unique ordered/idempotent events with no partial duplicate writes.
- **AC-L06-08 — fail closed:** an injected handler error, invalid artifact,
  secret-like content, or undeclared citation records a visible failure,
  prevents downstream synthesis, and leaves zero intent, policy, grant, effect,
  or outcome rows.
- **AC-L06-09 — workspace authority:** exact actor/workspace/trace lookup and
  database constraints reject cross-workspace reads, claims, artifacts, events,
  and direct writes without changing either workspace.
- **AC-L06-10 — truth-mode honesty:** every runtime, API, UI, report, and demo
  surface distinguishes actual executor activity from `FIXTURE` evidence and
  makes no production-model, integration, exactly-once, or causal claim.
- **AC-L06-11 — guarded handoff:** only the persisted successful synthesizer
  artifact creates the immutable active intent and policy; incomplete or failed
  graphs cannot reach `awaiting_approval`; graph execution never grants approval
  or dispatches an effect.
- **AC-L06-12 — migration safety:** if persistence changes, empty, current L08,
  interrupted, completed, and invalid-history databases are covered; invalid
  history rolls back atomically and cold preparation is idempotent.
- **AC-L06-13 — regression safety:** L08 deterministic races and ten direct
  database attacks still pass, along with build, lint, full relevant tests,
  migrations, and diff inspection.
- **AC-L06-14 — claim discipline:** release evidence corrects only L06, states
  measured versus unknown executor cost honestly, and leaves L20, L04, and L14
  open for separate governed runs.

## Required deterministic schedules

1. **Cold success:** initialize from frozen context, invoke six handlers,
   persist six artifacts/events, derive the synthesizer-bound active intent,
   and stop at `awaiting_approval` with zero grant/effect.
2. **Stop and resume:** stop after each possible successful node boundary;
   rerun; previously completed handler counts remain one and final hashes match
   the uninterrupted run.
3. **Claim and crash:** pause after a worker claim; duplicate call observes busy;
   advance deterministic time past expiry; recovery closes the old attempt and
   completes a later attempt exactly once.
4. **Concurrent calls:** pause the first call before claim/finalize and start a
   second call; every interleaving converges without duplicate canonical rows.
5. **Skeptic failure:** upstream work remains visible, skeptic fails,
   synthesizer does not run, trace fails, and no authority/effect rows exist.
6. **Input drift:** mutate context or predecessor hash through an accepted test
   seam; execution fails before handler invocation and artifact creation.
7. **Tenant attack:** attempt cross-workspace invocation and direct database
   insertion/update for node, artifact, claim, and event relations; all fail
   closed with no foreign mutation.
8. **L08 regression:** run both edit/authorization race schedules and all ten
   L08 direct-database attacks unchanged.

Tests must use explicit promise barriers or deterministic clocks. Wall-clock
sleeps and probabilistic races are not acceptable evidence.

## Scope and non-goals

### In scope

- The fixed six-node runtime registry and executor.
- Persisted readiness, claim, attempt, artifact, event, failure, and recovery
  behavior required by the acceptance criteria.
- Minimal schema/migration and UI/API changes needed to expose truthful runtime
  evidence.
- Deterministic FIXTURE handlers that prove orchestration without claiming a
  production model integration.
- Preservation of the sealed L08 authority correction.

### Out of scope

- Arbitrary DAG definitions, dynamic node registration, agent swarms, generic
  queues, workflow builders, or user-authored prompts.
- New external connectors, production model/provider claims, background fleet
  scheduling, or production-scale observability.
- Approval redesign, effect retries, causal inference, or self-modifying policy.
- L20 fixture/runtime drift, L04 complete authority/cost history, and L14
  unresolvable-trace repair except for explicit non-regression.

## Declared input hashes

| Input | SHA-256 |
|---|---|
| `factory/01_spec/CONTEXT.md` | `e4341599a1d85f531806381787f9fa15bc5cee9e827ec9a113cae9d3f37488d0` |
| `factory/_shared/ARCHITECTURE_SNAPSHOT.md` | `e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `db/flight-recorder.ts` | `ab984e95650e30ff338ef8896a413267d5be6189709dd034060cf3eca31b1cc6` |
| `db/flight-recorder-demo.ts` | `74a8d6b28ddab26e1392e3bf43318ff3e7290ba4950d2806ab98efbb5387c369` |
| `db/flight-recorder-contracts.ts` | `5057dd60c778165f11444875c5bfb6b669e8e889d1363ec9ebf5268af3bc9799` |
| `db/flight-recorder-schema.ts` | `b86b23ca9a079fb6b458a631e75e7371d1723677be3c23ba82d154a0c2297b11` |
| `tests/flight-recorder-build.test.mjs` | `98a7c9232b2aa96a6fddd92e605ec07f540326876ae9020e2775602729cc57a9` |
| `tests/flight-recorder-release.test.mjs` | `65d341700d5378e79be376656ee0a8380108c3891ff560ea5ae912985ddc1e8c` |

## Review questions

1. Is the fixed dependency topology above the intended bounded graph?
2. Is deterministic lease expiry plus immutable attempt history acceptable for
   recovery from a claimed node?
3. Is sequential topological execution acceptable for the first release, with
   concurrency treated only as an optional implementation that must preserve
   identical persisted behavior?
4. Does the FIXTURE truth boundary make the runtime claim precise enough?
5. Are the explicit deferrals of L20, L04, and L14 acceptable?
