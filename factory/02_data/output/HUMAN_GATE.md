---
type: human-gate
stage: 02_data
unit: supabase-postgres-authenticated-trace-resolution-parity
gate_status: closed
decision: accepted
reviewer: human
reviewed_at: 2026-09-08T13:17:42+05:30
data_package_sha256: 325c122ed0983a40f25a04a88697c2aa7536fb099dce49f0a369f837c70b1861
verification_sha256: 2db791528904ccbe7586018321fb23c7639e9aa10cd070cdcec9e3cf60f87fc6
---

# Supabase Stage 02 human gate

The local PostgreSQL data package is complete and statically verified. Human
review is required before Stage 03 implements the runtime adapter or applies
DDL to a selected Supabase TEST target.

## Review checklist

- [x] Confirm `cfr_app` and the four-table read model are the intended first migration slice.
- [x] Confirm the SQLite-to-PostgreSQL column, constraint, index, and trigger map is accurate.
- [x] Confirm the reader role, private schema, forced RLS, explicit query predicates, and transaction-local tenant settings are acceptable.
- [x] Confirm `anon`, `authenticated`, and `service_role` have no access to this schema.
- [x] Confirm the deterministic fixture counts `2 / 2 / 2 / 77` and bound digests are acceptable for TEST parity.
- [x] Confirm PostgreSQL execution, RLS probes, pool-reuse tests, and Supabase advisors remain mandatory in Stage 03.
- [x] Accept the disclosed scope correction: non-trace subject-to-source-row binding and write-authority guards cannot be fully preserved with only four tables.
- [x] Confirm `AC-SP-04` therefore remains partially satisfiable and D1 cannot be removed in this slice.
- [x] Confirm no existing Supabase project has been selected or modified by inference.
- [x] Choose `accepted`, `changes-requested`, or `rejected`.

## Reviewed artifacts

| Artifact | SHA-256 |
|---|---|
| `factory/02_data/output/DATA_PACKAGE.md` | `325c122ed0983a40f25a04a88697c2aa7536fb099dce49f0a369f837c70b1861` |
| `factory/02_data/output/VERIFY.md` | `2db791528904ccbe7586018321fb23c7639e9aa10cd070cdcec9e3cf60f87fc6` |

## Decision

`accepted`

The human accepted this data package and disclosed limitation in the Codex
task on 2026-09-08T13:17:42+05:30. Stage 03 local implementation is
authorized. This decision does not select a hosted Supabase target or authorize
remote DDL; those actions still require an explicit TEST target and
cost/organization decision.
