# CrossSignal — current hiring MVP direction

Updated: 2026-09-26. This is the current product-priority and session-handoff
record. It supersedes older next-step guidance in the dated progress and phase
notes. The user confirmed continuation: prior work is committed and sealed at
`58b2aa09b7208bb9a7b9b3cee5a12adeb54c8a11`, the complete historical factory is
preserved, and the new A01 Spec is prepared for human review. No A01 stage gate
has been accepted. See [transition](../factory/TRANSITION.md) and
[Stage 01 Spec](../factory/01_spec/output/SPEC.md).

## Goal and next milestone

Build a Revenue Leak Investigator for a replayable synthetic company. A Case
should connect detection, competing explanations, supporting and contradictory
evidence, a justified recommendation, exact human approval, a simulated
intervention, observed synthetic results, and independent evaluation.

**Next: A01 — a deployment breaks checkout for Indian debit cards.** Complete
one investigation-and-intervention loop before expanding scenarios. The
[reviewable A01 handoff](a01-synthetic-investigation-handoff.md) defines its
acceptance checklist, boundaries, proposed contracts, and required gate.

Real payment checkout, a payment sandbox, actual Mobile Safari verification,
and genuine business recovery are separately labeled future verification.
None is a prerequisite for this synthetic milestone. Simulated time advances
locally; the milestone does not wait for seven real calendar days.

## Repository state at the correction checkpoint

The authoritative product checkout is
`C:\Users\hisha\ChatGPT\CrossSignal\work\crosssignal-phase1`:

- Branch: `codex/phase3-decision-ux`.
- HEAD: `d802898b2ced1580c1b196bfcd0ba82f3332b32a`, golden replay committed.
- The detector scenario matrix, its reports/tests, package alias, and prior
  progress-note changes are still uncommitted. They have not been duplicated.
- Pre-existing `supabase/.temp/cli-latest` remains untracked and preserved.
- The outer repository is on `codex/supabase-migration` at
  `ca44f2eb180ed2d7d1fba1b606208a3294d4830d`; its untracked
  `Software Factory - Keeping AI Agents Aligned.md` is preserved.
- The nested `origin` still names the obsolete OneDrive path. No remote
  operation, clone, initialization, reset, clean, or replacement occurred.

These are observations before the subsequent `58b2aa0` baseline commit, not permanent assumptions.
Recheck Git state before the next task. [Verification evidence](hiring-mvp-reconciliation-evidence.md)
records the commands, preserved hashes, and limits.

## Demonstrated capabilities and remaining gaps

| Area | Existing evidence to preserve | What A01 must add |
| --- | --- | --- |
| Detection | Mobile Safari fixture: 56 observations; 20.00% to 8.57% conversion; 42 evidence references; $800 projected fixture gap | An incident with revenue, engineering, and support observations that discriminate between causes |
| Investigation | Deterministic three-claim report; desktop contradiction; cause explicitly unconfirmed | Two or three competing explanations, purposeful contradiction search, remedy or abstention |
| Authority | Exact manual-check approval; canonical payload/context/policy checks in existing authority infrastructure | New exact simulated rollback intent and grant; a manual-check approval cannot authorize rollback |
| Simulation | Operator-selected capture/decline and trace-bound coverage assessment | State transitions caused by an approved intervention; correct, wrong, and absent intervention differ |
| Case history | Persisted evidence, approvals, immutable trial exclusion, saved simulation traces | Durable investigation through synthetic outcome, resolution or uncertainty, and interruption recovery |
| Replay | Committed golden replay; uncommitted seven-variant detector matrix with six invalid inputs; separate graders | A01 lifecycle replay and grading of diagnosis, evidence, contradiction search, action, authority, and outcome |
| Model evaluation | None demonstrated; current findings are deterministic | Local model configuration and tool transcript, if a suitable model is available; separate mechanics and behavioral results |

The local regression suite passes **29/29** on 2026-09-26. Its replay tests
compare fresh processes and reject altered artifacts. That establishes bounded
software behavior, not AI investigation quality or benchmark accuracy across
causally different incidents. A01 was not found in the inspected product,
scripts, tests, or documentation; the Mobile Safari Case is not equivalent.

## Reconciled guidance

Source: [CrossSignal MVP — Revenue Leak Investigator (Hiring Build)](https://app.notion.com/p/3d3cb716dfb4811dbc78ef6385011a0a),
read on 2026-09-26, page last edited 2026-09-24T15:22:50.256Z. Sections 2, 6,
17, 21–24 supply scope, Case invariants, the broader completion criteria,
factory boundaries, and strategic direction. The user's 2026-09-26 correction
sets the current sequence when older sections conflict.

| Obsolete or ambiguous guidance | Current interpretation |
| --- | --- |
| Perform a real checkout and collect seven genuine days before replay | Future real-world verification only; A01 uses simulated observations and time |
| Golden replay is not implemented | Completed in `d802898`; retain it as regression coverage |
| Add more detector counterfactuals as the primary next step | Preserve the matrix; prioritize the causal investigation and intervention loop |
| Capture plus decline means a repaired incident | It establishes harness coverage; the current Case remains unresolved |
| Five factory stages or six implementation phases mean MVP completion | Factory acceptance belongs to historical L14; phase numbers describe implementation history |
| Carry the fixed planner/worker/skeptic graph into the new product | Start with bounded domain tools and hypothesis/contradiction behavior; compare architectures later |
| Build 100 scenarios now | Complete A01, then five and ten causally different incidents and baseline comparisons; the broader benchmark follows |

The Notion page still contains the old real-check next step and stale replay
status near its top. This repository record resolves that conflict using the
user's correction and section 24. No Notion content was changed. The existing
README and compiled architecture snapshot describe historical proof; their
accepted artifacts were not rewritten to imply A01 completion.

## Preserved safeguards

Keep the Mobile Safari fixture and all existing replay reports and tests.
Keep tenant-scoped immutable history, exact payload/context/policy approval,
one-time execution, Global Pause, explicit failure/indeterminate states, and
the excluded trial receipt. Do not repurpose the old receipt or approval.

Every A01 outcome must say **SIMULATED**. Existing FIXTURE inputs retain their
labels. Device verification and real business outcome remain separate. The
synthetic $800 projection is neither actual lost revenue nor recovered money.
No TEST database, deployed service, LIVE system, or provider was changed by
this reconciliation.

The existing runners do not import or pass evaluator answer files. Their
separate processes are not an enforced filesystem sandbox. A01 must also
deny evaluator-file access from the investigator and its tools, exclude
answers from inputs/responses/prompts, and verify attempted disclosure fails.

## Current gate and next decision

The user confirmed the next-run transition with “continue.” The previous run
was sealed at `58b2aa0`; its full 42-file factory tree and accepted gates were
preserved with matching hashes. The generated CLI cache file remains on disk
under a narrow ignore rule. The matrix is now committed.

The active run is A01, stage `01_spec`. Review
[SPEC.md](../factory/01_spec/output/SPEC.md) and its
[verification record](../factory/01_spec/output/VERIFY.md). The
[human gate](../factory/01_spec/output/HUMAN_GATE.md) is pending; Data, Build,
Verify, and Ship remain never-run. This is a specification result, not an
implemented A01 investigation or model evaluation.

**Next required decision:** accept, request changes to, or reject the exact
Stage 01 artifacts. After acceptance, Data defines executable observations,
isolation, world-state transitions, durable records, and approval contracts.
No payment-provider setup is needed. Follow the remaining existing human
gates. After A01 passes, recommend five and ten causally different incidents
with baseline comparisons; do not begin that expansion within this milestone.
