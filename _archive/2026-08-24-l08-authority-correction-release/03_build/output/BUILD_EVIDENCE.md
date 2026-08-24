---
type: stage-output
stage: 03
status: ready-for-review
unit: superseded-intent-authority-correction
finding: L08
fixture_key: l08-superseded-intent:2026-08-22.1
---

# L08 atomic authority Build evidence

Stage 03 implements the accepted database-owned active-intent contract. A
replacement and an authorization now linearize through one persisted
`flight_traces.active_intent_id`; stale or losing work aborts inside the D1
batch and cannot leave partial grants, effects, events, outcomes, or policies.

This evidence opens the Build human gate. It does not accept the gate or begin
Stage 04.

## Captured red baseline

Before product changes, the new deterministic assertion ran against the sealed
0005 schema. It inserted v2 and its exact policy after authorization had read
v1, then attempted the stale v1 grant. The command exited `1` with:

```text
Subtest: a superseded intent cannot acquire a grant after replacement wins
not ok
error: Missing expected exception.
```

That proves the original database accepted authority for v1 after v2 became
the runtime-selected intent. The harness setup was first corrected to persist
canonical JSON fields; only the subsequent race-reaching failure above is the
sealed defect evidence.

## Implemented correction

- `flight_traces.active_intent_id` is the only runtime authority head.
- `action_intents.supersedes_intent_id` records the immutable predecessor, and
  a partial unique index permits only one successor per predecessor.
- Migration 0006 uses the legacy `created_at, rowid` ordering only for atomic
  backfill. It validates required heads and historical authority before
  installing the permanent guards.
- Policy insertion is the activation sentinel. Initial v1 activation and a
  pending v1-to-v2 promotion update the guarded head in the same batch.
- Runtime snapshot, replacement, and authorization reads resolve an intent by
  exact `id + workspace_id + trace_id`; the old ordering query is gone.
- Grant insertion and effect reservation independently require exact equality
  with the persisted active head.
- The executing compare-and-swap includes `active_intent_id`; the immediately
  following event verifies persisted state and the payload `intentId`, turning
  a zero-row transition into an in-batch abort.
- Application errors are stable: stale authorization maps to
  `l08_stale_or_superseded_intent`; a losing replacement maps to
  `l08_intent_activation_rejected`.
- Database compatibility now requires both columns, both indexes, and all six
  L08 guards. The generated snapshot and journal include migration 0006.

## Deterministic production schedules

The test D1 adapter executes the real `authorizeAndExecute`,
`replacePendingIntent`, and batch statement paths against Node SQLite. Manual
promise barriers pause each production operation only at the accepted
pre-write phase; there are no timers or copied authorization validators.

| Schedule | Observed result |
|---|---|
| Edit wins | Authorization loads v1, pauses, replacement atomically activates v2, then the real v1 batch aborts with `l08_stale_or_superseded_intent`. Grant, effect, terminal events, observation, and assessment counts remain zero. Exact v2 authorization subsequently succeeds once. |
| Authorization wins | Replacement loads/builds v2 and pauses; exact v1 authorization commits once. The resumed v2 intent-plus-policy batch aborts with `l08_intent_activation_rejected`; both v2 rows roll back and the v1 effect remains exactly once. |

The same production path also completes confirmed v1 and v2, failed v1, and
indeterminate v2 executions with exactly one effect per reset and no retry.

## Database and migration proof

All ten accepted direct attacks fail closed: stale grants, stale effects,
cross-workspace heads, cross-trace heads, pointer clearing, missing-policy
movement, backward/non-predecessor movement, kill-switch execution, replay,
and commit after a zero-row executing compare-and-swap.

The migration matrix passes atomically:

| Case | Result |
|---|---|
| `empty` | Migrates with no head. |
| `pending-v1` | Backfills v1 as head. |
| `pending-v2` | Backfills v2 and v2's predecessor edge to v1. |
| `completed-v1` | Preserves v1 as head and authority. |
| `invalid-historical-race` | Aborts with `migration_l08_historical_authority_mismatch`; the new columns are absent after rollback and the 0005 immutability trigger remains installed. |

## Verification results

Environment: Windows PowerShell, Node.js `22.15.0`, ESLint `9.39.4`, Vinext
`1.0.0-beta.2`, Vite `8.0.13`, Drizzle Kit `0.31.10`.

| Command | Result |
|---|---|
| `node factory/03_build/verify.mjs` | Passed; 2 schedules, 10 attacks, 5 migration cases, 7 Data tests, and 15 Build tests. |
| `node_modules/.bin/tsx.cmd --test tests/flight-recorder-data.test.mjs` | Passed `7/7`. |
| `node_modules/.bin/tsx.cmd --test tests/flight-recorder-build.test.mjs` | Passed 15 tests including 5 migration subtests. |
| `node node_modules/eslint/bin/eslint.js . --ignore-pattern dist --ignore-pattern .next --ignore-pattern _archive` | Passed. |
| `node_modules/.bin/vinext.cmd build` | Passed all five build environments; migration 0006 is present in `dist/.openai/drizzle`. |
| Complete seven-file test command | Passed 50 tests, 0 failed. |
| `git diff --check` | Passed. |

## Artifact bindings

Text hashes normalize CRLF to LF before SHA-256.

| Artifact | SHA-256 |
|---|---|
| `db/flight-recorder-schema.ts` | `b86b23ca9a079fb6b458a631e75e7371d1723677be3c23ba82d154a0c2297b11` |
| `db/migrations.ts` | `259c0cd885daaf23bccb1bf3bfc46c278240c45d3291b045a999335f97cdd47d` |
| `db/flight-recorder.ts` | `ab984e95650e30ff338ef8896a413267d5be6189709dd034060cf3eca31b1cc6` |
| `drizzle/0006_l08_active_intent_authority.sql` | `a97ce8f9b2a6b595197981742f80b1c4089cf05d57834921b3855fa5d2f844c5` |
| `drizzle/meta/0006_snapshot.json` | `ed1b70151519da162b465f3bc4c82de3a296b9b32d53855a001c1287d63c0bee` |
| `drizzle/meta/_journal.json` | `19db7a837d8b57ce6a5c6de6b10c8a599979a99a5457aa5388d0e5544defcf89` |
| `tests/flight-recorder-build.test.mjs` | `98a7c9232b2aa96a6fddd92e605ec07f540326876ae9020e2775602729cc57a9` |
| `factory/03_build/verify.mjs` | `4a959cf71527cd3a4d6fa9b6a9f3e1d8b1fbfcdd6f4643581beebe8c48a4e7fd` |

## Accepted-input bindings

| Input | SHA-256 |
|---|---|
| `factory/03_build/CONTEXT.md` | `56d53ce00113e80bfb58253251d939eeab8750f6787877a48cc278c2aae16a67` |
| `factory/02_data/output/DATA_PACKAGE.md` | `ff047b6e5c3b664307ce6626f34e5c28b518b8fabd28048e442b2c99ae2d3ba8` |
| `factory/02_data/output/VERIFY.md` | `8537680fe4c56e18540d4274cc557ddbf52af52ee604aa88581126eabe7c4927` |
| `factory/02_data/output/HUMAN_GATE.md` | `100c332f839fea39ce67b9f8ce86f6849c0bedf4c4f2a832f530a71fa04f40a2` |
| `factory/_shared/ARCHITECTURE_SNAPSHOT.md` | `e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `factory/02_data/fixtures/superseded-intent-authority.fixture.mjs` | `b49748c7305ac896e8a756dd5d8ba6733a79dc89eed0dad3438db9b24cb1fea8` |

## Cold local preparation

Apply the checked-in local D1 migrations, start the application, and choose
**Reset exact FIXTURE trace for replay** before reviewing the unchanged UI.
This corrective Build requires the deterministic database/runtime harness for
L08 acceptance; the local replay remains a truth-label regression check and is
not a substitute for the two race schedules.

## Scope and review boundary

This Build claims only L08. It does not implement L06, reconcile L20, add L04
authority-history surfaces, add L14, change public routes/forms/UI promises,
or introduce providers or retries. No app or worker code changed. The four
screenshots retained under this stage belong to the earlier sealed release and
are not evidence for this corrective Build.
