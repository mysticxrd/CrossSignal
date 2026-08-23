---
type: verification
stage: 04
status: passed
verified_at: 2026-08-23T01:49:04.6952951+05:30
unit: superseded-intent-authority-correction
finding: L08
---

# Stage 04 L08 verification

Independent verification passed. The formerly vulnerable interleaving now
deterministically fails closed, both linearization orders preserve atomic
state, and every accepted authority semantic remains green. This verification
opens but does not accept the Stage 04 human gate.

## Artifact bindings

Text hashes normalize CRLF to LF before SHA-256.

| Artifact | SHA-256 |
|---|---|
| `VERIFICATION_REPORT.md` | `aa42efe813a0094ec7c8e5f38b6341eb4a13af5fb8b89db5e78cf59906e3c95d` |
| `../verify.mjs` | `3af84eca50fffcbb8d2ad994477ff3b3ecf56329affd3e4fd35845ea6aa23adc` |
| `../../../tests/flight-recorder-build.test.mjs` | `98a7c9232b2aa96a6fddd92e605ec07f540326876ae9020e2775602729cc57a9` |
| `../../../package.json` | `c8a9ab36760f08998d304efdc6a4d514a22f8d7ea05ab8c8df992ecc09f75972` |

## Executable evidence

- Eight L08 acceptance criteria resolve to static bindings and executable tests.
- The real edit-wins schedule rejects the complete stale v1 authorization batch;
  exact v2 subsequently succeeds once.
- The real authorization-wins schedule retains one v1 effect and atomically
  rolls back the losing v2 intent and policy.
- All ten direct database attacks fail closed.
- All five migration cases pass, including complete rollback of the invalid
  historical race.
- Confirmed, failed, and indeterminate paths preserve one effect and no retry.
- The exact runtime active-intent lookup contains no time, `rowid`, aggregate,
  or ordering inference.

## Command results

| Command | Exit | Relevant result |
|---|---:|---|
| `node factory/04_verify/verify.mjs` | `0` | 2 schedules, 10 attacks, 5 migration cases, 7 Data tests, and 15 Build tests passed. |
| Exact ESLint command | `0` | Active repository lint passed. |
| `node_modules/.bin/vinext.cmd build` | `0` | All five build environments passed. |
| Complete six-file pre-Ship test command | `0` | 45 tests passed; 0 failed. |
| Seven-file command including Stage 05 inheritance tests | `1` | 49 passed; the only failure correctly requires this human gate to be accepted before Ship. |
| `git diff --check` | `0` | No whitespace errors. |

## Gate state

Verification passed. The Stage 04 human gate is open and owner-controlled.
Stage 05 remains unauthorized until the exact report and verification hashes
are accepted.
