# CrossSignal progress against the end goal

## Current direction — 26 September 2026

The hiring goal is a Revenue Leak Investigator for a replayable synthetic
company. **Next milestone: A01, one complete investigation and approved
simulated intervention**, with competing explanations, contradiction search,
observed synthetic recovery or uncertainty, and independent grading.

See the [current direction and repository reconciliation](hiring-mvp-direction.md),
[A01 acceptance checklist and handoff](a01-synthetic-investigation-handoff.md),
and [fresh verification evidence](hiring-mvp-reconciliation-evidence.md).

The golden replay is committed at `d802898`; the seven-variant detector matrix
and six invalid-input probes remain uncommitted and preserved. All **29/29**
focused tests pass on 2026-09-26. Neither scripted findings nor capture/decline
coverage demonstrates model investigation or intervention-driven recovery.

Real checkout, payment sandbox, actual Mobile Safari verification, and genuine
business recovery are separate future work, not prerequisites. Retain Mobile
Safari as regression coverage and keep the trial excluded. All new A01 outcomes
must be SIMULATED. After A01 passes, recommend five and ten causally different
incidents and baseline comparisons before the broader 100-case program.

**Next required decision:** review the completed A01 handoff and authorize the
human-owned next-run transition required by `factory/CONTEXT.md`. Historical
L14 gates remain accepted, but the current checkout is unsealed and has no
active stage. The handoff is a candidate, not an accepted Stage 01 or A01 build.

## Historical assessment — 24–25 September 2026

The dated observations below are preserved for provenance. Their status,
deployment references, and suggested sequence describe those checkpoints;
the current direction above supersedes their next-step guidance.

> **Update — 25 September 2026:** A [local scenario matrix](phase6-local-scenario-matrix.md) now runs seven designed FIXTURE counterfactuals and six invalid inputs through the existing detector, with a separate hidden-truth grader and repeatability check. It extends the [one-command golden replay](phase5-golden-case-replay.md) but is not a model evaluation or the proposed 100-case benchmark. No observable payment checkout is configured; actual Mobile Safari payment verification, the real receipt, and business outcomes remain pending.

> **Update — 25 September 2026:** A deterministic simulation assessment binds the saved checkout run IDs, hashes, and event traces. Its lifecycle is awaiting runs → in progress → both chosen scenarios verified. This is harness coverage, not a repaired revenue leak. The Case remains unresolved; device verification and business outcomes remain pending. See [assessment evidence](phase4e-simulation-assessment.md).

> **Update — 25 September 2026:** The missing executable TEST target is now a bounded synthetic checkout harness. Two runs (simulated capture and decline) are saved with unique IDs and immutable traces; browser reload passed. The trial stays excluded. Actual Mobile Safari verification awaits device access; real capture and business outcome remain unverified. See [implementation and verification evidence](phase4d-synthetic-checkout-harness.md). The report below preserves the earlier 24 September assessment; its manual-check next step and version 9/v10 deployment references are superseded by this update (Site v10 / Edge v11). Next product milestone: a separately labeled simulated outcome and Case lifecycle assessment, followed by replay checks.

**As of:** 2026-09-24

**Status:** One synthetic revenue-leak Case reaches an exact, approved TEST response. The response's only saved check receipt was a trial and is excluded. No real check, follow-up observation, measured Case outcome, model-assisted investigation, or replay/evaluation result exists.

## What “done” means

The [CrossSignal MVP proposal](https://app.notion.com/p/3d3cb716dfb4811dbc78ef6385011a0a) describes a Case that detects a revenue leak, investigates supporting and contradictory evidence, represents competing hypotheses, recommends a proportionate action, obtains exact human approval, executes only an approved simulated action, observes the result, and closes or reopens the Case. It also proposes a replayable synthetic company, hidden evaluator ground truth, a one-command benchmark of 100 scenarios, reliability and security fault cases, and three comparative experiment reports. These are **proposed portfolio-MVP exit criteria**, not claims about the current implementation or accepted factory gates.

The [Project Flight Log](https://app.notion.com/p/3c6cb716dfb481e498f0e5dccd0f9e8f) states the selected, nearer product goal: detect a leak, investigate supporting and contradictory evidence, approve a safe Case-bound response, and measure its outcome. The agreed build order is **Contract → Recorder → Signals → Investigator → Decision UX → Action/Outcome → Replay/Evaluation**. The current product work is a single FIXTURE scenario on owner-private TEST; the earlier onboarding-rescue trace is separate historical proof.

## Progress by capability

| Capability | Present evidence | Remaining to meet the end goal |
| --- | --- | --- |
| Contract | Validated scenario, event, signal, evidence, and Case shapes; evaluator answer file excluded from runtime input and generated setup SQL. | Generalize contracts only as new scenarios require. |
| Recorder | 56 immutable daily checkout/payment observations in one synthetic Case; repeatable setup verifies hashes and does not delete existing data. | Record a broader replayable company and full Case lifecycle. |
| Signals | Deterministic Mobile Safari checkout conversion drop from **20.00% to 8.57%**; desktop control remains **20.00%**. The **$800** gap is a baseline-rate projection on synthetic data. | Extend detection to selected additional incidents and measure false alarms. |
| Investigator | One saved deterministic report with three claims and 42 exact evidence/event citations, including a contradictory desktop check; cause remains unconfirmed. | Build and evaluate a model-assisted, bounded tool-using investigator that generates and tests competing explanations, can abstain, and never sees ground truth. |
| Decision UX | Private TEST Case view exposes the signal, claims, raw references, uncertainty, and an immutable zero-cost, TEST-only manual-check proposal. One exact approval is saved. | Demonstrate a defensible recommendation tied to an investigated cause and consequential approval boundary. |
| Action / Outcome | Receipt, trial-exclusion, distinct recheck, and seven-day receipt-bound follow-up paths exist. One original receipt is marked as a **trial**; there are **zero real rechecks and zero follow-up rows**. | Perform the actual manual TEST check, save its distinct receipt, collect genuine follow-up observations, and inspect the correlation-only result. A simulated consequential action and Case closure remain future work. |
| Replay / Evaluation | One golden incident and a hidden evaluator truth file support deterministic software checks. | Implement a cold-run replay/eval harness, expand benchmark cases, report diagnosis/action/safety metrics, and run the proposed comparisons. No paid model evaluation has run. |

The implementation has reached **Action/Outcome plumbing**, but the end-to-end Case has **not** reached an observed outcome. A stage count or completion percentage would hide this distinction. The [roadmap tracker](https://app.notion.com/p/3c6cb716dfb481d4b298f5c41c70ed88) treats the revenue-leak Case as the selected TEST direction and the full AI/evaluation program as proposed.

## Current evidence and limits

- [Phase 1 foundation](phase1-golden-revenue-leak.md), [bounded Investigator](phase2-bounded-investigator.md), and [Decision UX](phase3-decision-ux.md) document the saved Case, deterministic calculations, citation checks, tenant isolation, and signed-in save/reload proof.
- [Exact response](phase4-case-response-approval.md), [receipt and follow-up path](phase4b-test-check-and-outcome.md), and [trial correction](phase4c-trial-receipt-recovery.md) document the approval binding, append-only records, rollback-only database tests, and private TEST deployment. The latest [Notion journal entry](https://app.notion.com/p/3e5cb716dfb481d3b451d7fd487565c9) records one approval, one excluded trial receipt, one trial marker, zero real rechecks, and zero follow-up events. The recheck HTTP save/reload and a persisted outcome have not been exercised.
- Re-run on 2026-09-24: `node --test tests/golden-revenue-leak.test.mjs tests/case-investigator.test.mjs tests/case-decision.test.mjs tests/case-response.test.mjs tests/case-outcome.test.mjs` — **20/20 passed**. This recheck covers local contracts and projections; it is not fresh proof of a real checkout, live database counts, or a behavioral model benchmark.
- Development checkout: branch `codex/phase3-decision-ux`, baseline commit `d1311c3feda612ac1722929ea85b45891eb33e6c`. Latest recorded private TEST deployment: Site version 9 and `cfr-trace-reader` v10 on Supabase Free project `tonuxepirauyqcwbwenw`. LIVE remains on D1. TEST uses a shared server-side preview credential; production authority needs user-bound credentials.
- `node factory/status.mjs` reports the **historical L14** five-stage factory run complete, accepted, and sealed with no active stage. That acceptance belongs to the earlier trace-resolution work. It does **not** accept this revenue-leak Case or the proposed portfolio MVP. The [architecture snapshot](../factory/_shared/ARCHITECTURE_SNAPSHOT.md) describes that prior onboarding-rescue proof and the human-gated factory.

## Historical next gates — superseded on 26 September 2026

The original sequence below is retained as history. Use the A01 handoff and
current gate above; the real-check prerequisite and request to implement an
already completed golden replay no longer govern development.

1. **Finish the current bounded Action/Outcome proof.** After a real Mobile Safari checkout check in TEST, the owner records a distinct, non-sensitive run reference and observed capture result. Collect seven genuinely new paired follow-up days with at least 100 eligible starts. Save and reload the resulting Case assessment; label any change as correlation only.
2. **Charter the next governed revenue-leak run.** Define its bounded outcome, evaluator-visible acceptance evidence, owner, and review date, then obtain its own human Stage 01 gate. Existing L14 acceptance does not transfer.
3. **Build Replay/Evaluation and the model investigator in measured slices.** Start with a one-command golden-case replay and hidden-truth grader, then expand cases and compare deterministic versus tool-using investigation. The proposed 100-case suite, model/provider choice, simulated consequential action, and portfolio exit threshold remain decisions to confirm before claiming the full MVP.

**Assessment:** The project has a credible, traceable TEST vertical slice from recorded incident through owner approval, plus a safe path to record a real check. It has not yet shown that an intervention worked or that an AI investigator can diagnose and act safely across scenarios. Do not report the synthetic $800 projection as recovered or live revenue.
