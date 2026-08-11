---
id: phase-07
status: planned
depends_on: [phase-06]
unlocks: [phase-08]
prd_requirements: [FR-13, FR-14, FR-16, FR-17]
evals: [EV-15, EV-17]
---

# Phase 07 — Result-team demo release

## Outcome

Package the validated architecture into a repeatable three-minute demonstration
and evidence set that communicates product judgment, ICM/EVE depth, safety, and
strategic relevance to Result without relying on production integrations.

This phase closes the scoped Result-team demo profile in
`_shared/DEMO_RELEASE_PROFILE.md`; it does **not** claim the complete PRD MVP or
production release is finished.

Evaluator-visible proof: a fresh evaluator completes the golden loop, explains
what ICM preserved and what EVE executed, and can verify every claim from real
artifacts, runs, receipts, calculations, ledger events, or eval results.

## Baseline

Phase 06 provides a gated release candidate and complete proof graph. Remaining
work is truthful product packaging, deterministic reset, evaluator navigation,
sanitized publication, portable export, documentation, rehearsal, recording,
and deployment of the exact verified source.

## Entry criteria

- [ ] Phase 06 exit gate is complete.
- [ ] Release candidate versions and golden fixture are frozen.
- [ ] No critical eval failure or unresolved data leak exists.
- [ ] Every demo-visible simulation has approved language.
- [ ] Phase 06 has recorded at least 95% behavioral quality across three
      consecutive complete runs, 25 adversarial fixtures across three seeds, and
      zero leakage for at least 25 PII values and 10 synthetic secrets.

## In scope

- Scoped demo reset, guided golden flow, artifact/run split view, persisted Lab
  presentation, case/workspace export, README, architecture diagram, ICM walk,
  threat model, eval report, fixture manifest, demo script/video, external
  comprehension sessions, and private deployment verification.

## Out of scope

- New product capabilities or live connectors.
- Phase 08 infrastructure or refactors that do not improve evaluation proof.
- Public owner application access.

## Architecture invariants

- The recorded and live demonstrations use the exact gated release source.
- Reset affects only the designated demo workspace and preserves audit history
  according to its documented cycle semantics.
- The main story shows business value first and architecture proof second.
- Time compression is explicit; no edit hides a failed or fabricated step.
- Public/sanitized material contains no private evidence, prompts, hidden
  reasoning, direct identifiers, credentials, or developer-only logs.

## Milestones

### P07-M1 — Build the deterministic golden reset

**Deliverables**

- Owner-only reset command, fixture/version selection, scoped confirmation,
  idempotent reset receipt, and known starting state.

**Work**

- [ ] Target only the configured demo workspace/case family.
- [ ] Restamp fixture data, metric definition, scan state, ICM template, and Lab
      publication state to the documented baseline.
- [ ] Preserve or clearly archive prior cycles/ledger evidence.
- [ ] Make interrupted and repeated reset safe.
- [ ] Show the exact fixture/release versions after reset.

**Acceptance evidence**

- Three repeated resets yield the same starting hashes and do not affect another
  workspace.

### P07-M2 — Create the evaluator's proof view

**Deliverables**

- A coherent case workspace that can show, without hunting:
  - ICM tree, current contract, artifact, human edit, history, and diff;
  - EVE root/skeptic runs, bounded tools, parked gate, usage, and errors;
  - permanent ledger, ActionSpec/approval, receipt, measurement, and brain diff.

**Work**

- [ ] Add a split or tightly linked view without duplicating canonical content.
- [ ] Preserve business-readable summaries for nontechnical evaluators.
- [ ] Keep developer detail owner-only and accessible on demand.
- [ ] Ensure responsive and keyboard navigation across drawers/panels.
- [ ] Deep-link every displayed claim to its proof object.

**Acceptance evidence**

- A reviewer can answer what EVE did and what ICM preserved in under 30 seconds.

### P07-M3 — Finalize the guided three-minute product narrative

**Deliverables**

- In-product guidance, timing script, contingency branch, and clean completion
  state.

**Work**

- [ ] 0:00–0:20: reset and run deterministic scan; open rule receipt.
- [ ] 0:20–0:45: open stamped ICM case and source provenance.
- [ ] 0:45–1:10: run real EVE investigation; show skeptic contradiction.
- [ ] 1:10–1:35: edit artifact, refresh/interruption-resume, show new-hash read.
- [ ] 1:35–1:55: approve sandbox issue, retry, show same receipt.
- [ ] 1:55–2:20: confirm implementation, disclose time advance, measure.
- [ ] 2:20–2:40: approve brain diff and open accepted provenance.
- [ ] 2:40–3:00: show ICM history, EVE run, ledger, and truthful eval status.
- [ ] Prepare fallback evidence for temporary runtime/model latency without
      presenting a prerecorded path as live.

**Acceptance evidence**

- The story fits the target time excluding optional questions and never skips a
  required disclosure.

### P07-M4 — Complete sanitized Lab presentation and unpublish

**Deliverables**

- Persisted sanitized case page/preview, sanitization report, removed-field list,
  exact owner preview, publish/unpublish controls, release/eval linkage, and
  honest public/private label.

**Work**

- [ ] Render only the immutable sanitized snapshot from Phase 05.
- [ ] Require closed case and owner review before publish.
- [ ] Make unpublish immediate and durable.
- [ ] Display eval status from Phase 06 stored results.
- [ ] Call the surface "public preview" if actual unauthenticated access is not
      enabled.

**Acceptance evidence**

- Seeded sensitive-data scan is clean; refresh and unpublish behave correctly.

### P07-M5 — Add portable export proof

**Deliverables**

- Case and workspace Markdown/JSON export with manifest, hashes, declared Company
  Brain references, ledger/action/measurement records, and scope statement.

**Work**

- [ ] Reauthorize export and include only the requesting owner's workspace.
- [ ] Exclude credentials, hidden reasoning, raw restricted evidence, and private
      trace payloads.
- [ ] Validate manifest hashes and offline ICM navigation.
- [ ] State that production deletion/backup expiry remains Phase 08.

**Acceptance evidence**

- A human or compliant agent can inspect the decision offline and verify hashes.

### P07-M6 — Publish the engineering evidence package

**Deliverables**

- Project README, architecture/state-ownership diagram, ICM walkthrough, EVE
  execution flow, threat model, truthful eval report, fixture manifest, deferred
  scope, setup/reset guide, and known limitations.

**Work**

- [ ] Replace starter or outdated copy.
- [ ] Explain why ICM and EVE are complementary and where each deliberately loses.
- [ ] Show all trust boundaries and executor preflight.
- [ ] Link every eval claim to stored/report evidence and name deferred scenarios.
- [ ] Explain why live billing/connectors are intentionally unnecessary for proof.

**Acceptance evidence**

- A cold technical reader can reproduce the demo and identify every source of
  truth without asking for private context.

### P07-M7 — Run comprehension sessions and rehearse failure handling

**Deliverables**

- One technical and one product-focused session report, issue list, timing data,
  comprehension answers, and resolved release blockers.

**Work**

- [ ] Ask each participant to explain signal, contradiction, human edit, EVE work,
      ICM state, approval safety, outcome, and learning.
- [ ] Record confusion without coaching and fix the smallest underlying cause.
- [ ] Rehearse model latency, unavailable trace, interrupted action, and
      inconclusive outcome branches.
- [ ] Freeze UI/copy after blockers are resolved.

**Acceptance evidence**

- Both participants correctly explain the core ICM/EVE division and why the
  action cannot duplicate.

### P07-M8 — Verify, deploy, and record the exact release

**Deliverables**

- Final build/test/eval report, private deployed version, three successful cold
  runs, recorded three-minute demo, and release manifest.

**Work**

- [ ] Run build, lint, migrations, deterministic tests, adversarial gates, and
      required multi-seed evals against the frozen source.
- [ ] Deploy the exact commit privately with required D1/EVE/ICM configuration.
- [ ] Run three cold resets and complete the full flow without manual repair.
- [ ] Verify refresh, workspace switching, run links, Lab preview, and export.
- [ ] Record the demonstration with transparent time compression/disclosures.
- [ ] Preserve release versions/hashes in the report.

**Acceptance evidence**

- Three consecutive deployed golden runs pass and the recording matches the
  release manifest.

## Verification matrix

| Check | Required proof |
|---|---|
| Reset | Three resets yield same baseline and isolate other workspaces |
| Comprehension | Technical and product reviewers explain the mechanism correctly |
| Truthfulness | Every fixture/sandbox/time advance/deferred eval is disclosed |
| Sanitization | Lab and export contain no protected values/content |
| Portability | Export verifies and reads offline |
| Release | Exact deployed commit passes all active gates and three cold runs |
| Narrative | Full story fits target time with deeper proof available |

## Demo checkpoint

This phase's checkpoint is the final demonstration itself, ending with:

> EVE performs and resumes the work. ICM makes every decision inspectable,
> editable, and reusable. CrossSignal makes Result learn which actions actually
> produced results.

## Exit gate

- [ ] All eight milestones pass their acceptance evidence.
- [ ] The Result-team demo gate in `00_PROGRAM.md` is fully checked.
- [ ] The release is named and reported as the Result-team demo profile, not a
      PRD-complete MVP or production release.
- [ ] Every visible claim links to a real proof object.
- [ ] Three cold deployed runs succeed without manual database repair.
- [ ] Lab/export sanitization passes and publication state is durable.
- [ ] Documentation, eval report, threat model, and video match the exact release.
- [ ] Phase 08 remains deferred unless its explicit entry gate is approved.

## Rollback and recovery

Keep the previous verified private deployment available. A release regression
rolls back application/agent versions while preserving ICM history, D1 ledger,
and eval evidence. Unpublish Lab snapshots if their sanitizer or policy changes.

## Handoff

The frozen demo release becomes the comparison baseline for any production
expansion. Phase 08 may not weaken its truthfulness, safety gates, or ICM/EVE
state ownership.
