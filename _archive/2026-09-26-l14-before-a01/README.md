---
status: historical
source_commit: 58b2aa09b7208bb9a7b9b3cee5a12adeb54c8a11
---

# Preserved L14 factory before A01

The complete 42-file factory tree was moved here after
`node factory/seal.mjs` passed at the source commit above on 2026-09-26.
All archived bytes were checked against the pre-move inventory in
[preservation-manifest.json](preservation-manifest.json).

This is historical evidence, not active product or build authority. The
archive includes full stage contracts, verifiers, fixtures, SQL, outputs,
shared references, and tooling. Original relative bindings describe the
repository layout at the sealed commit, not the archive's new directory.
Inspect the sealed commit to reproduce the old release; do not run archived
verifiers against the new A01 tree or rewrite their accepted hashes.

Existing fixture and generator files used by product regression tests were
also copied unchanged to their old active paths. Their continued presence
does not mean A01 Data or Build has run. The new run is described in
[the transition record](../../factory/TRANSITION.md).
