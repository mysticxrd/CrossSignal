---
type: stage-contract
stage: 05_ship
status: waiting
unit: supabase-postgres-authenticated-trace-resolution-parity
---

# 05_ship - package the verified Supabase parity release

One job: bind the complete release head and provide a cold reviewer path for
the verified Supabase slice.

## Inputs

- Freshness dependency: `../04_verify/output/VERIFICATION_REPORT.md`
- Freshness dependency: `../04_verify/output/HUMAN_GATE.md`
- Freshness dependency: `../_shared/ARCHITECTURE_SNAPSHOT.md`
- Freshness dependency: `../_shared/QUALITY_GATES.md`

Do not load: `_archive/`, the whole repository, or any reference not named
above.

## Outputs

- `output/RELEASE_MANIFEST.md`
- `output/DEMO_SCRIPT.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md`

## Human gate

The reviewer cold-runs the release, reviews its truth labels, and accepts or
rejects the final release.
