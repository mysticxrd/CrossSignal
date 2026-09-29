---
unit: a01-synthetic-revenue-investigation
stage: 01_spec
status: passed
verified_at: 2026-09-26T08:19:32.327Z
verification_scope: specification-and-transition-only
---

# Stage 01 verification — A01 specification

Environment: Windows PowerShell, Node.js v22.15.0, existing nested checkout
on branch codex/phase3-decision-ux. Sealed baseline:
`58b2aa09b7208bb9a7b9b3cee5a12adeb54c8a11`.

## Results

| Check | Command or procedure | Result |
| --- | --- | --- |
| Baseline seal | `node factory/seal.mjs` before transition | Exit 0; printed sealed baseline above |
| Spec completeness and source binding | `node factory/01_spec/verify.mjs --check-spec` | Exit 0; 12 acceptance criteria, 9 failure experiments, 16 declared input hashes |
| Full review package | `node factory/01_spec/verify.mjs` | Requires matching Spec/verifier/context/verification hashes and valid pending gate; no human acceptance granted |
| Existing status/hash tools | `node --test factory/_lib/factory-tools.test.mjs` | Exit 0; 3/3 passed |
| Historical preservation | Read-only SHA-256 comparison against pre-move manifest | 42/42 original factory files match; all 5 copied fixture/SQL/generator dependencies match |
| Stage boundary | Check later output directories | Stages 02–05 output directories absent |
| Cache preservation | SHA-256 comparison | Original 8-byte cli-latest unchanged, ignored by exact path only |
| Product preservation | `git diff --name-only -- app db scripts tests supabase` | Empty; no product/runtime/test/data changes in this transition |
| Whitespace | `git diff --check` | Exit 0 |

The full review-package command is run after assembling this record and the
pending gate. A passing check validates their exact hashes; it does not accept
the gate. Re-run it before recording a human decision.

## Deliberate specification failures

The stage verifier requires rejection when an exact approval acceptance row
is removed, the missing/mismatched/manual-check approval failure row is removed,
the filesystem-access restriction is removed, or a declared source digest
is altered. Full package validation also rejects a gate with the wrong Spec
hash. These are checks of specification integrity, not runtime fault tests.

## Scope and limitations

This stage prepares a complete reviewable specification. It does not implement
A01 tools, rollback, persistence, simulator, grader, or a model investigation.
The source handoff's 29/29 product regression result remains the latest product
baseline evidence. Runtime files are unchanged; those tests were not repeated
solely for documentation changes.

Application build/lint, database migration, and preview checks are not applicable
to this specification-only stage; later product stages must run them for changed
surfaces under the existing quality gates. No paid model, payment provider,
TEST database, deployment, LIVE action, or real device check ran.

The historical all-stage npm verification commands refer to the old release
layout; they are not A01 acceptance commands. Use the sealed baseline for that
release and stage-specific commands for this run. In particular, no claim is
made that the repository-wide legacy npm test target passed in this transition.

A suitable local model has not been established; model evaluation remains a
separate dependency. All future A01 outcomes are SIMULATED. Existing trial
exclusion, Mobile Safari fixture, tenant isolation, and exact authority rules
remain in force. The archived original gate files remain unchanged.

## Declared input hashes

Normalized-text SHA-256 using the unchanged shared verification kit.

| Input | SHA-256 |
| --- | --- |
| `factory/01_spec/CONTEXT.md` | `5901ea3176710a93bcf05f90c20be8552c7d4d19ad98ae57e200098d8eb102b8` |
| `factory/01_spec/verify.mjs` | `6c0d6df893516843e854831f05ad82521c468c5e08dd1c58360520b95acbcfd0` |
| `factory/01_spec/output/SPEC.md` | `0f37074fcb86ec12e38bf51d4b4a1be8231206f7d463f60d67a51282ac510da5` |
