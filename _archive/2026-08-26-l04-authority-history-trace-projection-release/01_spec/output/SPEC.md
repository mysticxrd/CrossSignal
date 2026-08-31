---
type: stage-primary-output
stage: 01_spec
unit: append-only-authority-control-history-and-trace-projection-completeness
status: ready-for-review
truth_mode: repository-observed
created: 2026-08-25
---

# L04 append-only authority history and complete trace projection

## Product outcome

CrossSignal must preserve every workspace kill-switch transition as durable,
append-only authority history and must resolve every durable trace event into a
complete, ordered, tenant-scoped, redacted internal projection. An execution
must identify the exact authority-control record rechecked immediately before
the consequential effect. A later control change may change current authority,
but it may never rewrite what authorized or blocked an earlier execution.

The reviewer-visible result is one trace whose authority lineage can be
followed in order: immutable intent, deterministic policy decision, exact human
grant, exact workspace control state, effect, and later outcome. L04 produces
that durable/read-model contract. L14 will separately expose it through an
authenticated trace-resolution HTTP endpoint.

## Current repository evidence

1. `workspace_authority_controls` stores one mutable row per workspace.
   `setWorkspaceKillSwitch` overwrites `kill_switch_engaged`, `updated_by`, and
   `updated_at`, so the prior actor, value, and time disappear.
2. Execution correctly rechecks the workspace row before authority validation,
   but the resulting grant/effect trace does not bind the exact control record
   that was observed.
3. Action intents, policy decisions, approval grants, and flight-trace events
   already have workspace bindings and immutable or append-only guards. L08's
   active-intent pointer and stale-intent failures are accepted constraints and
   must remain unchanged.
4. `flight_trace_events` already owns a gap-free per-trace sequence, subject
   identity, actor identity, payload hash, idempotency key, and subject state
   machines for intent, policy, approval, and effect records.
5. Runtime writers emit trace and graph events, but do not yet emit a complete
   subject history for all authority records they create.
6. `readFlightRecorderSnapshot` selects only the active authority heads and a
   `COUNT(*)` of trace events. `FlightRecorderSnapshot` exposes
   `traceEventCount`, not the ordered durable events, so omissions and ordering
   cannot be resolved by the reviewer.

## Bounded scope

L04 owns:

- one canonical append-only history for the workspace kill switch;
- deterministic migration of the current workspace control row into that
  history without inventing a new actor or timestamp;
- fail-closed derivation of the effective control state from the latest valid
  history record;
- guarded, idempotent, tenant-scoped control transitions;
- trace bindings to the exact control history record used by execution;
- complete authority-subject trace events for newly created or migrated
  intents, policy decisions, approval grants, and effect attempts;
- a complete ordered redacted projection of every durable trace event through
  the existing authenticated server-side snapshot path;
- a minimal reviewer-visible ordered trace/history presentation and durable
  tests needed to prove the correction.

L04 does not own:

- an HTTP/API trace-resolution endpoint, route, transport contract, token
  format, or public query surface; those are L14;
- new authentication or role semantics beyond the existing server-derived
  owner and workspace authority;
- a generic audit-log platform, arbitrary authority controls, or a general
  event-sourcing framework;
- changes to L08 active-intent selection, approval binding, effect idempotency,
  provider behavior, graph topology, outcome semantics, or truth labels;
- raw chain-of-thought, raw provider responses, unrestricted event payloads,
  credentials, bearer tokens, or secrets in any projection.

## Authority-control history contract

### Identity and ordering

The durable history record has these semantic fields; Stage 02 may choose exact
column names but may not weaken their meaning:

| Field | Required meaning |
|---|---|
| event identity | Stable unique ID for one accepted control transition |
| workspace identity | Non-null tenant owner of the event and every uniqueness rule |
| sequence | Positive, gap-free, monotonically increasing sequence within the workspace |
| control kind | Closed value `kill_switch` for L04 |
| prior state | Previous boolean; null only for the first initialization/backfill event |
| current state | New boolean used by the authority check |
| actor identity | Authenticated workspace member derived on the server |
| reason code | Closed, non-secret reason such as initialization, migration, or owner transition |
| idempotency key | Unique within the workspace and stable for one logical transition |
| occurred time | Valid UTC instant, not earlier than the prior workspace event |
| content hash | Hash of the canonical non-secret event payload |

Events are the canonical source for effective kill-switch state. Runtime reads
the highest valid workspace sequence; absence, ambiguity, invalid ordering, or
an unverifiable head fails closed as `engaged`. A legacy/current-head table may
remain only as a derived compatibility projection and may not be used as an
independent authority source.

Every event is immutable and undeletable, including fixture workspaces. Resetting
a trace may delete that bounded FIXTURE trace under its existing contract, but
must not delete workspace authority-control history.

### Mutation semantics

- Only the authenticated owner path may request a transition. User input may
  contain the desired boolean, never workspace identity, actor identity,
  sequence, prior state, timestamps, or credentials.
- A transition compares the requested prior state and sequence with the latest
  durable event and appends exactly one successor. A stale or conflicting write
  fails closed and leaves history unchanged.
- Requesting the already-effective value is an idempotent no-op: it returns the
  same head and appends no duplicate event.
- Per-workspace sequence, idempotency, and prior-state constraints are enforced
  durably, not only in TypeScript.
- Execution rechecks the latest durable control event immediately before the
  grant/effect write. The accepted trace history binds that event identity,
  sequence, state, and content hash. A missing record denies execution.
- Control transitions and execution races must have one serializable winner.
  No schedule may authorize an effect from a stale `not engaged` observation
  after an `engaged` transition has won.

### Migration

For every existing `workspace_authority_controls` row, migration appends one
deterministic initialization/backfill event using the row's workspace,
`kill_switch_engaged`, `updated_by`, and `updated_at`. It does not claim a new
human action. Re-running the migration cannot append another event.

Migration fails with a stable error when the legacy row is missing its tenant,
actor membership, boolean state, or valid time, or when pre-existing history is
ambiguous. It never silently chooses among conflicting authority heads.

## Complete trace-event contract

### Write completeness

New durable authority records must have subject-bound `flight_trace_events` in
the same accepted write boundary as the records they describe:

- each intent reaches the appropriate durable intent state and a replacement
  records the prior intent's `superseded` transition;
- each policy decision records its deterministic verdict;
- each approval grant records the decision and the exact intent/policy binding;
- each effect records reserved, dispatching, and terminal or indeterminate
  progress consistently with `effect_attempt_events`;
- the execution authority event references the exact workspace control history
  event used by the immediate pre-dispatch recheck.

The existing subject state machines remain authoritative. L04 must not bypass
them with a synthetic display-only event. Duplicate ingress produces no second
canonical subject event. Historical migration events use deterministic IDs and
idempotency keys and must preserve global trace order.

### Read completeness and order

The internal `FlightRecorderSnapshot` gains an ordered `traceEvents` collection.
For the authenticated `(workspace_id, trace_id)` pair it contains every and
only durable `flight_trace_events` row, sorted by integer `sequence ASC`.

Each projected event contains:

- stable event ID and integer sequence;
- event type, subject type, and stable subject reference;
- prior and current state;
- actor type and a redacted/allowlisted actor display value;
- occurred time and payload hash;
- an allowlisted typed detail summary appropriate to the event type.

The projection never sorts by timestamp, silently deduplicates, paginates,
truncates, or drops unknown event types in L04. `traceEventCount` remains a
compatibility field and must equal `traceEvents.length`. Sequences must start at
one, be unique, and be contiguous. A row outside the authenticated workspace or
trace is never returned, even if its event or subject ID collides.

### Redaction boundary

The client-visible snapshot must not expose raw `payload_json`, raw
idempotency keys, credentials, bearer tokens, provider response bodies,
recipient addresses, email body text copied from an event, unrestricted actor
identifiers, or hidden reasoning. It exposes hashes and allowlisted summaries
needed to resolve the trace. Existing exact intent display remains governed by
the current authenticated owner view; trace-event projection must not duplicate
that sensitive payload.

Unknown or malformed payload fields are omitted from the typed detail summary,
not passed through. Secret-pattern checks apply to serialized projection output
and release evidence.

## Observable acceptance criteria

| ID | Required observable result |
|---|---|
| L04-AC01 | A kill-switch off/on/off sequence preserves three immutable, tenant-bound, gap-free history records with actors, times, hashes, and prior/current states. |
| L04-AC02 | Effective authority and the UI control state derive from the latest valid history event; absent or ambiguous history fails closed as engaged. |
| L04-AC03 | Same-value requests append nothing; stale/concurrent transitions cannot create forks, gaps, duplicate idempotency keys, or stale authorization. |
| L04-AC04 | Migration deterministically backfills each legacy control row once, preserves its actor/time/value, and fails on ambiguous or invalid historical authority. |
| L04-AC05 | Intent, policy, approval, and effect writes append subject-bound state-machine-valid trace events without weakening L08 active-intent authority. |
| L04-AC06 | Execution binds the exact control-history event observed by the immediate authority recheck; later toggles do not rewrite that evidence. |
| L04-AC07 | The snapshot returns every trace event exactly once in contiguous sequence order and `traceEventCount === traceEvents.length`. |
| L04-AC08 | Cross-tenant reads/writes and subject collisions fail closed; actor and workspace identities come from authenticated server authority. |
| L04-AC09 | Serialized client projection and evidence contain no raw event payload, raw idempotency key, secret, recipient address, copied email body, unrestricted user identifier, or hidden reasoning. |
| L04-AC10 | FIXTURE reset preserves workspace control history while retaining the existing bounded trace-reset behavior. |
| L04-AC11 | Existing fixture labels, L08 race outcomes, L06 graph durability, policy semantics, and provider behavior remain unchanged. |
| L04-AC12 | No L14 HTTP endpoint, route, public transport schema, or new authentication mechanism is added in this run. |

## Required negative cases

| ID | Attempt | Required result |
|---|---|---|
| L04-N01 | Update or delete a control-history event | Durable guard rejects it; history is byte-for-byte unchanged. |
| L04-N02 | Directly mutate a legacy/current control head without a valid event | Runtime authority remains event-derived and the bypass cannot change effective state. |
| L04-N03 | Read or toggle with a mismatched workspace/actor | Fails closed and returns no foreign history or trace event. |
| L04-N04 | Submit the current boolean twice | Second request is a no-op with no new event. |
| L04-N05 | Race two transitions from the same prior sequence | Exactly one successor wins; the loser is stale and no authorization uses a losing head. |
| L04-N06 | Remove, duplicate, reorder, or cross-bind a trace event | Database/projection verification fails; no incomplete trace is presented as complete. |
| L04-N07 | Insert an authority event for a foreign subject or inactive/superseded intent | Subject/tenant/active-intent guards reject it without weakening L08. |
| L04-N08 | Include a secret-like token, raw payload, email address, or body in projected details | Projection/evidence verification fails. |
| L04-N09 | Migrate a legacy control row with invalid actor membership, time, or state | Migration aborts with a stable error and appends no partial history. |
| L04-N10 | Reset the FIXTURE trace after toggling the control | Trace reset remains bounded; workspace control history survives. |
| L04-N11 | Read a trace with colliding event/subject IDs from another tenant | Only the authenticated workspace rows are returned. |
| L04-N12 | Treat L04 as authorization for an HTTP trace endpoint | Scope verification fails; route delivery waits for L14. |

## Stage handoff

Stage 02 must turn this specification into executable schema, migration,
fixture, projection, and negative-test contracts. It must explicitly resolve
event IDs, per-workspace/per-trace sequencing, migration ordering, redaction
allowlists, and race schedules before Stage 03 changes durable product code.

## Declared input hashes

| Input | SHA-256 |
|---|---|
| `factory/01_spec/CONTEXT.md` | `a1249366049bd008447abfd0d3caf1382d487628c7d3f11fda126632dfcce366` |
| `factory/_shared/ARCHITECTURE_SNAPSHOT.md` | `e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `factory/_lib/verify-kit.mjs` | `b2c7434bf3acacbfb6323b33cf0b175f77d0e3b1d66aeadee6e9ea996c95015c` |
| `factory/_lib/factory-state.mjs` | `72870904445d54f01eea443ed5a5de1b2af2fd19df66e085a52bf47982594d28` |
| `db/flight-recorder-schema.ts` | `aaf5a11d3f8e2a77c1d358891248c246551f9670493a4b0e8fb32b1e579ae9cb` |
| `db/flight-recorder-contracts.ts` | `5057dd60c778165f11444875c5bfb6b669e8e889d1363ec9ebf5268af3bc9799` |
| `db/flight-recorder.ts` | `5f173de447f77c2eafa6aad607b3a4ce5d43836523453be292fb8961d5a5659a` |
| `db/flight-recorder-demo.ts` | `40e489216a9dcb2d5ec9721ab70eae85c40cf39173a0e72a34dceaa63b6dd1ae` |
| `db/flight-recorder-graph.ts` | `248137ac1b37e252895ae4d4138a12062bd5c3bae8244c978f266c92de120cfd` |
| `app/flight-recorder-types.ts` | `599890454757b677593540167c9359d2a6bd03b40bb361fc446128b58b4a1c24` |
| `app/CrossSignalApp.tsx` | `f764416effea5014bee700dd42e8368bc2e1ce73d80da9b0dac4098a9998f501` |
| `drizzle/0004_typical_omega_red.sql` | `7faff14fddee736cf378e9010f4a1c113f20049f4d9714caf676f6296cf792b4` |
| `drizzle/0005_flight_recorder_guards.sql` | `17f5a4ffb041d4a3851c9ff441fe61a44274d687c1cbc917356bd247fe6094a7` |
| `drizzle/0006_l08_active_intent_authority.sql` | `a97ce8f9b2a6b595197981742f80b1c4089cf05d57834921b3855fa5d2f844c5` |
| `tests/flight-recorder-data.test.mjs` | `09ccb1926136f3611d618f62742be8e08a2ac399d2a67e70515af7c381d25624` |
| `tests/flight-recorder-build.test.mjs` | `0997721d66d69d8b66ee79f577ac1047a7d5af6f01ccba07d9fafa045c55b2a8` |
