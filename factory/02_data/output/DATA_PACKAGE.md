---
type: stage-output
stage: 02
status: ready-for-review
unit: superseded-intent-authority-correction
finding: L08
fixture_key: l08-superseded-intent:2026-08-22.1
---

# L08 executable data package

This package turns the accepted superseded-intent specification into the exact
schema, migration, transaction, fixture, and failure contracts Stage 03 must
implement. It does not change product code or claim that L08 is fixed yet.

## Data decision

`flight_traces.active_intent_id` is the sole database-owned authority head.
Runtime reads, replacement, grant insertion, effect reservation, trace
projection, and the visible snapshot resolve the same explicit identity.

Each new `action_intents` row also carries nullable
`supersedes_intent_id`. This internal immutable predecessor edge is required to
make pointer movement monotonic without treating timestamps or `rowid` as
authority. Initial v1 has no predecessor. Replacement v2 must name the current
v1. A partial unique index permits at most one successor for a predecessor.
This is an implementation constraint, not a new user-visible authority event.

## Schema manifest

| Object | Contract |
|---|---|
| `flight_traces.active_intent_id` | Nullable text. Null is allowed before a first intent or forever on a terminal trace that never produced one. Once non-null it cannot be cleared. |
| `action_intents.supersedes_intent_id` | Nullable immutable text. Null for the first intent; every replacement points to the exact prior active intent in the same workspace and trace. |
| `idx_flight_traces_workspace_active_intent` | Index on `(workspace_id, active_intent_id)` for exact tenant-scoped head resolution. |
| `idx_action_intents_one_successor` | Partial unique index on `(workspace_id, trace_id, supersedes_intent_id)` where the predecessor is non-null. |

Drizzle exposes both nullable fields. The migration and database triggers own
cross-row validity because a nullable foreign key alone cannot express state,
same-trace membership, monotonic promotion, or the required policy.

## Database guard manifest

The 0006 migration installs or replaces these named guards:

| Guard | Required behavior and named abort |
|---|---|
| `trg_flight_traces_active_intent_transition` | Reject clearing, cross-workspace/cross-trace assignment, missing exact policy, initial activation outside `reasoning`, replacement outside `awaiting_approval`, a predecessor other than the current head, or movement after a grant/effect. Abort `l08_active_intent_pointer_rejected`. |
| `trg_policy_decisions_activate_intent` | After an exact policy insert, promote its intent through the guarded pointer transition. Then assert the trace head equals that intent. A zero-row promotion raises `l08_intent_activation_rejected`, rolling back the intent-plus-policy batch. |
| `trg_flight_traces_required_active_intent` | Require a valid non-null head when entering or remaining in `awaiting_approval`, `executing`, `observing`, or `assessed`. |
| `trg_approval_grants_bind_active_intent` | At the grant-insert linearization point require the existing exact grant bindings, trace state `awaiting_approval`, and `trace.active_intent_id = NEW.intent_id`. Stale authorization raises `l08_stale_or_superseded_intent`. |
| `trg_effect_attempts_bind_active_intent` | Repeat the active-head predicate in addition to exact grant, actor, kill-switch, expiry, cap, request, replay, and intended-effect checks. |
| `trg_flight_trace_events_executing_projection` | An executing trace event must observe the persisted trace in `executing` and `json_extract(payload_json, '$.intentId') = trace.active_intent_id`; otherwise raise `l08_trace_execution_projection_mismatch`. |

Existing immutable, tenant, canonical-payload, policy, grant, kill-switch,
replay, event-sequence, outcome, and deletion guards stay installed. New guards
strengthen them; they do not replace exact binding checks.

## Intent and policy transaction

The production batch is ordered:

```text
INSERT action_intents(vN, supersedes_intent_id = prior active head or NULL)
INSERT policy_decisions(policy-vN)
  -> trg_policy_decisions_activate_intent attempts guarded promotion
  -> the same trigger asserts persisted active_intent_id = vN
```

The policy insert is the activation sentinel required by the accepted Spec.
The trigger sees the newly inserted exact policy, so a direct pointer update
without policy fails. If replacement loses to authorization, the trigger raises
and D1 rolls back both the v2 intent and v2 policy. Direct movement can only
follow the immutable predecessor edge under the same state/authority guards.

## Authorization transaction

`authorizeAndExecute` loads the intent by the trace's explicit head, not by
ordering. Its real D1 batch retains the existing writes and adds these
boundaries:

1. Grant insert checks exact active identity and awaiting state. This is the
   authorization linearization point.
2. Effect reservation repeats active identity plus existing policy, grant,
   actor, payload, context, recipients, expiry, cap, kill-switch, replay, and
   intended-effect checks.
3. The trace compare-and-swap includes
   `active_intent_id = :authorized_intent_id`.
4. The immediately following executing event includes `intentId` in canonical
   payload and is guarded by `trg_flight_trace_events_executing_projection`.

A zero-row compare-and-swap therefore cannot commit surrounding grant, effect,
effect-event, outcome, cost, receipt, or trace-event writes: the executing event
raises inside the same batch. Post-commit inspection is not an authority check.

The application maps the database abort to the stable expected error
`l08_stale_or_superseded_intent`. It does not retry authorization against v2;
the owner must inspect and authorize v2 explicitly.

## Runtime read contract

`findTrace` selects `active_intent_id`. The replacement, snapshot, and
authorization paths fetch the intent with all three predicates:

```sql
intent.id = trace.active_intent_id
AND intent.workspace_id = trace.workspace_id
AND intent.trace_id = trace.id
```

No normal runtime query infers current intent from `created_at`, timestamp
coincidence, `rowid`, `MAX`, or insertion order. Snapshot output must expose v2
immediately after a successful edit-wins promotion.

## Migration 0006 contract

The migration is one atomic expand/validate/backfill/guard transaction from an
empty database or complete 0005 database:

1. Add nullable `active_intent_id` and `supersedes_intent_id`; add the two
   indexes. Temporarily replace the action-intent immutability trigger only
   inside this migration so legacy predecessor edges can be backfilled.
2. For legacy rows only, order each trace with the sealed rule
   `created_at ASC, rowid ASC`, set each intent's predecessor to the prior row,
   and derive the candidate as `created_at DESC, rowid DESC LIMIT 1`.
3. Use a migration-local assertion table and raising trigger so every invalid
   case aborts with a named error rather than leaving a zero-row check.
4. Validate workspace/trace ownership, required-state candidate and policy,
   no grant/effect on an awaiting trace, one authority intent per trace, and
   agreement between all grants/effects and the derived candidate.
5. A derived v2 combined with v1 authority raises
   `migration_l08_historical_authority_mismatch`. Missing required heads raise
   `migration_l08_required_state_missing_active_intent`. No historical row is
   deleted, rewritten as valid, or silently quarantined.
6. Backfill valid heads, reinstall the immutable trigger, install all new
   guards, drop the migration-local assertion objects, and assert no required
   state lacks a valid head.
7. Add both columns, both indexes, and every new/replaced guard to
   `db/migrations.ts` compatibility checks and update the Drizzle snapshot and
   journal as one generated migration.

If any assertion fails, the migration transaction restores the entire 0005
schema/data state, including the old immutable trigger. The resettable FIXTURE
may use its existing exact scoped reset before retry. Non-fixture mismatches
require forensic handling outside this run.

The migration sort is compatibility logic only. It must not appear in runtime
head selection or post-migration activation.

## Executable race fixture

`factory/02_data/fixtures/superseded-intent-authority.fixture.mjs` defines:

- stable workspace, trace, actor, v1/v2, and policy identities;
- the production barrier phase
  `after-active-intent-and-policy-load-before-write-batch`;
- an edit-wins schedule whose stale v1 batch persists zero writes;
- an authorization-wins schedule whose v2 intent and policy both roll back;
- five migration databases; and
- ten direct database attacks.

No timer, random scheduler, copied SQL, or test-only authority validator is
allowed. Stage 03 attaches a manual promise barrier or two controlled database
connections to the real `authorizeAndExecute`, `replacePendingIntent`, and D1
batch paths.

### Canonical migration matrix

| Case | Expected result |
|---|---|
| `empty` | Migrates; no trace head exists. |
| `pending-v1` | Migrates; awaiting trace head is v1. |
| `pending-v2` | Migrates; awaiting trace head is v2 and v2 explicitly supersedes v1. |
| `completed-v1` | Migrates; assessed trace head and authority remain v1. |
| `invalid-historical-race` | Aborts with `migration_l08_historical_authority_mismatch`; no partial schema/data changes. |

### Post-race assertions

Edit wins: trace remains `awaiting_approval`, head and visible snapshot are v2,
v1/v2 have no grant or effect, and the rejected v1 batch adds no effect event,
executing/terminal trace event, outcome, cost, provider call, or receipt. Exact
authorization of v2 then succeeds once.

Authorization wins: the committed v1 effect remains exactly once; the losing
replacement leaves no v2 intent or policy and raises
`l08_intent_activation_rejected`.

Direct attacks cover stale grants/effects, cross-workspace/cross-trace heads,
pointer clearing, missing policy, backward/non-predecessor movement, kill
switch, replay, and an intentionally zero-row executing compare-and-swap.

## Acceptance mapping

| Spec criterion | Data proof required from Stage 03 |
|---|---|
| `AC-L08-01` | Production barrier reproduces sealed 0005 stale-v1 success before the fix. |
| `AC-L08-02` | Schema, migration, exact lookup, required-state, and predecessor contracts establish one explicit head. |
| `AC-L08-03` | Edit-wins schedule returns the named stale error and zero rejected-batch writes. |
| `AC-L08-04` | Authorization-wins schedule rolls the complete v2 replacement back and keeps one v1 effect. |
| `AC-L08-05` | Active v1/v2 still completes confirmed, failed, and indeterminate scenarios exactly once. |
| `AC-L08-06` | Ten direct SQL attacks and zero-row projection transition abort inside the transaction. |
| `AC-L08-07` | Five migration databases match the canonical matrix and compatibility snapshot. |
| `AC-L08-08` | Full build, lint, tests, migration, tenant, authority, kill-switch, replay, and no-retry evidence passes with only L08 claimed. |

## Build handoff

Stage 03 must begin with the deterministic red test, capture the sealed 0005
failure, implement migration/schema/guards/runtime exact lookup, then capture
the green schedules and attack matrix. It must update the existing canonical
FIXTURE materialization to set v1 as active without changing its truth labels,
reset scope, public routes, form shape, UI promise, provider payload, or outcome
semantics.

Migration-first deployment is fail-closed for the old application: old
replacement attempts lacking the predecessor edge abort at policy activation;
old authorization is accepted only if its selected intent equals the database
head. Rollback keeps 0006 columns and guards. Dropping them is prohibited.

## Scope boundary

This package fixes only L08. It does not implement L06, reconcile L20, add L04
authority-history surfaces, add the L14 endpoint, enable post-approval editing,
or add providers, retries, arbitrary actions, UI features, or public API
changes. Ambiguity in these contracts routes back to Spec; Build must not weaken
or broaden them.

## Declared input hashes

Text is normalized to LF before SHA-256.

| Input | SHA-256 |
|---|---|
| `factory/02_data/CONTEXT.md` | `63d2a52967f887368b8a1ac61e53a29826d8e98f7eee1cb95df08e8ee01e42d1` |
| `factory/01_spec/output/SPEC.md` | `8a9a4c93f8fc2e8418d0d733e327d4d64d906261c0e65c82989ff6211a2de492` |
| `factory/01_spec/output/HUMAN_GATE.md` | `9a3fe61b35e0b628619ed0e4df616d8df6109125fbaeca8cb80194f025d55ce2` |
| `factory/_shared/ARCHITECTURE_SNAPSHOT.md` | `e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `db/flight-recorder-schema.ts` | `48efbdb2b7223d795428abe01c5857e2b92aecabb8edefde4f543d37e73246f3` |
| `db/migrations.ts` | `500fad78aacc994880a0e6fa8ed8923bf866c7f22a94aa9f22b56ee86044ddd5` |
| `db/flight-recorder.ts` | `41f248e8e6bc0134552ff75b20f3f8f31f079bb319c05e6af5a28d5a722b70f7` |
| `drizzle/0005_flight_recorder_guards.sql` | `17f5a4ffb041d4a3851c9ff441fe61a44274d687c1cbc917356bd247fe6094a7` |
| `drizzle/meta/0005_snapshot.json` | `3c4dc79f1dc972a2b3f497e87138baee7265f7063daa079d06c7af05c29baded` |
| `tests/flight-recorder-data.test.mjs` | `18ea70aead27579460bcf01157953a3f8337f3a5eafde523b9b55b36a774f2b1` |
| `tests/flight-recorder-build.test.mjs` | `79bc737e6f5844410b92ae1d0a8f286a1c7de003955c40e5432210dcb9b67d68` |
| `factory/02_data/fixtures/onboarding-rescue.fixture.mjs` | `aeb7e0d1b977f90682d473efdbe88dafdb82d498682578f26a894c682cf0083d` |
| `factory/02_data/fixtures/reset.mjs` | `79e3261492955e78cfa708d25b503865d033f06b7d308d5b65790009d4068a2e` |
| `package.json` | `c8a9ab36760f08998d304efdc6a4d514a22f8d7ea05ab8c8df992ecc09f75972` |
