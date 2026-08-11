---
id: phase-01
status: planned
depends_on: [phase-00]
unlocks: [phase-03]
prd_requirements: [FR-05, FR-08, FR-12, FR-13, FR-15]
evals: [EV-04A, EV-10, EV-13]
---

# Phase 01 — ICM workspace kernel

## Outcome

Make ICM the real, inspectable semantic substrate for every decision case.

Evaluator-visible proof: browse an actual case tree, open its stage contracts,
edit a Markdown artifact, inspect its Git history and diff, and reconstruct the
case status without relying on hidden UI state.

## Baseline

D1 currently stores a numeric case stage, approval rows, immutable evidence, and
ledger events. The UI displays artifact-like names, but no artifact files,
contracts, Git revisions, or Company Brain changes exist.

## Entry criteria

- [ ] Phase 00 exit gate is complete.
- [ ] Canonical Git repository and `IcmRepository` boundary are decided.
- [ ] D1 projection responsibilities and tenant rules are approved.
- [ ] Golden case ID, naming convention, and demo workspace are frozen.

## In scope

- Record library for cases, three-stage pipeline, and Company Brain knowledge
  bundle.
- Root/stage contracts, policies, templates, schemas, artifacts, revisions,
  editing, diffs, status derivation, and portable export.
- Path confinement, optimistic expected-head writes, and generated indexes.

## Out of scope

- EVE execution or model-generated content.
- Source ingestion and rule evaluation beyond a deterministic seed/stamp hook.
- Action execution, measurement arithmetic, and public publication.

## Architecture invariants

- The ICM Git head plus canonical human-review artifacts define semantic stage
  completion and decision meaning.
- D1 stores a rebuildable semantic projection plus separate operational
  authorization/run/action records. It does not duplicate artifact bodies as an
  independent semantic authority.
- An ICM review artifact records the human decision; a D1 approval record controls
  runtime permission and must bind that review artifact's hash. Neither replaces
  the other.
- Root and stage `CONTEXT.md` files route; they do not carry business payload.
- Every stage output is human-editable and versioned.
- `_system/`, templates, schemas, and policies are trusted and immutable to
  source data and model output.
- Generated indexes are rebuilt by code and never hand-edited.

## Milestones

### P01-M1 — Scaffold the composed ICM workspace

**Deliverables**

- `company/AGENTS.md`, root `CONTEXT.md`, `_system/`, `brain/`, `evidence/`,
  generated index location, and copyable case template.
- Case stages `01_investigate`, `02_intervene`, and `03_learn`, each with one
  explicit `CONTEXT.md` and declared output/review locations.

**Work**

- [ ] Keep the root router below the agreed token/line budget.
- [ ] Give every working folder one job.
- [ ] Name exact working and reference input paths in every stage contract.
- [ ] Name one output and one concrete human check per stage.
- [ ] Separate stable policies/schemas from per-case artifacts.
- [ ] Document naming and stable ID conventions.

**Acceptance evidence**

- A cold walk reaches the current stage's job within the root plus at most two
  additional reads.
- Router + contract + declared inputs fit the target 2,000–8,000-token envelope.

### P01-M2 — Define typed artifact and review contracts

**Deliverables**

- Schemas for signal, evidence brief, hypothesis, intervention, ActionSpec,
  implementation, outcome, brain diff, and three review records.
- Typed frontmatter with stable IDs, schema/version, input hashes, source/policy
  versions, base/head SHA, actor, EVE attribution, and review status.

**Work**

- [ ] Define canonical file paths and required sections.
- [ ] Define observation, inference, association, hypothesis, and measured-outcome
      language types.
- [ ] Define supporting and contradictory source-link structures.
- [ ] Define compatible schema evolution and validation errors.
- [ ] Create valid/invalid golden artifacts for every schema.

**Acceptance evidence**

- Invalid frontmatter, missing provenance, unknown fields that affect safety, or
  incompatible versions fail before commit with actionable errors.

### P01-M3 — Implement the canonical `IcmRepository`

**Deliverables**

- Provider-neutral operations to stamp a case, read allow-listed paths, load
  declared inputs, validate/commit one output, list history, compute a diff,
  export a tree, and rebuild indexes.

**Work**

- [ ] Scope every repository operation to the authenticated workspace/case.
- [ ] Normalize paths before authorization.
- [ ] Reject absolute paths, traversal, symlinks, reserved names, and protected
      control-plane writes.
- [ ] Use expected-base/head checks to prevent lost updates.
- [ ] Attribute each commit to a user or EVE session without exposing credentials.
- [ ] Keep Git credentials in the application executor, never the sandbox.

**Failure and recovery**

- A head conflict returns a reviewable conflict; it is never auto-resolved.
- A partial provider failure produces no D1 projection update without a committed
  canonical revision.

**Acceptance evidence**

- History and diff are derived from real revisions.
- Concurrent edits cannot silently overwrite each other.

### P01-M4 — Stamp cases and derive semantic status

**Deliverables**

- Case-stamping service, generated case/file indexes, D1 artifact-head projection,
  deterministic semantic-stage derivation, and composite lifecycle projection.

**Work**

- [ ] Copy the complete template rather than creating blank folders.
- [ ] Write `signal.md` with case/source/policy identity.
- [ ] Project case path, ICM head, current stage, and latest artifact revision to
      D1 after the canonical commit succeeds.
- [ ] Derive semantic stage from artifact/canonical-review existence and valid
      transition rules.
- [ ] Compose operational substates from D1 run, approval, action-intent, receipt,
      and ledger records without treating them as ICM content.
- [ ] Fail closed in a visible reconciliation state when a D1 authorization record
      references an unexpected review/artifact hash or ICM head.
- [ ] Provide one rebuild command/test for the semantic projection from ICM and a
      separate integrity audit for D1 operational state.
- [ ] Preserve prior cycle artifacts instead of overwriting them.

**Acceptance evidence**

- Deleting only the rebuildable D1 semantic projection and rebuilding it recovers
  the same semantic stage from ICM artifacts/reviews while preserving and
  independently validating operational records.

### P01-M5 — Add the artifact workspace UI

**Deliverables**

- Owner-only tree browser, Markdown editor, rendered structured view, revision
  list, diff view, validation state, and conflict handling.

**Work**

- [ ] Fetch artifacts server-side and pass only serializable, authorized data.
- [ ] Persist edits as new attributed revisions.
- [ ] Show base/head SHA, artifact hash, actor, time, and input revisions.
- [ ] Prevent navigation away from silently losing a draft.
- [ ] Make keyboard focus, labels, errors, and status announcements accessible.
- [ ] Keep raw protected control files read-only in the UI.

**Acceptance evidence**

- Edit, refresh, history, and diff all display the committed new revision.
- A foreign workspace cannot infer the tree or revision metadata.

### P01-M6 — Establish the Company Brain and learning-diff boundary

**Deliverables**

- Canonical brain index and initial identity, customer, product, metric, pattern,
  and decision locations; proposed-diff format; provenance links.

**Work**

- [ ] Separate provisional case learning from accepted brain knowledge.
- [ ] Define allowed brain paths and optimistic merge rules.
- [ ] Require an approved review record before any merge operation exists.
- [ ] Enforce the three-independent-case threshold for generalized patterns.
- [ ] Treat all brain content as business data, never instructions or authority.

**Acceptance evidence**

- A proposed or rejected diff cannot change the canonical brain head.

### P01-M7 — Prove portability and path safety

**Deliverables**

- Portable Markdown/JSON case export, manifest/hashes, walk-test report, and
  adversarial path suite.

**Work**

- [ ] Export only declared case artifacts and approved references.
- [ ] Verify all manifest hashes and relative links.
- [ ] Test traversal names, symlinks, fake `AGENTS.md`/`CONTEXT.md`, embedded HTML,
      reserved paths, and attempts to alter `_system/`.
- [ ] Confirm generated indexes rebuild byte-stably.

**Acceptance evidence**

- A human can inspect the exported case without CrossSignal running.
- All EV-04A fixtures fail without a control-file or out-of-root write.

## Verification matrix

| Check | Required proof |
|---|---|
| ICM walk | Root plus at most two reads reaches the current stage contract |
| Schema | Valid artifacts pass; malformed and incompatible artifacts fail safely |
| Git history | Edit creates attributed revision, correct parent, hash, and diff |
| Concurrency | Stale expected head produces conflict, not overwrite |
| Projection | D1 semantic projection rebuilds from canonical artifacts/reviews |
| Path safety | Traversal, symlink, fake control, and protected writes all fail |
| Tenant isolation | Foreign workspace cannot read tree, body, history, or metadata |
| Portability | Export manifest verifies and is understandable offline |

## Demo checkpoint

Open the stamped CS-014 tree, read the investigation contract, edit a provisional
evidence brief, refresh, show its new Git revision and diff, then rebuild/display
the same status from artifacts.

## Exit gate

- [ ] All seven milestones pass their acceptance evidence.
- [ ] The walk test and path/adversarial suite pass.
- [ ] Semantic status is artifact/review-derived and the D1 projection rebuilds.
- [ ] Human edits are real versioned Git history.
- [ ] The artifact workspace is owner-authorized and accessible.
- [ ] Phase 03 can consume stable repository, schema, and context contracts.

## Rollback and recovery

Never rewrite accepted artifact history. A failed release may roll back the UI or
projection code while retaining repository commits. Rebuild D1 projections from
the last compatible ICM head.

## Handoff

Phase 03 may rely on the `IcmRepository`, stage contracts, artifact schemas,
expected-head semantics, case/run attribution fields, and path allow-list.
