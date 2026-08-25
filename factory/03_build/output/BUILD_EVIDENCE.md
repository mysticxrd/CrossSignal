---
type: stage-primary-output
stage: 03_build
unit: append-only-authority-control-history-and-trace-projection-completeness
status: ready-for-review
truth_mode: executable-fixture
created: 2026-08-25
---

# L04 build evidence

## Outcome

Stage 03 implements L04 as one durable vertical slice. Workspace kill-switch
authority now comes only from resealed append-only control events. Each effect
is immutably bound to the exact latest unengaged event used at reservation, and
the existing authenticated snapshot returns every durable trace event in one
contiguous, tenant-bound, allowlisted projection.

No HTTP endpoint, route, middleware, worker, authentication protocol, provider
behavior, or graph topology was added or changed. L14 remains out of scope.

## Durable implementation

- Migration `0008_l04_authority_history_trace_projection.sql` creates canonical
  control history and exact effect-binding tables, blocks ambiguous non-FIXTURE
  migration, reseeds only bounded FIXTURE traces, freezes legacy heads, and
  installs append-only, sequence, actor, stale-head, reservation, and executing
  trace guards.
- Compatibility deterministically bootstraps every valid legacy head once,
  preserving its workspace, value, actor, and time. New workspaces append a
  `workspace_initialized` event directly.
- Owner pause/resume requests append real transitions, return the existing head
  for a same-value request, and map a losing concurrent successor to
  `l04_stale_authority_control`.
- Graph handoff, replacement, approval, effect, consumption, and outcome writes
  append complete subject-state histories in the same durable batches as their
  authority rows.
- The snapshot reseals control history and trace payloads, validates global and
  per-subject order, redacts actors, applies subject detail allowlists, and
  returns unknown event types with empty details.
- The reviewer UI labels and renders the complete collection as a
  `Persisted FIXTURE trace` plus the surviving workspace authority history.

## Acceptance evidence

| Contract | Executable evidence |
|---|---|
| L04-AC01..04 | Canonical resealing, off/on/off append history, no-op behavior, immutable guards, deterministic legacy bootstrap, and stale-writer behavior |
| L04-AC05..06 | Complete intent/policy/approval/effect subject chains and exact effect/control binding across pause-versus-reservation schedules |
| L04-AC07..09 | Contiguous complete projection, tenant binding, stable hash validation, closed actor labels, detail allowlists, unknown-event empty details, and serialized leakage probes |
| L04-AC10 | Bounded FIXTURE reset removes the trace/effect while all workspace control events survive |
| L04-AC11 | The full L08/L06 data/build suite remains green with unchanged truth/provider labels and graph topology |
| L04-AC12 | Diff and verifier reject route, endpoint, middleware, worker, or other L14 transport entry |

All twelve accepted IDs, all twelve negative IDs, three deterministic race
schedules, six migration cases, the 34-event reference trace, and the mixed
tenant collision fixture validate from the durable copied fixture.

## Negative evidence

- Authority event update/delete and legacy head update/delete fail with stable
  L04 errors; actor, prior-state, sequence, time, and no-op guards prevent forks.
- Missing, malformed, hash-mismatched, or ambiguous control history fails before
  authority can be granted.
- A direct effect row is inert until an exact current unengaged control binding
  exists; the first reserved event and executing trace are database guarded.
- Pause winning after the runtime recheck rolls back grant, effect, binding, and
  trace writes. A completed reservation retains its earlier exact proof after a
  later pause.
- Projection hash, sequence, subject-chain, or tenant drift fails as
  `l04_trace_projection_incomplete`; raw payloads, idempotency keys, actor IDs,
  recipient addresses, message body, provider body, and secret-like content are
  absent from the client projection.

## Changed product surface

| Surface | Result |
|---|---|
| `db/flight-recorder-schema.ts` | Two L04 tables, keys, checks, and indexes |
| `drizzle/0008_*`, `drizzle/meta/*` | Generated schema metadata plus hardened migration assertions and triggers |
| `db/migrations.ts` | Required-object inventory and deterministic idempotent legacy bootstrap |
| `db/flight-recorder-contracts.ts` | Canonical control sealing/validation and ordered redacted projection |
| `db/flight-recorder-graph.ts`, `db/flight-recorder.ts` | Complete authority subject writers, append transitions, exact effect binding, fail-closed reads |
| `app/flight-recorder-types.ts`, `app/CrossSignalApp.tsx` | Client-safe history types and minimal persisted trace/history review UI |
| `tests/flight-recorder-*.test.mjs`, `tests/fixtures/*` | Durable fixture parity, migration/runtime/race/reset/redaction coverage and regressions |

## Declared input hashes

| Input | SHA-256 |
|---|---|
| `factory/03_build/CONTEXT.md` | `e0134c4e73046a6e3dbd87b3af6b123d8cb0b6e7e0a00b8d184705fe50021524` |
| `factory/02_data/output/DATA_PACKAGE.md` | `a503213bfcccd597700fe6934c365855d90d422d9c03b015bf10b2a96438979d` |
| `factory/02_data/output/HUMAN_GATE.md` | `d9e7efd6b2084026e5ee8c7a993670df2fba89539da0bc51c460f272e2b8aaa9` |
| `factory/02_data/fixtures/l04-authority-trace.fixture.mjs` | `cd565ba32b846e2848be56c6ef8c705bb13088d6424f80feb962d96411afa464` |
| `factory/_shared/ARCHITECTURE_SNAPSHOT.md` | `e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `factory/_lib/verify-kit.mjs` | `b2c7434bf3acacbfb6323b33cf0b175f77d0e3b1d66aeadee6e9ea996c95015c` |
| `factory/_lib/factory-state.mjs` | `72870904445d54f01eea443ed5a5de1b2af2fd19df66e085a52bf47982594d28` |
| `package.json` | `c8a9ab36760f08998d304efdc6a4d514a22f8d7ea05ab8c8df992ecc09f75972` |
| `drizzle.config.ts` | `3ec3fe6a06a9be54bbd980ec2fc72b014bfdc7d30b5c92d02aa0aa3c95e39b1a` |
| `eslint.config.mjs` | `6090bd544865638d8c77a3443f037b3b289596a7ec1e1dccc3a13677e6d1ca83` |
| `tsconfig.json` | `379054f6cec60ebd0e18c47a3ce72b2cc1b3f7abd0037c668e87cb2070891147` |

## Observed baseline hashes

The product baselines were read from the sealed L20 `HEAD` before Stage 03
mutation. Their normalized hashes are the accepted values already recorded in
the Stage 02 data package, including schema `aaf5a11d…`, contracts `5057dd60…`,
runtime `5f173de4…`, graph `248137ac…`, migrations `7d7512db…`, UI
`f764416e…`, data tests `09ccb192…`, and build tests `0997721d…`.
