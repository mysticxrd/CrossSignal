---
type: preservation-qualification-proposal
unit: b01-api-behavioral-benchmark
stage: 03_build
status: pending-human-review
qualification_applied: false
original_assertion_waived: false
model_requests: 0
---

# Preserve and qualify the historical outer-index discrepancy

The original runner's strict check still fails on the outer repository's raw
Git index. Its exact rule in [runner-checks.mjs](../../../runner-checks.mjs:95) is:

> `assert.equal(current.indexSha256,saved.indexSha256);`

The accepted hiring scope did not qualify this discrepancy. The preservation
baseline, prior raw snapshot and failure remain unchanged. Resetting, staging,
restoring or rewriting the index to manufacture a pass is not proposed.

## Exact discrepancy and observations

Repository: `C:/Users/hisha/ChatGPT/CrossSignal`.
HEAD: `ca44f2eb180ed2d7d1fba1b606208a3294d4830d`.

- Original baseline raw index SHA-256:
  `33cc89df4b1ea6588ca2e40a280c4403cffffba91f138e1a5d70186fd5e508c3`.
- Current raw index SHA-256:
  `f2b71d8c898fa92339eb453c6dac09052ec0a824d017f9466a85789157f02fef`.
- [Read-only recheck](INDEX_RECHECK.json) finds all 428 indexed path/mode/object
  entries equal HEAD and an empty staged diff. The normalized logical-entry
  digest is `fa45e1634e339325cceafa6ef15bbb88f4fff5db5bb3e12f13378f62920de5f6`.
  Current raw bytes are unchanged since the prior observation. Writer/cause is
  unconfirmed. No conclusion about how the discrepancy arose is asserted.
- The continuation verifies every inventoried existing outer/product file,
  accepted artifact, prior packet manifest, database, directory, junction,
  inherited status, branch and HEAD. It requires the current raw index to remain
  unchanged during this pass. That narrower pass does not make the older raw
  equality assertion pass.

## Proposed qualification for future showcase checks only

1. Preserve the original strict assertion, baseline, raw snapshot, recorded
   failure and all documentation reconciliation records. Their historical
   outcome remains **failed on outer raw-index equality**.
2. Accept this one discrepancy as a reviewed preservation qualification if the
   current checks above pass. Bind the current raw index and logical-entry
   digest as additive future-check inputs. A further byte, logical-entry, staged,
   HEAD, branch, file, status, directory or link change fails that future check.
3. Continue verifying all original source/data/database bytes and the seven
   documented old/current documentation pairs exactly. No replacement manifest,
   accepted evidence regeneration, source exclusion or lost work is permitted.
4. Report the historical qualified discrepancy alongside future results. Do not
   relabel the old runner receipt or full Stage 03 as passed.

This proposal changes one preservation interpretation, **zero benchmark limits,
datasets or scoring rules**. It authorizes no Git mutation, credential change,
provider request, spending, installation, runtime effect, gate transition,
commit or seal. Acceptance would remove only the preservation-review blocker;
HTTP 400 compatibility and a fully verified, frozen 15-record execution path
would still need to pass before already-authorized Free-tier requests.

## Review decision

Accept, request changes to, or reject this exact proposal and its bound
continuation verification/source manifest. Any decision is recorded additively.
The current [root contract](../../../../../CONTEXT.md) says:

> Accepted outputs, gates and hash-bound inputs remain immutable; propose a
> source/binding correction through its review path instead of concealing drift.

The [Stage 03 contract](../../../CONTEXT.md) also says:

> A person reviews exact Build/VERIFY hashes. Behavioral losses are valid results;
> missing model/demo evidence stays NOT_RUN. Verify stage cannot begin without acceptance.

Those original Build/VERIFY hashes and pending gate are preserved. This decision
is separate from both the already accepted scope and the Stage 03 human gate.
