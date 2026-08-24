---
type: verification-report
stage: 03_build
status: passed
unit: persisted-graph-executor-correction
verified_at: 2026-08-23T19:54:31.7711878Z
---

# Stage 03 verification

## Environment

- Windows / PowerShell
- Node.js `v22.15.0`
- `tsx` `4.22.1`
- SQLite through Node's deterministic in-memory `DatabaseSync` test adapter
- No network, model, provider, timer sleep, or probabilistic race

## Commands

| Command | Result |
|---|---|
| `node_modules/.bin/tsx.cmd --test tests/flight-recorder-build.test.mjs tests/flight-recorder-release.test.mjs` | passed |
| `node_modules/.bin/vinext.cmd build` | passed |
| `node_modules/.bin/eslint.cmd app db worker tests/*.mjs factory/01_spec/*.mjs factory/02_data/*.mjs factory/02_data/fixtures/*.mjs factory/03_build/verify.mjs factory/_lib/*.mjs` | passed |
| `node --test factory/_lib/factory-tools.test.mjs` | passed |
| `git diff --check` | passed |
| `node_modules/.bin/tsx.cmd factory/03_build/verify.mjs` | passed |

## Results

- Six fixed nodes execute through product runtime handlers and durable database
  attempts.
- Five between-node boundaries preserve completed evidence and avoid replay.
- Expired claims retain immutable interrupted history before a later success.
- Concurrent calls, wrong tokens, same-token duplication, handler failure,
  secret content, undeclared citations, tenant mismatch, and input drift all
  fail or converge according to the accepted contract.
- Fourteen L06 direct database attacks and ten L08 direct database attacks pass
  with zero rejected-write residue.
- Both sealed L08 production race schedules pass.
- Migration `0007` passes empty/current/interrupted/completed/invalid cases.
- Build and scoped lint pass. Unknown executor cost remains explicit.

## Scope notes

Repository-wide lint was also attempted. Its only failures were three existing
unused-variable findings under the user's out-of-scope untracked `benchmarks/`
work. Those files were preserved. The stale legacy data test remains assigned
to L20; it is not counted as L06 runtime evidence.

L20, L04, and L14 remain open.
