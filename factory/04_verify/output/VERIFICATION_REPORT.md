---
type: verification-report
stage: 04
status: ready-for-review
verified_at: 2026-08-23T01:49:04.6952951+05:30
unit: superseded-intent-authority-correction
finding: L08
---

# L08 active-intent authority verification report

Stage 04 independently verifies the accepted correction: only the exact intent
identified by `flight_traces.active_intent_id` can acquire authority or reserve
an effect. The former edit/authorize interleaving now fails closed at the
database transaction boundary. This report opens the Verify human gate; it
does not accept that gate or authorize Stage 05.

## Verdict

Passed. Both deterministic production schedules, all ten accepted direct
database attacks, all five migration cases, 22 targeted tests, the production
build, repository lint, and the 45-test pre-Ship regression suite are green. No stale or
losing operation leaves a partial grant, effect, policy, intent, terminal event,
observation, or assessment.

## Vulnerable interleaving replay

The sealed 0005 baseline had allowed authorization to read v1, replacement to
insert v2, and then the stale v1 grant to commit. Against migration 0006 and the
corrected runtime, the same production-path interleaving deterministically
returns `l08_stale_or_superseded_intent`. The rejected batch leaves zero grant,
effect, terminal-event, observation, and assessment rows; exact v2 authority
then succeeds once.

The test uses manual promise barriers in the real `authorizeAndExecute` and
`replacePendingIntent` operations. It uses no timers, copied authorization
validator, or scheduling guess.

## Acceptance matrix

| Criterion | Resolution | Inspectable evidence |
|---|---|---|
| `exact-active-head` | Passed | Runtime loads `trace.active_intent_id` and resolves it by exact `id + workspace_id + trace_id`. The accepted lookup slice contains no `ORDER BY`, timestamp, `rowid`, or aggregate inference. |
| `edit-wins-no-partial-authority` | Passed | Replacement promotes v2; the paused real v1 authorization batch aborts with the stable stale error and leaves zero rejected writes; exact v2 succeeds once. |
| `authorization-wins-no-partial-replacement` | Passed | Exact v1 authorization commits once; resumed v2 intent-plus-policy activation aborts with `l08_intent_activation_rejected`; both v2 rows roll back. |
| `transactional-guard-alignment` | Passed | Grant, effect, active-head transition, executing compare-and-swap, and executing event all check the same persisted active identity inside the transaction. |
| `runtime-order-independence` | Passed | The runtime authority lookup is exact-identity only. Legacy ordering is confined to migration backfill. |
| `atomic-migration-matrix` | Passed | `empty`, `pending-v1`, `pending-v2`, and `completed-v1` migrate; `invalid-historical-race` aborts and restores the complete 0005 schema/data state. |
| `direct-database-attack-matrix` | Passed | All ten accepted attacks fail closed, including stale grant/effect, cross-boundary heads, pointer corruption, invalid movement, kill-switch execution, replay, and zero-row compare-and-swap commit. |
| `terminal-results-no-retry` | Passed | Confirmed v1/v2, failed v1, and indeterminate v2 preserve one effect per reset. Failed and indeterminate states are terminal and are not retried. |

No Stage 04 criterion remains implied or deferred.

## Deterministic schedules

| Schedule | Linearization and result |
|---|---|
| Edit wins | v1 authorization pauses after its read; replacement atomically activates v2; the complete stale v1 batch aborts; exact v2 authorization succeeds once. |
| Authorization wins | v2 replacement pauses before its batch; v1 authorization commits one effect; the resumed v2 intent-plus-policy batch aborts and rolls back both v2 rows. |

## Database attack matrix

| # | Attack | Result |
|---:|---|---|
| 1 | Grant superseded v1 | Rejected |
| 2 | Reserve effect for superseded v1 | Rejected |
| 3 | Point a trace at another workspace's intent | Rejected |
| 4 | Point a trace at another trace's intent | Rejected |
| 5 | Clear a required active pointer | Rejected |
| 6 | Move to an intent without matching policy activation | Rejected |
| 7 | Move backward or to a non-predecessor successor | Rejected |
| 8 | Execute while the kill switch is engaged | Rejected |
| 9 | Replay a consumed grant/effect identity | Rejected |
| 10 | Commit after a zero-row executing compare-and-swap | Rejected by the in-batch event projection guard |

## Migration and rollback matrix

| Case | Result |
|---|---|
| `empty` | Migrates with no active head. |
| `pending-v1` | Backfills v1 as the active head. |
| `pending-v2` | Backfills v2 and records v2's predecessor edge to v1. |
| `completed-v1` | Preserves v1 and its completed authority history. |
| `invalid-historical-race` | Aborts with `migration_l08_historical_authority_mismatch`; new columns roll back and the 0005 immutability trigger remains installed. |

## Command record

Environment: Windows PowerShell, Node.js `22.15.0`, ESLint `9.39.4`, Vinext
`1.0.0-beta.2`, Vite `8.0.13`, Drizzle Kit `0.31.10`, and Node SQLite.

| Command | Timestamp (+05:30) | Exit | Relevant result |
|---|---|---:|---|
| `node factory/04_verify/verify.mjs` | `2026-08-23T01:38` | `0` | Eight L08 criteria, 2 schedules, 10 attacks, 5 migration cases, 7 Data tests, and 15 Build tests passed. |
| `node node_modules/eslint/bin/eslint.js . --ignore-pattern dist --ignore-pattern .next --ignore-pattern _archive` | `2026-08-23T01:39-01:41` | `0` | Active repository lint passed. |
| `node_modules/.bin/vinext.cmd build` | `2026-08-23T01:39-01:40` | `0` | All five build environments passed; dynamic `/` route emitted. |
| Six-file pre-Ship `node_modules/.bin/tsx.cmd --test ...` regression command | `2026-08-23T01:52` | `0` | 45 tests passed; 0 failed, cancelled, skipped, or todo. |
| Seven-file command including Stage 05 inheritance tests | `2026-08-23T01:50` | `1` | 49 tests passed; the sole failure correctly required this Stage 04 gate to be closed and accepted. This is the intentional human gate, not a product failure. |
| `git diff --check` | `2026-08-23T01:49` | `0` | No whitespace errors. |

## Evidence-integrity correction

The first Stage 04 attempt correctly stopped because the accepted Stage 03
reports referenced a superseded hash for `factory/03_build/verify.mjs`. The
reports were corrected to the current `4a959c...` verifier, Stage 03 verification
passed again, and the owner reaccepted the corrected exact hashes. No product,
migration, fixture, or behavior changed during that evidence correction.

## Declared input bindings

Text hashes normalize CRLF to LF before SHA-256.

| Input | SHA-256 |
|---|---|
| `factory/04_verify/CONTEXT.md` | `e8e76c1435c5d8e992a9031708ef5a1178257b6a3df6f3cadd2e0da16f77603c` |
| `factory/03_build/output/BUILD_EVIDENCE.md` | `09c0c113adbc67b0a3dced716a6637e2b44e27d042aba3aa0b97317c07d9d895` |
| `factory/03_build/output/HUMAN_GATE.md` | `2ec7c29d02971e6ffdc96de6881be656bde1cf841a02a429202756d37324b1c8` |
| `factory/_shared/ARCHITECTURE_SNAPSHOT.md` | `e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `factory/02_data/fixtures/superseded-intent-authority.fixture.mjs` | `b49748c7305ac896e8a756dd5d8ba6733a79dc89eed0dad3438db9b24cb1fea8` |

## Observed Build bindings

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

## Scope and residual risk

- This stage verifies only L08. L06, L20, L04, and L14 remain unchanged and
  are not claimed as resolved.
- No application route, UI surface, worker, provider, or public behavior changed;
  prior-release screenshots are not reused as evidence for this correction.
- The tested adapter is TEST/FIXTURE backed. This report does not claim live
  provider delivery, distributed exactly-once execution, or causal outcomes.
- Migration backfill necessarily inspects legacy order once. Normal runtime
  authority never infers the active head from order.
