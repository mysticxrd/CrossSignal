---
type: stage-primary-output
stage: 02_data
unit: append-only-authority-control-history-and-trace-projection-completeness
status: ready-for-review
truth_mode: executable-fixture
fixture_version: l04-authority-trace-v1
created: 2026-08-25
---

# L04 executable authority-history and trace data package

## Data-package outcome

Stage 03 receives one exact implementation contract: canonical workspace
authority-control events, an immutable effect-to-control binding, complete
authority subject events, a complete ordered redacted projection, deterministic
migration policy, and one executable FIXTURE covering the accepted happy,
negative, migration, collision, and race schedules.

The package does not authorize an HTTP endpoint. The existing authenticated
owner snapshot remains the only L04 read surface; L14 owns endpoint delivery.

## Ownership and truth

| Object | Owner | Truth role |
|---|---|---|
| `workspace_authority_control_events` | Durable database | Canonical ordered workspace kill-switch history and effective authority head |
| `workspace_authority_controls` | Legacy compatibility only | Frozen migration input; never runtime authority after L04 |
| `effect_authority_control_bindings` | Durable database | Immutable proof of the exact unengaged control head used to reserve one effect |
| `flight_trace_events` | Durable database | Canonical ordered per-trace subject and trace history |
| `FlightRecorderSnapshot.traceEvents` | Authenticated read model | Complete redacted projection of durable trace events, never an authority source |
| `l04-authority-trace.fixture.mjs` | Stage 02 | Labeled deterministic FIXTURE contract; never live state |

No mutable application object, UI state, event count, fixture file, or legacy
control row may override the latest valid authority event.

## Durable schema contract

### `workspace_authority_control_events`

Stage 03 adds this table in both Drizzle schema and migration
`0008_l04_authority_history_trace_projection.sql`:

| Column | Contract |
|---|---|
| `id` | `TEXT PRIMARY KEY NOT NULL`; stable event identity |
| `workspace_id` | `TEXT NOT NULL`; foreign key to workspace |
| `sequence` | `INTEGER NOT NULL`; positive gap-free workspace sequence |
| `control_kind` | `TEXT NOT NULL`; L04 closed value `kill_switch` |
| `prior_state` | nullable integer boolean; null only at sequence one |
| `current_state` | integer boolean, not null |
| `actor_user_id` | `TEXT NOT NULL`; composite workspace-membership foreign key |
| `reason_code` | `TEXT NOT NULL`; `workspace_initialized`, `migration_backfill`, or `owner_transition` |
| `idempotency_key` | `TEXT NOT NULL`; unique inside workspace |
| `payload_json` | canonical non-secret JSON containing the semantic event fields |
| `content_hash` | lowercase 64-character SHA-256 of `payload_json` |
| `occurred_at` | valid UTC instant, nondecreasing against prior sequence |

Required indexes and keys:

- `idx_authority_control_events_workspace_id` unique on `(workspace_id, id)`;
- `idx_authority_control_events_sequence` unique on
  `(workspace_id, sequence)`;
- `idx_authority_control_events_idempotency` unique on
  `(workspace_id, idempotency_key)`;
- `idx_authority_control_events_head` on
  `(workspace_id, control_kind, sequence)`;
- workspace FK and composite `(workspace_id, actor_user_id)` membership FK;
- JSON, SHA-256 shape, boolean, reason-code, control-kind, positive-sequence,
  and valid-time checks.

Required triggers:

| Trigger | Required rule / stable failure |
|---|---|
| `trg_l04_authority_events_append_only` | Reject every update with `l04_authority_history_immutable` |
| `trg_l04_authority_events_delete_guard` | Reject every delete, including FIXTURE, with `l04_authority_history_immutable` |
| `trg_l04_authority_events_sequence` | First event is sequence 1 with null prior; successor is max+1, matches prior current state, changes value, and has nondecreasing time; otherwise `l04_authority_history_sequence` or `l04_authority_history_noop` |
| `trg_l04_authority_events_actor` | Actor is a member of the same workspace; otherwise `l04_authority_history_actor_mismatch` |
| `trg_l04_legacy_authority_control_frozen` | Reject future update/delete of legacy heads with `l04_legacy_authority_control_frozen` |

The runtime reseals `payload_json` before treating a row as authority. Missing,
malformed, hash-mismatched, multi-head, or unavailable history returns an
effective state of engaged and stable error `l04_missing_authority_control`.

### `effect_authority_control_bindings`

This table avoids nullable legacy columns on `effect_attempts` and preserves a
strict one-effect/one-authority proof:

| Column | Contract |
|---|---|
| `workspace_id` | non-null tenant identity |
| `trace_id` | non-null trace identity |
| `effect_attempt_id` | non-null effect identity; primary key with workspace |
| `authority_control_event_id` | exact canonical control event identity |
| `authority_control_sequence` | exact workspace sequence copied from the event |
| `authority_control_hash` | exact event content hash copied from the event |
| `bound_at` | valid UTC instant at or after the control event time |

Required bindings:

- primary key `(workspace_id, effect_attempt_id)`;
- composite FK `(workspace_id, trace_id, effect_attempt_id)` to the effect;
- composite FK `(workspace_id, authority_control_event_id)` to the control
  event; and SHA-256/time checks.

Required triggers:

| Trigger | Required rule / stable failure |
|---|---|
| `trg_l04_effect_authority_bindings_immutable` | Reject update/delete with `l04_effect_authority_immutable` |
| `trg_l04_effect_authority_binding_exact` | Referenced event is the latest workspace `kill_switch` event, is unengaged, and sequence/hash match; otherwise `l04_stale_authority_control` |
| `trg_l04_effect_reserved_requires_authority` | Before the first `effect_attempt_events.reserved` row, require the exact binding; otherwise `l04_missing_authority_control` |
| `trg_l04_trace_executing_requires_authority` | A trace `executing` event's allowlisted payload refs must match the active intent, effect, and effect authority binding; otherwise `l04_trace_authority_projection_mismatch` |

The runtime writes approval grant, effect attempt, effect authority binding,
first effect event, trace state, and executing trace event in one D1 batch. A
trigger rejection rolls back the complete authority/effect boundary. A direct
effect row without a binding is inert: it cannot reach `reserved`, dispatch,
or produce an executing trace.

## Migration and compatibility contract

### SQL migration phase

`0008_l04_authority_history_trace_projection.sql` performs these ordered steps:

1. Create both L04 tables, indexes, checks, foreign keys, and assertion helpers.
2. Abort with `migration_l04_unresolvable_effect_authority` if any non-FIXTURE
   trace owns an existing effect attempt without an already exact L04 binding.
3. Abort with `migration_l04_incomplete_trace_history` if a non-FIXTURE trace
   has authority rows but lacks a valid complete authority subject chain.
4. Delete only existing `flight_traces.truth_mode = 'FIXTURE'` rows through the
   already accepted bounded reset/cascade contract. They are regenerated cold
   with complete L04 history. Workspace control rows/history are not deleted.
5. Freeze the legacy control table and install all new write guards.
6. Remove temporary assertion objects and finish with foreign-key checking.

The migration never invents historical authority for durable non-FIXTURE
effects. Ambiguous durable history blocks release and requires explicit human
remediation.

### Runtime compatibility phase

`ensureDatabaseCompatibility()` adds the new tables, indexes, triggers, and
columns to its checked-in schema inventory, then executes idempotent control
history bootstrap before serving a snapshot:

1. Read each legacy `workspace_authority_controls` row with its membership.
2. Reject invalid boolean, time, membership, or conflicting existing history
   as `migration_l04_invalid_authority_history` or
   `migration_l04_ambiguous_authority_history`.
3. Canonically seal the legacy workspace/value/actor/time as one
   `migration_backfill` event with deterministic ID and idempotency key.
4. `INSERT OR IGNORE`, reread, and byte-compare the stored event. A mismatch
   fails; a retry produces no additional row.
5. For new workspaces, materialization appends sequence-one
   `workspace_initialized` directly and does not create a mutable legacy head.

The compatibility promise resets on failure and may retry safely, matching the
existing `compatibilityReady` behavior.

## Authority mutation and race contract

`setWorkspaceKillSwitch` remains owner-authenticated and accepts only the
desired boolean. It reads and reseals the latest event:

- missing/invalid head returns engaged and fails the write;
- desired value equal to current is a no-op returning the same event head;
- a real change seals one `owner_transition` successor at `head.sequence + 1`;
- the database sequence/prior-state trigger chooses the winner under races;
- a losing writer maps to `l04_stale_authority_control` and appends nothing.

Execution loads the current unengaged event, pauses at the existing race hook,
then attempts the atomic effect boundary. The binding trigger rechecks that the
same event is still the latest. The executable fixture owns three schedules:

1. pause wins before reservation: effect batch aborts and effect count stays 0;
2. reservation wins before pause: one effect binds sequence 3, then sequence 4
   may engage without rewriting the effect evidence;
3. two toggles share one prior head: one sequence-4 successor wins and one
   stale writer fails.

## Trace subject-event catalog

All events use the existing global `(workspace_id, trace_id, sequence)` order,
subject binding, idempotency, time, and state-machine guards. Product writers
append these transitions in the same D1 batch as the described durable rows:

| Subject | Required L04 transitions |
|---|---|
| intent | `drafted -> sealed -> policy_evaluated -> approval_pending`; replacement appends prior `superseded`; approved execution appends `approved -> consumed` |
| policy | `unevaluated -> deny | allow | approval_required` |
| approval | `pending -> approved | rejected`; an approved one-time grant later appends `consumed` |
| effect | `reserved -> dispatching -> confirmed | failed | indeterminate`, consistent with `effect_attempt_events` |
| trace | Existing lifecycle; `executing` binds active intent, effect, and exact control-event reference |

Event IDs derive from stable idempotency identities. Retry/duplicate ingress
finds the same record or fails the whole batch; it never appends a second
canonical transition. Existing graph, context, trace, and outcome semantics are
unchanged.

## Ordered redacted projection contract

`readFlightRecorderSnapshot` performs one tenant-bound query:

```sql
SELECT id, sequence, event_type, subject_type, subject_id, prior_state,
       current_state, actor_type, actor_id, payload_json, payload_hash,
       occurred_at
FROM flight_trace_events
WHERE workspace_id = ? AND trace_id = ?
ORDER BY sequence ASC
```

Before returning, the server validates:

- nonempty sequence begins at 1 and is contiguous/unique;
- every row matches the authenticated workspace and resolved trace;
- every payload reseals to `payload_hash`;
- subject event prior/current chains are continuous;
- row count equals `traceEventCount`.

Any failure throws `l04_trace_projection_incomplete`; no partial trace is
presented. Unknown event types remain in the ordered list with empty details.

The client type contains only `id`, `sequence`, `eventType`, `subjectType`,
`subjectRef`, `priorState`, `currentState`, `actorType`, `actorDisplay`,
`occurredAt`, `payloadHash`, and typed `details`. Actor display is closed:
`Workspace owner`, `CrossSignal system`, `Bounded reasoning agent`, or
`Labeled adapter`.

Detail keys are allowlisted by subject type exactly as exported by
`L04_PROJECTION_DETAIL_ALLOWLIST`. Raw `payload_json`, idempotency key,
`actor_id`, recipients, email subject/body, provider response body, credentials,
secrets, and hidden reasoning never cross the client boundary. Unknown payload
keys are omitted.

The reviewer UI renders the complete collection in sequence order and labels
it `Persisted FIXTURE trace`; it does not claim a live provider or L14 endpoint.

## Executable fixture contract

`factory/02_data/fixtures/l04-authority-trace.fixture.mjs` exports immutable:

- version and tenant identities;
- one legacy control row and off/on/off canonical history;
- the effective unengaged head used by one confirmed effect;
- a 34-event global trace including graph, intent replacement, two policies,
  approval, exact control binding, effect, outcome, and trace lifecycle;
- reversed mixed-tenant input with colliding event/subject IDs and an expected
  34-event primary-tenant projection;
- the redaction allowlist;
- three deterministic race schedules;
- six migration cases;
- all twelve accepted criterion IDs and all twelve negative-case IDs;
- `validateL04Fixture`, which checks hashes, control/subject chains, ordering,
  tenant filtering, redaction, coverage, races, and migration cases.

Fixture truth is `FIXTURE`; the provider remains labeled `FIXTURE`/`TEST`.

## Stage 03 change map

| Product path | Authorized transformation |
|---|---|
| `db/flight-recorder-schema.ts` | Add both L04 tables, indexes, FKs, and checks |
| `drizzle/0008_l04_authority_history_trace_projection.sql` | Implement guarded migration/reset/assertion contract |
| `drizzle/meta/0008_snapshot.json`, `drizzle/meta/_journal.json` | Record checked-in migration metadata |
| `db/migrations.ts` | Verify L04 objects and run deterministic idempotent legacy bootstrap |
| `db/flight-recorder-contracts.ts` | Add canonical control-event sealing/validation and redacted projection contracts |
| `db/flight-recorder-demo.ts` | Seed canonical initialization and complete authority subject events from durable fixture truth |
| `db/flight-recorder-graph.ts` | Append intent/policy subject chains in the accepted reasoning handoff without changing graph topology |
| `db/flight-recorder.ts` | Replace mutable control reads/writes, bind effects, complete authority events, validate/project all trace events |
| `app/flight-recorder-types.ts` | Add redacted trace/control-history projection types |
| `app/CrossSignalApp.tsx` | Render minimal persisted ordered authority/trace history |
| `tests/flight-recorder-data.test.mjs` | Prove schema, migration, event, redaction, and fixture data contracts |
| `tests/flight-recorder-build.test.mjs` | Prove cold migration, runtime writers, tenant isolation, races, resets, projection completeness, and L08/L06 regressions |
| `tests/fixtures/l04-authority-trace.fixture.mjs` | Copy the accepted durable attack/expectation fixture; product tests must not import numbered factory paths |

No route, endpoint, middleware, authentication protocol, provider adapter,
general DAG, or unrelated file is authorized.

## Acceptance and negative coverage

| Accepted ID | Stage 02 executable evidence |
|---|---|
| L04-AC01 | Three fixture control events; append-only/sequence/hash validation |
| L04-AC02 | Effective head plus missing/invalid-history fail-closed contract |
| L04-AC03 | No-op rule and three race schedules |
| L04-AC04 | Six migration cases and deterministic bootstrap identity |
| L04-AC05 | Full intent/policy/approval/effect subject chains in 34 trace events |
| L04-AC06 | Effect reserved details and binding point to control event sequence 3/hash |
| L04-AC07 | Mixed/reversed input projects all 34 primary events in order; count matches |
| L04-AC08 | Collision tenant uses same event/subject IDs and is filtered out |
| L04-AC09 | Allowlist and serialized forbidden-field checks |
| L04-AC10 | Migration/reset contract deletes FIXTURE traces, never control history |
| L04-AC11 | Stage 03 map preserves L08/L06/truth/provider contracts |
| L04-AC12 | Authorized path map contains no L14 transport surface |

| Negative ID | Stage 02 executable evidence |
|---|---|
| L04-N01 | Immutable update/delete trigger contract |
| L04-N02 | Frozen legacy head and event-only runtime truth |
| L04-N03 | Owner/membership trigger plus mixed-tenant projection |
| L04-N04 | Same-value no-op fixture rule |
| L04-N05 | Toggle/effect race schedules and stable stale error |
| L04-N06 | Fixture sequence, payload-hash, and subject-head validator |
| L04-N07 | Existing subject binding plus L08 active-intent guards |
| L04-N08 | Allowlist and forbidden serialization probes |
| L04-N09 | Invalid membership/time/boolean and ambiguous-head migration cases |
| L04-N10 | FIXTURE reset/control-history survival contract |
| L04-N11 | Same-ID collision rows excluded by workspace/trace filter |
| L04-N12 | L14 exclusion verified against Stage 03 path map |

## Declared input hashes

| Input | SHA-256 |
|---|---|
| `factory/02_data/CONTEXT.md` | `5db9abd329345ef96b5c6bb0ea3714d693610c6e3263386b4875b6f4de03ffe3` |
| `factory/01_spec/output/SPEC.md` | `a61807c8500b2b1038c8acdeb340d82999fc86c1be53bd428e6390f74204a527` |
| `factory/01_spec/output/HUMAN_GATE.md` | `a8944174459eed47ebbcb8ba3ed896d96fc6430c7629a95e2a1662473af13a73` |
| `factory/_shared/ARCHITECTURE_SNAPSHOT.md` | `e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `factory/_lib/verify-kit.mjs` | `b2c7434bf3acacbfb6323b33cf0b175f77d0e3b1d66aeadee6e9ea996c95015c` |
| `factory/_lib/factory-state.mjs` | `72870904445d54f01eea443ed5a5de1b2af2fd19df66e085a52bf47982594d28` |
| `db/flight-recorder-schema.ts` | `aaf5a11d3f8e2a77c1d358891248c246551f9670493a4b0e8fb32b1e579ae9cb` |
| `db/flight-recorder-contracts.ts` | `5057dd60c778165f11444875c5bfb6b669e8e889d1363ec9ebf5268af3bc9799` |
| `db/flight-recorder.ts` | `5f173de447f77c2eafa6aad607b3a4ce5d43836523453be292fb8961d5a5659a` |
| `db/flight-recorder-demo.ts` | `40e489216a9dcb2d5ec9721ab70eae85c40cf39173a0e72a34dceaa63b6dd1ae` |
| `db/flight-recorder-graph.ts` | `248137ac1b37e252895ae4d4138a12062bd5c3bae8244c978f266c92de120cfd` |
| `db/migrations.ts` | `7d7512db9c1e49eeffa2089b6fb6ffee1c5071b899958d66ff3c8e198d5b1062` |
| `app/flight-recorder-types.ts` | `599890454757b677593540167c9359d2a6bd03b40bb361fc446128b58b4a1c24` |
| `app/CrossSignalApp.tsx` | `f764416effea5014bee700dd42e8368bc2e1ce73d80da9b0dac4098a9998f501` |
| `drizzle/0004_typical_omega_red.sql` | `7faff14fddee736cf378e9010f4a1c113f20049f4d9714caf676f6296cf792b4` |
| `drizzle/0005_flight_recorder_guards.sql` | `17f5a4ffb041d4a3851c9ff441fe61a44274d687c1cbc917356bd247fe6094a7` |
| `drizzle/0006_l08_active_intent_authority.sql` | `a97ce8f9b2a6b595197981742f80b1c4089cf05d57834921b3855fa5d2f844c5` |
| `drizzle/0007_l06_persisted_graph_executor.sql` | `4649dc761eb877d4fc708bd6e8928e04375ccc1021486024b893eb62bec1cf1c` |
| `tests/flight-recorder-data.test.mjs` | `09ccb1926136f3611d618f62742be8e08a2ac399d2a67e70515af7c381d25624` |
| `tests/flight-recorder-build.test.mjs` | `0997721d66d69d8b66ee79f577ac1047a7d5af6f01ccba07d9fafa045c55b2a8` |
