---
type: stage-verification
stage: 01_spec
unit: b01-api-behavioral-benchmark
status: passed
verified_at: 2026-10-01T07:07:37.851Z
baseline_commit: 43d42d255bd22cb227e3410dda31ffb8437f6624
spec_sha256: e6e2f7fa20903ed4b1dc96b156908a51bf872cee254084313a449914950dbf4e
context_sha256: 51ce7b46b33b773c6d1b14688bfdaa9833cfb2489a698e0810027d68e79a3d7e
verifier_sha256: 7aeadc553dacdbdd95d36f29578f87e730a03f54b1e1a8cb585b5f426d3cf36b
commands_sha256: 332fcadb7a606a91969efbcda00a210d90bcfb9a35d53ad4545514536271ace1
model_evaluation: NOT_RUN
human_runtime_approval: NOT_RUN
---

# Stage 01 verification — ready for human review

The confirmed transition and specification preparation passed. This checks
scope, input provenance, full A01 preservation and gate binding; it is not a
behavioral evaluation, runtime approval, or acceptance of new stage outputs.

## Environment and executed commands

Windows 11 / win32, Node v22.15.0; authoritative cwd:
C:/Users/hisha/ChatGPT/CrossSignal/work/crosssignal-phase1.
Exact outputs and recording dates are in [commands.json](commands.json).

| Command | Exit | Result |
| --- | --- | --- |
| node factory/01_spec/verify.mjs --before-gate | 0 | 30 input hashes match; five cases; 16 future criteria; six negative scope mutations rejected; 118 archived files unchanged |
| node --check factory/01_spec/verify.mjs | 0 | Verifier syntax passed |
| node ../../node_modules/eslint/bin/eslint.js factory/01_spec/verify.mjs | 0 | New verifier lint passed |
| git diff --check | 0 | Current tracked diff has no whitespace errors |

The exact default command, node factory/01_spec/verify.mjs, is the final
read-only check after this report and the pending human gate are written. Its
output is recorded separately in final-check.json to avoid circular report hashes.

## Checked provenance and preservation

- Clean sealed A01 branch/HEAD was rechecked before activation: codex/phase3-decision-ux,
  43d42d255bd22cb227e3410dda31ffb8437f6624; status/Ship/seal all exited 0.
- User confirmation is recorded in factory/TRANSITION.md and the outer preparation
  REVIEW_GATE. Confirmation covers transition and Stage 01 entry only.
- All 118 files of the complete archived A01 factory match their original raw-byte
  hashes; its inventory and preservation-manifest digest match exactly.
- Shared original quality/architecture/A01 references, generic factory tooling,
  template, legacy fixture/postgres folders and SQL-generation helper are unchanged.
- Observed runtime/scripts/test/package sources match sealed baseline content.
  Only factory contracts/tooling/evidence, new planning sources and current routing
  changed. The product HEAD/branch and prior data/runtime stores remain untouched.
- The two pre-existing outer files retain their original raw-byte hashes; no reset,
  clean, commit, remote/OneDrive operation, installation, provider call or effect.
- Stages 02–05 have no output directories. Stage 01 gate remains pending.

## Scope verification and negative checks

The document verifier checks five case judgments, four diagnosable cases plus
B05 uncertainty, same allowed evidence/model configuration, bounded API/tool use,
private-input exclusions, requested metrics, one development-driven measured
change, exact runtime authority, compatibility ownership and 16 future criteria.

Six altered specifications were rejected: unequal evidence, hidden-cause certainty
on B05, enlarged tool budget, fabricated model proof, unapproved paid authority
and deleted isolation requirements. These are specification-validator checks;
production prompt-injection, tenant, authority and model behavior remain future
Build/Verify evidence, not passing runtime tests here.

No behavior score or general-competence claim was generated. Provider/model and
paid budget remain unresolved; the original no-paid-call condition persists.
All real payment/device/business recovery claims remain unproven.

## Applicability and limits

No application/runtime implementation or migration changed. Application build,
product regression suites, model calls and human intervention are not applicable
to this specification-only stage and were not run. Accepted pre-transition A01
release verification passed. The active B01 worktree is intentionally unsealed.

Factory-sensitive A01 release, historical workspace/Ship assertions and later
package aliases need scoped reference updates during Build. Legacy fixture imports
were preserved; no tests/assertions were removed. A full post-transition npm test
pass is not claimed while future stage outputs do not exist.

Spec and VERIFY hashes in HUMAN_GATE.md use the existing normalized factory hash
helper. Verification opens the gate; it does not accept it. Review SPEC.md and
record accepted, changes-requested or rejected against exact fresh artifacts.
Data remains never-run until accepted. No generic stage gate grants runtime
rollback or paid-call authority.
