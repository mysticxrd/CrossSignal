---
id: phase-00-retrospective-gate-01
historical_gate: P00-M1
classification: retrospective-owner-visibility
---

# Gate 1 — Evaluation contract

## 1. Gate purpose

This gate had to answer: **What exactly may CrossSignal claim in the Result-team
demonstration, and what is still only a fixture, simulation, or future plan?**
It mattered because the existing cockpit looked more complete than the underlying
product. Without a fixed release profile, an evaluator could reasonably mistake
seeded values and interface mock-ups for live integrations, EVE work, external
actions, measured results, or passed evals.

## 2. Starting situation

CrossSignal already had real owner authentication, D1-backed workspaces, a
persisted seeded case, evidence rows, approvals, and ledger events. The business
data was synthetic, however, and several labels sounded live: source freshness,
system health, an Agent Run, an action receipt, scheduled measurement, public
Lab publication, and “18 / 18” evals. The baseline audit also found no proof of
the live deployment's privacy or exact commit at that point.

## 3. What was decided

The release was defined as a **Result-team demo release**, not a complete PRD MVP
or production launch. The demo would use versioned provider-like fixtures, one
later sandbox action, a disclosed manual time advance, and a private Lab preview.
One frozen Mobile Safari checkout case would drive the three-minute story.
Production providers, schedules, customer-repository writes, broad telemetry,
public hosting, and full deletion guarantees were deferred but kept visible.

The rejected alternatives were to present the shell as live, call the release
PRD-complete, or hide deferred requirements. The repository contains one genuine
owner decision: the owner stated, “I approve the Phase 00 demo release profile,”
recorded on 2026-08-11. The claim classifications and UI changes were committed
by Git author `mysticxrd`; the repository does not identify a separate technical
reviewer.

## 4. What was implemented

The work created a claim register, golden fixture, timed demo story, deferral
register, baseline audit, and explicit owner decision record. Product copy was
changed so the UI says when data is fixture-based, when no EVE runtime or live
provider is connected, when no external call occurred, and when evals have not
run. A regression test checks for the required disclosures and rejects several
old live-sounding strings.

## 5. How CrossSignal changed

- **User-visible:** the cockpit became more honest about what an owner or evaluator
  was seeing.
- **System-level:** the release acquired a binding scope and truthfulness taxonomy;
  no live connector, EVE workflow, measurement engine, or sandbox action was added.
- **Unchanged:** the seeded business observations and outcome remained fixtures,
  while authentication, D1 persistence, evidence hashes, and ledger rows remained real.

## 6. Evidence

- Decision and scope: [`DEMO_RELEASE_PROFILE.md`](../_shared/DEMO_RELEASE_PROFILE.md)
  and [`OWNER_APPROVAL_GATE.md`](../00_evidence/P00_M1/OWNER_APPROVAL_GATE.md)
- Before/after truth audit: [`BASELINE_AUDIT.md`](../00_evidence/P00_M1/BASELINE_AUDIT.md)
  and [`CLAIM_REGISTER.md`](../00_evidence/P00_M1/CLAIM_REGISTER.md)
- Frozen demonstration: [`GOLDEN_FIXTURE.md`](../00_evidence/P00_M1/GOLDEN_FIXTURE.md)
  and [`THREE_MINUTE_STORY.md`](../00_evidence/P00_M1/THREE_MINUTE_STORY.md)
- Deferred production work: [`DEFERRED_SCOPE_REGISTER.md`](../00_evidence/P00_M1/DEFERRED_SCOPE_REGISTER.md)
- Code/test proof: [`CrossSignalApp.tsx`](../../app/CrossSignalApp.tsx) and
  [`rendered-html.test.mjs`](../../tests/rendered-html.test.mjs)
- Git: `3b59b08` froze the contract; `8b4a4d5` recorded owner acceptance. The
  approval record says the decision applied to the profile at `b580441`.

## 7. Truthfulness classification

The release profile, owner quote, Git history, UI disclosures, D1 mechanisms,
and regression test are **real**. The Atlas Foundry facts and provider snapshots
are **fixtures**. The later GitHub effect is defined as **sandboxed**, but no
sandbox action existed in Phase 00. The 14-day jump is **simulated time**.
Live providers, EVE product behavior, calculated outcomes, canonical ICM, public
Lab publication, and PRD eval results were **planned**.

## 8. Limitations and risks

The gate proved truthful labeling and scope, not that the complete three-minute
story worked. It did not test whether a new evaluator would understand every
disclosure, and no usability evidence is stored. The owner accepted the release
profile, but that acceptance did not approve later architecture or implementation
decisions. Fixtures can still mislead if future surfaces omit their local labels.

## 9. What the owner should understand

The consequential decision was to optimize for a truthful architectural demo,
not the original full MVP. That was the only Phase 00 gate with an explicit,
quoted owner acceptance record. Revisit the profile when CrossSignal seeks live
customer use, public release, or a claim of PRD completeness.
