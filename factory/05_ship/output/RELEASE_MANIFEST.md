---
type: stage-output
stage: 05_ship
status: ready-for-review
unit: persisted-graph-executor-correction
finding: L06
release_state: review-candidate-uncommitted
---

# CrossSignal L06 release manifest

## Release identity

CrossSignal is a human control layer for consequential agent actions. This
release candidate corrects L06 by executing the fixed six-node
`crosssignal-fixed-graph-v1` through persisted runtime attempts instead of
materializing precomputed successful reasoning rows.

The product is a standalone evaluator release. It does not claim access to or
integration with Result's private infrastructure. The final Git identity is
assigned only after the Stage 05 gate is accepted and the complete release is
committed; until then, the hashes below are the review-candidate identity.

| Field | Value |
|---|---|
| Corrected finding | `L06` |
| Graph | `crosssignal-fixed-graph-v1` |
| Execution | `runtime` handlers with durable attempts and artifacts |
| Topology | Fixed planner → workers → skeptic → synthesizer graph |
| Evidence truth | `truth_mode: FIXTURE` |
| Effect adapter | `effect_mode: TEST` |
| Cost | Persisted as `unknown`; measured cost is `null` |
| Authority after graph | One intent, one policy, zero grants, zero effects |
| Reviewer trace | The workspace-scoped trace ID displayed by the cold UI |

## Truth manifest

Runtime execution and evidence truth are separate dimensions. `runtime` means
the product claimed work, invoked code-owned handlers, and persisted their
attempts and artifacts. It does not turn the deterministic handler inputs or
business evidence into live observations.

| Surface | Truth | What it establishes | What it does not establish |
|---|---|---|---|
| Six reasoning nodes | `runtime` execution | Durable claims, attempts, content-addressed outputs, resume, and recovery | Model quality, live provider use, or general DAG scheduling |
| Context and evidence | `FIXTURE` | Deterministic, versioned, frozen inputs with explicit citations | Current customer or production evidence |
| Email path | `TEST` | Exact payload-bound authority and terminal effect-state handling | Live delivery or exactly-once delivery |
| Outcome | `FIXTURE`, correlated | A recorded event followed a confirmed TEST action | Causality; the result is correlated, not proven |
| Usage and cost | `unknown` | No fabricated measurement | Actual token, provider, or dollar cost |

No blind retry occurs after an ambiguous post-dispatch result. No lease token
or terminal lease value is exposed in the user-visible snapshot.

## Architecture

```text
versioned FIXTURE evidence
        ↓
frozen context manifest
        ↓
fixed runtime graph
planner → quantitative ┐
        → qualitative  ├→ skeptic → synthesizer
        → experiment   ┘
        ↓
immutable action intent → deterministic policy
        ↓
exact human authorization → TEST adapter
        ↓
append-only effect/result → correlated-only outcome assessment
```

Every graph node has a stable logical identity, canonical input hash, attempt
history, handler and graph version, output hash, and ordered trace events.
Completed nodes survive interruption. An expired claim retains a failed
`l06_interrupted_attempt` before a later attempt may succeed. The graph can
propose authority objects only after synthesis; it cannot grant authority or
perform an external effect.

## Threat model

| Threat | Release control and proof |
|---|---|
| Caller supplies topology or `LIVE` truth | Product rejects it with `l06_arbitrary_graph_rejected` before projection mutation. |
| Cross-workspace execution | Runtime scope checks and database triggers fail closed; fourteen L06 database attacks preserve the prior projection. |
| Input, predecessor, or context drift | Canonical input hashes are recomputed before handler invocation and artifact creation. |
| Duplicate or concurrent executor calls | Database identities, claims, barriers, and unique events converge on one canonical graph. |
| Worker failure or invalid artifact | Synthesis and all authority/effect rows remain absent. |
| Crash while holding a lease | Unexpired work remains busy; expiry records an immutable failed attempt before recovery. |
| Stale or mutated authority | The retained L08 regression suite covers both deterministic races and ten direct database attacks. |
| Ambiguous provider response | State becomes indeterminate with no blind retry. |
| Secret or chain-of-thought leakage | Artifacts retain bounded outputs and citations; secrets, lease tokens, and hidden reasoning are excluded. |

The single-user UI does not visually prove tenant isolation. Tenant protection
is release evidence from direct database and runtime attacks, not a visual
claim.

## Cold setup

Requires Node.js 22.13 or newer:

```bash
npm install
npm run demo:prepare
npm run dev
```

Open `http://localhost:3000/` and follow the [cold reviewer
script](DEMO_SCRIPT.md). `demo:prepare` applies migrations `0000` through `0007`
to local D1 and is safe to run repeatedly. It does not insert successful graph
attempts or artifacts. Workspace load creates the frozen context and calls the
runtime executor. If a trace already exists, use **Reset exact FIXTURE trace
for replay** before the walkthrough.

Run the release verifier independently with:

```bash
npm run verify:ship
```

## Proof index

| Claim | Primary evidence |
|---|---|
| Accepted scope and fourteen criteria | [Stage 01 specification](../../01_spec/output/SPEC.md) |
| Durable implementation and attack matrix | [Stage 03 build evidence](../../03_build/output/BUILD_EVIDENCE.md) |
| Independent persisted-runtime proof | [Stage 04 verification report](../../04_verify/output/VERIFICATION_REPORT.md) |
| Exact verification commands | [Stage 04 command evidence](../../04_verify/output/VERIFY.md) |
| Human acceptance of verification | [Stage 04 gate](../../04_verify/output/HUMAN_GATE.md) |
| Runtime executor | [`db/flight-recorder-graph.ts`](../../../db/flight-recorder-graph.ts) |
| Product integration and snapshot | [`db/flight-recorder.ts`](../../../db/flight-recorder.ts) |
| Database enforcement | [`drizzle/0007_l06_persisted_graph_executor.sql`](../../../drizzle/0007_l06_persisted_graph_executor.sql) |
| Product and adversarial schedules | [`tests/flight-recorder-build.test.mjs`](../../../tests/flight-recorder-build.test.mjs) |
| Independent release schedules | [`tests/flight-recorder-release.test.mjs`](../../../tests/flight-recorder-release.test.mjs) |
| Cold evaluator path | [Stage 05 reviewer script](DEMO_SCRIPT.md) |

## Corrected and remaining findings

**Corrected: L06.** The production entry point now runs the bounded six-node
graph through durable runtime attempts, canonical artifacts, stable input
hashes, interruption recovery, and concurrency controls before synthesis may
create one intent and one policy.

**Still open:** L20 fixture/runtime drift outside this correction, L04, and L14.
No other audit finding is represented as closed by this release.

## Residual limits

- The handlers are deterministic and consume `FIXTURE` inputs. No live evidence
  connector or model provider was observed.
- The executor is a sequential fixed graph, not an arbitrary workflow engine,
  agent swarm, or production-scale scheduler.
- Measured cost remains unknown; the release persists no invented estimate.
- The TEST adapter does not prove live delivery, exactly-once semantics, or
  production provider reconciliation.
- A correlated fixture outcome is not causal evidence.
- The reviewer UI presents one authenticated workspace; written adversarial
  verification, not the single-user screen, carries the tenant-isolation proof.
- L20's stale legacy fixture/release-test drift remains outside this L06 run and
  is not used as release evidence.

## Declared input bindings

| Input | SHA-256 |
|---|---|
| `factory/05_ship/CONTEXT.md` | `5e27c404a256624435833e55b679d4ef74c01ff16422cb4612a1e5f7748a2397` |
| `factory/04_verify/output/VERIFICATION_REPORT.md` | `86d4fb838cc0c3b52c6c27cbcc2cef1fddb4c92629d3c4f98bdb7a2e32bd5ce0` |
| `factory/04_verify/output/HUMAN_GATE.md` | `756c6e06ecdc706a954021b5d1116a1a66bc857d998aa3c3f0b71c1d7dd59390` |
| `factory/_shared/ARCHITECTURE_SNAPSHOT.md` | `e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `README.md` | `7e140c6ebeb75777e9302af506d710ff74444633b5fa2744f61553ec959bf192` |
| `package.json` | `c8a9ab36760f08998d304efdc6a4d514a22f8d7ea05ab8c8df992ecc09f75972` |
| `app/` | `974df6dfac034fd4af980d2f625e2197f776d7db7d98342148eb3c91909c8c15` |
| `db/` | `e1f7f51c76fa2c631bfa8faaf6b697b5c14911a2103c9c4de69f51c5e3214be3` |
| `drizzle/` | `38142fd6078ee3aff6b2bc29c665caa50f4f293df658ab3dfd3cf937ac15d5cf` |
| `worker/` | `8e9098389533594afeb27c533357aa71ca2a2eca189b409a1f55affb4981b568` |
| `tests/` | `970597507bd424edfc3f1c3e7ac99273b7636f1014c68379c463bd3d6cd51296` |
| `factory/05_ship/prepare.mjs` | `b001dabf650e93f2c6f530a8abade5fee9fb5a89198cf00bf8b25b0de2613e28` |
| `factory/05_ship/verify.mjs` | `da630e4159950cae0bcc6321f7f47cb767970a753e0e90db220b8f1e76a6e6ec` |
| `factory/05_ship/output/DEMO_SCRIPT.md` | `070c87134b82f913d5b56dd083b358b3a413b61f324e02f699686a97cf39b0fd` |
