---
type: pipeline-contract
form: pipeline
unit: authenticated-tenant-scoped-redacted-ordered-trace-resolution-endpoint
---

# Company Flight Recorder - build factory

The flow in one line: specify the slice -> make its data executable -> build it
-> verify the whole promise -> ship reviewer-ready proof.

This is the same MWP lifecycle used for Whipoff: every meaningful vertical
slice makes one sequential pass through `spec -> data -> build -> verify ->
ship`. The current run is the bounded L14 authenticated, tenant-scoped,
redacted, ordered trace-resolution endpoint.

| Stage | One job | Primary output | Human check |
|---|---|---|---|
| `01_spec` | Turn product uncertainty into one accepted specification | `output/SPEC.md` | Accept what, why, scope, and observable done |
| `02_data` | Turn the accepted specification into executable data contracts | `output/DATA_PACKAGE.md` | Accept ownership, provenance, state, authority, and fixtures |
| `03_build` | Turn the accepted data package into one durable vertical slice | `output/BUILD_EVIDENCE.md` | Run the complete golden path in preview |
| `04_verify` | Turn the working slice into release-grade evidence | `output/VERIFICATION_REPORT.md` | Resolve every acceptance criterion and inspect failures |
| `05_ship` | Turn verified evidence into an evaluator-ready release | `output/RELEASE_MANIFEST.md` | Run the release cold without hidden repair |

Stable factory references live in `_shared/`. New run artifacts live only in
each stage's `output/`. Accepted application code remains in the repository's
durable product directories.

## Derive status from files

Run `node factory/status.mjs`, or scan the numbered stage folders in order.
The command is a read-only generated view; it never writes a status file.

- `never-run`: `output/` is absent.
- `in-progress`: an output exists but required artifacts, `VERIFY.md`, or
  `HUMAN_GATE.md` are missing or not accepted.
- `stale`: a gate-bound artifact, upstream working dependency, shared reference,
  or the final Ship head binding no longer matches.
- `complete`: every declared output exists, `VERIFY.md` says `status: passed`,
  `HUMAN_GATE.md` says `decision: accepted`, its artifact hashes agree, and its
  freshness dependencies remain current.

Declared hashes have three roles. Upstream outputs, the current stage contract,
and `_shared/` references are **freshness dependencies**. Product trees read or
written by Stages 01-04 are **historical bindings**: later stages may supersede
them without reopening an earlier accepted gate. Stage 05 owns **release-head
coverage**, so every binding in `RELEASE_MANIFEST.md` must still match. This
prevents normal downstream work from falsely reactivating Stage 01 while still
detecting drift in the shipped product.

The active stage is the first stage that is not complete. There is no editable
program status table. Never start a later stage to work around a failed or
unreviewed earlier gate.

## Seal and start the next run

After the final human gate, commit the complete release and run
`node factory/seal.mjs`. Sealing is read-only and succeeds only when all stages
are complete, the Ship manifest covers the current product head, and Git has no
staged, unstaged, or untracked changes.

A new run may begin only from a sealed commit. Preserve the completed run as a
durable record bound to that commit; if files are copied to `_archive/`, copy
the complete run-specific stage folders (contracts, verifiers, fixtures, and
outputs), never `output/` alone. Then instantiate fresh stage contracts from
`_templates/`, update the root `unit`, and stop for human confirmation before
Stage 01. Archiving and instantiation remain a human-owned transition rather
than an automatic destructive command.

## Loading discipline

Read only the active stage contract, its exact inputs, and the named shared
references. Do not load later stage contracts, `_archive/`, dependency folders,
generated build output, or the source vault. Stage contracts must remain short;
constraints belong in `_shared/` and evidence belongs in `output/`.
