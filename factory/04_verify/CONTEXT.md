---
type: stage-contract
stage: 04_verify
status: waiting
unit: supabase-postgres-authenticated-trace-resolution-parity
---

# 04_verify - resolve the Supabase parity promise

One job: verify the complete accepted slice, its negative cases, and rollback
path with release-grade evidence.

## Inputs

- Freshness dependency: `../03_build/output/BUILD_EVIDENCE.md`
- Freshness dependency: `../03_build/output/HUMAN_GATE.md`
- Freshness dependency: `../_shared/ARCHITECTURE_SNAPSHOT.md`
- Freshness dependency: `../_shared/QUALITY_GATES.md`

Do not load: later stages, `_archive/`, the whole repository, or any reference
not named above.

## Outputs

- `output/VERIFICATION_REPORT.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md`

## Human gate

The reviewer resolves every criterion and inspects failures before Stage 05.
