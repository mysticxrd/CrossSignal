---
type: verification-evidence
stage: 04_verify
unit: fixture-runtime-source-of-truth-correction
finding: L20
status: passed
verified_at: 2026-08-25T00:14:56.3722702+05:30
---

# L20 independent verification evidence

## Outcome

The accepted L20 build is release-grade. Durable product code owns fixture
identity and the one six-node graph definition; runtime execution, precomputed
projection, and durable tests consume that truth without importing the active
factory or archived releases. Compatibility values and FIXTURE/TEST labels are
preserved.

## Freshness bindings

| Input | SHA-256 |
|---|---|
| `factory/04_verify/CONTEXT.md` | `3b7c3111b792e1ff5a0b3636546e46204d90a59bbe1795835a76cd5621ff0b26` |
| `factory/03_build/output/BUILD_EVIDENCE.md` | `58ad6f35dc65a5f82ef219d9cd01522cb282bc64a4de548e8134890689aba3d2` |
| `factory/03_build/output/HUMAN_GATE.md` | `35f2c1163e8715958c85be2639fd67e14e87a5ac1a1ef710d12568d4b0918fa6` |
| `factory/_shared/ARCHITECTURE_SNAPSHOT.md` | `e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `factory/_lib/verify-kit.mjs` | `b2c7434bf3acacbfb6323b33cf0b175f77d0e3b1d66aeadee6e9ea996c95015c` |

## Durable output bindings

| Output | SHA-256 |
|---|---|
| `db/flight-recorder-demo.ts` | `40e489216a9dcb2d5ec9721ab70eae85c40cf39173a0e72a34dceaa63b6dd1ae` |
| `db/flight-recorder-graph-definition.ts` | `31c0e55b72d2e4712b94c77e4e7cbd7b7d92638f9e0178979d16e952e4d30b39` |
| `db/flight-recorder-graph.ts` | `248137ac1b37e252895ae4d4138a12062bd5c3bae8244c978f266c92de120cfd` |
| `db/flight-recorder.ts` | `5f173de447f77c2eafa6aad607b3a4ce5d43836523453be292fb8961d5a5659a` |
| `tests/fixtures/persisted-graph-executor.fixture.mjs` | `3c9f911d80704616ef926aff69e85334514ebf620021553845da738f4e2580f9` |
| `tests/flight-recorder-data.test.mjs` | `09ccb1926136f3611d618f62742be8e08a2ac399d2a67e70515af7c381d25624` |
| `tests/flight-recorder-build.test.mjs` | `0997721d66d69d8b66ee79f577ac1047a7d5af6f01ccba07d9fafa045c55b2a8` |
| `tests/flight-recorder-release.test.mjs` | `4e406531692b62dfd506099e92107b05935bc191ac2795bb036de956b76b26d8` |

## Independent results

| Check | Result |
|---|---|
| Accepted Stage 03 gate and evidence binding | PASS |
| Durable data/build/release tests | PASS - 66 tests, 0 failures |
| Focused ESLint across all eight outputs | PASS - 0 errors |
| Product/test dependency scan | PASS - 0 active-factory imports, 0 archive imports |
| Graph authority and naming scan | PASS - 1 registry definition, 0 `STAGE_03_` names |
| Durable L06 attack projection | PASS - 14 unique attack identities |
| Compatibility identity and truth labels | PASS |
| Production Vinext build | PASS - all five environments; route `/` emitted |
| `git diff --check` | PASS |

## Scope and environment

- Verified on Windows with Node `v22.15.0` and Git `2.47.1.windows.1`.
- Source HEAD remains the sealed L06 base
  `bed7f21a19d3b71abc0e3c58e13fd8e30ed5a2dd`; L20 changes are the governed
  uncommitted release candidate.
- The global npm launcher is locally incomplete, so the production build used
  the installed `node node_modules/vinext/dist/cli.js build` entrypoint.
- Windows denied Vite temp writes through the ignored dependency junction in
  the sandbox; the identical direct build passed through the approved execution
  path.
- Raw workspace-wide TypeScript diagnostics remain supporting-only because of
  inherited archived Eve and Cloudflare ambient-type baseline failures. No L20
  owned file failed the applicable production build or focused lint.
- No migration, L04 authority-history work, L14 endpoint work, archive content,
  or benchmark stash was changed. All three benchmark stashes remain present
  and unapplied.

## Human review requested

Confirm that this evidence is sufficient to ship L20. Stage 05 must remain
unopened until this gate is accepted.

