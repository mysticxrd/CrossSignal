---
type: human-gate
stage: 03_build
unit: supabase-postgres-authenticated-trace-resolution-parity
gate_status: closed
decision: accepted
reviewer: human
reviewed_at: 2026-09-08T23:36:16+05:30
build_evidence_sha256: fd78d61f7d54762359fb164b6ee5a0a4497a6ad7322d06a5028fa748b39b9050
verification_sha256: eb8429b82a6c3be6fafbf1205a9a300cc394f2d4f4ebc7adab89e1ddb0e217a7
---

# Supabase Stage 03 human gate

The accepted trace-resolution slice is implemented locally and has passed
hosted TEST verification in Supabase project `tonuxepirauyqcwbwenw`. Human
review is required before Stage 04.

## Review checklist

- [x] Confirm explicit `d1` and `supabase` provider selection, with no silent
  fallback, is acceptable.
- [x] Confirm the Supabase adapter's read-only transaction, transaction-local
  tenant settings, explicit predicates, TLS, and transaction-pooler constraints
  are acceptable.
- [x] Confirm the hosted fixture counts `2 / 2 / 2 / 77` and owner results of
  28 and 49 events are correct.
- [x] Confirm cross-tenant reads, missing-context reads, reader mutations,
  sequence gaps, invalid transitions, foreign subjects, and event mutations
  were denied as required.
- [x] Accept the trace-subject correction: later trace-subject events bind to
  the first source trace subject in that trace rather than assuming the source
  subject equals the read-model trace ID.
- [x] Confirm the final Supabase Advisor state of six fresh-dataset `Unused
  Index` INFO notices is acceptable after all warning-level findings were
  cleared.
- [x] Confirm the short-lived runtime probe role and local secret files were
  removed and that no persistent runtime credential exists yet.
- [x] Confirm D1 remains the rollback path because the four-table slice does not
  preserve full non-trace subject binding or write authority.
- [x] Confirm persistent runtime credentials and deployed route configuration
  remain later work and are not authorized by accepting this gate alone.
- [x] Choose `accepted`, `changes-requested`, or `rejected`.

## Reviewed artifacts

| Artifact | SHA-256 |
|---|---|
| `factory/03_build/output/BUILD_EVIDENCE.md` | `fd78d61f7d54762359fb164b6ee5a0a4497a6ad7322d06a5028fa748b39b9050` |
| `factory/03_build/output/VERIFY.md` | `eb8429b82a6c3be6fafbf1205a9a300cc394f2d4f4ebc7adab89e1ddb0e217a7` |

## Decision

`accepted`

The human accepted this Stage 03 TEST build and its disclosed boundaries in the
Codex task on 2026-09-08T23:36:16+05:30. Stage 04 verification may now begin;
this decision does not create persistent database credentials or authorize a
deployment.
