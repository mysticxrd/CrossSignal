---
type: correction-specification
stage: 01
status: proposed
unit: superseded-intent-authority-correction
finding: L08
historical_release: 7b07ff62b2c0de605c86b378a1b90639f4b90547
---

# L08 superseded-intent authority correction

## Declared input hashes

| Input | SHA-256 |
|---|---|
| `factory/01_spec/CONTEXT.md` | `02d8170f49e8249685521f1bfb203fc475d9d377f5e75297e9e72aa73e5d1ff7` |
| `factory/_lib/factory-tools.test.mjs` | `a200bbe88cfa199f7bf0b4f7314bb200a6f232c75433791c8d51b96b370764c1` |
| `factory/_shared/ARCHITECTURE_SNAPSHOT.md` | `e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `db/flight-recorder.ts` | `41f248e8e6bc0134552ff75b20f3f8f31f079bb319c05e6af5a28d5a722b70f7` |
| `db/flight-recorder-schema.ts` | `48efbdb2b7223d795428abe01c5857e2b92aecabb8edefde4f543d37e73246f3` |
| `db/migrations.ts` | `500fad78aacc994880a0e6fa8ed8923bf866c7f22a94aa9f22b56ee86044ddd5` |
| `drizzle/` | `39786e0012f0e21742ab5a18ac71cdd7c901f612782e4722f568c402abf25cd5` |
| `tests/` | `78c43ff15c38df3b11135d1f8188316a1fe7f6bb1500b75fd983beb739a89f02` |
| `package.json` | `c8a9ab36760f08998d304efdc6a4d514a22f8d7ea05ab8c8df992ecc09f75972` |

The owner-provided audit text has SHA-256
`85260cda5f421d452ae0f7cd304899a4d436bbe402d1c5a94ca730576dfeb202`.
The accepted release remains immutable in commit
`7b07ff62b2c0de605c86b378a1b90639f4b90547` and in the archive created for
this corrective run.

## Executive decision

Add an explicit, database-owned `flight_traces.active_intent_id` authority head.
Authorization of intent `i` succeeds only while the exact trace is awaiting
approval and its authority head equals `i`. Replacing a pending intent atomically
promotes the head to the new immutable intent. Once promoted, the superseded
intent can never receive a grant, reserve an effect, or advance the trace.

Application reads remain useful for validation and user feedback, but they are
not authority. The decisive checks execute inside the same D1 batch that writes
the grant, effect reservation, and trace transition. Another pre-batch “latest
intent” query is explicitly rejected.

## Confirmed defect

The sealed release has four facts that together permit L08:

| Fact | Current evidence | Consequence |
|---|---|---|
| The trace has state but no active-intent identity | `db/flight-recorder-schema.ts:44-89` | `awaiting_approval` cannot identify which immutable intent is current. |
| “Active” means a read-time sort | `db/flight-recorder.ts:423-430` orders by `created_at DESC, rowid DESC` | The selected intent is only a snapshot of an earlier read. |
| Replacement inserts v2 and its policy without changing trace state | `db/flight-recorder.ts:717-761` | A concurrent authorizer of v1 still sees `awaiting_approval`. |
| Authorization later compares only trace state | `db/flight-recorder.ts:1032-1034` | Its batch can grant and execute v1 after v2 was inserted. |

The current approval and effect triggers prove internal consistency among v1's
intent, policy, grant, and effect rows, but neither trigger proves that v1 is
still the trace's active intent. Existing tests cover pure authority mutations
and construct a replacement intent, but do not persist the edit through the
runtime path or interleave it with authorization.

Deterministic counterexample:

```text
A: authorization loads v1 and its exact policy
B: replacement transaction inserts v2 and promotes v2 as active
A: authorization transaction attempts to grant and execute v1

Required result: A aborts; v1 gains no grant or effect; trace remains pending on v2.
Current result: A can commit because the trace is still awaiting approval.
```

## Authority invariant

For workspace `w`, trace `t`, and proposed intent `i`, a successful approval and
effect reservation requires all of the following at the database write boundary:

1. `t.workspace_id = w` and `t.current_state = 'awaiting_approval'` at the
   authorization linearization point.
2. `t.active_intent_id = i.id` and `i.workspace_id = w` and `i.trace_id = t.id`.
3. The immutable policy decision belongs to `i` and exactly matches its policy,
   canonical payload, context, recipient-set, nonce, expiry, and cap bindings.
4. Any human grant belongs to the same `i`, policy decision, workspace, trace,
   actor, and bound values.
5. The kill switch is disengaged and one-time-effect/replay guards pass at the
   effect reservation boundary.
6. The trace transition and its executing event both resolve to that same active
   intent before the batch may commit.

If any predicate is false, the complete authorization batch rolls back. A stale
candidate is an expected fail-closed result, not a retry signal. No approval
grant, effect attempt, effect event, trace event, cost, outcome, or provider call
may survive the rejection.

The invariant applies below application code. Direct SQL that attempts to grant
or reserve against a non-active intent must fail for the same reason as the
normal service path.

## Atomic enforcement boundary

Cloudflare documents `D1Database::batch()` as sequential, non-concurrent SQL
statements in a transaction, with a failing statement aborting or rolling back
the sequence. The correction uses that behavior deliberately:

### Pending-intent creation and replacement

The intent-plus-policy D1 batch owns activation.

1. Inserting the first intent may promote `NULL -> v1` only while the trace is
   `reasoning`.
2. Inserting a replacement may promote `v1 -> v2` only while the trace is
   `awaiting_approval` and no grant or effect exists for v1.
3. The database validates that the promoted intent belongs to the same workspace
   and trace. Other pointer changes, clearing the pointer, or promotion in another
   state fail.
4. The policy insert must prove that its intent is now `active_intent_id`. It is
   the in-batch sentinel: if promotion did not occur, policy insertion raises and
   rolls the whole replacement back.

Promotion happens through a migration-owned trigger or an equivalently strong
database mechanism invoked by the production insert. Sorting by timestamp or
`rowid` is not an activation mechanism.

### Authorization and execution

The grant insert is the authorization linearization point. Its database guard
must read the trace and require both `current_state = 'awaiting_approval'` and
`active_intent_id = NEW.intent_id`, in addition to all existing exact bindings.
The effect-reservation guard repeats the active-intent requirement and the
existing kill-switch and replay checks.

The later trace compare-and-swap adds
`active_intent_id = :authorized_intent_id` to its `WHERE` clause. A zero-row
compare-and-swap is not sufficient by itself because D1 only rolls back on a
failing statement. The immediately following executing-event guard must prove
that the persisted trace projection is `executing` and that the event's
`intentId` equals `active_intent_id`; otherwise it raises and rolls back the
batch. Equivalent explicit in-batch assertion machinery is acceptable, but
post-commit inspection is not.

Because replacement and authorization are write transactions against the same
trace, their outcomes are linearizable:

- If replacement promotes v2 first, authorization of v1 fails at the grant
  guard and persists nothing.
- If authorization grants v1 first, replacement fails because the committed
  trace is no longer awaiting approval and/or v1 already has authority.

## Data model and runtime reads

The next Drizzle migration adds nullable text column
`flight_traces.active_intent_id` and an index beginning with `workspace_id`.
Null is permitted only before the first intent, or on a terminal trace that
never produced an intent. Database guards enforce same-workspace and same-trace
membership for every non-null value and require a non-null head when entering
`awaiting_approval`, `executing`, `observing`, or `assessed`.

`findTrace` loads the head. The runtime replaces `activeIntent(workspaceId,
traceId)` and its timestamp/`rowid` ordering with an exact lookup by
`active_intent_id`, workspace, and trace. Snapshot rendering, replacement, and
authorization all consume that exact identity.

`active_intent_id` is mutable only through the initial-activation and
pending-replacement transitions above. Intent rows, policy decisions, grants,
and effect reservations remain immutable. Pointer movement does not rewrite or
delete v1.

## Migration and backfill

The migration must work both from an empty database and from the complete 0005
schema. It uses an expand-and-validate sequence:

1. Add the nullable column and supporting index without changing existing reads.
2. Inspect each trace under workspace scope. For legacy rows only, derive the
   candidate with the sealed runtime's exact order (`created_at DESC, rowid DESC`).
3. Before writing any head, verify:
   - pre-intent states may have no candidate;
   - `awaiting_approval` and later nonterminal states have a candidate and its
     policy decision;
   - an awaiting trace has no grant or effect;
   - all grants and effects for a trace agree on one intent;
   - if authority or an effect exists, that intent equals the derived candidate;
   - every candidate belongs to the same workspace and trace.
4. Abort with a named, actionable migration error on any violation. In
   particular, do not bless a historical L08 race by choosing v2 while an effect
   was executed for v1.
5. Backfill valid candidates, install the activation and authority guards, and
   add every new schema object to `db/migrations.ts` compatibility checks.
6. Verify that no required-state trace remains without a head.

The legacy sort is allowed only for one-time backfill compatibility. Runtime
authority after migration is pointer-based.

For the exact resettable FIXTURE, an operator may run the existing scoped reset
before retrying a failed migration. Non-fixture inconsistencies require forensic
review or quarantine; the migration must not delete or rewrite their history.
The migration and its validation must leave no partial schema/data state when a
check fails.

## Deterministic interleaving test

The first Build-stage implementation change is a regression test that is red
against the sealed 0005 behavior and green only after this correction. It must
exercise the same candidate-load, replacement transaction, and authorization
transaction used by production; copied SQL or a test-only authority validator
does not satisfy this requirement.

Use a manual promise barrier or two controlled database connections—never
timers, random scheduling, or timestamp coincidence:

```text
materialize pending trace with active v1
start real authorization and pause after it loads v1, before its write batch
run the real replacement transaction to commit v2
release authorization to run its real write batch for captured v1
expect a named stale/superseded-intent failure
```

After rejection, assert atomically:

- trace state is `awaiting_approval`;
- `active_intent_id` is v2;
- v1 and v2 have no approval grant or effect attempt;
- no executing/terminal trace event or provider receipt was added;
- the visible snapshot resolves v2;
- exact authorization of v2 succeeds once.

Add the inverse schedule: authorization of v1 commits first, then replacement
fails and leaves no v2 intent or v2 policy row. Also test direct grant and effect
inserts for a superseded intent, cross-workspace pointer assignment, missing
policy, kill-switch engagement, replay, and an intentionally zero-row trace
transition. Every case must fail closed without partial writes.

Stage 03 `BUILD_EVIDENCE.md` records both the pre-fix red result and post-fix
green result with exact commands and outputs.

## Acceptance criteria

- **AC-L08-01 — Reproduction:** A deterministic production-path barrier test
  demonstrates that sealed 0005 behavior can authorize captured v1 after v2 is
  persisted; no sleeps or probabilistic race loops are used.
- **AC-L08-02 — Explicit head:** Every trace at or beyond awaiting approval has
  one database-validated `active_intent_id`; normal runtime reads never infer it
  from timestamps or `rowid`.
- **AC-L08-03 — Edit wins:** If v2 promotion commits first, stale authorization
  of v1 raises a named error and leaves zero authority, effect, event, outcome,
  cost, or receipt rows from the rejected batch.
- **AC-L08-04 — Authorization wins:** If v1 authorization commits first, the
  competing edit rolls back completely and the committed v1 effect remains
  exactly once.
- **AC-L08-05 — Exact success:** An unchanged active intent with current policy,
  grant bindings, disengaged kill switch, caps, tenant, and no prior attempt
  still completes the existing confirmed/failed/indeterminate scenarios.
- **AC-L08-06 — Database enforcement:** Direct stale grant/effect insertion,
  cross-trace or cross-workspace heads, missing policy, zero-row projection
  transitions, and pointer clearing fail inside the database transaction.
- **AC-L08-07 — Migration safety:** Empty, pending-v1, pending-v2, completed-v1,
  and invalid historical-race databases produce the specified backfill or named
  abort with no partial state. Schema snapshots and compatibility checks agree.
- **AC-L08-08 — Regression and scope:** Build, lint, full tests, migrations,
  tenant isolation, authority mutation/replay, kill switch, and no-retry tests
  pass. Product UI and public APIs remain compatible, and the release claims
  only L08 resolution.

## Compatibility and rollback

No route, form, UI text, provider payload, fixture semantics, or public API
changes are required. Existing identifiers and historical intent rows remain
valid. The migration-owned activation and grant guards make a migration-first
deployment fail closed even if the sealed application briefly remains active;
the application update then switches reads and compare-and-swap statements to
the explicit head.

Rolling application code back to the sealed version is temporarily safe only
while the new database guards and column remain installed: its stale
authorization batch will be rejected by the active-head grant guard. Dropping
the column or guards reintroduces L08 and is not an acceptable rollback.
Rollback after new writes is a forward corrective deployment; the resettable
fixture may instead be restored from a known pre-migration snapshot.

## Scope and non-goals

This run fixes only L08. It does not:

- build the L06 runtime reasoning-graph executor;
- reconcile L20 fixture/runtime source-of-truth drift;
- add L04 authority-history events or trace projections, except an internal
  transactional assertion if needed to make stale authorization roll back;
- add the L14 trace endpoint;
- enable editing after an already committed approval;
- add live providers, retries, broader policies, arbitrary actions, or UI work;
- rewrite the archived or sealed release evidence.

Stage 01 also repairs two state-coupled factory self-test assumptions exposed by
opening the new run: historical-drift testing now uses a synthetic factory, and
workspace topology accepts a valid open human gate instead of requiring every
run to be pre-accepted. These are verification-harness corrections only; they
do not alter product, schema, authority, or public behavior.

If implementation requires any of those changes, return to this gate and open
a separately scoped run rather than expanding Build.

## External evidence

Retrieved 2026-08-22 from primary documentation:

- [Cloudflare D1 `batch()`](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch)
  states that batched prepared statements execute sequentially and
  non-concurrently as a transaction, and a failing statement aborts or rolls
  back the sequence. This supports the in-batch guard/sentinel design.
- [Cloudflare D1 prepared statements](https://developers.cloudflare.com/d1/worker-api/prepared-statements/)
  documents bound prepared statements and write-result metadata. Metadata is
  useful for evidence, but post-commit inspection cannot replace an in-batch
  abort.
- [SQLite foreign keys](https://www.sqlite.org/foreignkeys.html) documents
  composite-key and nullable-child behavior. A nullable active head therefore
  still needs state and same-trace enforcement; Data must not assume a nullable
  foreign key alone expresses the complete invariant.

## Risks resolved by this specification

- A second “is latest?” read would remain racy; it is forbidden.
- A conditional update with zero affected rows does not itself fail a D1 batch;
  an in-transaction raising statement is mandatory.
- A global intent ID alone does not prove workspace and trace ownership;
  database guards validate all three identities.
- Timestamp/`rowid` ordering is retained only to migrate legacy rows, not as
  ongoing authority.
- Existing triggers that bind grant to intent are insufficient until the trace's
  active head is part of the predicate.
