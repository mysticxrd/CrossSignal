---
type: stage-output
stage: 02
status: ready-for-review
project: CrossSignal
slice: onboarding-rescue
fixture_key: onboarding-rescue:2026-08-13.1
fixture_sha256: c6170c0267ef7dbd920d1b29f55753977e110e427425331616796443bae321ff
---

# CrossSignal onboarding-rescue data package

This package makes the accepted Spec executable without changing its product
promise. The existing case-demo tables remain intact. New Flight Recorder
tables and validators own the bounded evidence-to-outcome chain.

## Acceptance boundary

| Spec criterion | Executable Data contract |
|---|---|
| `AC-01` reconstructable trace | Workspace-bound trace, evidence, context, graph, intent, authority, effect, observation, assessment, and ordered trace-event identities. |
| `AC-02` exact approval | Canonical intent payload plus recipient, context, policy, nonce, and expiry hashes; trusted-write resealing and database JSON bindings make the displayed and dispatched fields identical before policy, grant, or reservation. |
| `AC-03` safe effect | One unique intended-effect key and one use per grant; append-only effect events represent confirmed, failed, indeterminate, and reconciled terminal paths. |
| `AC-04` qualified outcome | Immutable metric definition, cohort, baseline, window, rule, observations, limitations, and four allowed assessment labels. |
| `AC-05` tenant isolation | Every new table carries `workspace_id`; composite foreign keys reject references to another workspace even when an object ID is known. |
| `AC-06` recovery | Trace, context, and reasoning projections enforce legal durable transitions; stable `(workspace, trace, node, attempt)` identity and terminal output hashes let only incomplete nodes resume. |
| `AC-07` adversarial failure | Shared validators and database guards reject undeclared context/evidence, mutation, replay, expiry, cross-tenant references, invalid transitions, secrets, and ambiguous retries. |
| `AC-08` cold replay | A deterministic FIXTURE trace, capped TEST intent, exact reset package, focused tests, and local D1 migration probe are checked in. |

## Entity and ownership manifest

| Plane | Durable entities | Ownership and identity |
|---|---|---|
| Workspace authority | `workspace_authority_controls` | Workspace-owned fail-closed kill switch, changed only by a workspace member. |
| Trace | `flight_traces`, `flight_trace_events` | Workspace + stable trace key; immutable truth/ownership, legal projection edges, ordered events, valid subjects, and idempotency keys. |
| Evidence | `flight_evidence` | Workspace + trace + evidence key; content hash, source version/ref, truth mode, ingress idempotency. |
| Context | `context_snapshots`, `context_snapshot_sources`, `context_snapshot_supersessions` | Frozen ordered manifest; every source position, version, access decision, retrieval record, and hash resolves to one snapshot. |
| Graph | `reasoning_nodes`, `reasoning_artifacts` | Fixed six-node vocabulary; attempt identity, input/output hashes, schema version, exact evidence citations. |
| Outcome definition | `outcome_definitions` | Pre-registered cohort, baseline, metric window, assessment rule, and hashes. |
| Authority | `action_intents`, `policy_decisions`, `approval_grants` | Immutable intent payload; deterministic verdict; one exact, expiring, actor-owned grant. |
| Effect | `effect_attempts`, `effect_attempt_events` | Unique intended effect and one grant use; append-only provider state and receipt evidence. |
| Outcome | `outcome_observations`, `outcome_assessments`, `outcome_assessment_supersessions` | Signed or labeled observation; additive qualified assessment and explicit supersession. |

All user-authored or effect-reserving rows also bind to existing
`workspace_members`. New compound
foreign keys use `(workspace_id, id)` so an ID from another tenant cannot be
linked. Immutable facts append; only trace, context, and node projections may
advance through guarded forward transitions.
Non-fixture chain-of-custody rows reject direct deletion. FIXTURE traces remain
deletable only so the scoped reset contract can restore a canonical demo.

## State machines

`db/flight-recorder-contracts.ts` is the shared state vocabulary. SQLite/D1
guards enforce durable trace, context, graph, effect, and trace-event edges;
immutable intent, policy, approval, and outcome facts are represented as
append-only subject events whose prior/current states must form a legal chain.
These are the legal forward edges; omitted edges fail closed.

```text
trace: collecting -> context_frozen -> reasoning -> awaiting_approval -> executing -> observing -> assessed
context: collecting -> frozen -> superseded
graph: pending -> running -> succeeded | failed; pending -> skipped
intent: drafted -> sealed -> policy_evaluated -> approval_pending -> approved -> consumed
policy: unevaluated -> deny | allow | approval_required
approval: pending -> approved -> consumed; pending -> rejected | expired
effect: reserved -> dispatching -> confirmed | failed | indeterminate; indeterminate -> reconciled_confirmed | reconciled_failed
outcome: preregistered -> observed -> assessed -> superseded; preregistered | observed -> inconclusive
```

`failed`, `cancelled`, `rejected`, `expired`, `consumed`, `confirmed`, and both
reconciled effect states are terminal where declared. In particular,
`indeterminate -> dispatching` is impossible: reconciliation or a new intent
and approval is required.

## Canonicalization and validators

- `stableStringify` recursively sorts object keys and rejects undefined or
  non-finite values before SHA-256 sealing.
- `createContextManifest` requires contiguous positions, unique source IDs,
  version/ref/hash/access/retrieval provenance, and no denied source in the
  consumed snapshot.
- `sealActionIntent` normalizes and caps one to three TEST recipients, requires
  evidence and metric identity, scans content for secret-like values, and binds
  every displayed authority field into one canonical payload hash.
- `validatePersistedActionIntent` independently re-seals a stored row and
  rejects any canonical JSON, flattened-field, recipient, cap, or hash drift.
- `validateExecutionAuthority` rechecks actor/workspace, trace, intent, policy,
  grant, payload, context, recipients, nonce, expiry, kill switch, and prior
  attempt count immediately before reservation.
- Reasoning and outcome validators reject unresolved citations, secret-like
  artifacts, invalid labels, missing limitations, unsupported observations,
  and overclaiming from invalid signatures.
- Migration guards repeat tenant/hash joins and bind every flattened intent
  field to its canonical JSON at the database boundary. D1 does not provide a
  built-in SHA-256 function, so the trusted write path must run
  `validatePersistedActionIntent` before insert; consumers must run it again
  before authority validation. Both layers fail closed.

No hidden chain-of-thought is represented. Reasoning artifacts store bounded
schema output, a short conclusion, exact evidence IDs, and hashes only.

## Golden fixture

The executable builder is
`factory/02_data/fixtures/onboarding-rescue.fixture.mjs`.

- Fixture: `onboarding-rescue:2026-08-13.1`, truth mode `FIXTURE`.
- Action: three-recipient capped email adapter path, truth mode `TEST`.
- Evidence/context sources: five, each versioned, hashed, labeled, and ordered.
- Graph: planner, quantitative, qualitative, experiment design, skeptic, and
  synthesizer; six persisted outputs with resolvable citations.
- Replay: one workspace membership, disabled workspace kill switch, seven
  ordered trace events, three complete effect events, and every required
  identifier/timestamp needed for fresh-D1 insertion.
- Authority: one sealed intent, `approval_required` policy decision, one exact
  unexpired owner grant, and one intended effect.
- Effect: `reserved -> dispatching -> confirmed` with a labeled FIXTURE provider receipt.
- Outcome: one FIXTURE observation and a `correlated` assessment with explicit
  small-cohort, fixture, and no-causal-inference limitations.

Canonical hashes:

- fixture_sha256: c6170c0267ef7dbd920d1b29f55753977e110e427425331616796443bae321ff
- context_manifest_sha256: 0fe1f2fdf8d574b6c1f61a041a9b32ce9d63b2d1ac6a2552eedd9649514dde95
- intent_payload_sha256: 9fd186721fa2238f1cf4b256b7b51cae0696929220884aa3d391762e7b75e90c
- policy_sha256: 247fb95ed53ad3b6acdf04cdedd20fde994a4cf9bb1a32e1b7330a66f88eacf6
- recipient_set_sha256: 44587cb13ee6812be89b20a3aa2c0dc43a47af488f355894737d64033186bb4e
- outcome_assessment_sha256: 7a8a590de829e2a6ee25281edfaa13ca2ce203b4ab1cb70798f62e855c1580a5

## Reset semantics

`factory/02_data/fixtures/reset.mjs` accepts only the exact canonical fixture
workspace ID, fixture key, and `FIXTURE` truth mode. It deletes that one trace,
relies on trace-scoped foreign-key cascades, then returns the deterministic
fixture for reinsertion. It preserves the user, workspace, membership, kill
switch, every unrelated trace, and prior release evidence.

The Data verifier applies every migration to a fresh temporary D1, materializes
the complete canonical trace in dependency order, checks every expected row and
foreign key, then replays cross-tenant, mutation, transition, canonical binding,
kill-switch, replay, sequence, overclaim, and trace-scoped reset attacks.

## Migration manifest

- `drizzle/0004_typical_omega_red.sql` creates the workspace authority control
  plus 17 Flight Recorder chain tables, composite foreign keys, uniqueness
  constraints, JSON/hash/time checks, caps, truth modes, and indexes.
- `drizzle/0005_flight_recorder_guards.sql` adds 53 cross-table authority,
  citation, context-manifest, transition, immutability, append-only, and
  fixture-reset guards that a declarative Drizzle schema cannot express.
- `db/migrations.ts` now refuses runtime access until the essential new tables
  and guard triggers exist.
- `drizzle.config.ts` generates from both the legacy schema and the separate
  Flight Recorder schema; future generation therefore compares the full model.

## Build handoff

Stage `03_build` must consume this package without redefining its contracts:

1. Add repositories that derive actor/workspace server-side and transact
   evidence, context, graph, intent, policy, grant, effect, and outcome writes.
2. Use the checked-in fixture materialization order and expose the exact
   trace-scoped reset through an owner-only fixture route.
3. Render the four accepted surfaces from persisted records under one
   `trace_id`; do not present fixture builder objects as runtime proof.
4. Re-seal persisted intents, route every effect through
   `validateExecutionAuthority`, and reserve the actor-bound unique intended
   effect before adapter dispatch.
5. Append effect/trace events and projections transactionally; never retry an
   indeterminate dispatch without reconciliation or new authority.
6. Keep LIVE, TEST, and FIXTURE labels visible at ingestion, approval, effect,
   outcome, and reviewer surfaces.

## Known limits

- This stage defines and verifies executable data contracts; it does not claim
  that the existing UI or server routes use them yet. That is Stage 03 work.
- The email provider response and activation observation are FIXTURE evidence;
  no production or private Result integration is claimed.
- Local D1 migration application is verified. No remote database was mutated.
- The model supports a single bounded email-test action and fixed graph, not a
  generic connector catalog, arbitrary DAG, causal platform, or agent swarm.
- Retention classes and parseable chronological expiry timestamps are enforced
  structurally; scheduled
  purge/reconciliation workers remain Build work.

## Declared input hashes

Repository text is normalized to LF by `.gitattributes`. Text inputs are
normalized to LF before SHA-256; binary inputs are hashed byte-for-byte.
Directory hashes are SHA-256 over UTF-8
`repository-relative-path NUL file-sha256 LF` lines sorted by full path.

| Input | SHA-256 |
|---|---|
| `factory/01_spec/output/SPEC.md` | `bcbe3dbffe2471617e48cda0f2b2cbf9cea00ef6a60f943ce827077ad8cd27e8` |
| `factory/01_spec/output/VERIFY.md` | `5f1aa86c74096bd167a996c01e727eea671a0fe42a2e91c4676a8eba3e88f1fe` |
| `factory/01_spec/output/HUMAN_GATE.md` | `27d414666e861ca8a5abdb8b93329a2c87f1681ccd4e1124f040dcb6a042cb71` |
| `factory/_shared/ARCHITECTURE_SNAPSHOT.md` | `e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `.gitattributes` | `95990bcc46ebd855393090abf83dd7e8e1c63b0b07630f1e31131a70cd5a1e22` |
| `db/` | `1e7ddf64566f037083cc5da9f7af3a3a5211833932a35b58a7122cc341a762b6` |
| `drizzle/` | `39786e0012f0e21742ab5a18ac71cdd7c901f612782e4722f568c402abf25cd5` |
| `app/case-types.ts` | `7ef995a5dd97a4c611c332f261dcebccf021fbaf753ab9e40210163bc34d5e63` |
| `app/workspace-types.ts` | `5e0859bb8aff3cab90787fd54d22e1a721c09e0056141fd8a4b9cca464d09c09` |
| `tests/` | `0ea15e33723053d3638a9f8fca242067f457f30785657fe8d73d6d41d851eb0b` |
| `factory/02_data/fixtures/` | `f6b0f9153953abd3f3779af8d28c4d4b4e1e0c90a5b89adc9a03e76c016961f6` |
| `factory/02_data/wrangler.verify.jsonc` | `8168b01a75aa15fe415e183b7668571d0e682a1f0bfdd2cb6635cae3b766de30` |
| `factory/02_data/verify.mjs` | `3f5140e02d9cb9f7bad5c4f650d3711b09ace0c19be0564e37f23794fbf756b3` |
| `drizzle.config.ts` | `3ec3fe6a06a9be54bbd980ec2fc72b014bfdc7d30b5c92d02aa0aa3c95e39b1a` |
| `package.json` | `92a28cfb3dbfefdee3f614bc7574977de7f52b83c337e25f034c9a0ac04d920d` |
| `package-lock.json` | `86d8480136f787a56fe5c47602dbb2db0af497d0daaa237178b707be5229f6aa` |
