---
unit: a01-synthetic-revenue-investigation
status: instantiated
baseline_commit: 58b2aa09b7208bb9a7b9b3cee5a12adeb54c8a11
transition_confirmation: user-continue-2026-09-26
spec_entry_confirmation: user-continue-2026-09-26
stage_01_acceptance: pending
---

# A01 run transition

The user said “continue” after the completed A01 handoff and explicit
next-run transition requirement were presented. This confirms the transition
and preparation of Stage 01. It is not acceptance of newly written stage
outputs or permission to bypass later gates.

## Sealed baseline and preservation

- Commit `58b2aa09b7208bb9a7b9b3cee5a12adeb54c8a11` preserves the previously
  uncommitted scenario matrix, reports/tests, and corrected hiring direction.
- `node factory/seal.mjs` exited 0 and printed that exact sealed commit.
- The original `supabase/.temp/cli-latest` remains on disk with SHA-256
  `103e9d7a97f9a66c28586ffae6f8d81a90630d5cb2c537b23ed886a5e0e5ff01`.
  A narrow tracked ignore rule excludes only this generated CLI cache file.
- The full old factory is preserved under
  `_archive/2026-09-26-l14-before-a01/factory/`. All 42 files matched their
  pre-transition byte hashes; the adjacent preservation manifest binds each
  path to the sealed commit. Accepted gate files were not edited.
- Existing `factory/02_data/fixtures/`, `factory/02_data/postgres/`, and
  `factory/03_build/generate-supabase-fixture-sql.mjs` were copied back
  unchanged as legacy regression dependencies.
- No product data, runtime code, database, remote, deployment, or LIVE system
  changed. The outer checkout and its unrelated note remain separate.

## Fresh run

Fresh stage contracts use the existing stage template and existing status/hash
tools. Stages 02–05 have no output directories. Stage 01 owns only its spec,
verification, and pending human gate. It does not implement A01.

`factory/_shared/A01_DIRECTION.md` records the user-approved direction source
for this run. The prior compiled `ARCHITECTURE_SNAPSHOT.md` remains unchanged
as historical reference; it is not silently regenerated from an unavailable
vault source. The A01 contracts name only the A01 direction and existing
quality gates as their two shared references.

## Next human gate

Review `factory/01_spec/output/SPEC.md` and its verification record.
The pending gate binds their exact hashes. A person may accept, request
changes, or reject that output. Until accepted, Data remains never-run.
