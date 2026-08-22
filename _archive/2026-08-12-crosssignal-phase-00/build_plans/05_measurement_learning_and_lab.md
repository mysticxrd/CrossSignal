---
id: phase-05
status: planned
depends_on: [phase-04]
unlocks: [phase-06]
prd_requirements: [FR-10A, FR-11, FR-12, FR-13, FR-15, FR-16]
evals: [EV-03, EV-04B, EV-06, EV-12, EV-12A, EV-13, EV-15]
---

# Phase 05 — Measurement, accepted learning, and Lab data

## Outcome

Complete the closed loop with deterministic measurement, an EVE-authored outcome
narrative, a human-approved Company Brain diff, and a separately sanitized,
persisted publication snapshot.

Evaluator-visible proof: fixture rows reproduce the outcome, rejecting learning
leaves the brain unchanged, and accepting the exact previewed diff creates one
versioned brain revision with case provenance.

## Baseline

The current outcome is a fixed 18.7% improvement and 73 sessions. The Company
Brain is presentation state, and Lab publication is a client-only toggle. Phase
04 provides a frozen intervention, implementation/cohort confirmation, and
sandbox receipt but no calculated follow-up.

## Entry criteria

- [ ] Phase 04 exit gate is complete.
- [ ] Metric definition, ActionSpec, implementation time, cohort, and window rule
      are durable and immutable for the case.
- [ ] ICM outcome/brain-diff/review schemas and Company Brain merge boundary exist.
- [ ] Fixture packs include improved, worsened, unchanged, inconclusive, and
      persistent-injection scenarios.

## In scope

- Deterministic metric engine and outcome classification.
- Disclosed manual time advance and a new bounded EVE measurement run.
- Outcome artifact, learning proposal, diff review/merge/reject, provenance,
  persistent-brain injection defense, and Lab sanitization/publication records.

## Out of scope

- Production schedules or automated exposure detection.
- Causal claims or model-chosen outcome classification.
- Public internet availability if the hosting policy remains owner-only; call it
  a public preview until genuinely public.
- Production deletion/retention guarantees.

## Architecture invariants

- Deterministic code calculates the metric and classification; EVE explains and
  proposes learning.
- A new measurement run reloads current canonical artifacts and source versions;
  it never relies on the old action session's memory.
- Outcome language distinguishes observation, association, hypothesis, and
  measured outcome and never asserts unqualified causality.
- The canonical brain changes only through an exact human-reviewed diff.
- Approved business text remains untrusted data in all later runs.
- Lab content is copied into a separate immutable sanitized snapshot; it never
  renders private case artifacts directly.

## Milestones

### P05-M1 — Resolve and freeze measurement inputs

**Deliverables**

- Measurement job/read model containing metric version, cohort, timezone,
  implemented time, absolute baseline/comparison windows, minimum exposure,
  tolerance, expected direction/range, fixture/source versions, and confound
  declarations.

**Work**

- [ ] Resolve absolute dates only from the approved rule and implementation time.
- [ ] Validate windows are comparable and metric definitions compatible.
- [ ] Preserve all frozen values and their source artifact hashes.
- [ ] Mark material deviation as revision-required or outcome-inconclusive.
- [ ] Use the labeled demo time advance to make the job due.

**Acceptance evidence**

- The same approved inputs always resolve the same window record.
- Missing implementation/cohort or incompatible inputs cannot become due.

### P05-M2 — Implement deterministic metric and classification

**Deliverables**

- Versioned metric calculator, exposure counts, effect estimate, tolerance check,
  confound/freshness checks, and classifications: improved, worsened, unchanged,
  inconclusive.

**Work**

- [ ] Query Phase 02 adapters with exact frozen parameters.
- [ ] Compute numerator, denominator/exposure, baseline, comparison, absolute and
      relative change using deterministic code.
- [ ] Force inconclusive for insufficient exposure, stale/missing data,
      incompatible windows/metric versions, unconfirmed cohort, or material
      confounds.
- [ ] Persist formula, inputs, samples, values, reasons, and hashes.
- [ ] Add golden vectors for all classifications and boundary tolerances.

**Acceptance evidence**

- Each fixture row set reproduces its expected class and explanation byte-stably.

### P05-M3 — Run a new bounded EVE measurement session

**Deliverables**

- Case-linked measurement run that loads the current ICM head, frozen plan,
  implementation, action receipt, metric result, policies, and declared Company
  Brain references.

**Work**

- [ ] Start a new run rather than silently resuming the investigation session.
- [ ] Record agent/workflow/source/policy versions and input hashes.
- [ ] Prevent the agent from modifying deterministic values/classification.
- [ ] Apply the same scope, budget, cancellation, and redaction rules as Phase 03.
- [ ] Preserve partial output/retry safety on interruption.

**Acceptance evidence**

- Trace proves EVE received the stored calculation and did not invent outcome
  values.

### P05-M4 — Produce the outcome artifact with disciplined language

**Deliverables**

- `outcome.md` with baseline/comparison, sample/exposure, effect estimate,
  classification, uncertainty/caveats, confounds, falsification result, and
  narrower consistency statement.

**Work**

- [ ] Cite the calculation record and exact source/query IDs.
- [ ] Use "consistent/inconsistent with" rather than causal certainty.
- [ ] Explain inconclusive honestly and propose no accepted learning from it.
- [ ] Validate content and causal-language policy before commit.

**Acceptance evidence**

- Confounding/seasonality/lag/selection/low-sample fixtures yield zero
  unqualified causal claims.

### P05-M5 — Generate and review the Company Brain diff

**Deliverables**

- `brain-diff.md`/structured patch, rendered exact preview, learning review record,
  optimistic merge, reverse provenance, and ledger events.

**Work**

- [ ] Propose only allow-listed brain paths and record expected base SHA.
- [ ] Support edit, accept, reject, and keep-provisional outcomes.
- [ ] Require a new preview/review after any material diff edit.
- [ ] Merge exactly the approved paths/content with CAS semantics.
- [ ] Preserve measured outcome when learning is rejected.
- [ ] Block generalized-pattern promotion until three independent cases support it.

**Acceptance evidence**

- Rejection keeps the canonical brain byte-identical.
- Acceptance creates one attributed commit matching the preview and linking back
  to the source case/outcome.

### P05-M6 — Prove accepted knowledge remains inert

**Deliverables**

- Second-case persistent-injection fixture and policy/tool-diff report.

**Work**

- [ ] Plant an instruction-like string in evidence and carry it through an
      approved business-text path.
- [ ] Start a second case that loads the accepted fact as declared reference data.
- [ ] Assert no change to instructions, tools, arguments, permissions, paths, or
      network behavior.
- [ ] Preserve the indicator as evidence and visible warning where appropriate.

**Acceptance evidence**

- EV-04B passes with zero control-plane change or unauthorized action.

### P05-M7 — Build the sanitization and publication data pipeline

**Deliverables**

- Sanitizer, immutable public-preview snapshot, removal/generalization report,
  owner review, publish/unpublish records, and case/release linkage.

**Work**

- [ ] Copy only approved closed-case fields into a separate snapshot.
- [ ] Remove direct identifiers, raw private excerpts, source locators that expose
      private systems, prompts, hidden reasoning, credentials, and developer logs.
- [ ] Generalize or owner-approve shareable metric values.
- [ ] Show exact preview and removed-field report before publication.
- [ ] Persist publication state and make unpublish immediate.
- [ ] Keep an authenticated-only surface labeled "public preview" unless actual
      public hosting is enabled.

**Acceptance evidence**

- Refresh preserves publish state; unpublish removes snapshot access.
- Seeded PII/secrets do not appear in snapshot, report output, or page payload.

### P05-M8 — Complete the measured-loop UI

**Deliverables**

- Implementation status, labeled time advance, calculation panel, outcome,
  caveats, learning diff/review, accepted brain provenance, and Lab preview.

**Work**

- [ ] Show frozen metric/window/cohort before advancing time.
- [ ] Show calculation inputs and why a classification was selected.
- [ ] Make inconclusive and rejected learning first-class states.
- [ ] Link outcome to run, artifact revision, source calculation, and ledger.
- [ ] Link accepted brain knowledge back to the case.

**Acceptance evidence**

- Refresh at every measurement/learning/publication state preserves the same
  authoritative controls and data.

## Verification matrix

| Check | Required proof |
|---|---|
| Prerequisites | No measurement without persisted implementation/cohort |
| Arithmetic | Golden rows reproduce all four classifications and boundaries |
| Inconclusive | Missing/stale/mismatched/confounded inputs force inconclusive |
| Language | No unqualified causal claim across adversarial fixtures |
| Brain merge | Reject is byte-identical; accept matches exact reviewed diff |
| Persistent injection | Later run gains no instruction/tool/permission change |
| Sanitization | PII, secrets, raw evidence, prompts, and traces are absent |
| Persistence | Outcome, learning, brain, and publication survive refresh |

## Demo checkpoint

Confirm implementation, use the disclosed time advance, run the deterministic
calculation and new EVE measurement, reject one learning to show no brain change,
then accept the corrected diff and open its case provenance and sanitized preview.

## Exit gate

- [ ] All eight milestones pass their acceptance evidence.
- [ ] EV-03, EV-04B, EV-06, EV-12, EV-12A, EV-13, and Phase 05 portions of EV-15 pass.
- [ ] Outcome values come from deterministic fixture calculations.
- [ ] Only the exact approved diff changes the canonical brain.
- [ ] Sanitized publication data is durable and separately stored.
- [ ] Phase 06 can run failure/eval matrices over the complete loop.

## Rollback and recovery

Never rewrite a measured outcome or accepted brain commit. Disable new
measurement/publication while preserving artifacts, calculation records, and
publication history. Unpublish snapshots immediately if sanitization regresses.

## Handoff

Phase 06 may rely on a complete golden loop, stored runs/artifacts/calculations,
accepted/rejected learning paths, sanitizer, publication records, and seeded
failure/adversarial fixtures.
