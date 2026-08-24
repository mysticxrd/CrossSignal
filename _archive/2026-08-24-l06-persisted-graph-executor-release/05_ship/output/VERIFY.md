---
type: verification-evidence
stage: 05_ship
status: passed
unit: persisted-graph-executor-correction
verified_at: 2026-08-23T20:18:37.4808413Z
---

# Stage 05 verification

## Environment

- Platform: Windows / PowerShell
- Node.js: `v22.15.0`
- Branch: `codex/l06-graph-executor`
- Review-candidate base commit:
  `464df6be405307f4412894e0d24d1569bf3036b6`
- Release state: uncommitted and unsealed; the final commit is intentionally
  deferred until the human gate is accepted.

## Commands and results

| Command | Exit | Result |
|---|---:|---|
| `node_modules/.bin/tsx.cmd factory/05_ship/verify.mjs` | 0 | PASS — all Stage 05 assertions and nested checks passed. |
| `node factory/05_ship/prepare.mjs --persist-to <isolated-cold-path>` (first run) | 0 | PASS — migrations `0000`–`0007`, eight L06 reasoning columns, and six L06 runtime triggers present. |
| `node factory/05_ship/prepare.mjs --persist-to <same-isolated-cold-path>` (second run) | 0 | PASS — no migrations to apply; schema counts unchanged. |
| `node <tsx-cli> factory/04_verify/verify.mjs` | 0 | PASS — independent in-memory SQLite/D1 probe invoked six runtime handlers, recomputed six input hashes, and retained interruption history. |
| `node <tsx-cli> --test tests/flight-recorder-build.test.mjs tests/flight-recorder-release.test.mjs` | 0 | PASS — five resume boundaries, concurrency, fourteen L06 database attacks, two L08 races, and ten L08 database attacks. |
| `node <vinext-cli> build` | 0 | PASS — production build completed. |
| `node <eslint-cli> app db worker tests/flight-recorder-build.test.mjs tests/flight-recorder-release.test.mjs factory/05_ship/prepare.mjs factory/05_ship/verify.mjs` | 0 | PASS — active product and Ship scope clean. |
| `node --test factory/_lib/factory-tools.test.mjs` | 0 | PASS — hashing, freshness, and seal mechanics passed. |
| `git diff --check` | 0 | PASS — no whitespace errors. |

`<tsx-cli>`, `<vinext-cli>`, and `<eslint-cli>` resolve to their installed local
Node entry points. The verifier uses those entry points directly so Windows
shell wrappers do not affect the result.

## Cold-path observations

```json
{
  "coldPreparationRuns": 2,
  "migrationsApplied": 8,
  "reasoningColumns": 8,
  "l06RuntimeTriggers": 6,
  "secondPreparationWasNoop": true,
  "coldRuntimeAttempts": 6,
  "recoveredPlannerAttempts": 2,
  "executionMode": "runtime",
  "truthMode": "FIXTURE",
  "effectMode": "TEST",
  "measuredCost": "unknown"
}
```

The cold migration path does not seed successful reasoning rows. Stage 04's
separate product-runtime probe supplies the execution evidence: six attempts,
six artifacts, exact input-hash recomputation, terminal lease clearing,
resume preservation, expired-claim recovery, concurrency convergence, and
fail-closed synthesis/authority behavior.

## Release-head coverage

The release manifest binds fifteen inputs: the Stage 05 contract; accepted
Stage 04 report and gate; both shared references; README and package commands;
the complete `app/`, `db/`, `drizzle/`, `worker/`, and `tests/` trees; the two
Ship scripts; and the reviewer demo script. Every normalized SHA-256 binding
matched during verification.

| Primary artifact | SHA-256 |
|---|---|
| `factory/05_ship/output/RELEASE_MANIFEST.md` | `b352fe59de15b97da9e52e5ec8f4a2eee8b2dba1a3726946025e0269daa1f7a9` |
| `factory/05_ship/output/DEMO_SCRIPT.md` | `070c87134b82f913d5b56dd083b358b3a413b61f324e02f699686a97cf39b0fd` |

## Scope note

The active release evidence deliberately runs the L06/L08 product suites named
above. The repository-wide legacy data/visual Ship assertions are not used as
proof because they still reference superseded fixtures and screenshots under
open finding L20. Likewise, unrelated untracked benchmark lint is outside this
release. This exclusion is explicit rather than represented as a passing full
suite.

## Verdict

PASS. The accepted Stage 04 proof is fresh, the cold setup is idempotent, the
bounded graph executes through persisted runtime attempts, interruption and
adversarial schedules pass, and all declared release-head hashes match.
Verification opens the Stage 05 gate; it does not accept, commit, or seal it.
L06 is corrected. L20, L04, and L14 remain open.
