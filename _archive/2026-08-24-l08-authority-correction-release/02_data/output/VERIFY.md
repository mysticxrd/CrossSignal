---
type: verification
stage: 02
status: passed
verified_at: 2026-08-22T16:41:17.7612060+05:30
finding: L08
---

# Stage 02 verification - L08 authority data contract

The accepted specification is executable as a schema, migration, transaction,
fixture, interleaving, and failure contract. Verification opens the human gate;
it does not accept the package or claim the runtime defect is fixed.

## Artifact bindings

Text hashes normalize line endings to LF before SHA-256.

| Artifact | SHA-256 |
|---|---|
| `DATA_PACKAGE.md` | `ff047b6e5c3b664307ce6626f34e5c28b518b8fabd28048e442b2c99ae2d3ba8` |
| `../verify.mjs` | `0f5eeb5b1a8664172307d8d94b548c6511527fd55b940bd36e8899070e10e033` |
| `../fixtures/superseded-intent-authority.fixture.mjs` | `b49748c7305ac896e8a756dd5d8ba6733a79dc89eed0dad3438db9b24cb1fea8` |

The Data Package separately binds fifteen accepted, shared, schema, migration,
runtime, test, fixture, and repository-command inputs.

## Executable evidence

- One explicit `active_intent_id` authority head is coupled to an immutable
  `supersedes_intent_id` predecessor edge; activation never depends on runtime
  timestamp or `rowid` inference.
- The policy-insert activation sentinel, grant linearization guard, repeated
  effect guard, active-head compare-and-swap, and executing-event assertion are
  all named and fail the complete D1 batch closed.
- The deterministic fixture validates both edit-wins and authorization-wins
  schedules at the real production barrier phase.
- Ten direct database attacks cover stale grant/effect, tenant/trace drift,
  clearing or invalid head movement, missing policy, kill switch, replay, and
  zero-row projection transition.
- Five migration databases cover empty, pending-v1, pending-v2, completed-v1,
  and an invalid historical L08 race that must abort without partial changes.
- AC-L08-01 through AC-L08-08 map to concrete Build-stage proof. L06, L20,
  L04, and L14 remain explicitly excluded.
- No file under `app/`, `db/`, `drizzle/`, or `worker/` changed in Stage 02.

## Command results

Environment: Windows PowerShell, Node.js `22.15.0`, ESLint `9.39.4`, Vinext
`1.0.0-beta.2`, Vite `8.0.13`, and tsx `4.22.1`.

| Command | Exit | Relevant result |
|---|---:|---|
| `node factory/02_data/verify.mjs` | `0` | 2 deterministic schedules, 10 attacks, 5 migration cases, 4 required-head states, and 15 declared inputs passed. |
| `node node_modules/eslint/bin/eslint.js . --ignore-pattern dist --ignore-pattern .next --ignore-pattern _archive` | `0` | Exact repository lint-script scope passed. |
| `node_modules/.bin/vinext.cmd build` | `0` | Production build completed. |
| `node_modules/.bin/tsx.cmd --test factory/_lib/factory-tools.test.mjs tests/rendered-html.test.mjs tests/icm-workspace.test.mjs tests/flight-recorder-data.test.mjs tests/flight-recorder-build.test.mjs tests/flight-recorder-release.test.mjs tests/flight-recorder-ship.test.mjs` | `0` | `41/41` tests passed; zero failures, skips, cancellations, or todos. Existing migrations and authority tests passed. |
| `git diff --check` | `0` | No whitespace errors. |
| `git diff --quiet -- app db drizzle worker` | `0` | No Stage 02 product/runtime changes. |

An initial ad hoc `eslint .` invocation omitted the repository's declared
`_archive`, `dist`, and `.next` ignore patterns. It traversed archived generated
bundles and reported 8,482 irrelevant generated-code errors. The exact scoped
lint command above was then run and passed; no archive file was changed or used
as a Data input.

## Gate state

Verification passed and the Stage 02 gate is open. Stage 02 remains
`in-progress` until a human accepts the exact Data Package and verification
hashes recorded in `HUMAN_GATE.md`.
