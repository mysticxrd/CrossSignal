---
type: release-manifest
stage: 05_ship
unit: fixture-runtime-source-of-truth-correction
finding: L20
status: candidate
sealed_base: bed7f21a19d3b71abc0e3c58e13fd8e30ed5a2dd
candidate_branch: codex/l20-fixture-runtime-source-of-truth
release_commit: pending-human-gate
prepared_at: 2026-08-25T00:43:23.1492376+05:30
---

# L20 fixture/runtime source-of-truth release manifest

## Outcome

This candidate corrects L20 by placing fixture identity, graph versions, and
the ordered six-node definition under durable product ownership. Runtime and
precomputed projections consume that one definition; durable tests no longer
depend on numbered factory fixtures or active-stage evidence. Persisted keys,
labels, and behavior remain compatible.

## Declared input bindings

| Input | SHA-256 |
|---|---|
| `factory/05_ship/CONTEXT.md` | `3c7853e4f806565a0b343b9ccaf804ddf3c8c902cfde208e2b46df2cbdcc03d2` |
| `factory/04_verify/output/PRIMARY.md` | `430438f0b2149e3e695ce585a64919f1b07ced2ef766c3531578f36ef8f29b53` |
| `factory/04_verify/output/HUMAN_GATE.md` | `90b1d21d9d9f04b3351ec6f1eb4327ac90f28bddc28b3e338a4f543ccdfcb812` |
| `factory/_shared/ARCHITECTURE_SNAPSHOT.md` | `e0093b6835dfd1ae43b9619fbb50bdba14efac2ed3cab6185ea4eba1af5a3084` |
| `factory/_shared/QUALITY_GATES.md` | `081a6baed840ab54ff0469a67260b43d9dc072d18eff6b766bc1c0106591ee6f` |
| `factory/_lib/verify-kit.mjs` | `b2c7434bf3acacbfb6323b33cf0b175f77d0e3b1d66aeadee6e9ea996c95015c` |
| `factory/_lib/factory-state.mjs` | `72870904445d54f01eea443ed5a5de1b2af2fd19df66e085a52bf47982594d28` |
| `factory/status.mjs` | `a1bfc445aeab8e9672885c13bc73aabf0aaef0a90f9d44f8ae17cf36b2cfbbe5` |
| `factory/seal.mjs` | `3677085ff09b983e03dd69b7b27d060eca32fa155464f7df3de3dad11bafb65e` |
| `factory/CONTEXT.md` | `762bb70707d89fd721bbcae3a2aeaf66a51602ef07ee60ff0f5bcc395bf8da01` |
| `factory/01_spec` | `31872ff78cbd04e04560d01807d1546e2a0c82c65d894b0e2ebe2daa22063836` |
| `factory/02_data` | `05b2fa6d24e1f66d14042df0290c19b91da284aa159df35915df8119f52d7aa5` |
| `factory/03_build` | `d1c780daeaf14407f16a845bd42c36343435c31331b2c3685badb141b7d09468` |
| `factory/04_verify` | `5bd2f57fed3961fbf79eaefa3d494b532ecc212cc7a4604b3189cb88d0769b3a` |
| `db/flight-recorder-demo.ts` | `40e489216a9dcb2d5ec9721ab70eae85c40cf39173a0e72a34dceaa63b6dd1ae` |
| `db/flight-recorder-graph-definition.ts` | `31c0e55b72d2e4712b94c77e4e7cbd7b7d92638f9e0178979d16e952e4d30b39` |
| `db/flight-recorder-graph.ts` | `248137ac1b37e252895ae4d4138a12062bd5c3bae8244c978f266c92de120cfd` |
| `db/flight-recorder.ts` | `5f173de447f77c2eafa6aad607b3a4ce5d43836523453be292fb8961d5a5659a` |
| `tests/fixtures/persisted-graph-executor.fixture.mjs` | `3c9f911d80704616ef926aff69e85334514ebf620021553845da738f4e2580f9` |
| `tests/flight-recorder-data.test.mjs` | `09ccb1926136f3611d618f62742be8e08a2ac399d2a67e70515af7c381d25624` |
| `tests/flight-recorder-build.test.mjs` | `0997721d66d69d8b66ee79f577ac1047a7d5af6f01ccba07d9fafa045c55b2a8` |
| `tests/flight-recorder-release.test.mjs` | `4e406531692b62dfd506099e92107b05935bc191ac2795bb036de956b76b26d8` |

## Governed candidate inventory

- `_archive/2026-08-24-l06-persisted-graph-executor-release/`
- `db/flight-recorder-demo.ts`
- `db/flight-recorder-graph-definition.ts`
- `db/flight-recorder-graph.ts`
- `db/flight-recorder.ts`
- `factory/01_spec/CONTEXT.md`
- `factory/01_spec/output/HUMAN_GATE.md`
- `factory/01_spec/output/SPEC.md`
- `factory/01_spec/output/VERIFY.md`
- `factory/01_spec/verify.mjs`
- `factory/02_data/CONTEXT.md`
- `factory/02_data/fixtures/fixture-runtime-ownership.fixture.mjs`
- `factory/02_data/fixtures/persisted-graph-executor.fixture.mjs`
- `factory/02_data/output/DATA_PACKAGE.md`
- `factory/02_data/output/HUMAN_GATE.md`
- `factory/02_data/output/VERIFY.md`
- `factory/02_data/verify.mjs`
- `factory/03_build/CONTEXT.md`
- `factory/03_build/output/BUILD_EVIDENCE.md`
- `factory/03_build/output/HUMAN_GATE.md`
- `factory/03_build/output/VERIFY.md`
- `factory/03_build/verify.mjs`
- `factory/04_verify/CONTEXT.md`
- `factory/04_verify/output/HUMAN_GATE.md`
- `factory/04_verify/output/PRIMARY.md`
- `factory/04_verify/output/VERIFICATION_REPORT.md`
- `factory/04_verify/output/VERIFY.md`
- `factory/04_verify/verify.mjs`
- `factory/CONTEXT.md`
- `tests/fixtures/`
- `tests/flight-recorder-build.test.mjs`
- `tests/flight-recorder-data.test.mjs`
- `tests/flight-recorder-release.test.mjs`

The archive entry above is inventory metadata for the previously accepted L06
run. Its contents were not loaded during L20. The deleted prior-run projection
paths remain visible in Git metadata so the release does not hide the factory
transition.

## Cold verification contract

With repository dependencies installed, run:

```text
node factory/05_ship/prepare.mjs
node factory/05_ship/verify.mjs
node factory/status.mjs
```

The ship verifier replays 66 durable tests, focused lint, the production Vinext
build, candidate/hash checks, dependency scans, stash preservation, and diff
hygiene. On this Windows workspace, invoke the verifier through the approved
execution path because Vite writes temporary files through the ignored
dependency junction. The global npm launcher is incomplete here; the verifier
uses installed Node entrypoints directly.

Expected pre-acceptance status: Stages 01-04 complete and accepted; Stage 05
in progress solely because its human gate is open. Truth remains explicitly
FIXTURE for product evidence and TEST for the bounded email action.

## Scope and stash preservation

- No database migration, L04 authority-control history, or L14 trace-resolution
  endpoint is part of this release.
- Do not apply, pop, drop, or rewrite benchmark stashes. The three preserved
  stashes must remain present through commit and seal.
- Do not edit or inspect the archived L06 contents during this release.

## Post-gate commit and seal

Only after the final human gate is accepted:

1. Stage the complete governed candidate with `git add -A`.
2. Commit it once with an L20-specific message.
3. Confirm `git status --porcelain=v1` is empty.
4. Run `node factory/status.mjs`; all five stages must be complete, accepted,
   fresh, and release-head-fresh.
5. Run `node factory/seal.mjs`; it must print `sealed <commit>`.
6. Preserve all benchmark stashes unchanged.

Do not start L04 until L20 is sealed and the next governed-run transition is
accepted by a human.
