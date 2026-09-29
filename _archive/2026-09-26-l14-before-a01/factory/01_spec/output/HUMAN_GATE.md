---
type: human-gate
stage: 01_spec
unit: supabase-postgres-authenticated-trace-resolution-parity
gate_status: closed
decision: accepted
reviewer: human
reviewed_at: 2026-09-08T12:36:27+05:30
spec_sha256: 0e1990a042bde9b443482f9862e85158414d5098ed6c9348bfb9a08a931741d7
verification_sha256: 462aacdc3df0afeb6bd353f51ccc1b1ae9d02d93b996e112421e349305ed5dde
---

# Supabase Stage 01 human gate

The first database-replacement slice is specified as hosted Supabase
PostgreSQL parity for the authenticated read-only trace-resolution endpoint.
Human review is required before Stage 02 creates executable PostgreSQL schema,
policy, migration, or fixture contracts.

## Review checklist

- [x] Confirm the four-table read slice is a useful first proof of the D1 replacement.
- [x] Confirm the existing HTTP response and failure contracts remain unchanged.
- [x] Confirm tenant isolation uses both explicit query predicates and PostgreSQL RLS.
- [x] Confirm runtime credentials remain server-only and the Data API is not exposed.
- [x] Confirm transaction pooling, disabled prepared statements, and TLS are explicit.
- [x] Confirm no silent fallback or dual write is allowed.
- [x] Confirm D1 remains recoverable until hosted Supabase evidence is accepted.
- [x] Confirm all 16 acceptance criteria and 12 negative cases are sufficient.
- [x] Confirm no existing Supabase project is selected or modified by inference.
- [x] Choose `accepted`, `changes-requested`, or `rejected`.

## Reviewed artifacts

| Artifact | SHA-256 |
|---|---|
| `factory/01_spec/output/SPEC.md` | `0e1990a042bde9b443482f9862e85158414d5098ed6c9348bfb9a08a931741d7` |
| `factory/01_spec/output/VERIFY.md` | `462aacdc3df0afeb6bd353f51ccc1b1ae9d02d93b996e112421e349305ed5dde` |

## Decision

`accepted`

The human accepted this specification in the Codex task on
2026-09-08T12:36:27+05:30. Stage 02 may create the reviewed local PostgreSQL
data contract. This decision does not select a hosted Supabase target or
authorize remote DDL.
