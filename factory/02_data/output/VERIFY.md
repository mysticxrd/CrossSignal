---
type: stage-verification
stage: 02_data
unit: fixture-runtime-source-of-truth-correction
status: passed
verified_at: 2026-08-24T08:22:42.815Z
---

# L20 data-package verification

## Environment

- Platform: Windows / PowerShell
- Node: `v22.15.0`
- Branch: `codex/l20-fixture-runtime-source-of-truth`
- Sealed base: `bed7f21a19d3b71abc0e3c58e13fd8e30ed5a2dd`
- Product mutations: none
- Archive loads: none
- Benchmark stash reads or mutations: none during Stage 02

## Input bindings

| Input | SHA-256 |
|---|---|
| `factory/02_data/CONTEXT.md` | `98183d21218902525ead8bc31677e61e9010b04a1a6be5b862e5588337b1c547` |
| `factory/01_spec/output/SPEC.md` | `2b4acd7fecccf0c952de54ca8ac81bcc3511353e27ed9d34e75640599bc40ca0` |
| `factory/01_spec/output/HUMAN_GATE.md` | `74390b5ce66fa24d6d068decc2fb7105dbf49e164ccbda47a57fd608ba8b7bcb` |
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
| `factory/02_data/output/DATA_PACKAGE.md` | `c59eca1d8f968d7b103f9f2bebc7bd44e066d52baf7747220078c077273b33da` |
| `factory/02_data/fixtures/fixture-runtime-ownership.fixture.mjs` | `ca07b39075bb92c760b4f5876b46b80268c4acdbe560dbb6c160cf73bb2b464e` |
| `factory/02_data/verify.mjs` | `d323ccb7ce7a197ad9fa0aa1fcc05759696a948389789e1d029247933432d289` |

## Command evidence

### Development failures

- Command: `node factory/02_data/verify.mjs`
- Exit code: `1`
- First result: the named-error matcher anchored before Node's standard
  `Error:` prefix. The matcher was corrected to require the exact L20 code and
  separator within the standard error rendering.
- Second result: projection extraction scanned all `nodeKey` occurrences in
  `db/flight-recorder-graph.ts`, correctly triggering duplicate-node rejection.
  Extraction was bounded to `REASONING_NODE_REGISTRY`; no case data or product
  source changed.

### Final executable verifier

- Command: `node factory/02_data/verify.mjs`
- Exit code: `0`
- Result: `status: passed`; 6 import cases, 5 projection mutations, 3 reset
  cases, 1 seal-transition case, all 9 acceptance criteria, and 8 named errors.
- All 12 package bindings were current, including the executable fixture hash.

### Diff hygiene and factory state

- Command: `git diff --check -- factory/02_data`
- Exit code: `0`
- Result: no whitespace errors.
- Command: `node factory/status.mjs`
- Exit code: `0`
- Result before this record existed: Stage 01 complete/accepted/fresh; Stage 02
  active and missing only `VERIFY.md`; Stages 03-05 `never-run`.

## Negative evidence

- Product → factory, durable test → numbered fixture, and active archive
  dependencies fail with distinct named codes.
- Fixture key, graph version, truth mode, duplicate node, and predecessor drift
  each fail closed.
- Cross-tenant reset deletes zero; non-FIXTURE reset deletes zero.
- Fixture source secret scan passed.
- Stage 01 gate is closed and accepted; package inputs are current.
- L04, L14, migrations, product code, archives, and benchmark stashes were not
  changed.

## Result

`status: passed`. The executable data package is ready for human review.
Verification opens but does not accept the Stage 02 gate; Stage 03 remains
prohibited until the current package and verification hashes are accepted.
