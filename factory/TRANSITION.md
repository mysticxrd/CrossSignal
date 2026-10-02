---
unit: b01-api-behavioral-benchmark
status: instantiated
baseline_commit: 43d42d255bd22cb227e3410dda31ffb8437f6624
transition_confirmation: user-confirmed-2026-10-01
spec_entry_confirmation: user-confirmed-2026-10-01
stage_01_acceptance: pending
paid_api_authorization: not-granted
runtime_approval: NOT_RUN
---

# Confirmed A01 → B01 transition

The repository owner replied **“confirmed”** after the API benchmark review
packet, exact transition procedure and separate Stage 01 entry requirement
were presented. This authorizes activation and preparation of Stage 01 outputs.
It does not accept those new outputs, permit paid requests or grant rollback.

The reviewed packet remains in the outer repository at
`planning/2026-09-30-api-behavioral-benchmark/`. Its REVIEW_GATE records the
owner's decision and 32 exact reviewed raw-byte hashes. The preparation sources
remain intact; the confirmed activation is new evidence, not an edited A01 claim.

## Baseline and preservation

- Baseline branch: `codex/phase3-decision-ux`; sealed commit:
  `43d42d255bd22cb227e3410dda31ffb8437f6624`.
- Immediately before activation, status, A01 Ship verification and seal exited
  0; all five A01 gates accepted/fresh, 637 release-bound files, clean Git.
- The complete original factory was moved to
  `_archive/2026-09-30-a01-before-b01/factory/` using checked absolute paths inside
  the authoritative product. Its adjacent PRESERVATION_MANIFEST.json records
  all 118 raw-byte hashes. Every archived file matched before and after the move.
- A separate complete copy remains in the outer preparation packet. All factory
  contracts, verifiers, fixtures, outputs, shared references, tooling, templates
  and prior transition were preserved together, not outputs alone.
- `factory/A01_PRESERVATION_MANIFEST.json` is a byte-identical copy of that
  manifest for hash-only stage provenance; no archived output is a new B01 input.
- Generic factory tools/template and shared historical references were copied
  byte-identically. Legacy `02_data/fixtures/`, `02_data/postgres/` and
  `03_build/generate-supabase-fixture-sql.mjs` remain at their original relative
  paths for regression dependencies. No old accepted output directory was copied
  into the new run. No accepted artifact/verifier was regenerated.

## Current run

Fresh numbered contracts were instantiated from the reviewed hardened-template
candidate, with root unit `b01-api-behavioral-benchmark`. Source charter/API boundary,
planning reconciliation and private judgment design were copied byte-identically.
The Stage 01 contract clarifies exact input paths and scopes factory-sensitive
test inspection; later stage contracts remain waiting with no outputs.

Current planning follows the September 29 behavioral decision and September 30
API correction. Existing sealed hiring/A01 release source documents remain
unchanged. A01's programmed tool sequence and five branches prove mechanics only.

Application/runtime code, fixtures, persistent stores, excluded trial receipt,
TEST/LIVE, `.git`, remote and the obsolete OneDrive checkout were not modified.
The outer router and untracked note retain their pre-existing raw hashes.
No clone, reset, clean, installation, model call or effect occurred. The product
HEAD stays at the baseline; the new uncommitted factory work intentionally
makes the active working tree unsealed for B01.

## Next human gate

Review Stage 01's SPEC.md and VERIFY.md. Its HUMAN_GATE is pending. Acceptance
must bind their exact fresh hashes before Data begins. Runtime intervention later
requires its own exact displayed proposal/hash approval. Model provider/configuration
and budget remain unresolved; the original no-paid-call constraint still applies.
