# A01 — Data checkpoint

Updated 2026-09-26. The user explicitly accepted the exact Stage 01 Spec and
verification hashes. The gate records that acceptance; its source artifacts
remain unchanged. The user subsequently accepted Stage 02 Data. The current successor is
[Stage 03 Build](a01-build-status.md); the Data results below are preserved.

Review [DATA_PACKAGE.md](../factory/02_data/output/DATA_PACKAGE.md),
[VERIFY.md](../factory/02_data/output/VERIFY.md), and the
[accepted Data gate](../factory/02_data/output/HUMAN_GATE.md).

The data package contains repeatable complete, limited-evidence, and injection
fixtures; strict observable/query/proposal validators; private version-driven
world transitions; evaluator-only answers; and a local SQLite schema. The
reference checkout rollback yields 190/200 successes per new window; unrelated
rollback or no action remains 120/200. These are SIMULATED data-contract results.

Verification rejected 19 malformed contract inputs and 11 invalid storage
operations. An interrupted transaction rolled back effect, world, and timeline
together; committed state survived reopening with one effect. Restricted-process
probes denied four private reads, a write, and child-process creation.

The product query handlers, investigator, exact human approval interface,
integrated executor, durable Case projection, and hidden-truth behavioral grader
remain Build work. Model evaluation is NOT_RUN. The node:sqlite adapter is
available locally and emits an experimental-feature warning; no paid model,
payment integration, hosted database, TEST/LIVE change, or device check ran.

**Decision recorded:** Data accepted for the exact reviewed hashes. Build
preparation is authorized. Stage 01 acceptance is not approval to execute a rollback.
Existing Mobile Safari regression data, trial exclusion, runtime modules, and
the preserved historical factory are unchanged.

Run `node factory/status.mjs` for current gate state, and
`node factory/02_data/verify.mjs` for the full data-contract verification.
The older hiring-direction and transition documents are frozen inputs to the
accepted Spec; this checkpoint supplies the subsequent status without changing
their approved hashes. Current stage changes remain uncommitted.
