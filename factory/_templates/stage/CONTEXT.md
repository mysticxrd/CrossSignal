---
type: stage-template
status: blank
---

# NN_stage-name - one transformation

One job: state the single transformation this stage performs.

## Inputs

- Freshness dependency: `../NN_previous/output/PRIMARY.md`
- Freshness dependency: `../NN_previous/output/HUMAN_GATE.md`
- Freshness dependency: `../_shared/ARCHITECTURE_SNAPSHOT.md`
- Freshness dependency: `../_shared/QUALITY_GATES.md`
- Observed baseline: exact product paths read for this transformation
- Stage-owned surface: exact durable product paths this stage may change

Do not load: later stages, `_archive/`, the whole repository, or any reference
not named above.

## Process

1. Read and hash the declared inputs by role.
2. Perform one transformation under the shared constraints.
3. Write the primary edit surface and verification record, then stop.

Preservation means "unchanged since commit X, checked with changedSince".
New runs create no inventories, hash-list snapshots or copied trees. Gitignored
runtime stores such as `outputs/` keep hash bindings.

## Outputs

- `output/PRIMARY.md`
- `output/VERIFY.md`
- `output/HUMAN_GATE.md` - created or completed by the reviewer

## Verify

Run exact commands and negative cases. Record input hashes, output hashes,
environment, command results, and `status: passed | failed` in `VERIFY.md`.
New verifier scripts import hashing and command helpers from
`../_lib/verify-kit.mjs` after the template is copied into its numbered stage;
accepted hash-bound verifiers are not rewritten.

Only freshness-dependency drift reactivates this stage. Observed baselines and
stage-owned surfaces remain historical evidence after a downstream stage takes
ownership. The final Ship manifest separately binds the complete release head.

## Human gate

The reviewer edits the primary output if needed, records reviewed hashes and a
decision in `HUMAN_GATE.md`, and chooses `accepted`, `changes-requested`, or
`rejected`. Do not begin the next stage without `accepted`.
Commit stage outputs at every gate decision.

## Failure routing

Correct this stage or an upstream source. Never patch a later stage to hide an
earlier defect.
