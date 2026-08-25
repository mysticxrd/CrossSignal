---
type: stage-verification
stage: 01_spec
unit: fixture-runtime-source-of-truth-correction
status: passed
verified_at: 2026-08-24T08:03:32.375Z
---

# L20 specification verification

## Environment

- Platform: Windows / PowerShell
- Node: `v22.15.0`
- Branch: `codex/l20-fixture-runtime-source-of-truth`
- Sealed base: `bed7f21a19d3b71abc0e3c58e13fd8e30ed5a2dd`
- Archive loading: none
- Benchmark stash mutation: none

## Freshness and baseline bindings

| Input | SHA-256 |
|---|---|
| `factory/01_spec/CONTEXT.md` | `f1a29a11777dc7d4b9b7bdf44d0f5159e5b4db320778de853dcbf0b357727047` |
| `factory/_shared/ARCHITECTURE_SNAPSHOT.md` | `e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `db/flight-recorder-demo.ts` | `2d23a77f6ebea793650677872895c1376123a38bdeeec7f0dc6109a1bdbc08db` |
| `db/flight-recorder.ts` | `2cea63997ca52a5404fb02287297371c0a32d17d53a28512f7147243c01c6b39` |
| `db/flight-recorder-graph.ts` | `7ccfdf3bd101ec3152da9bf3eb3b366197e0fc7bc708a81ea24275e33d334061` |
| `tests/flight-recorder-data.test.mjs` | `18ea70aead27579460bcf01157953a3f8337f3a5eafde523b9b55b36a774f2b1` |
| `tests/flight-recorder-build.test.mjs` | `7c5be086037e7dcb293ea6e76db17297d38ae1542c07231024ebe53e00359974` |
| `tests/flight-recorder-release.test.mjs` | `fda88e925e632e4d4aa25dc365712f2a14ae2074440d625c4974a145fe6c3b88` |

## Output bindings

| Output | SHA-256 |
|---|---|
| `factory/01_spec/output/SPEC.md` | `2b4acd7fecccf0c952de54ca8ac81bcc3511353e27ed9d34e75640599bc40ca0` |
| `factory/01_spec/verify.mjs` | `1f7d808219bd69db93ee3dd869a896c7037f4c0f2d599be1320a4e1ad2a549f6` |

## Command evidence

### Initial verifier attempt

- Command: `node factory/01_spec/verify.mjs`
- Exit code: `1`
- Result: expected development failure. The first archive-dependency assertion
  matched the contract's explicit prohibition text (`Do not load _archive/`)
  instead of only active dependency declarations. The verifier was narrowed to
  dependency/surface lines; no specification or product input changed.

### Corrected verifier

- Command: `node factory/01_spec/verify.mjs`
- Exit code: `0`
- Result: `status: passed`, finding `L20`, 45 checks, all nine input hashes
  current, specification hash current, human gate open.

### Diff hygiene and derived factory status

- Command: `git diff --check -- factory/01_spec factory/CONTEXT.md`
- Exit code: `0`
- Result: no whitespace errors.
- Command: `node factory/status.mjs`
- Exit code: `0`
- Result before this record existed: Stage 01 active and in progress solely
  because `VERIFY.md` was missing; Stages 02-05 remained `never-run`.

## Negative checks

- The active input declarations contain no `_archive/` dependency.
- The baseline confirms the two run-scoped fixture imports that L20 must remove.
- The baseline confirms release/runtime consumers already use the durable demo.
- The spec requires a single durable fixture owner and graph definition.
- The spec requires deterministic, tenant-scoped reset and seal-transition
  resilience.
- L04, L14, database redesign, live providers, and benchmark stash changes are
  explicit non-goals.

## Result

`status: passed`. Verification opens the Stage 01 human gate but does not accept
it. Stage 02 remains prohibited until a reviewer binds this specification and
verification record with `decision: accepted`.

The verifier was finalized before acceptance to validate both the open and
accepted gate states without changing the accepted specification.

The accepted gate metadata was then aligned with the factory's stable
`gate_status` and stage-specific `spec_sha256` field contract; the
specification remained byte-identical.
