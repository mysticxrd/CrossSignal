---
type: verification
stage: 05
status: passed
verified_at: 2026-08-23T02:05:05.9766718+05:30
release_id: crosssignal-l08-authority-correction-v1
corrected_finding: L08
---

# Stage 05 L08 correction release verification

The accepted Verify evidence is packaged as a cold, command-runnable authority
correction. The complete current release head is hash-bound, migration 0006 is
prepared without hidden deletion or repair, and the manifest leaves L06, L20,
L04, and L14 explicitly open. Verification opens the Ship gate; it does not
accept it.

## Artifact bindings

Text hashes normalize CRLF to LF before SHA-256.

| Artifact | SHA-256 |
|---|---|
| `RELEASE_MANIFEST.md` | `7646ceee2a351225403f0e07479686227701ab585c3084fefcc42283cdc0b797` |
| `DEMO_SCRIPT.md` | `a13a3dec87df61d8babf36aefb5813961a509d89dab282c771a037f88a802b62` |
| `../verify.mjs` | `e555ccb190c9a9c85bbc0eaa11dfc1011b7c031c058a5c05dbcafa8f502f9d82` |
| `../prepare.mjs` | `517ecde6b946bddc9861aa156e2e17b2ae3baa4e8268a23271e492e3043988f1` |
| `../../../README.md` | `7e140c6ebeb75777e9302af506d710ff74444633b5fa2744f61553ec959bf192` |
| `../../../package.json` | `c8a9ab36760f08998d304efdc6a4d514a22f8d7ea05ab8c8df992ecc09f75972` |
| `../../../tests/flight-recorder-ship.test.mjs` | `9c500880b1237f28cdfeb3efd8f5b67d4db2644b951b9db709d42a1a48db2a11` |

## Cold release result

- The first tightened preflight correctly identified the project-local 0005
  schema with an empty Wrangler ledger; blindly applying migration 0000 would
  collide with existing tables.
- The corrected preparation path proves every runtime-required pre-0006 object,
  records only the 0000–0005 migration baseline, deletes no data, applies only
  migration 0006, and verifies both columns, both indexes, and all six L08
  triggers.
- The immediate idempotent rerun reports the schema ready through migration
  0006 and performs no migration replay.
- The Ship verifier independently reruns Stage 04, the 15 Build tests, and the
  5 Ship tests, while checking every declared product-head hash.
- No earlier-release screenshot is used as evidence for the L08 race fix.

## Command results

Environment: Windows PowerShell, Node.js `22.15.0`, Wrangler `4.92.0`, ESLint
`9.39.4`, Vinext `1.0.0-beta.2`, Vite `8.0.13`, Drizzle Kit `0.31.10`, and
project-local D1/Node SQLite.

| Command | Exit | Relevant result |
|---|---:|---|
| `node factory/05_ship/prepare.mjs` from verified legacy local state | `0` | Complete 0005 schema baselined without deletion; migration 0006 applied; 21 commands succeeded; postflight passed. |
| Immediate `node factory/05_ship/prepare.mjs` rerun | `0` | Schema already ready through 0006; both columns, both indexes, and six guards present. |
| `node factory/05_ship/verify.mjs` | `0` | Accepted Verify gate, complete head bindings, 2 schedules, 10 attacks, 5 migration cases, 15 Build tests, and 5 Ship tests passed. |
| Exact ESLint command | `0` | Active repository lint passed without diagnostics. |
| `node_modules/.bin/vinext.cmd build` | `0` | All five build environments passed; dynamic `/` route emitted. |
| Complete seven-file test command | `0` | 50 tests passed; 0 failed, cancelled, skipped, or todo. |
| `git diff --check` | `0` | No whitespace errors. |

## Release truth

- Corrected: `L08` only.
- Remaining: `L06`, `L20`, `L04`, and `L14`.
- Evidence/data mode: `FIXTURE`; effect mode: `TEST`.
- No live provider, production-scale, exactly-once-delivery, causal-outcome,
  or private Result integration claim is made.
- Failed and indeterminate effects retain no blind retry and no silent retry.

## Gate state

Verification passed. The Stage 05 Ship gate is open and owner-controlled. The
run is not sealed until this exact release is accepted, committed, and the
clean-tree seal check passes.
